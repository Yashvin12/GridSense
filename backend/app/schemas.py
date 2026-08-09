from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Optional, Literal


class FaultData(BaseModel):
    section: str
    confidence: float


class CauseEntry(BaseModel):
    label: str
    probability: float


class SwitchingStep(BaseModel):
    action: str
    status: Literal["recommended", "pending", "completed", "blocked"]


class CrewStop(BaseModel):
    stop: str
    order: int
    status: Literal["pending", "inspecting", "fault_found", "no_fault"]
    lat: float
    lng: float
    probability: float
    reasoning: List[str]


class SectionProbability(BaseModel):
    section: str
    probability: float
    color: str


class TelemetryPoint(BaseModel):
    timestamp: str
    current: float
    voltage: float
    transformer_temp: float


class EvidenceEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    timestamp: str
    type: Literal["sensor", "meter", "crew", "weather", "complaint"]
    title: str
    location: str
    evidence_category: Literal["location", "cause"] = Field(alias="evidenceCategory")
    strength: Literal["very_strong", "strong", "moderate", "weak"]
    impact: str
    detail: str


class BeliefSnapshot(BaseModel):
    timestamp: str
    sections: Dict[str, float]
    trigger: Optional[str] = None


class FeederNode(BaseModel):
    id: str
    type: Literal["substation", "pole", "transformer", "switch", "village", "meter"]
    label: str
    lat: float
    lng: float
    section: str
    powered: bool


class FeederEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(alias="from")
    to: str
    section: str


class CrewConfirmRequest(BaseModel):
    stop: str
    found: bool
