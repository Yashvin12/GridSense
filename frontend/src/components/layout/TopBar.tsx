// TopBar — SCADA system operational header
// Desktop: full status bar — fault, live indicator, clock, user, logout
// Mobile: compact — brand + fault + logout; secondary info collapses
// Auth: user role badge + logout action.

import { useGrid } from '../../context/GridContext';
import { StatusDot } from '../shared/StatusDot';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../auth/authTypes';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const { state } = useGrid();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const viewBreadcrumbs: Record<string, string> = {
    dashboard: 'Overview',
    evidence: 'Evidence',
    crew: 'Crew Dispatch',
    analysis: 'Causes',
  };

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : null;

  return (
    <header
      className="fixed top-0 right-0 h-9 flex items-center justify-between px-3 z-30 select-none gs-topbar"
      style={{
        left: 52, // desktop: offset for sidebar
        backgroundColor: '#0d1117',
        borderBottom: '1px solid var(--gs-border)',
      }}
    >
      {/* Left: Brand + Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span className="font-semibold tracking-wider" style={{ color: 'var(--gs-text-tertiary)' }}>
          GRIDSENSE
        </span>
        <span style={{ color: 'var(--gs-border-strong)' }}>/</span>
        <span className="font-semibold tracking-wide" style={{ color: 'var(--gs-text)' }}>
          {viewBreadcrumbs[state.activeView]}
        </span>
      </div>

      {/* Right: fault + live + clock + user + logout */}
      <div className="flex items-center gap-3 text-[11px]">

        {/* Active fault indicator — always visible */}
        <div className="flex items-center gap-1.5">
          <StatusDot status="affected" size="sm" pulse />
          <span className="font-mono text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
            <span className="gs-topbar-hide-mobile">Active fault </span>
          </span>
          <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--gs-red)' }}>
            {state.fault.section}
          </span>
        </div>

        {/* Separator — hide on mobile */}
        <span className="gs-topbar-hide-mobile" style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* Live indicator — hide on mobile */}
        <div className="gs-topbar-hide-mobile flex items-center gap-1.5">
          <StatusDot status="powered" size="sm" />
          <span className="font-mono text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
            Live
          </span>
        </div>

        {/* Separator — hide on mobile */}
        <span className="gs-topbar-hide-mobile" style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* Real-time system clock — hide on mobile */}
        <div className="gs-topbar-hide-mobile font-mono text-[11px] tabular-nums" style={{ color: 'var(--gs-text-secondary)' }}>
          {formattedTime} UTC
        </div>

        {/* Separator — hide on mobile */}
        <span className="gs-topbar-hide-mobile" style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* User role badge — hide on mobile */}
        {user && (
          <div className="gs-topbar-hide-mobile flex items-center gap-2">
            <span
              className="font-mono text-[10px]"
              style={{ color: 'var(--gs-text-tertiary)' }}
              title={`${user.email} · ${roleLabel ?? user.role}`}
            >
              {user.name}
            </span>
            {roleLabel && (
              <span
                className="font-mono text-[9px]"
                style={{
                  color: 'var(--gs-text-tertiary)',
                  backgroundColor: 'var(--gs-surface-2)',
                  border: '1px solid var(--gs-border)',
                  padding: '1px 5px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {roleLabel}
              </span>
            )}
          </div>
        )}

        {/* Logout button — always visible */}
        <button
          id="gs-topbar-logout"
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
          style={{
            background: 'none',
            border: '1px solid var(--gs-border)',
            color: 'var(--gs-text-tertiary)',
            cursor: 'pointer',
            padding: '2px 7px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1.6,
            transition: 'color 0.1s, border-color 0.1s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--gs-red)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,81,73,0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--gs-text-tertiary)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gs-border)';
          }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
