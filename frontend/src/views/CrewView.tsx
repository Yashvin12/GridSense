// CrewView - inspection stops + mini route map

import { InspectionStops } from '../components/crew/InspectionStops';
import { FeederMap } from '../components/map/FeederMap';
import { BeliefChart } from '../components/evidence/BeliefChart';

export function CrewView() {
  return (
    <div className="h-full grid grid-cols-[1fr_1fr] grid-rows-[1fr_280px] gap-3">
      {/* Inspection stops - left column, full height */}
      <div className="row-span-2">
        <InspectionStops />
      </div>

      {/* Belief chart - top right (shows the live update when crew confirms) */}
      <div className="row-span-1">
        <BeliefChart />
      </div>

      {/* Mini map - bottom right */}
      <div className="row-span-1">
        <div className="grid-card h-full p-0 overflow-hidden">
          <FeederMap compact />
        </div>
      </div>
    </div>
  );
}
