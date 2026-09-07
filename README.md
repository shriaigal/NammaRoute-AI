# NammaRoute AI

**AI-Assisted Bengaluru Namma Metro Route Planning, Station Information, Live Service Information and Demand Insights**

NammaRoute AI is a full-stack web application designed around Bengaluru's Namma Metro network. It combines a React-based frontend with a Flask backend to provide deterministic metro route calculation, station and network information, an interactive metro map, AI-assisted travel insights, current web-based metro information, and time-based AI demand predictions.

The application is designed to keep **calculated metro information separate from AI-generated information**. Routes, station sequences, distances, interchange counts, and estimated journey times are calculated by the backend route engine. AI is used for conversational assistance, travel insights, current web-information retrieval, and demand prediction.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Information Classification](#information-classification)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Project Structure](#project-structure)
- [Metro Network Data](#metro-network-data)
- [Frontend](#frontend)
- [Backend](#backend)
- [Route Calculation Engine](#route-calculation-engine)
- [Alternative Route Calculation](#alternative-route-calculation)
- [AI Integration](#ai-integration)
- [AI Chatbot](#ai-chatbot)
- [Live Information](#live-information)
- [Demand Prediction](#demand-prediction)
- [Station Service](#station-service)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
- [Frontend-Backend Data Flow](#frontend-backend-data-flow)
- [Error Handling and Fallbacks](#error-handling-and-fallbacks)
- [Security](#security)
- [Performance and Design Notes](#performance-and-design-notes)
- [Limitations](#limitations)
- [Development](#development)
- [License](#license)
- [Conclusion](#conclusion)

---

# Overview

NammaRoute AI provides a unified interface for exploring and interacting with the Bengaluru Namma Metro network.

The application provides six primary frontend areas:

| Route | Purpose |
|---|---|
| `/` | Home page with route search, current information and demand insight |
| `/plan-route` | Route planning and route comparison |
| `/metro-map` | Interactive metro network map |
| `/station/:code` | Individual station information |
| `/demand-insights` | AI-based station and network demand predictions |
| `/service-alerts` | Current service status and disruption information |

A persistent navigation bar, footer, and Namma Metro-focused AI chatbot are available throughout the application.

---

# Key Features

## Route Planning

- Select a source and destination station.
- Resolve stations using station codes or station names.
- Calculate the shortest route using the backend graph.
- Display the complete station sequence.
- Display distance and estimated journey time.
- Display the metro lines used.
- Display interchange stations and interchange count.
- Compare an available alternative route.
- Generate an AI travel insight based on the calculated route.

## Interactive Metro Map

- Displays station locations using Leaflet.
- Displays metro line segments using station coordinates.
- Supports Purple, Green and Yellow Lines in the supplied network data.
- Allows users to filter the network by line.
- Allows station markers to be selected.
- Opens station information from map markers.
- Supports map dragging and zooming.

## Station Information

- Station name.
- Kannada station name where available.
- Station code.
- Metro line information.
- Opening date.
- Station layout.
- Interchange status.
- Coordinates.
- Station-level AI demand prediction.
- Direct route-planning actions from a station.

## AI Chatbot

The chatbot is specialized for Namma Metro and Bengaluru transit questions.

It can handle intents including:

- Route queries.
- Alternative route queries.
- Distance queries.
- Journey-time queries.
- Station information.
- Line information.
- Network information.
- Demand/crowd questions.
- Current service status.
- Disruptions and delays.
- Metro news.
- Line-specific updates.
- Greetings and date/time queries.
- Unknown or ambiguous station queries.
- Out-of-scope questions.

## Current Metro Information

The backend can retrieve current web-based information for:

- Current metro service status.
- Latest Namma Metro news.
- Current disruptions.
- Line-specific updates.

If reliable current information cannot be retrieved, the application explicitly reports that the information is unavailable rather than fabricating a result.

## Demand Insights

The application provides AI-based demand predictions for:

- Individual stations.
- The overall metro network.

These predictions use time and day signals and are explicitly labelled as **AI PREDICTION**.

They are **not live crowd measurements or live passenger-count data**.

---

# Information Classification

One of the most important design principles of NammaRoute AI is the separation of different types of information.

## STATION DATA

Static reference information loaded from the application's station and network datasets.

Examples:

- Station names.
- Station codes.
- Lines.
- Coordinates.
- Opening dates.
- Station layout.
- Network sequence.
- Interchange information.

## CALCULATED

Information deterministically calculated by the application.

Examples:

- Shortest route.
- Station sequence.
- Route distance.
- Number of stations.
- Lines used.
- Interchange stations.
- Interchange count.
- Estimated journey time.

The route engine explicitly identifies its calculation method as:

> Backend graph (Dijkstra) — calculated, not AI-generated

## LIVE

Current information retrieved through the application's AI/web-access mechanism.

Examples:

- Current service status.
- Current disruptions.
- Current metro news.
- Current line updates.

Live information may become unavailable if the external service cannot provide sufficiently reliable current information.

## AI PREDICTION

AI-generated demand/crowd estimates based on available time-related signals.

The application does **not** have a live crowd-measurement system in the prediction service.

Demand predictions should therefore never be interpreted as actual real-time passenger counts.

---

# Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 | User interface |
| Build Tool | Vite | Frontend development and production builds |
| Language | JavaScript / JSX | Frontend implementation |
| Routing | React Router DOM | Client-side navigation |
| HTTP Client | Axios | Frontend-backend communication |
| Styling | Tailwind CSS | UI styling |
| Maps | Leaflet | Interactive map rendering |
| React Maps | React Leaflet | React integration for Leaflet |
| Charts | Recharts | Demand visualization |
| Icons | Lucide React | UI icons |
| Backend | Flask | REST API server |
| Backend Language | Python | Backend services |
| Configuration | python-dotenv | Environment configuration |
| Data | CSV | Station and network datasets |
| AI | RapidAPI conversational API | AI responses and AI-assisted information |
| Map Tiles | OpenStreetMap | Map tile source |

---

# Application Architecture

```text
                         USER
                           |
                           v
                +----------------------+
                |   React Frontend     |
                |                      |
                | Home                 |
                | Route Planner        |
                | Metro Map            |
                | Station Details      |
                | Demand Insights      |
                | Service Information  |
                | AI Chatbot           |
                +----------+-----------+
                           |
                           | Axios REST API
                           v
                +----------------------+
                |    Flask Backend     |
                +----------+-----------+
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
+---------------+  +---------------+  +----------------+
| Station       |  | Route         |  | Chat Service   |
| Service       |  | Service       |  |                |
|               |  |               |  | Intent         |
| stations.csv  |  | Graph         |  | detection      |
| network.csv   |  | Dijkstra      |  | Context        |
+---------------+  +---------------+  +-------+--------+
                                               |
                                  +------------+-------------+
                                  |                          |
                                  v                          v
                         +----------------+        +------------------+
                         | AI Service     |        | Prediction       |
                         |                |        | Service          |
                         | RapidAPI       |        |                  |
                         | AI responses   |        | Time-based       |
                         | Web access     |        | AI predictions   |
                         +-------+--------+        +------------------+
                                 |
                                 v
                         RapidAPI / Web
```

---

# Project Structure

```text
NAMMA_METRO_AI_FINAL/
│
├── backend/
│   ├── data/
│   │   ├── network.csv
│   │   └── stations.csv
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_service.py
│   │   ├── chat_service.py
│   │   ├── live_data_service.py
│   │   ├── prediction_service.py
│   │   ├── route_service.py
│   │   └── station_service.py
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── text_normalizer.py
│   │   └── time_utils.py
│   │
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AIRecommendation.jsx
    │   │   ├── AlertBanner.jsx
    │   │   ├── DemandChart.jsx
    │   │   ├── Footer.jsx
    │   │   ├── MetroChatbot.jsx
    │   │   ├── MetroMap.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── RouteCard.jsx
    │   │   ├── RouteTimeline.jsx
    │   │   ├── StatCard.jsx
    │   │   ├── StationCard.jsx
    │   │   └── StationSelector.jsx
    │   │
    │   ├── pages/
    │   │   ├── DemandInsights.jsx
    │   │   ├── Home.jsx
    │   │   ├── MetroMapPage.jsx
    │   │   ├── RoutePlanner.jsx
    │   │   ├── ServiceAlerts.jsx
    │   │   └── StationDetails.jsx
    │   │
    │   ├── services/
    │   │   └── api.js
    │   │
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    │
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vite.config.js
    └── .env
```

---

# Metro Network Data

The backend uses two CSV files as its local reference data.

## `stations.csv`

This file contains station master information including:

- `station_name`
- `station_name_kannada`
- `line`
- `opened_date`
- `day`
- `layout`
- `station_code`

The file contains **85 rows**, representing **83 unique station codes** because interchange stations can appear more than once across line records.

The supplied data covers three lines:

| Line | Dataset Rows |
|---|---:|
| Purple Line | 37 |
| Green Line | 32 |
| Yellow Line | 16 |
| **Total** | **85** |

The backend deduplicates station codes when constructing its station master.

Therefore, the application's unique station master contains **83 unique station codes** from the supplied dataset.

## `network.csv`

The network dataset contains:

- Station code.
- Station name.
- Line.
- Sequence number.
- Interchange indicator.
- Next station code.
- Latitude.
- Longitude.
- Distance to next station.
- Line color.

The network data contains 85 line/network records and 83 unique station codes.

The dataset is loaded into memory when the Flask application starts.

---

# Frontend

The frontend is a React 18 application built with Vite.

## Application Routes

```text
/
├── Home
│
├── /plan-route
│   └── Route Planner
│
├── /metro-map
│   └── Metro Network Map
│
├── /station/:code
│   └── Station Details
│
├── /demand-insights
│   └── Demand Insights
│
└── /service-alerts
    └── Service Information
```

A wildcard route displays a page-not-found message for unknown paths.

---

# Home Page

The home page provides a central starting point for the application.

It includes:

- Bengaluru/Namma Metro introduction.
- Current IST time and date.
- Source station selection.
- Destination station selection.
- Route search.
- Quick navigation to the metro map.
- Quick navigation to demand insights.
- Quick navigation to service information.
- Current metro status.
- Latest metro news.
- Network demand prediction.

The station selectors retrieve station information from the backend.

When the user selects a valid source and destination, the frontend navigates to:

```text
/plan-route?source=<source>&destination=<destination>
```

---

# Route Planner

The route planner is implemented in:

```text
frontend/src/pages/RoutePlanner.jsx
```

The frontend:

1. Loads station and network information.
2. Accepts source and destination stations.
3. Calls the alternative-route API.
4. Displays the primary route.
5. Displays an alternative route when one is available.
6. Requests an AI travel insight for the calculated primary route.
7. Highlights the active route on the map.
8. Displays the station sequence and route statistics.

The route result provides:

- Source.
- Destination.
- Station count.
- Station sequence.
- Distance.
- Estimated journey time.
- Lines used.
- Interchange stations.
- Interchange count.

The AI does not calculate the route. The backend route engine calculates it first and the resulting facts are then supplied to the AI for natural-language travel insight.

---

# Metro Network Map

The map is implemented using:

- Leaflet.
- React Leaflet.
- OpenStreetMap tiles.

The map uses station latitude and longitude values from the backend network dataset.

It provides:

- Station markers.
- Metro line segments.
- Station tooltips.
- Station popups.
- Interchange markers.
- Line filtering.
- Station click navigation.
- Zoom controls.
- Mouse dragging.
- Scroll-wheel zooming.
- Double-click zooming.
- Touch interaction.

Selecting a station marker can navigate to:

```text
/station/<station_code>
```

---

# Station Details

The station details page retrieves information using the station code.

The page displays station information through `StationCard` and includes a map centered around the station's location.

Station information may include:

- Station name.
- Kannada name.
- Station code.
- Line.
- Opening date.
- Layout.
- Interchange status.
- Associated lines.
- Coordinates.

The page also requests a station-level demand prediction.

The prediction is explicitly labelled:

```text
AI PREDICTION
```

---

# Demand Insights

The demand-insights page provides two forms of AI prediction.

### Network Demand

Provides a general demand prediction for the Namma Metro network.

### Station Demand

Allows a station to be selected and generates a station-specific prediction.

The prediction service uses temporal signals including:

- Current date and time.
- Hour.
- Day of week.
- Weekend/weekday.
- Peak/off-peak period.

The system does not use a live passenger-count feed.

Therefore:

> **Demand prediction is not live crowd data.**

---

# Service Information

The service-information page provides:

- Current metro service status.
- Current disruptions and delays.
- Refresh functionality.
- Last checked time.
- Official BMRCL reference links.

Current information is retrieved through the backend's AI web-access mechanism.

The application intentionally handles unavailable information instead of fabricating a result.

For critical travel decisions, users should verify information through official BMRCL channels.

---

# Backend

The backend is implemented using Flask.

Main backend responsibilities include:

- Station and network data management.
- Route calculation.
- Alternative route calculation.
- AI integration.
- Chat processing.
- Current-information retrieval.
- Demand prediction.
- REST API handling.
- Error handling.
- Caching.

---

# Route Calculation Engine

The route engine is implemented in:

```text
backend/services/route_service.py
```

It uses a graph-based shortest-path approach with **Dijkstra's algorithm**.

## Graph Representation

Each station-line combination is represented as a graph node:

```text
(station_code, line)
```

For example, a station appearing on multiple lines can have separate graph nodes for each line.

Adjacent stations on the same line are connected with weighted edges.

Interchange stations are connected between their line-specific nodes.

## Station Edges

For consecutive stations on a line:

```text
Station A ───── Station B
```

the edge weight is derived from:

```text
distance_to_next_km
```

The graph creates connections in both directions.

## Interchange Edges

When a station belongs to multiple lines, line-specific graph nodes are connected through interchange edges.

The interchange edge has:

```text
distance = 0 km
```

The time cost of changing lines is handled separately through the configured interchange penalty.

## Dijkstra Algorithm

The route engine initializes the shortest-path search from all graph nodes associated with the source station.

Dijkstra's algorithm explores the graph and selects the lowest-distance reachable destination node.

The resulting graph path is converted into a structured route.

The backend explicitly identifies the calculation as:

```text
Backend graph (Dijkstra) — calculated, not AI-generated
```

---

# Journey-Time Calculation

Journey time is an estimate rather than an official real-time BMRCL travel time.

The backend configuration uses:

| Parameter | Value |
|---|---:|
| Average speed | 34.0 km/h |
| Station dwell time | 25 seconds/station |
| Interchange penalty | 4 minutes/interchange |

The estimated time is calculated from:

```text
Travel Time
    +
Station Dwell Time
    +
Interchange Penalty
```

More specifically:

```text
travel_minutes =
    (distance_km / average_speed_kmh) × 60

dwell_minutes =
    (station_count × dwell_seconds_per_station) / 60

interchange_minutes =
    interchange_count × interchange_penalty

estimated_time =
    travel_minutes + dwell_minutes + interchange_minutes
```

The resulting value is rounded to the nearest minute.

These are configurable application assumptions and should not be interpreted as guaranteed official journey times.

---

# Route Result

A calculated route contains information such as:

```json
{
  "source": "Source Station",
  "destination": "Destination Station",
  "source_code": "SRC",
  "destination_code": "DST",
  "stations": [],
  "station_count": 10,
  "distance_km": 12.5,
  "lines": [
    "Purple Line"
  ],
  "interchanges": [],
  "interchange_count": 0,
  "estimated_time_minutes": 35,
  "calculation_method": "Backend graph (Dijkstra) — calculated, not AI-generated"
}
```

The exact station sequence and numerical values depend on the selected stations and the supplied network dataset.

---

# Alternative Route Calculation

The backend implements an alternative-route mechanism through:

```text
RouteService.alternative_route()
```

The process is:

1. Calculate the primary shortest route.
2. Extract its station sequence.
3. Block the first two station-to-station segments of that route.
4. Run the route calculation again.
5. Compare the resulting route with the original.
6. Return the alternative if it differs sufficiently from the primary route.

The application does not describe this as a complex multi-objective routing algorithm.

If no meaningfully different route is found, the API returns:

```text
Only one route is available between these stations via the current Namma Metro network.
```

---

# AI Integration

AI functionality is centralized in:

```text
backend/services/ai_service.py
```

The service handles:

- RapidAPI authentication.
- Request construction.
- Application context.
- Conversation history.
- Web-access control.
- Response parsing.
- Timeout handling.
- Error handling.
- Fallback responses.

The RapidAPI credential is read from the backend environment.

It is never intended to be returned to the frontend.

---

# AI Response Rules

The AI service contains a specialized system prompt for Namma Metro.

The AI is instructed to:

- Focus on Bengaluru Namma Metro and related Bengaluru transit topics.
- Use verified application context exactly as provided.
- Avoid changing calculated route facts.
- Avoid inventing stations.
- Avoid inventing routes.
- Avoid inventing distances.
- Avoid inventing journey times.
- Clearly identify live information.
- Clearly identify AI predictions.
- Redirect unrelated questions.
- Avoid exposing internal implementation information.

The system establishes these labels:

```text
LIVE
CALCULATED
AI PREDICTION
STATION DATA
```

This allows the AI response layer to provide natural-language assistance without becoming the source of truth for deterministic route calculations.

---

# AI Travel Insight

After a route has been calculated, the backend can generate a concise AI travel insight.

The AI receives verified route context including:

- Source.
- Destination.
- Lines.
- Interchange count.
- Interchange stations.
- Distance.
- Estimated journey time.
- Station count.
- Current date/time.

The AI is specifically instructed not to invent current alerts or crowd information for the route.

If AI is unavailable, the backend generates a deterministic fallback summary from the route data.

---

# AI Chatbot

The chatbot is implemented through:

```text
frontend/src/components/MetroChatbot.jsx
backend/services/chat_service.py
```

The frontend sends:

```text
POST /api/chat
```

with:

```json
{
  "message": "How do I travel from MG Road to Majestic?",
  "conversation": []
}
```

The backend processes the message through `ChatService`.

---

# Chat Processing Flow

```text
User Message
     |
     v
Text Normalization
     |
     v
Intent Detection
     |
     +------------------------+
     |                        |
     v                        v
Deterministic Service       AI / Live Service
     |                        |
     +------------+-----------+
                  |
                  v
             Chat Response
```

The chatbot can use conversation history to resolve follow-up questions.

The chat API limits the conversation list received from the frontend, and the AI configuration also limits the number of history turns included in AI requests.

---

# Chat Intent Categories

The backend recognizes intents including:

| Intent | Purpose |
|---|---|
| `GREETING` | Greeting |
| `DATE` | Date/time questions |
| `ROUTE` | Route calculation |
| `ALTERNATIVE_ROUTE` | Alternative route |
| `DISTANCE` | Route distance |
| `JOURNEY_TIME` | Estimated journey time |
| `STATION` | Station information |
| `LINE` | Metro line information |
| `NETWORK` | Network information |
| `DEMAND` | Demand prediction |
| `CURRENT_STATUS` | Current metro status |
| `DISRUPTION` | Disruption information |
| `NEWS` | Metro news |
| `LINE_UPDATE` | Line-specific updates |
| `GENERAL_METRO` | General Namma Metro questions |
| `AMBIGUOUS_STATION` | Multiple possible station matches |
| `UNKNOWN_STATION` | Unknown station |
| `UNKNOWN_ROUTE_STATION` | Station cannot be resolved in a route |
| `OUT_OF_SCOPE` | Non-metro questions |

Intent detection is primarily implemented through keyword and pattern matching rather than a heavy machine-learning NLP classifier.

---

# Station Matching and Text Normalization

The backend contains:

```text
backend/utils/text_normalizer.py
```

Station queries are normalized before station matching.

The station service supports:

- Exact station-code lookup.
- Free-text station lookup.
- Fuzzy matching.
- Ambiguous match detection.

If multiple possible stations are found, the chatbot can return candidate stations and ask the user to clarify.

If no station is found, the application returns an explicit station-resolution error.

---

# Live Information

Live information is implemented through:

```text
backend/services/live_data_service.py
```

Supported live-information categories include:

- Current metro status.
- Latest metro news.
- Current disruptions.
- Line-specific updates.

The service uses the AI service with web access enabled for these requests.

## Live Information Reliability

The service is designed not to fabricate unavailable current information.

When reliable current information cannot be obtained, it returns an unavailable response.

For example:

```text
Current metro status is currently unavailable.
```

## Live Cache

Live information uses a simple in-memory cache.

Configured cache lifetime:

```text
300 seconds
```

or:

```text
5 minutes
```

The cache reduces repeated external API calls for the same live-information requests.

The cache is process-local and is not a persistent or distributed cache.

---

# Demand Prediction

Demand prediction is implemented through:

```text
backend/services/prediction_service.py
```

Two prediction functions are provided:

```text
predict_station_demand()
predict_network_demand()
```

## Station-Level Prediction

The station prediction receives:

- Station name.
- Station code.
- Metro line.
- Current date/time.
- Hour.
- Day of week.
- Weekend indicator.
- Peak-period information.

The AI produces a short prediction.

The result contains:

- Prediction.
- Confidence.
- Time signals.
- Disclaimer.

## Network-Level Prediction

The network prediction uses current time signals and produces an overall Namma Metro demand estimate.

The prediction is clearly labelled:

```text
AI PREDICTION
```

and includes a disclaimer that it is not live ridership data.

## Fallback Prediction

If the AI service is not configured or unavailable, the prediction service falls back to rule-based demand logic.

The fallback considers:

- Peak hours.
- Weekends.
- Off-peak periods.

This allows the application to provide a clearly labelled prediction without pretending that the result came from live passenger measurements.

---

# Station Service

The station service is implemented in:

```text
backend/services/station_service.py
```

It is the authoritative local source for station and network reference information.

At application startup, it loads:

```text
backend/data/stations.csv
backend/data/network.csv
```

into memory.

The service provides:

- All-station retrieval.
- Station-code lookup.
- Free-text station matching.
- Network retrieval.
- Interchange detection.
- Lines associated with a station.
- Station coordinate lookup.
- Enriched station information.

---

# API Reference

The frontend communicates with the Flask backend through Axios.

The API base URL is:

```text
VITE_API_BASE_URL
```

with a local fallback of:

```text
http://localhost:5000
```

## Station APIs

### `GET /api/stations`

Returns the station master list.

### `GET /api/stations/<station_code>`

Returns enriched information for a station.

Example:

```text
GET /api/stations/MGRO
```

If the station does not exist, the backend returns HTTP `404`.

### `GET /api/network`

Returns the complete network dataset used by the map and route engine.

---

# Route APIs

### `GET /api/route`

Calculates the shortest route.

Required query parameters:

```text
source
destination
```

Example:

```text
GET /api/route?source=MGRO&destination=KSR
```

The endpoint accepts station codes or station names.

The result contains calculated route information and an AI travel insight.

### `GET /api/alternative-route`

Returns the primary route and an alternative route when one can be calculated.

Required query parameters:

```text
source
destination
```

Example:

```text
GET /api/alternative-route?source=MGRO&destination=KSR
```

---

# Current Information APIs

### `GET /api/current-status`

Retrieves current Namma Metro service information through the live web-information service.

### `GET /api/current-news`

Retrieves latest Namma Metro news.

Optional query parameter:

```text
topic
```

Example:

```text
GET /api/current-news?topic=Yellow%20Line
```

### `GET /api/current-updates`

Retrieves current disruption and service information.

### `GET /api/station/<station_code>/current`

Returns station information together with a station-level AI demand prediction.

---

# Demand APIs

### `GET /api/demand`

Returns network-level AI demand prediction.

### `GET /api/demand/prediction`

Returns station-level AI demand prediction.

Required query parameter:

```text
station_code
```

Example:

```text
GET /api/demand/prediction?station_code=MGRO
```

---

# AI APIs

### `POST /api/ai/recommend`

Generates an AI travel insight from supplied route context.

The frontend uses the calculated route as the context for this endpoint.

### `POST /api/chat`

Main chatbot endpoint.

Request format:

```json
{
  "message": "How do I travel from MG Road to Majestic?",
  "conversation": []
}
```

Response structure contains:

```json
{
  "answer": "...",
  "type": "...",
  "data": {}
}
```

---

# Health API

### `GET /api/health`

Returns backend health and configuration information.

The response includes information such as:

- Backend status.
- Current date/time.
- Number of loaded stations.
- Number of network records.
- Operational lines.
- Interchange-station count.
- AI configuration status.

It also identifies that route, distance and time are calculated deterministically and that AI is used for natural-language generation and live web queries.

---

# API Summary

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/stations` | Retrieve station master |
| `GET` | `/api/stations/<station_code>` | Retrieve enriched station |
| `GET` | `/api/network` | Retrieve network data |
| `GET` | `/api/route` | Calculate shortest route |
| `GET` | `/api/alternative-route` | Calculate primary and alternative route |
| `GET` | `/api/current-status` | Retrieve current service information |
| `GET` | `/api/current-news` | Retrieve current metro news |
| `GET` | `/api/current-updates` | Retrieve current disruptions |
| `GET` | `/api/station/<station_code>/current` | Station information + demand prediction |
| `GET` | `/api/demand` | Network demand prediction |
| `GET` | `/api/demand/prediction` | Station demand prediction |
| `POST` | `/api/ai/recommend` | Generate route travel insight |
| `POST` | `/api/chat` | Process chatbot message |
| `GET` | `/api/health` | Backend health/configuration |

---

# Environment Variables

## Backend

Create/configure the backend environment with:

```env
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=your_rapidapi_host_here
```

The RapidAPI key must remain server-side.

Do not expose it through React or any frontend variable.

## Frontend

Create/configure:

```env
VITE_API_BASE_URL=http://localhost:5000
```

The frontend API service reads:

```javascript
import.meta.env.VITE_API_BASE_URL
```

and falls back to:

```text
http://localhost:5000
```

when the environment variable is not defined.

---

# Environment Security

Never put the RapidAPI secret into:

```text
VITE_RAPIDAPI_KEY
```

or any other `VITE_*` frontend variable.

Vite frontend environment variables are available to browser-side application code.

The RapidAPI credential belongs exclusively in the backend environment.

Also ensure that real `.env` files containing credentials are excluded from Git commits.

---

# Installation and Setup

## Prerequisites

Install:

- Node.js
- npm
- Python 3
- pip
- RapidAPI credentials for AI and live-information functionality

---

# Backend Setup

Open a terminal in the project directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### macOS / Linux

```bash
source venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Configure:

```env
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=your_rapidapi_host_here
```

---

# Start the Backend

From the `backend` directory:

```bash
python app.py
```

The Flask application runs on:

```text
http://localhost:5000
```

Test the backend:

```text
http://localhost:5000/api/health
```

---

# Frontend Setup

Open a second terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure:

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

# Start the Frontend

Run:

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

The frontend communicates with the Flask backend through the configured API base URL.

---

# Production Build

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

# Frontend-Backend Data Flow

## Route Planning Flow

```text
User selects source and destination
              |
              v
       React Route Planner
              |
              | GET /api/alternative-route
              v
        Flask API
              |
              v
       Station resolution
              |
              v
        RouteService
              |
              v
       Graph construction
              |
              v
      Dijkstra shortest path
              |
              v
       Route summarization
              |
              +------------------+
              |                  |
              v                  v
       Calculated route     AI travel insight
              |                  |
              +--------+---------+
                       |
                       v
                 React UI
```

## Chat Flow

```text
User message
     |
     v
MetroChatbot
     |
     | POST /api/chat
     v
ChatService
     |
     v
Text normalization
     |
     v
Intent detection
     |
     +-----------------------+
     |                       |
     v                       v
Deterministic handlers     AI / Live handlers
     |                       |
     +-----------+-----------+
                 |
                 v
          Response object
                 |
                 v
           Chatbot interface
```

## Live Information Flow

```text
Frontend
   |
   v
Flask live-information endpoint
   |
   v
LiveDataService
   |
   v
AIService
   |
   | Web access
   v
RapidAPI / web information
   |
   v
Validation / fallback
   |
   v
5-minute cache
   |
   v
Frontend
```

## Demand Prediction Flow

```text
Current date/time
       |
       +--> Hour
       +--> Day of week
       +--> Weekend/weekday
       +--> Peak period
       |
       v
PredictionService
       |
       v
AIService
       |
       +------------------+
       |                  |
       v                  v
   AI response       Rule-based fallback
       |                  |
       +--------+---------+
                |
                v
        AI PREDICTION result
```

---

# Error Handling and Fallbacks

The application is designed to fail gracefully when external information or requested data is unavailable.

## Missing Station

If a station cannot be resolved, the backend returns an error rather than creating an assumed station.

## Same Source and Destination

The route API rejects a request when the source and destination are the same.

## No Route

If Dijkstra cannot reach the destination, the API returns a no-route response.

## Ambiguous Station

If station matching produces multiple possible candidates, the chatbot can return the candidates and ask the user to clarify.

## AI Unavailable

The application can use deterministic fallback responses for:

- Route travel insights.
- Station demand prediction.
- Network demand prediction.

## Live Information Unavailable

If current information cannot be reliably retrieved, the application returns an explicit unavailable state.

It does not fabricate:

- Current service status.
- Delays.
- Disruptions.
- News.
- Construction updates.

---

# Security

The application follows several important security principles.

### Backend-only API Key

The RapidAPI credential is loaded from the backend environment.

It is not returned to the frontend.

### Environment Variables

Secrets should be stored in local environment files and should not be committed to source control.

### Frontend Variables

Only non-secret configuration should be exposed through `VITE_*` variables.

### AI Error Handling

AI failures are handled without returning credentials or internal authentication information.

### User Input

User-provided chatbot and station input should be treated as untrusted input.

### No Secret Exposure

API keys, authentication headers, environment-file values and other credentials should never be included in README files, frontend source code, chatbot responses, or API responses.

---

# Performance and Design Notes

## In-Memory Data

Station and network CSV data is loaded into memory during backend startup.

This avoids repeatedly reading the CSV files for each request.

## Graph Construction

The route graph is constructed from the network dataset when the `RouteService` is initialized.

## Dijkstra Routing

Shortest-path calculation uses a priority queue implementation of Dijkstra's algorithm.

## Live Information Cache

Current web-information responses use a five-minute in-memory cache to reduce repeated external API requests.

## Bounded Conversation History

The chat API limits the conversation list received from the frontend before passing it to the chat service.

The AI configuration also limits the number of history turns included in AI requests.

## Axios Timeout

The frontend Axios client uses a 20-second request timeout.

If an API request fails, the frontend displays a user-facing fallback message.

---

# Feature Summary

| Feature | Implementation |
|---|---|
| Station search | Station-code and free-text/fuzzy station matching |
| Route planning | Graph-based Dijkstra shortest path |
| Journey time | Deterministic estimate from configured travel assumptions |
| Distance | Network dataset distance values |
| Alternative route | First-segment edge blocking + route recalculation |
| Metro map | Leaflet + React Leaflet |
| Station details | Station master + network data |
| AI chatbot | React chatbot + Flask ChatService |
| AI travel insight | AI narration based on calculated route facts |
| Live status | AI web-access retrieval |
| Metro news | AI web-access retrieval |
| Disruptions | AI web-access retrieval |
| Demand insights | Time/day-based AI prediction |
| Prediction fallback | Rule-based prediction |
| API | Flask REST API |
| HTTP client | Axios |
| Styling | Tailwind CSS |
| Charts | Recharts |

---

# Limitations

## Dataset Scope

The application depends on the supplied CSV station/network dataset.

It should not be assumed that the dataset automatically represents every existing, newly opened, or future Namma Metro station outside the supplied data.

## Journey-Time Accuracy

Journey time is an application estimate based on:

```text
34 km/h average speed
25 seconds station dwell time
4 minutes interchange penalty
```

Actual journey times may differ because of operational conditions, waiting times, station congestion, train frequency, delays, and other factors.

## No Live Crowd Measurement

The demand feature does not consume live passenger-count or crowd-sensor data.

It produces:

```text
AI PREDICTION
```

from time-related signals.

## Live Information Dependency

Current service status, news and disruption information depend on the external AI/web-access service.

If that service is unavailable or reliable current information cannot be found, the application reports the information as unavailable.

## No Direct Operational Feed

The application does not implement a direct BMRCL operational sensor/feed integration for real-time train positions, live passenger counts, or live train telemetry.

## External API Dependency

AI and web-backed features depend on the configured RapidAPI service.

If the API key is missing, invalid, rate-limited, unavailable, or times out, the application falls back where a fallback implementation exists.

## In-Memory Cache

The live-information cache is process-local.

It is not persistent and is not a distributed cache.

Restarting the backend clears the cache.

## Alternative Route Strategy

The alternative route implementation works by blocking initial segments of the primary route and recalculating the route.

It is therefore a practical detour mechanism rather than a full multi-objective route-optimization system.

---

# Development

## Backend Files

### `app.py`

Flask application entry point.

Responsible for:

- API routes.
- Service initialization.
- CORS handling.
- Request validation.
- Route endpoint integration.
- AI recommendation endpoint.
- Chat endpoint.
- Health endpoint.

### `config.py`

Central location for:

- Dataset paths.
- RapidAPI configuration.
- Route calculation constants.
- AI parameters.
- Live cache TTL.
- IST timezone configuration.

### `station_service.py`

Provides authoritative station and network reference data.

### `route_service.py`

Builds the graph and performs Dijkstra shortest-path calculations.

### `chat_service.py`

Handles:

- Intent detection.
- Entity extraction.
- Station resolution.
- Conversation context.
- Deterministic responses.
- AI-backed responses.
- Live-information requests.

### `ai_service.py`

Central RapidAPI client responsible for:

- Authentication.
- AI requests.
- Web access.
- Response processing.
- Timeout handling.
- Fallback behavior.

### `live_data_service.py`

Handles current web-backed information and caching.

### `prediction_service.py`

Handles station-level and network-level AI demand predictions.

### `text_normalizer.py`

Provides text normalization and station matching support.

### `time_utils.py`

Provides IST-aware current date/time and peak-period signals.

---

# Frontend Components

| Component | Responsibility |
|---|---|
| `Navbar` | Application navigation |
| `Footer` | Application footer |
| `MetroChatbot` | Namma Metro AI chatbot interface |
| `MetroMap` | Leaflet-based metro map |
| `RouteCard` | Route statistics and summary |
| `RouteTimeline` | Station-by-station route sequence |
| `StationCard` | Station information |
| `StationSelector` | Source/destination station selection |
| `DemandChart` | Demand visualization |
| `AIRecommendation` | AI-generated route insight |
| `AlertBanner` | Live/unavailable status messaging |
| `StatCard` | Reusable statistic display |

---

# Frontend API Service

The frontend API wrapper is:

```text
frontend/src/services/api.js
```

It creates an Axios client with:

```text
baseURL = VITE_API_BASE_URL
```

and a 20-second timeout.

The service provides methods for:

```text
getStations()
getStation()
getNetwork()
getRoute()
getAlternativeRoute()
getCurrentStatus()
getCurrentNews()
getCurrentUpdates()
getStationCurrent()
getDemand()
getDemandPrediction()
aiRecommend()
chat()
health()
```

API errors are converted into a consistent frontend error structure.

---

# Running Both Services

A normal local development setup uses two terminals.

### Terminal 1 — Backend

```bash
cd backend
venv\Scripts\activate
python app.py
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

The frontend then communicates with:

```text
http://localhost:5000
```

unless `VITE_API_BASE_URL` is configured differently.

---

# Data Reliability Summary

| Information | Source | Classification |
|---|---|---|
| Station name | `stations.csv` | STATION DATA |
| Station code | `stations.csv` | STATION DATA |
| Metro line | `stations.csv` / `network.csv` | STATION DATA |
| Coordinates | `network.csv` | STATION DATA |
| Station sequence | `network.csv` | STATION DATA |
| Route | Backend graph | CALCULATED |
| Distance | Network graph | CALCULATED |
| Station count | Route engine | CALCULATED |
| Interchange count | Route engine | CALCULATED |
| Journey time | Route engine + configured assumptions | CALCULATED / ESTIMATED |
| Current status | AI web access | LIVE |
| Current news | AI web access | LIVE |
| Current disruption | AI web access | LIVE |
| Station demand | AI + time signals | AI PREDICTION |
| Network demand | AI + time signals | AI PREDICTION |
| Travel insight | AI based on calculated route context | AI-GENERATED |

---

# Project Design Philosophy

The central design goal of NammaRoute AI is to combine a deterministic metro route engine with an AI conversational layer without allowing the AI to fabricate route facts.

The architecture therefore follows these principles:

1. **Station and network facts come from the application's datasets.**
2. **Routes are calculated by the backend graph engine.**
3. **Distances are derived from the network data.**
4. **Journey times are estimates based on configured calculation assumptions.**
5. **AI receives verified application context when explaining calculated results.**
6. **Live information is clearly identified as web-retrieved information.**
7. **Demand information is clearly identified as AI prediction.**
8. **Unavailable live information is reported as unavailable rather than invented.**
9. **External API credentials remain on the backend.**

This separation makes the application easier to reason about, test, maintain, and explain during technical evaluation.

---

# License

No explicit license file or license declaration is included in the project. Therefore, no specific open-source license is claimed here.

---

# Conclusion

NammaRoute AI is a full-stack Namma Metro information and route-planning application that combines:

- React-based user experience.
- Flask REST APIs.
- CSV-based metro network data.
- Graph-based Dijkstra route calculation.
- Alternative route generation.
- Interactive Leaflet mapping.
- Station information.
- AI-assisted conversational interaction.
- Current web-based metro information.
- AI demand prediction.
- Deterministic fallbacks.
- Explicit information classification.

Its most important architectural distinction is that **route facts are calculated by the backend rather than generated by the AI**, while AI is used as an assistance, explanation, live-information, and prediction layer.
