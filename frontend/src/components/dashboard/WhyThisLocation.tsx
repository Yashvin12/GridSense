// WhyThisLocation — compact evidence → implication reasoning
// Shows the strongest evidence currently supporting the fault location
// Operator should understand reasoning in seconds, not paragraphs

import { useGrid } from '../../context/GridContext';

export function WhyThisLocation() {
  const { state } = useGrid();
  const { evidenceLog } = state;

  // Show top 4 strongest evidence items supporting location
  const locationEvidence = evidenceLog
    .filter((e) => e.type !== 'crew')
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
      <div className="gs-section-label mb-2">Why This Location?</div>
      <div className="space-y-2">
        {locationEvidence.map((ev) => (
          <div key={ev.id} className="flex gap-2">
            {/* Left: evidence source */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--gs-text)]">
                {ev.title}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                {ev.location}
              </div>
            </div>
            {/* Right: strength + category */}
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-medium" style={{ color: strengthColors[ev.strength] }}>
                {strengthLabels[ev.strength]}
              </div>
              <div className="text-[9px] font-mono" style={{ color: 'var(--gs-text-tertiary)' }}>
                {ev.evidenceCategory === 'location' ? 'Location' : 'Cause'} evidence
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
