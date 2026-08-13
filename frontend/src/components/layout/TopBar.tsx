// TopBar — SCADA system operational header
// Quiet status bar: active fault location, live indicator, clock.
// Auth: user role badge + logout action added to right cluster.

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
      className="fixed top-0 left-[52px] right-0 h-9 flex items-center justify-between px-3 z-30 select-none"
      style={{
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

      {/* Right: Active fault + Live + Clock + User + Logout */}
      <div className="flex items-center gap-4 text-[11px]">

        {/* Active fault — inline, no decorative box */}
        <div className="flex items-center gap-1.5">
          <StatusDot status="affected" size="sm" pulse />
          <span className="font-mono text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
            Active fault
          </span>
          <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--gs-red)' }}>
            {state.fault.section}
          </span>
        </div>

        <span style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <StatusDot status="powered" size="sm" />
          <span className="font-mono text-[10px]" style={{ color: 'var(--gs-text-tertiary)' }}>
            Live
          </span>
        </div>

        <span style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* Real-time system clock */}
        <div className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--gs-text-secondary)' }}>
          {formattedTime} UTC
        </div>

        <span style={{ color: 'var(--gs-border)', fontSize: 10 }}>|</span>

        {/* User role badge */}
        {user && (
          <div className="flex items-center gap-2">
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

        {/* Logout button */}
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
