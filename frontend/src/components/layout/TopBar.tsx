// TopBar - branding + live indicator + confidence badge

import { useGrid } from '../../context/GridContext';
import { StatusDot } from '../shared/StatusDot';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { useEffect, useState } from 'react';

export function TopBar() {
  const { state } = useGrid();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const viewLabels: Record<string, string> = {
    dashboard: 'Fault Dashboard',
    evidence: 'Evidence Stream',
    crew: 'Crew Dispatch',
    analysis: 'Cause Analysis',
  };

  return (
    <header
      className="fixed top-0 left-16 right-0 h-14 flex items-center justify-between px-6 z-30"
      style={{
        backgroundColor: 'rgba(8, 11, 20, 0.9)',
        borderBottom: '1px solid rgba(30, 58, 95, 0.3)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: branding + view name */}
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold tracking-wide" style={{ color: '#06b6d4' }}>
          GRIDMIND
          <span className="text-slate-500 font-normal ml-1.5">AI</span>
        </h1>
        <span className="text-slate-600 text-xs">/</span>
        <span className="text-slate-400 text-sm font-medium">
          {viewLabels[state.activeView]}
        </span>
      </div>

      {/* Right: live status + time + confidence */}
      <div className="flex items-center gap-5">
        {/* Active fault indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
        >
          <StatusDot status="affected" size="sm" />
          <span className="text-xs font-medium text-red-400">ACTIVE FAULT</span>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <StatusDot status="powered" size="sm" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">Live</span>
        </div>

        {/* Clock */}
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          {formattedTime}
        </span>

        {/* Confidence badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
        >
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</span>
          <AnimatedNumber
            value={state.fault.confidence * 100}
            suffix="%"
            decimals={0}
            className="text-sm font-bold text-emerald-400"
          />
        </div>
      </div>
    </header>
  );
}
