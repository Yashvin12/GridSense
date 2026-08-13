// EvidenceLog — structured evidence stream with vertical event rail
// Each event: WHAT / WHERE / WHEN / STRENGTH / MODEL EFFECT
// Vertical rail communicates chronological flow through the reasoning system.
// New evidence enters at top. Strength uses semantic color. Source = plain text label.
// No individual cards — proximity and rail define grouping.
// Full mode: each event shows before→after belief change for Section B.

import { useGrid } from '../../context/GridContext';

// Strength: semantic color only — red (very strong), amber (strong), neutral (moderate/weak)
const strengthColors: Record<string, string> = {
  very_strong: 'var(--gs-red)',
  strong:      'var(--gs-amber)',
  moderate:    'var(--gs-text-tertiary)',
  weak:        'var(--gs-text-tertiary)',
};

const strengthLabels: Record<string, string> = {
  very_strong: 'Very strong',
  strong:      'Strong',
  moderate:    'Moderate',
  weak:        'Weak',
};

// Rail dot colors mirror strength
const railColors: Record<string, string> = {
  very_strong: 'var(--gs-red)',
  strong:      'var(--gs-amber)',
  moderate:    'rgba(110,118,129,0.5)',
  weak:        'rgba(110,118,129,0.3)',
};

// Source type: plain uppercase text, semantically tinted — no decorative icons or color badges
const sourceTypeStyle: Record<string, { label: string; color: string }> = {
  sensor:    { label: 'SENSOR',    color: 'var(--gs-text-tertiary)' },
  meter:     { label: 'METER',     color: 'var(--gs-text-tertiary)' },
  crew:      { label: 'CREW',      color: 'var(--gs-green)'         },
  weather:   { label: 'WEATHER',   color: 'var(--gs-amber)'         },
  complaint: { label: 'COMPLAINT', color: 'rgba(248,81,73,0.7)'     },
};

// Trigger label → belief snapshot trigger key mapping
// Evidence timestamps are matched to beliefHistory triggers in order
const EVIDENCE_TRIGGER_ORDER = [
  'Relay trip',
  'Last-gasp signals',
  'Voltage collapse',
  'Wind alert',
  'Complaints',
  'Temp spike',
  'Current zero',
];

