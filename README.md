# NammaRoute AI — Bengaluru Metro Intelligence Platform

An AI-powered, API-first navigation and intelligence platform for Bengaluru's Namma Metro.

---

## Description

NammaRoute AI combines verified station reference data, deterministic route calculation,
and AI-powered natural language to deliver a production-quality metro navigation experience.

Route distances and journey times are **calculated** — not guessed by AI.  
Current news, service status, and disruptions are **retrieved live** via AI web access.  
AI demand predictions are clearly labelled as **AI PREDICTION**, never as live data.

---

## Architecture

```
USER
  ↓
REACT FRONTEND  (Vite · Tailwind · React Router · Leaflet · Recharts · Lucide)
  ↓
FLASK BACKEND   (Python 3.x)
  ↓
INTELLIGENCE LAYER
  ├── StationService    → authoritative station master (stations.csv + network.csv)
  ├── RouteService      → Dijkstra shortest path + journey-time calculation
  ├── ChatService       → intent detection → verified context → AI narration
  ├── AIService         → RapidAPI client (key backend-only)
  ├── LiveDataService   → current web information via RapidAPI web_access=true
  └── PredictionService → AI demand predictions (clearly labelled)
```

---

## Features

- **Route Planner** — shortest-path route with distance (km) and estimated journey time
- **Alternative Route** — secondary route for comparison
- **Metro Map** — interactive Leaflet map with all station coordinates from station master
- **Namma Metro AI Chatbot** — understands natural language, typos, and conversation context
- **Station Details** — enriched station info with demand prediction
- **Live Service Information** — current status and disruptions via AI web search
- **Demand Insights** — AI predictions based on time-of-day signals (clearly labelled)
- **Current News** — latest Namma Metro news via AI web search

---

## Data Architecture

| Data Type | Source | Label |
|---|---|---|
| Station identity / coordinates | `stations.csv` + `network.csv` (local) | STATION DATA |
| Route path | Backend Dijkstra graph | CALCULATED |
| Distance (km) | Backend — sum of network segment distances | CALCULATED |
| Journey time | Backend — speed/dwell/interchange model | CALCULATED |
| Current news / status | RapidAPI web_access=true | LIVE |
| Crowd / demand | AI prediction from time signals | AI PREDICTION |
| Natural-language responses | RapidAPI GPT-4 | AI |

---

## Requirements

- Python 3.9+
- Node.js 18+
- npm 9+
- RapidAPI account subscribed to `chatgpt-42.p.rapidapi.com`

---

## Installation

### 1. Clone / extract the project

```
project/
  backend/
  frontend/
  README.md
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your RAPIDAPI_KEY
```

### 3. Frontend Setup

```bash
cd frontend
npm install
# .env is pre-configured for localhost:5000
```

---

## Environment Variables

### `backend/.env`

```
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=chatgpt-42.p.rapidapi.com
```

**SECURITY**: `RAPIDAPI_KEY` must only ever exist in `backend/.env`.  
Never use `VITE_RAPIDAPI_KEY`. Never expose it in frontend source code.

### `frontend/.env`

```
VITE_API_BASE_URL=http://localhost:5000
```

---

## How to Run

### Start the Backend

```bash
cd backend
python app.py
```

Flask starts on `http://localhost:5000`.

### Start the Frontend (Development)

```bash
cd frontend
npm run dev
```

App available at `http://localhost:5173`.

### Build for Production

```bash
cd frontend
npm run build
```

---

## API Endpoints

### Station Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/stations` | All stations (station master) |
| GET | `/api/stations/<code>` | Single station by code |
| GET | `/api/network` | Full network graph |

### Route Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/route?source=&destination=` | Shortest route (calculated) |
| GET | `/api/alternative-route?source=&destination=` | Primary + alternative routes |

### Current Information
| Method | Path | Description |
|---|---|---|
| GET | `/api/current-status` | Live service status |
| GET | `/api/current-news?topic=` | Latest metro news |
| GET | `/api/current-updates` | Current disruptions |
| GET | `/api/station/<code>/current` | Station demand prediction |

### Demand / Predictions
| Method | Path | Description |
|---|---|---|
| GET | `/api/demand` | Network demand prediction |
| GET | `/api/demand/prediction?station_code=` | Station demand prediction |

### AI Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/recommend` | AI travel insight for a route |
| POST | `/api/chat` | Chatbot (full pipeline) |

