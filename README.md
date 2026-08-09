# GridSense

**Probabilistic fault location for rural distribution feeders.**

GridSense applies Bayesian inference to streaming evidence — relay trips, smart meter last-gasp signals, voltage collapse events, weather alerts, and field crew reports — to produce a continuously-updating posterior probability of fault location and cause. The system is designed for control-room operators and field supervisors who need a defensible, evidence-grounded answer to the question: *where is the fault, and how certain are we?*

---

## What it does

When a feeder trips, GridSense:

1. **Ingests evidence** from sensors, AMI meters, weather feeds, and consumer complaints
2. **Updates a Bayesian belief** over candidate fault sections in real time
3. **Generates an optimal crew inspection route** ranked by posterior probability
4. **Closes the loop** when crew feedback arrives — new evidence updates the belief immediately

The interface is built around a single operational question: **where is the fault?** Every component supports that question; nothing is decorative.

---

## Interface

Four views, each focused on a specific operational task:

| View | Purpose |
|------|---------|
| **Overview** | Fault location · Posterior probability · Evidence chain · Impact · Recommended switching |
| **Evidence** | Belief evolution chart · Full evidence log · Live telemetry with anomaly interpretation |
| **Crew Dispatch** | Prioritised inspection route · Fault confirmation · Belief update feedback |
| **Cause Analysis** | Fault cause posterior · Supporting evidence strength · Competing hypotheses · Sensitivity |

### Design principles

- Every percentage is explicitly labeled — `91% posterior probability`, `74% cause probability`, `91% inspection priority` — never a naked number
- Evidence strength is qualitative (`Very strong`, `Strong`, `Moderate`) — not pseudo-quantitative posterior deltas
- The belief evolution chart annotates the evidence events that caused each probability shift
- Telemetry shows contextual deviation from baseline (`24% below nominal`) not just raw values
- Crew feedback visibly updates the belief: `Section B: 91% → 96%`
- Colors are strictly semantic: red = fault / danger, amber = warning / uncertainty, green = healthy, blue = telemetry / informational

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + custom CSS design tokens |
| Charts | Recharts |
| Map | Leaflet + react-leaflet (CartoDB dark tiles) |
| Fonts | IBM Plex Sans (UI) · IBM Plex Mono (data, timestamps, identifiers) |
| State | React Context + useReducer |

---

## Project structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── analysis/       # CauseBarList, SectionProbabilities
│   │   ├── crew/           # InspectionStops
│   │   ├── dashboard/      # FaultSummaryPanel, WhyThisLocation
│   │   ├── evidence/       # BeliefChart, EvidenceLog, TelemetryChart
│   │   ├── layout/         # TopBar, Sidebar
│   │   ├── map/            # FeederMap (Leaflet)
│   │   └── shared/         # AnimatedNumber, ProbabilityBar, StatusDot
│   ├── context/
│   │   └── GridContext.tsx  # Global state — single source of truth
│   ├── data/
│   │   ├── mockData.ts      # Scenario data, feeder topology, evidence log
│   │   └── mockEngine.ts    # Bayesian update simulation
│   ├── views/               # DashboardView, EvidenceView, CrewView, CauseView
│   └── index.css            # Design system tokens
```

---

## Getting started

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

The mock scenario simulates a fault on **Mulshi 33kV Feeder 1** near Pune, Maharashtra. Section B (Poles 43–46) holds 91% posterior probability. Evidence arrives between 14:22 and 14:26 in the scenario timeline.

---

## Scenario

```
Mulshi 33kV Substation
  │
  ├── Section A  (Poles 40–42)  ─── Tamhini      [Energized · 3% posterior]
  │
  ├── Section B  (Poles 43–46)  ─── Kolvan       [FAULT ZONE · 91% posterior]
  │         DTR-2 (63kVA)
  │
  └── Section C  (Poles 47–49)  ─── Bhira        [Downstream · 6% posterior]
```

**Evidence sequence:**

| Time | Event | Effect |
|------|-------|--------|
| 14:22:15 | Overcurrent relay trip — Mulshi Substation | Very strong → Section B |
| 14:22:18 | Last-gasp signals — Kolvan (14 meters) | Strong → Section B |
| 14:22:20 | Last-gasp signals — Bhira (8 meters) | Moderate → Section C |
| 14:23:01 | Voltage collapse — DTR-2 | Strong → Section B |
| 14:23:45 | High wind detected — Pole 43–46 corridor | Strong → Vegetation contact |
| 14:24:12 | Consumer complaints — Kolvan (3 reports) | Moderate → Section B |
| 14:25:00 | Transformer temperature spike — DTR-2 (89°C) | Moderate → Transformer overload |
| 14:26:30 | Current near zero — Section B conductors | Strong → Section B |

---

## Probable cause

**Vegetation Contact — 74% cause probability**

Supporting evidence: high wind along the Pole 43–46 corridor (very strong), fault topology matching tree-contact pattern (strong), voltage collapse at DTR-2 (strong), consumer outage reports from Kolvan (moderate).

---

## Key implementation notes

### Bayesian engine (mockEngine.ts)

The mock engine implements simplified Bayesian-style updates. When crew confirms a fault at a location, the posterior for that section increases toward certainty and other sections are suppressed proportionally. When crew clears a location, probability mass is redistributed. In production this would be replaced by a FastAPI backend running the full inference model.

### Timestamp consistency

All timestamps — evidence log, belief history, telemetry, header — are anchored to the same scenario timeline (14:22–14:26 IST on 2026-08-08). The belief chart X-axis shows scenario times, not wall-clock times.

### Data semantics

Evidence contributions are expressed as qualitative strength labels (`Very strong`, `Strong`, `Moderate`, `Weak`) — not as percentage-point posterior changes. This is intentional: the precise posterior delta depends on the full joint distribution and cannot be meaningfully attributed to individual evidence items in isolation.

---

## Roadmap

- [ ] FastAPI backend — real inference engine replacing mock
- [ ] WebSocket connection for live sensor feed
- [ ] Crew mobile app integration (GPS-triggered stop confirmation)
- [ ] Historical fault database and learning
- [ ] Multi-feeder view with network-level switching optimisation
- [ ] Export: fault report PDF, switching log
