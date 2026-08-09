"""
engine_instance.py
==================
GridSense -- Bayesian Engine Singleton

Creates ONE BayesianInferenceEngine instance for the entire FastAPI process
lifetime.  On first access the engine replays the Mulshi fault scenario CSVs
so the belief state starts at the correct posterior (Section B ~91%) rather
than the uninformed uniform prior.

Evidence replay order matches the scenario timeline in Innovate4Impact.txt:
  14:22:00  RELAY_TRIP              (substation SS1)
  14:22:18  METER_OUTAGE_CLUSTER    (Kolvan -- 14 meters)
  14:22:20  METER_OUTAGE_CLUSTER    (Bhira  --  8 meters)
  14:23:01  VOLTAGE_ANOMALY         (DTR-2 voltage collapse)
  14:23:45  HIGH_WIND               (47 km/h gust detected)
  14:24:12  CONSUMER_COMPLAINT      (Kolvan -- 3 reports)
  14:25:00  TRANSFORMER_TEMPERATURE (DTR-2 at 89 C)
  14:26:30  CURRENT_ANOMALY         (Section B conductors near zero)

Usage (in main.py):
    from app.engine_instance import get_engine
    engine = get_engine()
    state = engine.get_state()
"""

from __future__ import annotations

import csv
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .services.bayesian.engine import BayesianInferenceEngine
from .services.bayesian.models import Evidence
from .feeder_graph import (
    get_downstream_sections,
    get_supplying_section,
    get_affected_villages,
)

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).parent.parent / "data"

# Module-level singleton
_engine: Optional[BayesianInferenceEngine] = None


# ---------------------------------------------------------------------------
# Evidence replay helpers
# ---------------------------------------------------------------------------

def _load_meter_events() -> list[Evidence]:
    """Read meter_events.csv and emit METER_OUTAGE_CLUSTER for each last-gasp."""
    path = _DATA_DIR / "meter_events.csv"
    events: list[Evidence] = []
    if not path.exists():
        logger.warning("meter_events.csv not found -- skipping")
        return events

    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("event_type", "").strip() != "last_gasp":
                continue  # heartbeats don't update fault belief
            events.append(Evidence(
                evidence_type="METER_OUTAGE_CLUSTER",
                strength=0.9,
                location=row["village_name"].strip(),
                timestamp=datetime.fromisoformat(row["timestamp"]),
                metadata={"meter_count": int(row["meter_count"]), "node_id": row["node_id"]},
            ))
    return events


def _load_weather_events() -> list[Evidence]:
    """Read weather_events.csv and emit HIGH_WIND for gusts >= 35 km/h."""
    path = _DATA_DIR / "weather_events.csv"
    events: list[Evidence] = []
    if not path.exists():
        logger.warning("weather_events.csv not found -- skipping")
        return events

    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            wind = float(row["wind_speed_kmh"])
            if wind < 35.0:
                continue
            # Normalise strength: 35 km/h -> 0.6, 55 km/h -> 1.0
            strength = min(1.0, 0.6 + (wind - 35.0) / 50.0)
            events.append(Evidence(
                evidence_type="HIGH_WIND",
                strength=round(strength, 3),
                timestamp=datetime.fromisoformat(row["timestamp"]),
                metadata={"wind_speed_kmh": wind, "condition": row["condition"]},
            ))
    return events


def _load_consumer_complaints() -> list[Evidence]:
    """Read consumer_complaints.csv and emit CONSUMER_COMPLAINT evidence."""
    path = _DATA_DIR / "consumer_complaints.csv"
    events: list[Evidence] = []
    if not path.exists():
        logger.warning("consumer_complaints.csv not found -- skipping")
        return events

    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            events.append(Evidence(
                evidence_type="CONSUMER_COMPLAINT",
                strength=0.7,
                location=row["village"].strip(),
                timestamp=datetime.fromisoformat(row["timestamp"]),
                metadata={"complaint_id": row["complaint_id"], "source": row["source"]},
            ))
    return events


