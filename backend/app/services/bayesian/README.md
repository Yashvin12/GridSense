# GridMind AI — Bayesian Inference Engine

Standalone, stateful Bayesian fault-localization and cause-inference module for rural electricity feeder networks.

## What It Does

The engine maintains a **live probability distribution** over candidate fault sections and probable fault causes. As evidence arrives (sensor anomalies, smart-meter outages, weather events, crew reports), it applies Bayes' rule to update its belief — never restarting from scratch.

```
Evidence 1 → Update belief → Evidence 2 → Update belief → …
```

## Mathematical Foundation

### Bayesian Inference (Core Equation)

For each candidate fault section *S_i* and evidence *E*:

```
P(S_i | E) = P(E | S_i) · P(S_i) / Σ_j [ P(E | S_j) · P(S_j) ]
```

Where:
- **P(S_i)** — current prior belief (initially uniform, then the previous posterior)
- **P(E | S_i)** — likelihood of observing evidence *E* if section *S_i* is faulty
- **P(S_i | E)** — updated posterior belief

The posterior after processing evidence *E_k* becomes the prior for evidence *E_{k+1}*. This is **sequential Bayesian reasoning** — the engine's core innovation.

### Evidence Strength Interpolation (Engineering Layer)

Each evidence item carries a `strength ∈ [0.0, 1.0]` that controls how strongly the evidence influences the likelihood:

```
L' = (1 - strength) + strength · L
```

