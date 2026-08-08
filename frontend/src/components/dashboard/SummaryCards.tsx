// SummaryCards - fault location, cause, affected villages, ETA, switching, crew

import { useGrid } from '../../context/GridContext';
import { ConfidenceRing } from '../shared/ConfidenceRing';
import { StatusDot } from '../shared/StatusDot';
import { AnimatedNumber } from '../shared/AnimatedNumber';

export function SummaryCards() {
  const { state } = useGrid();
  const { fault, causes, affectedVillages, switchingPlan, crewPlan, etaMinutes, sectionProbabilities } = state;

  const topCause = causes[0];

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 custom-scrollbar">

      {/* Fault Location + Confidence */}
      <div className="grid-card">
        <div className="grid-card-header">Fault Location</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-white tracking-tight">{fault.section}</div>
            <div className="text-xs text-slate-500 mt-1">Section B - High confidence</div>
          </div>
          <ConfidenceRing value={fault.confidence} size={72} strokeWidth={5} label="conf" />
        </div>
      </div>

      {/* Top Cause */}
      <div className="grid-card">
        <div className="grid-card-header">Probable Cause</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 2c-2 4-6 5-6 10a6 6 0 0012 0c0-5-4-6-6-10z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">{topCause.label}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${topCause.probability * 100}%`,
                    backgroundColor: '#f59e0b',
                  }}
                />
              </div>
              <AnimatedNumber
                value={topCause.probability * 100}
                suffix="%"
                decimals={0}
                className="text-xs font-bold text-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Affected Villages */}
      <div className="grid-card">
        <div className="grid-card-header">Affected Villages</div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-bold font-mono text-red-400 tabular-nums">{affectedVillages.length}</span>
          <span className="text-xs text-slate-500">villages without power</span>
        </div>
        <div className="space-y-1.5">
          {affectedVillages.map((v) => (
            <div key={v} className="flex items-center gap-2 text-sm">
              <StatusDot status="affected" size="sm" />
              <span className="text-slate-300">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ETA */}
      <div className="grid-card">
        <div className="grid-card-header">Est. Restoration</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold font-mono text-cyan-400 tabular-nums">{etaMinutes}</span>
          <span className="text-sm text-slate-500">min</span>
        </div>
      </div>

      {/* Section Probabilities */}
      <div className="grid-card">
        <div className="grid-card-header">Section Probabilities</div>
        <div className="space-y-2">
          {sectionProbabilities.map((sp) => (
            <div key={sp.section} className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500 w-4">
                {sp.section}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${sp.probability * 100}%`,
                    backgroundColor: sp.color,
                    boxShadow: sp.probability > 0.5 ? `0 0 8px ${sp.color}40` : 'none',
                  }}
                />
              </div>
              <span style={{ color: sp.color }}>
                <AnimatedNumber
                  value={sp.probability * 100}
                  suffix="%"
                  decimals={0}
                  className="text-xs font-bold w-8 text-right"
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Switching Plan */}
      <div className="grid-card">
        <div className="grid-card-header">Switching Plan</div>
        <div className="space-y-2">
          {switchingPlan.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold font-mono shrink-0 mt-0.5"
                style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}
              >
                {i + 1}
              </span>
              <span className="text-sm text-slate-300">{step.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Crew Plan */}
      <div className="grid-card">
        <div className="grid-card-header">Crew Inspection Route</div>
        <div className="space-y-2">
          {crewPlan.map((stop) => (
            <div key={stop.stop} className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold font-mono shrink-0"
                style={{
                  backgroundColor: stop.status === 'fault_found' ? 'rgba(239,68,68,0.15)' :
                                   stop.status === 'no_fault' ? 'rgba(16,185,129,0.15)' :
                                   'rgba(100,116,139,0.15)',
                  color: stop.status === 'fault_found' ? '#ef4444' :
                         stop.status === 'no_fault' ? '#10b981' :
                         '#94a3b8',
                }}
              >
                {stop.order}
              </span>
              <span className="text-sm text-slate-300 flex-1">{stop.stop}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider"
                style={{
                  color: stop.status === 'fault_found' ? '#ef4444' :
                         stop.status === 'no_fault' ? '#10b981' :
                         '#64748b',
                }}
              >
                {stop.status === 'fault_found' ? 'FAULT' :
                 stop.status === 'no_fault' ? 'CLEAR' :
                 'PENDING'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