def _load_telemetry_events() -> list[Evidence]:
    """
    Read telemetry_stream.csv and emit exactly 4 evidence events:
      1. RELAY_TRIP             -- first fault-window timestamp (onset)
      2. VOLTAGE_ANOMALY        -- worst (lowest) voltage reading
      3. TRANSFORMER_TEMPERATURE -- peak temperature reading
      4. CURRENT_ANOMALY        -- lowest current reading (near-zero)

    One event per type prevents over-updating the engine to 100% certainty;
    keeps posteriors realistic (~91% on Section B, matching the brief).
    """
    path = _DATA_DIR / "telemetry_stream.csv"
    if not path.exists():
        logger.warning("telemetry_stream.csv not found -- skipping")
        return []

    fault_rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("is_fault_window", "false").strip().lower() == "true":
                fault_rows.append(row)

    if not fault_rows:
        return []

    events: list[Evidence] = []

    # 1. RELAY_TRIP -- first fault-window reading
    first = fault_rows[0]
    events.append(Evidence(
        evidence_type="RELAY_TRIP",
        strength=1.0,
        location="SS1",
        timestamp=datetime.fromisoformat(first["timestamp"]),
        metadata={"node_id": "SS1"},
    ))

    # 2. VOLTAGE_ANOMALY -- worst (lowest) voltage in fault window
    worst_v = min(fault_rows, key=lambda r: float(r["voltage_V"]))
    voltage = float(worst_v["voltage_V"])
    events.append(Evidence(
        evidence_type="VOLTAGE_ANOMALY",
        strength=round(min(1.0, (230 - voltage) / 80), 3),
        section_id="B",
        timestamp=datetime.fromisoformat(worst_v["timestamp"]),
        metadata={"voltage_V": voltage, "node_id": "T2"},
    ))

    # 3. TRANSFORMER_TEMPERATURE -- peak temperature in fault window
    peak_t = max(fault_rows, key=lambda r: float(r["transformer_temp_C"]))
    temp = float(peak_t["transformer_temp_C"])
    events.append(Evidence(
        evidence_type="TRANSFORMER_TEMPERATURE",
        strength=round(min(1.0, (temp - 60) / 40), 3),
        section_id="B",
        timestamp=datetime.fromisoformat(peak_t["timestamp"]),
        metadata={"temp_C": temp, "node_id": "T2"},
    ))

    # 4. CURRENT_ANOMALY -- lowest current (near-zero confirms open circuit on B)
    lowest_c = min(fault_rows, key=lambda r: float(r["current_A"]))
    current = float(lowest_c["current_A"])
    events.append(Evidence(
        evidence_type="CURRENT_ANOMALY",
        strength=round(min(1.0, 1.0 - current / 5.0), 3),
        section_id="B",
        timestamp=datetime.fromisoformat(lowest_c["timestamp"]),
        metadata={"current_A": current},
    ))

    return events


def _replay_scenario(engine: BayesianInferenceEngine) -> None:
    """
    Gather all CSV-derived evidence, sort chronologically, feed into engine.
    This puts the engine at the correct fault-state posterior on startup.
    """
    all_events: list[Evidence] = (
        _load_telemetry_events()
        + _load_meter_events()
        + _load_weather_events()
        + _load_consumer_complaints()
    )

    # Sort by timestamp so belief evolution matches the real scenario timeline
    all_events.sort(key=lambda e: e.timestamp)

    logger.info("Replaying %d evidence events into Bayesian engine...", len(all_events))
    for ev in all_events:
        try:
            engine.update(ev)
        except Exception as exc:
            logger.warning("Skipping evidence %s -- %s", ev.evidence_type, exc)

    state = engine.get_state()
    logger.info(
        "Engine ready -- top section: %s (%.1f%%), evidence count: %d",
        state.most_probable_section,
        state.confidence * 100,
        state.evidence_count,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_engine() -> BayesianInferenceEngine:
    """
    Return the module-level singleton BayesianInferenceEngine.

    On first call:
      1. Instantiates the engine with the Mulshi feeder graph functions injected.
      2. Replays all CSV evidence to reach the correct fault posterior.
    Subsequent calls return the same instance (already warm).
    """
    global _engine
    if _engine is None:
        logger.info("Initialising Bayesian engine with feeder graph injection...")
        _engine = BayesianInferenceEngine(
            sections=["A", "B", "C"],
            get_supplying_section=get_supplying_section,
            get_downstream_sections=get_downstream_sections,
            get_affected_villages=get_affected_villages,
        )
        _replay_scenario(_engine)
    return _engine


def reset_engine() -> BayesianInferenceEngine:
    """
    Reset the engine to its uniform prior and replay the CSV scenario again.
    Useful for demo resets via the /api/engine/reset endpoint.
    """
    global _engine
    _engine = None
    return get_engine()
