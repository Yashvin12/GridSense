# GridSense Backend

FastAPI server + Bayesian inference engine + NetworkX feeder knowledge graph for PS-B13.

---

## Quick Start

```bash
# 1. Create and activate venv (Python 3.12)
py -3.12 -m venv venv
venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the API server
uvicorn app.main:app --reload
# Runs at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app — all REST endpoints
│   ├── schemas.py           # Pydantic models (API contracts)
│   ├── data_gen.py          # Static mock store (Mulshi scenario data)
│   ├── feeder_graph.py      # NetworkX feeder knowledge graph
│   ├── __init__.py
│   └── services/
│       └── bayesian/
│           ├── engine.py        # BayesianInferenceEngine — core reasoning
│           ├── models.py        # Evidence, BeliefSnapshot, EngineState
│           ├── likelihoods.py   # Likelihood tables per evidence type
│           ├── demo.py          # CLI demo — full Mulshi inference sequence
│           ├── __init__.py
│           └── tests/
│               ├── test_engine.py           # 47 unit tests
│               └── test_graph_integration.py # 24 integration tests
├── data/
│   ├── feeder_topology.csv  # Feeder nodes (poles, transformers, villages...)
│   ├── feeder_edges.csv     # Feeder edges (connected_to, supplies...)
│   ├── telemetry_stream.csv # 60-point telemetry (40 normal, 20 fault-state)
│   ├── meter_events.csv     # Smart meter last-gasp events
│   ├── consumer_complaints.csv
│   └── weather_events.csv
├── requirements.txt
├── visualize_graph.py       # Standalone graph visualization script
└── README.md                # This file
```

---

## API Endpoints

All endpoints served at `http://localhost:8000`.

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/fault` | Most probable fault section + confidence |
| GET | `/api/causes` | Ranked fault causes with probabilities |
| GET | `/api/sections` | Posterior probability per feeder section |
| GET | `/api/telemetry` | 60-point telemetry stream |
| GET | `/api/crew-plan` | Ranked inspection stops for crew |
| GET | `/api/evidence` | Chronological evidence log |
| GET | `/api/belief-history` | Belief evolution snapshots |
| GET | `/api/feeder/nodes` | All feeder nodes (for map rendering) |
| GET | `/api/feeder/edges` | All feeder edges (for map rendering) |
| GET | `/api/villages` | Affected village names |
| GET | `/api/switching-plan` | Recommended switching actions |
| GET | `/api/eta` | Crew ETA in minutes |
| POST | `/api/crew/confirm` | Report fault found / no fault at stop |

Full interactive docs: `http://localhost:8000/docs`

---

## Bayesian Engine — Quick Usage

```python
from app.services.bayesian import BayesianInferenceEngine, Evidence
from app.feeder_graph import (
    get_supplying_section,
    get_downstream_sections,
    get_affected_villages,
)

# Create engine with graph integration
engine = BayesianInferenceEngine(
    sections=["A", "B", "C"],
    get_supplying_section=get_supplying_section,
    get_downstream_sections=get_downstream_sections,
    get_affected_villages=get_affected_villages,
)

# Process evidence sequentially
engine.update(Evidence(evidence_type="RELAY_TRIP", location="SW1", strength=0.9))
engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", location="Kolvan", strength=0.9))
engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.7))

# Query state
state = engine.get_state()
print(state.most_probable_section)   # "B"
print(state.confidence)              # 0.87
print(state.affected_villages)       # ["Kolvan", "Bhira"]
print(state.cause_probabilities)     # {"VEGETATION_CONTACT": 0.72, ...}
```

Full documentation: [docs/bayesian_engine.md](../docs/bayesian_engine.md)

---

## Tests

```bash
# Run all 71 tests
venv\Scripts\python -m pytest app/services/bayesian/tests -v

# Run just engine unit tests
venv\Scripts\python -m pytest app/services/bayesian/tests/test_engine.py -v

# Run graph integration tests
venv\Scripts\python -m pytest app/services/bayesian/tests/test_graph_integration.py -v
```

**Current status:** 71 passed, 0 failed.

---

## Demo

```bash
venv\Scripts\python -m app.services.bayesian.demo
```

Walks through the full Mulshi scenario: initial uniform prior → relay trip → meter outage → wind event → crew rejection → crew confirmation → final 90%+ posterior.

---

## Connecting to the Frontend

The frontend (`frontend/`) currently runs on mock data. To connect:

1. Start this backend: `uvicorn app.main:app --reload`
2. In `frontend/.env.local`, set: `VITE_USE_MOCK=false`
3. The frontend `GridContext.tsx` will switch to fetching from `http://localhost:8000`

> Frontend integration is Akshu's task. See [docs/architecture.md](../docs/architecture.md) for the full integration plan.

---

## Next Steps 

1. **Wire `BayesianInferenceEngine` into endpoints** — replace static `data_gen.py` store with live engine
2. **Add `POST /api/evidence/update`** — accepts `Evidence` payload, returns updated `EngineState`
3. **Add WebSocket `/ws/telemetry`** — stream telemetry in real time
4. **Add change-point detection** — use `ruptures` on telemetry stream to auto-detect fault onset
5. **Add OR-Tools crew route** — `GET /api/crew/route` using posterior + population + distance scoring
