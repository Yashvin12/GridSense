// BeliefSummaryCompact — compact text-based belief trend for the Causes page footer
// Replaces the full BeliefChart + EvidenceLog duplicate panels from the old Causes layout.
// Shows: Section B trajectory, number of evidence events, final posterior.
// This is a reference, not a full analytics panel — it points the operator to Evidence tab.

import { useGrid } from '../../context/GridContext';

export function BeliefSummaryCompact() {
  const { state, setView } = useGrid();
  const { beliefHistory, evidenceCount } = state;


  // Get start and end Section B probabilities from belief history
  const firstSnapshot = beliefHistory[0];
  const lastSnapshot = beliefHistory[beliefHistory.length - 1];
  const startPct = firstSnapshot ? Math.round((firstSnapshot.sections['B'] ?? 0) * 100) : null;
  const endPct = lastSnapshot ? Math.round((lastSnapshot.sections['B'] ?? 0) * 100) : null;

  // Key belief milestones from history (every other snapshot to avoid crowding)
  const milestones = beliefHistory
    .filter((_, i) => i > 0)
    .map((snap, _i) => ({
      trigger: snap.trigger || '',
      pct: Math.round((snap.sections['B'] ?? 0) * 100),
    }))
    .slice(0, 6);

  return (
    <div style={{ padding: '0 12px', display: 'flex', alignItems: 'flex-start', gap: 24 }}>

      {/* Left: trajectory summary */}
      <div style={{ minWidth: 0 }}>
        <div
          className="gs-section-label"
          style={{ fontSize: 9, marginBottom: 6, color: 'var(--gs-text-tertiary)' }}
        >
          Belief trajectory — Section B
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {startPct !== null && (
            <span className="font-mono tabular-nums" style={{ fontSize: 12, color: 'var(--gs-text-secondary)' }}>
              {startPct}%
            </span>
          )}
          {milestones.map((m, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--gs-text-tertiary)' }}>→</span>
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: 12,
                  color: i === milestones.length - 1 ? 'var(--gs-text)' : 'var(--gs-text-secondary)',
                  fontWeight: i === milestones.length - 1 ? 600 : 400,
                }}
              >
                {m.pct}%
              </span>
            </span>
          ))}
        </div>
        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--gs-text-tertiary)' }}>
          {evidenceCount} evidence events processed · current posterior:{' '}
          <span className="font-mono font-semibold" style={{ color: 'var(--gs-red)' }}>
            {endPct}%
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: 'stretch', backgroundColor: 'var(--gs-border)', flexShrink: 0 }} />

      {/* Right: link to full evidence view */}
      <div style={{ flexShrink: 0 }}>
        <div
          className="gs-section-label"
          style={{ fontSize: 9, marginBottom: 6, color: 'var(--gs-text-tertiary)' }}
        >
          Full analysis
        </div>
        <button
          onClick={() => setView('evidence')}
          style={{
            fontSize: 11,
            fontFamily: 'IBM Plex Sans, sans-serif',
            color: 'var(--gs-text-secondary)',
            background: 'none',
            border: '1px solid var(--gs-border)',
            borderRadius: 2,
            padding: '4px 10px',
            cursor: 'pointer',
            transition: 'color 120ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gs-text)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gs-text-secondary)'; }}
        >
          View evidence timeline →
        </button>
      </div>
    </div>
  );
}
