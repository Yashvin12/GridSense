"""
GridMind AI — Likelihood Tables

Domain-informed *synthetic* likelihoods used by the Bayesian engine.

╔══════════════════════════════════════════════════════════════════════╗
║  IMPORTANT — these values are hand-crafted prototype assumptions.  ║
║  They are NOT learned from real utility fault data.                 ║
║  In production, they should be calibrated against historical        ║
║  fault records or replaced by a learned likelihood model.           ║
╚══════════════════════════════════════════════════════════════════════╝

The tables are plain dicts so the engine remains free of external
dependencies.  A future ``LikelihoodProvider`` protocol / ABC can wrap
these for pluggable lookup strategies.
"""

from __future__ import annotations

from typing import Final


# ---------------------------------------------------------------------------
# Default fault causes
# ---------------------------------------------------------------------------

DEFAULT_CAUSES: Final[list[str]] = [
    "VEGETATION_CONTACT",
    "BROKEN_CONDUCTOR",
    "TRANSFORMER_OVERLOAD",
    "LIGHTNING",
]

# ---------------------------------------------------------------------------
# Section-fault likelihood tables
# ---------------------------------------------------------------------------
# Key   = evidence_type
# Value = dict mapping *relative position* to a base likelihood.
#
# Positions:
#   "target"      – the section the evidence points at (section_id matches)
#   "adjacent"    – sections immediately adjacent (±1 hop on the feeder)
#   "near"        – sections 2 hops away
#   "far"         – all remaining sections
#   "uniform"     – same likelihood for every section (ambient evidence)
#
# When the evidence has no section_id, "uniform" is used for all sections.

SECTION_LIKELIHOODS: Final[dict[str, dict[str, float]]] = {
    "CURRENT_ANOMALY": {
        "target": 0.90,
        "adjacent": 0.35,
        "near": 0.15,
        "far": 0.10,
        "uniform": 0.40,
    },
    "VOLTAGE_ANOMALY": {
        "target": 0.85,
        "adjacent": 0.35,
        "near": 0.15,
        "far": 0.10,
        "uniform": 0.40,
    },
    "METER_OUTAGE_CLUSTER": {
        "target": 0.95,
        "adjacent": 0.30,
        "near": 0.10,
        "far": 0.05,
        "uniform": 0.30,
    },
    "TRANSFORMER_TEMPERATURE": {
        "target": 0.85,
        "adjacent": 0.25,
        "near": 0.10,
        "far": 0.08,
        "uniform": 0.30,
    },
    "TRANSFORMER_OVERLOAD": {
        "target": 0.90,
        "adjacent": 0.25,
        "near": 0.10,
        "far": 0.08,
        "uniform": 0.30,
    },
    "CONSUMER_COMPLAINT": {
        "target": 0.80,
        "adjacent": 0.30,
        "near": 0.15,
        "far": 0.10,
        "uniform": 0.35,
    },

    # ----- Crew evidence (very high / very low) -----
    "CREW_CONFIRMED": {
        "target": 0.98,
        "adjacent": 0.15,
        "near": 0.08,
        "far": 0.05,
        "uniform": 0.20,   # should not normally be used without section_id
    },
    "CREW_NO_FAULT": {
        "target": 0.05,
        "adjacent": 0.60,
        "near": 0.70,
        "far": 0.80,
        "uniform": 0.50,   # should not normally be used without section_id
    },

    # ----- Ambient / weather (no section_id expected) -----
    "HIGH_WIND": {
        "target": 0.80,
        "adjacent": 0.65,
        "near": 0.55,
        "far": 0.40,
        "uniform": 0.55,
    },
    "HEAVY_RAIN": {
        "target": 0.70,
        "adjacent": 0.55,
        "near": 0.45,
        "far": 0.35,
        "uniform": 0.50,
    },
    "LIGHTNING": {
        "target": 0.85,
        "adjacent": 0.50,
        "near": 0.30,
        "far": 0.20,
        "uniform": 0.45,
    },

    # ----- Graph-resolved evidence -----
    # RELAY_TRIP uses "downstream" / "non_downstream" keys instead of
    # positional distance.  The engine queries get_downstream_sections()
    # to classify each candidate section.
    "RELAY_TRIP": {
        "downstream": 0.90,
        "non_downstream": 0.08,
        "uniform": 0.40,
    },
}


