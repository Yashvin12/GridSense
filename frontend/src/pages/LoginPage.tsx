// ---------------------------------------------------------------------------
// GridSense — Login Page
//
// Operational control-room authentication screen.
// Visual language: near-black background, charcoal panels, restrained red/green/amber.
// IBM Plex Sans + IBM Plex Mono. Sharp rectangular panels, minimal rounding.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { authService } from '../auth/authService';

// ---------------------------------------------------------------------------
// Status indicator dot (inline — no shared dep required on login page)
// ---------------------------------------------------------------------------
function LiveDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Eye icon for show/hide password
// ---------------------------------------------------------------------------
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l12 12" />
      <path d="M6.7 6.7A2 2 0 0010.3 9.3" />
      <path d="M3.5 3.5C2.2 4.6 1 6.2 1 8c0 0 2.5 5 7 5a7.2 7.2 0 003.5-.9" />
      <path d="M9.5 4.5A7 7 0 0115 8s-.7 1.5-2 2.7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// GridSense logo mark (same SVG as Sidebar)
// ---------------------------------------------------------------------------
function GridMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// System status items
// ---------------------------------------------------------------------------
const STATUS_ITEMS = [
  { label: 'GRID SERVICES ONLINE',   color: '#3fb950' },
  { label: 'TELEMETRY STREAM ACTIVE', color: '#3fb950' },
  { label: 'INFERENCE ENGINE READY', color: '#3fb950' },
];

