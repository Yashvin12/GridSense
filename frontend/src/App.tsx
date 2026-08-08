// GridMind AI - Main Application Shell

import { GridProvider, useGrid } from './context/GridContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './views/DashboardView';
import { EvidenceView } from './views/EvidenceView';
import { CrewView } from './views/CrewView';
import { CauseView } from './views/CauseView';

function AppContent() {
  const { state } = useGrid();

  const viewComponents: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    evidence: <EvidenceView />,
    crew: <CrewView />,
    analysis: <CauseView />,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#080b14' }}>
      <Sidebar />
      <TopBar />
      <main className="ml-16 pt-14 p-3 h-screen" style={{ paddingTop: 'calc(3.5rem + 0.75rem)' }}>
        <div className="h-[calc(100vh-4.25rem)]">
          {viewComponents[state.activeView]}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GridProvider>
      <AppContent />
    </GridProvider>
  );
}
