// InspectionStops — enhanced field-crew workspace
//
// Field questions answered within 5 seconds:
//   1. What fault am I responding to?    → Active fault banner
//   2. Where do I need to go?            → Assignment card (Pole 44, Section B)
//   3. Why am I going there?             → WHY block (reasoning bullets)
//   4. How urgent is it?                 → 91% priority badge
//   5. What do I need to do?             → FAULT FOUND / NO FAULT buttons
//   6. How do I report the result?       → Confirmation dialog
//   7. What happens next?                → NEXT INSPECTION callout
//
// Enhancements over original:
//   - Crew status machine (EN ROUTE → INSPECTING → INSPECTION COMPLETE)
//   - START NAVIGATION → NAVIGATION ACTIVE state transition
//   - Two-step inspection confirmation (no alert())
//   - Optional field observation (quick tags + short note)
//   - Active assignment card is visually dominant
//   - Future stops are secondary
//   - Touch-friendly buttons (min 44px)
//   - All existing confirmStop/denyStop logic preserved exactly

import { useGrid } from '../../context/GridContext';
import { StatusDot } from '../shared/StatusDot';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

// ---------------------------------------------------------------------------
// Ordinal label for WHY heading
// ---------------------------------------------------------------------------
function ordinalLabel(order: number) {
  if (order === 1) return 'FIRST';
  if (order === 2) return 'SECOND';
  return 'THIRD';
}

// ---------------------------------------------------------------------------
// Crew status machine
// ---------------------------------------------------------------------------
type CrewStatus = 'available' | 'en_route' | 'inspecting' | 'complete';

const crewStatusLabel: Record<CrewStatus, string> = {
  available:  'AVAILABLE',
  en_route:   'EN ROUTE',
  inspecting: 'INSPECTING',
  complete:   'INSPECTION COMPLETE',
};

const crewStatusColor: Record<CrewStatus, string> = {
  available:  'var(--gs-text-tertiary)',
  en_route:   'var(--gs-amber)',
  inspecting: 'var(--gs-blue)',
  complete:   'var(--gs-green)',
};

// ---------------------------------------------------------------------------
// Status text — operational language, no emoji
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Quick observation tags
// ---------------------------------------------------------------------------
const QUICK_TAGS = [
  'Vegetation contact',
  'Broken conductor',
  'Transformer issue',
  'No visible damage',
  'Other',
] as const;

// ---------------------------------------------------------------------------
// Shared button style helpers (avoids repetition)
// ---------------------------------------------------------------------------
function faultFoundBtnStyle(base: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '12px 0',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'IBM Plex Mono, monospace',
    letterSpacing: '0.06em',
    color: '#f85149',
    backgroundColor: base ? 'rgba(248, 81, 73, 0.09)' : 'rgba(248, 81, 73, 0.18)',
    border: '1px solid rgba(248, 81, 73, 0.3)',
    borderRadius: 2,
    cursor: 'pointer',
    transition: 'background-color 120ms ease',
    minHeight: 44,
  };
}

function noFaultBtnStyle(base: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '12px 0',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'IBM Plex Mono, monospace',
    letterSpacing: '0.06em',
    color: 'var(--gs-text-secondary)',
    backgroundColor: base ? 'rgba(110, 118, 129, 0.06)' : 'rgba(110, 118, 129, 0.15)',
    border: '1px solid rgba(110, 118, 129, 0.2)',
    borderRadius: 2,
    cursor: 'pointer',
    transition: 'background-color 120ms ease',
    minHeight: 44,
  };
}

