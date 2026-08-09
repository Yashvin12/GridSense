"""
GridMind AI — Bayesian Inference Engine Test Suite

Comprehensive tests covering initialisation, Bayesian mathematics,
sequential updates, evidence strength, crew feedback, cause inference,
history, reset, and error handling.
"""

from __future__ import annotations

import math
import pytest
from datetime import datetime, timezone

from app.services.bayesian.engine import BayesianInferenceEngine
from app.services.bayesian.models import Evidence, EngineState


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SECTIONS = ["S1", "S2", "S3", "S4", "S5"]
TOL = 1e-9  # floating-point tolerance


def _sums_to_one(d: dict[str, float]) -> bool:
    return abs(sum(d.values()) - 1.0) < TOL


def _no_negatives(d: dict[str, float]) -> bool:
    return all(v >= 0 for v in d.values())


def _no_nan_inf(d: dict[str, float]) -> bool:
    return all(not (math.isnan(v) or math.isinf(v)) for v in d.values())


def _make_engine(**kwargs) -> BayesianInferenceEngine:
    return BayesianInferenceEngine(sections=SECTIONS, **kwargs)


# ===================================================================
# Test 1 — Uniform initialisation
# ===================================================================

class TestUniformInitialisation:
    def test_five_sections_uniform(self):
        engine = _make_engine()
        beliefs = engine.get_beliefs()
        assert len(beliefs) == 5
        for v in beliefs.values():
            assert abs(v - 0.2) < TOL
        assert _sums_to_one(beliefs)

    def test_three_sections_uniform(self):
        engine = BayesianInferenceEngine(sections=["A", "B", "C"])
        beliefs = engine.get_beliefs()
        for v in beliefs.values():
            assert abs(v - 1 / 3) < TOL
        assert _sums_to_one(beliefs)


# ===================================================================
# Test 2 — Custom prior
# ===================================================================

class TestCustomPrior:
    def test_accepts_valid_prior(self):
        prior = {"S1": 0.5, "S2": 0.2, "S3": 0.1, "S4": 0.1, "S5": 0.1}
        engine = _make_engine(prior=prior)
        assert engine.get_beliefs() == prior

    def test_rejects_missing_section(self):
        with pytest.raises(ValueError, match="missing keys"):
            _make_engine(prior={"S1": 0.5, "S2": 0.5})

    def test_rejects_negative_probability(self):
        with pytest.raises(ValueError, match="negative"):
            _make_engine(prior={"S1": -0.1, "S2": 0.3, "S3": 0.3, "S4": 0.3, "S5": 0.2})

    def test_rejects_non_normalised(self):
        with pytest.raises(ValueError, match="sum to"):
            _make_engine(prior={"S1": 0.5, "S2": 0.5, "S3": 0.5, "S4": 0.5, "S5": 0.5})


# ===================================================================
# Test 3 — Known Bayesian calculation
# ===================================================================

class TestBayesianCalculation:
    def test_manual_posterior(self):
        """Two-section system where the exact posterior is easy to verify."""
        engine = BayesianInferenceEngine(
            sections=["A", "B"],
            prior={"A": 0.3, "B": 0.7},
            section_likelihoods={
                "TEST_EV": {
                    "target": 0.9,
                    "adjacent": 0.2,
                    "near": 0.2,
                    "far": 0.2,
                    "uniform": 0.5,
                },
            },
        )
        # Evidence at section A, full strength
        engine.update(Evidence(evidence_type="TEST_EV", section_id="A", strength=1.0))
        beliefs = engine.get_beliefs()

        # Manual: unnorm_A = 0.3 * 0.9 = 0.27
        #         unnorm_B = 0.7 * 0.2 = 0.14  (adjacent, dist=1)
        #         total    = 0.41
        #         P(A|E)   = 0.27 / 0.41 ≈ 0.6585
        #         P(B|E)   = 0.14 / 0.41 ≈ 0.3415
        assert abs(beliefs["A"] - 0.27 / 0.41) < 1e-6
        assert abs(beliefs["B"] - 0.14 / 0.41) < 1e-6
        assert _sums_to_one(beliefs)


# ===================================================================
# Test 4 — Current anomaly increases target section
# ===================================================================

class TestCurrentAnomaly:
    def test_s3_increases(self):
        engine = _make_engine()
        before = engine.get_beliefs()["S3"]
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        after = engine.get_beliefs()["S3"]
        assert after > before
        assert _sums_to_one(engine.get_beliefs())


