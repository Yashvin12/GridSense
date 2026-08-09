"""
Ported directly from frontend/src/data/mockData.ts so the backend serves
the exact same Mulshi/Kolvan fault scenario the frontend was designed around.
"""
import random
from datetime import datetime, timedelta

from schemas import (
    FaultData, CauseEntry, SwitchingStep, CrewStop, SectionProbability,
    TelemetryPoint, EvidenceEvent, BeliefSnapshot, FeederNode, FeederEdge,
)


def get_section_color(probability: float) -> str:
    if probability > 0.7:
        return "#f85149"  # red
    if probability > 0.3:
        return "#d29922"  # amber
    if probability > 0.1:
        return "#d29922"  # amber
    return "#3fb950"      # green


FEEDER_NODES = [
    FeederNode(id="SS1", type="substation", label="Mulshi 33kV Substation", lat=18.5120, lng=73.4680, section="source", powered=True),

    FeederNode(id="P40", type="pole", label="Pole 40", lat=18.5095, lng=73.4720, section="A", powered=True),
    FeederNode(id="P41", type="pole", label="Pole 41", lat=18.5070, lng=73.4755, section="A", powered=True),
    FeederNode(id="T1", type="transformer", label="DTR-1 (25kVA)", lat=18.5068, lng=73.4760, section="A", powered=True),
    FeederNode(id="P42", type="pole", label="Pole 42", lat=18.5048, lng=73.4790, section="A", powered=True),
    FeederNode(id="SW1", type="switch", label="Switch S1", lat=18.5045, lng=73.4795, section="A", powered=True),

    FeederNode(id="P43", type="pole", label="Pole 43", lat=18.5020, lng=73.4830, section="B", powered=False),
    FeederNode(id="P44", type="pole", label="Pole 44", lat=18.4995, lng=73.4865, section="B", powered=False),
    FeederNode(id="T2", type="transformer", label="DTR-2 (63kVA)", lat=18.4993, lng=73.4870, section="B", powered=False),
    FeederNode(id="P45", type="pole", label="Pole 45", lat=18.4970, lng=73.4900, section="B", powered=False),
    FeederNode(id="SW2", type="switch", label="Switch S2", lat=18.4968, lng=73.4905, section="B", powered=False),
    FeederNode(id="P46", type="pole", label="Pole 46", lat=18.4945, lng=73.4935, section="B", powered=False),

    FeederNode(id="P47", type="pole", label="Pole 47", lat=18.4920, lng=73.4965, section="C", powered=False),
    FeederNode(id="T3", type="transformer", label="DTR-3 (100kVA)", lat=18.4918, lng=73.4970, section="C", powered=False),
    FeederNode(id="P48", type="pole", label="Pole 48", lat=18.4895, lng=73.5000, section="C", powered=False),
    FeederNode(id="P49", type="pole", label="Pole 49", lat=18.4870, lng=73.5030, section="C", powered=False),
    FeederNode(id="SW3", type="switch", label="Tie Switch T4", lat=18.4868, lng=73.5035, section="C", powered=False),

    FeederNode(id="V_A", type="village", label="Tamhini", lat=18.5060, lng=73.4780, section="A", powered=True),
    FeederNode(id="V_B", type="village", label="Kolvan", lat=18.4980, lng=73.4890, section="B", powered=False),
    FeederNode(id="V_C", type="village", label="Bhira", lat=18.4900, lng=73.5010, section="C", powered=False),
]

