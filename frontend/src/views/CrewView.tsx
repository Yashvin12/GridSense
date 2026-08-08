// CrewView — inspection stops (left, dominant) + belief chart (right-top) + map (right-bottom)

import { InspectionStops } from '../components/crew/InspectionStops';
import { FeederMap } from '../components/map/FeederMap';
import { BeliefChart } from '../components/evidence/BeliefChart';

export function CrewView() {
  return (
    <div className="h-full flex gap-1.5" style={{ minHeight: 0 }}>
      {/* Left: inspection stops — primary */}
      <div style={{ flex: '1 1 50%', minWidth: 0 }}>
        <InspectionStops />
      </div>

      {/* Right column: belief chart + map */}
      <div className="flex flex-col gap-1.5" style={{ flex: '1 1 50%', minWidth: 0 }}>
        <div style={{ flex: '1 1 55%', minHeight: 0 }}>
          <BeliefChart compact />
        </div>
        <div style={{ flex: '1 1 45%', minHeight: 0 }}>
          <FeederMap compact />
        </div>
      </div>
    </div>
  );
}
