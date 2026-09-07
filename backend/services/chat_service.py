"""
Chat Service - orchestrates the NammaRoute AI chatbot.

Flow for every message:
  1. Detect intent + extract entities (keyword/regex — no heavy NLP)
  2. Resolve stations via StationService (fuzzy matching)
  3. For route/distance/time questions: calculate via RouteService (no AI guessing)
  4. For current info requests: fetch via LiveDataService (web_access=True)
  5. Build verified context facts
  6. Send to AIService for natural-language generation
  7. Graceful deterministic fallback if AI is unavailable

Never lets the LLM invent station facts, routes, distances, or current status.
"""
import re
from typing import Optional

from services.station_service import StationService
from services.route_service import RouteService
from services.live_data_service import (
    fetch_latest_news, fetch_disruptions, fetch_current_status, fetch_line_update
)
from services.prediction_service import predict_station_demand
from services.ai_service import ai_service
from utils.time_utils import current_datetime_label, now_ist
from utils.text_normalizer import normalize

# ── Intent-detection keyword banks ───────────────────────────────────────────

GREETING_PATTERNS = re.compile(
    r"^\s*(hi|hello|hey|good\s*(morning|afternoon|evening|night)|howdy|"
    r"namaste|vanakkam|what'?s\s*up|sup|greetings|hiya)\s*[!.?]*\s*$",
    re.IGNORECASE,
)

ROUTE_KEYWORDS = [
    "go", "route", "reach", "travel", "way", "journey", "get to", "commute",
    "how do i", "how can i", "need to", "want to", "navigate", "direction",
    "how to get", "way to go",
]

ALTERNATIVE_KEYWORDS = [
    "another route", "alternative route", "alternate route", "different route",
    "another way", "other route", "different way", "any other route",
    "is there another", "give me another", "alt route",
]

DISTANCE_KEYWORDS = ["how far", "distance", "how many km", "kilometers", "km"]
TIME_KEYWORDS = ["how long", "how much time", "duration", "minutes", "time to travel",
                 "travel time", "how many minutes", "how many hours"]

CROWD_KEYWORDS = [
    "crowd", "crowded", "busy", "crowed", "how many people", "footfall",
    "rush", "packed", "congestion", "how full", "congested", "jammed",
]

NEWS_KEYWORDS = [
    "latest", "news", "update", "announcement", "recent", "today",
    "bmrcl", "new station", "new line", "expansion", "inauguration",
    "opened", "opening", "launched",
]

DISRUPTION_KEYWORDS = [
    "disruption", "delay", "cancelled", "cancellation", "problem",
    "issue", "not working", "breakdown", "alert", "outage", "stopped",
    "service issue", "service disruption",
]

STATUS_KEYWORDS = [
    "status", "working", "operational", "running", "service", "operating normally",
    "is metro", "is the metro", "current status", "line status",
]

LINE_KEYWORDS = {
    "Purple Line": ["purple line", "purple"],
    "Green Line": ["green line", "green"],
    "Yellow Line": ["yellow line", "yellow"],
    "Pink Line": ["pink line", "pink"],
    "Blue Line": ["blue line", "blue"],
}

STATION_QUESTION_KEYWORDS = [
    "tell me about", "about station", "which line", "what line",
    "info about", "information about", "details about", "where is",
    "is it interchange", "is it an interchange",
]

NETWORK_KEYWORDS = [
    "how many lines", "how many stations", "which lines", "total stations",
    "namma metro network", "metro network", "interchange stations",
    "how many interchange",
]

DATE_KEYWORDS = ["today's date", "what date", "current date", "what is the date",
                 "what day is", "today is", "today date", "what day",
                 "today's", "todays date", "what is today"]

METRO_DOMAIN_WORDS = [
    "metro", "bmrcl", "station", "line", "interchange", "route", "train",
    "namma", "rail", "transit", "platform",
]

OPERATIONAL_LINES = ["Purple Line", "Green Line", "Yellow Line"]
KNOWN_FUTURE_LINES = ["Pink Line", "Blue Line"]


def _mn(text: str) -> str:
    return normalize(text)


