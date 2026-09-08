"""
NammaRoute AI — Flask backend entry point.

Architecture:
  StationService  → authoritative station/network reference
  RouteService    → Dijkstra shortest-path + journey-time calculation
  ChatService     → intent detection → verified context → AI narration
  AIService       → RapidAPI client (backend only — key never exposed)
  LiveDataService → current web information via RapidAPI web_access
  PredictionService → AI demand predictions (clearly labelled)
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env before anything else that reads os.environ
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

from flask import Flask, jsonify, request

# Services
from services.station_service import StationService
from services.route_service import RouteService
from services.chat_service import ChatService
from services.live_data_service import (
    fetch_current_status, fetch_latest_news,
    fetch_disruptions, fetch_line_update,
)
from services.prediction_service import predict_station_demand, predict_network_demand
from services.ai_service import ai_service
from utils.time_utils import current_datetime_label, now_iso_ist

# ── App initialisation ────────────────────────────────────────────────────────
app = Flask(__name__)

# ── CORS ──────────────────────────────────────────────────────────────────────
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.route("/api/<path:path>", methods=["OPTIONS"])
def options_handler(path):
    return "", 204

# ── Bootstrap services ────────────────────────────────────────────────────────
station_service = StationService()
route_service   = RouteService(station_service)
chat_service    = ChatService(station_service, route_service)


# ══════════════════════════════════════════════════════════════════════════════
# STATION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/stations")
def get_stations():
    """All metro stations (station master)."""
    return jsonify(station_service.get_all_stations())


@app.get("/api/stations/<station_code>")
def get_station(station_code: str):
    """Single station by code, enriched with network data."""
    enriched = station_service.enriched_station(station_code.upper())
    if not enriched:
        return jsonify({"error": f"Station '{station_code}' not found."}), 404
    return jsonify({
        "success": True,
        "source": "station_master",
        "data": enriched,
    })


@app.get("/api/network")
def get_network():
    """Full network graph data for the map."""
    return jsonify(station_service.get_network())


# ══════════════════════════════════════════════════════════════════════════════
# ROUTE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/route")
def get_route():
    """
    Calculate shortest route between two stations.
    Accepts station codes OR station names.
    """
    src_param = request.args.get("source", "").strip()
    dst_param = request.args.get("destination", "").strip()

    if not src_param or not dst_param:
        return jsonify({"error": "Both 'source' and 'destination' are required."}), 400

    # Resolve: try as code first, then fuzzy name
    src_station = _resolve_station_param(src_param)
    dst_station = _resolve_station_param(dst_param)

    if not src_station:
        return jsonify({"error": f"Could not find station: '{src_param}'"}), 400
    if not dst_station:
        return jsonify({"error": f"Could not find station: '{dst_param}'"}), 400
    if src_station["station_code"] == dst_station["station_code"]:
        return jsonify({"error": "Please select two different stations."}), 400

    result = route_service.calculate_route(
        src_station["station_code"], dst_station["station_code"]
    )
    if result is None:
        return jsonify({"error": "No route found between these stations."}), 404

    # AI insight (non-blocking — falls back silently)
    ai_insight = _generate_route_insight(result)

    return jsonify({
        "success": True,
        "source": "calculated",
        "data": result,
        "ai_insight": ai_insight,
        "retrieved_at": now_iso_ist(),
    })


@app.get("/api/alternative-route")
def get_alternative_route():
    """
    Return primary + alternative route (for comparison / disruption-aware routing).
    """
    src_param = request.args.get("source", "").strip()
    dst_param = request.args.get("destination", "").strip()

    src_station = _resolve_station_param(src_param)
    dst_station = _resolve_station_param(dst_param)

    if not src_station or not dst_station:
        return jsonify({"error": "Please provide valid source and destination stations."}), 400
    if src_station["station_code"] == dst_station["station_code"]:
        return jsonify({"error": "Please select two different stations."}), 400

    result = route_service.alternative_route(
        src_station["station_code"], dst_station["station_code"]
    )

    # Attach AI insight for the primary route
    primary = result.get("original_route")
    ai_insight = _generate_route_insight(primary) if primary else ""

    return jsonify({
        **result,
        "ai_insight": ai_insight,
        "success": True,
        "source": "calculated",
    })


def _resolve_station_param(param: str):
    """Try station code, then fuzzy name matching."""
    # Try exact code
    s = station_service.get_station_by_code(param)
    if s:
        return s
    # Try fuzzy
    s, cands = station_service.find_station(param)
    return s


def _generate_route_insight(route_data: dict) -> str:
    """Generate AI travel insight for a route (non-blocking)."""
    if not route_data or not ai_service.is_configured():
        return _fallback_route_insight(route_data)

    context = {
        "intent": "AI_TRAVEL_INSIGHT",
        "source": route_data.get("source"),
        "destination": route_data.get("destination"),
        "lines": route_data.get("lines", []),
        "interchange_count": route_data.get("interchange_count", 0),
        "interchange_stations": route_data.get("interchanges", []),
        "distance_km": route_data.get("distance_km"),
        "estimated_time_minutes": route_data.get("estimated_time_minutes"),
        "station_count": route_data.get("station_count"),
        "current_datetime": current_datetime_label(),
        "note": (
            "Generate a concise AI travel insight (3-4 sentences) for this route. "
            "Mention lines, interchanges, estimated time. "
            "Do NOT invent current alerts or crowd data. "
            "Clearly call the time estimate 'approximately' or 'estimated'."
        ),
    }

    result = ai_service.safe_call(
        user_message=f"AI travel insight for {route_data.get('source')} to {route_data.get('destination')}",
        context_facts=context,
        web_access=False,
        fallback_text=_fallback_route_insight(route_data),
    )
    return result["answer"]


def _fallback_route_insight(route_data: dict) -> str:
    if not route_data:
        return ""
    ic = route_data.get("interchange_count", 0)
    lines = route_data.get("lines", [])
    dist = route_data.get("distance_km", 0)
    mins = route_data.get("estimated_time_minutes", 0)
    parts = [
        f"This route uses the {' and '.join(lines)}." if lines else "",
        f"It covers approximately {dist} km with an estimated journey time of {mins} minutes."
        if dist and mins else "",
        "No line change is required — a direct service." if ic == 0 else
        f"One interchange is required at {route_data['interchanges'][0]}." if ic == 1 else
        f"{ic} interchanges are required." if ic > 1 else "",
    ]
    return " ".join(p for p in parts if p)


# ══════════════════════════════════════════════════════════════════════════════
# CURRENT INFORMATION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/current-status")
def get_current_status():
    """Current Namma Metro service status (live web retrieval)."""
    data = fetch_current_status()
    return jsonify({
        "success": True,
        "type": "live_web" if data.get("available") else "unavailable",
        **data,
    })


@app.get("/api/current-news")
def get_current_news():
    """Latest Namma Metro news (live web retrieval)."""
    topic = request.args.get("topic", "").strip()
    data = fetch_latest_news(topic)
    return jsonify({
        "success": True,
        "type": "live_web" if data.get("available") else "unavailable",
        **data,
    })


@app.get("/api/current-updates")
def get_current_updates():
    """Current disruptions and status (live web retrieval)."""
    data = fetch_disruptions()
    return jsonify({
        "success": True,
        "type": "live_web" if data.get("available") else "unavailable",
        **data,
    })


@app.get("/api/station/<station_code>/current")
def get_station_current(station_code: str):
    """Current information for a specific station."""
    s = station_service.enriched_station(station_code.upper())
    if not s:
        return jsonify({"error": f"Station '{station_code}' not found."}), 404

    # Demand prediction
    pred = predict_station_demand(
        s["station_name"],
        s["station_code"],
        s.get("line", s.get("lines", [""])[0] if s.get("lines") else ""),
    )

    return jsonify({
        "success": True,
        "station": s,
        "demand_prediction": pred,
        "retrieved_at": now_iso_ist(),
    })


# ══════════════════════════════════════════════════════════════════════════════
# DEMAND / PREDICTION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/demand")
def get_demand():
    """Network-level demand prediction."""
    pred = predict_network_demand()
    return jsonify({
        "success": True,
        "type": "ai_prediction",
        **pred,
    })


@app.get("/api/demand/prediction")
def get_demand_prediction():
    """Station-level demand prediction."""
    code = request.args.get("station_code", "").strip().upper()
    if not code:
        return jsonify({"error": "station_code is required"}), 400

    s = station_service.enriched_station(code)
    if not s:
        return jsonify({"error": f"Station '{code}' not found."}), 404

    line = (s.get("lines") or [""])[0]
    pred = predict_station_demand(s["station_name"], code, line)
    return jsonify({"success": True, **pred})


# ══════════════════════════════════════════════════════════════════════════════
# AI ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/ai/recommend")
def ai_recommend():
    """AI travel insight for a given route context."""
    context = request.get_json(force=True, silent=True) or {}

    route_data = (
        context.get("recommended_route")
        or context.get("original_route")
        or context
    )

    insight = _generate_route_insight(route_data)
    return jsonify({
        "success": True,
        "source": "ai" if ai_service.is_configured() else "fallback",
        "text": insight,
        "ai_insight": insight,  # backwards-compatible key
    })


@app.post("/api/chat")
def chat():
    """Main chatbot endpoint."""
    body = request.get_json(force=True, silent=True)
    if not body or not isinstance(body, dict):
        return jsonify({"error": "Request body is required."}), 400

    message = body.get("message", "")
    if not message or not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Message is required."}), 400

    conversation = body.get("conversation", [])
    if not isinstance(conversation, list):
        conversation = []
    conversation = conversation[-20:]  # bounded history

    try:
        result = chat_service.chat(message.strip(), conversation)
    except Exception as exc:
        # Last-resort fallback — should not normally reach here
        return jsonify({
            "answer": (
                "I'm unable to process that request right now. "
                "Please try rephrasing or ask again in a moment."
            ),
            "type": "error",
            "data": {},
        })

    return jsonify({
        "answer": result.get("answer", ""),
        "type":   result.get("type", "general_metro"),
        "data":   result.get("data", {}),
    })


# ══════════════════════════════════════════════════════════════════════════════
# UTILITY ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    """Health check and configuration status."""
    return jsonify({
        "status": "ok",
        "current_datetime": current_datetime_label(),
        "stations_loaded": len(station_service.stations),
        "network_edges": len(station_service.network),
        "operational_lines": station_service.operational_lines(),
        "interchange_stations": len(station_service.interchange_stations()),
        "ai_configured": ai_service.is_configured(),
        "note": (
            "Route/distance/time are calculated deterministically. "
            "AI is used only for natural-language generation and live web queries."
        ),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
