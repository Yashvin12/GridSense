// InspectionStops — crew dispatch with clear operational answers
// Primary question: WHERE SHOULD THE CREW GO FIRST? Secondary: WHY?
// "INSPECT NOW" header dominates the first pending stop.
// Probability is prominent; reasoning explains the ranking.
// Large action buttons (Fitts's Law). Belief update delta shown after crew feedback.
// All existing logic (confirmStop, denyStop, prevProbs, lastAction) preserved exactly.

import { useGrid } from '../../context/GridContext';
import { StatusDot } from '../shared/StatusDot';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { useState } from 'react';

// Ordinal label for WHY heading
function ordinalLabel(order: number) {
  if (order === 1) return 'FIRST';
  if (order === 2) return 'SECOND';
  return 'THIRD';
}

// Status text — operational language, no emoji
const statusText: Record<string, string> = {
  pending_next:  'Dispatch to this location',
  pending_wait:  'Awaiting inspection',
  inspecting:    'Inspecting now',
  fault_found:   'Fault confirmed',
  no_fault:      'Section clear',
};

const statusDotMap: Record<string, 'powered' | 'affected' | 'warning' | 'offline'> = {
  pending:     'offline',
  inspecting:  'warning',
  fault_found: 'affected',
  no_fault:    'powered',
};

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

  // First pending stop — this is the operational priority
  const firstPendingOrder = crewPlan.filter(s => s.status === 'pending')[0]?.order;

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: 12 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="gs-section-label">Inspection route</div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--gs-text-tertiary)', letterSpacing: '0.03em' }}
          >
            CREW ETA
          </span>
          <span
            className="font-mono font-semibold tabular-nums"
            style={{ fontSize: 12, color: 'var(--gs-text-secondary)' }}
          >
            {etaMinutes} min
          </span>
        </div>
      </div>

      {/* ── Stop list ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
        {crewPlan.map((stop, idx) => {
          const isDone = stop.status === 'fault_found' || stop.status === 'no_fault';
          const isNext = stop.order === firstPendingOrder;
          const showDelta = lastAction?.stop === stop.stop && isDone;
          const prevTopProb = prevProbs['B'] || 0;
          const currentTopProb = topSection?.probability || 0;
          const nextStop = crewPlan[idx + 1];
          const faultFound = stop.status === 'fault_found';

          const statusKey = isDone
            ? stop.status
            : isNext ? 'pending_next' : 'pending_wait';

          return (
            <div key={stop.stop}>

              {/* ── INSPECT NOW banner — appears above the first pending stop only ── */}
              {isNext && !isDone && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 6,
                    paddingTop: idx > 0 ? 14 : 0,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: 'rgba(248,81,73,0.2)',
                    }}
                  />
                  <span
                    className="font-mono font-semibold"
                    style={{
                      fontSize: 9,
                      color: 'var(--gs-red)',
                      letterSpacing: '0.12em',
                      userSelect: 'none',
                    }}
                  >
                    INSPECT NOW
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: 'rgba(248,81,73,0.2)',
                    }}
                  />
                </div>
              )}

              {/* ── Stop block ── */}
              <div
                style={{
                  borderBottom: '1px solid var(--gs-border)',
                  paddingTop: 10,
                  paddingBottom: 12,
                  // Faint red tint only on the active "inspect now" stop
                  backgroundColor: isNext && !isDone
                    ? 'rgba(248,81,73,0.025)'
                    : 'transparent',
                }}
              >
                {/* Stop header: order · name · probability */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

                  {/* Order index — no box border, just typographic weight */}
                  <div
                    className="font-mono font-bold tabular-nums"
                    style={{
                      fontSize: 11,
                      color: isDone
                        ? faultFound ? 'var(--gs-red)' : 'var(--gs-green)'
                        : isNext ? 'var(--gs-text-secondary)' : 'var(--gs-text-tertiary)',
                      paddingTop: 2,
                      minWidth: 16,
                      userSelect: 'none',
                    }}
                  >
                    {String(stop.order).padStart(2, '0')}
                  </div>

                  {/* Name + status + reasoning */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Name row + probability */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: isDone
                            ? faultFound ? 'var(--gs-red)' : 'var(--gs-text-secondary)'
                            : 'var(--gs-text)',
                          letterSpacing: '-0.01em',
                          textDecoration: isDone && !faultFound ? 'line-through' : 'none',
                          textDecorationColor: 'var(--gs-text-tertiary)',
                        }}
                      >
                        {stop.stop}
                      </span>

                      {/* Probability — right-aligned, prominent but not a KPI card */}
                      {!isDone && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div
                            className="font-mono tabular-nums font-bold"
                            style={{
                              fontSize: isNext ? 20 : 14,
                              color: isNext ? 'var(--gs-text)' : 'var(--gs-text-secondary)',
                              lineHeight: 1,
                            }}
                          >
                            <AnimatedNumber value={stop.probability * 100} suffix="%" decimals={0} />
                          </div>
                          <div
                            className="font-mono"
                            style={{ fontSize: 9, color: 'var(--gs-text-tertiary)', marginTop: 2, letterSpacing: '0.04em' }}
                          >
                            PRIORITY
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <StatusDot
                        status={statusDotMap[stop.status]}
                        size="sm"
                        pulse={!isDone && isNext}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          color: isDone
                            ? faultFound ? 'var(--gs-red)' : 'var(--gs-green)'
                            : 'var(--gs-text-tertiary)',
                          fontWeight: isDone ? 600 : 400,
                        }}
                      >
                        {statusText[statusKey]}
                      </span>
                    </div>

                    {/* Reasoning — pending stops only */}
                    {!isDone && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--gs-text-tertiary)',
                            letterSpacing: '0.07em',
                            marginBottom: 4,
                          }}
                        >
                          WHY {ordinalLabel(stop.order)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {stop.reasoning.map((reason, ri) => (
                            <div
                              key={ri}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 6,
                                fontSize: 11,
                                color: isNext ? 'var(--gs-text-secondary)' : 'var(--gs-text-tertiary)',
                                lineHeight: 1.35,
                              }}
                            >
                              <span
                                style={{
                                  color: 'var(--gs-text-tertiary)',
                                  flexShrink: 0,
                                  marginTop: 1,
                                  fontSize: 10,
                                }}
                              >
                                ·
                              </span>
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Done state: result + belief delta */}
                    {isDone && (
                      <div style={{ marginTop: 8 }}>
                        {/* Belief update delta — the closed-loop feedback */}
                        {showDelta && prevTopProb > 0 && (
                          <div
                            style={{
                              padding: '6px 8px',
                              borderLeft: `2px solid ${faultFound ? 'var(--gs-red)' : 'var(--gs-green)'}`,
                              marginTop: 4,
                            }}
                          >
                            <div
                              className="font-mono"
                              style={{
                                fontSize: 9,
                                fontWeight: 600,
                                color: 'var(--gs-text-tertiary)',
                                letterSpacing: '0.06em',
                                marginBottom: 3,
                              }}
                            >
                              BELIEF UPDATE
                            </div>
                            <div
                              className="font-mono"
                              style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}
                            >
                              Section B posterior:{' '}
                              <span style={{ color: 'var(--gs-text-tertiary)' }}>
                                {Math.round(prevTopProb * 100)}%
                              </span>
                              <span style={{ color: 'var(--gs-text-tertiary)', margin: '0 2px' }}>→</span>
                              <span
                                style={{
                                  color: faultFound ? 'var(--gs-red)' : 'var(--gs-green)',
                                  fontWeight: 700,
                                }}
                              >
                                {Math.round(currentTopProb * 100)}%
                              </span>
                            </div>
                            <div
                              style={{ fontSize: 10, color: 'var(--gs-text-tertiary)', marginTop: 2 }}
                            >
                              Bayesian belief updated from crew evidence
                            </div>
                          </div>
                        )}
                        {isDone && !showDelta && (
                          <div style={{ fontSize: 10, color: 'var(--gs-text-tertiary)', marginTop: 2 }}>
                            Bayesian belief updated
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Action buttons — Fitts's Law: large, clearly separated ── */}
                    {!isDone && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>

                        {/* FAULT FOUND — primary danger action */}
                        <button
                          onClick={() => handleConfirm(stop.stop)}
                          aria-label={`Confirm fault found at ${stop.stop}`}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'IBM Plex Mono, monospace',
                            letterSpacing: '0.06em',
                            color: '#f85149',
                            backgroundColor: 'rgba(248, 81, 73, 0.09)',
                            border: '1px solid rgba(248, 81, 73, 0.3)',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'background-color 120ms ease',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248, 81, 73, 0.18)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248, 81, 73, 0.09)';
                          }}
                        >
                          FAULT FOUND
                        </button>

                        {/* NO FAULT — neutral clear action */}
                        <button
                          onClick={() => handleDeny(stop.stop)}
                          aria-label={`Report no fault at ${stop.stop}`}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'IBM Plex Mono, monospace',
                            letterSpacing: '0.06em',
                            color: 'var(--gs-text-secondary)',
                            backgroundColor: 'rgba(110, 118, 129, 0.06)',
                            border: '1px solid rgba(110, 118, 129, 0.2)',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'background-color 120ms ease',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(110, 118, 129, 0.15)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(110, 118, 129, 0.06)';
                          }}
                        >
                          NO FAULT
                        </button>
                      </div>
                    )}

                    {/* Next pointer after done */}
                    {isDone && nextStop && nextStop.status === 'pending' && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 10,
                          color: 'var(--gs-text-tertiary)',
                          fontFamily: 'IBM Plex Mono, monospace',
                        }}
                      >
                        Next → {nextStop.stop}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
