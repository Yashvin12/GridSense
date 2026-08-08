// CauseBarList - ranked horizontal bars showing probable causes

import { useGrid } from '../../context/GridContext';
import { ProbabilityBar } from '../shared/ProbabilityBar';

const causeIcons: Record<string, React.ReactNode> = {
  'Vegetation Contact': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 14V6M5 10c-2-1-3-3-2-5 2 0 4 1 5 3 1-2 3-3 5-3 1 2 0 4-2 5" />
    </svg>
  ),
  'Transformer Overload': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="4" width="10" height="8" rx="1" />
      <path d="M6 4V2M10 4V2M6 12v2M10 12v2" />
    </svg>
  ),
  'Broken Conductor': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 8h4M10 8h4M7 6l2 4" />
    </svg>
  ),
  'Illegal Tapping': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 2l2 5H6l2-5zM8 7v5M5 14h6" />
    </svg>
  ),
};

const causeColors: Record<string, string> = {
  'Vegetation Contact': '#f59e0b',
  'Transformer Overload': '#ef4444',
  'Broken Conductor': '#06b6d4',
  'Illegal Tapping': '#8b5cf6',
};

export function CauseBarList() {
  const { state } = useGrid();
  const { causes } = state;

  return (
    <div className="grid-card h-full">
      <div className="grid-card-header mb-4">Ranked Fault Causes</div>
      <div className="space-y-5">
        {causes.map((cause, i) => {
          const color = causeColors[cause.label] || '#64748b';
          const icon = causeIcons[cause.label];

          return (
            <div key={cause.label} className="relative">
              {/* Top cause badge */}
              {i === 0 && (
                <div className="absolute -top-2 right-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  Most Likely
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: `${color}12`, color }}
                >
                  {icon}
                </div>
                <span className="text-sm font-medium text-slate-200">{cause.label}</span>
              </div>

              <ProbabilityBar
                value={cause.probability}
                label=""
                color={color}
                showValue={true}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
