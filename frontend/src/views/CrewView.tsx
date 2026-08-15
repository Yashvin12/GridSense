// CrewView — responsive field-crew workspace
// Desktop: inspection stops (left, dominant) + belief chart + map (right column)
// Mobile: single column — assignments first, map, belief below
// Uses CSS classes from index.css for responsive behavior (no JS breakpoints).

import { InspectionStops } from '../components/crew/InspectionStops';
import { FeederMap } from '../components/map/FeederMap';
import { BeliefChart } from '../components/evidence/BeliefChart';

export function CrewView() {
  return (
    <div className="gs-crew-layout">
      {/* Left / top on mobile: inspection stops — primary operational panel */}
      <div
        className="gs-panel gs-crew-left"
        style={{ padding: 0 }}
      >
        <InspectionStops />
      </div>

      {/* Right / bottom on mobile: belief chart + map */}
      <div className="gs-crew-right">
        {/* Belief evolution — secondary on both desktop and mobile */}
        <div
          className="gs-panel gs-crew-belief"
          style={{ padding: 0, display: 'flex', flexDirection: 'column' }}
        >
          <BeliefChart compact />
        </div>

        {/* Map — field navigation reference */}
        <div className="gs-crew-map">
          <FeederMap compact />
        </div>
      </div>
    </div>
  );
}
