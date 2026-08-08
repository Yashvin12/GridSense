// CauseView — cause analysis (left-top) + section probabilities (right-top) +
// belief chart (left-bottom) + evidence log (right-bottom)

import { CauseBarList } from '../components/analysis/CauseBarList';
import { SectionProbabilities } from '../components/analysis/SectionProbabilities';
import { EvidenceLog } from '../components/evidence/EvidenceLog';
import { BeliefChart } from '../components/evidence/BeliefChart';

export function CauseView() {
  return (
    <div className="h-full flex flex-col gap-1.5" style={{ minHeight: 0 }}>
      {/* Top row: cause analysis + section probabilities */}
      <div className="flex gap-1.5" style={{ flex: '1 1 50%', minHeight: 0 }}>
        <div style={{ flex: '1 1 50%', minWidth: 0 }}>
          <CauseBarList />
        </div>
        <div style={{ flex: '1 1 50%', minWidth: 0 }}>
          <SectionProbabilities />
        </div>
      </div>

      {/* Bottom row: belief chart + evidence log */}
      <div className="flex gap-1.5" style={{ flex: '1 1 50%', minHeight: 0 }}>
        <div style={{ flex: '1 1 55%', minWidth: 0 }}>
          <BeliefChart />
        </div>
        <div style={{ flex: '1 1 45%', minWidth: 0 }}>
          <EvidenceLog />
        </div>
      </div>
    </div>
  );
}
