// InspectionStops - ordered crew stops with confirm/deny buttons
// This is the core demo interaction: clicking updates probabilities globally

import { useGrid } from '../../context/GridContext';
import { StatusDot } from '../shared/StatusDot';

export function InspectionStops() {
  const { state, confirmStop, denyStop } = useGrid();
  const { crewPlan, etaMinutes } = state;

  const statusLabels: Record<string, string> = {
    pending: 'Awaiting Inspection',
    inspecting: 'Inspecting',
    fault_found: 'Fault Confirmed',
    no_fault: 'Section Clear',
  };

  const statusColors: Record<string, string> = {
    pending: '#64748b',
    inspecting: '#f59e0b',
    fault_found: '#ef4444',
    no_fault: '#10b981',
  };

  return (
    <div className="grid-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="grid-card-header mb-0">Inspection Route</div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md"
          style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.15)' }}
        >
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">ETA</span>
          <span className="text-sm font-mono font-bold text-cyan-400 tabular-nums">{etaMinutes} min</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
        {crewPlan.map((stop) => {
          const isDone = stop.status === 'fault_found' || stop.status === 'no_fault';
          const statusColor = statusColors[stop.status];

          return (
            <div
              key={stop.stop}
              className="relative rounded-xl p-4 transition-all duration-300"
              style={{
                backgroundColor: isDone
                  ? `${statusColor}08`
                  : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isDone ? `${statusColor}20` : 'rgba(30, 58, 95, 0.3)'}`,
              }}
            >
              {/* Order badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold font-mono"
                    style={{
                      backgroundColor: `${statusColor}15`,
                      color: statusColor,
                    }}
                  >
                    {stop.order}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{stop.stop}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot
                        status={
                          stop.status === 'fault_found' ? 'affected' :
                          stop.status === 'no_fault' ? 'powered' :
                          'offline'
                        }
                        size="sm"
                        pulse={!isDone}
                      />
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: statusColor }}>
                        {statusLabels[stop.status]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="text-xs text-slate-500 mb-3 pl-11">
                {stop.order === 1 && 'Highest posterior probability. Start here.'}
                {stop.order === 2 && 'Adjacent to primary suspect. Check if damage extends.'}
                {stop.order === 3 && 'Lower probability but within fault zone. Verify last.'}
              </div>

              {/* Action buttons */}
              {!isDone && (
                <div className="flex items-center gap-2 pl-11">
                  <button
                    onClick={() => confirmStop(stop.stop)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                    aria-label={`Confirm fault found at ${stop.stop}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 2v4M6 10h.01" />
                    </svg>
                    Fault Found
                  </button>

                  <button
                    onClick={() => denyStop(stop.stop)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(100, 116, 139, 0.08)',
                      border: '1px solid rgba(100, 116, 139, 0.2)',
                      color: '#94a3b8',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(100, 116, 139, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(100, 116, 139, 0.08)';
                    }}
                    aria-label={`Report no fault at ${stop.stop}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                    No Fault
                  </button>
                </div>
              )}

              {/* Done state feedback */}
              {isDone && (
                <div className="pl-11 text-xs font-medium" style={{ color: statusColor }}>
                  {stop.status === 'fault_found'
                    ? 'Fault confirmed. Probabilities updated across the network.'
                    : 'Section cleared. Probability redistributed to remaining suspects.'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
