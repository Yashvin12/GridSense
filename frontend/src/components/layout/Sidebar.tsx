// Sidebar — compact navigation rail with text labels
// Domain-appropriate icons, recognition over recall

import { useGrid } from '../../context/GridContext';
import type { GridState } from '../../context/GridContext';

interface NavItem {
  id: GridState['activeView'];
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9h12M3 4.5h12M3 13.5h12" />
        <circle cx="14" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="7" cy="9" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="11" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'evidence',
    label: 'Evidence',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,14 5,7 8,11 11,3 14,9 16,5" />
        <line x1="2" y1="16" x2="16" y2="16" />
      </svg>
    ),
  },
  {
    id: 'crew',
    label: 'Crew',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16v-1a4 4 0 014-4h2a4 4 0 014 4v1" />
        <circle cx="9" cy="6" r="3" />
        <path d="M14 4l1.5 1.5L14 7" />
      </svg>
    ),
  },
  {
    id: 'analysis',
    label: 'Causes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2v4M9 6l-4 4M9 6l4 4M5 10v4M13 10v4" />
        <circle cx="9" cy="2" r="1" fill="currentColor" stroke="none" />
        <circle cx="5" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="14" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { state, setView } = useGrid();

  return (
    <nav
      className="fixed left-0 top-0 h-full w-[52px] flex flex-col items-center py-3 z-40"
      style={{
        backgroundColor: '#0d1117',
        borderRight: '1px solid var(--gs-border)',
      }}
      aria-label="Main navigation"
    >
      {/* Logo mark — simple wordmark */}
      <div className="mb-6 flex items-center justify-center w-8 h-8"
        style={{ color: 'var(--gs-text)' }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M11 2v18M2 11h18M5 5l12 12" />
        </svg>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 flex-1 w-full px-1">
        {navItems.map((item) => {
          const isActive = state.activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="relative flex flex-col items-center justify-center w-full py-2 transition-colors duration-150 group"
              style={{
                color: isActive ? 'var(--gs-text)' : 'var(--gs-text-tertiary)',
                backgroundColor: isActive ? 'var(--gs-surface-2)' : 'transparent',
                borderRadius: 3,
                cursor: 'pointer',
                border: 'none',
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px]"
                  style={{ backgroundColor: 'var(--gs-text)' }}
                />
              )}
              {item.icon}
              <span
                className="text-[9px] font-medium mt-0.5 leading-tight"
                style={{ color: isActive ? 'var(--gs-text-secondary)' : 'var(--gs-text-tertiary)' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
