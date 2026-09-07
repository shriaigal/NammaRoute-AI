"""
Live Data Service - retrieves current metro information via RapidAPI web access.

Responsibilities:
  - Current metro status queries
  - Latest news queries
  - Current disruption queries
  - Infrastructure/project update queries
  - Short-TTL caching to reduce API calls
  - Clear unavailability signalling (never fabricates data)
"""
import time
from typing import Optional

from services.ai_service import ai_service
from utils.time_utils import current_datetime_label, now_iso_ist
from config import LIVE_CACHE_TTL_SECONDS


# Simple in-memory cache: key → (timestamp, result_dict)
_cache: dict[str, tuple[float, dict]] = {}


def _cache_get(key: str) -> Optional[dict]:
    if key in _cache:
        ts, val = _cache[key]
        if time.monotonic() - ts < LIVE_CACHE_TTL_SECONDS:
            return val
    return None


def _cache_set(key: str, val: dict) -> None:
    _cache[key] = (time.monotonic(), val)


def _unavailable(topic: str = "Live service information") -> dict:
    return {
        "available": False,
        "topic": topic,
        "message": f"{topic} is currently unavailable. Please check BMRCL official channels.",
        "retrieved_at": now_iso_ist(),
    }


def _build_web_query(topic: str, extra: str = "") -> str:
    date_label = current_datetime_label()
    base = f"Latest Bengaluru Namma Metro BMRCL {topic} {date_label}"
    if extra:
        base += f" {extra}"
    return base


def fetch_current_status() -> dict:
    """Fetch current Namma Metro line status."""
    cache_key = "current_status"
    cached = _cache_get(cache_key)
    if cached:
        return {**cached, "from_cache": True}

    if not ai_service.is_configured():
        return _unavailable("Current metro status")

    query = _build_web_query("line service status update disruption")
    context = {
        "intent": "CURRENT_STATUS",
        "note": (
            "Retrieve current Namma Metro operational status for all lines "
            "(Purple Line, Green Line, Yellow Line). "
            "If you find current verified information, summarize it clearly. "
            "If you cannot find reliable current information, say so explicitly. "
            "Do NOT invent service status."
        ),
    }

    result = ai_service.safe_call(
        user_message=query,
        context_facts=context,
        web_access=True,
        fallback_text="",
    )

    if result["source"] == "fallback" or not result["answer"].strip():
        out = _unavailable("Current metro status")
    else:
        out = {
            "available": True,
            "topic": "Current Metro Status",
            "summary": result["answer"],
            "retrieved_at": now_iso_ist(),
            "source": "live_web",
            "disclaimer": (
                "Retrieved via AI web access. Always verify with official "
                "BMRCL channels for critical travel decisions."
            ),
        }
        _cache_set(cache_key, out)

    return out


def fetch_latest_news(specific_topic: str = "") -> dict:
    """Fetch the latest Namma Metro news."""
    cache_key = f"news_{specific_topic[:30]}"
    cached = _cache_get(cache_key)
    if cached:
        return {**cached, "from_cache": True}

    if not ai_service.is_configured():
        return _unavailable("Latest metro news")

    topic_str = specific_topic if specific_topic else "news update announcement expansion"
    query = _build_web_query(topic_str, "official BMRCL")
    context = {
        "intent": "NEWS",
        "specific_topic": specific_topic or "general metro news",
        "note": (
            "Find the latest, most recent news about Bengaluru Namma Metro / BMRCL. "
            "Prioritize: 1) Official BMRCL announcements, 2) Government transport "
            "announcements, 3) Reliable news sources. "
            "Include publication dates where available. "
            "Do NOT present old articles as current news. "
            "If you cannot find reliably current information, say so."
        ),
    }

    result = ai_service.safe_call(
        user_message=query,
        context_facts=context,
        web_access=True,
        fallback_text="",
    )

    if result["source"] == "fallback" or not result["answer"].strip():
        out = _unavailable("Latest metro news")
    else:
        out = {
            "available": True,
            "topic": f"Latest Metro News{' — ' + specific_topic if specific_topic else ''}",
            "summary": result["answer"],
            "retrieved_at": now_iso_ist(),
            "source": "live_web",
            "disclaimer": (
                "Retrieved via AI web access. Publication dates are as "
                "reported by sources found online."
            ),
        }
        _cache_set(cache_key, out)

    return out


def fetch_disruptions() -> dict:
    """Fetch current metro disruptions / service alerts."""
    cache_key = "disruptions"
    cached = _cache_get(cache_key)
    if cached:
        return {**cached, "from_cache": True}

    if not ai_service.is_configured():
        return _unavailable("Disruption information")

    query = _build_web_query("service disruption delay cancellation alert problem")
    context = {
        "intent": "DISRUPTION",
        "note": (
            "Find current service disruptions or delays on Bengaluru Namma Metro. "
            "Only report VERIFIED disruptions from reliable sources. "
            "Do NOT claim 'no disruption' unless you can verify it from an "
            "authoritative source. If you cannot verify the current status, "
            "say that disruption information is currently unavailable."
        ),
    }

    result = ai_service.safe_call(
        user_message=query,
        context_facts=context,
        web_access=True,
        fallback_text="",
    )

    if result["source"] == "fallback" or not result["answer"].strip():
        out = _unavailable("Current disruption information")
    else:
        out = {
            "available": True,
            "topic": "Current Disruptions",
            "summary": result["answer"],
            "retrieved_at": now_iso_ist(),
            "source": "live_web",
            "disclaimer": (
                "Retrieved via AI web access. Verify with BMRCL official channels."
            ),
        }
        _cache_set(cache_key, out)

    return out


def fetch_line_update(line: str) -> dict:
    """Fetch current update for a specific metro line."""
    safe_line = line.replace("/", "_").replace(" ", "_")
    cache_key = f"line_update_{safe_line}"
    cached = _cache_get(cache_key)
    if cached:
        return {**cached, "from_cache": True}

    if not ai_service.is_configured():
        return _unavailable(f"Current {line} update")

    query = _build_web_query(f"{line} update service status expansion construction")
    context = {
        "intent": "LINE_UPDATE",
        "line": line,
        "note": (
            f"Find the latest news or status update for Bengaluru Namma Metro {line}. "
            "Include construction updates, new station openings, service status, "
            "or any recent announcements. "
            "Prioritize official BMRCL sources. "
            "If the line is not yet operational (e.g. Pink Line, Blue Line), "
            "accurately report its planned/under-construction status — "
            "do NOT claim it is operational."
        ),
    }

    result = ai_service.safe_call(
        user_message=query,
        context_facts=context,
        web_access=True,
        fallback_text="",
    )

    if result["source"] == "fallback" or not result["answer"].strip():
        out = _unavailable(f"Current {line} information")
    else:
        out = {
            "available": True,
            "topic": f"Current {line} Update",
            "line": line,
            "summary": result["answer"],
            "retrieved_at": now_iso_ist(),
            "source": "live_web",
            "disclaimer": "Retrieved via AI web access.",
        }
        _cache_set(cache_key, out)

    return out
