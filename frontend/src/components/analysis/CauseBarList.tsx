// CauseBarList — cause analysis with supporting evidence
// Top cause gets expanded treatment with qualitative evidence strength labels
// Competitors shown as compact bars
// "What would change this?" section explains probabilistic nature of the model

import { useGrid } from '../../context/GridContext';
import { ProbabilityBar } from '../shared/ProbabilityBar';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { causeEvidenceMap, whatWouldChangeBelief } from '../../data/mockData';

const strengthColors: Record<string, string> = {
  very_strong: 'var(--gs-red)',
  strong:      'var(--gs-amber)',
  moderate:    'var(--gs-text-secondary)',
  weak:        'var(--gs-text-tertiary)',
  none:        'var(--gs-text-tertiary)',
};

const strengthLabels: Record<string, string> = {
  very_strong: 'Very strong',
  strong:      'Strong',
  moderate:    'Moderate',
  weak:        'Weak',
  none:        'None',
};

export function CauseBarList() {
  const { state } = useGrid();
  const { causes } = state;

  const topCause = causes[0];
  const competitors = causes.slice(1);

  return (
    <div className="gs-panel h-full flex flex-col overflow-y-auto custom-scrollbar">

      {/* ═══════ Top cause — expanded ═══════ */}
      {topCause && (
        <div className="mb-0">
          <div className="gs-section-label mb-1">Cause analysis</div>
          <div className="text-sm font-semibold text-[var(--gs-text)] mt-2">
            {topCause.label}
          </div>

          {/* Cause probability — explicitly labeled */}
          <div className="flex items-baseline gap-2 mt-1 mb-3">
            <AnimatedNumber
              value={topCause.probability * 100}
              suffix="%"
              decimals={0}
              className="text-2xl font-bold"
            />
            <span className="gs-section-label" style={{ color: 'var(--gs-amber)' }}>
              Cause probability
            </span>
          </div>

          {/* Supporting evidence — qualitative strength, not posterior deltas */}
          <div className="gs-section-label mb-1.5" style={{ fontSize: 9 }}>Supporting evidence</div>
          <div className="space-y-1.5">
            {(causeEvidenceMap[topCause.label] || []).map((ev, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <span className="text-[11px] leading-snug" style={{ color: 'var(--gs-text-secondary)' }}>
                  {ev.description}
                </span>
                <span
                  className="text-[10px] font-semibold shrink-0"
                  style={{ color: strengthColors[ev.strength] }}
                >
                  {strengthLabels[ev.strength]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gs-divider my-3" />

      {/* ═══════ Competing hypotheses ═══════ */}
      <div>
        <div className="gs-section-label mb-2">Competing hypotheses</div>
        <div className="space-y-3">
          {competitors.map((cause) => (
            <div key={cause.label}>
              <ProbabilityBar
                value={cause.probability}
                label={cause.label}
                showValue={true}
                compact
              />
              <div className="text-[9px] mt-0.5" style={{ color: 'var(--gs-text-tertiary)' }}>
                Cause probability
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="gs-divider my-3" />

      {/* ═══════ What would change this belief? ═══════ */}
      <div>
        <div className="gs-section-label mb-1.5">What would change this belief?</div>
        <div className="space-y-1.5">
          {whatWouldChangeBelief.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-[10px] shrink-0 mt-px" style={{ color: 'var(--gs-text-tertiary)' }}>·</span>
              <span className="text-[11px] leading-snug" style={{ color: 'var(--gs-text-secondary)' }}>
                {item}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] italic" style={{ color: 'var(--gs-text-tertiary)' }}>
          GridSense is probabilistic — beliefs update as new evidence arrives.
        </div>
      </div>

    </div>
  );
}
