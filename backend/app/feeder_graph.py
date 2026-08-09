"""
feeder_graph.py
================
GridSense — Feeder Knowledge Graph
Mulshi 33kV Feeder, Pune district, Maharashtra

This module encodes the entire rural feeder network as a directed NetworkX
DiGraph.  It is the **topology layer** that the Bayesian fault engine queries
to convert raw evidence (relay trip location, last-gasp village, etc.) into
section-level probabilities.

Node types  : substation | pole | transformer | switch | village | meter
Edge types  : connected_to | supplies | downstream_of

Public API (what Akshu's Bayesian engine calls):
  - get_downstream_sections(node_id) -> list[str]
  - get_supplying_section(village_id) -> str | None
  - get_section_nodes(section) -> list[str]
  - get_nodes_between_relay_and_village(relay_id, village_id) -> list[str]
  - get_affected_villages(fault_section) -> list[str]
  - get_switch_isolation_plan(fault_section) -> list[dict]
  - graph_summary() -> dict
"""

from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Optional

import networkx as nx

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).parent
_DATA_DIR = _HERE.parent / "data"
_TOPOLOGY_CSV = _DATA_DIR / "feeder_topology.csv"
_EDGES_CSV = _DATA_DIR / "feeder_edges.csv"


# ===========================================================================
# Graph construction
# ===========================================================================

