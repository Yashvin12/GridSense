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
    .slice(0, 3);

  const strengthColors: Record<string, string> = {
    very_strong: 'var(--gs-red)',
    strong: 'var(--gs-amber)',
    moderate: 'var(--gs-text-secondary)',
    weak: 'var(--gs-text-tertiary)',
  };

  return (
    <div>
      <div className="gs-section-label text-[10px] mb-3">Why this location</div>
      <div className="flex flex-col gap-3 pl-1 border-l border-dashed border-[var(--gs-border)] ml-1">
        {locationEvidence.map((ev) => (
          <div key={ev.id} className="pl-3 relative">
            {/* Visual connector node */}
            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[var(--gs-bg)] border border-[var(--gs-border-strong)]" />
            
            <div className="text-[12px] font-medium text-[var(--gs-text)] leading-tight mb-0.5">
              {ev.title}
            </div>
            <div className="text-[11px] mb-1.5" style={{ color: 'var(--gs-text-secondary)' }}>
              {ev.location}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] uppercase font-bold tracking-wider" style={{ color: strengthColors[ev.strength] }}>
                {ev.strength.replace('_', ' ')}
              </span>
              <span style={{ color: 'var(--gs-text-tertiary)', fontSize: 10 }}>→</span>
              <span className="font-mono text-[9px] uppercase font-semibold" style={{ color: 'var(--gs-text)' }}>
                Section B
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
