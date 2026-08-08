// WhyThisLocation — evidence → implication reasoning
// Structure per item: WHAT | WHERE | STRENGTH → EFFECT
// Operator understands the reasoning chain in seconds

import { useGrid } from '../../context/GridContext';

export function WhyThisLocation() {
  const { state } = useGrid();
  const { evidenceLog } = state;

  // Show top location evidence items only — cause evidence belongs in Cause Analysis
  const locationEvidence = evidenceLog
    .filter((e) => e.evidenceCategory === 'location' && e.type !== 'crew')
    .slice(0, 4);

  const strengthColors: Record<string, string> = {
    very_strong: 'var(--gs-red)',
    strong: 'var(--gs-amber)',
    moderate: 'var(--gs-text-secondary)',
    weak: 'var(--gs-text-tertiary)',
  };

  const strengthLabels: Record<string, string> = {
    very_strong: 'Very strong',
    strong: 'Strong',
    moderate: 'Moderate',
    weak: 'Weak',
  };

  return (
    <div>
      <div className="gs-section-label mb-2">Why this location?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {locationEvidence.map((ev) => (
          <div key={ev.id}>
            {/* Evidence source + location */}
            <div className="text-xs font-medium text-[var(--gs-text)] leading-tight">
              {ev.title}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--gs-text-tertiary)' }}>
              {ev.location}
            </div>
            {/* Strength + implied section */}
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="text-[10px] font-semibold"
                style={{ color: strengthColors[ev.strength] }}
              >
                {strengthLabels[ev.strength]}
              </span>
              <span style={{ color: 'var(--gs-text-tertiary)', fontSize: 10 }}>→</span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--gs-text-secondary)' }}>
                Section B
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
