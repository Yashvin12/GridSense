"""
GridMind AI — Graph-Integration Tests for the Bayesian Engine

Two categories:
1. **Unit tests (mocked)** — graph functions are replaced with lambda/mock
   callables so tests run without CSV files and are deterministic.
2. **Integration tests** — use the real ``app.feeder_graph`` module with
   the Mulshi feeder topology loaded from CSV.
"""

from __future__ import annotations

import math
import pytest
from unittest.mock import MagicMock

from app.services.bayesian.engine import BayesianInferenceEngine
from app.services.bayesian.models import Evidence, EngineState


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SECTIONS = ["A", "B", "C"]
TOL = 1e-9


def _sums_to_one(d: dict[str, float]) -> bool:
    return abs(sum(d.values()) - 1.0) < TOL


def _no_negatives(d: dict[str, float]) -> bool:
    return all(v >= 0 for v in d.values())


def _no_nan_inf(d: dict[str, float]) -> bool:
    return all(not (math.isnan(v) or math.isinf(v)) for v in d.values())


# ===================================================================
# UNIT TESTS — Mocked graph functions
# ===================================================================


class TestMeterEvidenceResolution:
    """Test 1 — Meter evidence resolves through get_supplying_section()."""

    def test_meter_outage_resolves_and_increases_section(self):
        mock_supplying = MagicMock(return_value="B")

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_supplying_section=mock_supplying,
        )

        engine.update(Evidence(
            evidence_type="METER_OUTAGE_CLUSTER",
            location="Kolvan",
            strength=0.9,
        ))

        # Graph function was called with the village name
        mock_supplying.assert_called_once_with("Kolvan")

        # Section B should now be the most likely
        beliefs = engine.get_beliefs()
        assert beliefs["B"] > beliefs["A"]
        assert beliefs["B"] > beliefs["C"]
        assert _sums_to_one(beliefs)

    def test_consumer_complaint_resolves_location(self):
        mock_supplying = MagicMock(return_value="C")

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_supplying_section=mock_supplying,
        )

        engine.update(Evidence(
            evidence_type="CONSUMER_COMPLAINT",
            location="Bhira",
            strength=0.8,
        ))

        mock_supplying.assert_called_once_with("Bhira")
        assert engine.get_most_likely_section()[0] == "C"
        assert _sums_to_one(engine.get_beliefs())

    def test_meter_with_section_id_skips_graph_resolution(self):
        """If section_id is already set, the graph should NOT be called."""
        mock_supplying = MagicMock(return_value="A")

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_supplying_section=mock_supplying,
        )

        engine.update(Evidence(
            evidence_type="METER_OUTAGE_CLUSTER",
            section_id="B",
            location="Kolvan",
            strength=0.9,
        ))

        # Graph should NOT be called when section_id is already set
        mock_supplying.assert_not_called()
        # Section B used directly
        assert engine.get_most_likely_section()[0] == "B"


class TestRelayTripEvidence:
    """Test 2 — Relay-trip evidence calls get_downstream_sections()."""

    def test_relay_trip_boosts_downstream(self):
        mock_downstream = MagicMock(return_value=["B", "C"])

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_downstream_sections=mock_downstream,
        )

        engine.update(Evidence(
            evidence_type="RELAY_TRIP",
            location="SW1",
            strength=0.9,
        ))

        mock_downstream.assert_called_once_with("SW1")

        beliefs = engine.get_beliefs()
        # Both B and C should be higher than A (non-downstream)
        assert beliefs["B"] > beliefs["A"]
        assert beliefs["C"] > beliefs["A"]
        # Probabilities still valid
        assert _sums_to_one(beliefs)
        assert _no_negatives(beliefs)

    def test_relay_trip_preserves_uncertainty(self):
        """RELAY_TRIP must NOT set non-downstream sections to zero."""
        mock_downstream = MagicMock(return_value=["B", "C"])

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_downstream_sections=mock_downstream,
        )

        engine.update(Evidence(
            evidence_type="RELAY_TRIP",
            location="SW1",
            strength=0.95,
        ))

        beliefs = engine.get_beliefs()
        # A is not downstream but should still have non-zero probability
        assert beliefs["A"] > 0
        assert _sums_to_one(beliefs)

    def test_relay_trip_without_graph_uses_uniform(self):
        """Without get_downstream_sections, RELAY_TRIP falls back to table."""
        engine = BayesianInferenceEngine(sections=SECTIONS)

        engine.update(Evidence(
            evidence_type="RELAY_TRIP",
            location="SW1",
            strength=0.9,
        ))

        # Should still produce valid probabilities (uses uniform fallback)
        beliefs = engine.get_beliefs()
        assert _sums_to_one(beliefs)
        assert _no_negatives(beliefs)


