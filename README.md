# Healthcare Emergency Response Platform — Development Build

> This README uses the generic title **Healthcare Emergency Response Platform** until a final name is decided.

Live healthcare command-and-decision system for rural / semi-rural regions — optimizes **travel time + wait time + operational delays** under constraints of distance, ambulance fleet, hospital capability, specialist availability, bed capacity, medicine stock, and road conditions. Not a “nearest hospital” finder — a **capability-aware, dynamic, explainable routing and dispatch system** with large-graph scalability (50k+ nodes, 200k+ edges).

---

## 1. Tech Stack

Chosen for **hackathon velocity + demo impact + ability to scale to 50k-node graphs** while staying inside the existing Vite + React foundation (`package.json:1`, `vite.config.js:1`).

### 1.1 Frontend — Web Client (Dashboard + Map)

| Layer | Choice | Why (vs alternatives) | Version |
|---|---|---|---|
| **Build** | **Vite** (keep) + **React 19** (keep) + **TypeScript 5.7** | Already in repo. Vite HMR = fastest iteration. React 19 concurrent features help live map updates. TypeScript required — data model has 8 entity types with strict contracts; JS-only would cause runtime errors in routing/resource logic. | `vite@^8.2.2`, `react@^19.2.8` |
| **Styling** | **Tailwind CSS 4** + **shadcn/ui** (Radix primitives) | Requires an operational “command center” with dense panels, not a marketing page. Tailwind utility classes → fastest to build responsive 3-panel layout (Emergencies \| Map \| Network Status) + decision log. shadcn gives accessible dialogs, sheets, tables without heavy UI kit. | latest |
| **State — Client** | **Zustand 5** | Lightweight, no boilerplate. Perfect for ephemeral simulation state (ambulance positions, road closures). Redux Toolkit is overkill for prototype. `src/App.jsx:7` is currently local `useState` — Zustand centralizes without re-render cost. | `^5.0` |
| **State — Server** | **TanStack Query (React Query) 5** | Caches `/api/*` polling + WebSocket hydration, dedupes requests, handles stale resource data. | `^5.x` |
| **Map / Visualization** | **Leaflet 1.9 + React-Leaflet 4** (MVP) — **upgrade path: MapLibre GL JS + deck.gl** | Graph with villages/hospitals/ambulances + road states (normal/slow/closed) + animated routes. Leaflet is 42KB, easiest for hackathon, works offline with OSM tiles. MapLibre + deck.gl is the scale path: deck.gl renders 50k nodes via WebGL, avoids “render every node as DOM element” anti-pattern. Leaflet can lazy-load; deck.gl swap is drop-in. Avoid Google Maps (API key/billing friction for demo). | leaflet `^1.9` |
| **Charts / Analytics** | **Recharts 2** | Response time, waiting time, queue length, utilization, routing execution time. Recharts = declarative, responsive, works with React 19. Alternative Nivo is heavier. | `^2.x` |
| **Realtime** | **Socket.IO Client 4** (fallback to native WebSocket + SSE) | Live simulation events need push, not polling. Socket.IO handles reconnection, rooms (per-region), and works with Fastify backend. Native WebSocket is lighter but needs manual reconnection. | `^4.7` |
| **Validation** | **Zod 3** | Enforce `EmergencyRequest`, `Hospital`, `RoadEdge` contracts client-side before POST `/api/emergencies`. Shared schemas with backend. | `^3.24` |
| **Testing** | **Vitest + React Testing Library + Playwright** | Vitest is Vite-native (no Jest config). Playwright for map E2E (road closure → reroute flow). | latest |
| **Lint** | **Oxlint** (keep, `package.json:9`) + ESLint + Prettier | Already configured (`.oxlintrc.json`). | `oxlint@^1.79.0` |

### 1.2 Backend — Application Server

Two viable paths — **Recommended: Node.js path** for unified JS/TS and code-sharing of graph algorithms. Python path listed as alternative if team has DS/Python strength.

#### Path A — Recommended (Node.js / TypeScript)

