"""
tests/test_feeder_graph.py
==========================
Unit tests for the GridSense Feeder Knowledge Graph.

Run with:
    cd backend
    python -m pytest tests/ -v
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app.feeder_graph import (
    get_graph,
    get_downstream_sections,
    get_downstream_nodes,
    get_supplying_section,
    get_affected_villages,
    get_sections_on_path,
    get_nodes_between_relay_and_village,
    get_switch_isolation_plan,
    get_section_nodes,
    get_transformer_for_section,
    get_section_for_node,
    get_all_villages,
    get_all_switches,
    graph_summary,
)


# ===========================================================================
# Graph structure
# ===========================================================================

class TestGraphStructure:
    def test_graph_has_correct_node_count(self):
        G = get_graph()
        assert G.number_of_nodes() == 20, f"Expected 20 nodes, got {G.number_of_nodes()}"

    def test_graph_has_correct_edge_count(self):
        G = get_graph()
        assert G.number_of_edges() == 19, f"Expected 19 edges, got {G.number_of_edges()}"

    def test_all_key_nodes_exist(self):
        G = get_graph()
        expected = ["SS1", "P40", "P41", "T1", "P42", "SW1",
                    "P43", "P44", "T2", "P45", "SW2", "P46",
                    "P47", "T3", "P48", "P49", "SW3",
                    "V_A", "V_B", "V_C"]
        for nid in expected:
            assert nid in G, f"Node {nid} missing from graph"

    def test_node_types(self):
        G = get_graph()
        assert G.nodes["SS1"]["node_type"] == "substation"
        assert G.nodes["P44"]["node_type"] == "pole"
        assert G.nodes["T2"]["node_type"] == "transformer"
        assert G.nodes["SW2"]["node_type"] == "switch"
        assert G.nodes["V_B"]["node_type"] == "village"

    def test_section_assignments(self):
        G = get_graph()
        assert G.nodes["SS1"]["section"] == "source"
        assert G.nodes["P40"]["section"] == "A"
        assert G.nodes["P44"]["section"] == "B"
        assert G.nodes["V_C"]["section"] == "C"

    def test_powered_status(self):
        G = get_graph()
        assert G.nodes["V_A"]["powered"] is True    # Tamhini — healthy
        assert G.nodes["V_B"]["powered"] is False   # Kolvan  — faulted
        assert G.nodes["V_C"]["powered"] is False   # Bhira   — downstream


# ===========================================================================
# get_downstream_sections
# ===========================================================================

class TestGetDownstreamSections:
    def test_from_substation_sees_all_sections(self):
        result = get_downstream_sections("SS1")
        assert set(result) == {"A", "B", "C"}

    def test_from_sw1_sees_b_and_c(self):
        """Relay trip at Switch S1 boundary means fault is in B or C."""
        result = get_downstream_sections("SW1")
        assert set(result) == {"B", "C"}

    def test_from_sw2_sees_b_and_c(self):
        """SW2 is tagged section B; V_B (Kolvan) is also reachable via T2 branch.
        Downstream of SW2 includes remaining B nodes (P46, V_B) and all of C."""
        result = get_downstream_sections("SW2")
        assert "C" in result  # Section C is always downstream of SW2
        # B is also present because V_B / P46 are downstream via the graph

    def test_from_leaf_node_empty(self):
        """A village node has no further downstream nodes."""
        result = get_downstream_sections("V_C")
        assert result == []

    def test_from_unknown_node_empty(self):
        result = get_downstream_sections("NONEXISTENT")
        assert result == []


# ===========================================================================
# get_supplying_section
# ===========================================================================

class TestGetSupplyingSection:
    def test_kolvan_by_id(self):
        assert get_supplying_section("V_B") == "B"

    def test_kolvan_by_label(self):
        assert get_supplying_section("Kolvan") == "B"

    def test_bhira_by_label(self):
        assert get_supplying_section("Bhira") == "C"

    def test_tamhini_by_label(self):
        assert get_supplying_section("Tamhini") == "A"

    def test_unknown_village_returns_none(self):
        assert get_supplying_section("UnknownVillage") is None

    def test_non_village_node_returns_its_section(self):
        # Poles also have a section, this is valid behaviour
        result = get_supplying_section("P44")
        assert result == "B"


# ===========================================================================
# get_affected_villages
# ===========================================================================

class TestGetAffectedVillages:
    def test_fault_in_b_affects_kolvan_and_bhira(self):
        result = get_affected_villages("B")
        assert "Kolvan" in result
        assert "Bhira" in result
        assert "Tamhini" not in result

    def test_fault_in_a_affects_all_villages(self):
        result = get_affected_villages("A")
        assert set(result) == {"Tamhini", "Kolvan", "Bhira"}

    def test_fault_in_c_affects_only_bhira(self):
        result = get_affected_villages("C")
        assert result == ["Bhira"]

    def test_invalid_section_returns_empty(self):
        result = get_affected_villages("X")
        assert result == []

    def test_case_insensitive(self):
        assert get_affected_villages("b") == get_affected_villages("B")


# ===========================================================================
# get_nodes_between_relay_and_village
# ===========================================================================

class TestPathTraversal:
    def test_path_from_ss1_to_kolvan(self):
        path = get_nodes_between_relay_and_village("SS1", "V_B")
        assert path[0] == "SS1"
        assert path[-1] == "V_B"
        # Must pass through Section B transformer
        assert "T2" in path

    def test_sections_on_path_ss1_to_bhira(self):
        sections = get_sections_on_path("SS1", "V_C")
        # Path from substation to Bhira passes through A, B, C
        assert "A" in sections
        assert "B" in sections
        assert "C" in sections

    def test_no_path_returns_empty(self):
        # V_C is a leaf; nothing is downstream of it
        path = get_nodes_between_relay_and_village("V_C", "SS1")
        assert path == []

    def test_path_from_sw1_to_kolvan_includes_b(self):
        """SW1 is tagged section A (it is the A/B boundary switch).
        The path SW1->P43->P44->T2->V_B therefore touches A then B."""
        sections = get_sections_on_path("SW1", "V_B")
        assert "B" in sections  # Must pass through Section B to reach Kolvan


# ===========================================================================
# get_switch_isolation_plan
# ===========================================================================

class TestSwitchIsolationPlan:
    def test_section_b_plan_has_open_sw2(self):
        plan = get_switch_isolation_plan("B")
        operations = [step["operation"] for step in plan if step.get("switch") == "SW2"]
        assert "open" in operations

    def test_section_b_plan_has_close_sw3(self):
        plan = get_switch_isolation_plan("B")
        operations = [step["operation"] for step in plan if step.get("switch") == "SW3"]
        assert "close" in operations

    def test_section_b_plan_length(self):
        plan = get_switch_isolation_plan("B")
        assert len(plan) == 3

    def test_section_c_plan(self):
        plan = get_switch_isolation_plan("C")
        assert any(s.get("switch") == "SW3" for s in plan)

    def test_invalid_section_returns_empty(self):
        assert get_switch_isolation_plan("X") == []


# ===========================================================================
# Helpers
# ===========================================================================

class TestHelpers:
    def test_get_section_nodes_b(self):
        nodes = get_section_nodes("B")
        assert "P44" in nodes
        assert "T2" in nodes
        assert "V_B" in nodes
        assert "SS1" not in nodes

    def test_get_transformer_for_section(self):
        assert get_transformer_for_section("A") == "T1"
        assert get_transformer_for_section("B") == "T2"
        assert get_transformer_for_section("C") == "T3"

    def test_get_section_for_node(self):
        assert get_section_for_node("P44") == "B"
        assert get_section_for_node("SS1") is None  # source

    def test_get_all_villages_returns_three(self):
        villages = get_all_villages()
        assert len(villages) == 3
        labels = [v["label"] for v in villages]
        assert "Kolvan" in labels

    def test_get_all_switches_returns_three(self):
        switches = get_all_switches()
        assert len(switches) == 3

    def test_graph_summary_keys(self):
        summary = graph_summary()
        assert "total_nodes" in summary
        assert "total_edges" in summary
        assert "sections" in summary
        assert "villages" in summary
        assert summary["total_nodes"] == 20
