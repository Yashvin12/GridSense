# GridSense

**Probabilistic fault location for rural distribution feeders.**  
**PS-B13 · Innovate4Impact · Smart Technology & Innovation**

GridSense applies Bayesian inference to streaming evidence — relay trips, smart meter last-gasp signals, voltage collapse events, weather alerts, and field crew reports — to produce a continuously-updating posterior probability of fault location and cause. The system is designed for control-room operators and field supervisors who need a defensible, evidence-grounded answer to the question: *where is the fault, and how certain are we?*

---

## What it does

When a feeder trips, GridSense:

1. **Ingests evidence** from sensors, AMI meters, weather feeds, and consumer complaints
2. **Updates a Bayesian belief** over candidate fault sections in real time
3. **Generates an optimal crew inspection route** ranked by posterior probability
4. **Closes the loop** when crew feedback arrives — new evidence updates the belief immediately

The interface is built around a single operational question: **where is the fault?** Every component supports that question; nothing is decorative.

---

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

### Backend

```bash
cd backend
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# Runs at http://localhost:8000
# Interactive API docs at http://localhost:8000/docs
```

---

## Interface

Four views, each focused on a specific operational task:

| View | Purpose |
|------|---------| 
| **Overview** | Fault location · Posterior probability · Evidence chain · Impact · Recommended switching |
| **Evidence** | Belief evolution chart · Full evidence log · Live telemetry with anomaly interpretation |
| **Crew Dispatch** | Prioritised inspection route · Fault confirmation · Belief update feedback |
| **Cause Analysis** | Fault cause posterior · Supporting evidence strength · Competing hypotheses · Sensitivity |

### Design principles

- Every percentage is explicitly labeled — `91% posterior probability`, `74% cause probability` — never a naked number
- Evidence strength is qualitative (`Very strong`, `Strong`, `Moderate`) — not pseudo-quantitative posterior deltas
- The belief evolution chart annotates the evidence events that caused each probability shift
- Telemetry shows contextual deviation from baseline (`24% below nominal`) not just raw values
- Crew feedback visibly updates the belief: `Section B: 91% → 96%`
- Colors are strictly semantic: red = fault / danger, amber = warning / uncertainty, green = healthy

---

## Tech Stack

| Layer | Technology |
|-------|-----------| 
| Frontend framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + custom CSS design tokens |
| Charts | Recharts |
| Map | Leaflet + react-leaflet (CartoDB dark tiles) |
| Fonts | IBM Plex Sans (UI) · IBM Plex Mono (data, timestamps) |
| State | React Context + useReducer |
| Backend | FastAPI + Uvicorn |
| Schemas | Pydantic v2 |
| Graph layer | NetworkX (feeder topology DiGraph) |
| Bayesian engine | Pure Python — pgmpy available, currently custom implementation |
| Change detection | ruptures (change-point), River (online ML) |
| Route optimisation | OR-Tools (TSP/VRP) |
| Data / GIS | pandas, GeoPandas, Shapely |
| Testing | pytest (71 tests, 0 failures) |

---

## Project Structure

```
GridSense/
├── frontend/                      # React + TypeScript UI
│   └── src/
│       ├── components/
│       │   ├── analysis/          # CauseBarList, SectionProbabilities
│       │   ├── crew/              # InspectionStops
│       │   ├── dashboard/         # FaultSummaryPanel, WhyThisLocation
│       │   ├── evidence/          # BeliefChart, EvidenceLog, TelemetryChart
│       │   ├── layout/            # TopBar, Sidebar
│       │   ├── map/               # FeederMap (Leaflet)
│       │   └── shared/            # AnimatedNumber, ProbabilityBar, StatusDot
│       ├── context/
│       │   └── GridContext.tsx    # Global state — single source of truth
│       ├── data/
│       │   ├── mockData.ts        # Scenario data, feeder topology, evidence log
│       │   └── mockEngine.ts      # Bayesian update simulation (temporary)
│       ├── views/                 # DashboardView, EvidenceView, CrewView, CauseView
│       └── index.css              # Design system tokens
│
├── backend/                       # FastAPI server + inference engine
│   ├── app/
│   │   ├── main.py                # FastAPI app — all REST endpoints
│   │   ├── schemas.py             # Pydantic API contracts
│   │   ├── data_gen.py            # Static mock store (to be replaced by engine)
│   │   ├── feeder_graph.py        # NetworkX feeder knowledge graph
│   │   └── services/
│   │       └── bayesian/
│   │           ├── engine.py      # BayesianInferenceEngine — core reasoning
│   │           ├── models.py      # Evidence, BeliefSnapshot, EngineState
│   │           ├── likelihoods.py # Likelihood tables per evidence type / cause
│   │           ├── demo.py        # CLI demo: full Mulshi inference walkthrough
│   │           └── tests/         # 71 unit + integration tests
│   ├── data/                      # Synthetic CSVs (Mulshi feeder scenario)
│   ├── requirements.txt
│   └── README.md
│
└── docs/
    ├── index.md                   # Documentation index
    ├── architecture.md            # Full system architecture + integration roadmap
    └── bayesian_engine.md         # Bayesian engine — math, API, numerical examples
```

