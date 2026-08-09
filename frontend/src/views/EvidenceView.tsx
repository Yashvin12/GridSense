// EvidenceView — belief chart (top) + evidence stream (bottom-left) + telemetry (bottom-right)
// Containers provide panel surface; individual components are borderless inside

import { TelemetryChart } from '../components/evidence/TelemetryChart';
import { BeliefChart } from '../components/evidence/BeliefChart';
import { EvidenceLog } from '../components/evidence/EvidenceLog';

export function EvidenceView() {
  return (
    <div className="h-full flex flex-col gap-1.5" style={{ minHeight: 0 }}>
      {/* Belief chart — signature component, top section */}
      <div
        className="gs-panel"
        style={{ flex: '1 1 55%', minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column' }}
      >
        <BeliefChart />
      </div>

      {/* Bottom: evidence stream + telemetry side by side */}
      <div className="flex gap-1.5" style={{ flex: '1 1 45%', minHeight: 0 }}>
        <div
          className="gs-panel"
          style={{ flex: '1 1 55%', minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}
        >
          <EvidenceLog />
        </div>
        <div
          className="gs-panel"
          style={{ flex: '1 1 45%', minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}
        >
          <TelemetryChart />
        </div>
      </div>
    </div>
  );
}