// ---------------------------------------------------------------------------
// Confirmation panel — shown inline after clicking FAULT FOUND / NO FAULT
// ---------------------------------------------------------------------------
interface ConfirmPanelProps {
  stopName: string;
  found: boolean;
  crewName: string;
  observation: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmPanel({ stopName, found, crewName, observation, onConfirm, onCancel }: ConfirmPanelProps) {
  const now = new Date();
  const ts = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return (
    <div
      style={{
        marginTop: 10,
        padding: '12px 14px',
        border: `1px solid ${found ? 'rgba(248,81,73,0.35)' : 'rgba(110,118,129,0.3)'}`,
        backgroundColor: found ? 'rgba(248,81,73,0.06)' : 'rgba(110,118,129,0.05)',
        borderRadius: 2,
      }}
    >
      <div
        className="font-mono"
        style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: found ? 'var(--gs-red)' : 'var(--gs-text-secondary)', marginBottom: 8 }}
      >
        {found ? 'FAULT FOUND — CONFIRM?' : 'NO FAULT — CONFIRM?'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}>
          Location: <span style={{ color: 'var(--gs-text)' }}>{stopName}</span>
        </div>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}>
          Crew: <span style={{ color: 'var(--gs-text)' }}>{crewName}</span>
        </div>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}>
          Time: <span style={{ color: 'var(--gs-text)' }}>{ts}</span>
        </div>
        {observation && (
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}>
            Observation: <span style={{ color: 'var(--gs-text)' }}>{observation}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="gs-crew-confirm-btn"
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: '11px 0',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'IBM Plex Mono, monospace',
            letterSpacing: '0.07em',
            color: found ? '#f85149' : 'var(--gs-green)',
            backgroundColor: found ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.1)',
            border: `1px solid ${found ? 'rgba(248,81,73,0.4)' : 'rgba(63,185,80,0.35)'}`,
            borderRadius: 2,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          {found ? 'CONFIRM FAULT' : 'CONFIRM NO FAULT'}
        </button>
        <button
          className="gs-crew-confirm-btn"
          onClick={onCancel}
          style={{
            padding: '11px 16px',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'IBM Plex Mono, monospace',
            letterSpacing: '0.05em',
            color: 'var(--gs-text-tertiary)',
            backgroundColor: 'transparent',
            border: '1px solid var(--gs-border)',
            borderRadius: 2,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function InspectionStops() {
  const { state, confirmStop, denyStop } = useGrid();
  const { user } = useAuth();
  const { crewPlan, etaMinutes, sectionProbabilities, fault } = state;

  // Belief delta tracking (preserved from original)
  const [prevProbs, setPrevProbs] = useState<Record<string, number>>({});
  const [lastAction, setLastAction] = useState<{ stop: string; found: boolean } | null>(null);

  // Crew status machine
  const [crewStatus, setCrewStatus] = useState<CrewStatus>('en_route');

  // Navigation state per stop
  const [navActive, setNavActive] = useState<Record<string, boolean>>({});

  // Pending confirmation — { stop: string, found: boolean } | null
  const [pendingConfirm, setPendingConfirm] = useState<{ stop: string; found: boolean } | null>(null);

  // Field observation per stop: selected quick tags + free text
  const [obsText, setObsText] = useState<Record<string, string>>({});
  const [obsTags, setObsTags] = useState<Record<string, string[]>>({});

  // Top section for belief delta
  const topSection = [...sectionProbabilities].sort((a, b) => b.probability - a.probability)[0];

  // First pending stop
  const firstPendingOrder = crewPlan.filter(s => s.status === 'pending')[0]?.order;

  // Check if all stops are done
  const allDone = crewPlan.every(s => s.status === 'fault_found' || s.status === 'no_fault');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  function handleNavStart(stopName: string) {
    setNavActive(prev => ({ ...prev, [stopName]: true }));
    setCrewStatus('en_route');
  }

  function handleFaultFound(stopName: string) {
    setPendingConfirm({ stop: stopName, found: true });
  }

  function handleNoFault(stopName: string) {
    setPendingConfirm({ stop: stopName, found: false });
  }

  function handleConfirmResult() {
    if (!pendingConfirm) return;
    const { stop, found } = pendingConfirm;

    const probs: Record<string, number> = {};
    sectionProbabilities.forEach(sp => { probs[sp.section] = sp.probability; });
    setPrevProbs(probs);
    setLastAction({ stop, found });

    if (found) {
      confirmStop(stop);
    } else {
      denyStop(stop);
    }
    setPendingConfirm(null);
    setCrewStatus('inspecting');

    // If all done after this action
    const remaining = crewPlan.filter(s => s.stop !== stop && s.status === 'pending');
    if (remaining.length === 0) {
      setCrewStatus('complete');
    }
  }

  function handleCancelConfirm() {
    setPendingConfirm(null);
  }

  function toggleTag(stop: string, tag: string) {
    setObsTags(prev => {
      const current = prev[stop] ?? [];
      const next = current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag];
      return { ...prev, [stop]: next };
    });
  }

  function getObservation(stop: string): string {
    const tags = obsTags[stop] ?? [];
    const text = obsText[stop] ?? '';
    return [...tags, text].filter(Boolean).join('; ');
  }

  const crewName = user?.name ?? 'Field Crew';

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: 12 }}>

      {/* ── Header: Crew Status ── */}
      <div className="flex items-center justify-between px-4 mb-2">
        <div className="gs-section-label">Inspection Route</div>

        {/* Crew status indicator */}
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: crewStatusColor[crewStatus],
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            className="font-mono"
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: crewStatusColor[crewStatus] }}
          >
            {crewStatusLabel[crewStatus]}
          </span>
        </div>
      </div>

      {/* ── Active Incident Banner ── */}
      <div
        style={{
          marginLeft: 16,
          marginRight: 16,
          marginBottom: 10,
          padding: '8px 12px',
          borderLeft: '2px solid var(--gs-red)',
          backgroundColor: 'rgba(248,81,73,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div>
          <div
            className="font-mono"
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--gs-red)', marginBottom: 2 }}
          >
            ACTIVE FAULT
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--gs-text)' }}
          >
            {fault.section}
          </div>
        </div>

        <div className="text-right">
          <div
            className="font-mono"
            style={{ fontSize: 9, color: 'var(--gs-text-tertiary)', letterSpacing: '0.05em', marginBottom: 2 }}
          >
            CREW ETA
          </div>
          <div
            className="font-mono font-semibold tabular-nums"
            style={{ fontSize: 14, color: 'var(--gs-text-secondary)' }}
          >
            {etaMinutes} min
          </div>
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
          const isNavActive = navActive[stop.stop] ?? false;
          const isPending = pendingConfirm?.stop === stop.stop;
          const stopObservation = getObservation(stop.stop);

          const statusKey = isDone
            ? stop.status
            : isNext ? 'pending_next' : 'pending_wait';

          return (
            <div key={stop.stop}>

              {/* ── INSPECT NOW banner — first pending stop only ── */}
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
                  <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(248,81,73,0.2)' }} />
                  <span
                    className="font-mono font-semibold"
                    style={{ fontSize: 9, color: 'var(--gs-red)', letterSpacing: '0.12em', userSelect: 'none' }}
                  >
                    INSPECT NOW
                  </span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(248,81,73,0.2)' }} />
                </div>
              )}

              {/* ── NEXT INSPECTION banner — for second stop after first is done ── */}
              {!isNext && !isDone && idx > 0 && crewPlan[idx - 1] && (crewPlan[idx - 1].status === 'fault_found' || crewPlan[idx - 1].status === 'no_fault') && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 6,
                    paddingTop: 14,
                  }}
                >
                  <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(210,153,34,0.25)' }} />
                  <span
                    className="font-mono font-semibold"
                    style={{ fontSize: 9, color: 'var(--gs-amber)', letterSpacing: '0.12em', userSelect: 'none' }}
                  >
                    NEXT INSPECTION
                  </span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(210,153,34,0.25)' }} />
                </div>
              )}

              {/* ── Stop block ── */}
              <div
                style={{
                  borderBottom: '1px solid var(--gs-border)',
                  paddingTop: 10,
                  paddingBottom: isDone ? 10 : isNext ? 16 : 10,
                  backgroundColor: isNext && !isDone
                    ? 'rgba(248,81,73,0.025)'
                    : 'transparent',
                  opacity: !isNext && !isDone ? 0.75 : 1,
                  transition: 'opacity 200ms ease',
                }}
              >
                {/* Stop header: order · name · probability */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

                  {/* Order index */}
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

                  {/* Name + status + actions */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Name row + probability */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <span
                          style={{
                            fontSize: isNext ? 16 : 14,
                            fontWeight: 700,
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
                        {isNext && !isDone && (
                          <span
                            className="font-mono"
                            style={{
                              marginLeft: 8,
                              fontSize: 9,
                              color: 'var(--gs-text-tertiary)',
                              letterSpacing: '0.05em',
                              backgroundColor: 'var(--gs-surface-2)',
                              border: '1px solid var(--gs-border)',
                              padding: '1px 5px',
                            }}
                          >
                            Section B
                          </span>
                        )}
                      </div>

                      {/* Probability — right-aligned */}
                      {!isDone && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div
                            className="font-mono tabular-nums font-bold"
                            style={{
                              fontSize: isNext ? 22 : 14,
                              color: isNext ? (stop.probability > 0.7 ? 'var(--gs-red)' : 'var(--gs-amber)') : 'var(--gs-text-secondary)',
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

                    {/* ── Active stop: navigation button ── */}
                    {isNext && !isDone && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          onClick={() => handleNavStart(stop.stop)}
                          style={{
                            width: '100%',
                            padding: '10px 0',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'IBM Plex Mono, monospace',
                            letterSpacing: '0.08em',
                            color: isNavActive ? 'var(--gs-green)' : 'var(--gs-text-secondary)',
                            backgroundColor: isNavActive ? 'rgba(63,185,80,0.08)' : 'rgba(110,118,129,0.06)',
                            border: `1px solid ${isNavActive ? 'rgba(63,185,80,0.3)' : 'rgba(110,118,129,0.2)'}`,
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            minHeight: 44,
                          }}
                          onMouseEnter={e => {
                            if (!isNavActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(110,118,129,0.12)';
                          }}
                          onMouseLeave={e => {
                            if (!isNavActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(110,118,129,0.06)';
                          }}
                        >
                          {isNavActive ? '▶ NAVIGATION ACTIVE' : 'START NAVIGATION'}
                        </button>
                      </div>
                    )}

                    {/* Reasoning — pending stops only */}
                    {!isDone && (
                      <div style={{ marginTop: 10 }}>
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
                              <span style={{ color: 'var(--gs-text-tertiary)', flexShrink: 0, marginTop: 1, fontSize: 10 }}>
                                ·
                              </span>
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Field Observation — pending stops only ── */}
                    {!isDone && (
                      <div style={{ marginTop: 12 }}>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--gs-text-tertiary)',
                            letterSpacing: '0.07em',
                            marginBottom: 6,
                          }}
                        >
                          FIELD OBSERVATION <span style={{ fontWeight: 400, fontSize: 8 }}>(optional)</span>
                        </div>

                        {/* Quick tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
                          {QUICK_TAGS.map(tag => {
                            const active = (obsTags[stop.stop] ?? []).includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleTag(stop.stop, tag)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: 10,
                                  fontFamily: 'IBM Plex Mono, monospace',
                                  letterSpacing: '0.03em',
                                  color: active ? 'var(--gs-text)' : 'var(--gs-text-tertiary)',
                                  backgroundColor: active ? 'var(--gs-surface-2)' : 'transparent',
                                  border: `1px solid ${active ? 'var(--gs-border-strong)' : 'var(--gs-border)'}`,
                                  borderRadius: 2,
                                  cursor: 'pointer',
                                  transition: 'all 100ms ease',
                                  minHeight: 30,
                                }}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>

                        {/* Optional text input */}
                        <textarea
                          value={obsText[stop.stop] ?? ''}
                          onChange={e => setObsText(prev => ({ ...prev, [stop.stop]: e.target.value }))}
                          placeholder="Add observation..."
                          rows={2}
                          style={{
                            width: '100%',
                            backgroundColor: 'var(--gs-surface-2)',
                            border: '1px solid var(--gs-border)',
                            borderRadius: 2,
                            color: 'var(--gs-text)',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: 11,
                            padding: '7px 10px',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(110,118,129,0.5)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'var(--gs-border)'; }}
                        />
                      </div>
                    )}

                    {/* ── Confirmation dialog (inline) ── */}
                    {isPending && (
                      <ConfirmPanel
                        stopName={stop.stop}
                        found={pendingConfirm!.found}
                        crewName={crewName}
                        observation={stopObservation}
                        onConfirm={handleConfirmResult}
                        onCancel={handleCancelConfirm}
                      />
                    )}

                    {/* ── Action buttons — shown when not done and no pending confirm ── */}
                    {!isDone && !isPending && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>

                        {/* FAULT FOUND — primary danger action */}
                        <button
                          className="gs-crew-btn"
                          onClick={() => handleFaultFound(stop.stop)}
                          aria-label={`Confirm fault found at ${stop.stop}`}
                          style={faultFoundBtnStyle(true)}
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
                          className="gs-crew-btn"
                          onClick={() => handleNoFault(stop.stop)}
                          aria-label={`Report no fault at ${stop.stop}`}
                          style={noFaultBtnStyle(true)}
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

                    {/* ── Done state: result + belief delta ── */}
                    {isDone && (
                      <div style={{ marginTop: 8 }}>

                        {/* Result badge */}
                        <div
                          className="font-mono"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            color: faultFound ? 'var(--gs-red)' : 'var(--gs-green)',
                            backgroundColor: faultFound ? 'rgba(248,81,73,0.08)' : 'rgba(63,185,80,0.08)',
                            border: `1px solid ${faultFound ? 'rgba(248,81,73,0.3)' : 'rgba(63,185,80,0.3)'}`,
                            borderRadius: 2,
                            marginBottom: 6,
                          }}
                        >
                          {faultFound ? 'FAULT CONFIRMED' : 'NO FAULT FOUND'}
                        </div>

                        {/* Belief delta */}
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
                            <div className="font-mono" style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}>
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
                            <div style={{ fontSize: 10, color: 'var(--gs-text-tertiary)', marginTop: 2 }}>
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

        {/* ── All done summary ── */}
        {allDone && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              border: '1px solid rgba(63,185,80,0.3)',
              backgroundColor: 'rgba(63,185,80,0.05)',
              borderRadius: 2,
            }}
          >
            <div
              className="font-mono"
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--gs-green)', marginBottom: 4 }}
            >
              ROUTE COMPLETE
            </div>
            <div style={{ fontSize: 11, color: 'var(--gs-text-secondary)' }}>
              All inspection stops reported. Results submitted to Bayesian engine.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
