// FaultSummaryPanel — primary fault state display
// Visual hierarchy: fault location → confidence → WHAT TO DO → why → cause → impact → actions
// First inspection target surfaced immediately after the confidence number.

import { useGrid } from '../../context/GridContext';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { WhyThisLocation } from './WhyThisLocation';

export function FaultSummaryPanel() {
  const { state } = useGrid();
  const { fault, affectedVillages, switchingPlan, causes, sectionProbabilities, crewPlan } = state;

  const topCause = causes[0];
  const topSection = [...sectionProbabilities].sort((a, b) => b.probability - a.probability)[0];
  // First pending stop — the actionable field inspection target
  const firstStop = crewPlan.find(s => s.status === 'pending');

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-[var(--gs-bg)]">

      {/* ═══════ LEVEL 1 — DIAGNOSIS ═══════ */}
      <div className="px-5 pt-6 pb-4">
        {/* Fault location */}
        <div className="text-[22px] font-bold tracking-tight text-[var(--gs-text)] leading-tight mb-0.5">
          {fault.section}
        </div>
        <div className="font-mono text-[11px] text-[var(--gs-text-secondary)] mb-5">
          Section {topSection?.section || 'B'} · Fault zone
        </div>

        {/* Fault likelihood — strongest element */}
        <div className="flex items-baseline gap-1">
          <div className="font-mono text-5xl font-semibold tracking-tighter text-[var(--gs-text)]">
            <AnimatedNumber value={fault.confidence * 100} decimals={0} />
          </div>
          <span className="font-mono text-2xl font-semibold text-[var(--gs-text-tertiary)]">%</span>
        </div>

        {/* Confidence bar */}
        <div className="mt-2 mb-4">
          <div className="h-[3px] w-full overflow-hidden" style={{ backgroundColor: 'var(--gs-surface-3)' }}>
            <div className="h-full" style={{ width: `${fault.confidence * 100}%`, backgroundColor: 'var(--gs-red)' }} />
          </div>
          <div className="mt-1 text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
            Fault likelihood
          </div>
        </div>

        {/* First inspection target — answers WHAT TO DO immediately */}
        {firstStop && (
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: 'rgba(248,81,73,0.06)',
              borderLeft: '2px solid rgba(248,81,73,0.5)',
              borderRadius: '0 2px 2px 0',
            }}
          >
            <div className="text-[9px] font-mono tracking-widest mb-1" style={{ color: 'var(--gs-text-tertiary)' }}>
              INSPECT FIRST
            </div>
            <div className="text-[14px] font-semibold" style={{ color: 'var(--gs-text)' }}>
              {firstStop.stop}
            </div>
            <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--gs-text-tertiary)' }}>
              {Math.round(firstStop.probability * 100)}% priority
            </div>
          </div>
        )}
      </div>

      <div className="mx-5 border-t border-[var(--gs-border)] opacity-60 my-1" />

      {/* ═══════ LEVEL 2 — WHY THIS LOCATION? ═══════ */}
      <div className="px-5 py-3">
        <WhyThisLocation />
      </div>

      <div className="mx-5 border-t border-[var(--gs-border)] opacity-60 my-1" />

      <div className="mx-5 border-t border-[var(--gs-border)] opacity-60 my-1" />

      {/* ═══════ LEVEL 4 — PROBABLE CAUSE ═══════ */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div>
          <div className="gs-section-label text-[10px] mb-1">Probable cause</div>
          <div className="text-[13px] font-medium text-[var(--gs-text)]">
            {topCause.label}
          </div>
        </div>
        <div className="font-mono text-[15px] font-semibold" style={{ color: 'var(--gs-amber)' }}>
          <AnimatedNumber value={topCause.probability * 100} decimals={0} />%
        </div>
      </div>

      <div className="mx-5 border-t border-[var(--gs-border)] opacity-60 my-1" />

      {/* ═══════ LEVEL 5 — IMPACT ═══════ */}
      <div className="px-5 py-3">
        <div className="gs-section-label text-[10px] mb-2">Impact</div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: 'var(--gs-red)' }}>
            {affectedVillages.length}
          </span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--gs-text-secondary)' }}>
            villages without supply
          </span>
        </div>
        <div className="flex flex-col gap-1 pl-1">
          {affectedVillages.map((v) => (
            <div key={v} className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-[8px]" style={{ color: 'var(--gs-red)' }}>●</span>
              <span style={{ color: 'var(--gs-text)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-5 border-t border-[var(--gs-border)] opacity-60 my-1" />

      {/* ═══════ LEVEL 6 — RECOMMENDED ACTIONS ═══════ */}
      <div className="px-5 pt-3 pb-8">
        <div className="gs-section-label text-[10px] mb-3">Recommended actions</div>
        <div className="flex flex-col gap-2.5">
          {switchingPlan.map((step, i) => {
            const isRec = step.status === 'recommended';
            const isCompleted = step.status === 'completed';
            return (
              <div key={i} className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] tabular-nums" style={{ color: 'var(--gs-text-tertiary)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[12px] flex-1 leading-snug font-medium" style={{ color: isCompleted ? 'var(--gs-text-tertiary)' : 'var(--gs-text)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                  {step.action}
                </span>
                <span className="font-mono text-[9px] uppercase font-semibold tracking-wider" 
                  style={{ color: isRec ? 'var(--gs-amber)' : isCompleted ? 'var(--gs-green)' : 'var(--gs-text-tertiary)' }}>
                  {step.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