# ===================================================================
# Test 5 — Sequential update (does NOT restart from original prior)
# ===================================================================

class TestSequentialUpdate:
    def test_posterior_is_prior_for_next(self):
        engine = _make_engine()

        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        beliefs_after_1 = engine.get_beliefs()

        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", section_id="S3", strength=0.9))
        beliefs_after_2 = engine.get_beliefs()

        # S3 should be higher after second update than after first
        assert beliefs_after_2["S3"] > beliefs_after_1["S3"]
        # And different from what we'd get starting from uniform
        engine_fresh = _make_engine()
        engine_fresh.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", section_id="S3", strength=0.9))
        fresh_beliefs = engine_fresh.get_beliefs()
        assert abs(beliefs_after_2["S3"] - fresh_beliefs["S3"]) > 0.01
        assert _sums_to_one(beliefs_after_2)


# ===================================================================
# Test 6 — Probability normalisation
# ===================================================================

class TestNormalisation:
    def test_after_single_update(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="VOLTAGE_ANOMALY", section_id="S2", strength=0.7))
        assert _sums_to_one(engine.get_beliefs())

    def test_after_many_updates(self):
        engine = _make_engine()
        for _ in range(20):
            engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.5))
        assert _sums_to_one(engine.get_beliefs())

    def test_after_mixed_evidence(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S1", strength=1.0))
        engine.update(Evidence(evidence_type="CREW_NO_FAULT", section_id="S1", strength=0.95))
        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", section_id="S4", strength=0.9))
        assert _sums_to_one(engine.get_beliefs())


# ===================================================================
# Test 7 — No negative probabilities
# ===================================================================

class TestNoNegatives:
    def test_no_negatives_after_updates(self):
        engine = _make_engine()
        for section in SECTIONS:
            engine.update(Evidence(evidence_type="CREW_NO_FAULT", section_id=section, strength=0.95))
        assert _no_negatives(engine.get_beliefs())
        assert _no_nan_inf(engine.get_beliefs())
        assert _sums_to_one(engine.get_beliefs())


# ===================================================================
# Test 8 — Evidence strength
# ===================================================================

class TestEvidenceStrength:
    def test_strong_greater_effect(self):
        engine_weak = _make_engine()
        engine_strong = _make_engine()

        engine_weak.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.2))
        engine_strong.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.9))

        # Strong evidence should move S3 further from uniform
        assert engine_strong.get_beliefs()["S3"] > engine_weak.get_beliefs()["S3"]

    def test_zero_strength_is_no_op(self):
        engine = _make_engine()
        before = engine.get_beliefs()
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.0))
        after = engine.get_beliefs()
        # With strength=0, all adjusted likelihoods = 1.0, so posterior == prior
        for s in SECTIONS:
            assert abs(before[s] - after[s]) < 1e-9

    def test_rejects_invalid_strength(self):
        with pytest.raises(ValueError, match="strength"):
            Evidence(evidence_type="CURRENT_ANOMALY", strength=-0.1)
        with pytest.raises(ValueError, match="strength"):
            Evidence(evidence_type="CURRENT_ANOMALY", strength=1.5)


# ===================================================================
# Test 9 — Crew confirmation
# ===================================================================

class TestCrewConfirmation:
    def test_confirm_increases_target(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="CREW_CONFIRMED", section_id="S3", strength=0.95))
        beliefs = engine.get_beliefs()
        assert beliefs["S3"] > 0.5
        for s in SECTIONS:
            if s != "S3":
                assert beliefs[s] < beliefs["S3"]
        assert _sums_to_one(beliefs)

    def test_confirm_does_not_set_to_one(self):
        """The engine must preserve uncertainty — never exactly 1.0."""
        engine = _make_engine()
        engine.update(Evidence(evidence_type="CREW_CONFIRMED", section_id="S3", strength=0.95))
        assert engine.get_beliefs()["S3"] < 1.0


# ===================================================================
# Test 10 — Crew rejection
# ===================================================================

class TestCrewRejection:
    def test_deny_decreases_target(self):
        engine = _make_engine()
        before = engine.get_beliefs()["S3"]
        engine.update(Evidence(evidence_type="CREW_NO_FAULT", section_id="S3", strength=0.95))
        after = engine.get_beliefs()["S3"]
        assert after < before
        assert _sums_to_one(engine.get_beliefs())

    def test_deny_does_not_set_to_zero(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="CREW_NO_FAULT", section_id="S3", strength=0.95))
        assert engine.get_beliefs()["S3"] > 0


