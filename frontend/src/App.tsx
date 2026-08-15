// GridSense — Main Application Shell
// Authentication wraps the entire app via AuthProvider + ProtectedRoute.
// Routing uses react-router-dom v7 (already installed).
// The existing dashboard architecture, views, and layout are unchanged.

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';

import { GridProvider, useGrid } from './context/GridContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './views/DashboardView';
import { EvidenceView } from './views/EvidenceView';
import { CrewView } from './views/CrewView';
import { CauseView } from './views/CauseView';

// ---------------------------------------------------------------------------
// Role-based default redirect — reads role from auth context
// FIELD_CREW → /crew | all others → /overview
// ---------------------------------------------------------------------------
function RoleRedirect() {
  const { role } = useAuth();
  const destination = role === 'FIELD_CREW' ? '/crew' : '/overview';
  return <Navigate to={destination} replace />;
}

// ---------------------------------------------------------------------------
// URL → activeView sync
// When the user navigates to /evidence, /crew, etc., sync the GridContext
// activeView so the existing state-driven rendering still works.
// ---------------------------------------------------------------------------
const ROUTE_TO_VIEW: Record<string, 'dashboard' | 'evidence' | 'crew' | 'analysis'> = {
  '/overview':  'dashboard',
  '/evidence':  'evidence',
  '/crew':      'crew',
  '/causes':    'analysis',
};

function ViewRouter() {
  const { state, setView } = useGrid();
  const navigate = useNavigate();

  // Sync URL → state on load (e.g. hard refresh on /evidence)
  useEffect(() => {
    const path = window.location.pathname;
    const view = ROUTE_TO_VIEW[path];
    if (view && view !== state.activeView) {
      setView(view);
    }
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state → URL when sidebar navigation changes view
  useEffect(() => {
    const viewToRoute: Record<string, string> = {
      dashboard: '/overview',
      evidence:  '/evidence',
      crew:      '/crew',
      analysis:  '/causes',
    };
    const target = viewToRoute[state.activeView];
    if (target && window.location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [state.activeView, navigate]);

  const viewComponents: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    evidence:  <EvidenceView />,
    crew:      <CrewView />,
    analysis:  <CauseView />,
  };

  return (
    <div className="h-screen gs-app-root" style={{ backgroundColor: 'var(--gs-bg)' }}>
      <Sidebar />
      <TopBar />
      <main
        className="h-screen gs-main-content"
        style={{
          marginLeft: 52,
          paddingTop: 36,
          padding: '36px 6px 6px 6px',
          marginTop: 0,
        }}
      >
        <div style={{ height: 'calc(100vh - 42px)' }}>
          {viewComponents[state.activeView]}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Protected application shell — GridProvider wraps only authenticated routes
// ---------------------------------------------------------------------------
function AppShell() {
  return (
    <GridProvider>
      <ViewRouter />
    </GridProvider>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/overview"  element={<AppShell />} />
            <Route path="/evidence"  element={<AppShell />} />
            <Route path="/crew"      element={<AppShell />} />
            <Route path="/causes"    element={<AppShell />} />
            {/* Default / catch-all: role-based redirect */}
            <Route path="/"          element={<RoleRedirect />} />
            <Route path="*"          element={<RoleRedirect />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