| Layer | Choice | Rationale |
|---|---|---|
| **Runtime** | **Node.js 20 LTS** | Aligns with Vite frontend, single language for routing algorithms (Dijkstra/A*). Easier to share `Zod` schemas and types. |
| **Framework** | **Fastify 5** (+ `@fastify/websocket` or **Socket.IO 4** server) | Faster than Express (2-3x req/s), schema-based validation out-of-box, great for benchmark mode measuring `requestsProcessed / second`. Express is acceptable fallback if team prefers familiarity. |
| **Realtime** | **Socket.IO** or **Server-Sent Events (SSE)** | For live updates, use WebSockets or SSE. Socket.IO for bidirectional simulation controls (`POST /api/simulation/events`); SSE is simpler if only server→client. |
| **Algorithms** | **Custom TS implementations**: adjacency-list graph + **binary heap** (`fastpriorityqueue` or `tinyqueue`) for Dijkstra/A* . Spatial index via `rbush` or `kdbush` for nearest-ambulance queries. | Must be deterministic/testable. No external AI model for core routing. |
| **Persistence (prototype)** | **In-memory store + JSON seed files**; optional **SQLite + Prisma ORM** or **better-sqlite3** | Thousands of simulated requests should be processable — in-memory avoids DB latency for benchmark. SQLite gives persistence for demo without Postgres ops. Prisma provides typed models matching data model. Upgrade to **PostgreSQL + PostGIS** for production geospatial queries. |
| **Validation** | **Zod** (shared `packages/shared` schemas) | Single source of truth for API contracts. |
| **API Docs** | **Swagger via `@fastify/swagger`** | Auto-generates docs for API table. |
| **Cache** | **In-memory LRU for stable routes** + `node-cache` | Avoid repeated full graph scans. Invalidate on `ROAD_CLOSED` events. |
| **Testing / Bench** | **Vitest (API) + autocannon** for route-query latency | Route query “milliseconds to low hundreds” — must measure and display. |

#### Path B — Alternative (Python)

| Layer | Choice | When to use |
|---|---|---|
| **Framework** | **FastAPI + Uvicorn + WebSockets** | If team is stronger in Python or wants `NetworkX` / `heapq` for graph algorithms. FastAPI auto-docs, Pydantic validation mirrors Zod. |
| **Graph** | **NetworkX** (prototype) → custom adjacency list for scale | NetworkX is easy but slower for 200k edges; custom heap implementation needed for production. |
| **Realtime** | `websockets` + `SSE` |  |
| **DB** | **SQLAlchemy + SQLite/Postgres** |  |

> **Recommendation:** Start with **Path A** unless your team has 2+ Python developers and no Node.js experience. Path A lets you reuse the same Dijkstra/A* code on frontend (for optimistic UI) and backend (source of truth).

### 1.3 Infrastructure & Tooling

| Concern | Choice |
|---|---|
| **Package manager** | `npm` (keep, `package-lock.json` exists) or `pnpm` for faster installs |
| **Monorepo (optional)** | `npm workspaces` with `packages/client`, `packages/server`, `packages/shared` (Zod schemas, graph types) |
| **Env** | `.env` already present (empty). Add `VITE_API_URL`, `VITE_WS_URL`, `DATABASE_URL`. Never commit secrets (`.gitignore:13`). |
| **Container** | `Dockerfile` + `docker-compose.yml` (Node 20 alpine + SQLite volume) for judge demo portability |
| **Deploy** | Frontend: **Vercel / Netlify** (Vite static). Backend: **Render / Fly.io / Railway**. Or single Docker image serving both. |
| **CI** | GitHub Actions: `oxlint`, `tsc --noEmit`, `vitest run`, `vite build` |

### 1.4 Tech Stack Decision Matrix (Why Not Others)

| Rejected | Reason |
|---|---|
| **Next.js** | Overkill for dashboard SPA; Vite is faster, already configured. Next.js SSR adds complexity for WebSocket-heavy live map. |
| **Redux** | Boilerplate for hackathon; Zustand sufficient. |
| **Google Maps SDK** | Billing, key provisioning, less control for custom road-state styling. Leaflet/MapLibre are open. |
| **D3 directly** | Recharts wraps D3 for React; raw D3 imperative updates conflict with React 19. |
| **MongoDB** | Data is highly relational (Hospital ↔ Doctor ↔ Medicine ↔ Request); SQL/SQLite maps better. |
| **External AI for routing** | Explicit non-goal for core routing. |