# ===================================================================
# Test 11 — Top-K
# ===================================================================

class TestTopK:
    def test_sorted_descending(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        top = engine.get_top_sections(k=3)
        assert len(top) == 3
        assert top[0]["probability"] >= top[1]["probability"] >= top[2]["probability"]
        assert top[0]["section_id"] == "S3"

    def test_top_k_larger_than_sections(self):
        engine = _make_engine()
        top = engine.get_top_sections(k=10)
        assert len(top) == 5


# ===================================================================
# Test 12 — History
# ===================================================================

class TestHistory:
    def test_history_grows(self):
        engine = _make_engine()
        assert len(engine.get_history()) == 0
        engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.6))
        assert len(engine.get_history()) == 1
        engine.update(Evidence(evidence_type="LIGHTNING", strength=0.7))
        assert len(engine.get_history()) == 2

    def test_history_snapshots_are_independent(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        snap1 = engine.get_history()[0]
        engine.update(Evidence(evidence_type="VOLTAGE_ANOMALY", section_id="S3", strength=0.7))
        snap2 = engine.get_history()[1]
        # Snapshots must differ — second update changes beliefs
        assert snap1.section_probabilities["S3"] != snap2.section_probabilities["S3"]

    def test_history_immutable(self):
        """Mutating a returned snapshot must not affect engine internals."""
        engine = _make_engine()
        engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.5))
        history = engine.get_history()
        # Try to mutate
        history[0].section_probabilities["S1"] = 999.0
        # Engine's internal beliefs must be unaffected
        assert engine.get_beliefs()["S1"] < 1.0


# ===================================================================
# Test 13 — Reset
# ===================================================================

class TestReset:
    def test_reset_restores_prior(self):
        engine = _make_engine()
        initial = engine.get_beliefs()
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.9))
        engine.reset()
        after_reset = engine.get_beliefs()
        for s in SECTIONS:
            assert abs(initial[s] - after_reset[s]) < TOL

    def test_reset_clears_history(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.5))
        engine.reset()
        assert len(engine.get_history()) == 0
        assert len(engine.get_evidence_summary()) == 0


# ===================================================================
# Test 14 — Invalid / unknown evidence types
# ===================================================================

class TestInvalidEvidence:
    def test_unknown_type_uses_uniform(self):
        """Unknown evidence types should not crash — they use uniform likelihoods."""
        engine = _make_engine()
        before = engine.get_beliefs()
        engine.update(Evidence(evidence_type="ALIEN_INVASION", strength=0.5))
        after = engine.get_beliefs()
        # With uniform likelihoods, beliefs should remain nearly unchanged
        for s in SECTIONS:
            assert abs(before[s] - after[s]) < 0.01
        assert _sums_to_one(after)

    def test_empty_evidence_type_raises(self):
        with pytest.raises(ValueError, match="non-empty"):
            Evidence(evidence_type="")

    def test_non_evidence_raises(self):
        engine = _make_engine()
        with pytest.raises(TypeError):
            engine.update("not evidence")  # type: ignore[arg-type]


# ===================================================================
# Test 15 — Invalid probability input
# ===================================================================

class TestInvalidPriorInput:
    def test_nan_prior(self):
        with pytest.raises(ValueError):
            _make_engine(prior={"S1": float("nan"), "S2": 0.25, "S3": 0.25, "S4": 0.25, "S5": 0.25})

    def test_inf_prior(self):
        with pytest.raises(ValueError):
            _make_engine(prior={"S1": float("inf"), "S2": 0.0, "S3": 0.0, "S4": 0.0, "S5": 0.0})

    def test_empty_sections(self):
        with pytest.raises(ValueError, match="non-empty"):
            BayesianInferenceEngine(sections=[])

    def test_duplicate_sections(self):
        with pytest.raises(ValueError, match="duplicates"):
            BayesianInferenceEngine(sections=["S1", "S1", "S2"])


# ===================================================================
# Test 16 — get_state returns EngineState
# ===================================================================

