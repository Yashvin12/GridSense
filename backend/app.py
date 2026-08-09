from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from schemas import (
    FaultData, CauseEntry, SectionProbability, TelemetryPoint,
    CrewStop, SwitchingStep, EvidenceEvent, BeliefSnapshot,
    FeederNode, FeederEdge, CrewConfirmRequest,
)
from data_gen import store

app = FastAPI(title="GridSense Backend")

# Allow the Vite/React frontend (usually localhost:5173) to call this API during dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend's actual origin before deploying
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "GridSense backend"}


@app.get("/api/fault", response_model=FaultData)
def get_fault():
    return store.fault


@app.get("/api/causes", response_model=List[CauseEntry])
def get_causes():
    return store.causes


@app.get("/api/sections", response_model=List[SectionProbability])
def get_sections():
    return store.sections


@app.get("/api/telemetry", response_model=List[TelemetryPoint])
def get_telemetry():
    return store.telemetry


@app.get("/api/crew-plan", response_model=List[CrewStop])
def get_crew_plan():
    return store.crew_plan


@app.get("/api/villages", response_model=List[str])
def get_villages():
    return store.affected_villages


@app.get("/api/switching-plan", response_model=List[SwitchingStep])
def get_switching_plan():
    return store.switching_plan


@app.get("/api/eta", response_model=float)
def get_eta():
    return store.eta


@app.get("/api/evidence", response_model=List[EvidenceEvent])
def get_evidence():
    return store.evidence


@app.get("/api/belief-history", response_model=List[BeliefSnapshot])
def get_belief_history():
    return store.belief_history


@app.get("/api/feeder/nodes", response_model=List[FeederNode])
def get_feeder_nodes():
    return store.feeder_nodes


@app.get("/api/feeder/edges", response_model=List[FeederEdge])
def get_feeder_edges():
    return store.feeder_edges


@app.post("/api/crew/confirm", response_model=List[CrewStop])
def confirm_crew_stop(payload: CrewConfirmRequest):
    valid_stops = {c.stop for c in store.crew_plan}
    if payload.stop not in valid_stops:
        raise HTTPException(status_code=404, detail=f"Unknown stop: {payload.stop}")
    return store.confirm_stop(payload.stop, payload.found)
