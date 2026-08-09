// CauseBarList — cause analysis with left-rail evidence structure
// Primary question: WHY DOES GRIDSENSE BELIEVE THIS IS THE MOST LIKELY CAUSE?
// Top cause: prominent but not a KPI card.
// Supporting evidence: left-rail structured list with strength semantic color.
// Competing hypotheses: tabular comparison — name + bar + percentage.
// "What would change this?" section: plain list, intellectually honest.

import { useGrid } from '../../context/GridContext';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { causeEvidenceMap, whatWouldChangeBelief } from '../../data/mockData';

// Strength → semantic color (matches EvidenceLog)
const strengthColors: Record<string, string> = {
  very_strong: 'var(--gs-red)',
  strong:      'var(--gs-amber)',
  moderate:    'var(--gs-text-tertiary)',
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

// Rail dot size/color per strength
const railDotColors: Record<string, string> = {
  very_strong: 'var(--gs-red)',
  strong:      'var(--gs-amber)',
  moderate:    'rgba(110,118,129,0.45)',
  weak:        'rgba(110,118,129,0.25)',
  none:        'rgba(110,118,129,0.15)',
};

// Color for competing hypothesis bars — scale by probability
function hypothesisBarColor(prob: number): string {
  if (prob > 0.7) return 'var(--gs-red)';
  if (prob > 0.2) return 'var(--gs-amber)';
  return 'rgba(110,118,129,0.5)';
}

export function CauseBarList() {
  const { state } = useGrid();
  const { causes, sectionProbabilities } = state;

  const topCause = causes[0];
  const competitors = causes.slice(1);
  const maxCompetitorProb = Math.max(...competitors.map(c => c.probability), 0.01);

  // Top section probability for the "FAULT LOCATION" reference line
  const topSection = [...sectionProbabilities].sort((a, b) => b.probability - a.probability)[0];

  return (
    <div className="gs-panel h-full flex flex-col overflow-y-auto custom-scrollbar">

      {/* ═══════ Page context: CAUSE ANALYSIS ═══════ */}
      <div style={{ marginBottom: 16 }}>
        <div className="gs-section-label" style={{ marginBottom: 6 }}>Cause analysis</div>

        {topCause && (
          <>
            {/* Leading cause — primary answer */}
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--gs-text)',
                letterSpacing: '-0.01em',
                marginBottom: 4,
              }}
            >
              {topCause.label}
            </div>

            {/* Cause probability */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
              <span
                className="font-mono font-bold tabular-nums"
                style={{ fontSize: 24, color: 'var(--gs-amber)', lineHeight: 1 }}
              >
                <AnimatedNumber
                  value={topCause.probability * 100}
                  suffix="%"
                  decimals={0}
                />
              </span>
              <span
                className="gs-section-label"
                style={{ color: 'var(--gs-text-tertiary)', fontSize: 9 }}
              >
                FAULT CAUSE PROBABILITY
              </span>
            </div>

            {/* Fault location reference — clearly distinguished from cause probability */}
            {topSection && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                  paddingTop: 6,
                  borderTop: '1px solid var(--gs-border)',
                }}
              >
                <span
                  className="font-mono"
                  style={{ fontSize: 10, color: 'var(--gs-text-tertiary)', letterSpacing: '0.04em' }}
                >
                  FAULT LOCATION
                </span>
                <span style={{ color: 'var(--gs-text-tertiary)', fontSize: 10 }}>·</span>
                <span
                  className="font-mono font-semibold"
                  style={{ fontSize: 10, color: 'var(--gs-text-secondary)' }}
                >
                  Section {topSection.section}
                </span>
                <span style={{ color: 'var(--gs-text-tertiary)', fontSize: 10 }}>·</span>
                <span
                  className="font-mono font-bold tabular-nums"
                  style={{ fontSize: 10, color: 'var(--gs-red)' }}
                >
                  <AnimatedNumber value={topSection.probability * 100} decimals={0} suffix="%" />
                </span>
                <span
                  style={{ fontSize: 9, color: 'var(--gs-text-tertiary)', marginLeft: 2 }}
                >
                  posterior
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════ Supporting evidence — left-rail structure ═══════ */}
      <div style={{ marginBottom: 16 }}>
        <div className="gs-section-label" style={{ marginBottom: 8, fontSize: 9 }}>Supporting evidence</div>

        {topCause && (
          <div style={{ position: 'relative' }}>
            {/* Rail line */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 5,
                top: 6,
                bottom: 4,
                width: 1,
                backgroundColor: 'rgba(48,54,61,0.55)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(causeEvidenceMap[topCause.label] || []).map((ev, i) => {
                const dotColor = railDotColors[ev.strength];
                const strColor = strengthColors[ev.strength];
                const strLabel = strengthLabels[ev.strength];

                return (
                  <div key={i} style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
                    {/* Rail column */}
                    <div
                      style={{
                        width: 22,
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        paddingTop: 3,
                      }}
                    >
                      <div
                        style={{
                          width: ev.strength === 'very_strong' ? 7 : 5,
                          height: ev.strength === 'very_strong' ? 7 : 5,
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          flexShrink: 0,
                        }}
                      />
                    </div>

                    {/* Description + strength */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: ev.strength === 'none' ? 'var(--gs-text-tertiary)' : 'var(--gs-text-secondary)',
                          lineHeight: 1.35,
                          fontStyle: ev.strength === 'none' ? 'italic' : 'normal',
                        }}
                      >
                        {ev.description}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: strColor,
                          fontFamily: 'IBM Plex Mono, monospace',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {strLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="gs-divider" />

      {/* ═══════ Competing hypotheses — tabular comparison ═══════ */}
      <div style={{ marginBottom: 16 }}>
        <div className="gs-section-label" style={{ marginBottom: 8 }}>Competing hypotheses</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {competitors.map((cause) => {
            const pct = Math.round(cause.probability * 100);
            const barColor = hypothesisBarColor(cause.probability);
            // Bar width relative to top cause for comparison
            const relativeWidth = (cause.probability / (topCause?.probability || 1)) * 100;

            return (
              <div key={cause.label}>
                {/* Label row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 3,
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}>
                    {cause.label}
                  </span>
                  <span
                    className="font-mono tabular-nums font-semibold"
                    style={{ fontSize: 11, color: barColor }}
                  >
                    {pct}%
                  </span>
                </div>
                {/* Comparison bar — 3px height, clearly secondary */}
                <div
                  style={{
                    height: 3,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${relativeWidth}%`,
                      backgroundColor: barColor,
                      transition: 'width 600ms ease-out',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gs-divider" />

      {/* ═══════ What would change this belief? ═══════ */}
      <div>
        <div className="gs-section-label" style={{ marginBottom: 6 }}>What would change this belief?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {whatWouldChangeBelief.map((item, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11 }}
            >
              <span style={{ color: 'var(--gs-text-tertiary)', flexShrink: 0, marginTop: 1, fontSize: 10 }}>·</span>
              <span style={{ color: 'var(--gs-text-secondary)', lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            fontStyle: 'italic',
            color: 'var(--gs-text-tertiary)',
          }}
        >
          GridSense is probabilistic — beliefs update as new evidence arrives.
        </div>
      </div>

    </div>
  );
}