class TestGetState:
    def test_state_structure(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        state = engine.get_state()
        assert isinstance(state, EngineState)
        assert state.most_probable_section == "S3"
        assert 0 < state.confidence <= 1.0
        assert _sums_to_one(state.section_probabilities)
        assert _sums_to_one(state.cause_probabilities)
        assert state.evidence_count == 1

    def test_state_to_dict(self):
        engine = _make_engine()
        state = engine.get_state()
        d = state.to_dict()
        assert "most_probable_section" in d
        assert "confidence" in d
        assert "section_probabilities" in d
        assert "cause_probabilities" in d
        assert "updated_at" in d
        assert "evidence_count" in d


# ===================================================================
# Test 17 — Cause probabilities update
# ===================================================================

class TestCauseInference:
    def test_wind_boosts_vegetation(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.9))
        causes = engine.get_cause_probabilities()
        assert causes["VEGETATION_CONTACT"] > causes["TRANSFORMER_OVERLOAD"]
        assert _sums_to_one(causes)

    def test_transformer_evidence_boosts_overload(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="TRANSFORMER_OVERLOAD", strength=0.9))
        causes = engine.get_cause_probabilities()
        assert causes["TRANSFORMER_OVERLOAD"] > causes["VEGETATION_CONTACT"]

    def test_lightning_evidence(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="LIGHTNING", strength=0.9))
        causes = engine.get_cause_probabilities()
        assert causes["LIGHTNING"] > causes["VEGETATION_CONTACT"]


# ===================================================================
# Test 18 — Confidence metric
# ===================================================================

class TestConfidence:
    def test_confidence_equals_max_prob(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        conf = engine.get_confidence()
        assert abs(conf - max(engine.get_beliefs().values())) < TOL

    def test_confidence_increases_with_evidence(self):
        engine = _make_engine()
        c0 = engine.get_confidence()
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        c1 = engine.get_confidence()
        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", section_id="S3", strength=0.9))
        c2 = engine.get_confidence()
        assert c2 > c1 > c0


# ===================================================================
# Test 19 — Full demonstration scenario
# ===================================================================

class TestDemoScenario:
    """
    Reproduce the GridMind demo:
        1. Start uniform
        2. CURRENT_ANOMALY at S3
        3. METER_OUTAGE_CLUSTER downstream of S3
        4. HIGH_WIND (ambient)
        5. CREW_NO_FAULT at S3
        6. CREW_CONFIRMED at S4

    Final: S4 should be the most probable section.
    """

    def test_full_scenario(self):
        engine = _make_engine()

        # 1. Uniform
        for v in engine.get_beliefs().values():
            assert abs(v - 0.2) < TOL

        # 2. Current anomaly at S3
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        assert engine.get_most_likely_section()[0] == "S3"

        # 3. Meter outage cluster near S3
        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", section_id="S3", strength=0.9))
        assert engine.get_most_likely_section()[0] == "S3"
        s3_after_meters = engine.get_beliefs()["S3"]

        # 4. High wind (ambient, no section)
        engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.7))
        assert _sums_to_one(engine.get_beliefs())

        # 5. Crew inspects S3 → no fault found
        engine.update(Evidence(evidence_type="CREW_NO_FAULT", section_id="S3", strength=0.95))
        s3_after_deny = engine.get_beliefs()["S3"]
        assert s3_after_deny < s3_after_meters

        # 6. Crew confirms fault at S4
        engine.update(Evidence(evidence_type="CREW_CONFIRMED", section_id="S4", strength=0.95))
        assert engine.get_most_likely_section()[0] == "S4"

        # Verify history has 5 entries
        assert len(engine.get_history()) == 5

        # All constraints
        beliefs = engine.get_beliefs()
        assert _sums_to_one(beliefs)
        assert _no_negatives(beliefs)
        assert _no_nan_inf(beliefs)

        causes = engine.get_cause_probabilities()
        assert _sums_to_one(causes)
        assert _no_negatives(causes)


# ===================================================================
# Test 20 — Evidence summary
# ===================================================================

class TestEvidenceSummary:
    def test_summary_content(self):
        engine = _make_engine()
        engine.update(Evidence(evidence_type="HIGH_WIND", strength=0.6))
        engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="S3", strength=0.8))
        summary = engine.get_evidence_summary()
        assert len(summary) == 2
        assert summary[0]["evidence_type"] == "HIGH_WIND"
        assert "probabilities_before" in summary[0]
        assert "probabilities_after" in summary[0]
        assert summary[1]["section_id"] == "S3"
        assert summary[1]["affected_sections"] == ["S3"]


# ===================================================================
# Test 21 — Explicit Sequential Bayesian Reasoning
# ===================================================================

