// GridSense — Main Application Shell

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
    <div className="h-screen" style={{ backgroundColor: 'var(--gs-bg)' }}>
      <Sidebar />
      <TopBar />
      <main
        className="h-screen"
        style={{
          marginLeft: 52,
          paddingTop: 40,
          padding: '40px 6px 6px 6px',
          marginTop: 0,
        }}
      >
        <div style={{ height: 'calc(100vh - 46px)' }}>
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
