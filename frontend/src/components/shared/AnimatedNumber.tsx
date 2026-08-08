// AnimatedNumber - smooth count up/down with CSS transitions
// Used for all probability/confidence displays throughout the app

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
  duration = 600,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(value);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}
