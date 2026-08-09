# GridSense — System Architecture

**PS-B13 · AI-Based Rural Electricity Fault Localization**

GridSense applies continuous Bayesian reasoning over streaming evidence to maintain a live probability map of fault location and cause on a rural distribution feeder.

---

## System Overview

```
Evidence Sources
  │
  ├── Substation relays / sensors
  ├── Smart meter last-gasp signals
  ├── Transformer telemetry
  ├── Weather API (OpenWeather)
  └── Consumer complaints
          │
          ▼
  ┌──────────────────────────────────────┐
  │        FastAPI Backend               │
  │  backend/app/main.py                 │
  │                                      │
  │  ┌─────────────────────────────┐     │
  │  │  Feeder Knowledge Graph     │     │
  │  │  backend/app/feeder_graph   │     │
  │  │  (NetworkX DiGraph)         │     │
  │  └────────────┬────────────────┘     │
  │               │ topology queries     │
  │  ┌────────────▼────────────────┐     │
  │  │  Bayesian Inference Engine  │     │
  │  │  backend/app/services/      │     │
  │  │  bayesian/engine.py         │     │
  │  │                             │     │
  │  │  P(section | evidence)      │     │
  │  │  P(cause | evidence)        │     │
  │  └─────────────────────────────┘     │
  │                                      │
  │  REST API endpoints                  │
  └──────────────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────────────┐
  │       React Frontend                 │
  │  frontend/src/                       │
  │                                      │
  │  Overview · Evidence · Crew · Cause  │
  └──────────────────────────────────────┘
```

---

## Core Modules

### 1. Feeder Knowledge Graph — `backend/app/feeder_graph.py`

Encodes the **Mulshi 33kV feeder** topology as a directed NetworkX `DiGraph`.

**Node types:** `substation` | `pole` | `transformer` | `switch` | `village` | `meter`

**Edge types:** `connected_to` | `supplies` | `downstream_of`

**Key functions used by the Bayesian engine:**

| Function | Purpose |
|---|---|
| `get_downstream_sections(node_id)` | Returns sections downstream of a relay — used for `RELAY_TRIP` evidence |
| `get_supplying_section(village_id)` | Maps a village name to its supplying section — used for meter/complaint evidence |
| `get_affected_villages(fault_section)` | Returns villages that lose power if a section faults |
| `get_switch_isolation_plan(fault_section)` | Returns switching steps to isolate fault and restore downstream |

The graph is constructed from `backend/data/feeder_topology.csv` and `backend/data/feeder_edges.csv`, with a hard-coded fallback if CSVs are missing.

---

### 2. Bayesian Inference Engine — `backend/app/services/bayesian/`

The mathematical heart of GridSense. Maintains a **live probability distribution** over candidate fault sections and fault causes. Evidence updates beliefs sequentially — the engine never restarts.

**Core equation:**

```
P(Si | E) = P(E | Si) . P(Si)  /  Sj [ P(E | Sj) . P(Sj) ]
```

The posterior after evidence Ek becomes the prior for Ek+1.

**Files:**

| File | Purpose |
|---|---|
| `engine.py` | `BayesianInferenceEngine` class — stateful sequential updater |
| `models.py` | `Evidence`, `BeliefSnapshot`, `EngineState` dataclasses |
| `likelihoods.py` | Likelihood tables — one per evidence type, one per cause |
| `demo.py` | CLI demo: runs the full Mulshi scenario step by step |
| `tests/` | 71 unit + integration tests |

**Evidence types supported:**

| Type | Graph-aware? | What it updates |
|---|---|---|
| `RELAY_TRIP` | yes, via `get_downstream_sections` | Sections downstream of relay |
| `METER_OUTAGE_CLUSTER` | yes, via `get_supplying_section` | Section supplying the village |
| `CONSUMER_COMPLAINT` | yes, via `get_supplying_section` | Section supplying the village |
| `CURRENT_ANOMALY` | Positional fallback | Section with anomalous current |
| `VOLTAGE_ANOMALY` | Positional fallback | Section with voltage deviation |
| `TRANSFORMER_TEMPERATURE` | Positional fallback | Section containing transformer |
| `HIGH_WIND` | Ambient (no section) | Cause distribution only |
| `HEAVY_RAIN` | Ambient | Cause distribution |
| `LIGHTNING` | Ambient | Cause distribution |
| `CREW_CONFIRMED` | Direct | Strong increase on target section |
| `CREW_NO_FAULT` | Direct | Strong decrease on target section |

**Cause hypotheses:**
- `VEGETATION_CONTACT`
- `BROKEN_CONDUCTOR`
- `TRANSFORMER_OVERLOAD`
- `LIGHTNING`

> **No XGBoost / training data needed.** Cause classification uses the same Bayesian network structure as location inference — this keeps the "zero historical data" claim airtight.

---

### 3. FastAPI Backend — `backend/app/main.py`

Serves the React frontend. Currently serves the static mock scenario; designed to be replaced by live engine calls.

**Run:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Endpoints:**

