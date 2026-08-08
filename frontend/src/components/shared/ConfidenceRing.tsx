// ConfidenceRing - SVG circular progress indicator
// Color-coded by confidence level, animated on value change

interface ConfidenceRingProps {
  value: number; // 0-1
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function ConfidenceRing({
  value,
  size = 96,
  strokeWidth = 6,
  className = '',
  label,
}: ConfidenceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);

  // Color based on confidence
  const getColor = (v: number) => {
    if (v > 0.8) return '#10b981';  // emerald - high confidence
    if (v > 0.5) return '#f59e0b';  // amber - medium
    return '#ef4444';               // red - low
  };

  const color = getColor(value);
  const percentage = Math.round(value * 100);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono text-lg font-bold tabular-nums"
          style={{ color }}
        >
          {percentage}%
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
