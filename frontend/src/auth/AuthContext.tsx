// ---------------------------------------------------------------------------
// GridSense — Auth Context
//
// Provides centralized authentication state to the entire application.
// Wrap the app root with <AuthProvider> and consume via useAuth().
// ---------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

import { authService } from './authService';
import type { AuthUser, AuthRole, LoginCredentials, AuthError } from './authTypes';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** null while loading; populated after session restore / login */
  role: AuthRole | null;
  error: AuthError | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
type AuthAction =
  | { type: 'SESSION_LOADING' }
  | { type: 'SESSION_RESTORED'; user: AuthUser }
  | { type: 'SESSION_NONE' }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: AuthUser }
  | { type: 'LOGIN_FAILURE'; error: AuthError }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SESSION_LOADING':
      return { ...state, isLoading: true, error: null };

    case 'SESSION_RESTORED':
      return {
        user: action.user,
        isAuthenticated: true,
        isLoading: false,
        role: action.user.role,
        error: null,
      };

    case 'SESSION_NONE':
      return { user: null, isAuthenticated: false, isLoading: false, role: null, error: null };

    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };

    case 'LOGIN_SUCCESS':
      return {
        user: action.user,
        isAuthenticated: true,
        isLoading: false,
        role: action.user.role,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return { ...state, isLoading: false, error: action.error };

    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false, role: null, error: null };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // true on mount — we attempt session restore before rendering
  role: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── Restore session on app load ───────────────────────────────────────────
  useEffect(() => {
    dispatch({ type: 'SESSION_LOADING' });

    authService.getCurrentUser()
      .then((session) => {
        if (session) {
          dispatch({ type: 'SESSION_RESTORED', user: session.user });
        } else {
          dispatch({ type: 'SESSION_NONE' });
        }
      })
      .catch(() => {
        dispatch({ type: 'SESSION_NONE' });
      });
  }, []);

  // ── login() ───────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const session = await authService.login(credentials);
      dispatch({ type: 'LOGIN_SUCCESS', user: session.user });
    } catch (err) {
      const authErr = err as AuthError;
      dispatch({
        type: 'LOGIN_FAILURE',
        error: authErr.code
          ? authErr
          : { code: 'UNKNOWN', message: 'An unexpected error occurred.' },
      });
    }
  }, []);

  // ── logout() ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // ── clearError() ──────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
