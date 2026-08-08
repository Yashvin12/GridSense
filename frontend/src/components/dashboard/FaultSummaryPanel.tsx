// FaultSummaryPanel — primary fault state display
// Replaces SummaryCards. Eliminates card soup. Uses continuous workspace.

import { useGrid } from '../../context/GridContext';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { StatusDot } from '../shared/StatusDot';
import { WhyThisLocation } from './WhyThisLocation';

export function FaultSummaryPanel() {
  const { state } = useGrid();
  const { fault, sectionProbabilities, affectedVillages, switchingPlan, causes } = state;

  const topCause = causes[0];

  // Sort sections by probability descending for display
  const sortedSections = [...sectionProbabilities].sort((a, b) => b.probability - a.probability);

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar" style={{ gap: 0 }}>

      {/* ═══════ PRIMARY: Fault Location + Posterior Probability ═══════ */}
      <div className="px-3 pt-3 pb-2">
        <div className="gs-section-label mb-1.5">Fault Location</div>
        <div className="text-lg font-semibold text-[var(--gs-text)] leading-tight">
          {fault.section}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--gs-text-tertiary)' }}>
          Section B
        </div>

        <div className="flex items-baseline gap-2 mt-3">
          <AnimatedNumber
            value={fault.confidence * 100}
            suffix="%"
            decimals={0}
            className="text-3xl font-bold"
          />
          <span className="gs-section-label" style={{ color: 'var(--gs-red)' }}>
            Posterior Probability
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] font-medium" style={{ color: 'var(--gs-text-tertiary)' }}>
            Evidence strength:
          </span>
          <span className="text-[10px] font-semibold" style={{ color: 'var(--gs-amber)' }}>
            HIGH
          </span>
        </div>
      </div>

      <div className="gs-divider mx-3" />

      {/* ═══════ WHY THIS LOCATION? ═══════ */}
      <div className="px-3 py-2">
        <WhyThisLocation />
      </div>

      <div className="gs-divider mx-3" />

      {/* ═══════ Section Probabilities ═══════ */}
      <div className="px-3 py-2">
        <div className="gs-section-label mb-2">Section Probabilities</div>
        <div className="space-y-1.5">
          {sortedSections.map((sp) => {
            const pct = Math.round(sp.probability * 100);
            const isTop = sp.probability > 0.5;
            return (
              <div key={sp.section} className="flex items-center gap-2">
                <span className="text-[11px] font-mono w-[60px] shrink-0"
                  style={{ color: isTop ? 'var(--gs-text)' : 'var(--gs-text-tertiary)' }}
                >
                  Section {sp.section}
                </span>
                <div className="flex-1 h-[5px] rounded-sm overflow-hidden"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <div
                    className="h-full rounded-sm transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: sp.color,
                    }}
                  />
                </div>
                <span
                  className="font-mono text-[11px] font-semibold tabular-nums w-[32px] text-right"
                  style={{ color: sp.color }}
                >
                  <AnimatedNumber value={sp.probability * 100} suffix="%" decimals={0} className="text-[11px] font-semibold" />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gs-divider mx-3" />

      {/* ═══════ Probable Cause ═══════ */}
      <div className="px-3 py-2">
        <div className="gs-section-label mb-1.5">Probable Cause</div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--gs-text)]">
            {topCause.label}
          </span>
          <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--gs-amber)' }}>
            <AnimatedNumber value={topCause.probability * 100} suffix="%" decimals={0} className="text-xs font-semibold" />
          </span>
        </div>
      </div>

      <div className="gs-divider mx-3" />

      {/* ═══════ Impact ═══════ */}
      <div className="px-3 py-2">
        <div className="gs-section-label mb-1.5">Impact</div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold tabular-nums" style={{ color: 'var(--gs-red)' }}>
            {affectedVillages.length}
          </span>
          <span className="text-xs" style={{ color: 'var(--gs-text-secondary)' }}>
            villages without power
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

      {/* ═══════ Recommended Actions ═══════ */}
      <div className="px-3 py-2 pb-3">
        <div className="gs-section-label mb-2">Recommended Actions</div>
        <div className="space-y-1.5">
          {switchingPlan.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold font-mono shrink-0"
                style={{
                  backgroundColor: 'var(--gs-surface-3)',
                  borderRadius: 2,
                  color: step.status === 'completed' ? 'var(--gs-green)' : 'var(--gs-text-secondary)',
                }}
              >
                {i + 1}
              </span>
              <span className="text-xs" style={{ color: 'var(--gs-text-secondary)' }}>
                {step.action}
              </span>
              <span className="text-[9px] font-mono ml-auto"
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
