// TelemetryChart — live telemetry with contextual interpretation
// Each metric shows: current value + deviation from baseline
// Abnormalities annotated — telemetry supports fault reasoning, not just raw numbers

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useGrid } from '../../context/GridContext';
import { telemetryBaselines } from '../../data/mockData';

// Compute contextual status string for a reading relative to baseline
function getDeviation(value: number, baseline: number, unit: string): { label: string; color: string } {
  const pct = ((value - baseline) / baseline) * 100;
  const absPct = Math.abs(pct);

  if (absPct < 5) return { label: 'Near nominal', color: 'var(--gs-text-tertiary)' };
  if (pct < -50) return { label: `${Math.round(absPct)}% below nominal`, color: 'var(--gs-red)' };
  if (pct < -20) return { label: `${Math.round(absPct)}% below nominal`, color: 'var(--gs-amber)' };
  if (pct < -5)  return { label: `${Math.round(absPct)}% below nominal`, color: 'var(--gs-text-secondary)' };
  if (pct > 30)  return { label: `+${Math.round(absPct)}% above nominal`, color: 'var(--gs-red)' };
  if (pct > 10)  return { label: `+${Math.round(absPct)}% above nominal`, color: 'var(--gs-amber)' };
  return { label: `+${Math.round(absPct)}% above nominal`, color: 'var(--gs-text-secondary)' };
}

const tooltipStyle = {
  backgroundColor: 'var(--gs-surface-2)',
  border: '1px solid var(--gs-border-strong)',
  borderRadius: 2,
  fontSize: 11,
};
const labelStyle = { color: '#6e7681', fontFamily: 'IBM Plex Mono' };

export function TelemetryChart() {
  const { state } = useGrid();
  const { telemetry } = state;

  // Last 30 readings
  const data = telemetry.slice(-30).map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      timeZone: 'Asia/Kolkata',
    }),
    current: Number(t.current.toFixed(1)),
    voltage: Number(t.voltage.toFixed(0)),
    temp: Number(t.transformer_temp.toFixed(1)),
  }));

  const last = data[data.length - 1];

  // Contextual interpretation of latest readings
  const currentDev = last ? getDeviation(last.current, telemetryBaselines.current.normal, 'A') : null;
  const voltageDev = last ? getDeviation(last.voltage, telemetryBaselines.voltage.normal, 'V') : null;
  const tempDev    = last ? getDeviation(last.temp,    telemetryBaselines.temp.normal,    '°C') : null;

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: 12 }}>
      <div className="gs-section-label px-3 mb-2">Live telemetry</div>

      <div className="flex-1 grid grid-cols-1 gap-3 px-3 pb-2" style={{ minHeight: 0 }}>

        {/* ── Current ── */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          {/* Interpretation header */}
          <div className="flex items-baseline gap-3 mb-1">
            <div>
              <span className="gs-section-label" style={{ color: 'var(--gs-text-tertiary)', fontSize: 9 }}>
                CURRENT
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-sm font-bold" style={{ color: 'var(--gs-blue)' }}>
                  {last ? `${last.current} A` : '—'}
                </span>
                {currentDev && (
                  <span className="text-[10px]" style={{ color: currentDev.color }}>
                    {currentDev.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1" style={{ minHeight: 50 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" tick={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                <ReferenceLine
                  y={10}
                  stroke="rgba(248,81,73,0.3)"
                  strokeDasharray="4 4"
                  label={{ value: 'FAULT THRESHOLD', position: 'right', fill: '#f85149', fontSize: 8, fontFamily: 'IBM Plex Sans' }}
                />
                <Line type="monotone" dataKey="current" stroke="#58a6ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Voltage ── */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-baseline gap-3 mb-1">
            <div>
              <span className="gs-section-label" style={{ color: 'var(--gs-text-tertiary)', fontSize: 9 }}>
                VOLTAGE
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-sm font-bold" style={{ color: 'var(--gs-amber)' }}>
                  {last ? `${last.voltage} V` : '—'}
                </span>
                {voltageDev && (
                  <span className="text-[10px]" style={{ color: voltageDev.color }}>
                    {voltageDev.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1" style={{ minHeight: 50 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" tick={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={28} domain={[150, 260]} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                <ReferenceLine
                  y={200}
                  stroke="rgba(248,81,73,0.3)"
                  strokeDasharray="4 4"
                  label={{ value: 'COLLAPSE', position: 'right', fill: '#f85149', fontSize: 8, fontFamily: 'IBM Plex Sans' }}
                />
                <Line type="monotone" dataKey="voltage" stroke="#d29922" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Transformer Temp ── */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-baseline gap-3 mb-1">
            <div>
              <span className="gs-section-label" style={{ color: 'var(--gs-text-tertiary)', fontSize: 9 }}>
                TRANSFORMER TEMP
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-sm font-bold" style={{ color: 'var(--gs-red)' }}>
                  {last ? `${last.temp}°C` : '—'}
                </span>
                {tempDev && (
                  <span className="text-[10px]" style={{ color: tempDev.color }}>
                    {tempDev.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1" style={{ minHeight: 50 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={28} domain={[40, 100]} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                <ReferenceLine
                  y={75}
                  stroke="rgba(210,153,34,0.35)"
                  strokeDasharray="4 4"
                  label={{ value: 'WARNING', position: 'right', fill: '#d29922', fontSize: 8, fontFamily: 'IBM Plex Sans' }}
                />
                <Line type="monotone" dataKey="temp" stroke="#f85149" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
