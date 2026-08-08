// EvidenceLog — structured evidence stream
// Each item: WHAT / WHEN / WHERE / STRENGTH / EFFECT
// Compact mode: shows strength indicator — not stripped bare
// No gs-panel wrapper — lives inside view containers that already provide structure

import { useGrid } from '../../context/GridContext';

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

const typeIndicators: Record<string, { label: string; color: string }> = {
  sensor:    { label: 'Sensor',    color: 'var(--gs-blue)' },
  meter:     { label: 'Meter',     color: 'var(--gs-blue)' },
  crew:      { label: 'Crew',      color: 'var(--gs-green)' },
  weather:   { label: 'Weather',   color: 'var(--gs-amber)' },
  complaint: { label: 'Complaint', color: 'var(--gs-red)' },
};

export function EvidenceLog({ compact = false }: { compact?: boolean }) {
  const { state } = useGrid();
  const { evidenceLog } = state;

  const items = compact ? evidenceLog.slice(0, 7) : evidenceLog;

  return (
    <div className="h-full flex flex-col" style={{ padding: compact ? '10px 0 0 0' : 0 }}>
      <div
        className="gs-section-label px-3 mb-2"
        style={{ paddingTop: compact ? 0 : 12 }}
      >
        Evidence stream
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {items.map((event, i) => {
          const indicator = typeIndicators[event.type] || typeIndicators.sensor;
          const isNew = i === 0 && event.type === 'crew';
          const isStrong = event.strength === 'very_strong' || event.strength === 'strong';

          return (
            <div
              key={event.id}
              className={`px-3 py-2 transition-colors duration-300 ${isNew ? 'evidence-enter' : ''}`}
              style={{
                borderLeft: `2px solid ${isStrong ? strengthColors[event.strength] : 'transparent'}`,
                backgroundColor: isNew ? 'rgba(63, 185, 80, 0.04)' : 'transparent',
                borderBottom: '1px solid rgba(48,54,61,0.35)',
              }}
            >
              {/* Row 1: WHAT + WHEN */}
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span
                  className="text-xs font-medium leading-tight"
                  style={{ color: isStrong ? 'var(--gs-text)' : 'var(--gs-text-secondary)' }}
                >
                  {event.title}
                </span>
                <span className="font-mono text-[10px] tabular-nums shrink-0" style={{ color: 'var(--gs-text-tertiary)' }}>
                  {event.timestamp}
                </span>
              </div>

              {/* Row 2: WHERE */}
              <div className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                {event.location}
              </div>

              {/* Row 3: STRENGTH + EFFECT — always visible, even in compact mode */}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: strengthColors[event.strength] }}
                >
                  {strengthLabels[event.strength]}
                </span>
                <span style={{ color: 'var(--gs-text-tertiary)', fontSize: 10 }}>·</span>
                <span className="text-[10px]" style={{ color: indicator.color }}>
                  {indicator.label}
                </span>
                {!compact && (
                  <>
                    <span style={{ color: 'var(--gs-text-tertiary)', fontSize: 10 }}>·</span>
                    <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                      {event.impact}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
