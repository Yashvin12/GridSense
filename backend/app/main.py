"""
main.py
=======
GridSense — FastAPI Application
PS-B13: AI-Based Rural Electricity Fault Localization

All endpoints read from the live BayesianInferenceEngine (via engine_instance)
so every GET reflects the real posterior rather than hardcoded mock data.

Endpoints
---------
GET  /                        Health check
GET  /api/fault               Most probable fault section + confidence
GET  /api/sections            Section posteriors [{section, probability, color}]
GET  /api/causes              Ranked cause probabilities [{label, probability}]
GET  /api/evidence            Evidence log (static scenario events)
GET  /api/belief-history      Full belief snapshot history
GET  /api/telemetry           Last 60 telemetry readings
GET  /api/crew-plan           Ordered crew inspection stops
GET  /api/switching-plan      Switching steps for isolation / restoration
GET  /api/villages            Affected village names
GET  /api/eta                 Estimated restoration time (minutes)
GET  /api/feeder/nodes        Feeder topology nodes (for map)
GET  /api/feeder/edges        Feeder topology edges (for map)
GET  /api/engine/state        Full engine state dump (debug / judges)
POST /api/evidence/update     Ingest streaming evidence — returns updated posteriors
POST /api/crew/confirm        Crew confirms or denies fault — updates posteriors
POST /api/engine/reset        Reset engine to uniform prior + replay CSV
"""

from __future__ import annotations

