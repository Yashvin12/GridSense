// FaultSummaryPanel — primary fault state display
// Visual hierarchy: fault location → posterior → why → cause → impact → actions

import { useGrid } from '../../context/GridContext';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { StatusDot } from '../shared/StatusDot';
import { WhyThisLocation } from './WhyThisLocation';

export function FaultSummaryPanel() {
  const { state } = useGrid();
  const { fault, affectedVillages, switchingPlan, causes } = state;

  const topCause = causes[0];

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar" style={{ gap: 0 }}>

      {/* ═══════ 1. Fault Identity ═══════ */}
      <div className="px-3 pt-3 pb-2">
        {/* Feeder/circuit identifier */}
        <div className="gs-section-label mb-2" style={{ color: 'var(--gs-text-tertiary)' }}>
          Mulshi 33kV — Feeder 1
        </div>

        {/* Fault zone */}
        <div className="text-base font-semibold text-[var(--gs-text)] leading-tight">
          {fault.section}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--gs-text-tertiary)' }}>
          Section B · Offline
        </div>

        {/* 2. Posterior probability — primary number */}
        <div className="mt-3">
          <AnimatedNumber
            value={fault.confidence * 100}
            suffix="%"
            decimals={0}
            className="text-3xl font-bold"
          />
          <div className="gs-section-label mt-0.5" style={{ color: 'var(--gs-red)' }}>
            Posterior probability of fault
          </div>
        </div>
      </div>

      <div className="gs-divider mx-3" />

      {/* ═══════ 3. WHY THIS LOCATION? ═══════ */}
      <div className="px-3 py-2">
        <WhyThisLocation />
      </div>

      <div className="gs-divider mx-3" />

      {/* ═══════ 4. Probable Cause ═══════ */}
      <div className="px-3 py-2">
        <div className="gs-section-label mb-1.5">Probable cause</div>
        <div className="text-sm font-semibold text-[var(--gs-text)]">
          {topCause.label}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-mono text-base font-bold tabular-nums" style={{ color: 'var(--gs-amber)' }}>
            <AnimatedNumber value={topCause.probability * 100} suffix="%" decimals={0} className="text-base font-bold" />
          </span>
          <span className="gs-section-label" style={{ color: 'var(--gs-text-tertiary)' }}>
            cause probability
          </span>
        </div>
      </div>

      <div className="gs-divider mx-3" />

      {/* ═══════ 5. Impact ═══════ */}
      <div className="px-3 py-2">
        <div className="gs-section-label mb-1.5">Impact</div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold tabular-nums" style={{ color: 'var(--gs-red)' }}>
            {affectedVillages.length}
          </span>
          <span className="text-xs" style={{ color: 'var(--gs-text-secondary)' }}>
            villages without supply
          </span>
        </div>
        <div className="mt-1.5 space-y-1">
          {affectedVillages.map((v) => (
            <div key={v} className="flex items-center gap-1.5 text-xs">
              <StatusDot status="affected" size="sm" />
              <span style={{ color: 'var(--gs-text-secondary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="gs-divider mx-3" />

      {/* ═══════ 6. Recommended Actions ═══════ */}
      <div className="px-3 py-2 pb-3">
        <div className="gs-section-label mb-2">Recommended actions</div>
        <div className="space-y-1.5">
          {switchingPlan.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className="flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold font-mono shrink-0 mt-px"
                style={{
                  backgroundColor: 'var(--gs-surface-3)',
                  borderRadius: 2,
                  color: step.status === 'completed' ? 'var(--gs-green)' : 'var(--gs-text-secondary)',
                }}
              >
                {i + 1}
              </span>
              <span className="text-xs leading-snug" style={{ color: 'var(--gs-text-secondary)' }}>
                {step.action}
              </span>
              <span className="text-[9px] font-mono ml-auto shrink-0"
                style={{
                  color: step.status === 'recommended' ? 'var(--gs-amber)' :
                         step.status === 'completed' ? 'var(--gs-green)' :
                         step.status === 'blocked' ? 'var(--gs-red)' :
                         'var(--gs-text-tertiary)',
                }}
              >
                {step.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
