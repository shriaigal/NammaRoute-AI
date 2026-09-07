"""
Route Service - graph-based route calculation engine.

Each (station_code, line) pair is a graph node.  Interchange stations
appear once per line, connected to each other by zero-distance edges
(transfer penalty applied separately in travel-time calculation).

Never lets the AI guess a route - all route facts are deterministic.
"""
import heapq
import math
from typing import Optional

from config import AVG_SPEED_KMH, DWELL_SECONDS_PER_STATION, INTERCHANGE_PENALTY_MIN


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


class RouteService:
    """Build the station graph from StationService and compute shortest paths."""

    def __init__(self, station_service):
        self.ss = station_service
        self._build_graph()

    def _node(self, code: str, line: str) -> str:
        return f"{code}|{line}"

    def _build_graph(self):
        self.graph: dict[str, list[tuple]] = {}      # node → [(neighbor, km, is_ic)]
        self.node_info: dict[str, dict] = {}          # node → {code, line, name}
        by_code: dict[str, list[str]] = {}

        for row in self.ss.network:
            node = self._node(row["station_code"], row["line"])
            self.graph.setdefault(node, [])
            self.node_info[node] = {
                "code": row["station_code"],
                "line": row["line"],
                "name": row["station_name"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "sequence": row["sequence"],
            }
            by_code.setdefault(row["station_code"], []).append(node)

            if row["next_station_code"] and row["distance_to_next_km"] is not None:
                km = row["distance_to_next_km"]
                next_node = self._node(row["next_station_code"], row["line"])
                self.graph.setdefault(next_node, [])
                self.graph[node].append((next_node, km, False))
                self.graph[next_node].append((node, km, False))

        # Interchange edges (zero km)
        for code, nodes in by_code.items():
            if len(nodes) > 1:
                for i in range(len(nodes)):
                    for j in range(i + 1, len(nodes)):
                        self.graph[nodes[i]].append((nodes[j], 0.0, True))
                        self.graph[nodes[j]].append((nodes[i], 0.0, True))

    def _nodes_for_code(self, code: str) -> list[str]:
        return [n for n, info in self.node_info.items() if info["code"] == code]

    def _dijkstra(self, src_code: str, dst_code: str,
                  blocked_edges: Optional[set] = None) -> Optional[list[str]]:
        """Return list of node strings for the shortest path, or None."""
        blocked_edges = blocked_edges or set()
        src_nodes = self._nodes_for_code(src_code)
        dst_nodes = set(self._nodes_for_code(dst_code))
        if not src_nodes or not dst_nodes:
            return None

        INF = float("inf")
        dist = {n: INF for n in self.graph}
        prev: dict[str, str] = {}
        for n in src_nodes:
            dist[n] = 0.0
        pq = [(0.0, n) for n in src_nodes]
        heapq.heapify(pq)
        visited: set[str] = set()

        while pq:
            d, u = heapq.heappop(pq)
            if u in visited:
                continue
            visited.add(u)
            if u in dst_nodes:
                break
            for v, w, is_ic in self.graph.get(u, []):
                if not is_ic:
                    uc = self.node_info[u]["code"]
                    vc = self.node_info[v]["code"]
                    if frozenset((uc, vc)) in blocked_edges:
                        continue
                nd = d + w
                if nd < dist.get(v, INF):
                    dist[v] = nd
                    prev[v] = u
                    heapq.heappush(pq, (nd, v))

        reachable = [n for n in dst_nodes if dist.get(n, INF) < INF]
        if not reachable:
            return None
        end = min(reachable, key=lambda n: dist[n])
        path = [end]
        while path[-1] in prev:
            path.append(prev[path[-1]])
        path.reverse()
        return path

    def _summarize(self, path_nodes: list[str]) -> dict:
        """Convert a list of graph nodes into a structured route result."""
        stations = []
        lines_used: list[str] = []
        interchange_stations: list[str] = []
        total_km = 0.0
        prev_line = None
        seen_codes: set[str] = set()

        for i, node in enumerate(path_nodes):
            info = self.node_info[node]
            line = info["line"]

            if not lines_used or lines_used[-1] != line:
                if line not in lines_used:
                    lines_used.append(line)

            if prev_line is not None and line != prev_line:
                if info["name"] not in interchange_stations:
                    interchange_stations.append(info["name"])

            prev_line = line

            if info["code"] not in seen_codes:
                stations.append({
                    "station_code": info["code"],
                    "station_name": info["name"],
                    "line": line,
                    "latitude": info.get("latitude"),
                    "longitude": info.get("longitude"),
                })
                seen_codes.add(info["code"])

            if i + 1 < len(path_nodes):
                nxt = path_nodes[i + 1]
                for nb, w, _ in self.graph[node]:
                    if nb == nxt:
                        total_km += w
                        break

        ic_count = len(interchange_stations)
        n_stations = len(stations)
        travel_min = (total_km / AVG_SPEED_KMH) * 60
        dwell_min  = (n_stations * DWELL_SECONDS_PER_STATION) / 60
        ic_min     = ic_count * INTERCHANGE_PENALTY_MIN
        est_min    = round(travel_min + dwell_min + ic_min)

        return {
            "stations":              stations,
            "station_count":         n_stations,
            "distance_km":           round(total_km, 2),
            "lines":                 lines_used,
            "interchanges":          interchange_stations,
            "interchange_count":     ic_count,
            "estimated_time_minutes": est_min,
        }

    def calculate_route(self, src_code: str, dst_code: str,
                        blocked_edges: Optional[set] = None) -> Optional[dict]:
        """
        Return a route summary dict or None if no route exists.
        blocked_edges: set of frozenset({codeA, codeB}) pairs to exclude.
        """
        path = self._dijkstra(src_code, dst_code, blocked_edges)
        if path is None:
            return None
        result = self._summarize(path)
        src_s = self.ss.station_by_code.get(src_code, {})
        dst_s = self.ss.station_by_code.get(dst_code, {})
        result["source"]           = src_s.get("station_name", src_code)
        result["destination"]      = dst_s.get("station_name", dst_code)
        result["source_code"]      = src_code
        result["destination_code"] = dst_code
        result["calculation_method"] = (
            "Backend graph (Dijkstra) — calculated, not AI-generated"
        )
        return result

    def alternative_route(self, src_code: str, dst_code: str) -> dict:
        """
        Return both an original and an alternative route.
        The alternative is found by blocking the first segment of the
        primary route (forcing a different initial path).
        """
        original = self.calculate_route(src_code, dst_code)
        if original is None:
            return {
                "original_route": None,
                "alternative_route": None,
                "affected": False,
                "message": "No route could be calculated between these stations.",
            }

        # Build a blocked-edges set from the first segment of the primary route
        path_codes = [s["station_code"] for s in original["stations"]]
        blocked: set = set()
        if len(path_codes) >= 2:
            # Block the first two station-to-station edges to force a detour
            for a, b in zip(path_codes[:3], path_codes[1:4]):
                blocked.add(frozenset((a, b)))

        alt = self.calculate_route(src_code, dst_code, blocked_edges=blocked)

        # If alternative == original (same distance), it's the same route
        if (alt is None or
                (alt["distance_km"] == original["distance_km"]
                 and alt["station_count"] == original["station_count"])):
            return {
                "original_route": original,
                "alternative_route": None,
                "affected": False,
                "message": (
                    "Only one route is available between these stations "
                    "via the current Namma Metro network."
                ),
            }

        return {
            "original_route": original,
            "alternative_route": alt,
            "affected": False,
            "message": (
                "An alternative route is available. The primary route is "
                "the shortest path."
            ),
        }
