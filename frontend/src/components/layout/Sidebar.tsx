// Sidebar — SCADA-grade navigation rail with technical line icons
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="5" height="5" rx="0.5" />
        <rect x="9" y="2" width="5" height="5" rx="0.5" />
        <rect x="2" y="9" width="5" height="5" rx="0.5" />
        <rect x="9" y="9" width="5" height="5" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'evidence',
    label: 'Evidence',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 13h12" />
        <path d="M2 9l3-4 3 3 3-6 3 4" />
      </svg>
    ),
  },
  {
    id: 'crew',
    label: 'Crew',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13.5v-1a3 3 0 013-3h4a3 3 0 013 3v1" />
        <circle cx="8" cy="5" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'analysis',
    label: 'Causes',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="3" r="1.5" />
        <circle cx="4" cy="13" r="1.5" />
        <circle cx="12" cy="13" r="1.5" />
        <path d="M8 4.5v3.5M8 8L4.5 11.5M8 8l3.5 3.5" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { state, setView } = useGrid();

  return (
    <nav
      className="fixed left-0 top-0 h-full w-[52px] flex flex-col items-center py-2 z-40 select-none"
      style={{
        backgroundColor: '#0d1117',
        borderRight: '1px solid var(--gs-border)',
      }}
      aria-label="Main navigation"
    >
      {/* SCADA Grid Mark */}
      <div
        className="mb-4 flex items-center justify-center w-8 h-8 rounded border"
        style={{
          color: 'var(--gs-text)',
          borderColor: 'var(--gs-border)',
          backgroundColor: 'var(--gs-surface)',
        }}
        title="GridSense Dispatch Console"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 w-full px-1">
        {navItems.map((item) => {
          const isActive = state.activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="relative flex flex-col items-center justify-center w-full py-2.5 transition-colors duration-100 group"
              style={{
                color: isActive ? 'var(--gs-text)' : 'var(--gs-text-tertiary)',
                backgroundColor: isActive ? 'var(--gs-surface-2)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--gs-text)' : '2px solid transparent',
                borderRadius: '0px 2px 2px 0px',
                cursor: 'pointer',
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}>
                {item.icon}
              </div>
              <span
                className="text-[9px] font-mono tracking-tight mt-1 leading-none uppercase"
                style={{
                  color: isActive ? 'var(--gs-text)' : 'var(--gs-text-tertiary)',
                  fontWeight: isActive ? 600 : 400,
                }}
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

