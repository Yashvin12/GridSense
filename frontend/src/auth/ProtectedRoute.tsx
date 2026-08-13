// ---------------------------------------------------------------------------
// GridSense — Protected Route
//
// Wraps routes that require authentication.
// - While session is being restored (isLoading) → render nothing (prevents flash)
// - Not authenticated → redirect to /login
// - Authenticated → render <Outlet /> (children)
// ---------------------------------------------------------------------------

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for session restore to complete before making any routing decisions.
  // This prevents an authenticated user from being briefly bounced to /login
  // on a hard refresh.
  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--gs-bg)',
          color: 'var(--gs-text-tertiary)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.08em',
        }}
      >
        INITIALIZING…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
