// StatusDot - solid status indicator with optional pulse for active faults
// Shapes communicate meaning beyond color for accessibility

interface StatusDotProps {
  status: 'powered' | 'affected' | 'warning' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const colorMap = {
  powered: '#3fb950',
  affected: '#f85149',
  warning: '#d29922',
  offline: '#6e7681',
};

const sizeMap = { sm: 7, md: 9, lg: 12 };

export function StatusDot({
  status,
  size = 'md',
  pulse = false,
  className = '',
}: StatusDotProps) {
  const bg = colorMap[status];
  const px = sizeMap[size];

  return (
    <span
      className={`relative inline-block rounded-full shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: bg,
      }}
    >
      {pulse && status === 'affected' && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: bg,
            opacity: 0.35,
          }}
        />
      )}
    </span>
  );
}