FEEDER_EDGES = [
    FeederEdge(**{"from": "SS1", "to": "P40", "section": "A"}),
    FeederEdge(**{"from": "P40", "to": "P41", "section": "A"}),
    FeederEdge(**{"from": "P41", "to": "T1", "section": "A"}),
    FeederEdge(**{"from": "P41", "to": "P42", "section": "A"}),
    FeederEdge(**{"from": "P42", "to": "SW1", "section": "A"}),
    FeederEdge(**{"from": "T1", "to": "V_A", "section": "A"}),
    FeederEdge(**{"from": "SW1", "to": "P43", "section": "B"}),
    FeederEdge(**{"from": "P43", "to": "P44", "section": "B"}),
    FeederEdge(**{"from": "P44", "to": "T2", "section": "B"}),
    FeederEdge(**{"from": "P44", "to": "P45", "section": "B"}),
    FeederEdge(**{"from": "P45", "to": "SW2", "section": "B"}),
    FeederEdge(**{"from": "SW2", "to": "P46", "section": "B"}),
    FeederEdge(**{"from": "T2", "to": "V_B", "section": "B"}),
    FeederEdge(**{"from": "P46", "to": "P47", "section": "C"}),
    FeederEdge(**{"from": "P47", "to": "T3", "section": "C"}),
    FeederEdge(**{"from": "P47", "to": "P48", "section": "C"}),
    FeederEdge(**{"from": "P48", "to": "P49", "section": "C"}),
    FeederEdge(**{"from": "P49", "to": "SW3", "section": "C"}),
    FeederEdge(**{"from": "T3", "to": "V_C", "section": "C"}),
]

FAULT_DATA = FaultData(section="Pole 42\u201346", confidence=0.91)

CAUSES = [
    CauseEntry(label="Vegetation Contact", probability=0.74),
    CauseEntry(label="Transformer Overload", probability=0.15),
    CauseEntry(label="Broken Conductor", probability=0.08),
    CauseEntry(label="Illegal Tapping", probability=0.03),
]

AFFECTED_VILLAGES = ["Kolvan", "Bhira"]

SWITCHING_PLAN = [
    SwitchingStep(action="Open Switch S2", status="recommended"),
    SwitchingStep(action="Close Tie Switch T4", status="recommended"),
    SwitchingStep(action="Restore Bhira", status="pending"),
]

CREW_PLAN = [
    CrewStop(stop="Pole 44", order=1, status="pending", lat=18.4995, lng=73.4865, probability=0.91,
              reasoning=["Highest posterior probability", "Adjacent outage evidence",
                         "Current collapse nearby", "Wind event near section"]),
    CrewStop(stop="Pole 45", order=2, status="pending", lat=18.4970, lng=73.4900, probability=0.67,
              reasoning=["Adjacent to primary suspect", "Check if damage extends downstream"]),
    CrewStop(stop="Pole 43", order=3, status="pending", lat=18.5020, lng=73.4830, probability=0.34,
              reasoning=["Lower probability but within fault zone", "Verify upstream boundary"]),
]

SECTIONS = [
    SectionProbability(section="A", probability=0.03, color=get_section_color(0.03)),
    SectionProbability(section="B", probability=0.91, color=get_section_color(0.91)),
    SectionProbability(section="C", probability=0.06, color=get_section_color(0.06)),
]

ETA_MINUTES = 43

EVIDENCE_LOG = [
    EvidenceEvent(id="e1", timestamp="14:22:15", type="sensor", title="Overcurrent Relay Tripped",
                  location="Mulshi Substation", evidenceCategory="location", strength="very_strong",
                  impact="Section B +18%", detail="Relay trip indicates fault downstream of substation"),
    EvidenceEvent(id="e2", timestamp="14:22:18", type="meter", title="Last-Gasp Signals Received",
                  location="Kolvan (14 meters)", evidenceCategory="location", strength="strong",
                  impact="Section B +7%", detail="Supports downstream fault affecting Kolvan supply"),
    EvidenceEvent(id="e3", timestamp="14:22:20", type="meter", title="Last-Gasp Signals Received",
                  location="Bhira (8 meters)", evidenceCategory="location", strength="moderate",
                  impact="Section C +3%", detail="Downstream propagation from fault in B or C"),
    EvidenceEvent(id="e4", timestamp="14:23:01", type="sensor", title="Voltage Collapse Detected",
                  location="DTR-2 (63kVA)", evidenceCategory="location", strength="strong",
                  impact="Section B +9%", detail="Matches Section B topology \u2014 fault likely upstream of DTR-2"),
    EvidenceEvent(id="e5", timestamp="14:23:45", type="weather", title="High Wind Detected",
                  location="Pole 43\u201346", evidenceCategory="cause", strength="strong",
                  impact="Vegetation contact +12%", detail="47 km/h gusts raise vegetation-contact probability"),
    EvidenceEvent(id="e6", timestamp="14:24:12", type="complaint", title="Consumer Complaints",
                  location="Kolvan (3 reports)", evidenceCategory="location", strength="moderate",
                  impact="Section B +4%", detail="Outage complaints confirm supply loss in Kolvan area"),
    EvidenceEvent(id="e7", timestamp="14:25:00", type="sensor", title="Transformer Temperature Spike",
                  location="DTR-2 reading 89\u00b0C", evidenceCategory="cause", strength="moderate",
                  impact="Transformer overload +5%", detail="Temperature above normal operating range"),
    EvidenceEvent(id="e8", timestamp="14:26:30", type="sensor", title="Current Near Zero",
                  location="Section B feeders", evidenceCategory="location", strength="strong",
                  impact="Section B +6%", detail="Confirms loss of supply on Section B conductors"),
]

