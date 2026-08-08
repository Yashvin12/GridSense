// BeliefChart — posterior probability over time, Bayesian update visualization
// Signature component: shows EVIDENCE ARRIVES → BELIEF CHANGES loop
// Timestamps anchored to scenario time (14:22–14:29) matching evidence log

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useGrid } from '../../context/GridContext';

const SECTION_COLORS: Record<string, string> = {
  A: '#3fb950', // green — healthy section
  B: '#f85149', // red — fault section
  C: '#d29922', // amber — affected section
};

// Custom tooltip — shows evidence trigger that caused the belief shift
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BeliefTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; payload?: any }>; label?: string }) {
  if (!active || !payload) return null;

  const trigger = payload[0]?.payload?.trigger as string | undefined;

  return (
    <div style={{
      backgroundColor: 'var(--gs-surface-2)',
      border: '1px solid var(--gs-border-strong)',
      borderRadius: 2,
      padding: '7px 10px',
      fontSize: 11,
    }}>
      <div style={{ color: 'var(--gs-text-tertiary)', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>
        {label}
      </div>
      {trigger && (
        <div style={{ color: 'var(--gs-amber)', fontSize: 10, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          ↓ {trigger}
        </div>
      )}
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            width: 8, height: 2,
            backgroundColor: SECTION_COLORS[entry.dataKey] || '#6e7681',
            display: 'inline-block',
          }} />
          <span style={{ color: 'var(--gs-text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Section {entry.dataKey}:
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: 'var(--gs-text)' }}>
            {entry.value.toFixed(1)}%
          </span>
          <span style={{ fontSize: 9, color: 'var(--gs-text-tertiary)', fontFamily: 'IBM Plex Sans' }}>
            posterior
          </span>
        </div>
      ))}
    </div>
  );
}

export function BeliefChart({ compact = false }: { compact?: boolean }) {
  const { state } = useGrid();
  const { beliefHistory, fault, sectionProbabilities } = state;

  // Find top section for compact label
  const topSection = [...sectionProbabilities].sort((a, b) => b.probability - a.probability)[0];

  // Transform belief history — extract HH:MM time from ISO timestamps
  const data = beliefHistory.map((snapshot) => {
    // Parse the ISO timestamp to get scenario time
    const dateStr = snapshot.timestamp;
    let timeLabel = '';
    try {
      const d = new Date(dateStr);
      timeLabel = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      timeLabel = dateStr;
    }
    return {
      time: timeLabel,
      A: Number((snapshot.sections.A * 100).toFixed(1)),
      B: Number((snapshot.sections.B * 100).toFixed(1)),
      C: Number((snapshot.sections.C * 100).toFixed(1)),
      trigger: snapshot.trigger || '',
    };
  });

  // Evidence annotation indices (skip first "prior" entry)
  const annotationIndices = data
    .map((d, i) => (i > 0 && d.trigger ? i : -1))
    .filter((i) => i >= 0);

  return (
    <div className="h-full flex flex-col" style={{ padding: compact ? '8px 0 0 0' : 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 mb-1">
        <div>
          <div className="gs-section-label">Belief evolution</div>
          {!compact && (
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--gs-text-tertiary)' }}>
              Evidence arrives → posterior probability updates
            </div>
          )}
          {compact && (
            <div className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--gs-text-secondary)' }}>
              Section {topSection?.section} now{' '}
              <span style={{ color: 'var(--gs-red)', fontWeight: 600 }}>
                {Math.round((topSection?.probability || fault.confidence) * 100)}%
              </span>{' '}
              posterior
            </div>
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3">
          {Object.entries(SECTION_COLORS).map(([section, color]) => (
            <div key={section} className="flex items-center gap-1">
              <span className="inline-block w-5 h-[2px]" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--gs-text-tertiary)' }}>
                {section}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-1" style={{ minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: compact ? 4 : 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
              width={34}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<BeliefTooltip />} />

            {/* Evidence event annotation lines — shown in full mode */}
            {!compact && annotationIndices.map((idx) => (
              <ReferenceLine
                key={idx}
                x={data[idx]?.time}
                stroke="rgba(210, 153, 34, 0.25)"
                strokeDasharray="4 3"
                label={{
                  value: data[idx]?.trigger || '',
                  position: 'insideTopRight',
                  fill: '#6e7681',
                  fontSize: 9,
                  fontFamily: 'IBM Plex Sans',
                }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="A"
              stroke={SECTION_COLORS.A}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="B"
              stroke={SECTION_COLORS.B}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="C"
              stroke={SECTION_COLORS.C}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
