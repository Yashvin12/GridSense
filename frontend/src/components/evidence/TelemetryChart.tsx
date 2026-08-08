// TelemetryChart — real-time current/voltage/temp with threshold annotations
// Telemetry supports reasoning — doesn't compete with main fault view

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useGrid } from '../../context/GridContext';

export function TelemetryChart() {
  const { state } = useGrid();
  const { telemetry } = state;

  // Format data for Recharts
  const data = telemetry.slice(-30).map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    current: Number(t.current.toFixed(1)),
    voltage: Number(t.voltage.toFixed(0)),
    temp: Number(t.transformer_temp.toFixed(1)),
  }));

  const tooltipStyle = {
    backgroundColor: 'var(--gs-surface-2)',
    border: '1px solid var(--gs-border-strong)',
    borderRadius: 3,
    fontSize: 11,
  };

  const labelStyle = { color: '#6e7681' };

  return (
    <div className="gs-panel h-full flex flex-col">
      <div className="gs-section-label mb-2">Live Telemetry</div>
      <div className="flex-1 grid grid-cols-1 gap-2" style={{ minHeight: 0 }}>

        {/* Current */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: 'var(--gs-blue)', borderRadius: 1 }} />
            <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>Current (A)</span>
            <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--gs-text-tertiary)' }}>
              {data.length > 0 ? `${data[data.length - 1].current} A` : ''}
            </span>
          </div>
          <div className="flex-1" style={{ minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#58a6ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" tick={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                {/* Normal threshold */}
                <ReferenceLine y={10} stroke="rgba(110,118,129,0.3)" strokeDasharray="4 4" label={{ value: 'ABNORMAL', position: 'right', fill: '#6e7681', fontSize: 8 }} />
                <Area type="monotone" dataKey="current" stroke="#58a6ff" fill="url(#gradCurrent)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Voltage */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: 'var(--gs-amber)', borderRadius: 1 }} />
            <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>Voltage (V)</span>
            <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--gs-text-tertiary)' }}>
              {data.length > 0 ? `${data[data.length - 1].voltage} V` : ''}
            </span>
          </div>
          <div className="flex-1" style={{ minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="gradVoltage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d29922" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#d29922" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" tick={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={30} domain={[150, 250]} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                {/* Voltage collapse threshold */}
                <ReferenceLine y={200} stroke="rgba(248,81,73,0.4)" strokeDasharray="4 4" label={{ value: 'COLLAPSE', position: 'right', fill: '#f85149', fontSize: 8 }} />
                <Area type="monotone" dataKey="voltage" stroke="#d29922" fill="url(#gradVoltage)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: 'var(--gs-red)', borderRadius: 1 }} />
            <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>Transformer Temp (°C)</span>
            <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--gs-text-tertiary)' }}>
              {data.length > 0 ? `${data[data.length - 1].temp}°C` : ''}
            </span>
          </div>
          <div className="flex-1" style={{ minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f85149" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f85149" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={30} domain={[40, 100]} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                {/* Temperature warning threshold */}
                <ReferenceLine y={75} stroke="rgba(210,153,34,0.4)" strokeDasharray="4 4" label={{ value: 'WARNING', position: 'right', fill: '#d29922', fontSize: 8 }} />
                <Area type="monotone" dataKey="temp" stroke="#f85149" fill="url(#gradTemp)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