---

## Scenario

```
Mulshi 33kV Substation
  │
  ├── Section A  (Poles 40–42)  ─── Tamhini      [Energized · 3% posterior]
  │
  ├── Section B  (Poles 43–46)  ─── Kolvan       [FAULT ZONE · 91% posterior]
  │         DTR-2 (63kVA)
  │
  └── Section C  (Poles 47–49)  ─── Bhira        [Downstream · 6% posterior]
```

**Evidence sequence:**

| Time | Event | Engine effect |
|------|-------|---------------|
| 14:22:15 | Overcurrent relay trip — Mulshi Substation | A: 33%→9%, B/C: 33%→46% each |
| 14:22:18 | Last-gasp signals — Kolvan (14 meters) | B: 46%→68% |
| 14:22:20 | Last-gasp signals — Bhira (8 meters) | C rises slightly |
| 14:23:01 | Voltage collapse — DTR-2 | B: 68%→75% |
| 14:23:45 | High wind detected — Pole 43–46 corridor | Vegetation contact cause increases |
| 14:24:12 | Consumer complaints — Kolvan (3 reports) | B: 75%→82% |
| 14:25:00 | Transformer temperature spike — DTR-2 (89°C) | Transformer overload cause increases |
| 14:26:30 | Current near zero — Section B conductors | B: 82%→91% |

---

## Probable Cause

**Vegetation Contact — 74% cause probability**

Supporting evidence: high wind along the Pole 43–46 corridor (very strong), fault topology matching tree-contact pattern (strong), voltage collapse at DTR-2 (strong), consumer outage reports from Kolvan (moderate).

---

## Key Implementation Notes

### Bayesian Engine

The engine in `backend/app/services/bayesian/engine.py` is a **stateful, sequential Bayesian updater**. Each call to `engine.update(evidence)` applies Bayes' rule and the posterior becomes the prior for the next update. The engine integrates with the NetworkX feeder graph — relay trip evidence is resolved to downstream sections via graph traversal; meter outage evidence is resolved to supplying sections via graph lookup.

**71 tests pass. Zero failures.**

### Frontend State (Current)

The frontend currently uses `mockData.ts` and `mockEngine.ts` for all data. This is an intentional development phase — the backend is built and tested, the frontend is production-quality, and the connection is the next integration step.

### Timestamp Consistency

All timestamps — evidence log, belief history, telemetry, header — are anchored to the same scenario timeline (14:22–14:26 IST on 2026-08-08).

---

## Documentation

| Document | Description |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Full system architecture, module descriptions, data flow, integration roadmap |
| [docs/bayesian_engine.md](docs/bayesian_engine.md) | Bayesian engine — math, evidence types, complete API reference, numerical example |
| [backend/README.md](backend/README.md) | Backend quick start, endpoint reference, engine usage, test commands |

---

## Roadmap

### Immediate (Akshu — frontend integration)
- [ ] Replace `mockData.ts` with `fetch()` calls to FastAPI endpoints
- [ ] Add `VITE_USE_MOCK=true` env flag as fallback
- [ ] Wire `FAULT FOUND` / `NO FAULT` buttons to `POST /api/crew/confirm`
- [ ] WebSocket or polling for live telemetry feed

### Next (Vinnu — engine integration)
- [ ] Wire `BayesianInferenceEngine` into FastAPI endpoints
- [ ] Add `POST /api/evidence/update` — accepts evidence, returns updated posteriors
- [ ] Change-point detection (`ruptures`) on telemetry stream
- [ ] OR-Tools crew route endpoint

### Phase 2 (post-demo)
- [ ] Multi-crew support
- [ ] Historical fault database and learning loop
- [ ] Mobile crew app with GPS-triggered stop confirmation
- [ ] Multi-feeder view with network-level switching optimisation
- [ ] GIS priority map export and fault report PDF
