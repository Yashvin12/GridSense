"""
GridMind AI — Bayesian Inference Engine Demo

Demonstrates the core GridMind concept: the system continuously updates
its belief as new evidence arrives, using sequential Bayesian reasoning
over the real Mulshi feeder graph.

Run:
    cd backend
    python -m app.services.bayesian.demo
"""

from __future__ import annotations

import sys
import os

# Ensure backend/ is on the path so app.* imports work.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from app.feeder_graph import (
    get_downstream_sections,
    get_supplying_section,
    get_affected_villages,
)
from app.services.bayesian.engine import BayesianInferenceEngine
from app.services.bayesian.models import Evidence


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

_WIDTH = 60


def _header(title: str) -> None:
    print()
    print("=" * _WIDTH)
    print(f"  {title}")
    print("=" * _WIDTH)


def _print_beliefs(beliefs: dict[str, float]) -> None:
    for section, prob in sorted(beliefs.items()):
        bar = "#" * int(prob * 40)
        print(f"  {section}  {prob * 100:6.2f}%  {bar}")


def _print_causes(causes: dict[str, float]) -> None:
    for cause, prob in sorted(causes.items(), key=lambda t: t[1], reverse=True):
        label = cause.replace("_", " ").title()
        print(f"  {label:30s}  {prob * 100:5.2f}%")


def _print_evidence_entry(entry: dict) -> None:
    print(f"  Type:              {entry['evidence_type']}")
    if entry.get("location"):
        print(f"  Location:          {entry['location']}")
    if entry.get("section_id"):
        print(f"  Section ID:        {entry['section_id']}")
    if entry.get("resolved_section"):
        print(f"  Resolved section:  {entry['resolved_section']}")
    if entry.get("affected_sections"):
        print(f"  Affected sections: {entry['affected_sections']}")
    print(f"  Strength:          {entry['strength']}")


# ---------------------------------------------------------------------------
# Demo
# ---------------------------------------------------------------------------

def main() -> None:
    _header("GRIDMIND BAYESIAN INFERENCE DEMO")
    print()
    print("  Feeder:  Mulshi 33kV (Pune, Maharashtra)")
    print("  Sections: A, B, C")
    print()

    engine = BayesianInferenceEngine(
        sections=["A", "B", "C"],
        get_supplying_section=get_supplying_section,
        get_downstream_sections=get_downstream_sections,
        get_affected_villages=get_affected_villages,
    )

    # --- Step 0: Initial belief ---
    _header("STEP 0 — Initial Belief (Uniform Prior)")
    _print_beliefs(engine.get_beliefs())

    # --- Step 1: Relay trip at SW1 ---
    _header("STEP 1 — Evidence: RELAY_TRIP at SW1")
    print()
    print("  Graph query: get_downstream_sections('SW1')")
    print(f"  Result:      {get_downstream_sections('SW1')}")
    print()
    engine.update(Evidence(evidence_type="RELAY_TRIP", location="SW1", strength=0.9))
    print("  Updated belief:")
    _print_beliefs(engine.get_beliefs())

    # --- Step 2: Meter outage cluster at Kolvan ---
    _header("STEP 2 — Evidence: METER_OUTAGE_CLUSTER at Kolvan")
    print()
    print("  Graph query: get_supplying_section('Kolvan')")
    print(f"  Result:      {get_supplying_section('Kolvan')}")
    print()
    engine.update(Evidence(
        evidence_type="METER_OUTAGE_CLUSTER",
        location="Kolvan",
        strength=0.9,
    ))
    print("  Updated belief:")
    _print_beliefs(engine.get_beliefs())

    # --- Step 3: High wind (ambient) ---
    _header("STEP 3 — Evidence: HIGH_WIND (ambient, no section)")
    engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.7))
    print()
    print("  Updated belief:")
    _print_beliefs(engine.get_beliefs())

    # --- Step 4: Crew rejects B ---
    _header("STEP 4 — Evidence: CREW_NO_FAULT at Section B")
    engine.update(Evidence(
        evidence_type="CREW_NO_FAULT",
        section_id="B",
        strength=0.95,
    ))
    print()
    print("  Updated belief:")
    _print_beliefs(engine.get_beliefs())

    # --- Step 5: Crew confirms C ---
    _header("STEP 5 — Evidence: CREW_CONFIRMED at Section C")
    engine.update(Evidence(
        evidence_type="CREW_CONFIRMED",
        section_id="C",
        strength=0.95,
    ))
    print()
    print("  Updated belief:")
    _print_beliefs(engine.get_beliefs())

    # --- Final state ---
    _header("FINAL PREDICTION")
    state = engine.get_state()
    print()
    print(f"  Fault Section:       {state.most_probable_section}")
    print(f"  Posterior:            {state.confidence * 100:.2f}%")
    print(f"  Evidence processed:  {state.evidence_count}")
    print()
    print("  Affected Villages:")
    for v in state.affected_villages:
        print(f"    - {v}")
    print()
    print("  Cause Probabilities:")
    _print_causes(state.cause_probabilities)

    # --- Explainability ---
    _header("EVIDENCE EXPLANATION LOG")
    for i, entry in enumerate(engine.get_evidence_summary(), 1):
        print(f"\n  --- Evidence {i} ---")
        _print_evidence_entry(entry)
        print()
        before = entry["probabilities_before"]
        after = entry["probabilities_after"]
        for s in sorted(before.keys()):
            delta = after[s] - before[s]
            arrow = "^" if delta > 0.001 else ("v" if delta < -0.001 else "=")
            print(f"    {s}: {before[s]*100:6.2f}% {arrow} {after[s]*100:6.2f}%")

    # --- JSON serialization check ---
    _header("JSON SERIALIZATION CHECK")
    import json
    state_dict = state.to_dict()
    json_str = json.dumps(state_dict, indent=2)
    print()
    print("  engine.get_state().to_dict() -> json.dumps() OK")
    print(f"  Payload size: {len(json_str)} bytes")

    summary = engine.get_evidence_summary()
    json.dumps(summary)
    print("  engine.get_evidence_summary() -> json.dumps() OK")

    print()
    print("=" * _WIDTH)
    print("  DEMO COMPLETE")
    print("=" * _WIDTH)
    print()


if __name__ == "__main__":
    main()