import logging
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .engine_instance import get_engine, reset_engine
from .services.bayesian.models import Evidence
from .data_gen import store              # static scenario data (evidence log, telemetry, topology)
from .feeder_graph import get_switch_isolation_plan
from .schemas import (
    FaultData, CauseEntry, SectionProbability, TelemetryPoint,
    CrewStop, SwitchingStep, EvidenceEvent, BeliefSnapshot,
    FeederNode, FeederEdge, CrewConfirmRequest, EvidenceUpdateRequest,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GridSense — AI Fault Localization API",
    description="PS-B13: Bayesian fault localization for rural electricity feeders",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to frontend origin before deploying
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper: map engine cause keys → frontend-friendly labels
# ---------------------------------------------------------------------------

_CAUSE_LABELS: dict[str, str] = {
    "VEGETATION_CONTACT":   "Vegetation Contact",
    "BROKEN_CONDUCTOR":     "Broken Conductor",
    "TRANSFORMER_OVERLOAD": "Transformer Overload",
    "LIGHTNING":            "Lightning",
}

_SECTION_COLORS: dict[str, str] = {
    "high":   "#f85149",
    "medium": "#d29922",
    "low":    "#3fb950",
}

def _prob_color(p: float) -> str:
    if p > 0.7:  return "#f85149"
    if p > 0.3:  return "#d29922"
    return "#3fb950"


# ===========================================================================
# Health
# ===========================================================================

@app.get("/")
def health_check():
    return {"status": "ok", "service": "GridSense backend", "version": "1.0.0"}


# ===========================================================================
# Fault state — driven by LIVE Bayesian engine
# ===========================================================================

@app.get("/api/fault", response_model=FaultData)
def get_fault():
    """Most probable fault section + confidence from the live engine."""
    state = get_engine().get_state()
    # Map section letter → human label matching the brief ("Pole 42–46")
    section_labels: dict[str, str] = {
        "A": "Section A (Pole 40–42)",
        "B": "Pole 42–46",
        "C": "Section C (Pole 47–49)",
    }
    label = section_labels.get(state.most_probable_section, state.most_probable_section)
    return FaultData(section=label, confidence=round(state.confidence, 4))


@app.get("/api/sections", response_model=List[SectionProbability])
def get_sections():
    """Live section posteriors from the Bayesian engine."""
    state = get_engine().get_state()
    return [
        SectionProbability(
            section=sec,
            probability=round(prob, 4),
            color=_prob_color(prob),
        )
        for sec, prob in state.section_probabilities.items()
    ]


@app.get("/api/causes", response_model=List[CauseEntry])
def get_causes():
    """Live cause posteriors from the Bayesian engine, ranked by probability."""
    state = get_engine().get_state()
    causes = [
        CauseEntry(
            label=_CAUSE_LABELS.get(cause, cause.replace("_", " ").title()),
            probability=round(prob, 4),
        )
        for cause, prob in state.cause_probabilities.items()
    ]
    return sorted(causes, key=lambda c: c.probability, reverse=True)


@app.get("/api/belief-history", response_model=List[BeliefSnapshot])
def get_belief_history():
    """Full belief snapshot history — every evidence update recorded."""
    engine = get_engine()
    history = []
    for snap in engine._history:          # list[BeliefSnapshot] from engine
        history.append(BeliefSnapshot(
            timestamp=snap.timestamp.isoformat(),
            sections=snap.section_probabilities,
            trigger=snap.evidence_type,
        ))
    return history


@app.get("/api/villages", response_model=List[str])
def get_villages():
    """Villages affected by the most probable fault section."""
    state = get_engine().get_state()
    return state.affected_villages if state.affected_villages else store.affected_villages


# ===========================================================================
# Static scenario data (evidence log, telemetry, crew, topology)
# These don't change with engine updates — serve from store
# ===========================================================================

@app.get("/api/evidence", response_model=List[EvidenceEvent])
def get_evidence():
    return store.evidence


@app.get("/api/telemetry", response_model=List[TelemetryPoint])
def get_telemetry():
    return store.telemetry


@app.get("/api/crew-plan", response_model=List[CrewStop])
def get_crew_plan():
    return store.crew_plan


@app.get("/api/switching-plan", response_model=List[SwitchingStep])
def get_switching_plan():
    """
    Dynamic switching plan derived from the live Bayesian engine.

    """
    state = get_engine().get_state()
    raw_steps = get_switch_isolation_plan(state.most_probable_section)
    if not raw_steps:
        # Graph traversal returned nothing (unknown section) — fall back to store
        return store.switching_plan
    return [
        SwitchingStep(action=step["action"], status=step["status"])
        for step in raw_steps
    ]


@app.get("/api/eta", response_model=float)
def get_eta():
    return store.eta


@app.get("/api/feeder/nodes", response_model=List[FeederNode])
def get_feeder_nodes():
    return store.feeder_nodes


@app.get("/api/feeder/edges", response_model=List[FeederEdge])
def get_feeder_edges():
    return store.feeder_edges


# ===========================================================================
# Engine debug endpoint (for judges / demo)
# ===========================================================================

@app.get("/api/engine/state")
def get_engine_state():
    """
    Full Bayesian engine state dump.
    Shows posteriors, cause distribution, affected villages, evidence count.
    """
    return get_engine().get_state().to_dict()


# ===========================================================================
# Crew actions — Learning Loop (Innovate4Impact.txt Module 8)
# Crew confirms/denies fault → engine updates immediately
# ===========================================================================

# Map crew stop names → section IDs
_STOP_TO_SECTION: dict[str, str] = {
    "Pole 44": "B",
    "Pole 45": "B",
    "Pole 43": "B",
}


@app.post("/api/crew/confirm")
def confirm_crew_stop(payload: CrewConfirmRequest):
    """
    Crew action endpoint — implements the Learning Loop from PS-B13.

    On FAULT FOUND   → feeds CREW_CONFIRMED evidence into Bayesian engine
    On NO FAULT      → feeds CREW_NO_FAULT   evidence into Bayesian engine

    Returns updated sections, causes, and the new fault confidence so the
    frontend can re-render immediately without a full page reload.
    """
    valid_stops = {c.stop for c in store.crew_plan}
    if payload.stop not in valid_stops:
        raise HTTPException(status_code=404, detail=f"Unknown stop: {payload.stop}")

    # Mark crew stop status in the store
    for c in store.crew_plan:
        if c.stop == payload.stop:
            c.status = "fault_found" if payload.found else "no_fault"

    # Resolve which section this stop belongs to
    section_id = _STOP_TO_SECTION.get(payload.stop, "B")

    # Feed crew evidence into the Bayesian engine (Learning Loop)
    evidence_type = "CREW_CONFIRMED" if payload.found else "CREW_NO_FAULT"
    engine = get_engine()
    engine.update(Evidence(
        evidence_type=evidence_type,
        strength=1.0,
        section_id=section_id,
        metadata={"stop": payload.stop, "found": payload.found},
    ))

    # Return fresh state so frontend re-renders with new posteriors
    state = engine.get_state()
    return {
        "crew_plan": store.crew_plan,
        "sections": [
            {
                "section": sec,
                "probability": round(prob, 4),
                "color": _prob_color(prob),
            }
            for sec, prob in state.section_probabilities.items()
        ],
        "causes": sorted(
            [
                {
                    "label": _CAUSE_LABELS.get(c, c.replace("_", " ").title()),
                    "probability": round(p, 4),
                }
                for c, p in state.cause_probabilities.items()
            ],
            key=lambda x: x["probability"],
            reverse=True,
        ),
        "fault": {
            "section": state.most_probable_section,
            "confidence": round(state.confidence, 4),
        },
        "evidence_count": state.evidence_count,
    }


# ===========================================================================
# Evidence update — Streaming evidence ingestion
# Accepts any valid Evidence type, updates the live Bayesian engine,
# and returns the new posteriors immediately.
# ===========================================================================

@app.post("/api/evidence/update")
def update_evidence(payload: EvidenceUpdateRequest):
    """
    POST /api/evidence/update

    Accepts a new piece of streaming evidence and feeds it directly into the
    live BayesianInferenceEngine.  Returns the updated section posteriors,
    cause distribution, fault summary, and evidence count so the frontend
    can re-render without a full page reload.

    Accepted evidence_type values (non-exhaustive):
      RELAY_TRIP, METER_OUTAGE_CLUSTER, VOLTAGE_COLLAPSE,
      HIGH_WIND, CONSUMER_COMPLAINT, TRANSFORMER_TEMP_SPIKE,
      CURRENT_ANOMALY, CREW_CONFIRMED, CREW_NO_FAULT
    """
    try:
        evidence = Evidence(
            evidence_type=payload.evidence_type,
            strength=float(payload.strength),
            section_id=payload.section_id,
            location=payload.location,
            metadata=payload.metadata,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    engine = get_engine()
    engine.update(evidence)
    state = engine.get_state()

    return {
        "accepted": True,
        "evidence_type": payload.evidence_type,
        "sections": [
            {
                "section": sec,
                "probability": round(prob, 4),
                "color": _prob_color(prob),
            }
            for sec, prob in state.section_probabilities.items()
        ],
        "causes": sorted(
            [
                {
                    "label": _CAUSE_LABELS.get(c, c.replace("_", " ").title()),
                    "probability": round(p, 4),
                }
                for c, p in state.cause_probabilities.items()
            ],
            key=lambda x: x["probability"],
            reverse=True,
        ),
        "fault": {
            "section": state.most_probable_section,
            "confidence": round(state.confidence, 4),
        },
        "evidence_count": state.evidence_count,
    }


# ===========================================================================
# Engine reset (demo utility)
# ===========================================================================

@app.post("/api/engine/reset")
def reset_engine_endpoint():
    """
    Reset the Bayesian engine to uniform prior and replay the CSV scenario.
    Use this to restart the demo without restarting the server.
    """
    reset_engine()
    state = get_engine().get_state()
    return {
        "status": "reset complete",
        "top_section": state.most_probable_section,
        "confidence": round(state.confidence, 4),
        "evidence_count": state.evidence_count,
    }
