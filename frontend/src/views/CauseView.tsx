// CauseView — page purpose: "Why does the system believe this cause?"
// Primary: CauseBarList (cause + evidence + competing hypotheses)
// Secondary: SectionProbabilities (location reference)
// Tertiary: BeliefChart + EvidenceLog (context layer, clearly subordinate)
// Layout proportions reflect information hierarchy: cause dominates.

import { CauseBarList } from '../components/analysis/CauseBarList';
import { SectionProbabilities } from '../components/analysis/SectionProbabilities';
import { EvidenceLog } from '../components/evidence/EvidenceLog';
import { BeliefChart } from '../components/evidence/BeliefChart';

export function CauseView() {
  return (
    <div className="h-full flex flex-col gap-1.5" style={{ minHeight: 0 }}>
      {/* Top row: cause analysis (dominant) + section probabilities (secondary reference) */}
      <div className="flex gap-1.5" style={{ flex: '1 1 58%', minHeight: 0 }}>
        {/* CauseBarList — cause is the primary answer on this page */}
        <div style={{ flex: '1 1 60%', minWidth: 0 }}>
          <CauseBarList />
        </div>
        {/* SectionProbabilities — location reference, subordinate */}
        <div style={{ flex: '1 1 40%', minWidth: 0 }}>
          <SectionProbabilities />
        </div>
      </div>

      {/* Bottom row: belief evolution + evidence — context layer, clearly secondary */}
      <div className="flex gap-1.5" style={{ flex: '1 1 42%', minHeight: 0 }}>
        <div
          className="gs-panel"
          style={{ flex: '1 1 58%', minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}
        >
          <BeliefChart />
        </div>
        <div
          className="gs-panel"
          style={{ flex: '1 1 42%', minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}
        >
          <EvidenceLog />
        </div>
      </div>
    </div>
  );
}
