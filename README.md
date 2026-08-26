# Healthcare Emergency Response Platform

Live rural healthcare command system — finds the best **feasible** ambulance + route + hospital combination (not just nearest), handling road closures, resource limits, specialist/bed/medicine constraints and urgency.

> Clinical UI: light medical blue (`#1677A8`), `bg #F4F8FA`, subtle borders `#DCE7EC`, Inter font, command-center layout (Nav rail 68px + Live Map hero + KPI strip). All numbers are measured via `performance.now()`, no fabricated metrics.

## Table of Contents
- [Project Overview](#project-overview)
- [Technologies Used](#technologies-used)
- [Setup / Run Instructions](#setup--run-instructions)
- [Project Structure](#project-structure)
- [Algorithm / Approach](#algorithm--approach)
- [Testing / Test Cases](#testing--test-cases)
- [Third-Party APIs](#third-party-apis)
- [AI Tools Used](#ai-tools-used)
- [Key Product Notes](#key-product-notes)

## Project Overview
Rural emergencies fail when the *nearest* hospital lacks a specialist, ICU, or medicine, or the road is closed. This platform is a **live command-and-decision system** for operators to:

- See the network on a zoomable/pannable SVG map (villages, hospitals, ambulances, roads, active route with moving van `ambulance → village`).
- Manage a **priority queue** (Critical > High > Medium > Low + waiting-time anti-starvation).
- Dispatch ambulances by **ETA + capability + cross-region fallback**.
- Select hospitals by **feasibility first, then total cost** (`travel + queue + bed/ICU/medicine penalties`).
- Re-route on `ROAD_CLOSED / SLOW` via `A*` with live `old ETA → new ETA`.
- Compare **patient transfer vs medicine delivery** (ETA).
- Run **judge scenarios A–F** (normal, road closure, specialist missing, hospital full, medicine stockout, fleet shortage) and view **explainable decisions** + **benchmark**.

Designed for 50k nodes / 200k edges scale (adjacency-list, binary heap, viewport culling) — currently demoed at 200 nodes / ~480 edges.

## Technologies Used

| Layer | Choice | Purpose / Why |
|---|---|---|
| **Frontend** | **Vite 8 + React 19 + JavaScript (ESM)** | Fast HMR, no SSR overhead for SPA dashboard |
| **Styling** | **Tailwind CSS 4 + @tailwindcss/vite** | Utility-first clinical design (spacing 4/8, radius 6, shadows subtle) |
| **Font** | **Inter (Google Fonts)** | Single clinical typeface, tabular numbers for metrics |
| **Map** | **Custom SVG** | Lightweight, zoom/pan via `viewBox` + `requestAnimationFrame` throttling; avoids 42KB Leaflet billing/key issues for demo. Designed to swap to `MapLibre + deck.gl` for 50k-node WebGL |
| **State / Cache** | **React `useState/useMemo` + in-memory `Map` + `routeCache.js` (LRU 200)** | No Redux/Zustand in production bundle — keeps demo in-memory; `TanStack Query / Zustand` noted as intended for server sync |
| **Algorithms** | **Adjacency-list `Graph`, `MinHeap`, `Dijkstra`, `A* (haversine heuristic)`** | Deterministic, testable routing; `heap.js` is hand-rolled binary heap |
| **Build / Lint** | **`@vitejs/plugin-react`, `vite`, `oxlint`** | ESM build, React fast refresh, lint |
| **Types** | **`@types/react`, `@types/react-dom` (dev)** | IDE hints only |

> Proposed (not bundled): `Node 20 + Fastify + Socket.IO`, `Zod`, `Recharts`, `react-leaflet/MapLibre`, `fastpriorityqueue/rbush` — see `Third-Party` section.

## Setup / Run Instructions

**Prereqs:** Node 18+ (tested Node 20), `npm` 9+

```bash
# 1. Install
npm install

# 2. Dev (HMR at http://localhost:5173)
npm run dev

# 3. Build (production)
npm run build        # outputs dist/

# 4. Preview built
npm run preview      # http://localhost:4173

# 5. Lint
npm run lint         # oxlint
```

**Synthetic data:** `src/data/seed.js:3 generateGraph({nodeCount:200, edgePerNode:4, seed:42})` — change `nodeCount` to `50000` for scale test (render is viewport-culled).

## Project Structure
```
src/
├── components/
│   ├── Map/NetworkMap.jsx      # SVG map: zoom/pan, roads (casing+core), villages (house), hospitals (cross), ambulances (van), moving van ambulance→village
│   ├── Header/Header.jsx, NavRail.jsx
│   ├── Queue/EmergencyForm.jsx, PriorityQueue.jsx
│   ├── Dispatch/AmbulancePanel.jsx
│   ├── Hospital/HospitalList.jsx, HospitalDecision.jsx
│   ├── Decision/DecisionLog.jsx
│   ├── Simulation/RoadControl.jsx, Scenarios.jsx, SimulationBar.jsx
│   └── common/Badge.jsx, Icon.jsx
├── data/seed.js                # Synthetic graph generator (haversine, 40 km/h)
├── lib/
│   ├── graph/{graph.js, heap.js, dijkstra.js, astar.js, cachedRoutes.js}
│   ├── dispatch/{ambulance.js, priorityQueue.js, selectAmbulance.js}
│   ├── hospital/{generateHospitals.js, selectHospital.js}
│   ├── decision/{decisionEngine.js, decisionRecord.js, eventLog.js}
│   ├── resources/{doctors.js, beds.js, medicine.js, transferDecision.js}
│   ├── simulation/{engine.js, reroute.js}
│   ├── cache/routeCache.js     # LRU 200, invalidate() on ROAD events
│   └── analytics/{metrics.js, benchmark.js}
├── index.css                   # @theme tokens, Inter, panel/shadow utilities
├── App.jsx                     # Mission/ Dispatch/ Facilities/ Resources/ Analytics/ Decisions/ Simulation tabs, 6 scenarios
└── main.jsx
```

## Algorithm / Approach

**1. Graph:** `src/lib/graph/graph.js:1` `class Graph` — `Map nodes`, `Map adj` adjacency-list, `Map edgeMap`. `addEdge` stores forward + `_rev` reverse edge. `updateEdge` syncs only `destList/sourceList` (O(degree), not O(E)), sets `currentTravelTime = status==='CLOSED'?Infinity:baseTravelTime*trafficMultiplier`.

**2. Routing:** `dijkstra.js:3` / `astar.js:14` both use `MinHeap` (`heap.js:1` binary heap `_bubbleUp/_sinkDown`). `Dijkstra` for general shortest path (non-negative weights, respects `Infinity` for CLOSED). `A*` uses `haversineKm` heuristic `km / (maxSpeedKmh/60)` (admissible, `maxSpeed 60`). `decideRoute:45` measures `performance.now()` → `record.ms`.

**3. Priority Queue:** `priorityQueue.js` — conceptual `urgency_weight + waiting_time + risk + escalation`, `insert/peek/pop/update`, `slice(0,80)` form dropdown, anti-starvation via waiting-time boost. `App.jsx:62` `queue.toSorted()`.

**4. Ambulance Selection:** `selectAmbulance.js` — filter `AVAILABLE + canHandle(equipment)`, `dijkstra` ETA from `ambulance.location → request.originNode`, sort by ETA, `crossRegion` fallback to `EN_ROUTE` busy as backup. Returns `{selected, candidates:{amb,eta,feasible,reason}}`.

**5. Hospital Selection (core differentiator):**
```
src/lib/hospital/selectHospital.js:22
  hard fail → rejected (operatingStatus, specialist via doctors.js, equipment, ICU, beds, medicine qty)
  else dijkstra(origin → hospital) → if !feasible → infeasible (no haversine fake — honest disconnect)
  else queueTime = queueLength*4, bedPenalty ( <15% 18, <30% 10, <50% 4), icuPenalty, medicinePenalty (critical 14, low 7)
  totalCost = travel + queueTime + bedPenalty + icuPenalty + medicinePenalty
  sort feasible by totalCost, explain nearest vs cheapest
```

**6. Resources:** `doctors.js` per-hospital specialist availability, `beds.js/icu`, `medicine.js` stock `{minimum:15, critical:5}` → `NORMAL/LOW/CRITICAL/OUT_OF_STOCK`, `transferDecision.js:3 compareTransferVsDelivery` — `dijkstra(patient→hospital)` vs `dijkstra(sourceHospital→patient)` for each required med, picks lower ETA +2 min bias for delivery.

**7. Dynamic Re-routing:** `simulation/reroute.js` + `App.jsx:117 handleRoadUpdate` / `158 handleScenarioB` — `graph.updateEdge(id,{status,trafficMultiplier})` → `invalidate()` cache → new `A*` ETA shown as `old → new`.

**8. Explainability:** `decisionEngine.js:24 decideHospital/decideAmbulance/decideRoute` wraps results into `createRecord` (`decisionRecord.js`) with `selected, alternatives[5], reason, algorithm` — rendered in `HospitalDecision.jsx` + `DecisionLog.jsx` + `EventLog`.

**9. Scale:** Adjacency-list, `heap O(log n)`, viewport culling (`NetworkMap 280→420 edges`, `village slice`), LRU cache, `batch` ready.

## Testing / Test Cases

No automated test runner is configured (no `vitest`/`jest` in `package.json`). Manual verification via judge scenarios and synthetic runs:

**Judge Scenarios (A–F) — `src/components/Simulation/Scenarios.jsx:1` wired in `App.jsx:148`:**
| Scenario | Action | Expected |
|---|---|---|
| **A Normal** | `Critical cardiology+ventilator+epinephrine+ICU` at random village | `AMB selected` + nearest feasible hospital (H01) + route shown + `A* 0.4ms` |
| **B Road Closure** | Close middle edge of active `route.edges` | `ROUTE_RECALCULATED`, `old ETA → new ETA (+~6m)`, red dashed road, `invalidate()` |
| **C Specialist Missing** | `createDemoHospitals` — `H01 lacks cardiology, H02 ICU 0` | `H01/H02 rejected` → `H03 FAR feasible` selected (hard filter demo) |
| **D Hospital Full** | `H01 beds 0, ICU 0, queue+5` + new `Critical` | `H01 correctly REJECTED (beds/ICU 0)` → next cheapest (`H02`) wins |
| **E Medicine Stockout** | `H01 epinephrine/insulin 0` + new `Critical epi` | `H01 REJECTED (Medicine)` + `compareTransferVsDelivery` → `DELIVER epi from H02 ETA 5.2m vs Transfer 8.1m` |
| **F Fleet Shortage** | `6/8 ambulances → EN_ROUTE` + new `Critical` | `crossRegion` finds backup `AMB-07/08` (`Backup ETA …`) |

**Additional checks:**
- `RoadControl` — apply `CLOSED/SLOW/OPEN` on any `eId`, verify `Road Map` red/amber/gray + recalc
- `Medicine stockout` via `HospitalList` buttons (`-5 beds`, `Fill ICU`, `Stockout epi`) → queue re-scores
- `Benchmark` — create ≥1 emergency → `Baseline nearest ignores constraints (failed 66%+)` vs `Smart feasible 0%`, routing `ms` from `performance.now()`
- `Performance` — generate `50000 nodes` in `seed.js`, confirm render stays at ~420 SVG elements, no full DOM scan
- `Build/Lint` — `npm run build` (49 modules) + `npm run lint` (0 errors, ~5 purity warnings expected) as smoke tests

**To add automated tests (suggested):**
```bash
# example
npm i -D vitest
# tests/lib/graph/dijkstra.test.js — assert closed edge = Infinity, A* <= Dijkstra visited
```

## Third-Party APIs

| Name | One-line purpose |
|---|---|
| **Google Fonts — Inter** (`index.html:8` `fonts.googleapis.com`) | Single clinical typeface for UI |
| **Tailwind CSS 4 + @tailwindcss/vite** (`package.json:13`) | Utility styling, `@theme` tokens |
| **Vite 8 + @vitejs/plugin-react** (`package.json:21`) | Dev HMR + production build |
| **React 19 + React-DOM 19** (`package.json:14`) | UI rendering |
| **Oxlint 1.79** (`package.json:21`) | Linting |
| *Proposed / not yet bundled* || 
| **Leaflet / React-Leaflet → MapLibre + deck.gl** (`README prior`) | Planned WebGL map for 50k-node scale |
| **Zod** | Planned runtime validation for `EmergencyRequest/Hospital/RoadEdge` |
| **Zustand + TanStack Query** | Planned client state + server cache |
| **Recharts** | Planned charts for `Analytics` |
| **Socket.IO** | Planned realtime `ROAD_CLOSED` push |
| **fastpriorityqueue / rbush** | Planned binary heap / spatial index alternatives |

> No external paid APIs (Google Maps, clinical AI) are used — routing is fully deterministic (`PRD 6`).

## AI Tools Used

| Tool | One-line purpose |
|---|---|
| **Muse Spark 1.2** | Primary AI coding assistant — scaffolding, clinical UI (DESIGN.md), map zoom/ambulance animation, benchmark fixes, bug fixes |
| **Muse (Anthropic)** | Explored codebase for similar hardcoded-coordinate bugs and cached-route inconsistencies |
| **Google Fonts API (Inter)** | AI-suggested typography choice for clinical readability (via Muse Spark) — not a generative AI but used as external API |

> All core routing (`Dijkstra`, `A*`, `heap`, `selectHospital` hard-filter + `totalCost`) is deterministic hand-written code (`src/lib/graph/*.js`) — AI was used for UI/boilerplate and bug fixing, never for routing correctness (per `PRD 6: Depending on an external AI model for core routing correctness — Non-goal`).

## Key Product Notes
- **Feasibility before optimization** — nearest infeasible is rejected before cost compare.
- **Explainable** — every dispatch/hospital/route returns `{selected, rejected: [{reason}]}`.
- **No fabricated metrics** — `performance.now()` timings, counts from live `Map`/`Set`.
- **Scale** — never render 50k DOM nodes; virtualize map, cache routes, batch events.

## Getting Started (repeat)
```bash
npm install
npm run dev      # http://localhost:5173
npm run build && npm run preview
npm run lint
```
