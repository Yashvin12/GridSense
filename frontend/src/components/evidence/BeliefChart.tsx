// BeliefChart — probability-over-time showing continuous Bayesian reasoning
// Annotated with evidence events that caused belief shifts

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useGrid } from '../../context/GridContext';
import { evidenceTriggers } from '../../data/mockData';

const SECTION_COLORS: Record<string, string> = {
  A: '#3fb950', // green — healthy section
  B: '#f85149', // red — fault section
  C: '#d29922', // amber — affected section
};

// Custom tooltip that shows evidence trigger
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BeliefTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; payload?: any }>; label?: string }) {
  if (!active || !payload) return null;

  const trigger = payload[0]?.payload?.trigger as string | undefined;

  return (
    <div style={{
      backgroundColor: 'var(--gs-surface-2)',
      border: '1px solid var(--gs-border-strong)',
      borderRadius: 3,
      padding: '8px 10px',
      fontSize: 11,
    }}>
      <div style={{ color: 'var(--gs-text-tertiary)', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>
        {label}
      </div>
      {trigger && (
        <div style={{ color: 'var(--gs-amber)', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>
          {trigger}
        </div>
      )}
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 1,
            backgroundColor: SECTION_COLORS[entry.dataKey] || '#6e7681',
            display: 'inline-block',
          }} />
          <span style={{ color: 'var(--gs-text-secondary)' }}>
            Section {entry.dataKey}:
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: 'var(--gs-text)' }}>
            {entry.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function BeliefChart({ compact = false }: { compact?: boolean }) {
  const { state } = useGrid();
  const { beliefHistory } = state;

  // Transform belief history for Recharts
  const data = beliefHistory.map((snapshot, i) => {
    const time = new Date(snapshot.timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return {
      time,
      A: Number((snapshot.sections.A * 100).toFixed(1)),
      B: Number((snapshot.sections.B * 100).toFixed(1)),
      C: Number((snapshot.sections.C * 100).toFixed(1)),
      trigger: snapshot.trigger || evidenceTriggers[i] || '',
    };
  });

  // Evidence annotation indices (skip first "prior" entry)
  const annotationIndices = data
    .map((d, i) => (i > 0 && d.trigger ? i : -1))
    .filter((i) => i >= 0);

  return (
    <div className="gs-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="gs-section-label">Belief Evolution</div>
        <div className="flex items-center gap-3">
          {Object.entries(SECTION_COLORS).map(([section, color]) => (
            <div key={section} className="flex items-center gap-1">
              <span className="inline-block w-2 h-[3px]" style={{ backgroundColor: color, borderRadius: 1 }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--gs-text-tertiary)' }}>
                {section}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" style={{ minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              width={32}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<BeliefTooltip />} />

            {/* Evidence event annotation lines */}
            {!compact && annotationIndices.slice(0, 5).map((idx) => (
              <ReferenceLine
                key={idx}
                x={data[idx]?.time}
                stroke="rgba(210, 153, 34, 0.3)"
                strokeDasharray="3 3"
                label={compact ? undefined : {
                  value: data[idx]?.trigger?.split(' ')[0] || '',
                  position: 'top',
                  fill: '#6e7681',
                  fontSize: 8,
                  fontFamily: 'IBM Plex Mono',
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
