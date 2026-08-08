// EvidenceLog - scrolling timeline of evidence events

import { useGrid } from '../../context/GridContext';

const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  sensor: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="7" cy="7" r="2" />
        <path d="M4 4a4.2 4.2 0 000 6M10 4a4.2 4.2 0 010 6" />
      </svg>
    ),
    color: '#06b6d4',
  },
  meter: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="3" width="10" height="8" rx="1" />
        <path d="M5 6h4M5 9h2" />
      </svg>
    ),
    color: '#8b5cf6',
  },
  crew: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="7" cy="5" r="2" />
        <path d="M3 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      </svg>
    ),
    color: '#10b981',
  },
  weather: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M4 10l1-3h4l1 3M3 7c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      </svg>
    ),
    color: '#f59e0b',
  },
  complaint: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M7 2v5M7 10v1" />
        <circle cx="7" cy="7" r="6" />
      </svg>
    ),
    color: '#ef4444',
  },
};

export function EvidenceLog() {
  const { state } = useGrid();
  const { evidenceLog } = state;

  return (
    <div className="grid-card h-full flex flex-col">
      <div className="grid-card-header mb-3">Evidence Stream</div>
      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        {evidenceLog.map((event, i) => {
          const typeInfo = typeIcons[event.type] || typeIcons.sensor;
          const isNew = i === 0 && event.type === 'crew';

          return (
            <div
              key={event.id}
              className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-300 ${
                isNew ? 'evidence-new' : ''
              }`}
              style={isNew ? { backgroundColor: 'rgba(16, 185, 129, 0.06)' } : {}}
            >
              <div
                className="flex items-center justify-center w-6 h-6 rounded-md shrink-0 mt-0.5"
                style={{
                  backgroundColor: `${typeInfo.color}15`,
                  color: typeInfo.color,
                }}
              >
                {typeInfo.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-300 leading-relaxed">{event.message}</div>
                <div className="text-[10px] font-mono text-slate-600 mt-0.5">{event.timestamp}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