- `strength = 0.0` → no effect (L' = 1.0 for all sections, uninformative)
- `strength = 1.0` → full base likelihood applied

> **Note:** This interpolation formula is an **engineering mechanism** for controlling evidence influence. It is NOT itself a Bayesian theorem — it is a practical layer that modulates the likelihood values *before* they enter the Bayesian update equation above.

## Prior

If no prior is supplied, all sections start with equal probability:

```python
# 5 sections → each = 0.20
engine = BayesianInferenceEngine(sections=["S1", "S2", "S3", "S4", "S5"])
```

You can also supply a custom prior:

```python
engine = BayesianInferenceEngine(
    sections=["S1", "S2", "S3"],
    prior={"S1": 0.5, "S2": 0.3, "S3": 0.2}
)
```

## Evidence Types

### Topology-Aware Evidence

These evidence types use the **real feeder graph** to resolve topology relationships:

| Evidence Type | Graph Function Used | Purpose |
|---|---|---|
| `RELAY_TRIP` | `get_downstream_sections(node_id)` | Identifies which sections are downstream of the tripped relay |
| `METER_OUTAGE_CLUSTER` (with `location`) | `get_supplying_section(village_id)` | Resolves village name to its supplying section |
| `CONSUMER_COMPLAINT` (with `location`) | `get_supplying_section(village_id)` | Resolves village name to its supplying section |

When graph functions are available, these evidence types produce accurate, topology-aware likelihood distributions.

### Non-Topological Evidence (Positional Fallback)

When topology information is unavailable (no graph functions injected, or no `location` provided), the engine falls back to a **positional likelihood model** based on ordered-list adjacency:

| Position | Meaning |
|----------|---------|
| `target` | The section the evidence points at |
| `adjacent` | Sections 1 hop away |
| `near` | Sections 2 hops away |
| `far` | All remaining sections |
| `uniform` | Used when evidence has no specific section |

This fallback is also used for section-specific evidence (e.g. `CURRENT_ANOMALY` with `section_id`) and ambient evidence (e.g. `HIGH_WIND` without a section).

### Crew Feedback

Crew evidence is the strongest signal:

- **`CREW_CONFIRMED`** — strongly increases the target section's probability
- **`CREW_NO_FAULT`** — strongly decreases it, redistributing belief to others

The engine **never** sets any probability to exactly 0 or 1 — uncertainty is always preserved.

## Cause Inference

A separate Bayesian distribution tracks probable fault causes:

- `VEGETATION_CONTACT`
- `BROKEN_CONDUCTOR`
- `TRANSFORMER_OVERLOAD`
- `LIGHTNING`

Updated independently using the same Bayesian formula with cause-specific likelihood tables.

## Synthetic Likelihood Disclaimer

> **Important:** Current likelihood values in `likelihoods.py` are **domain-informed synthetic prototype parameters**. They are hand-crafted assumptions suitable for demonstrating the engine's reasoning capabilities.
>
> They are **NOT**:
> - Learned ML model weights
> - Historical utility fault statistics
> - Calibrated probabilities from real-world data
> - Production-grade utility fault probabilities
>
> Future versions should calibrate or learn these likelihoods using historical fault records from actual utility operations. The engine's architecture supports pluggable likelihood tables for exactly this purpose.

## Explainability

The engine records an **explanation log** for every evidence update. Each entry captures:

```json
{
    "evidence_type": "METER_OUTAGE_CLUSTER",
    "location": "Kolvan",
    "section_id": null,
    "resolved_section": "B",
    "strength": 0.9,
    "affected_sections": ["B"],
    "probabilities_before": {"A": 0.10, "B": 0.45, "C": 0.40},
    "probabilities_after":  {"A": 0.05, "B": 0.72, "C": 0.20},
    "timestamp": "2026-08-09T10:30:00+00:00"
}
```

This allows the UI to display:

```
Why Section B?

✓ Kolvan meter outages       (B: 45% → 72%)
✓ Relay trip downstream       (B: 33% → 46%)
✗ Crew rejected Section B     (B: 68% → 25%)
```

Access via `engine.get_evidence_summary()`.

## State Ownership

```
One BayesianInferenceEngine instance = One active outage investigation
```

The engine is stateful — it maintains a running belief distribution. It does **not** contain global mutable state.

For concurrent incident handling:

```
Incident A → Engine A
Incident B → Engine B
```

The API layer (FastAPI or equivalent) is responsible for creating and managing engine instances per incident. No complex concurrency machinery exists inside the engine itself.

## Complete Numerical Example

```
Sections: S1, S2, S3, S4, S5
Initial:  0.20, 0.20, 0.20, 0.20, 0.20

Evidence: CURRENT_ANOMALY at S3 (strength=0.8)

Likelihoods (from table, strength-adjusted):
  S1: (1-0.8) + 0.8 × 0.15 = 0.32   (near, dist=2)
  S2: (1-0.8) + 0.8 × 0.35 = 0.48   (adjacent, dist=1)
  S3: (1-0.8) + 0.8 × 0.90 = 0.92   (target, dist=0)
  S4: (1-0.8) + 0.8 × 0.35 = 0.48   (adjacent, dist=1)
  S5: (1-0.8) + 0.8 × 0.15 = 0.32   (near, dist=2)

Unnormalized:
  S1: 0.20 × 0.32 = 0.064
  S2: 0.20 × 0.48 = 0.096
  S3: 0.20 × 0.92 = 0.184
  S4: 0.20 × 0.48 = 0.096
  S5: 0.20 × 0.32 = 0.064
  Total = 0.504

Posterior:
  S1: 0.064 / 0.504 ≈ 12.7%
  S2: 0.096 / 0.504 ≈ 19.0%
  S3: 0.184 / 0.504 ≈ 36.5%   ← most likely
  S4: 0.096 / 0.504 ≈ 19.0%
  S5: 0.064 / 0.504 ≈ 12.7%
```

## Backend Integration Contract

The Bayesian Engine is a **framework-independent service**. The future FastAPI layer should use it as follows:

### Setup

```python
from app.services.bayesian import BayesianInferenceEngine, Evidence
from app.feeder_graph import (
    get_supplying_section,
    get_downstream_sections,
    get_affected_villages,
)

engine = BayesianInferenceEngine(
    sections=["A", "B", "C"],
    get_supplying_section=get_supplying_section,
    get_downstream_sections=get_downstream_sections,
    get_affected_villages=get_affected_villages,
)
```

### Processing Evidence

```python
engine.update(
    Evidence(
        evidence_type="METER_OUTAGE_CLUSTER",
        location="Kolvan",
        strength=0.9,
    )
)
```

### Reading State

```python
state = engine.get_state()

state.most_probable_section     # "B"
state.confidence                # 0.87
state.section_probabilities     # {"A": 0.05, "B": 0.87, "C": 0.08}
state.cause_probabilities       # {"VEGETATION_CONTACT": 0.72, ...}
state.affected_villages         # ["Kolvan", "Bhira"]
state.evidence_count            # 4
```

### JSON Serialization

```python
import json
json.dumps(state.to_dict())        # Always succeeds
json.dumps(engine.get_evidence_summary())  # Always succeeds
```

### Critical Rule

The FastAPI route handlers should call `engine.update()` and `engine.get_state()`. They should **NOT** implement Bayesian calculations inside the route handler itself. The engine encapsulates all probabilistic reasoning.

## Public API Reference

| Method | Returns | Purpose |
|--------|---------|---------|
| `update(evidence)` | `None` | Process evidence, update beliefs |
| `get_state()` | `EngineState` | Full public state snapshot |
| `get_beliefs()` | `dict[str, float]` | Copy of section probabilities |
| `get_most_likely_section()` | `tuple[str, float]` | Top section and its probability |
| `get_top_sections(k=3)` | `list[dict]` | Top-k sections sorted descending |
| `get_confidence()` | `float` | Max posterior probability |
| `get_cause_probabilities()` | `dict[str, float]` | Copy of cause probabilities |
| `get_evidence_summary()` | `list[dict]` | Explainability log with before/after |
| `get_history()` | `list[BeliefSnapshot]` | All historical belief snapshots |
| `get_affected_villages()` | `list[str]` | Villages affected by top section |
| `reset()` | `None` | Restore initial prior, clear history |

## Limitations

1. **Conditional independence assumption** — all evidence is treated as independent given the true fault. Correlated evidence (e.g. meter outage + complaint from same outage) can cause over-counting.
2. **Synthetic likelihoods** — prototype values, not learned from data.
3. **Linear adjacency fallback** — when no graph is available, sections are treated as an ordered list; real topological distance from the graph engine replaces this when graph functions are injected.

## How to Run Tests

```bash
cd backend
python -m pytest app/services/bayesian/tests -v
```

## How to Run Demo

```bash
cd backend
python -m app.services.bayesian.demo
```

The demo shows the full Bayesian reasoning progression using the real Mulshi feeder graph:
initial belief → relay trip → meter outage → ambient weather → crew rejection → crew confirmation → final prediction.