---

## 2. Architecture Overview

```
                 ┌─────────────────────┐
                 │  Web Client (Vite + React)  │
                 │  Zustand + TanStack Query   │
                 │  Leaflet / MapLibre + Recharts │
                 └──────────┬──────────┘
                            │  REST + WebSocket (Socket.IO)
                 ┌──────────▼──────────┐
                 │  Fastify API Server  │
                 └──────────┬──────────┘
        ┌───────────────────┼───────────────────────┐
        ▼                   ▼                       ▼
 ┌──────────────┐   ┌──────────────┐       ┌──────────────┐
 │ Routing      │   │ Dispatch     │       │ Resource     │
 │ Engine       │   │ Engine       │       │ Engine       │
 │ Dijkstra/A*  │   │ Priority Q   │       │ Beds/Doctors │
 │ fastpriorityqueue │ binary heap │       │ Medicines    │
 └──────────────┘   └──────────────┘       └──────────────┘
        └───────────────────┼───────────────────────┐
                            ▼                       │
                  ┌──────────────────┐              │
                  │ Decision Engine  │◄─────────────┘
                  │ (explainable)    │
                  └────────┬─────────┘
                           │
                 ┌─────────▼─────────┐
                 │ Simulation Engine │
                 │ (event-driven)    │
                 └─────────┬─────────┘
                           │
                 ┌─────────▼─────────┐
                 │ State / Store     │
                 │ In-memory + SQLite│
                 └───────────────────┘
```
Modules are separate TS files to keep algorithms inspectable and deterministic.

**Key flows:**
1. `POST /api/emergencies` → priority queue → Dispatch Engine selects ambulance (capability + ETA) → Resource Engine filters hospitals (hard constraints first) → Routing Engine scores feasible hospitals via `Total Cost = travel + queue + penalties` → Decision Engine emits explainable record → WebSocket pushes to map + queue.
2. `ROAD_CLOSED` event → invalidate affected routes → A* recalculation → push `ROUTE_RECALCULATED` with old/new ETA.

---

## 3. Data Model

Implemented as Zod schemas / TypeScript interfaces — single source in `packages/shared`:

- **Node / Village** — `id, name, lat, lng, type, population, region`
- **RoadEdge** — `id, source, destination, distance, baseTravelTime, currentTravelTime, status, trafficMultiplier`
- **Ambulance** — `id, location, status (8 states), equipment[], capabilities[], currentRequestId, eta, availableAt`
- **Hospital** — `id, location, beds, icu, specialties[], equipment[], medicine inventory, queueLength, operatingStatus`
- **Doctor** — `id, hospitalId, specialty, shift, available`
- **MedicineStock** — `hospitalId, medicineId, quantity, thresholds, consumptionRate`
- **EmergencyRequest** — `id, originNode, urgency (Critical/High/Medium/Low), condition, requiredSpecialties/equipment/medicines, status, ambulance, hospital, route, eta`
- **DecisionRecord** — `id, timestamp, requestId, decisionType, selectedResource, alternatives[], reasonCodes[], humanReadableReason, algorithm`

Graph representation: **adjacency list** (`Map<NodeId, Edge[]>`) — not adjacency matrix (would be 2.5B cells for 50k nodes).

---

## 4. Project Structure (Proposed)

```
/
├── public/                 # static assets, icons.svg
├── src/                    # frontend (existing)
│   ├── main.jsx            # entry (src/main.jsx:1)
│   ├── App.jsx             # replace with router + layout
│   ├── components/
│   │   ├── Map/            # Leaflet canvas, road states, animated routes
│   │   ├── Queue/          # EmergencyQueue cards
│   │   ├── DecisionPanel/  # Explainable decision
│   │   ├── Simulation/     # Controls
│   │   └── Analytics/      # Recharts dashboards
│   ├── stores/             # Zustand: simulation, network, decisions
│   ├── hooks/              # useWebSocket, useRouting
│   ├── lib/
│   │   ├── graph/          # Dijkstra, A*, binary heap
│   │   ├── dispatch/       # ambulance selection
│   │   └── hospital/       # hospital selection
│   └── types/              # shared Zod schemas
├── server/                 # Fastify backend (new)
│   ├── src/
│   │   ├── routes/         # /api/*
│   │   ├── engines/        # routing / dispatch / resource / decision / simulation
│   │   ├── store/          # in-memory + SQLite
│   │   └── ws/             # Socket.IO handlers
│   └── seed/               # synthetic graph generators (50k nodes)
├── packages/shared/        # shared types (if monorepo)
├── vite.config.js          # Vite config (vite.config.js:1)
├── .oxlintrc.json
└── package.json
```