def _build_graph() -> nx.DiGraph:
    """
    Build the feeder DiGraph from CSV files.

    Falls back to the hard-coded Mulshi topology if CSVs are missing so that
    unit tests and imports work even without the data/ directory.
    """
    G = nx.DiGraph()

    # -- Nodes ---------------------------------------------------------------
    if _TOPOLOGY_CSV.exists():
        with open(_TOPOLOGY_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                G.add_node(
                    row["id"],
                    node_type=row["type"],
                    label=row["label"],
                    lat=float(row["lat"]),
                    lng=float(row["lng"]),
                    section=row["section"],
                    powered=row["powered"].strip().lower() == "true",
                )
    else:
        _add_fallback_nodes(G)

    # -- Edges ---------------------------------------------------------------
    if _EDGES_CSV.exists():
        with open(_EDGES_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                G.add_edge(
                    row["from_id"],
                    row["to_id"],
                    edge_type=row["edge_type"],
                    section=row["section"],
                )
    else:
        _add_fallback_edges(G)

    return G


def _add_fallback_nodes(G: nx.DiGraph) -> None:
    """Hard-coded Mulshi feeder nodes — mirrors frontend mockData.ts exactly."""
    nodes = [
        # id          type            label                   lat       lng       section  powered
        ("SS1",  "substation",  "Mulshi 33kV Substation", 18.5120, 73.4680, "source", True),
        # Section A — healthy
        ("P40",  "pole",        "Pole 40",                 18.5095, 73.4720, "A",      True),
        ("P41",  "pole",        "Pole 41",                 18.5070, 73.4755, "A",      True),
        ("T1",   "transformer", "DTR-1 (25kVA)",           18.5068, 73.4760, "A",      True),
        ("P42",  "pole",        "Pole 42",                 18.5048, 73.4790, "A",      True),
        ("SW1",  "switch",      "Switch S1",               18.5045, 73.4795, "A",      True),
        ("V_A",  "village",     "Tamhini",                 18.5060, 73.4780, "A",      True),
        # Section B — FAULT ZONE
        ("P43",  "pole",        "Pole 43",                 18.5020, 73.4830, "B",      False),
        ("P44",  "pole",        "Pole 44",                 18.4995, 73.4865, "B",      False),
        ("T2",   "transformer", "DTR-2 (63kVA)",           18.4993, 73.4870, "B",      False),
        ("P45",  "pole",        "Pole 45",                 18.4970, 73.4900, "B",      False),
        ("SW2",  "switch",      "Switch S2",               18.4968, 73.4905, "B",      False),
        ("P46",  "pole",        "Pole 46",                 18.4945, 73.4935, "B",      False),
        ("V_B",  "village",     "Kolvan",                  18.4980, 73.4890, "B",      False),
        # Section C — downstream, affected
        ("P47",  "pole",        "Pole 47",                 18.4920, 73.4965, "C",      False),
        ("T3",   "transformer", "DTR-3 (100kVA)",          18.4918, 73.4970, "C",      False),
        ("P48",  "pole",        "Pole 48",                 18.4895, 73.5000, "C",      False),
        ("P49",  "pole",        "Pole 49",                 18.4870, 73.5030, "C",      False),
        ("SW3",  "switch",      "Tie Switch T4",           18.4868, 73.5035, "C",      False),
        ("V_C",  "village",     "Bhira",                   18.4900, 73.5010, "C",      False),
    ]
    for node_id, ntype, label, lat, lng, section, powered in nodes:
        G.add_node(
            node_id,
            node_type=ntype,
            label=label,
            lat=lat,
            lng=lng,
            section=section,
            powered=powered,
        )


def _add_fallback_edges(G: nx.DiGraph) -> None:
    """Hard-coded Mulshi feeder edges — mirrors frontend feederEdges exactly."""
    edges = [
        # from    to     edge_type         section
        ("SS1",  "P40",  "connected_to",  "A"),
        ("P40",  "P41",  "connected_to",  "A"),
        ("P41",  "T1",   "connected_to",  "A"),
        ("P41",  "P42",  "connected_to",  "A"),
        ("P42",  "SW1",  "connected_to",  "A"),
        ("T1",   "V_A",  "supplies",      "A"),
        ("SW1",  "P43",  "connected_to",  "B"),
        ("P43",  "P44",  "connected_to",  "B"),
        ("P44",  "T2",   "connected_to",  "B"),
        ("P44",  "P45",  "connected_to",  "B"),
        ("P45",  "SW2",  "connected_to",  "B"),
        ("SW2",  "P46",  "connected_to",  "B"),
        ("T2",   "V_B",  "supplies",      "B"),
        ("P46",  "P47",  "connected_to",  "C"),
        ("P47",  "T3",   "connected_to",  "C"),
        ("P47",  "P48",  "connected_to",  "C"),
        ("P48",  "P49",  "connected_to",  "C"),
        ("P49",  "SW3",  "connected_to",  "C"),
        ("T3",   "V_C",  "supplies",      "C"),
    ]
    for from_id, to_id, etype, section in edges:
        G.add_edge(from_id, to_id, edge_type=etype, section=section)


# ---------------------------------------------------------------------------
# Module-level singleton — build once, reuse everywhere
# ---------------------------------------------------------------------------
_GRAPH: nx.DiGraph = _build_graph()

# Convenience: section -> set of node IDs
_SECTION_NODES: dict[str, list[str]] = {}
for _nid, _data in _GRAPH.nodes(data=True):
    _sec = _data.get("section", "unknown")
    _SECTION_NODES.setdefault(_sec, []).append(_nid)

# Convenience: village label -> node ID
_VILLAGE_LABEL_TO_ID: dict[str, str] = {
    _data["label"]: _nid
    for _nid, _data in _GRAPH.nodes(data=True)
    if _data.get("node_type") == "village"
}


# ===========================================================================
# Public API
# ===========================================================================

def get_graph() -> nx.DiGraph:
    """Return the raw NetworkX DiGraph (for advanced traversals)."""
    return _GRAPH


def get_node_attr(node_id: str) -> dict:
    """Return all attributes for a node, or empty dict if not found."""
    return dict(_GRAPH.nodes.get(node_id, {}))


def get_section_nodes(section: str) -> list[str]:
    """
    Return all node IDs that belong to a given section.

    Example:
        get_section_nodes("B")  ->  ["P43", "P44", "T2", "P45", "SW2", "P46", "V_B"]
    """
    return list(_SECTION_NODES.get(section.upper(), []))


def get_downstream_nodes(node_id: str) -> list[str]:
    """
    Return all nodes reachable *downstream* from node_id following directed edges.

    Uses BFS over the DiGraph.  The source node itself is excluded.

    Example:
        get_downstream_nodes("SW1")  ->  all nodes in sections B and C
    """
    if node_id not in _GRAPH:
        return []
    descendants = list(nx.descendants(_GRAPH, node_id))
    return descendants


def get_downstream_sections(node_id: str) -> list[str]:
    """
    Return the unique section labels of all nodes downstream of node_id.

    This is the primary function Akshu's Bayesian engine calls when a relay
    trips at a location — it tells the engine which sections could contain
    the fault.

    Example:
        get_downstream_sections("SS1")  ->  ["A", "B", "C"]
        get_downstream_sections("SW1")  ->  ["B", "C"]
        get_downstream_sections("SW2")  ->  ["C"]
    """
    downstream = get_downstream_nodes(node_id)
    sections = {
        _GRAPH.nodes[n].get("section")
        for n in downstream
        if _GRAPH.nodes[n].get("section") not in (None, "source")
    }
    return sorted(sections)


def get_upstream_nodes(node_id: str) -> list[str]:
    """Return all nodes *upstream* (ancestors) of node_id."""
    if node_id not in _GRAPH:
        return []
    return list(nx.ancestors(_GRAPH, node_id))


def get_supplying_section(village_id: str) -> Optional[str]:
    """
    Return the section label that directly supplies a village node.

    Accepts either a node ID (e.g. 'V_B') or a village label (e.g. 'Kolvan').

    The Bayesian engine calls this when a last-gasp smart-meter signal arrives
    from a village — it identifies which section's fault could explain the
    outage.

    Returns None if the village is not found in the graph.

    Example:
        get_supplying_section("V_B")      ->  "B"
        get_supplying_section("Kolvan")   ->  "B"
        get_supplying_section("Bhira")    ->  "C"
    """
    # Resolve label -> ID if needed
    node_id = village_id if village_id in _GRAPH else _VILLAGE_LABEL_TO_ID.get(village_id)
    if node_id is None:
        return None

    node_data = _GRAPH.nodes.get(node_id, {})
    section = node_data.get("section")
    return section if section and section != "source" else None


def get_affected_villages(fault_section: str) -> list[str]:
    """
    Return the labels of villages that lose power if fault_section is faulted.

    Assumes that a fault in section X interrupts power to all villages in X
    and all villages in sections downstream of X's entry switch.

    Returns village *labels* (human-readable), not node IDs.

    Example:
        get_affected_villages("B")  ->  ["Kolvan", "Bhira"]
        get_affected_villages("A")  ->  ["Tamhini", "Kolvan", "Bhira"]
        get_affected_villages("C")  ->  ["Bhira"]
    """
    fault_section = fault_section.upper()

    # Section-to-entry-switch mapping
    section_entry: dict[str, str] = {
        "A": "SS1",
        "B": "SW1",
        "C": "SW2",
    }

    entry_node = section_entry.get(fault_section)
    if entry_node is None:
        return []

    # Nodes downstream of the entry point
    downstream = set(get_downstream_nodes(entry_node))
    # Also include nodes in the fault section itself
    downstream.update(get_section_nodes(fault_section))

    affected = []
    for nid in downstream:
        ndata = _GRAPH.nodes[nid]
        if ndata.get("node_type") == "village":
            affected.append(ndata["label"])

    # Stable output order (A->B->C village order)
    village_order = ["Tamhini", "Kolvan", "Bhira"]
    return [v for v in village_order if v in affected]


def get_nodes_between_relay_and_village(
    relay_node: str, village_node: str
) -> list[str]:
    """
    Return the ordered list of nodes on the shortest path between a relay and
    a village node.

    Useful for the Bayesian engine to determine which sections sit between a
    relay trip location and a village that reported a last-gasp event.

    Returns [] if no path exists.
    """
    try:
        path = nx.shortest_path(_GRAPH, source=relay_node, target=village_node)
        return path
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []


def get_sections_on_path(relay_node: str, village_node: str) -> list[str]:
    """
    Return unique section labels on the path from relay_node to village_node.
    """
    path = get_nodes_between_relay_and_village(relay_node, village_node)
    seen: list[str] = []
    for nid in path:
        sec = _GRAPH.nodes[nid].get("section")
        if sec and sec != "source" and sec not in seen:
            seen.append(sec)
    return seen


def get_switch_isolation_plan(fault_section: str) -> list[dict]:
    """
    Return a recommended switching plan to isolate a faulted section and
    restore downstream villages where possible.

    Each step is a dict:
        { "action": str, "switch": str, "operation": "open"|"close", "status": str }

    Feeds directly into the SwitchingStep[] the frontend already renders.

    Example:
        get_switch_isolation_plan("B")
        -> [
            {"action": "Open Switch S2",      "switch": "SW2", "operation": "open",  "status": "recommended"},
            {"action": "Close Tie Switch T4", "switch": "SW3", "operation": "close", "status": "recommended"},
            {"action": "Restore Bhira via alternate path", ...}
        ]
    """
    fault_section = fault_section.upper()

    plans: dict[str, list[dict]] = {
        "A": [
            {"action": "Open Switch S1 (isolate Section A)",   "switch": "SW1", "operation": "open",  "status": "recommended"},
            {"action": "Restore Section B via alternate feed", "switch": None,  "operation": None,    "status": "pending"},
        ],
        "B": [
            {"action": "Open Switch S2",                   "switch": "SW2", "operation": "open",  "status": "recommended"},
            {"action": "Close Tie Switch T4",              "switch": "SW3", "operation": "close", "status": "recommended"},
            {"action": "Restore Bhira via alternate path", "switch": None,  "operation": None,    "status": "pending"},
        ],
        "C": [
            {"action": "Open Tie Switch T4 (isolate Section C)", "switch": "SW3", "operation": "open", "status": "recommended"},
            {"action": "Restore Bhira once fault cleared",        "switch": None,  "operation": None,   "status": "pending"},
        ],
    }

    return plans.get(fault_section, [])


def get_transformer_for_section(section: str) -> Optional[str]:
    """Return the primary transformer node ID for a given section."""
    section_transformer: dict[str, str] = {
        "A": "T1",
        "B": "T2",
        "C": "T3",
    }
    return section_transformer.get(section.upper())


def get_section_for_node(node_id: str) -> Optional[str]:
    """Return the section label a given node belongs to, or None."""
    data = _GRAPH.nodes.get(node_id, {})
    section = data.get("section")
    return section if section != "source" else None


def get_all_villages() -> list[dict]:
    """
    Return all village nodes with their attributes.

    Returns:
        List of dicts: {id, label, section, lat, lng, powered}
    """
    result = []
    for nid, data in _GRAPH.nodes(data=True):
        if data.get("node_type") == "village":
            result.append({
                "id": nid,
                "label": data["label"],
                "section": data["section"],
                "lat": data["lat"],
                "lng": data["lng"],
                "powered": data["powered"],
            })
    return result


def get_all_switches() -> list[dict]:
    """Return all switch nodes with their attributes."""
    result = []
    for nid, data in _GRAPH.nodes(data=True):
        if data.get("node_type") == "switch":
            result.append({
                "id": nid,
                "label": data["label"],
                "section": data["section"],
                "lat": data["lat"],
                "lng": data["lng"],
            })
    return result


def graph_summary() -> dict:
    """
    Return a human-readable summary of the graph for debugging / API responses.
    """
    sections_out: dict[str, list[str]] = {}
    for sec, nids in _SECTION_NODES.items():
        if sec == "source":
            continue
        sections_out[sec] = [
            f"{nid} ({_GRAPH.nodes[nid].get('node_type')})" for nid in nids
        ]

    return {
        "total_nodes": _GRAPH.number_of_nodes(),
        "total_edges": _GRAPH.number_of_edges(),
        "sections": sections_out,
        "villages": [d["label"] for _, d in _GRAPH.nodes(data=True) if d.get("node_type") == "village"],
        "switches": [d["label"] for _, d in _GRAPH.nodes(data=True) if d.get("node_type") == "switch"],
        "transformers": [d["label"] for _, d in _GRAPH.nodes(data=True) if d.get("node_type") == "transformer"],
    }