class TestAffectedVillages:
    """Test 3 — Most probable section resolves affected villages."""

    def test_affected_villages_in_state(self):
        mock_affected = MagicMock(return_value=["Kolvan", "Bhira"])

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_affected_villages=mock_affected,
        )

        # Push B to be most likely
        engine.update(Evidence(
            evidence_type="CURRENT_ANOMALY",
            section_id="B",
            strength=0.9,
        ))

        state = engine.get_state()
        assert state.most_probable_section == "B"
        mock_affected.assert_called_with("B")
        assert state.affected_villages == ["Kolvan", "Bhira"]

    def test_affected_villages_empty_without_graph(self):
        engine = BayesianInferenceEngine(sections=SECTIONS)
        state = engine.get_state()
        assert state.affected_villages == []

    def test_get_affected_villages_method(self):
        mock_affected = MagicMock(return_value=["Tamhini", "Kolvan", "Bhira"])

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_affected_villages=mock_affected,
        )

        villages = engine.get_affected_villages()
        assert isinstance(villages, list)
        mock_affected.assert_called_once()

    def test_affected_villages_in_to_dict(self):
        mock_affected = MagicMock(return_value=["Kolvan"])

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_affected_villages=mock_affected,
        )

        state_dict = engine.get_state().to_dict()
        assert "affected_villages" in state_dict
        assert state_dict["affected_villages"] == ["Kolvan"]


class TestUnknownLocationHandling:
    """Test 4 — Unknown village/location does not crash the engine."""

    def test_unknown_village_returns_none(self):
        mock_supplying = MagicMock(return_value=None)

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_supplying_section=mock_supplying,
        )

        # Should not crash
        engine.update(Evidence(
            evidence_type="METER_OUTAGE_CLUSTER",
            location="UnknownVillage",
            strength=0.8,
        ))

        mock_supplying.assert_called_once_with("UnknownVillage")
        # Beliefs should be nearly unchanged (uniform likelihoods applied)
        beliefs = engine.get_beliefs()
        assert _sums_to_one(beliefs)
        assert _no_negatives(beliefs)

    def test_graph_exception_does_not_crash(self):
        mock_supplying = MagicMock(side_effect=RuntimeError("Graph error"))

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_supplying_section=mock_supplying,
        )

        # Should not raise
        engine.update(Evidence(
            evidence_type="METER_OUTAGE_CLUSTER",
            location="Kolvan",
            strength=0.8,
        ))

        beliefs = engine.get_beliefs()
        assert _sums_to_one(beliefs)

    def test_relay_trip_graph_exception_does_not_crash(self):
        mock_downstream = MagicMock(side_effect=RuntimeError("Graph error"))

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_downstream_sections=mock_downstream,
        )

        engine.update(Evidence(
            evidence_type="RELAY_TRIP",
            location="SW1",
            strength=0.9,
        ))

        beliefs = engine.get_beliefs()
        assert _sums_to_one(beliefs)

    def test_affected_villages_graph_exception_returns_empty(self):
        mock_affected = MagicMock(side_effect=RuntimeError("Graph error"))

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_affected_villages=mock_affected,
        )

        villages = engine.get_affected_villages()
        assert villages == []


class TestNormalisationAfterGraphEvidence:
    """Test 6 — Probability normalization remains valid after graph-aware
    evidence."""

    def test_normalised_after_meter_resolution(self):
        mock_supplying = MagicMock(return_value="B")
        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_supplying_section=mock_supplying,
        )

        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", location="Kolvan", strength=0.9))
        assert _sums_to_one(engine.get_beliefs())

    def test_normalised_after_relay_trip(self):
        mock_downstream = MagicMock(return_value=["B", "C"])
        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_downstream_sections=mock_downstream,
        )

        engine.update(Evidence(evidence_type="RELAY_TRIP", location="SW1", strength=0.9))
        assert _sums_to_one(engine.get_beliefs())

    def test_normalised_after_mixed_evidence_sequence(self):
        mock_supplying = MagicMock(return_value="B")
        mock_downstream = MagicMock(return_value=["B", "C"])

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_supplying_section=mock_supplying,
            get_downstream_sections=mock_downstream,
        )

        engine.update(Evidence(evidence_type="RELAY_TRIP", location="SW1", strength=0.9))
        assert _sums_to_one(engine.get_beliefs())
        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", location="Kolvan", strength=0.8))
        assert _sums_to_one(engine.get_beliefs())
        engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.7))
        assert _sums_to_one(engine.get_beliefs())
        engine.update(Evidence(evidence_type="CREW_CONFIRMED", section_id="B", strength=0.95))
        assert _sums_to_one(engine.get_beliefs())
        assert _no_negatives(engine.get_beliefs())
        assert _no_nan_inf(engine.get_beliefs())