### Utility
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check and config status |

---

## RapidAPI Configuration

The application uses `chatgpt-42.p.rapidapi.com` / `conversationgpt4-2` endpoint.

```
POST https://chatgpt-42.p.rapidapi.com/conversationgpt4-2
x-rapidapi-key: <RAPIDAPI_KEY>
x-rapidapi-host: chatgpt-42.p.rapidapi.com
Content-Type: application/json
```

For current/live queries, `web_access: true` is used.  
For deterministic queries (route, station, greetings), `web_access: false`.

---

## AI Architecture

1. **Intent detection** — keyword/regex classification (no external NLP dependency)
2. **Station resolution** — fuzzy matching with alias expansion and typo tolerance
3. **Deterministic calculation** — route / distance / time from backend engines
4. **Live retrieval** — RapidAPI web_access=true for current news / status
5. **AI narration** — RapidAPI GPT-4 explains verified facts in natural language
6. **Graceful fallback** — deterministic text if AI is unavailable

The AI never invents station names, routes, distances, times, alerts, or news.

---

## Station Matching

The fuzzy station matcher handles:
- Exact codes (`JLHL`)
- Exact names (`Jalahalli`)
- Known aliases (`majestic` → `Nadaprabhu Kempegowda Station, Majestic`)
- Substring matching
- Word-overlap matching
- Typo tolerance via edit-distance (`jallahalli` → `Jalahalli`)
- Multi-word query splitting (`white field` → `Whitefield (Kadugodi)`)

---

## Journey Time Model

```
estimated_minutes = (distance_km / 34.0) * 60   [travel time at avg speed]
                  + (station_count × 25) / 60   [dwell time per station]
                  + interchange_count × 4        [interchange penalty]
```

Constants are in `backend/config.py` and can be adjusted.

---

## Security

- `RAPIDAPI_KEY` is loaded from `backend/.env` only
- Never referenced in React source code
- Never prefixed with `VITE_`
- Never returned in any API response body
- Never logged

---

## Troubleshooting

**Backend won't start:**
- Check Python version (3.9+)
- Run `pip install -r requirements.txt`
- Verify `backend/data/network.csv` and `backend/data/stations.csv` exist

**AI responses not working:**
- Check `backend/.env` has `RAPIDAPI_KEY` set
- Run `curl http://localhost:5000/api/health` — check `ai_configured: true`
- The chatbot still works without RapidAPI (deterministic fallback)

**Frontend build fails:**
- Run `npm install` before `npm run build`
- Check Node.js version (18+)

**Station not found:**
- Use the chatbot — it accepts natural language, typos, and common aliases
- The route planner accepts station codes or names via URL params

---

## Important Limitations

- **Current information** (news, status, disruptions) is retrieved via AI web search and may be delayed or incomplete. Always verify with official BMRCL channels for critical travel decisions.
- **Journey times** are estimates based on a calculation model, not live train schedules.
- **Demand predictions** are AI estimates based on time-of-day signals, not live passenger counts.
- This is not an official BMRCL application. Official site: https://english.bmrc.co.in/

---

## Project Structure

```
backend/
  app.py                    # Flask entry point
  config.py                 # All constants and config
  data/
    stations.csv            # Station master (authoritative)
    network.csv             # Network graph with coordinates and distances
  services/
    station_service.py      # Station repository
    route_service.py        # Dijkstra route engine
    ai_service.py           # RapidAPI client
    chat_service.py         # Chatbot orchestration
    live_data_service.py    # Live web information
    prediction_service.py   # AI demand predictions
  utils/
    text_normalizer.py      # Fuzzy station matching
    time_utils.py           # IST time utilities
  requirements.txt
  .env.example
  .env                      # NOT committed — create from .env.example

frontend/
  src/
    App.jsx
    pages/
      Home.jsx
      RoutePlanner.jsx
      MetroMapPage.jsx
      StationDetails.jsx
      DemandInsights.jsx
      ServiceAlerts.jsx
    components/
      MetroChatbot.jsx
      MetroMap.jsx
      Navbar.jsx
      Footer.jsx
      StationSelector.jsx
      RouteCard.jsx
      RouteTimeline.jsx
      AIRecommendation.jsx
      AlertBanner.jsx
      StatCard.jsx
      StationCard.jsx
      DemandChart.jsx
    services/
      api.js
  .env
```
#   N a m m a R o u t e - A I  
 