"""
Station Service - the single authoritative source for all station/network
reference data.

Loads stations.csv and network.csv once at start-up.  Provides:
  - station lookup (by code, by name, fuzzy)
  - network graph data
  - interchange detection
"""
import csv
from pathlib import Path
from typing import Optional

from config import DATA_DIR
from utils.text_normalizer import find_station_matches, normalize


def _read_csv(name: str) -> list[dict]:
    path = DATA_DIR / name
    if not path.exists():
        raise FileNotFoundError(
            f"Required dataset '{name}' not found in {DATA_DIR}. "
            "NammaRoute AI cannot fabricate station data."
        )
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


class StationService:
    """Loaded once at app startup; held in memory."""

    def __init__(self):
        self._load()

    def _load(self):
        # ── stations.csv ──────────────────────────────────────────────────────
        raw_stations = _read_csv("stations.csv")
        seen_codes: set[str] = set()
        self.stations: list[dict] = []
        for r in raw_stations:
            code = r["station_code"].strip()
            if code in seen_codes:
                continue  # deduplicate interchange stations that appear once per line
            seen_codes.add(code)
            self.stations.append({
                "station_code":        code,
                "station_name":        r["station_name"].strip(),
                "station_name_kannada": r.get("station_name_kannada", "").strip(),
                "line":                r["line"].strip(),
                "opened_date":         r.get("opened_date", "").strip(),
                "day":                 r.get("day", "").strip(),
                "layout":              r.get("layout", "").strip(),
            })
        self.station_by_code: dict[str, dict] = {
            s["station_code"]: s for s in self.stations
        }

        # ── network.csv ───────────────────────────────────────────────────────
        raw_network = _read_csv("network.csv")
        self.network: list[dict] = []
        for r in raw_network:
            self.network.append({
                "station_code":       r["station_code"].strip(),
                "station_name":       r["station_name"].strip(),
                "line":               r["line"].strip(),
                "sequence":           int(r["sequence"]),
                "is_interchange":     int(r["is_interchange"]),
                "next_station_code":  r["next_station_code"].strip() or None,
                "latitude":           float(r["latitude"]),
                "longitude":          float(r["longitude"]),
                "distance_to_next_km": (
                    float(r["distance_to_next_km"])
                    if r.get("distance_to_next_km", "").strip()
                    else None
                ),
                "line_color":         r.get("line_color", "#64748B").strip(),
            })

        self.network_by_code: dict[str, list[dict]] = {}
        for r in self.network:
            self.network_by_code.setdefault(r["station_code"], []).append(r)

        # Pre-compute lines per station code (for interchange detection)
        self._lines_per_code: dict[str, set[str]] = {}
        for r in self.network:
            self._lines_per_code.setdefault(r["station_code"], set()).add(r["line"])

    # ── Lookup methods ────────────────────────────────────────────────────────

    def get_all_stations(self) -> list[dict]:
        """All stations (unique by code, sorted by line then sequence)."""
        seen = set()
        result = []
        for r in sorted(self.network, key=lambda x: (x["line"], x["sequence"])):
            if r["station_code"] not in seen:
                s = self.station_by_code.get(r["station_code"])
                if s:
                    result.append(s)
                    seen.add(r["station_code"])
        # Add any stations not in network (shouldn't happen but defensive)
        for s in self.stations:
            if s["station_code"] not in seen:
                result.append(s)
        return result

    def get_station_by_code(self, code: str) -> Optional[dict]:
        return self.station_by_code.get(code.upper())

    def find_station(self, query: str) -> tuple[Optional[dict], list[dict]]:
        """
        Resolve a free-text query to a station.

        Returns (station_or_None, candidates).
        - candidates empty  → no match
        - candidates == 1   → clean match (same as first return value)
        - candidates > 1    → ambiguous; first return value is None
        """
        matches = find_station_matches(query, self.stations)
        if len(matches) == 1:
            return matches[0], matches
        if len(matches) > 1:
            return None, matches
        return None, []

    def is_interchange(self, code: str) -> bool:
        rows = self.network_by_code.get(code, [])
        if not rows:
            return False
        # A station is an interchange if network.csv marks it OR if it
        # appears on multiple lines.
        return bool(rows[0]["is_interchange"]) or (
            len(self._lines_per_code.get(code, set())) > 1
        )

    def lines_for_station(self, code: str) -> list[str]:
        return sorted(self._lines_per_code.get(code, set()))

    def coordinates_for_station(self, code: str) -> Optional[dict]:
        rows = self.network_by_code.get(code, [])
        if not rows:
            return None
        return {"latitude": rows[0]["latitude"], "longitude": rows[0]["longitude"]}

    def enriched_station(self, code: str) -> Optional[dict]:
        """Return station dict enriched with network fields."""
        s = self.get_station_by_code(code)
        if not s:
            return None
        rows = self.network_by_code.get(code, [])
        lines = self.lines_for_station(code)
        is_ic = self.is_interchange(code)
        coords = self.coordinates_for_station(code)
        return {
            **s,
            "lines": lines,
            "is_interchange": is_ic,
            "coordinates": coords,
        }

    def get_network(self) -> list[dict]:
        return self.network

    def operational_lines(self) -> list[str]:
        return sorted({r["line"] for r in self.network})

    def interchange_stations(self) -> list[dict]:
        return [
            self.station_by_code[code]
            for code, lines in self._lines_per_code.items()
            if len(lines) > 1 and code in self.station_by_code
        ]
