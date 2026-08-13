// EvidenceView — belief chart (top, supporting) + evidence stream (bottom, dominant)
// Primary question: "These observations are what caused the probability to change."
// Stream must dominate: it is the evidence. Chart is the visual summary.

import { TelemetryChart } from '../components/evidence/TelemetryChart';
import { BeliefChart } from '../components/evidence/BeliefChart';
import { EvidenceLog } from '../components/evidence/EvidenceLog';

export function EvidenceView() {
  return (
    <div className="h-full flex flex-col gap-1.5" style={{ minHeight: 0 }}>
      {/* Belief chart — supporting context, not the primary answer */}
      <div
        className="gs-panel"
        style={{ flex: '0 0 38%', minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column' }}
      >
        <BeliefChart />
      </div>

      {/* Bottom: evidence stream + telemetry — the primary content on this page */}
      <div className="flex gap-1.5" style={{ flex: '1 1 0', minHeight: 0 }}>
        <div
          className="gs-panel"
          style={{ flex: '1 1 58%', minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}
        >
          <EvidenceLog />
        </div>
        <div
          className="gs-panel"
          style={{ flex: '1 1 42%', minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}
        >
          <TelemetryChart />
        </div>
      </div>
    </div>
  );
}
