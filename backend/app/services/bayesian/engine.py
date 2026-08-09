"""
GridMind AI — Bayesian Inference Engine

A stateful, sequential Bayesian fault-localization and cause-inference engine
for rural electricity feeder networks.

Mathematical foundation
-----------------------
For each candidate fault section *S_i* and a piece of evidence *E*:

    P(S_i | E) = P(E | S_i) · P(S_i)  /  Σ_j [ P(E | S_j) · P(S_j) ]

The posterior after processing evidence *E_k* becomes the prior for evidence
*E_{k+1}*.  The engine therefore maintains a **running belief state** that is
updated incrementally — it never restarts from the original prior.

The same Bayesian update is applied independently to the cause distribution.

Graph Integration
-----------------
The engine optionally accepts three graph functions from the feeder graph
module (``app.feeder_graph``):

* ``get_supplying_section(village_id) → str | None``
  Resolves a village name/ID to its supplying section.  Used for
  ``METER_OUTAGE_CLUSTER`` and ``CONSUMER_COMPLAINT`` evidence.

* ``get_downstream_sections(node_id) → list[str]``
  Returns sections downstream of a relay/switch node.  Used for
  ``RELAY_TRIP`` evidence to assign elevated likelihoods to downstream
  sections.

* ``get_affected_villages(fault_section) → list[str]``
  Returns village labels affected by a faulted section.  Used to enrich
  the ``EngineState`` output.

The graph owns topology; the engine owns probabilistic reasoning.  Graph
functions are injected via the constructor and called only during evidence
resolution — they never touch the Bayesian math itself.

Assumptions & Limitations
-------------------------
* Evidence items are treated as **conditionally independent** given the true
  fault section.  In practice, smart-meter outages and consumer complaints can
  originate from the same outage.  The architecture is structured so a
  dependency-aware Bayesian network (e.g. via pgmpy) can replace the naïve
  update later without changing the public API.
* Likelihood values are **synthetic domain assumptions** suitable for a
  hackathon prototype.  They are NOT learned from real utility data.
* When no graph functions are provided, the engine falls back to ordered-list
  adjacency for positional likelihood attenuation.

Usage
-----
>>> from app.services.bayesian.engine import BayesianInferenceEngine
>>> from app.services.bayesian.models import Evidence
>>> engine = BayesianInferenceEngine(sections=["A", "B", "C"])
>>> engine.update(Evidence(evidence_type="CURRENT_ANOMALY", section_id="B", strength=0.8))
>>> state = engine.get_state()
>>> state.most_probable_section
'B'
"""

from __future__ import annotations

import copy
import logging
import math
from datetime import datetime, timezone
from typing import Any, Callable

from .likelihoods import (
    CAUSE_LIKELIHOODS,
    DEFAULT_CAUSE_LIKELIHOOD,
    DEFAULT_CAUSES,
    DEFAULT_SECTION_LIKELIHOOD,
    SECTION_LIKELIHOODS,
)
from .models import BeliefSnapshot, EngineState, Evidence

logger = logging.getLogger(__name__)

# Minimum probability floor — prevents any section from reaching exactly 0.
_EPSILON: float = 1e-12

# Evidence types that can resolve a location to a section via the graph.
_LOCATION_RESOLVABLE_TYPES: frozenset[str] = frozenset({
    "METER_OUTAGE_CLUSTER",
    "CONSUMER_COMPLAINT",
})