BELIEF_TRAJECTORY = [
    {"A": 0.33, "B": 0.34, "C": 0.33, "trigger": "Uniform prior"},
    {"A": 0.28, "B": 0.42, "C": 0.30, "trigger": "Relay trip +18%"},
    {"A": 0.20, "B": 0.55, "C": 0.25, "trigger": "Last-gasp +7%"},
    {"A": 0.15, "B": 0.65, "C": 0.20, "trigger": "Voltage collapse +9%"},
    {"A": 0.10, "B": 0.75, "C": 0.15, "trigger": "Wind alert +12%"},
    {"A": 0.07, "B": 0.82, "C": 0.11, "trigger": "Complaints +4%"},
    {"A": 0.05, "B": 0.87, "C": 0.08, "trigger": "Temp spike +5%"},
    {"A": 0.03, "B": 0.91, "C": 0.06, "trigger": "Current zero +6%"},
]


def _now_iso(offset_minutes=0):
    return (datetime.utcnow() - timedelta(minutes=offset_minutes)).isoformat() + "Z"


def generate_telemetry():
    points = []
    now = datetime.utcnow()
    for i in range(59, -1, -1):
        ts = now - timedelta(seconds=i * 30)
        is_fault_zone = i < 20
        points.append(TelemetryPoint(
            timestamp=ts.isoformat() + "Z",
            current=round(2.1 + random.random() * 0.8, 2) if is_fault_zone else round(45 + random.random() * 12, 2),
            voltage=round(180 + random.random() * 30, 2) if is_fault_zone else round(230 + random.random() * 5, 2),
            transformer_temp=round(78 + random.random() * 15, 2) if is_fault_zone else round(52 + random.random() * 8, 2),
        ))
    return points


def generate_belief_history():
    snapshots = []
    now = datetime.utcnow()
    n = len(BELIEF_TRAJECTORY)
    for i, t in enumerate(BELIEF_TRAJECTORY):
        ts = now - timedelta(minutes=(n - 1 - i))
        snapshots.append(BeliefSnapshot(
            timestamp=ts.isoformat() + "Z",
            sections={"A": t["A"], "B": t["B"], "C": t["C"]},
            trigger=t["trigger"],
        ))
    return snapshots


class Store:
    """Holds one consistent dataset in memory for the app's lifetime."""

    def __init__(self):
        self.fault = FAULT_DATA
        self.causes = CAUSES
        self.sections = [s.model_copy() for s in SECTIONS]
        self.telemetry = generate_telemetry()
        self.crew_plan = [c.model_copy() for c in CREW_PLAN]
        self.affected_villages = AFFECTED_VILLAGES
        self.switching_plan = SWITCHING_PLAN
        self.eta = ETA_MINUTES
        self.evidence = EVIDENCE_LOG
        self.belief_history = generate_belief_history()
        self.feeder_nodes = FEEDER_NODES
        self.feeder_edges = FEEDER_EDGES

    def confirm_stop(self, stop_name: str, found: bool):
        for c in self.crew_plan:
            if c.stop == stop_name:
                c.status = "fault_found" if found else "no_fault"
        return self.crew_plan


store = Store()