---

## 5. Getting Started

### Prerequisites

- Node.js 20 LTS, npm 10+

### Install & Run (current Vite template)

```bash
npm install
npm run dev      # Vite dev server, HMR — http://localhost:5173 (package.json:7)
npm run build    # production build (package.json:8)
npm run preview  # preview build (package.json:10)
npm run lint     # Oxlint (package.json:9)
```

### After Backend Scaffolding (recommended)

```bash
# from root (if monorepo workspaces)
npm install
npm run dev:client   # Vite
npm run dev:server   # Fastify + nodemon, http://localhost:3000
# or
docker compose up --build
```

Environment (`.env` — currently empty):

```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
DATABASE_URL=file:./dev.db
```

---

## 6. Roadmap

Derived from acceptance criteria and performance targets:

| Phase | Goal | Key Deliverables |
|---|---|---|
| **0 — Foundation** | Repo hygiene + scaffolding | Name redaction (done), TypeScript + Tailwind + Zustand + React-Leaflet install, shared Zod schemas, in-memory store |
| **1 — Core Graph & Routing** | Route correctness | Adjacency-list graph, binary heap, Dijkstra + A* (with admissible heuristic `dist / maxSpeed`), synthetic generator for 50k nodes |
| **2 — Dispatch & Queue** | Priority + ambulance selection | Priority queue (urgency + waiting time + starvation prevention), ambulance state machine (8 states) |
| **3 — Hospital Capability** | Feasibility before optimization | Hard-constraint filter → total-cost scoring, reject nearest infeasible (e.g., no cardiologist) |
| **4 — Dynamic Re-routing** | Live adaptation | Road status events (`ROAD_OPEN/SLOW/CLOSED`), active-route invalidation, A* recalculation, operator notification `ROUTE BLOCKED Old 18m → New 24m` |
| **5 — Resources** | Doctors / beds / medicines | Doctor shifts, bed/ICU occupancy, medicine thresholds (NORMAL/LOW/CRITICAL/OUT_OF_STOCK), stockout prediction `stock / consumptionRate`, patient-vs-medicine optimization |
| **6 — Explainability & Log** | Transparency | DecisionRecord for every dispatch/hospital/route, rejected alternatives, event stream |
| **7 — Simulation & Analytics** | Demo readiness | Operator controls (`+ Add Emergency`, `Close Road`, etc.), benchmark mode baseline vs smart, metrics (avg response, wait, utilization, routing time) |
| **8 — Scale & Polish** | Performance + narrative | Virtualized map (only viewport), route caching, batch events, 5 differentiators demo, judge scenarios A–F |

---

## 7. Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Frontend HMR |
| `build` | `vite build` | Production bundle |
| `preview` | `vite preview` | Preview production |
| `lint` | `oxlint` | Lint |

Add after scaffolding: `dev:server`, `test`, `bench`, `seed:large` (generate 50k-node graph).

---

## 8. Development Notes

- **No external AI for core routing** — algorithms must be deterministic.
- **Synthetic data only** — no real PII.
- **Measured metrics** — do not fabricate benchmark numbers; display measured timings.
- **Large graph rendering** — never render all 50k nodes as DOM elements; use canvas/WebGL (deck.gl) + viewport culling.
- **Naming** — product name is redacted for development and will be re-introduced once finalized.

---

## 9. References

- Vite config: `vite.config.js:1`
- App entry: `src/main.jsx:1`, `src/App.jsx:1`
- Package manifest: `package.json:1`

---

*Generated for development kickoff — tech stack is a recommendation, not locked. Adjust based on team expertise (Node vs Python) but keep the frontend map + realtime + explainability pillars.*
