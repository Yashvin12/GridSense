// SectionProbabilities — horizontal bars, posterior probability of fault location
// Winning hypothesis immediately obvious via bar dominance
// Every percentage labeled explicitly as "posterior probability"

import { useGrid } from '../../context/GridContext';
import { AnimatedNumber } from '../shared/AnimatedNumber';

const SECTION_COLORS: Record<string, string> = {
  A: '#3fb950',
  B: '#f85149',
  C: '#d29922',
};

export function SectionProbabilities() {
  const { state } = useGrid();
  const { sectionProbabilities } = state;

  const sorted = [...sectionProbabilities].sort((a, b) => b.probability - a.probability);

  return (
    <div className="gs-panel h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="gs-section-label mb-0.5">Section probabilities</div>
      <div className="text-[10px] mb-3" style={{ color: 'var(--gs-text-tertiary)' }}>
        Posterior probability of fault location
      </div>

      <div className="space-y-4">
        {sorted.map((sp) => {
          const color = SECTION_COLORS[sp.section] || '#6e7681';
          const pct = Math.round(sp.probability * 100);
          const isTop = sp.probability > 0.5;

          return (
            <div key={sp.section}>
              {/* Label row: section name + percentage */}
              <div className="flex items-baseline justify-between mb-0.5">
                <span
                  className="text-sm font-medium"
                  style={{ color: isTop ? 'var(--gs-text)' : 'var(--gs-text-secondary)' }}
                >
                  Section {sp.section}
                </span>
                <AnimatedNumber
                  value={sp.probability * 100}
                  suffix="%"
                  decimals={0}
                  className={`font-bold ${isTop ? 'text-lg' : 'text-sm'}`}
                />
              </div>
              {/* Sub-label: always visible, removes ambiguity */}
              <div className="text-[9px] mb-1" style={{ color: 'var(--gs-text-tertiary)' }}>
                posterior probability
              </div>
              {/* Bar */}
              <div
                className="rounded-sm overflow-hidden"
                style={{ height: isTop ? 8 : 5, backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                <div
                  className="h-full rounded-sm transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interpretation footnote */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--gs-border)' }}>
        <div className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
          Section {sorted[0]?.section} holds {Math.round((sorted[0]?.probability || 0) * 100)}% of total fault probability.
          Remaining {Math.round((1 - (sorted[0]?.probability || 0)) * 100)}% distributed across other sections.
        </div>
      </div>
    </div>
  );
}
