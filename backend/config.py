"""
Central configuration for NammaRoute AI backend.
All tunable constants live here.
"""
import os
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

# ── RapidAPI ──────────────────────────────────────────────────────────────────
RAPIDAPI_KEY  = os.environ.get("RAPIDAPI_KEY", "").strip()
RAPIDAPI_HOST = os.environ.get("RAPIDAPI_HOST", "chatgpt-42.p.rapidapi.com").strip()
RAPIDAPI_URL  = f"https://{RAPIDAPI_HOST}/conversationgpt4-2"
RAPIDAPI_TIMEOUT_SECONDS = 15

# ── Route / Travel-time calculation constants ─────────────────────────────────
AVG_SPEED_KMH             = 34.0   # Namma Metro average operating speed
DWELL_SECONDS_PER_STATION = 25     # approx station dwell time
INTERCHANGE_PENALTY_MIN   = 4      # walking + waiting time per interchange

# ── Live data / news cache ────────────────────────────────────────────────────
LIVE_CACHE_TTL_SECONDS = 300       # 5-minute cache for live web results

# ── AI parameters ─────────────────────────────────────────────────────────────
AI_TEMPERATURE  = 0.2
AI_MAX_TOKENS   = 512
AI_TOP_K        = 5
AI_TOP_P        = 0.9
MAX_CONV_TURNS  = 6                # number of history turns sent to AI

# ── Timezone ──────────────────────────────────────────────────────────────────
TZ_IST = "Asia/Kolkata"
