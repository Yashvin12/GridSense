// InspectionStops — crew dispatch with clear operational answers
// Each stop answers: WHERE? WHY? PROBABILITY? WHAT HAPPENED? WHAT NEXT?
// Large action buttons (Fitts's Law). Explicit 'INSPECTION PRIORITY' label.
// Belief update delta prominently shown after crew feedback.

import { useGrid } from '../../context/GridContext';
import { StatusDot } from '../shared/StatusDot';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { useState } from 'react';

export function InspectionStops() {
  const { state, confirmStop, denyStop } = useGrid();
  const { crewPlan, etaMinutes, sectionProbabilities } = state;

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

  const statusDotMap: Record<string, 'powered' | 'affected' | 'warning' | 'offline'> = {
    pending: 'offline',
    inspecting: 'warning',
    fault_found: 'affected',
    no_fault: 'powered',
  };

  // Pending stops: find the first one for "NEXT" indicator
  const firstPendingOrder = crewPlan.filter(s => s.status === 'pending')[0]?.order;

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: 12 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 mb-3">
        <div className="gs-section-label">Inspection route</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>Crew ETA</span>
          <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--gs-text-secondary)' }}>
            {etaMinutes} min
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-px overflow-y-auto custom-scrollbar px-3 pb-3">
        {crewPlan.map((stop, idx) => {
          const isDone = stop.status === 'fault_found' || stop.status === 'no_fault';
          const isNext = stop.order === firstPendingOrder;

          const showDelta = lastAction?.stop === stop.stop && isDone;
          const prevTopProb = prevProbs['B'] || 0;
          const currentTopProb = topSection?.probability || 0;

          // Find the next stop name for NEXT indicator
          const nextStop = crewPlan[idx + 1];

          return (
            <div
              key={stop.stop}
              style={{
                borderBottom: '1px solid var(--gs-border)',
                paddingTop: 12,
                paddingBottom: 12,
              }}
            >
              {/* Stop header: order + name + probability */}
              <div className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center w-7 h-7 text-xs font-bold font-mono shrink-0"
                  style={{
                    backgroundColor: isDone
                      ? stop.status === 'fault_found' ? 'rgba(248,81,73,0.1)' : 'rgba(63,185,80,0.1)'
                      : isNext ? 'rgba(88,166,255,0.08)' : 'var(--gs-surface-3)',
                    border: `1px solid ${isDone
                      ? stop.status === 'fault_found' ? 'rgba(248,81,73,0.3)' : 'rgba(63,185,80,0.3)'
                      : isNext ? 'rgba(88,166,255,0.2)' : 'var(--gs-border)'}`,
                    borderRadius: 2,
                    color: isDone
                      ? stop.status === 'fault_found' ? 'var(--gs-red)' : 'var(--gs-green)'
                      : isNext ? 'var(--gs-blue)' : 'var(--gs-text-secondary)',
                  }}
                >
                  {stop.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-[var(--gs-text)]">
                        {stop.stop}
                      </span>
                      {isNext && !isDone && (
                        <span
                          className="ml-2 text-[9px] font-semibold font-mono"
                          style={{ color: 'var(--gs-blue)' }}
                        >
                          NEXT
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--gs-amber)' }}>
                        <AnimatedNumber value={stop.probability * 100} suffix="%" decimals={0} className="text-sm font-bold" />
                      </div>
                      <div className="text-[9px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                        inspection priority
                      </div>
                    </div>
                  </div>

                  {/* Status dot + label */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusDot status={statusDotMap[stop.status]} size="sm" pulse={!isDone && isNext} />
                    <span className="text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                      {stop.status === 'pending' && (isNext ? 'Dispatch to this location' : 'Awaiting inspection')}
                      {stop.status === 'inspecting' && 'Inspecting now'}
                      {stop.status === 'fault_found' && '✓ Fault confirmed'}
                      {stop.status === 'no_fault' && '— Section clear'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reasoning — shown for pending stops */}
              {!isDone && (
                <div className="ml-10 mt-2">
                  <div className="text-[9px] font-semibold mb-1" style={{ color: 'var(--gs-text-tertiary)', letterSpacing: '0.05em' }}>
                    WHY {stop.order === 1 ? 'FIRST' : stop.order === 2 ? 'SECOND' : 'THIRD'}
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

              {/* Done state: crew result + belief update */}
              {isDone && (
                <div className="ml-10 mt-2">
                  <div
                    className="text-xs font-semibold"
                    style={{ color: stop.status === 'fault_found' ? 'var(--gs-red)' : 'var(--gs-green)' }}
                  >
                    {stop.status === 'fault_found' ? '✓ FAULT CONFIRMED' : '— SECTION CLEAR'}
                  </div>

                  {/* Belief update delta — the closed loop */}
                  {showDelta && prevTopProb > 0 && (
                    <div
                      className="mt-1.5 py-1.5 px-2"
                      style={{
                        borderLeft: `2px solid ${stop.status === 'fault_found' ? 'var(--gs-red)' : 'var(--gs-green)'}`,
                      }}
                    >
                      <div className="text-[9px] font-semibold mb-0.5" style={{ color: 'var(--gs-text-tertiary)', letterSpacing: '0.05em' }}>
                        BELIEF UPDATE
                      </div>
                      <div className="font-mono text-xs" style={{ color: 'var(--gs-text-secondary)' }}>
                        Section B posterior:{' '}
                        <span style={{ color: 'var(--gs-text-tertiary)' }}>{Math.round(prevTopProb * 100)}%</span>
                        <span style={{ color: 'var(--gs-text-tertiary)' }}> → </span>
                        <span
                          style={{ color: stop.status === 'fault_found' ? 'var(--gs-red)' : 'var(--gs-green)', fontWeight: 700 }}
                        >
                          {Math.round(currentTopProb * 100)}%
                        </span>
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--gs-text-tertiary)' }}>
                        Bayesian belief updated from crew evidence
                      </div>
                    </div>
                  )}

                  {isDone && !showDelta && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--gs-text-tertiary)' }}>
                      Bayesian belief updated
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons — large hit targets (Fitts's Law) */}
              {!isDone && (
                <div className="flex items-center gap-2 ml-10 mt-3">
                  <button
                    onClick={() => handleConfirm(stop.stop)}
                    className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer flex-1"
                    style={{
                      backgroundColor: 'rgba(248, 81, 73, 0.08)',
                      border: '1px solid rgba(248, 81, 73, 0.25)',
                      color: '#f85149',
                      borderRadius: 2,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248, 81, 73, 0.18)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248, 81, 73, 0.08)'; }}
                    aria-label={`Confirm fault found at ${stop.stop}`}
                  >
                    FAULT FOUND
                  </button>

                  <button
                    onClick={() => handleDeny(stop.stop)}
                    className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer flex-1"
                    style={{
                      backgroundColor: 'rgba(110, 118, 129, 0.06)',
                      border: '1px solid rgba(110, 118, 129, 0.2)',
                      color: 'var(--gs-text-secondary)',
                      borderRadius: 2,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(110, 118, 129, 0.14)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(110, 118, 129, 0.06)'; }}
                    aria-label={`Report no fault at ${stop.stop}`}
                  >
                    NO FAULT
                  </button>
                </div>
              )}

              {/* NEXT indicator */}
              {isDone && nextStop && nextStop.status === 'pending' && (
                <div className="ml-10 mt-2 text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
                  Next → {nextStop.stop}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
