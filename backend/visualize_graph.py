"""
visualize_graph.py
==================
GridSense — Feeder Knowledge Graph Visualizer
Mulshi 33kV Feeder, Pune district, Maharashtra

Renders the NetworkX topology as a publication-quality map image.
Positions nodes using their real lat/lng coordinates so the layout
matches the actual geography.

Usage:
    cd backend
    python visualize_graph.py               # saves feeder_graph.png
    python visualize_graph.py --show        # also pops up an interactive window
    python visualize_graph.py --fault B     # highlights fault zone (A / B / C)

Output:
    backend/feeder_graph.png
"""

import argparse
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")          # headless by default; --show switches to TkAgg
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import networkx as nx

# ---------------------------------------------------------------------------
# Make sure app/ is importable regardless of working directory
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).parent))
from app.feeder_graph import get_graph, get_node_attr

# ===========================================================================
# Style constants
# ===========================================================================

# Node colours by type
TYPE_COLORS = {
    "substation":  "#facc15",   # gold
    "pole":        "#94a3b8",   # slate
    "transformer": "#fb923c",   # orange
    "switch":      "#60a5fa",   # blue
    "village":     "#4ade80",   # green
    "meter":       "#c084fc",   # purple
}

# Section fault state colours (border / glow)
SECTION_FAULT_COLOR = {
    "A": "#3fb950",   # green  — healthy
    "B": "#f85149",   # red    — fault zone
    "C": "#d29922",   # amber  — downstream / affected
    "source": "#facc15",
}

EDGE_COLORS = {
    "connected_to": "#475569",
    "supplies":     "#22d3ee",
}

NODE_SIZES = {
    "substation":  900,
    "transformer": 700,
    "switch":      550,
    "village":     650,
    "pole":        320,
    "meter":       250,
}

NODE_SHAPES = {
    "substation":  "s",   # square
    "transformer": "D",   # diamond
    "switch":      "^",   # triangle
    "village":     "o",   # circle
    "pole":        "o",
    "meter":       "o",
}

FONT = "DejaVu Sans"


# ===========================================================================
# Build geographic position dict
# ===========================================================================

def get_geo_positions(G: nx.DiGraph) -> dict:
    """
    Map node IDs to (lng, lat) plot coordinates.
    Using lng as x and lat as y gives a West→East left-to-right layout.
    We flip lat so North is up.
    """
    pos = {}
    for nid, data in G.nodes(data=True):
        lng = data.get("lng", 0)
        lat = data.get("lat", 0)
        pos[nid] = (lng, lat)
    return pos


# ===========================================================================
# Draw
# ===========================================================================

