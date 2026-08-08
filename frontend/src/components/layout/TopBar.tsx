// TopBar — system status bar: branding + fault state + belief update time

import { useGrid } from '../../context/GridContext';
import { StatusDot } from '../shared/StatusDot';
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
    dashboard: 'Overview',
    evidence: 'Evidence',
    crew: 'Crew Dispatch',
    analysis: 'Causes',
  };

  return (
    <header
      className="fixed top-0 left-[52px] right-0 h-10 flex items-center justify-between px-4 z-30"
      style={{
        backgroundColor: '#0d1117',
        borderBottom: '1px solid var(--gs-border)',
      }}
    >
      {/* Left: branding + view name */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--gs-text)' }}>
          GRIDSENSE
        </span>
        <span style={{ color: 'var(--gs-text-tertiary)', fontSize: 10 }}>/</span>
        <span className="text-xs font-medium" style={{ color: 'var(--gs-text-secondary)' }}>
          {viewLabels[state.activeView]}
        </span>
      </div>

      {/* Right: operational status */}
      <div className="flex items-center gap-4">
        {/* Active fault indicator */}
        <div className="flex items-center gap-1.5">
          <StatusDot status="affected" size="sm" pulse />
          <span className="text-[11px] font-medium" style={{ color: 'var(--gs-red)' }}>
            ACTIVE FAULT
          </span>
        </div>

        {/* Separator */}
        <span style={{ color: 'var(--gs-border)', fontSize: 11 }}>|</span>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <StatusDot status="powered" size="sm" />
          <span className="text-[11px]" style={{ color: 'var(--gs-text-tertiary)' }}>LIVE</span>
        </div>

        {/* Separator */}
        <span style={{ color: 'var(--gs-border)', fontSize: 11 }}>|</span>

        {/* Belief update status */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]" style={{ color: 'var(--gs-text-tertiary)' }}>
            BELIEF UPDATED
          </span>
          <span className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--gs-text-secondary)' }}>
            {state.lastBeliefUpdate}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
            · {state.evidenceCount} updates
          </span>
        </div>

        {/* Separator */}
        <span style={{ color: 'var(--gs-border)', fontSize: 11 }}>|</span>

        {/* Clock */}
        <span className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--gs-text-tertiary)' }}>
          {formattedTime}
        </span>
      </div>
    </header>
  );
}
