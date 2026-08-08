// ProbabilityBar - animated horizontal bar with percentage label

interface ProbabilityBarProps {
  value: number;   // 0-1
  label: string;
  color?: string;
  className?: string;
  showValue?: boolean;
}

export function ProbabilityBar({
  value,
  label,
  color,
  className = '',
  showValue = true,
}: ProbabilityBarProps) {
  const percentage = Math.round(value * 100);

  // Auto-color based on value if not provided
  const barColor = color || (
    value > 0.7 ? '#ef4444' :
    value > 0.4 ? '#f59e0b' :
    value > 0.15 ? '#eab308' :
    '#64748b'
  );

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300 truncate mr-3">{label}</span>
        {showValue && (
          <span
            className="font-mono text-sm font-semibold tabular-nums shrink-0"
            style={{ color: barColor }}
          >
            {percentage}%
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 8px ${barColor}30`,
          }}
        />
      </div>
    </div>
  );
}
