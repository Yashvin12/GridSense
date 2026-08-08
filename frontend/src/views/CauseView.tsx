// CauseView - cause analysis + section probabilities + evidence log

import { CauseBarList } from '../components/analysis/CauseBarList';
import { SectionProbabilities } from '../components/analysis/SectionProbabilities';
import { EvidenceLog } from '../components/evidence/EvidenceLog';
import { BeliefChart } from '../components/evidence/BeliefChart';

export function CauseView() {
  return (
    <div className="h-full grid grid-cols-[1fr_1fr] grid-rows-2 gap-3">
      {/* Cause bar list - top left */}
      <div className="row-span-1">
        <CauseBarList />
      </div>

      {/* Section probabilities - top right */}
      <div className="row-span-1">
        <SectionProbabilities />
      </div>

      {/* Belief chart - bottom left */}
      <div className="row-span-1">
        <BeliefChart />
      </div>

      {/* Evidence log - bottom right */}
      <div className="row-span-1">
        <EvidenceLog />
      </div>
    </div>
  );
}
