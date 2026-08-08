// DashboardView — 3-column: fault summary | map (focal) | evidence stream
// Map is the primary focal point; summary panel answers the 5 critical questions

import { FeederMap } from '../components/map/FeederMap';
import { FaultSummaryPanel } from '../components/dashboard/FaultSummaryPanel';
import { EvidenceLog } from '../components/evidence/EvidenceLog';
import { BeliefChart } from '../components/evidence/BeliefChart';

export function DashboardView() {
  return (
    <div className="h-full flex gap-1.5" style={{ minHeight: 0 }}>
      {/* Left panel: fault state + reasoning */}
      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: 280,
          backgroundColor: 'var(--gs-surface)',
          border: '1px solid var(--gs-border)',
          borderRadius: 3,
        }}
      >
        <FaultSummaryPanel />
      </div>

      {/* Center: map (primary) + belief chart below */}
      <div className="flex-1 flex flex-col gap-1.5" style={{ minWidth: 0 }}>
        <div className="flex-1" style={{ minHeight: 0 }}>
          <FeederMap />
        </div>
        <div style={{ height: 200, flexShrink: 0 }}>
          <BeliefChart compact />
        </div>
      </div>

      {/* Right panel: evidence stream */}
      <div className="shrink-0" style={{ width: 280 }}>
        <EvidenceLog compact />
      </div>
    </div>
  );
}