class BayesianInferenceEngine:
    """Stateful Bayesian inference engine for feeder fault localization.

    Parameters
    ----------
    sections : list[str]
        Ordered list of candidate feeder sections (e.g. ``["S1", "S2", …]``).
        Order determines *adjacency* for likelihood attenuation.
    prior : dict[str, float] | None
        Optional custom prior.  Must cover every section and sum to ≈ 1.
    causes : list[str] | None
        Fault-cause hypotheses.  Defaults to ``DEFAULT_CAUSES``.
    cause_prior : dict[str, float] | None
        Optional custom prior for causes.
    section_likelihoods : dict | None
        Pluggable override for section likelihood tables.
    cause_likelihoods : dict | None
        Pluggable override for cause likelihood tables.
    get_supplying_section : callable | None
        Graph function: ``(village_id: str) → str | None``.
        Resolves a village/meter location to its supplying section.
    get_downstream_sections : callable | None
        Graph function: ``(node_id: str) → list[str]``.
        Returns sections downstream of a relay/switch node.
    get_affected_villages : callable | None
        Graph function: ``(fault_section: str) → list[str]``.
        Returns village labels affected by a faulted section.
    """

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def __init__(
        self,
        sections: list[str],
        *,
        prior: dict[str, float] | None = None,
        causes: list[str] | None = None,
        cause_prior: dict[str, float] | None = None,
        section_likelihoods: dict[str, dict[str, float]] | None = None,
        cause_likelihoods: dict[str, dict[str, float]] | None = None,
        get_supplying_section: Callable[[str], str | None] | None = None,
        get_downstream_sections: Callable[[str], list[str]] | None = None,
        get_affected_villages: Callable[[str], list[str]] | None = None,
    ) -> None:
        if not sections:
            raise ValueError("sections must be a non-empty list")
        if len(sections) != len(set(sections)):
            raise ValueError("sections must not contain duplicates")

        self._sections: list[str] = list(sections)
        self._causes: list[str] = list(causes or DEFAULT_CAUSES)
        self._section_likelihoods = section_likelihoods or SECTION_LIKELIHOODS
        self._cause_likelihoods = cause_likelihoods or CAUSE_LIKELIHOODS

        # Build section-index map for adjacency calculation.
        self._section_index: dict[str, int] = {
            s: i for i, s in enumerate(self._sections)
        }

        # --- Graph function injection ---
        self._get_supplying_section = get_supplying_section
        self._get_downstream_sections = get_downstream_sections
        self._get_affected_villages = get_affected_villages

        # --- Section beliefs ---
        if prior is not None:
            self._validate_distribution(prior, self._sections, "section prior")
            self._section_beliefs: dict[str, float] = dict(prior)
        else:
            uniform = 1.0 / len(self._sections)
            self._section_beliefs = {s: uniform for s in self._sections}

        # --- Cause beliefs ---
        if cause_prior is not None:
            self._validate_distribution(cause_prior, self._causes, "cause prior")
            self._cause_beliefs: dict[str, float] = dict(cause_prior)
        else:
            uniform_c = 1.0 / len(self._causes)
            self._cause_beliefs = {c: uniform_c for c in self._causes}

        # Store initial priors for reset().
        self._initial_section_beliefs = dict(self._section_beliefs)
        self._initial_cause_beliefs = dict(self._cause_beliefs)

        # Evidence bookkeeping.
        self._evidence_log: list[Evidence] = []
        self._explanation_log: list[dict[str, Any]] = []
        self._history: list[BeliefSnapshot] = []
        self._updated_at: datetime = datetime.now(timezone.utc)

    # ------------------------------------------------------------------
    # Validation helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_distribution(
        dist: dict[str, float],
        expected_keys: list[str],
        label: str,
    ) -> None:
        """Raise ``ValueError`` if *dist* is not a valid probability distribution."""
        missing = set(expected_keys) - set(dist)
        if missing:
            raise ValueError(f"{label}: missing keys {missing}")
        for k, v in dist.items():
            if v < 0:
                raise ValueError(f"{label}: negative probability for '{k}': {v}")
            if math.isnan(v) or math.isinf(v):
                raise ValueError(f"{label}: invalid probability for '{k}': {v}")
        total = sum(dist[k] for k in expected_keys)
        if abs(total - 1.0) > 1e-6:
            raise ValueError(
                f"{label}: probabilities sum to {total}, expected ≈ 1.0"
            )

    # ------------------------------------------------------------------
    # Core Bayesian update (pure function)
    # ------------------------------------------------------------------

    @staticmethod
    def _bayesian_update(
        beliefs: dict[str, float],
        likelihoods: dict[str, float],
    ) -> dict[str, float]:
        """Apply Bayes' rule and return the normalised posterior.

        Parameters
        ----------
        beliefs : dict[str, float]
            Current prior/posterior mapping hypothesis → probability.
        likelihoods : dict[str, float]
            Mapping hypothesis → ``P(evidence | hypothesis)``.

        Returns
        -------
        dict[str, float]
            Normalised posterior.  Guaranteed: all values ≥ 0, sum ≈ 1.
        """
        unnormalized: dict[str, float] = {}
        for h in beliefs:
            lk = likelihoods.get(h, DEFAULT_SECTION_LIKELIHOOD)
            unnormalized[h] = max(beliefs[h] * lk, _EPSILON)

        total = sum(unnormalized.values())
        if total <= 0 or math.isnan(total) or math.isinf(total):
            # Safety net — should never happen, but return uniform.
            logger.warning("Bayesian update: normalisation constant is %s; returning uniform.", total)
            uniform = 1.0 / len(beliefs)
            return {h: uniform for h in beliefs}

        return {h: unnormalized[h] / total for h in beliefs}

    # ------------------------------------------------------------------
    # Graph-aware evidence resolution
    # ------------------------------------------------------------------

    def _resolve_evidence_section(self, evidence: Evidence) -> str | None:
        """Resolve an evidence's effective section_id using the graph.

        For ``METER_OUTAGE_CLUSTER`` and ``CONSUMER_COMPLAINT`` evidence that
        has a ``location`` but no ``section_id``, calls
        ``get_supplying_section(location)`` to map the village/meter to its
        supplying section.

        Returns the resolved section_id, or None if resolution fails or is
        not applicable.
        """
        # If section_id is already set, use it directly.
        if evidence.section_id is not None:
            return evidence.section_id

        # Only resolve location for specific evidence types.
        if (
            evidence.location is not None
            and evidence.evidence_type in _LOCATION_RESOLVABLE_TYPES
            and self._get_supplying_section is not None
        ):
            try:
                resolved = self._get_supplying_section(evidence.location)
                if resolved is not None:
                    logger.info(
                        "Graph resolved location '%s' → section '%s' for %s",
                        evidence.location, resolved, evidence.evidence_type,
                    )
                    return resolved
                else:
                    logger.warning(
                        "Graph could not resolve location '%s' for %s; "
                        "treating as ambient evidence.",
                        evidence.location, evidence.evidence_type,
                    )
            except Exception:
                logger.exception(
                    "Graph lookup failed for location '%s'; "
                    "treating as ambient evidence.",
                    evidence.location,
                )

        return None

    def _resolve_relay_downstream(self, evidence: Evidence) -> list[str] | None:
        """For ``RELAY_TRIP`` evidence, query the graph for downstream sections.

        Uses ``get_downstream_sections(location)`` where ``location`` is the
        relay/switch node ID.

        Returns a list of downstream section IDs, or None if the graph is not
        available or the lookup fails.
        """
        if evidence.evidence_type != "RELAY_TRIP":
            return None

        node_id = evidence.location
        if node_id is None:
            return None

        if self._get_downstream_sections is None:
            return None

        try:
            downstream = self._get_downstream_sections(node_id)
            if downstream:
                logger.info(
                    "Graph resolved RELAY_TRIP at '%s' → downstream sections %s",
                    node_id, downstream,
                )
                return downstream
            else:
                logger.warning(
                    "Graph returned no downstream sections for node '%s'.",
                    node_id,
                )
                return None
        except Exception:
            logger.exception(
                "Graph lookup failed for RELAY_TRIP at node '%s'.",
                node_id,
            )
            return None

    # ------------------------------------------------------------------
    # Likelihood calculation
    # ------------------------------------------------------------------

    def _resolve_section_likelihoods(
        self,
        evidence: Evidence,
        *,
        resolved_section: str | None = None,
        downstream_sections: list[str] | None = None,
    ) -> dict[str, float]:
        """Build a per-section likelihood dict for a single piece of evidence.

        The likelihood for each candidate section is determined by:
        1.  Whether the evidence type has an entry in the likelihood table.
        2.  The topological *position* of the candidate relative to the
            evidence's effective section (target / adjacent / near / far),
            OR membership in the downstream set for RELAY_TRIP evidence.
        3.  The evidence ``strength``, which linearly interpolates between
            a flat (uninformative) likelihood and the full base likelihood:
                ``L' = (1 - s) + s · L``
        """
        table = self._section_likelihoods.get(evidence.evidence_type)
        if table is None:
            logger.info(
                "No section likelihood table for '%s'; using uniform.",
                evidence.evidence_type,
            )
            return {s: DEFAULT_SECTION_LIKELIHOOD for s in self._sections}

        # --- RELAY_TRIP: downstream-aware likelihoods ---
        if downstream_sections is not None:
            return self._build_relay_likelihoods(
                table, downstream_sections, evidence.strength,
            )

        # --- Standard positional likelihoods ---
        effective_section = resolved_section if resolved_section is not None else evidence.section_id

        result: dict[str, float] = {}
        for section in self._sections:
            base = self._base_section_likelihood(
                table, section, effective_section
            )
            # Strength interpolation: L' = (1-s) + s·L
            adjusted = (1.0 - evidence.strength) + evidence.strength * base
            result[section] = adjusted

        return result

    def _build_relay_likelihoods(
        self,
        table: dict[str, float],
        downstream_sections: list[str],
        strength: float,
    ) -> dict[str, float]:
        """Build per-section likelihoods for RELAY_TRIP evidence.

        Sections in ``downstream_sections`` receive the ``"downstream"``
        likelihood; all others receive ``"non_downstream"``.
        """
        downstream_set = set(downstream_sections)
        lk_down = table.get("downstream", DEFAULT_SECTION_LIKELIHOOD)
        lk_other = table.get("non_downstream", DEFAULT_SECTION_LIKELIHOOD)

        result: dict[str, float] = {}
        for section in self._sections:
            base = lk_down if section in downstream_set else lk_other
            adjusted = (1.0 - strength) + strength * base
            result[section] = adjusted
        return result

    def _base_section_likelihood(
        self,
        table: dict[str, float],
        candidate_section: str,
        evidence_section: str | None,
    ) -> float:
        """Look up the base likelihood for *candidate_section* given the
        evidence points at *evidence_section*.

        Uses ordered-list adjacency:
            distance 0 → "target"
            distance 1 → "adjacent"
            distance 2 → "near"
            else       → "far"
        If evidence_section is None, returns the "uniform" entry.
        """
        if evidence_section is None:
            return table.get("uniform", DEFAULT_SECTION_LIKELIHOOD)

        if evidence_section not in self._section_index:
            # Evidence references an unknown section — treat as uniform.
            return table.get("uniform", DEFAULT_SECTION_LIKELIHOOD)

        dist = abs(
            self._section_index[candidate_section]
            - self._section_index[evidence_section]
        )

        if dist == 0:
            return table.get("target", DEFAULT_SECTION_LIKELIHOOD)
        if dist == 1:
            return table.get("adjacent", DEFAULT_SECTION_LIKELIHOOD)
        if dist == 2:
            return table.get("near", DEFAULT_SECTION_LIKELIHOOD)
        return table.get("far", DEFAULT_SECTION_LIKELIHOOD)

    def _resolve_cause_likelihoods(
        self,
        evidence: Evidence,
    ) -> dict[str, float]:
        """Build a per-cause likelihood dict for a single piece of evidence."""
        table = self._cause_likelihoods.get(evidence.evidence_type)
        if table is None:
            return {c: DEFAULT_CAUSE_LIKELIHOOD for c in self._causes}

        result: dict[str, float] = {}
        for cause in self._causes:
            base = table.get(cause, DEFAULT_CAUSE_LIKELIHOOD)
            adjusted = (1.0 - evidence.strength) + evidence.strength * base
            result[cause] = adjusted
        return result

    # ------------------------------------------------------------------
    # Public: update
    # ------------------------------------------------------------------

    def update(self, evidence: Evidence) -> None:
        """Process a single evidence item and update both section and cause
        beliefs.

        The posterior after this call becomes the prior for the next
        ``update()`` call — sequential Bayesian reasoning.

        Graph resolution flow:
        1.  For METER_OUTAGE_CLUSTER / CONSUMER_COMPLAINT with a ``location``:
            calls ``get_supplying_section(location)`` to resolve the section.
        2.  For RELAY_TRIP with a ``location``: calls
            ``get_downstream_sections(location)`` to get downstream sections.
        3.  The resolved topology information feeds into the likelihood
            calculation — the Bayesian math itself is unchanged.
        """
        if not isinstance(evidence, Evidence):
            raise TypeError(f"Expected Evidence, got {type(evidence).__name__}")

        # --- Pre-update state for explainability ---
        probs_before = dict(self._section_beliefs)

        # --- Graph resolution ---
        resolved_section = self._resolve_evidence_section(evidence)
        downstream_sections = self._resolve_relay_downstream(evidence)

        # --- Section update ---
        sec_likelihoods = self._resolve_section_likelihoods(
            evidence,
            resolved_section=resolved_section,
            downstream_sections=downstream_sections,
        )
        self._section_beliefs = self._bayesian_update(
            self._section_beliefs, sec_likelihoods
        )

        # --- Cause update ---
        cause_likelihoods = self._resolve_cause_likelihoods(evidence)
        self._cause_beliefs = self._bayesian_update(
            self._cause_beliefs, cause_likelihoods
        )

        # --- Record ---
        self._evidence_log.append(evidence)
        now = datetime.now(timezone.utc)
        self._updated_at = now
        
        # --- Explainability Logging ---
        probs_after = dict(self._section_beliefs)
        affected = []
        if downstream_sections is not None:
            affected = list(downstream_sections)
        elif resolved_section is not None:
            affected = [resolved_section]
        
        self._explanation_log.append({
            "evidence_type": evidence.evidence_type,
            "location": evidence.location,
            "section_id": evidence.section_id,
            "resolved_section": resolved_section,
            "strength": evidence.strength,
            "affected_sections": affected,
            "probabilities_before": probs_before,
            "probabilities_after": probs_after,
            "timestamp": now.isoformat(),
        })

        self._history.append(
            BeliefSnapshot(
                timestamp=now,
                evidence_type=evidence.evidence_type,
                section_id=evidence.section_id,
                section_probabilities=copy.deepcopy(self._section_beliefs),
                cause_probabilities=copy.deepcopy(self._cause_beliefs),
            )
        )
        logger.debug(
            "Updated beliefs with %s (section=%s, strength=%.2f).  Top section: %s (%.4f)",
            evidence.evidence_type,
            evidence.section_id,
            evidence.strength,
            self.get_most_likely_section()[0],
            self.get_most_likely_section()[1],
        )

    # ------------------------------------------------------------------
    # Public: query methods
    # ------------------------------------------------------------------

    def get_beliefs(self) -> dict[str, float]:
        """Return a *copy* of current section probabilities."""
        return dict(self._section_beliefs)

    def get_most_likely_section(self) -> tuple[str, float]:
        """Return ``(section_id, probability)`` for the highest-probability section."""
        best = max(self._section_beliefs, key=self._section_beliefs.__getitem__)
        return best, self._section_beliefs[best]

    def get_top_sections(self, k: int = 3) -> list[dict[str, Any]]:
        """Return the top-*k* sections sorted by descending probability."""
        ranked = sorted(
            self._section_beliefs.items(), key=lambda t: t[1], reverse=True
        )
        return [
            {"section_id": sid, "probability": round(p, 6)}
            for sid, p in ranked[:k]
        ]

    def get_confidence(self) -> float:
        """Return the posterior probability of the most probable section.

        Note: this is **not** a statistically calibrated confidence interval.
        It represents the engine's current maximum posterior belief.
        """
        return max(self._section_beliefs.values())

    def get_cause_probabilities(self) -> dict[str, float]:
        """Return a *copy* of current cause probabilities."""
        return dict(self._cause_beliefs)

    def get_evidence_summary(self) -> list[dict[str, Any]]:
        """Return a serialisable summary of all evidence processed so far,
        including explainability data showing the effect on beliefs."""
        return list(self._explanation_log)

    def get_history(self) -> list[BeliefSnapshot]:
        """Return a list of all historical belief snapshots (copies)."""
        return list(self._history)

    def get_affected_villages(self) -> list[str]:
        """Return the villages affected by the most probable fault section.

        Delegates to the graph's ``get_affected_villages`` function.
        Returns an empty list if no graph function was provided or if the
        lookup fails.
        """
        if self._get_affected_villages is None:
            return []

        best_section, _ = self.get_most_likely_section()
        try:
            villages = self._get_affected_villages(best_section)
            return villages if villages is not None else []
        except Exception:
            logger.exception(
                "Graph lookup failed for affected villages of section '%s'.",
                best_section,
            )
            return []

    def get_state(self) -> EngineState:
        """Return the full public engine state as an ``EngineState`` object.

        If a ``get_affected_villages`` graph function was provided, the
        ``affected_villages`` field is populated by querying the graph for
        the most probable section.
        """
        best_section, best_prob = self.get_most_likely_section()
        return EngineState(
            most_probable_section=best_section,
            confidence=best_prob,
            section_probabilities=dict(self._section_beliefs),
            cause_probabilities=dict(self._cause_beliefs),
            affected_villages=self.get_affected_villages(),
            updated_at=self._updated_at,
            evidence_count=len(self._evidence_log),
        )

    # ------------------------------------------------------------------
    # Public: reset
    # ------------------------------------------------------------------

    def reset(self) -> None:
        """Reset the engine to its initial prior, clearing all evidence and
        history."""
        self._section_beliefs = dict(self._initial_section_beliefs)
        self._cause_beliefs = dict(self._initial_cause_beliefs)
        self._evidence_log.clear()
        self._explanation_log.clear()
        self._history.clear()
        self._updated_at = datetime.now(timezone.utc)
        logger.info("Engine reset to initial prior.")

    # ------------------------------------------------------------------
    # Dunder helpers
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"BayesianInferenceEngine(sections={self._sections}, "
            f"evidence_count={len(self._evidence_log)})"
        )