def draw(fault_section: str | None = None, show: bool = False, out: str = "feeder_graph.png"):
    G = get_graph()
    pos = get_geo_positions(G)

    fig, ax = plt.subplots(figsize=(18, 10))
    fig.patch.set_facecolor("#0d1117")   # GitHub dark background
    ax.set_facecolor("#0d1117")

    # ── Draw edges first (so nodes sit on top) ──────────────────────────────
    for u, v, data in G.edges(data=True):
        etype = data.get("edge_type", "connected_to")
        color = EDGE_COLORS.get(etype, "#475569")
        style = "--" if etype == "supplies" else "-"
        lw    = 1.4 if etype == "supplies" else 2.0

        x_vals = [pos[u][0], pos[v][0]]
        y_vals = [pos[u][1], pos[v][1]]
        ax.plot(x_vals, y_vals, color=color, linewidth=lw,
                linestyle=style, alpha=0.7, zorder=1)

    # ── Group nodes by type for batch scatter draws ─────────────────────────
    by_type: dict[str, list[str]] = {}
    for nid, data in G.nodes(data=True):
        t = data.get("node_type", "pole")
        by_type.setdefault(t, []).append(nid)

    for ntype, nids in by_type.items():
        xs = [pos[n][0] for n in nids]
        ys = [pos[n][1] for n in nids]

        # Determine border colour per node (section-based fault state)
        edge_colors = []
        for nid in nids:
            sec = get_node_attr(nid).get("section", "source")
            if fault_section and sec == fault_section.upper():
                edge_colors.append("#f85149")   # red ring = fault zone
            else:
                edge_colors.append(SECTION_FAULT_COLOR.get(sec, "#475569"))

        # Marker fill
        face_color = TYPE_COLORS.get(ntype, "#94a3b8")
        size       = NODE_SIZES.get(ntype, 300)
        marker     = NODE_SHAPES.get(ntype, "o")

        ax.scatter(xs, ys,
                   c=face_color,
                   s=size,
                   marker=marker,
                   edgecolors=edge_colors,
                   linewidths=2.5,
                   zorder=3,
                   alpha=0.95)

    # ── Labels ───────────────────────────────────────────────────────────────
    label_offsets = {
        "substation":  (0.0005, 0.0008),
        "village":     (0.0005, 0.0008),
        "transformer": (0.0005, -0.0010),
        "switch":      (-0.0005, 0.0008),
        "pole":        (0.0003, 0.0006),
    }

    for nid, data in G.nodes(data=True):
        ntype = data.get("node_type", "pole")
        label = data.get("label", nid)
        x, y  = pos[nid]
        dx, dy = label_offsets.get(ntype, (0.0003, 0.0006))

        # Shorten pole labels for readability
        short = label.replace("DTR-", "T").replace("Switch S", "S").replace("Tie Switch T", "TieT")
        if ntype == "pole":
            short = label  # keep "Pole 44" etc.

        fontsize = 7 if ntype == "pole" else 8
        weight   = "bold" if ntype in ("substation", "village", "transformer") else "normal"
        color    = "#e6edf3" if ntype != "village" else "#4ade80"

        ax.annotate(short,
                    xy=(x, y),
                    xytext=(x + dx, y + dy),
                    fontsize=fontsize,
                    fontfamily=FONT,
                    color=color,
                    fontweight=weight,
                    zorder=4)

    # ── Section region labels ─────────────────────────────────────────────────
    section_centers = {
        "A": (73.474, 18.507),
        "B": (73.487, 18.498),
        "C": (73.500, 18.490),
    }
    section_labels = {
        "A": "SECTION A\n(Healthy)",
        "B": "SECTION B\n(Fault Zone ⚡)",
        "C": "SECTION C\n(Downstream)",
    }
    for sec, (sx, sy) in section_centers.items():
        clr = SECTION_FAULT_COLOR.get(sec, "#ffffff")
        ax.text(sx, sy, section_labels[sec],
                fontsize=9, fontfamily=FONT, fontweight="bold",
                color=clr, alpha=0.35,
                ha="center", va="center", zorder=2,
                bbox=dict(boxstyle="round,pad=0.3", facecolor=clr, alpha=0.06, edgecolor="none"))

    # ── Power flow direction arrows ─────────────────────────────────────────
    flow_segments = [
        ("SS1", "P40"), ("SW1", "P43"), ("SW2", "P46"),
    ]
    for u, v in flow_segments:
        if u in pos and v in pos:
            ux, uy = pos[u]
            vx, vy = pos[v]
            mx, my = (ux + vx) / 2, (uy + vy) / 2
            ax.annotate("",
                        xy=(mx + (vx-ux)*0.01, my + (vy-uy)*0.01),
                        xytext=(mx - (vx-ux)*0.01, my - (vy-uy)*0.01),
                        arrowprops=dict(arrowstyle="-|>", color="#6b7280",
                                        lw=1.5, mutation_scale=14),
                        zorder=5)

    # ── Legend ────────────────────────────────────────────────────────────────
    legend_handles = []
    type_labels = {
        "substation":  "Substation",
        "transformer": "Transformer (DTR)",
        "switch":      "Switch",
        "village":     "Village",
        "pole":        "Pole",
    }
    for ntype, label in type_labels.items():
        legend_handles.append(
            mpatches.Patch(facecolor=TYPE_COLORS[ntype], edgecolor="#475569",
                           label=label, linewidth=1)
        )
    legend_handles += [
        mpatches.Patch(facecolor="none", edgecolor="#3fb950", linewidth=2, label="Section A — Healthy"),
        mpatches.Patch(facecolor="none", edgecolor="#f85149", linewidth=2, label="Section B — Fault Zone"),
        mpatches.Patch(facecolor="none", edgecolor="#d29922", linewidth=2, label="Section C — Downstream"),
        mpatches.Patch(facecolor="#475569", edgecolor="none", label="Power line (connected_to)"),
        mpatches.Patch(facecolor="#22d3ee", edgecolor="none", label="Supply edge (supplies)"),
    ]
    legend = ax.legend(
        handles=legend_handles,
        loc="lower left",
        framealpha=0.15,
        facecolor="#161b22",
        edgecolor="#30363d",
        labelcolor="#e6edf3",
        fontsize=8,
        title="Mulshi 33kV Feeder",
        title_fontsize=9,
    )
    legend.get_title().set_color("#58a6ff")

    # ── Titles & axis ────────────────────────────────────────────────────────
    fault_note = f" | Active fault: Section {fault_section.upper()}" if fault_section else ""
    ax.set_title(
        f"GridSense — Feeder Knowledge Graph{fault_note}\n"
        f"Mulshi 33kV Feeder · Pune, Maharashtra · PS-B13",
        color="#e6edf3", fontsize=13, fontfamily=FONT, fontweight="bold", pad=14
    )
    ax.set_xlabel("Longitude →", color="#6b7280", fontsize=8)
    ax.set_ylabel("Latitude ↑", color="#6b7280", fontsize=8)
    ax.tick_params(colors="#6b7280", labelsize=7)
    for spine in ax.spines.values():
        spine.set_edgecolor("#30363d")

    # ── Node count stats watermark ────────────────────────────────────────────
    stats = (f"{G.number_of_nodes()} nodes · "
             f"{G.number_of_edges()} edges · "
             f"3 sections · 3 villages · 3 transformers · 3 switches")
    ax.text(0.98, 0.01, stats,
            transform=ax.transAxes, fontsize=7, color="#484f58",
            ha="right", va="bottom", fontfamily=FONT)

    plt.tight_layout()

    # ── Save ─────────────────────────────────────────────────────────────────
    out_path = Path(__file__).parent / out
    plt.savefig(out_path, dpi=180, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    print(f"[SUCCESS] Graph saved -> {out_path.resolve()}")

    if show:
        matplotlib.use("TkAgg")
        plt.show()

    plt.close()


# ===========================================================================
# CLI
# ===========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render GridSense feeder graph")
    parser.add_argument("--show",  action="store_true", help="Open interactive window after saving")
    parser.add_argument("--fault", metavar="SECTION",  help="Highlight a fault section (A / B / C)")
    parser.add_argument("--out",   default="feeder_graph.png", help="Output filename (default: feeder_graph.png)")
    args = parser.parse_args()

    draw(fault_section=args.fault, show=args.show, out=args.out)
