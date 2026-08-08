// InspectionStops — crew dispatch with posterior probability, reasoning,
// large action buttons (Fitts's Law), and belief update feedback

import { useGrid } from '../../context/GridContext';
import { StatusDot } from '../shared/StatusDot';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { useState } from 'react';

export function InspectionStops() {
  const { state, confirmStop, denyStop } = useGrid();
  const { crewPlan, etaMinutes, sectionProbabilities } = state;

  // Track previous probabilities for showing belief update delta
  const [prevProbs, setPrevProbs] = useState<Record<string, number>>({});
  const [lastAction, setLastAction] = useState<{ stop: string; found: boolean } | null>(null);

  const topSection = [...sectionProbabilities].sort((a, b) => b.probability - a.probability)[0];

  const handleConfirm = (stopName: string) => {
    const probs: Record<string, number> = {};
    sectionProbabilities.forEach(sp => { probs[sp.section] = sp.probability; });
    setPrevProbs(probs);
    setLastAction({ stop: stopName, found: true });
    confirmStop(stopName);
  };

  const handleDeny = (stopName: string) => {
    const probs: Record<string, number> = {};
    sectionProbabilities.forEach(sp => { probs[sp.section] = sp.probability; });
    setPrevProbs(probs);
    setLastAction({ stop: stopName, found: false });
    denyStop(stopName);
  };

  const statusLabels: Record<string, string> = {
    pending: 'Awaiting inspection',
    inspecting: 'Inspecting',
    fault_found: 'Fault confirmed',
    no_fault: 'Section clear',
  };

  const statusDotMap: Record<string, 'powered' | 'affected' | 'warning' | 'offline'> = {
    pending: 'offline',
    inspecting: 'warning',
    fault_found: 'affected',
    no_fault: 'powered',
  };

  return (
    <div className="gs-panel h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="gs-section-label">Inspection Route</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>ETA</span>
          <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--gs-text-secondary)' }}>
            {etaMinutes} min
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        {crewPlan.map((stop) => {
          const isDone = stop.status === 'fault_found' || stop.status === 'no_fault';

          // Check if this stop was the last action for showing delta
          const showDelta = lastAction?.stop === stop.stop && isDone;
          const prevTopProb = prevProbs['B'] || 0;
          const currentTopProb = topSection?.probability || 0;

          return (
            <div
              key={stop.stop}
              className="p-3"
              style={{
                backgroundColor: isDone
                  ? stop.status === 'fault_found' ? 'rgba(248,81,73,0.04)' : 'rgba(63,185,80,0.04)'
                  : 'var(--gs-surface-2)',
                border: `1px solid ${isDone
                  ? stop.status === 'fault_found' ? 'rgba(248,81,73,0.15)' : 'rgba(63,185,80,0.15)'
                  : 'var(--gs-border)'}`,
                borderRadius: 3,
              }}
            >
              {/* Header: order + name + status */}
              <div className="flex items-start gap-3 mb-2">
                <span
                  className="flex items-center justify-center w-7 h-7 text-xs font-bold font-mono shrink-0"
                  style={{
                    backgroundColor: 'var(--gs-surface-3)',
                    borderRadius: 2,
                    color: isDone
                      ? stop.status === 'fault_found' ? 'var(--gs-red)' : 'var(--gs-green)'
                      : 'var(--gs-text-secondary)',
                  }}
                >
                  {stop.order}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--gs-text)]">{stop.stop}</span>
                    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--gs-amber)' }}>
                      <AnimatedNumber value={stop.probability * 100} suffix="%" decimals={0} className="text-sm font-bold" />
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusDot status={statusDotMap[stop.status]} size="sm" pulse={!isDone} />
                    <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                      {statusLabels[stop.status]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              {!isDone && (
                <div className="mb-3 ml-10">
                  <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--gs-text-tertiary)' }}>
                    WHY {stop.order === 1 ? 'FIRST' : stop.order === 2 ? 'SECOND' : 'THIRD'}?
                  </div>
                  <div className="space-y-0.5">
                    {stop.reasoning.map((reason, ri) => (
                      <div key={ri} className="text-[11px] flex items-start gap-1.5"
                        style={{ color: 'var(--gs-text-secondary)' }}
                      >
                        <span style={{ color: 'var(--gs-text-tertiary)' }}>·</span>
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons — large hit targets (Fitts's Law) */}
              {!isDone && (
                <div className="flex items-center gap-2 ml-10">
                  <button
                    onClick={() => handleConfirm(stop.stop)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer flex-1"
                    style={{
                      backgroundColor: 'rgba(248, 81, 73, 0.1)',
                      border: '1px solid rgba(248, 81, 73, 0.25)',
                      color: '#f85149',
                      borderRadius: 3,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(248, 81, 73, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(248, 81, 73, 0.1)';
                    }}
                    aria-label={`Confirm fault found at ${stop.stop}`}
                  >
                    <span>●</span>
                    FAULT FOUND
                  </button>

                  <button
                    onClick={() => handleDeny(stop.stop)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer flex-1"
                    style={{
                      backgroundColor: 'rgba(110, 118, 129, 0.08)',
                      border: '1px solid rgba(110, 118, 129, 0.25)',
                      color: 'var(--gs-text-secondary)',
                      borderRadius: 3,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(110, 118, 129, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(110, 118, 129, 0.08)';
                    }}
                    aria-label={`Report no fault at ${stop.stop}`}
                  >
                    <span>✓</span>
                    NO FAULT
                  </button>
                </div>
              )}

              {/* Done state: belief update feedback */}
              {isDone && (
                <div className="ml-10">
                  <div className="text-[11px] font-medium mb-1"
                    style={{ color: stop.status === 'fault_found' ? 'var(--gs-red)' : 'var(--gs-green)' }}
                  >
                    CREW FEEDBACK RECEIVED
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                    → Bayesian belief updated
                  </div>
                  {showDelta && prevTopProb > 0 && (
                    <div className="text-[11px] font-mono mt-1" style={{ color: 'var(--gs-text-secondary)' }}>
                      Section B: {Math.round(prevTopProb * 100)}% → {Math.round(currentTopProb * 100)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
