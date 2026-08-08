// BeliefChart - the star feature: probability-over-time showing the system "thinking"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useGrid } from '../../context/GridContext';

const SECTION_COLORS: Record<string, string> = {
  A: '#10b981', // emerald
  B: '#ef4444', // red
  C: '#f59e0b', // amber
};

export function BeliefChart() {
  const { state } = useGrid();
  const { beliefHistory } = state;

  // Transform belief history for Recharts
  const data = beliefHistory.map((snapshot) => {
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
    };
  });

  // Find crew report indices for reference lines
  const crewReportIndices = beliefHistory
    .map((_, i) => (i > 7 ? i : -1)) // first 8 are initial, after that are crew reports
    .filter((i) => i >= 0);

  return (
    <div className="grid-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="grid-card-header mb-0">Belief Evolution</div>
        <div className="flex items-center gap-4">
          {Object.entries(SECTION_COLORS).map(([section, color]) => (
            <div key={section} className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-slate-500 font-mono">Section {section}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={35}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(30,58,95,0.5)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, `Section ${name}`]}
          />

          {/* Reference lines for crew reports */}
          {crewReportIndices.map((idx) => (
            <ReferenceLine
              key={idx}
              x={data[idx]?.time}
              stroke="rgba(139, 92, 246, 0.4)"
              strokeDasharray="4 4"
              label={{
                value: 'Crew report',
                position: 'top',
                fill: '#8b5cf6',
                fontSize: 9,
              }}
            />
          ))}

          <Line
            type="monotone"
            dataKey="A"
            stroke={SECTION_COLORS.A}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="B"
            stroke={SECTION_COLORS.B}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="C"
            stroke={SECTION_COLORS.C}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
