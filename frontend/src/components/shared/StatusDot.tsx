// StatusDot - pulsing status indicator
// green (powered), red (affected/fault), amber (warning)

interface StatusDotProps {
  status: 'powered' | 'affected' | 'warning' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const colorMap = {
  powered: { bg: '#10b981', glow: 'rgba(16,185,129,0.4)' },
  affected: { bg: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
  warning: { bg: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  offline: { bg: '#64748b', glow: 'rgba(100,116,139,0.2)' },
};

const sizeMap = { sm: 8, md: 10, lg: 14 };

export function StatusDot({
  status,
  size = 'md',
  pulse = true,
  className = '',
}: StatusDotProps) {
  const { bg, glow } = colorMap[status];
  const px = sizeMap[size];

  return (
    <span
      className={`relative inline-block rounded-full ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: bg,
        boxShadow: `0 0 ${px}px ${glow}`,
      }}
    >
      {pulse && (status === 'affected' || status === 'warning') && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: bg,
            opacity: 0.4,
          }}
        />
      )}
    </span>
  );
}
