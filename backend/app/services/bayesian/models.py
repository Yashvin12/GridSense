"""
GridMind AI — Bayesian Evidence & State Models

Framework-independent data models used by the Bayesian inference engine.
No dependency on FastAPI, databases, or frontend structures.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Evidence:
    """A single piece of evidence that updates the engine's belief state.

    Attributes:
        evidence_type: Canonical evidence identifier (e.g. ``"CURRENT_ANOMALY"``).
        strength:      How strong this evidence is, clamped to ``[0.0, 1.0]``.
                       ``0.0`` = essentially no informational value;
                       ``1.0`` = full likelihood is applied.
        section_id:    Optional — the specific feeder section this evidence
                       relates to.  ``None`` for ambient / non-localized
                       evidence (e.g. weather).
        location:      Optional — a physical location identifier (village name,
                       relay node ID) that the graph can resolve to a section.
                       Used for ``METER_OUTAGE_CLUSTER``, ``CONSUMER_COMPLAINT``,
                       and ``RELAY_TRIP`` evidence when ``section_id`` is not
                       directly known.
        timestamp:     When the evidence was produced.
        metadata:      Arbitrary extra fields for downstream consumers.
    """

    evidence_type: str
    strength: float = 1.0
    section_id: str | None = None
    location: str | None = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.evidence_type:
            raise ValueError("evidence_type must be a non-empty string")
        if not (0.0 <= self.strength <= 1.0):
            raise ValueError(
                f"strength must be in [0.0, 1.0], got {self.strength}"
            )


# ---------------------------------------------------------------------------
# Snapshot — one point in the belief history
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BeliefSnapshot:
    """An immutable record of the engine's state immediately after an update.

    Stored in the engine's history list so the frontend can later visualise
    how the belief distribution evolved over time.
    """

    timestamp: datetime
    evidence_type: str
    section_id: str | None
    section_probabilities: dict[str, float]
    cause_probabilities: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "evidence_type": self.evidence_type,
            "section_id": self.section_id,
            "section_probabilities": dict(self.section_probabilities),
            "cause_probabilities": dict(self.cause_probabilities),
        }


# ---------------------------------------------------------------------------
# Engine State — full public snapshot
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class EngineState:
    """The complete public state returned by ``engine.get_state()``.

    All probability dicts are *copies* — mutating them does not affect the
    engine.
    """

    most_probable_section: str
    confidence: float
    section_probabilities: dict[str, float]
    cause_probabilities: dict[str, float]
    affected_villages: list[str]
    updated_at: datetime
    evidence_count: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "most_probable_section": self.most_probable_section,
            "confidence": round(self.confidence, 6),
            "section_probabilities": {
                k: round(v, 6) for k, v in self.section_probabilities.items()
            },
            "cause_probabilities": {
                k: round(v, 6) for k, v in self.cause_probabilities.items()
            },
            "affected_villages": list(self.affected_villages),
            "updated_at": self.updated_at.isoformat(),
            "evidence_count": self.evidence_count,
        }
