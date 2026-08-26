# Healthcare Emergency Response Platform

Live rural healthcare command system — finds the best **feasible** ambulance + route + hospital combination (not just nearest), handling road closures, resource limits, and urgency.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | **Vite + React 19 + JavaScript (JSDoc)** | Already in repo (`vite.config.js:1`, `package.json:1`). Fast HMR, JSDoc gives type safety without TS build step. |
| **Styling** | **Tailwind CSS + shadcn/ui** | Rapid command-center UI (Queue \| Map \| Status) with accessible components. |
| **State** | **Zustand + TanStack Query** | Zustand for simulation state (ambulances/roads), Query for server cache. Lighter than Redux. |
| **Map** | **Leaflet + React-Leaflet** → **MapLibre + deck.gl** for scale | Leaflet = 42KB, easy for hackathon. deck.gl via WebGL for 50k nodes (avoids DOM overload). |
| **Charts** | **Recharts** | Simple React charts for response time / utilization. |
| **Realtime** | **Socket.IO** | Push for live events (road closure, new emergency). Handles reconnection vs raw WebSocket. |
| **Validation** | **Zod** | Runtime validation for `EmergencyRequest` / `Hospital` / `RoadEdge` contracts. |
| **Backend** | **Node.js 20 + Fastify + Socket.IO** | Single JS language, reuse Dijkstra/A* on FE & BE, faster than Express. Alt: Python FastAPI if team prefers. |
| **Algorithms** | **JS: adjacency-list + binary heap (`fastpriorityqueue`)** | Dijkstra/A* + `rbush` spatial index for nearest ambulance. Deterministic, testable. |
| **Store** | **In-memory + JSON seed, optional SQLite** | In-memory for benchmark speed; SQLite for demo persistence. Upgrade to Postgres+PostGIS later. |

## Why Not Others

- **Next.js** – SSR overhead for SPA dashboard; Vite faster.
- **Redux** – boilerplate; Zustand sufficient.
- **Google Maps** – billing/key friction; Leaflet is open.
- **MongoDB** – relational data (Hospital-Doctor-Medicine) fits SQL.
- **External AI for routing** – not allowed; core must be deterministic.

## Project Structure

```
src/
├── components/Map|Queue|DecisionPanel|Simulation/
├── stores/ (Zustand)
├── lib/graph/ (dijkstra.js, astar.js, heap.js)
├── lib/selectAmbulance.js, selectHospital.js
└── App.jsx
server/ (Fastify routes, engines, ws)
```

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

Env: `VITE_API_URL`, `VITE_WS_URL` in `.env` (` `.gitignore:25`).

## Key Notes

- **Feasibility before optimization** – reject hospitals failing specialist/bed/medicine checks, then score `travel + queue + penalties`.
- **Explainable** – every selection returns `{selected, rejected: [{reason}]}` for UI.
- **Dynamic** – `ROAD_CLOSED` invalidates routes → A* recalculates, new ETA pushed.
- **No hardcoding, no fabricated metrics** – UI uses actual engine; timings from `performance.now()`.
- **Scale** – adjacency-list + viewport culling; never render 50k nodes as DOM.

*JS-only, no TypeScript.*
