// ---------------------------------------------------------------------------
// GridSense — Auth Types
// ---------------------------------------------------------------------------

export type AuthRole =
  | 'CONTROL_ROOM_OPERATOR'
  | 'FIELD_CREW'
  | 'SUPERVISOR'
  | 'ADMINISTRATOR';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: AuthUser;
  /** Bearer token — undefined when using HTTP-only cookie auth */
  token?: string;
}

export interface AuthError {
  code:
    | 'INVALID_CREDENTIALS'
    | 'SESSION_EXPIRED'
    | 'NETWORK_ERROR'
    | 'UNAUTHORIZED_ROLE'
    | 'UNKNOWN';
  message: string;
}

/** Human-readable role labels for display purposes */
export const ROLE_LABELS: Record<AuthRole, string> = {
  CONTROL_ROOM_OPERATOR: 'Control Room Operator',
  FIELD_CREW: 'Field Crew',
  SUPERVISOR: 'Supervisor',
  ADMINISTRATOR: 'Administrator',
};