class TestSequentialReasoning:
    def test_sequential_bayesian_reasoning_explicitly(self):
        """
        Scenario:
        Initial: A, B, C, D (25% each)
        Evidence 1: RELAY_TRIP (Graph says B, C are downstream) -> B and C increase
        Evidence 2: METER_OUTAGE_CLUSTER at Kolvan (Graph says Kolvan -> B) -> B > C
        Evidence 3: CREW_NO_FAULT at B -> B decreases
        Evidence 4: CREW_CONFIRMED at C -> C becomes dominant
        """
        def mock_downstream(node_id: str) -> list[str]:
            return ["B", "C"] if node_id == "SS1" else []

        def mock_supplying(location: str) -> str | None:
            return "B" if location == "Kolvan" else None

        engine = BayesianInferenceEngine(
            sections=["A", "B", "C", "D"],
            get_downstream_sections=mock_downstream,
            get_supplying_section=mock_supplying,
        )

        # Initial: uniform
        initial = engine.get_beliefs()
        for v in initial.values():
            assert abs(v - 0.25) < TOL

        # Evidence 1: RELAY_TRIP -> B, C increase; A, D decrease
        engine.update(Evidence(evidence_type="RELAY_TRIP", location="SS1", strength=0.9))
        b1 = engine.get_beliefs()
        assert b1["B"] > initial["B"]
        assert b1["C"] > initial["C"]
        assert b1["A"] < initial["A"]
        assert b1["D"] < initial["D"]
        assert _sums_to_one(b1)
        assert _no_negatives(b1)
        assert _no_nan_inf(b1)

        # Evidence 2: METER_OUTAGE_CLUSTER at Kolvan -> resolves to B -> B > C
        engine.update(Evidence(evidence_type="METER_OUTAGE_CLUSTER", location="Kolvan", strength=0.9))
        b2 = engine.get_beliefs()
        assert b2["B"] > b2["C"]
        assert _sums_to_one(b2)
        assert _no_negatives(b2)
        assert _no_nan_inf(b2)

        # Evidence 3: CREW_NO_FAULT at B -> B decreases
        engine.update(Evidence(evidence_type="CREW_NO_FAULT", section_id="B", strength=0.95))
        b3 = engine.get_beliefs()
        assert b3["B"] < b2["B"]
        assert b3["B"] > 0.0  # epsilon floor preserved
        assert _sums_to_one(b3)
        assert _no_negatives(b3)
        assert _no_nan_inf(b3)

        # Evidence 4: CREW_CONFIRMED at C -> C becomes dominant
        engine.update(Evidence(evidence_type="CREW_CONFIRMED", section_id="C", strength=0.95))
        b4 = engine.get_beliefs()
        assert engine.get_most_likely_section()[0] == "C"
        assert _sums_to_one(b4)
        assert _no_negatives(b4)
        assert _no_nan_inf(b4)


# ===================================================================
# Test 22 — Custom cause prior
# ===================================================================

class TestCustomCausePrior:
    def test_accepts_valid_cause_prior(self):
        engine = _make_engine(
            cause_prior={
                "VEGETATION_CONTACT": 0.5,
                "BROKEN_CONDUCTOR": 0.2,
                "TRANSFORMER_OVERLOAD": 0.2,
                "LIGHTNING": 0.1,
            }
        )
        causes = engine.get_cause_probabilities()
        assert abs(causes["VEGETATION_CONTACT"] - 0.5) < TOL

    def test_rejects_invalid_cause_prior(self):
        with pytest.raises(ValueError):
            _make_engine(
                cause_prior={
                    "VEGETATION_CONTACT": 0.9,
                    "BROKEN_CONDUCTOR": 0.9,
                    "TRANSFORMER_OVERLOAD": 0.1,
                    "LIGHTNING": 0.1,
                }
            )


# ===================================================================
# Test 23 — Pluggable likelihood tables
# ===================================================================

class TestPluggableLikelihoods:
    def test_custom_section_likelihoods(self):
        custom = {
            "CUSTOM_EV": {
                "target": 0.99,
                "adjacent": 0.01,
                "near": 0.01,
                "far": 0.01,
                "uniform": 0.50,
            }
        }
        engine = _make_engine(section_likelihoods=custom)
        engine.update(Evidence(evidence_type="CUSTOM_EV", section_id="S1", strength=1.0))
        assert engine.get_most_likely_section()[0] == "S1"
