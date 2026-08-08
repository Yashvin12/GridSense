// SectionProbabilities — horizontal bars only, no donut chart
// Winning hypothesis immediately obvious via bar dominance

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

  // Sort by probability descending
  const sorted = [...sectionProbabilities].sort((a, b) => b.probability - a.probability);

  return (
    <div className="gs-panel h-full">
      <div className="gs-section-label mb-3">Section Probabilities</div>

      <div className="space-y-3">
        {sorted.map((sp) => {
          const color = SECTION_COLORS[sp.section] || '#6e7681';
          const pct = Math.round(sp.probability * 100);
          const isTop = sp.probability > 0.5;

          return (
            <div key={sp.section}>
              <div className="flex items-baseline justify-between mb-1">
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
                  className={`text-sm font-bold ${isTop ? 'text-lg' : ''}`}
                />
              </div>
              <div
                className="rounded-sm overflow-hidden"
                style={{ height: isTop ? 8 : 5, backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                <div
                  className="h-full rounded-sm transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interpretation */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--gs-border)' }}>
        <div className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
          Section {sorted[0]?.section} has {Math.round((sorted[0]?.probability || 0) * 100)}% posterior probability
          of containing the fault. Other sections sum to {Math.round((1 - (sorted[0]?.probability || 0)) * 100)}%.
        </div>
      </div>
    </div>
  );
}
