"""
GridMind AI — Bayesian Inference Module

Standalone, stateful Bayesian fault-localization and cause-inference engine
for rural electricity feeder networks.

Usage:
    from app.services.bayesian.engine import BayesianInferenceEngine
    from app.services.bayesian.models import Evidence

    engine = BayesianInferenceEngine(sections=["A", "B", "C"])
    engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="B", strength=0.8))
    print(engine.get_state())
"""

from .engine import BayesianInferenceEngine
from .models import Evidence

__all__ = ["BayesianInferenceEngine", "Evidence"]
