// TopBar — SCADA system operational header
// High density telemetry status bar with semantic alert hierarchy

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

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const viewBreadcrumbs: Record<string, string> = {
    dashboard: 'Overview',
    evidence: 'Evidence',
    crew: 'Crew Dispatch',
    analysis: 'Causes',
  };

  return (
    <header
      className="fixed top-0 left-[52px] right-0 h-9 flex items-center justify-between px-3 z-30 select-none"
      style={{
        backgroundColor: '#0d1117',
        borderBottom: '1px solid var(--gs-border)',
      }}
    >
      {/* Left: Quiet Brand + High Contrast Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span className="font-semibold tracking-wider" style={{ color: 'var(--gs-text-tertiary)' }}>
          GRID SENSE
        </span>
        <span style={{ color: 'var(--gs-border-strong)' }}>/</span>
        <span className="font-semibold tracking-wide" style={{ color: 'var(--gs-text)' }}>
          {viewBreadcrumbs[state.activeView]}
        </span>
      </div>

      {/* Right: Operational Status Hierarchy */}
      <div className="flex items-center gap-3 text-[11px]">
        {/* 1. PRIMARY STORY: ACTIVE FAULT INDICATOR */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border"
          style={{
            backgroundColor: 'rgba(248, 81, 73, 0.12)',
            borderColor: 'rgba(248, 81, 73, 0.4)',
          }}
        >
          <StatusDot status="affected" size="sm" pulse />
          <span className="font-mono font-semibold tracking-wide uppercase text-[10px]" style={{ color: 'var(--gs-red)' }}>
            ACTIVE FAULT: {state.fault.section}
          </span>
        </div>

        <span style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* 2. LIVE Connection state */}
        <div className="flex items-center gap-1.5">
          <StatusDot status="powered" size="sm" />
          <span className="font-mono text-[10px] tracking-wide uppercase" style={{ color: 'var(--gs-text-secondary)' }}>
            LIVE
          </span>
        </div>

        <span style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* 3. Bayesian Belief Update telemetry */}
        <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
          <span className="uppercase tracking-tight">BELIEF UPDATED:</span>
          <span className="tabular-nums" style={{ color: 'var(--gs-text-secondary)' }}>
            {state.lastBeliefUpdate}
          </span>
          <span>·</span>
          <span>{state.evidenceCount} updates</span>
        </div>

        <span style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* 4. Real-time System Clock */}
        <div className="font-mono text-[11px] tabular-nums font-medium" style={{ color: 'var(--gs-text-secondary)' }}>
          {formattedTime} UTC
        </div>
      </div>
    </header>
  );
}

