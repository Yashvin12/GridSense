// ---------------------------------------------------------------------------
// GridSense — Auth Service
//
// Two-adapter pattern:
//   mockAuthAdapter  — active when VITE_AUTH_MODE=mock
//                      Uses sessionStorage for session persistence.
//                      Clearly isolated from production code.
//   apiAuthAdapter   — active in production
//                      Calls POST /api/auth/login, POST /api/auth/logout,
//                      GET /api/auth/me on the FastAPI backend.
//
// The mock adapter is for development/demo only.
// No credentials are hard-coded in the production path.
// ---------------------------------------------------------------------------

import type { LoginCredentials, AuthSession, AuthError } from './authTypes';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
const AUTH_MODE =
  (import.meta.env.VITE_AUTH_MODE as string | undefined) ?? 'api';

// ---------------------------------------------------------------------------
// Auth adapter interface
// ---------------------------------------------------------------------------
interface AuthAdapter {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthSession | null>;
}

// ---------------------------------------------------------------------------
// MOCK ADAPTER — development / demo only
// ---------------------------------------------------------------------------
// This block is deliberately isolated. It is NEVER active in production.
// To enable: set VITE_AUTH_MODE=mock in .env.development
// ---------------------------------------------------------------------------

const MOCK_SESSION_KEY = 'gs_mock_session';

/**
 * Mock users for development. Emails are the identifiers.
 * Password is not validated in mock mode — any non-empty string works.
 * This is intentional: the mock adapter exists only to make the UI testable.
 */
const MOCK_USERS = [
  { id: 'mock-001', email: 'operator@gridsense.dev',   name: 'A. Sharma',    role: 'CONTROL_ROOM_OPERATOR' as const },
  { id: 'mock-002', email: 'crew@gridsense.dev',       name: 'R. Patel',     role: 'FIELD_CREW' as const },
  { id: 'mock-003', email: 'supervisor@gridsense.dev', name: 'S. Nair',      role: 'SUPERVISOR' as const },
  { id: 'mock-004', email: 'admin@gridsense.dev',      name: 'K. Iyer',      role: 'ADMINISTRATOR' as const },
];

const mockAuthAdapter: AuthAdapter = {
  async login({ email, password }: LoginCredentials): Promise<AuthSession> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 800));

    if (!password) {
      const err: AuthError = { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
      throw err;
    }

    const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const err: AuthError = { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
      throw err;
    }

    const session: AuthSession = { user, token: `mock-token-${user.id}` };
    sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async logout(): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
    sessionStorage.removeItem(MOCK_SESSION_KEY);
  },

  async getCurrentUser(): Promise<AuthSession | null> {
    const raw = sessionStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      sessionStorage.removeItem(MOCK_SESSION_KEY);
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// API ADAPTER — production
// ---------------------------------------------------------------------------
// Calls the FastAPI backend. Expects the backend to implement:
//   POST /api/auth/login   { email, password } → AuthSession
//   POST /api/auth/logout  → 204
//   GET  /api/auth/me      → AuthSession | 401
//
// If the backend uses HTTP-only cookies, remove the Authorization header
// usage and set credentials: 'include' instead of bearer tokens.
// ---------------------------------------------------------------------------

function buildAuthError(status: number, fallback: string): AuthError {
  if (status === 401 || status === 403) {
    return { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
  }
  if (status === 0 || status >= 500) {
    return { code: 'NETWORK_ERROR', message: 'Unable to reach GridSense services.' };
  }
  return { code: 'UNKNOWN', message: fallback };
}

const apiAuthAdapter: AuthAdapter = {
  async login({ email, password }: LoginCredentials): Promise<AuthSession> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
    } catch {
      const err: AuthError = { code: 'NETWORK_ERROR', message: 'Unable to reach GridSense services.' };
      throw err;
    }

    if (!res.ok) {
      throw buildAuthError(res.status, 'Authentication failed.');
    }

    const session = (await res.json()) as AuthSession;

    // If the backend returns a bearer token, store it for subsequent requests.
    // Remove this if the backend uses HTTP-only cookies.
    if (session.token) {
      sessionStorage.setItem('gs_token', session.token);
    }

    return session;
  },

  async logout(): Promise<void> {
    const token = sessionStorage.getItem('gs_token');
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } finally {
      sessionStorage.removeItem('gs_token');
    }
  },

  async getCurrentUser(): Promise<AuthSession | null> {
    const token = sessionStorage.getItem('gs_token');
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      return null;
    }

    if (!res.ok) {
      sessionStorage.removeItem('gs_token');
      return null;
    }

    return (await res.json()) as AuthSession;
  },
};

// ---------------------------------------------------------------------------
// Active adapter selection — driven by VITE_AUTH_MODE env variable
// ---------------------------------------------------------------------------
const activeAdapter: AuthAdapter =
  AUTH_MODE === 'mock' ? mockAuthAdapter : apiAuthAdapter;

// ---------------------------------------------------------------------------
// Public authService API
// ---------------------------------------------------------------------------
export const authService = {
  /** Authenticate with email + password. Throws AuthError on failure. */
  login: (credentials: LoginCredentials) => activeAdapter.login(credentials),

  /** Clear session (server-side + client-side). */
  logout: () => activeAdapter.logout(),

  /**
   * Attempt to restore an existing session on app load.
   * Returns null if no valid session exists.
   */
  getCurrentUser: () => activeAdapter.getCurrentUser(),

  /** Whether the app is running in mock auth mode */
  isMockMode: AUTH_MODE === 'mock',
};