class ChatService:
    """Stateless per-call orchestration. Pass conversation history each time."""

    def __init__(self, station_service: StationService, route_service: RouteService):
        self.ss = station_service
        self.rs = route_service

    # ─────────────────────────── Intent detection ────────────────────────────

    def _detect_line(self, text: str) -> Optional[str]:
        tl = text.lower()
        for line, kws in LINE_KEYWORDS.items():
            if any(kw in tl for kw in kws):
                return line
        return None

    def _extract_two_stations(self, text: str):
        """Try to extract (source, destination) from free text."""
        # Pattern: "from X to Y" or just "X to Y"
        m = re.search(r"from\s+(.+?)\s+to\s+(.+)", text, re.IGNORECASE)
        if not m:
            m = re.search(r"^(.+?)\s+to\s+(.+)$", text.strip(), re.IGNORECASE)
        # Pattern: "how far is X from Y" or "distance from X to Y"
        if not m:
            m2 = re.search(r"(?:how far is|distance (?:from|between))\s+(.+?)\s+(?:from|to|and)\s+(.+)", text, re.IGNORECASE)
            if m2:
                m = m2
        if not m:
            return None

        raw_src = m.group(1).strip()
        raw_dst = m.group(2).strip()

        src, src_cands = self.ss.find_station(raw_src)
        dst, dst_cands = self.ss.find_station(raw_dst)

        return {
            "raw_source": raw_src,
            "raw_destination": raw_dst,
            "source": src,
            "destination": dst,
            "source_candidates": src_cands,
            "destination_candidates": dst_cands,
        }

    def _find_single_station(self, text: str) -> Optional[dict]:
        """Scan message for any station name and return the best match."""
        # Try the whole cleaned query first
        s, cands = self.ss.find_station(text)
        if s:
            return s
        # Slide a window over token pairs and triples
        words = text.split()
        for size in (4, 3, 2, 1):
            for i in range(len(words) - size + 1):
                fragment = " ".join(words[i:i + size])
                s, cands = self.ss.find_station(fragment)
                if s:
                    return s
        return None

    def _context_from_history(self, conversation: list) -> dict:
        """Extract previously established route/station from conversation."""
        ctx: dict = {"source": None, "destination": None, "line": None, "station": None}
        for turn in reversed(conversation or []):
            if not isinstance(turn, dict) or turn.get("role") != "user":
                continue
            text = turn.get("content", "")
            if not ctx["source"] or not ctx["destination"]:
                pair = self._extract_two_stations(text)
                if pair and pair["source"] and pair["destination"]:
                    ctx["source"] = ctx["source"] or pair["source"]
                    ctx["destination"] = ctx["destination"] or pair["destination"]
            if not ctx["line"]:
                ctx["line"] = self._detect_line(text)
            if not ctx["station"] and not (ctx["source"] and ctx["destination"]):
                s = self._find_single_station(text)
                if s:
                    ctx["station"] = s
        return ctx

    def detect_intent(self, message: str, conversation: list) -> tuple[str, dict]:
        ml = message.lower()
        mn_msg = _mn(message)

        # ── Greeting ──────────────────────────────────────────────────────────
        if GREETING_PATTERNS.match(message.strip()):
            return "GREETING", {}

        # ── Date/time question ────────────────────────────────────────────────
        if any(k in ml for k in DATE_KEYWORDS):
            return "DATE", {}

        # ── Alternative route ─────────────────────────────────────────────────
        if any(k in ml for k in ALTERNATIVE_KEYWORDS):
            pair = self._extract_two_stations(message)
            if pair and pair["source"] and pair["destination"]:
                return "ALTERNATIVE_ROUTE", {
                    "source": pair["source"], "destination": pair["destination"]
                }
            ctx = self._context_from_history(conversation)
            if ctx["source"] and ctx["destination"]:
                return "ALTERNATIVE_ROUTE", {
                    "source": ctx["source"], "destination": ctx["destination"]
                }
            return "ALTERNATIVE_ROUTE", {"source": None, "destination": None}

        # ── Route / distance / time detection ─────────────────────────────────
        pair = self._extract_two_stations(message)
        if pair and pair["raw_source"] and pair["raw_destination"]:
            if pair["source"] and pair["destination"]:
                if any(k in ml for k in DISTANCE_KEYWORDS):
                    return "DISTANCE", {"source": pair["source"], "destination": pair["destination"]}
                if any(k in ml for k in TIME_KEYWORDS):
                    return "JOURNEY_TIME", {"source": pair["source"], "destination": pair["destination"]}
                return "ROUTE", {"source": pair["source"], "destination": pair["destination"]}
            if not pair["source"] and pair["raw_source"]:
                return "UNKNOWN_ROUTE_STATION", {"raw": pair["raw_source"]}
            if not pair["destination"] and pair["raw_destination"]:
                return "UNKNOWN_ROUTE_STATION", {"raw": pair["raw_destination"]}
            if len(pair.get("source_candidates", [])) > 1:
                return "AMBIGUOUS_STATION", {
                    "candidates": pair["source_candidates"],
                    "raw": pair["raw_source"],
                }
            if len(pair.get("destination_candidates", [])) > 1:
                return "AMBIGUOUS_STATION", {
                    "candidates": pair["destination_candidates"],
                    "raw": pair["raw_destination"],
                }

        # ── Follow-up with conversation context ───────────────────────────────
        ctx = self._context_from_history(conversation)
        if any(k in ml for k in TIME_KEYWORDS) and ctx["source"] and ctx["destination"]:
            return "JOURNEY_TIME", {"source": ctx["source"], "destination": ctx["destination"]}
        if any(k in ml for k in DISTANCE_KEYWORDS) and ctx["source"] and ctx["destination"]:
            return "DISTANCE", {"source": ctx["source"], "destination": ctx["destination"]}

        # ── Crowd / demand ────────────────────────────────────────────────────
        if any(k in ml for k in CROWD_KEYWORDS):
            # Try to find station in message
            station = self._find_single_station(message)
            if not station and ctx.get("station"):
                station = ctx["station"]
            return "DEMAND", {"station": station}

        # ── Line-specific update (before generic news) ────────────────────────
        line = self._detect_line(message)
        if line and any(k in ml for k in
                        STATUS_KEYWORDS + NEWS_KEYWORDS + DISRUPTION_KEYWORDS
                        + ["update", "latest"]):
            return "LINE_UPDATE", {"line": line}

        # ── Disruption ────────────────────────────────────────────────────────
        if any(k in ml for k in DISRUPTION_KEYWORDS):
            return "DISRUPTION", {"line": line}

        # ── Current status ────────────────────────────────────────────────────
        if any(k in ml for k in STATUS_KEYWORDS) and any(
            k in ml for k in METRO_DOMAIN_WORDS
        ):
            if line:
                return "LINE_UPDATE", {"line": line}
            return "CURRENT_STATUS", {}

        # ── News / updates ────────────────────────────────────────────────────
        if any(k in ml for k in NEWS_KEYWORDS) and any(
            k in ml for k in METRO_DOMAIN_WORDS
        ):
            return "NEWS", {"line": line}

        # ── Line information ──────────────────────────────────────────────────
        if line:
            return "LINE", {"line": line}

        # ── Network ───────────────────────────────────────────────────────────
        if any(k in ml for k in NETWORK_KEYWORDS):
            return "NETWORK", {}

        # ── Station lookup ────────────────────────────────────────────────────
        station = self._find_single_station(message)
        if station:
            if any(k in ml for k in CROWD_KEYWORDS):
                return "DEMAND", {"station": station}
            return "STATION", {"station": station}

        if any(k in ml for k in STATION_QUESTION_KEYWORDS):
            return "UNKNOWN_STATION", {}

        # ── General metro ─────────────────────────────────────────────────────
        if any(k in ml for k in METRO_DOMAIN_WORDS):
            return "GENERAL_METRO", {}

        return "OUT_OF_SCOPE", {}

    # ──────────────────────────── Handlers ──────────────────────────────────

    def _handle_greeting(self) -> dict:
        now = now_ist()
        h = now.hour
        if 5 <= h < 12:
            g = "Good morning"
        elif 12 <= h < 17:
            g = "Good afternoon"
        elif 17 <= h < 21:
            g = "Good evening"
        else:
            g = "Hello"
        facts = {"intent": "GREETING", "time_of_day": g}
        fallback = (
            f"{g}! How can I help you with Namma Metro today? "
            "Ask me about routes, stations, current service information, "
            "or the latest metro news."
        )
        return {"answer": fallback, "type": "greeting", "data": {}, "facts": facts}

    def _handle_date(self) -> dict:
        dt_label = current_datetime_label()
        facts = {"intent": "DATE", "current_datetime": dt_label}
        fallback = f"The current date and time is {dt_label}."
        return {"answer": fallback, "type": "general_metro", "data": {"datetime": dt_label}, "facts": facts}

    def _handle_route(self, entities: dict) -> dict:
        src = entities["source"]
        dst = entities["destination"]
        result = self.rs.calculate_route(src["station_code"], dst["station_code"])
        if result is None:
            return {
                "answer": (
                    f"No route could be calculated between "
                    f"{src['station_name']} and {dst['station_name']} "
                    f"on the current Namma Metro network."
                ),
                "type": "error", "data": {}, "facts": None,
            }
        facts = {
            "intent": "ROUTE",
            "source": result["source"],
            "destination": result["destination"],
            "stations_in_order": [s["station_name"] for s in result["stations"]],
            "lines_used": result["lines"],
            "interchange_stations": result["interchanges"],
            "interchange_count": result["interchange_count"],
            "distance_km": result["distance_km"],
            "app_estimated_time_minutes": result["estimated_time_minutes"],
            "station_count": result["station_count"],
            "note": (
                "distance_km and app_estimated_time_minutes are CALCULATED by "
                "the application route engine (avg 34 km/h + 25s dwell + "
                "4 min interchange penalty). Not official live journey times."
            ),
        }
        fallback = self._route_fallback(result)
        return {"answer": fallback, "type": "route", "data": result, "facts": facts}

    def _route_fallback(self, r: dict) -> str:
        ic = r["interchange_count"]
        ic_txt = (
            "no interchanges"
            if ic == 0
            else f"{ic} interchange{'s' if ic > 1 else ''} at "
                 + ", ".join(r["interchanges"])
        )
        lines_txt = " → ".join(r["lines"])
        return (
            f"Route: {r['source']} → {r['destination']}\n"
            f"Lines: {lines_txt}\n"
            f"Interchanges: {ic_txt}\n"
            f"Distance: ~{r['distance_km']} km\n"
            f"Estimated journey time: ~{r['estimated_time_minutes']} min "
            f"(CALCULATED — not official live data)"
        )

    def _handle_alternative_route(self, entities: dict) -> dict:
        src = entities.get("source")
        dst = entities.get("destination")
        if not src or not dst:
            return {
                "answer": (
                    "Please tell me the starting station and destination first, "
                    "then I can look for an alternative route."
                ),
                "type": "error", "data": {}, "facts": None,
            }
        result = self.rs.alternative_route(src["station_code"], dst["station_code"])
        if not result.get("alternative_route"):
            fallback = (
                result.get("message")
                or "Only one route is available between these stations."
            )
            facts = {"intent": "ALTERNATIVE_ROUTE", **result}
            return {"answer": fallback, "type": "alternative_route",
                    "data": result, "facts": facts}

        facts = {"intent": "ALTERNATIVE_ROUTE", **result}
        alt = result["alternative_route"]
        orig = result["original_route"]
        fallback = (
            f"Primary route: {self._route_fallback(orig)}\n\n"
            f"Alternative route: {self._route_fallback(alt)}"
        )
        return {"answer": fallback, "type": "alternative_route",
                "data": result, "facts": facts}

    def _handle_distance(self, entities: dict) -> dict:
        src = entities["source"]
        dst = entities["destination"]
        result = self.rs.calculate_route(src["station_code"], dst["station_code"])
        if result is None:
            return {
                "answer": f"No route found between {src['station_name']} and {dst['station_name']}.",
                "type": "error", "data": {}, "facts": None,
            }
        facts = {
            "intent": "DISTANCE",
            "source": result["source"],
            "destination": result["destination"],
            "distance_km": result["distance_km"],
            "route_summary": {
                "lines": result["lines"],
                "interchange_count": result["interchange_count"],
                "station_count": result["station_count"],
            },
            "note": "distance_km is CALCULATED by summing metro segment distances from network data.",
        }
        fallback = (
            f"The metro distance from {result['source']} to "
            f"{result['destination']} is approximately {result['distance_km']} km "
            f"(CALCULATED via {', '.join(result['lines'])})."
        )
        return {"answer": fallback, "type": "distance",
                "data": {"distance_km": result["distance_km"], **result}, "facts": facts}

    def _handle_journey_time(self, entities: dict) -> dict:
        src = entities["source"]
        dst = entities["destination"]
        result = self.rs.calculate_route(src["station_code"], dst["station_code"])
        if result is None:
            return {
                "answer": f"No route found between {src['station_name']} and {dst['station_name']}.",
                "type": "error", "data": {}, "facts": None,
            }
        facts = {
            "intent": "JOURNEY_TIME",
            "source": result["source"],
            "destination": result["destination"],
            "estimated_time_minutes": result["estimated_time_minutes"],
            "distance_km": result["distance_km"],
            "lines": result["lines"],
            "interchange_count": result["interchange_count"],
            "note": (
                "ESTIMATED journey time — calculated from avg speed (34 km/h), "
                "dwell time (25s/station), and interchange penalty (4 min each). "
                "Not official BMRCL live travel time."
            ),
        }
        fallback = (
            f"Estimated journey time from {result['source']} to "
            f"{result['destination']}: approximately {result['estimated_time_minutes']} minutes "
            f"(CALCULATED — actual times may vary)."
        )
        return {"answer": fallback, "type": "journey_time",
                "data": result, "facts": facts}

    def _handle_station(self, entities: dict) -> dict:
        s = entities["station"]
        code = s["station_code"]
        enriched = self.ss.enriched_station(code)
        if not enriched:
            return {
                "answer": f"Station details not available for {s['station_name']}.",
                "type": "error", "data": {}, "facts": None,
            }
        lines = enriched["lines"]
        is_ic = enriched["is_interchange"]
        facts = {
            "intent": "STATION",
            "station_name": enriched["station_name"],
            "station_code": code,
            "lines": lines,
            "is_interchange": is_ic,
            "layout": enriched.get("layout", ""),
            "opened_date": enriched.get("opened_date", ""),
            "coordinates": enriched.get("coordinates"),
            "station_name_kannada": enriched.get("station_name_kannada", ""),
            "note": "Station data from local station master — authoritative reference.",
        }
        lines_txt = " and ".join(lines) if len(lines) <= 2 else (
            ", ".join(lines[:-1]) + f" and {lines[-1]}"
        )
        fallback = (
            f"{enriched['station_name']} ({code}) is on the {lines_txt}."
        )
        if is_ic:
            fallback += " It is an interchange station where passengers can transfer between lines."
        if enriched.get("layout"):
            fallback += f" Station type: {enriched['layout']}."
        if enriched.get("opened_date"):
            fallback += f" Opened: {enriched['opened_date']}."
        return {"answer": fallback, "type": "station",
                "data": enriched, "facts": facts}

    def _handle_line(self, entities: dict) -> dict:
        line = entities["line"]
        if line in KNOWN_FUTURE_LINES:
            facts = {
                "intent": "LINE",
                "line": line,
                "operational": False,
                "note": (
                    f"{line} is not currently an operational passenger line "
                    "in this application's network data."
                ),
            }
            fallback = (
                f"{line} is not yet operational as a passenger line in the "
                "current Namma Metro network covered by this application. "
                "For the latest updates on planned lines, please check "
                "official BMRCL announcements."
            )
            return {"answer": fallback, "type": "line",
                    "data": facts, "facts": facts}

        rows = sorted(
            [r for r in self.ss.network if r["line"] == line],
            key=lambda r: r["sequence"],
        )
        if not rows:
            facts = {"intent": "LINE", "line": line, "operational": False}
            return {
                "answer": (
                    f"{line} is not found in the current network data. "
                    f"Operational lines are: {', '.join(OPERATIONAL_LINES)}."
                ),
                "type": "line", "data": facts, "facts": facts,
            }

        names = [r["station_name"] for r in rows]
        interchanges = [r["station_name"] for r in rows if r["is_interchange"]]
        facts = {
            "intent": "LINE",
            "line": line,
            "operational": True,
            "station_count": len(names),
            "terminal_stations": [names[0], names[-1]],
            "stations_in_order": names,
            "interchange_stations": interchanges,
        }
        fallback = (
            f"{line} is an operational Namma Metro line with {len(names)} stations, "
            f"running from {names[0]} to {names[-1]}."
        )
        if interchanges:
            fallback += f" Interchange station(s): {', '.join(interchanges)}."
        return {"answer": fallback, "type": "line", "data": facts, "facts": facts}

    def _handle_network(self) -> dict:
        lines = self.ss.operational_lines()
        ics = self.ss.interchange_stations()
        ic_names = [s["station_name"] for s in ics]
        total = len(self.ss.stations)
        facts = {
            "intent": "NETWORK",
            "operational_lines": lines,
            "total_stations": total,
            "interchange_stations": ic_names,
        }
        fallback = (
            f"Namma Metro currently has {len(lines)} operational lines "
            f"({', '.join(lines)}) covering {total} stations. "
            f"Interchange stations: {', '.join(ic_names) if ic_names else 'none recorded'}."
        )
        return {"answer": fallback, "type": "network", "data": facts, "facts": facts}

    def _handle_demand(self, entities: dict) -> dict:
        station = entities.get("station")
        if not station:
            fallback = (
                "Live crowd data is not available for Namma Metro stations. "
                "Please specify a station for an AI demand prediction based on "
                "current time-of-day signals."
            )
            return {"answer": fallback, "type": "demand", "data": {}, "facts": None}

        pred = predict_station_demand(
            station["station_name"],
            station["station_code"],
            station.get("line", ""),
        )
        facts = {
            "intent": "DEMAND",
            "station_name": station["station_name"],
            **pred,
        }
        return {
            "answer": pred["prediction"],
            "type": "demand",
            "data": pred,
            "facts": facts,
        }

    def _handle_current_status(self) -> dict:
        data = fetch_current_status()
        facts = {"intent": "CURRENT_STATUS", **data}
        if data.get("available"):
            fallback = f"LIVE — {data['summary']}"
        else:
            fallback = data["message"]
        return {"answer": fallback, "type": "current_status",
                "data": data, "facts": facts, "web_access": True}

    def _handle_disruption(self, entities: dict) -> dict:
        data = fetch_disruptions()
        facts = {"intent": "DISRUPTION", **data}
        if data.get("available"):
            fallback = f"LIVE — {data['summary']}"
        else:
            fallback = data["message"]
        return {"answer": fallback, "type": "disruption",
                "data": data, "facts": facts, "web_access": True}

    def _handle_news(self, entities: dict) -> dict:
        line = entities.get("line", "")
        topic = line if line else ""
        data = fetch_latest_news(topic)
        facts = {"intent": "NEWS", "line": line, **data}
        if data.get("available"):
            fallback = f"LIVE — {data['summary']}"
        else:
            fallback = data["message"]
        return {"answer": fallback, "type": "news",
                "data": data, "facts": facts, "web_access": True}

    def _handle_line_update(self, entities: dict) -> dict:
        line = entities.get("line", "")
        if not line:
            return self._handle_current_status()
        data = fetch_line_update(line)
        facts = {"intent": "LINE_UPDATE", "line": line, **data}
        if data.get("available"):
            fallback = f"LIVE — {data['summary']}"
        else:
            fallback = data["message"]
        return {"answer": fallback, "type": "line_update",
                "data": data, "facts": facts, "web_access": True}

    def _handle_unknown_station(self) -> dict:
        return {
            "answer": (
                "I couldn't find a matching station in the Namma Metro network. "
                "Please check the station name or try the full name "
                "(e.g. 'Whitefield (Kadugodi)', 'MG Road', 'Majestic')."
            ),
            "type": "error", "data": {}, "facts": None,
        }

    def _handle_unknown_route_station(self, entities: dict) -> dict:
        raw = entities.get("raw", "that station")
        return {
            "answer": (
                f"I couldn't match '{raw}' to a Namma Metro station. "
                "Please check the spelling or try the full station name."
            ),
            "type": "error", "data": {}, "facts": None,
        }

    def _handle_ambiguous(self, entities: dict) -> dict:
        names = sorted({c["station_name"] for c in entities.get("candidates", [])})[:6]
        raw = entities.get("raw", "")
        return {
            "answer": (
                f"I found multiple possible matches for '{raw}': "
                f"{'; '.join(names)}. Which station do you mean?"
            ),
            "type": "station", "data": {"candidates": names}, "facts": None,
        }

    def _handle_general_metro(self, message: str) -> dict:
        lines = self.ss.operational_lines()
        total = len(self.ss.stations)
        facts = {
            "intent": "GENERAL_METRO",
            "operational_lines": lines,
            "total_stations": total,
            "current_datetime": current_datetime_label(),
        }
        fallback = (
            f"Namma Metro is Bengaluru's rapid transit system operated by BMRCL. "
            f"It currently has {len(lines)} operational lines "
            f"({', '.join(lines)}) with {total} stations. "
            "Ask me about a specific route, station, line, or current metro news."
        )
        return {"answer": fallback, "type": "general_metro",
                "data": facts, "facts": facts}

    def _handle_out_of_scope(self) -> dict:
        return {
            "answer": (
                "I'm focused on Namma Metro and Bengaluru transit. "
                "Ask me about stations, routes, current metro news, "
                "travel times, or service information."
            ),
            "type": "out_of_scope", "data": {}, "facts": None,
        }

    # ──────────────────────────── Main entry ─────────────────────────────────

    def chat(self, message: str, conversation: Optional[list] = None) -> dict:
        conversation = conversation or []
        message = message.strip()
        intent, entities = self.detect_intent(message, conversation)

        # ── Intents that never need AI ────────────────────────────────────────
        if intent == "GREETING":
            result = self._handle_greeting()
        elif intent == "DATE":
            result = self._handle_date()
        elif intent == "AMBIGUOUS_STATION":
            result = self._handle_ambiguous(entities)
        elif intent == "UNKNOWN_STATION":
            result = self._handle_unknown_station()
        elif intent == "UNKNOWN_ROUTE_STATION":
            result = self._handle_unknown_route_station(entities)
        elif intent == "OUT_OF_SCOPE":
            result = self._handle_out_of_scope()

        # ── Intents that compute first, then AI-narrate ───────────────────────
        elif intent == "ROUTE":
            result = self._handle_route(entities)
        elif intent == "ALTERNATIVE_ROUTE":
            result = self._handle_alternative_route(entities)
        elif intent == "DISTANCE":
            result = self._handle_distance(entities)
        elif intent == "JOURNEY_TIME":
            result = self._handle_journey_time(entities)
        elif intent == "STATION":
            result = self._handle_station(entities)
        elif intent == "LINE":
            result = self._handle_line(entities)
        elif intent == "NETWORK":
            result = self._handle_network()
        elif intent == "DEMAND":
            result = self._handle_demand(entities)

        # ── Intents that use live web retrieval ───────────────────────────────
        elif intent == "CURRENT_STATUS":
            result = self._handle_current_status()
        elif intent == "DISRUPTION":
            result = self._handle_disruption(entities)
        elif intent == "NEWS":
            result = self._handle_news(entities)
        elif intent == "LINE_UPDATE":
            result = self._handle_line_update(entities)
        else:
            result = self._handle_general_metro(message)

        # ── If no facts → skip AI (deterministic answer is sufficient) ────────
        if result.get("facts") is None:
            return {
                "answer": result["answer"],
                "type":   result["type"],
                "data":   result.get("data", {}),
            }

        # ── DEMAND predictions are already AI-generated (via prediction_service)
        if intent == "DEMAND":
            return {
                "answer": result["answer"],
                "type":   result["type"],
                "data":   result.get("data", {}),
            }

        # ── Greetings get a quick natural response without heavy AI call ──────
        if intent == "GREETING":
            try:
                ai_result = ai_service.safe_call(
                    user_message=message,
                    context_facts=result["facts"],
                    conversation_history=conversation,
                    web_access=False,
                    fallback_text=result["answer"],
                )
                return {
                    "answer": ai_result["answer"],
                    "type":   result["type"],
                    "data":   result.get("data", {}),
                }
            except Exception:
                pass
            return {
                "answer": result["answer"],
                "type":   result["type"],
                "data":   result.get("data", {}),
            }

        # ── Live-data responses: if data is available, narrate it with AI ─────
        web_access_needed = result.get("web_access", False)

        try:
            ai_result = ai_service.safe_call(
                user_message=message,
                context_facts=result["facts"],
                conversation_history=conversation,
                web_access=False,  # facts already fetched; don't double-fetch
                fallback_text=result["answer"],
            )
            answer = ai_result["answer"]
        except Exception:
            answer = result["answer"]

        return {
            "answer": answer,
            "type":   result["type"],
            "data":   result.get("data", {}),
        }
