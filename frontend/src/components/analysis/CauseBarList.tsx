// CauseBarList — cause analysis with supporting evidence contributions
// Top cause gets expanded treatment, competitors shown as compact bars

import { useGrid } from '../../context/GridContext';
import { ProbabilityBar } from '../shared/ProbabilityBar';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { causeEvidenceMap } from '../../data/mockData';

export function CauseBarList() {
  const { state } = useGrid();
  const { causes } = state;

  const topCause = causes[0];
  const competitors = causes.slice(1);

  return (
    <div className="gs-panel h-full flex flex-col">
      <div className="gs-section-label mb-3">Cause Analysis</div>

      {/* ═══════ Top cause — expanded ═══════ */}
      {topCause && (
        <div className="mb-4">
          <div className="text-base font-semibold text-[var(--gs-text)] mb-1">
            {topCause.label}
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <AnimatedNumber
              value={topCause.probability * 100}
              suffix="%"
              decimals={0}
              className="text-2xl font-bold"
            />
            <span className="gs-section-label" style={{ color: 'var(--gs-amber)' }}>
              Posterior Probability
            </span>
          </div>

          {/* Supporting evidence */}
          <div className="mb-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--gs-text-tertiary)' }}>
              Supporting evidence:
            </span>
          </div>
          <div className="space-y-1">
            {(causeEvidenceMap[topCause.label] || []).map((ev, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[11px]" style={{ color: 'var(--gs-text-secondary)' }}>
                  {ev.description}
                </span>
                {ev.contribution > 0 && (
                  <span className="font-mono text-[10px] font-medium shrink-0"
                    style={{ color: 'var(--gs-amber)' }}
                  >
                    +{ev.contribution}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gs-divider" />

      {/* ═══════ Competing hypotheses ═══════ */}
      <div className="mt-3">
        <div className="text-[10px] font-medium mb-2" style={{ color: 'var(--gs-text-tertiary)' }}>
          Competing hypotheses:
        </div>
        <div className="space-y-3">
          {competitors.map((cause) => (
            <ProbabilityBar
              key={cause.label}
              value={cause.probability}
              label={cause.label}
              showValue={true}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}
