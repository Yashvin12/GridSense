// DashboardView — 3-column: fault summary | map (focal) | evidence stream
// Left panel is the reasoning layer. Map is spatial context. Right is the evidence feed.

import { FeederMap } from '../components/map/FeederMap';
import { FaultSummaryPanel } from '../components/dashboard/FaultSummaryPanel';
import { EvidenceLog } from '../components/evidence/EvidenceLog';
import { BeliefChart } from '../components/evidence/BeliefChart';

export function DashboardView() {
  return (
    <div className="h-full flex gap-1.5" style={{ minHeight: 0 }}>
      {/* Left panel: fault state + reasoning — no extra card wrapper */}
      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: 300,
          borderRight: '1px solid var(--gs-border)',
        }}
      >
        <FaultSummaryPanel />
      </div>

      {/* Center: map (primary) + belief chart strip below */}
      <div className="flex-1 flex flex-col gap-1.5" style={{ minWidth: 0 }}>
        <div className="flex-1" style={{ minHeight: 0 }}>
          <FeederMap />
        </div>
        <div style={{ height: 180, flexShrink: 0 }}>
          <BeliefChart compact />
        </div>
      </div>

      {/* Right panel: evidence stream */}
      <div className="shrink-0" style={{ width: 264, borderLeft: '1px solid var(--gs-border)' }}>
        <EvidenceLog compact />
      </div>
    </div>
  );
}