// ---------------------------------------------------------------------------
// Login Page
// ---------------------------------------------------------------------------
export function LoginPage() {
  const { isAuthenticated, isLoading: authLoading, login, error, clearError, role } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const emailRef = useRef<HTMLInputElement>(null);

  // Focus email on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Clear server error when user starts typing
  useEffect(() => {
    if (error) clearError();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  // Redirect authenticated users away from login — role-based
  if (!authLoading && isAuthenticated) {
    const destination = role === 'FIELD_CREW' ? '/crew' : '/overview';
    return <Navigate to={destination} replace />;
  }

  // Show minimal splash while session restore is in progress
  if (authLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d1117',
        color: '#6e7681',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.08em',
      }}>
        INITIALIZING…
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const hasError = !!error;

  return (
    <div style={styles.root} className="gs-login-scroll">
      {/* ── Left panel: GridSense identity ─────────────────────────────── */}
      <div style={styles.leftPanel} className="gs-login-left">
        <div style={styles.leftInner}>

          {/* Logo mark + wordmark */}
          <div style={styles.brandRow}>
            <div style={styles.logoMark}>
              <GridMark size={18} />
            </div>
            <div>
              <div style={styles.brandName}>GRID SENSE</div>
              <div style={styles.brandTagline}>Distribution Intelligence &amp; Fault Localization</div>
            </div>
          </div>

          {/* Operational statement */}
          <p style={styles.operationalStatement}>
            Continuous probabilistic reasoning for distribution-grid fault
            localization. Real-time Bayesian inference across feeder sections,
            crew dispatch, and evidence integration.
          </p>

          {/* Divider */}
          <div style={styles.divider} />

          {/* System status */}
          <div style={styles.statusBlock}>
            <div style={styles.statusHeader}>SYSTEM STATUS</div>
            <div style={styles.statusList}>
              {STATUS_ITEMS.map((item) => (
                <div key={item.label} style={styles.statusRow}>
                  <LiveDot color={item.color} />
                  <span style={{ ...styles.statusLabel, color: item.color }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={styles.leftFooter}>
            <span style={styles.footerText}>GridSense v1.0</span>
            <span style={styles.footerSep}>·</span>
            <span style={styles.footerText}>PS-B13</span>
            <span style={styles.footerSep}>·</span>
            <span style={styles.footerText}>RESTRICTED ACCESS</span>
          </div>

          {/* Mock mode notice — development only */}
          {authService.isMockMode && (
            <div style={styles.mockNotice}>
              <span style={styles.mockLabel}>DEV MODE</span>
              <span style={styles.mockHint}>
                operator@gridsense.dev · crew@gridsense.dev · supervisor@gridsense.dev · admin@gridsense.dev
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: authentication form ───────────────────────────── */}
      <div style={styles.rightPanel} className="gs-login-right">
        <div style={styles.authCard} className="gs-auth-card">

          {/* Header */}
          <div style={styles.authHeader}>
            <div style={styles.authTitle}>SIGN IN</div>
            <div style={styles.authSubtitle}>Access GridSense Control</div>
          </div>

          {/* Server / network error banner */}
          {hasError && (
            <div style={styles.errorBanner} role="alert" aria-live="polite">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#f85149" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" />
                <path d="M8 5v3M8 11v.5" />
              </svg>
              <span>{error.message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={styles.form} noValidate>

            {/* Email */}
            <div style={styles.fieldGroup}>
              <label htmlFor="gs-login-email" style={styles.fieldLabel}>
                WORK EMAIL
              </label>
              <input
                id="gs-login-email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                disabled={isSubmitting}
                style={{
                  ...styles.input,
                  ...(fieldErrors.email ? styles.inputError : {}),
                }}
                placeholder="you@organisation.gov"
                aria-describedby={fieldErrors.email ? 'gs-login-email-err' : undefined}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <span id="gs-login-email-err" style={styles.fieldError} role="alert">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label htmlFor="gs-login-password" style={styles.fieldLabel}>
                PASSWORD
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  id="gs-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  disabled={isSubmitting}
                  style={{
                    ...styles.input,
                    paddingRight: 36,
                    ...(fieldErrors.password ? styles.inputError : {}),
                  }}
                  placeholder="••••••••"
                  aria-describedby={fieldErrors.password ? 'gs-login-pw-err' : undefined}
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={styles.showHideBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {fieldErrors.password && (
                <span id="gs-login-pw-err" style={styles.fieldError} role="alert">
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              id="gs-login-submit"
              type="submit"
              disabled={isSubmitting}
              style={{
                ...styles.submitBtn,
                ...(isSubmitting ? styles.submitBtnDisabled : {}),
              }}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'AUTHENTICATING…' : 'SIGN IN'}
            </button>
          </form>

          {/* Forgot password */}
          <div style={styles.forgotRow}>
            <button
              type="button"
              style={styles.forgotBtn}
              className="gs-forgot-btn"
              onClick={() => {/* Backend integration point */}}
            >
              Forgot password?
            </button>
          </div>

          {/* Footer note */}
          <div style={styles.authFooter}>
            Authorised personnel only. All access is logged and monitored.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles — inline objects matching GridSense design tokens
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0d1117',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    overflow: 'auto',
  },

  // ── Left panel ────────────────────────────────────────────────────────────
  leftPanel: {
    flex: '0 0 420px',
    borderRight: '1px solid rgba(48,54,61,0.6)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0d1117',
    padding: '48px 40px',
    position: 'relative',
  },

  leftInner: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: 0,
  },

  brandRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 28,
  },

  logoMark: {
    width: 36,
    height: 36,
    border: '1px solid rgba(48,54,61,0.9)',
    backgroundColor: '#161b22',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#e6edf3',
    flexShrink: 0,
    marginTop: 2,
  },

  brandName: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: '#e6edf3',
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.2,
  },

  brandTagline: {
    fontSize: 10,
    color: '#6e7681',
    letterSpacing: '0.04em',
    marginTop: 4,
    textTransform: 'uppercase',
    fontFamily: "'IBM Plex Mono', monospace",
  },

  operationalStatement: {
    fontSize: 12,
    color: '#8b949e',
    lineHeight: 1.7,
    margin: 0,
    marginBottom: 32,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(48,54,61,0.6)',
    marginBottom: 28,
  },

  statusBlock: {
    marginBottom: 'auto',
  },

  statusHeader: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#6e7681',
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: 12,
  },

  statusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  statusLabel: {
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.04em',
  },

  leftFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid rgba(48,54,61,0.4)',
  },

  footerText: {
    fontSize: 10,
    color: '#6e7681',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.04em',
  },

  footerSep: {
    color: 'rgba(48,54,61,0.9)',
    fontSize: 10,
  },

  mockNotice: {
    marginTop: 16,
    padding: '8px 10px',
    backgroundColor: 'rgba(210, 153, 34, 0.08)',
    border: '1px solid rgba(210, 153, 34, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  mockLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#d29922',
    fontFamily: "'IBM Plex Mono', monospace",
  },

  mockHint: {
    fontSize: 9,
    color: '#8b949e',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.02em',
    lineHeight: 1.6,
  },

  // ── Right panel ───────────────────────────────────────────────────────────
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px',
    backgroundColor: '#0d1117',
  },

  authCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#161b22',
    border: '1px solid rgba(48,54,61,0.6)',
    padding: '32px 28px',
  },

  authHeader: {
    marginBottom: 24,
  },

  authTitle: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.14em',
    color: '#e6edf3',
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: 4,
  },

  authSubtitle: {
    fontSize: 11,
    color: '#8b949e',
    letterSpacing: '0.02em',
  },

  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    marginBottom: 20,
    backgroundColor: 'rgba(248,81,73,0.08)',
    border: '1px solid rgba(248,81,73,0.3)',
    color: '#f85149',
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.02em',
    lineHeight: 1.5,
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },

  fieldLabel: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#6e7681',
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    userSelect: 'none',
  },

  input: {
    width: '100%',
    backgroundColor: '#0d1117',
    border: '1px solid rgba(48,54,61,0.9)',
    color: '#e6edf3',
    fontSize: 12,
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    padding: '8px 10px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.1s',
  },

  inputError: {
    borderColor: 'rgba(248,81,73,0.6)',
  },

  fieldError: {
    fontSize: 10,
    color: '#f85149',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.02em',
  },

  passwordWrapper: {
    position: 'relative',
  },

  showHideBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: '#6e7681',
    cursor: 'pointer',
    padding: 0,
  },

  submitBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f85149',
    border: '1px solid rgba(248,81,73,0.5)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer',
    transition: 'background-color 0.1s, opacity 0.1s',
    marginTop: 4,
  },

  submitBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    backgroundColor: '#6e7681',
    borderColor: 'rgba(110,118,129,0.5)',
  },

  forgotRow: {
    marginTop: 16,
    textAlign: 'center' as const,
  },

  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#6e7681',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    textDecoration: 'underline',
    textDecorationColor: 'rgba(110,118,129,0.4)',
    padding: 0,
  },

  authFooter: {
    marginTop: 28,
    paddingTop: 16,
    borderTop: '1px solid rgba(48,54,61,0.4)',
    fontSize: 10,
    color: '#6e7681',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.02em',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
};
