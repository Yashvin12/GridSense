// Sidebar - vertical icon navigation with active state indicator

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
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="8" rx="1" />
        <rect x="11" y="2" width="7" height="5" rx="1" />
        <rect x="2" y="12" width="7" height="6" rx="1" />
        <rect x="11" y="9" width="7" height="9" rx="1" />
      </svg>
    ),
  },
  {
    id: 'evidence',
    label: 'Evidence',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,15 5,8 8,12 11,4 14,10 17,6" />
        <line x1="2" y1="18" x2="18" y2="18" />
      </svg>
    ),
  },
  {
    id: 'crew',
    label: 'Crew',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="3" />
        <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M14 3l2 2-2 2" />
      </svg>
    ),
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="3" height="6" rx="0.5" />
        <rect x="8.5" y="7" width="3" height="11" rx="0.5" />
        <rect x="14" y="2" width="3" height="16" rx="0.5" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { state, setView } = useGrid();

  return (
    <nav
      className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-5 z-40"
      style={{
        backgroundColor: 'rgba(8, 11, 20, 0.95)',
        borderRight: '1px solid rgba(30, 58, 95, 0.3)',
        backdropFilter: 'blur(12px)',
      }}
      aria-label="Main navigation"
    >
      {/* Logo mark */}
      <div className="mb-8 flex items-center justify-center w-9 h-9 rounded-lg"
        style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M9 2v14M2 9h14M4 4l10 10M14 4L4 14" />
        </svg>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = state.activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`
                relative flex items-center justify-center w-11 h-11 rounded-lg
                transition-colors duration-200 group
                ${isActive
                  ? 'text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300'
                }
              `}
              style={isActive ? { backgroundColor: 'rgba(6, 182, 212, 0.1)' } : {}}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full"
                  style={{ backgroundColor: '#06b6d4' }}
                />
              )}
              {item.icon}

              {/* Tooltip */}
              <span className="
                absolute left-14 px-2.5 py-1 rounded-md text-xs font-medium
                bg-slate-800 text-slate-200 whitespace-nowrap
                opacity-0 pointer-events-none
                group-hover:opacity-100
                transition-opacity duration-150
                border border-slate-700/50
              ">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