| Method | Path | Returns |
|---|---|---|
| GET | `/api/fault` | `FaultData` — most probable section + confidence |
| GET | `/api/causes` | `CauseEntry[]` — ranked fault causes |
| GET | `/api/sections` | `SectionProbability[]` — posterior per section |
| GET | `/api/telemetry` | `TelemetryPoint[]` — 60 readings, 30s apart |
| GET | `/api/crew-plan` | `CrewStop[]` — ranked inspection route |
| GET | `/api/evidence` | `EvidenceEvent[]` — chronological evidence log |
| GET | `/api/belief-history` | `BeliefSnapshot[]` — belief evolution over time |
| GET | `/api/feeder/nodes` | `FeederNode[]` — feeder topology nodes |
| GET | `/api/feeder/edges` | `FeederEdge[]` — feeder topology edges |
| GET | `/api/villages` | `string[]` — affected village names |
| GET | `/api/switching-plan` | `SwitchingStep[]` — recommended switching actions |
| GET | `/api/eta` | `float` — crew ETA in minutes |
| POST | `/api/crew/confirm` | `CrewStop[]` — updated crew plan after feedback |

**Pydantic schemas:** `backend/app/schemas.py`

---

### 4. Synthetic Data — `backend/data/`

All CSVs match the **Mulshi 33kV Feeder 1** scenario (fault at 14:22 IST, Section B).

| File | Contents |
|---|---|
| `feeder_topology.csv` | All nodes with coordinates, type, section, power status |
| `feeder_edges.csv` | All edges with from/to node IDs, edge type, section |
| `telemetry_stream.csv` | 60 readings — 40 pre-fault normal, 20 fault-state |
| `meter_events.csv` | Smart meter last-gasp timestamps per village |
| `consumer_complaints.csv` | 3 complaint records from Kolvan |
| `weather_events.csv` | Wind speed readings with timestamps |

---

### 5. React Frontend — `frontend/src/`

Four operational views, each focused on a specific decision:

| View | Question it answers |
|---|---|
| **Overview** | What is happening right now? |
| **Evidence** | Why did the belief change? |
| **Crew Dispatch** | Where should the crew inspect first? |
| **Cause Analysis** | Why does the system believe this cause? |

**State management:** `GridContext.tsx` — single React Context with `useReducer`. Currently drives all UI from mock data in `mockData.ts` + `mockEngine.ts`. The next integration step replaces these with API calls.

---

## Scenario — Mulshi 33kV Feeder 1

```
Mulshi 33kV Substation (SS1)
  |
  +-- Section A  (P40-P42, DTR-1, SW1)  -- Tamhini  [Energized  . 3% posterior]
  |
  +-- Section B  (P43-P46, DTR-2, SW2)  -- Kolvan   [FAULT ZONE . 91% posterior]
  |         Fault at 14:22:00 IST
  |
  +-- Section C  (P47-P49, DTR-3, SW3)  -- Bhira    [Downstream . 6% posterior]
```

**Evidence arrival sequence (engine output):**

| Time | Evidence | Effect |
|---|---|---|
| 14:22:15 | `RELAY_TRIP` at SW1 | A: 33% > 9%, B: 33% > 46%, C: 33% > 46% |
| 14:22:18 | `METER_OUTAGE_CLUSTER` at Kolvan | B: 46% > 68% |
| 14:23:01 | `VOLTAGE_ANOMALY` at DTR-2 | B: 68% > 75% |
| 14:23:45 | `HIGH_WIND` (ambient) | Vegetation contact cause increases |
| 14:24:12 | `CONSUMER_COMPLAINT` at Kolvan | B: 75% > 82% |
| 14:25:00 | `TRANSFORMER_TEMPERATURE` at DTR-2 | Transformer overload cause increases |
| 14:26:30 | `CURRENT_ANOMALY` at Section B | B: 82% > 91% |

**Final output:**
- Fault Location: Section B (Poles 43-46) — **91% posterior**
- Fault Cause: Vegetation Contact — **74%**
- Affected: Kolvan, Bhira
- Crew: Inspect Pole 44 > Pole 45 > Pole 43
- ETA: 43 minutes
- Switching: Open S2 > Close Tie T4 > Restore Bhira

---

## Integration Roadmap

```
Current state:
  Frontend  <--  mock data (mockData.ts + mockEngine.ts)
  Backend   <--  static store (data_gen.py)
  [No live connection between frontend and backend]

Next step — Akshu:
  1. Replace mockData.ts with fetch() calls to FastAPI endpoints
  2. Add VITE_USE_MOCK=true env flag as fallback
  3. Wire FAULT FOUND/NO FAULT buttons to POST /api/crew/confirm

After that — Vinnu:
  1. Wire BayesianInferenceEngine into /api/fault and /api/sections
  2. Add POST /api/evidence/update — accepts Evidence, returns EngineState
  3. Add WebSocket for live telemetry
  4. Add ruptures change-point detection on telemetry
  5. Add OR-Tools crew route endpoint
```

---

## Running Tests

```bash
cd backend

# All 71 tests
venv\Scripts\python -m pytest app/services/bayesian/tests -v

# Bayesian demo — shows full Mulshi reasoning sequence
venv\Scripts\python -m app.services.bayesian.demo
```

**Current test results:** 71 passed, 0 failed (as of 2026-08-09).