export function EvidenceLog({ compact = false }: { compact?: boolean }) {
  const { state } = useGrid();
  const { evidenceLog, evidenceCount, beliefHistory } = state;

  const items = compact ? evidenceLog.slice(0, 7) : evidenceLog;
  // The latest event is always index 0 (newest first)
  const latestId = items[0]?.id;

  // Build before→after belief map for Section B using beliefHistory snapshots
  // evidenceLog is newest-first; beliefHistory is oldest-first
  // We match belief snapshots by index: snapshot[0] = uniform prior, snapshot[1] = after event 1, etc.
  // Evidence items are in reverse order, so we correlate by trigger order
  const beliefDeltas: Map<string, { before: number; after: number; delta: number }> = new Map();
  if (!compact && beliefHistory.length > 1) {
    // Build deltas for each evidence trigger
    EVIDENCE_TRIGGER_ORDER.forEach((triggerKey, triggerIdx) => {
      const snapshotBefore = beliefHistory[triggerIdx];       // belief before this evidence
      const snapshotAfter  = beliefHistory[triggerIdx + 1];  // belief after this evidence
      if (snapshotBefore && snapshotAfter) {
        const before = snapshotBefore.sections['B'] ?? 0;
        const after  = snapshotAfter.sections['B'] ?? 0;
        beliefDeltas.set(triggerKey, {
          before: Math.round(before * 100),
          after:  Math.round(after * 100),
          delta:  Math.round((after - before) * 100),
        });
      }
    });
  }

  return (
    <div className="h-full flex flex-col" style={{ padding: 0 }}>
      {/* Header */}
      <div
        className="gs-section-label px-3"
        style={{ paddingTop: compact ? 10 : 12, paddingBottom: 8 }}
      >
        Evidence stream
        {!compact && (
          <span
            className="font-mono"
            style={{
              marginLeft: 8,
              fontSize: 10,
              fontWeight: 400,
              color: 'var(--gs-text-tertiary)',
              letterSpacing: 0,
              textTransform: 'none',
            }}
          >
            {evidenceCount} events · newest first
          </span>
        )}
      </div>

      {/* Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Relative container for the rail */}
        <div style={{ position: 'relative', paddingLeft: 0 }}>
          {/* Vertical rail line — runs behind all events */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 23,
              top: 8,
              bottom: 0,
              width: 1,
              backgroundColor: 'rgba(48,54,61,0.55)',
              pointerEvents: 'none',
            }}
          />

          {items.map((event, i) => {
            const isNewest = event.id === latestId;
            const src = sourceTypeStyle[event.type] || sourceTypeStyle.sensor;
            const dotColor = railColors[event.strength];
            const strengthColor = strengthColors[event.strength];
            const strengthLabel = strengthLabels[event.strength];
            const isStrong = event.strength === 'very_strong' || event.strength === 'strong';

            return (
              <div
                key={event.id}
                className={isNewest ? 'evidence-enter' : ''}
                style={{
                  display: 'flex',
                  gap: 0,
                  paddingBottom: 14,
                  paddingTop: i === 0 ? 4 : 0,
                  // Subtle background tint for newest event only
                  backgroundColor: isNewest
                    ? event.type === 'crew'
                      ? 'rgba(63,185,80,0.025)'
                      : 'rgba(255,255,255,0.012)'
                    : 'transparent',
                }}
              >
                {/* Rail column: dot marker */}
                <div
                  style={{
                    width: 46,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 2,
                  }}
                >
                  {/* Rail dot */}
                  <div
                    style={{
                      width: event.strength === 'very_strong' ? 7 : 5,
                      height: event.strength === 'very_strong' ? 7 : 5,
                      borderRadius: '50%',
                      backgroundColor: dotColor,
                      flexShrink: 0,
                      marginTop: 1,
                      // Brief glow only for very_strong — communicates criticality, not decoration
                      boxShadow: event.strength === 'very_strong'
                        ? '0 0 0 2px rgba(248,81,73,0.15)'
                        : 'none',
                    }}
                  />
                </div>

                {/* Content column */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  {/* Row 1: WHAT + WHEN */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isStrong ? 600 : 500,
                        color: isStrong ? 'var(--gs-text)' : 'var(--gs-text-secondary)',
                        lineHeight: 1.3,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {event.title}
                    </span>
                    <span
                      className="font-mono tabular-nums"
                      style={{
                        fontSize: 10,
                        color: 'var(--gs-text-tertiary)',
                        flexShrink: 0,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {event.timestamp}
                    </span>
                  </div>

                  {/* Row 2: WHERE */}
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--gs-text-tertiary)',
                      marginBottom: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    {event.location}
                  </div>

                  {/* Row 3: STRENGTH · SOURCE TYPE */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: compact ? 0 : 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: strengthColor,
                        fontFamily: 'IBM Plex Mono, monospace',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {strengthLabel}
                    </span>
                    <span style={{ color: 'var(--gs-text-tertiary)', fontSize: 10 }}>·</span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: src.color,
                        letterSpacing: '0.06em',
                        fontWeight: 500,
                      }}
                    >
                      {src.label}
                    </span>
                  </div>

                  {/* Row 4: MODEL EFFECT — full mode shows structured before→after belief update */}
                  {!compact && (() => {
                    // Match this evidence item to a trigger in beliefHistory by order
                    // evidenceLog is newest-first; we need to find its reverse index
                    const reverseIdx = items.length - 1 - i;
                    const triggerKey = EVIDENCE_TRIGGER_ORDER[reverseIdx];
                    const delta = triggerKey ? beliefDeltas.get(triggerKey) : undefined;

                    if (delta && delta.delta !== 0) {
                      return (
                        <div
                          style={{
                            marginTop: 5,
                            padding: '5px 8px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: 2,
                          }}
                        >
                          {/* Location label */}
                          <div
                            style={{
                              fontSize: 10,
                              color: 'var(--gs-text-tertiary)',
                              marginBottom: 2,
                              fontFamily: 'IBM Plex Mono, monospace',
                            }}
                          >
                            {event.impact}
                          </div>
                          {/* Before → After → Delta */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span
                              className="font-mono tabular-nums"
                              style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}
                            >
                              {delta.before}%
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--gs-text-tertiary)' }}>→</span>
                            <span
                              className="font-mono tabular-nums font-semibold"
                              style={{
                                fontSize: 11,
                                color: delta.delta > 5 ? 'var(--gs-text)' : 'var(--gs-text-secondary)',
                              }}
                            >
                              {delta.after}%
                            </span>
                            <span
                              className="font-mono tabular-nums"
                              style={{
                                fontSize: 10,
                                color: delta.delta > 0 ? 'var(--gs-amber)' : 'var(--gs-text-tertiary)',
                                marginLeft: 2,
                              }}
                            >
                              {delta.delta > 0 ? `+${delta.delta}` : delta.delta} pts
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Fallback: show the qualitative impact string
                    return (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 3,
                        }}
                      >
                        <span className="font-mono" style={{ fontSize: 10, color: 'var(--gs-text-tertiary)' }}>→</span>
                        <span className="font-mono" style={{ fontSize: 10, color: 'var(--gs-text-tertiary)', letterSpacing: '0.01em' }}>
                          {event.impact}
                        </span>
                      </div>
                    );
                  })()}
                  {compact && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{ fontSize: 9, color: 'var(--gs-text-tertiary)' }}
                      >
                        →
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 9,
                          color: 'var(--gs-text-tertiary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.impact}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