class TestFullGraphScenario:
    """End-to-end mocked scenario using all three graph functions."""

    def test_relay_then_meter_then_crew(self):
        mock_downstream = MagicMock(return_value=["B", "C"])
        mock_supplying = MagicMock(return_value="B")
        mock_affected = MagicMock(return_value=["Kolvan", "Bhira"])

        engine = BayesianInferenceEngine(
            sections=SECTIONS,
            get_supplying_section=mock_supplying,
            get_downstream_sections=mock_downstream,
            get_affected_villages=mock_affected,
        )

        # Step 1: Relay trip at SS1 → downstream B, C
        engine.update(Evidence(evidence_type="RELAY_TRIP", location="SS1", strength=0.9))
        beliefs_1 = engine.get_beliefs()
        assert beliefs_1["B"] > beliefs_1["A"]
        assert beliefs_1["C"] > beliefs_1["A"]

        # Step 2: Meter outage at Kolvan → resolves to B
        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", location="Kolvan", strength=0.9))
        beliefs_2 = engine.get_beliefs()
        # B should now be clearly ahead of C
        assert beliefs_2["B"] > beliefs_2["C"]

        # Step 3: Crew confirms at B
        engine.update(Evidence(evidence_type="CREW_CONFIRMED", section_id="B", strength=0.95))
        beliefs_3 = engine.get_beliefs()
        assert engine.get_most_likely_section()[0] == "B"

        # Check affected villages
        state = engine.get_state()
        assert state.affected_villages == ["Kolvan", "Bhira"]
        assert state.evidence_count == 3
        assert _sums_to_one(state.section_probabilities)


# ===================================================================
# INTEGRATION TESTS — Real feeder graph from CSV
# ===================================================================

class TestRealGraphIntegration:
    """Integration tests using the actual feeder graph module.

    These tests require the CSV data files and NetworkX to be available.
    """

    @pytest.fixture(autouse=True)
    def _import_graph(self):
        """Import the real graph module; skip if unavailable."""
        try:
            from app.feeder_graph import (
                get_supplying_section,
                get_downstream_sections,
                get_affected_villages,
            )
            self.get_supplying_section = get_supplying_section
            self.get_downstream_sections = get_downstream_sections
            self.get_affected_villages = get_affected_villages
        except ImportError:
            pytest.skip("feeder_graph module not available")

    def _make_engine(self) -> BayesianInferenceEngine:
        return BayesianInferenceEngine(
            sections=["A", "B", "C"],
            get_supplying_section=self.get_supplying_section,
            get_downstream_sections=self.get_downstream_sections,
            get_affected_villages=self.get_affected_villages,
        )

    def test_kolvan_resolves_to_section_b(self):
        engine = self._make_engine()

        engine.update(Evidence(
            evidence_type="METER_OUTAGE_CLUSTER",
            location="Kolvan",
            strength=0.9,
        ))

        assert engine.get_most_likely_section()[0] == "B"
        assert _sums_to_one(engine.get_beliefs())

    def test_bhira_resolves_to_section_c(self):
        engine = self._make_engine()

        engine.update(Evidence(
            evidence_type="CONSUMER_COMPLAINT",
            location="Bhira",
            strength=0.8,
        ))

        assert engine.get_most_likely_section()[0] == "C"

    def test_sw1_relay_trip_gives_downstream_b_c(self):
        engine = self._make_engine()

        engine.update(Evidence(
            evidence_type="RELAY_TRIP",
            location="SW1",
            strength=0.9,
        ))

        beliefs = engine.get_beliefs()
        # A is upstream of SW1, B and C are downstream
        assert beliefs["B"] > beliefs["A"]
        assert beliefs["C"] > beliefs["A"]
        assert _sums_to_one(beliefs)

    def test_affected_villages_for_section_b(self):
        engine = self._make_engine()

        engine.update(Evidence(
            evidence_type="CURRENT_ANOMALY",
            section_id="B",
            strength=0.9,
        ))

        state = engine.get_state()
        assert state.most_probable_section == "B"
        # Section B fault should affect Kolvan and Bhira (downstream)
        assert "Kolvan" in state.affected_villages
        assert "Bhira" in state.affected_villages

    def test_unknown_village_does_not_crash(self):
        engine = self._make_engine()

        engine.update(Evidence(
            evidence_type="METER_OUTAGE_CLUSTER",
            location="NonexistentVillage",
            strength=0.8,
        ))

        beliefs = engine.get_beliefs()
        assert _sums_to_one(beliefs)
        assert _no_negatives(beliefs)

    def test_full_mulshi_scenario(self):
        """Full Mulshi feeder scenario: relay → meter → wind → crew."""
        engine = self._make_engine()

        # 1. Relay trips at SW1 → downstream = B, C
        engine.update(Evidence(evidence_type="RELAY_TRIP", location="SW1", strength=0.9))
        assert engine.get_beliefs()["B"] > engine.get_beliefs()["A"]

        # 2. Kolvan meters report outage → resolves to B
        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", location="Kolvan", strength=0.9))
        assert engine.get_most_likely_section()[0] == "B"

        # 3. High wind (ambient)
        engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.7))
        assert _sums_to_one(engine.get_beliefs())

        # 4. Crew confirms at B
        engine.update(Evidence(evidence_type="CREW_CONFIRMED", section_id="B", strength=0.95))
        state = engine.get_state()

        assert state.most_probable_section == "B"
        assert state.confidence > 0.7
        assert "Kolvan" in state.affected_villages
        assert state.evidence_count == 4
        assert _sums_to_one(state.section_probabilities)
        assert _no_negatives(state.section_probabilities)
