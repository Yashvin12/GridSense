// EvidenceView — belief chart (top) + evidence stream (bottom-left) + telemetry (bottom-right)

import { TelemetryChart } from '../components/evidence/TelemetryChart';
import { BeliefChart } from '../components/evidence/BeliefChart';
import { EvidenceLog } from '../components/evidence/EvidenceLog';

export function EvidenceView() {
  return (
    <div className="h-full flex flex-col gap-1.5" style={{ minHeight: 0 }}>
      {/* Belief chart — star feature, top, 55% height */}
      <div style={{ flex: '1 1 55%', minHeight: 0 }}>
        <BeliefChart />
      </div>

      {/* Bottom: evidence stream + telemetry side by side */}
      <div className="flex gap-1.5" style={{ flex: '1 1 45%', minHeight: 0 }}>
        <div style={{ flex: '1 1 55%', minWidth: 0 }}>
          <EvidenceLog />
        </div>
        <div style={{ flex: '1 1 45%', minWidth: 0 }}>
          <TelemetryChart />
        </div>
      </div>
    </div>
  );
}
