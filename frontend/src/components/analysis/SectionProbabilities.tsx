// SectionProbabilities - section probability distribution visualization

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useGrid } from '../../context/GridContext';
import { AnimatedNumber } from '../shared/AnimatedNumber';

const SECTION_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#ef4444',
  C: '#f59e0b',
};

export function SectionProbabilities() {
  const { state } = useGrid();
  const { sectionProbabilities } = state;

  const data = sectionProbabilities.map((sp) => ({
    name: `Section ${sp.section}`,
    value: Number((sp.probability * 100).toFixed(1)),
    section: sp.section,
  }));

  return (
    <div className="grid-card h-full">
      <div className="grid-card-header mb-4">Fault Distribution</div>

      <div className="flex items-center gap-6">
        {/* Donut chart */}
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                animationDuration={800}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.section}
                    fill={SECTION_COLORS[entry.section] || '#64748b'}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(30,58,95,0.5)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value}%`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Section breakdown */}
        <div className="flex-1 space-y-4">
          {sectionProbabilities.map((sp) => {
            const color = SECTION_COLORS[sp.section] || '#64748b';
            return (
              <div key={sp.section} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Section {sp.section}</span>
                    <AnimatedNumber
                      value={sp.probability * 100}
                      suffix="%"
                      decimals={1}
                      className="text-sm font-bold"
                    />
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${sp.probability * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