# ---------------------------------------------------------------------------
# Cause likelihood table
# ---------------------------------------------------------------------------
# Key   = evidence_type
# Value = dict mapping cause → base likelihood that the cause produced
#         that kind of evidence.

CAUSE_LIKELIHOODS: Final[dict[str, dict[str, float]]] = {
    "CURRENT_ANOMALY": {
        "VEGETATION_CONTACT": 0.70,
        "BROKEN_CONDUCTOR": 0.80,
        "TRANSFORMER_OVERLOAD": 0.50,
        "LIGHTNING": 0.60,
    },
    "VOLTAGE_ANOMALY": {
        "VEGETATION_CONTACT": 0.65,
        "BROKEN_CONDUCTOR": 0.75,
        "TRANSFORMER_OVERLOAD": 0.55,
        "LIGHTNING": 0.60,
    },
    "METER_OUTAGE_CLUSTER": {
        "VEGETATION_CONTACT": 0.75,
        "BROKEN_CONDUCTOR": 0.85,
        "TRANSFORMER_OVERLOAD": 0.40,
        "LIGHTNING": 0.70,
    },
    "TRANSFORMER_TEMPERATURE": {
        "VEGETATION_CONTACT": 0.15,
        "BROKEN_CONDUCTOR": 0.10,
        "TRANSFORMER_OVERLOAD": 0.95,
        "LIGHTNING": 0.15,
    },
    "TRANSFORMER_OVERLOAD": {
        "VEGETATION_CONTACT": 0.10,
        "BROKEN_CONDUCTOR": 0.20,
        "TRANSFORMER_OVERLOAD": 0.95,
        "LIGHTNING": 0.10,
    },
    "HIGH_WIND": {
        "VEGETATION_CONTACT": 0.85,
        "BROKEN_CONDUCTOR": 0.30,
        "TRANSFORMER_OVERLOAD": 0.10,
        "LIGHTNING": 0.50,
    },
    "HEAVY_RAIN": {
        "VEGETATION_CONTACT": 0.40,
        "BROKEN_CONDUCTOR": 0.20,
        "TRANSFORMER_OVERLOAD": 0.15,
        "LIGHTNING": 0.65,
    },
    "LIGHTNING": {
        "VEGETATION_CONTACT": 0.20,
        "BROKEN_CONDUCTOR": 0.30,
        "TRANSFORMER_OVERLOAD": 0.10,
        "LIGHTNING": 0.95,
    },
    "CONSUMER_COMPLAINT": {
        "VEGETATION_CONTACT": 0.50,
        "BROKEN_CONDUCTOR": 0.50,
        "TRANSFORMER_OVERLOAD": 0.50,
        "LIGHTNING": 0.50,
    },

    # Crew evidence does not meaningfully inform *cause*; use flat likelihoods.
    "CREW_CONFIRMED": {
        "VEGETATION_CONTACT": 0.50,
        "BROKEN_CONDUCTOR": 0.50,
        "TRANSFORMER_OVERLOAD": 0.50,
        "LIGHTNING": 0.50,
    },
    "CREW_NO_FAULT": {
        "VEGETATION_CONTACT": 0.50,
        "BROKEN_CONDUCTOR": 0.50,
        "TRANSFORMER_OVERLOAD": 0.50,
        "LIGHTNING": 0.50,
    },

    # Relay trips don't strongly discriminate among causes.
    "RELAY_TRIP": {
        "VEGETATION_CONTACT": 0.50,
        "BROKEN_CONDUCTOR": 0.50,
        "TRANSFORMER_OVERLOAD": 0.50,
        "LIGHTNING": 0.50,
    },
}


# ---------------------------------------------------------------------------
# Default fallback likelihood (unknown evidence types)
# ---------------------------------------------------------------------------

DEFAULT_SECTION_LIKELIHOOD: Final[float] = 0.50
DEFAULT_CAUSE_LIKELIHOOD: Final[float] = 0.50
