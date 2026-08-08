// EvidenceView - telemetry charts + belief evolution + evidence log

import { TelemetryChart } from '../components/evidence/TelemetryChart';
import { BeliefChart } from '../components/evidence/BeliefChart';
import { EvidenceLog } from '../components/evidence/EvidenceLog';

export function EvidenceView() {
  return (
    <div className="h-full grid grid-cols-[1fr_320px] grid-rows-2 gap-3">
      {/* Belief chart - star feature, top left */}
      <div className="row-span-1">
        <BeliefChart />
      </div>

      {/* Evidence log - right column, full height */}
      <div className="row-span-2">
        <EvidenceLog />
      </div>

      {/* Telemetry charts - bottom left */}
      <div className="row-span-1">
        <TelemetryChart />
      </div>
    </div>
  );
}
