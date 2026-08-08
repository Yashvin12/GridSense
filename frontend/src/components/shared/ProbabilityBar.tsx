// ProbabilityBar - horizontal bar with percentage label
// Industrial style: tight, no glow, minimal radius

interface ProbabilityBarProps {
  value: number;   // 0-1
  label: string;
  color?: string;
  className?: string;
  showValue?: boolean;
  compact?: boolean;
}

export function ProbabilityBar({
  value,
  label,
  color,
  className = '',
  showValue = true,
  compact = false,
}: ProbabilityBarProps) {
  const percentage = Math.round(value * 100);

  // Auto-color based on value if not provided
  const barColor = color || (
    value > 0.7 ? '#f85149' :
    value > 0.4 ? '#d29922' :
    value > 0.15 ? '#d29922' :
    '#6e7681'
  );

  const barHeight = compact ? 4 : 6;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--gs-text-secondary)] truncate mr-3">{label}</span>
          {showValue && (
            <span
              className="font-mono text-xs font-semibold tabular-nums shrink-0"
              style={{ color: barColor }}
            >
              {percentage}%
            </span>
          )}
        </div>
      )}
      {!label && showValue && (
        <div className="flex items-center justify-end">
          <span
            className="font-mono text-xs font-semibold tabular-nums shrink-0"
            style={{ color: barColor }}
          >
            {percentage}%
          </span>
        </div>
      )}
      <div
        className="rounded-sm overflow-hidden"
        style={{ height: barHeight, backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        <div
          className="h-full rounded-sm transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
