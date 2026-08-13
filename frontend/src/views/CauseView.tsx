// CauseView — page purpose: "Why does the system believe this cause?"
// Primary: CauseBarList (cause + evidence + competing hypotheses)
// Secondary: SectionProbabilities (location reference)
// Tertiary: compact belief trend + cause-specific evidence (compact references, NOT full panels)
// Layout: cause analysis dominates. Bottom row is subordinate context only.

import { CauseBarList } from '../components/analysis/CauseBarList';
import { SectionProbabilities } from '../components/analysis/SectionProbabilities';
import { BeliefSummaryCompact } from '../components/analysis/BeliefSummaryCompact';

export function CauseView() {
  return (
    <div className="h-full flex flex-col gap-1.5" style={{ minHeight: 0 }}>
      {/* Top row: cause analysis (dominant) + section probabilities (secondary reference) */}
      <div className="flex gap-1.5" style={{ flex: '1 1 0', minHeight: 0 }}>
        {/* CauseBarList — cause is the primary answer on this page */}
        <div style={{ flex: '1 1 60%', minWidth: 0 }}>
          <CauseBarList />
        </div>
        {/* SectionProbabilities — location reference, subordinate */}
        <div style={{ flex: '1 1 40%', minWidth: 0 }}>
          <SectionProbabilities />
        </div>
      </div>

      {/* Bottom row: compact belief trend — subordinate context, not a full analytics panel */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--gs-border)',
          padding: '10px 0 6px',
        }}
      >
        <BeliefSummaryCompact />
      </div>
    </div>
  );
}
