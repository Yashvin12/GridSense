// EvidenceLog — structured evidence stream with visual weight by strength
// Each item shows: what happened, when, where, how important, what it affected

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

const typeIndicators: Record<string, { symbol: string; color: string }> = {
  sensor:    { symbol: '●', color: 'var(--gs-blue)' },
  meter:     { symbol: '●', color: 'var(--gs-blue)' },
  crew:      { symbol: '✓', color: 'var(--gs-green)' },
  weather:   { symbol: '▲', color: 'var(--gs-amber)' },
  complaint: { symbol: '●', color: 'var(--gs-red)' },
};

export function EvidenceLog({ compact = false }: { compact?: boolean }) {
  const { state } = useGrid();
  const { evidenceLog } = state;

  const items = compact ? evidenceLog.slice(0, 6) : evidenceLog;

  return (
    <div className="gs-panel h-full flex flex-col">
      <div className="gs-section-label mb-2">Evidence Stream</div>
      <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
        {items.map((event, i) => {
          const indicator = typeIndicators[event.type] || typeIndicators.sensor;
          const isNew = i === 0 && event.type === 'crew';
          const isStrong = event.strength === 'very_strong' || event.strength === 'strong';

          return (
            <div
              key={event.id}
              className={`px-2 py-1.5 transition-colors duration-300 ${isNew ? 'evidence-enter' : ''}`}
              style={{
                borderLeft: `2px solid ${isStrong ? strengthColors[event.strength] : 'transparent'}`,
                backgroundColor: isNew ? 'rgba(63, 185, 80, 0.04)' : 'transparent',
              }}
            >
              <div className="flex items-start gap-2">
                {/* Type indicator */}
                <span className="text-[10px] mt-0.5 shrink-0" style={{ color: indicator.color }}>
                  {indicator.symbol}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Title + timestamp */}
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="text-xs font-medium leading-tight"
                      style={{
                        color: isStrong ? 'var(--gs-text)' : 'var(--gs-text-secondary)',
                      }}
                    >
                      {event.title}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums shrink-0"
                      style={{ color: 'var(--gs-text-tertiary)' }}
                    >
                      {event.timestamp}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--gs-text-tertiary)' }}>
                    {event.location}
                  </div>

                  {/* Impact + strength */}
                  {!compact && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono"
                        style={{ color: strengthColors[event.strength] }}
                      >
                        {strengthLabels[event.strength]}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                        · {event.evidenceCategory === 'location' ? 'Location' : 'Cause'}
                      </span>
                      <span className="text-[10px] font-mono font-medium"
                        style={{ color: 'var(--gs-text-secondary)' }}
                      >
                        → {event.impact}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
