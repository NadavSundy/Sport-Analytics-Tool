import type { AccountDeletionResponse } from '@sport-analytics/contracts';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiResponseError } from '../../api/client';
import { SubmitterAccessPanel } from '../submitter-access/SubmitterAccessPanel';
import { useAuth } from './AuthProvider';
import { useAuthenticatedApiClient } from './useAuthenticatedApiClient';
import { getCurrentUserProfile } from './current-user-api';
import { safeInternalReturnPath } from './auth-return';
import { LocalNavigation } from '../../components/NavigationPrimitives';
import type { Competition, CurrentUserProfile } from '@sport-analytics/contracts';
import { competitionOptions } from '../submissions/BatchUploadPage';

type OAuthCallbackError = 'cancelled' | 'provider-error';

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Stat'sTheGame`;
  }, [title]);
}

function getOAuthCallbackError(search: string, hash: string): OAuthCallbackError | null {
  const searchParameters = new URLSearchParams(search);
  const hashParameters = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const error = searchParameters.get('error') ?? hashParameters.get('error');

  const hasError =
    error !== null ||
    searchParameters.has('error_code') ||
    searchParameters.has('error_description') ||
    hashParameters.has('error_code') ||
    hashParameters.has('error_description');

  if (!hasError) {
    return null;
  }

  return error === 'access_denied' ? 'cancelled' : 'provider-error';
}

function CallbackRecoveryLinks() {
  return (
    <p className="auth-card__alternative">
      <Link to="/sign-in">Try Again</Link> or <Link to="/">Return Home</Link>
    </p>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="google-sign-in-button__mark"
      focusable="false"
      viewBox="0 0 48 48"
    >
      <path
        fill="#FFC107"
        d="M43.6 20H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 5.9 29.2 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-4z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 5.9 29.2 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.1 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20H42V20H24v8h11.3c-1.1 3-3.1 5.4-5.8 7l.1-.1 6.2 5.2C35.4 40.5 44 34 44 24c0-1.3-.1-2.7-.4-4z"
      />
    </svg>
  );
}

function deletionErrorMessage(error: unknown): string {
  if (error instanceof ApiResponseError) {
    if (error.code === 'RECENT_AUTHENTICATION_REQUIRED') {
      return 'For security, sign out and sign in again before retrying account deletion.';
    }

    if (error.code === 'ACCOUNT_DELETION_INCOMPLETE') {
      return 'Deletion could not be completed. Your account is disabled and the operation can be retried safely.';
    }

    if (error.code === 'ACCOUNT_DELETION_UNAVAILABLE') {
      return 'Account deletion is currently unavailable.';
    }
  }

  return 'We could not delete your account. Please try again.';
}

function AccountDeletionForm() {
  const apiClient = useAuthenticatedApiClient();
  const { clearLocalSession } = useAuth();
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = acknowledged && confirmation === 'DELETE';

  async function handleDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfirmed || inFlight.current) {
      return;
    }

    inFlight.current = true;
    setIsDeleting(true);
    setStatus('Deleting your account…');
    setError(null);

    try {
      await apiClient.request<AccountDeletionResponse>('/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      setStatus('Account deleted. Clearing this browser session…');

      try {
        await clearLocalSession();
      } catch {
        // The backend account is permanently disabled. Continue to the public
        // page after clearing managed React state in AuthProvider.
      }

      navigate('/', { replace: true });
    } catch (deletionError) {
      setError(deletionErrorMessage(deletionError));
      setStatus(null);
      setIsDeleting(false);
      inFlight.current = false;
    }
  }

  return (
    <section className="account-deletion" aria-labelledby="account-deletion-title">
      <p className="eyebrow">Danger zone</p>
      <h2 id="account-deletion-title">Delete account</h2>
      <p>
        Your Supabase login identity and personal account information will be permanently deleted.
        Submitted cricket data, delivery events, statistics, and provenance will remain under a
        non-identifying deleted-account record.
      </p>
      <p>You may need to sign in again first so the backend can confirm recent authentication.</p>

      <form className="account-deletion__form" onSubmit={handleDeletion}>
        <label className="account-deletion__acknowledgement">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            disabled={isDeleting}
          />
          <span>I understand that account deletion is permanent.</span>
        </label>

        <label className="account-deletion__confirmation" htmlFor="account-deletion-confirmation">
          <span>
            Type <strong>DELETE</strong> to confirm
          </span>
          <input
            id="account-deletion-confirmation"
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={isDeleting}
          />
        </label>

        <button
          className="button button--danger"
          type="submit"
          disabled={!isConfirmed || isDeleting}
        >
          {isDeleting ? 'Deleting account…' : 'Permanently delete account'}
        </button>
      </form>

      {status ? (
        <p className="account-deletion__status" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function AuthenticationPage() {
  const { signInWithGoogle } = useAuth();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = 'Login or Sign up';

  usePageTitle(title);

  async function handleGoogleAuthentication() {
    setIsProcessing(true);
    setError(null);

    try {
      const returnPath = safeInternalReturnPath(
        new URLSearchParams(location.search).get('returnTo'),
      );
      await signInWithGoogle(returnPath);
    } catch {
      setError('We could not connect to Google. Please try again.');
      setIsProcessing(false);
    }
  }

  return (
    <section className="auth-page content-boundary" aria-labelledby="auth-page-title">
      <div className="auth-card">
        <p className="eyebrow">Supabase managed authentication</p>
        <h1 id="auth-page-title">{title}</h1>
        <p className="auth-card__introduction">
          Supabase will securely handle your Google login or sign-up.
        </p>
        <button
          aria-label={isProcessing ? 'Connecting to Google…' : 'Sign in with Google'}
          className="button google-sign-in-button"
          type="button"
          onClick={handleGoogleAuthentication}
          disabled={isProcessing}
        >
          <GoogleMark />
          <span aria-hidden="true">{isProcessing ? 'Connecting…' : 'Sign in'}</span>
        </button>
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function AuthenticationCallbackPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [callbackError] = useState<OAuthCallbackError | null>(() =>
    getOAuthCallbackError(location.search, location.hash),
  );
  const returnPath = safeInternalReturnPath(new URLSearchParams(location.search).get('returnTo'));

  usePageTitle('Completing Sign In');

  useEffect(() => {
    if (callbackError && (location.search || location.hash)) {
      navigate('/auth/callback', { replace: true });
    }
  }, [callbackError, location.hash, location.search, navigate]);
  useEffect(() => {
    if (!callbackError && !isLoading && isAuthenticated) {
      navigate(returnPath ?? '/account', { replace: true });
    }
  }, [callbackError, isAuthenticated, isLoading, navigate, returnPath]);

  let callbackContent;

  if (callbackError === 'cancelled') {
    callbackContent = (
      <>
        <p className="auth-error" role="alert">
          Sign-in was cancelled. No changes were made.
        </p>
        <CallbackRecoveryLinks />
      </>
    );
  } else if (callbackError === 'provider-error') {
    callbackContent = (
      <>
        <p className="auth-error" role="alert">
          We could not complete sign-in. Please try again.
        </p>
        <CallbackRecoveryLinks />
      </>
    );
  } else if (isLoading) {
    callbackContent = <p role="status">Completing sign-in…</p>;
  } else if (isAuthenticated) {
    callbackContent = <p role="status">Sign-in complete. Opening your account…</p>;
  } else {
    callbackContent = (
      <>
        <p className="auth-error" role="alert">
          We could not establish a signed-in session. Please try again.
        </p>
        <CallbackRecoveryLinks />
      </>
    );
  }

  return (
    <section className="auth-page content-boundary" aria-labelledby="auth-callback-title">
      <div className="auth-card">
        <p className="eyebrow">Supabase managed authentication</p>
        <h1 id="auth-callback-title">Completing Sign In</h1>
        {callbackContent}
      </div>
    </section>
  );
}

function AccountOverview({ identityEmail }: { identityEmail: string | undefined }) {
  const client = useAuthenticatedApiClient();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [error, setError] = useState(false);
  const [scopeDialogState, setScopeDialogState] = useState<
    | { kind: 'closed' }
    | { kind: 'loading' }
    | { kind: 'ready'; competitions: Competition[] }
    | { kind: 'error' }
  >({ kind: 'closed' });
  const scopeTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getCurrentUserProfile(client, controller.signal)
      .then(setProfile)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [client]);

  useEffect(() => {
    if (scopeDialogState.kind === 'closed' || !profile) return;
    const controller = new AbortController();
    void competitionOptions(profile, controller.signal)
      .then((competitions) => {
        if (!controller.signal.aborted) setScopeDialogState({ kind: 'ready', competitions });
      })
      .catch(() => {
        if (!controller.signal.aborted) setScopeDialogState({ kind: 'error' });
      });
    return () => controller.abort();
  }, [profile, scopeDialogState.kind]);

  function closeScopeDialog() {
    setScopeDialogState({ kind: 'closed' });
    scopeTriggerRef.current?.focus();
  }

  return (
    <section aria-labelledby="account-overview-title">
      <h2 id="account-overview-title">Overview</h2>
      <dl className="identity-details">
        <div>
          <dt>Email</dt>
          <dd>{identityEmail ?? 'Not available'}</dd>
        </div>
        {profile ? (
          <>
            <div>
              <dt>Role</dt>
              <dd>{profile.role}</dd>
            </div>
            <div>
              <dt>Submission access</dt>
              <dd>{profile.approvalState.replaceAll('_', ' ')}</dd>
            </div>
            {profile.competitionIds.length > 0 ? (
              <div>
                <dt>Competition scopes</dt>
                <dd>{profile.competitionIds.length}</dd>
                {profile.role === 'submitter' && profile.approvalState === 'approved' ? (
                  <button
                    ref={scopeTriggerRef}
                    className="button button--secondary"
                    type="button"
                    onClick={() => setScopeDialogState({ kind: 'loading' })}
                  >
                    View approved competition scopes
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </dl>
      {error ? <p role="alert">Your access summary could not be loaded.</p> : null}
      {!profile && !error ? <p role="status">Loading access summary...</p> : null}
      {scopeDialogState.kind !== 'closed' ? (
        <div
          className="submitter-access-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeScopeDialog();
          }}
        >
          <div
            className="submitter-access-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="approved-scopes-dialog-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeScopeDialog();
              }
            }}
          >
            <h2 id="approved-scopes-dialog-title">Your approved competition scopes</h2>
            {scopeDialogState.kind === 'loading' ? (
              <p role="status">Loading approved scopes…</p>
            ) : null}
            {scopeDialogState.kind === 'error' ? (
              <p role="alert">
                Your approved competition scopes could not be loaded. Please try again.
              </p>
            ) : null}
            {scopeDialogState.kind === 'ready' ? (
              <ul>
                {scopeDialogState.competitions.map((competition) => (
                  <li key={competition.competitionId}>{competition.name}</li>
                ))}
              </ul>
            ) : null}
            <div className="submitter-access-dialog__actions">
              <button
                className="button button--secondary"
                type="button"
                autoFocus
                onClick={closeScopeDialog}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AccountSignOutAction() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function handleSignOut() {
    setBusy(true);
    setError(false);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  return (
    <section aria-labelledby="sign-out-title">
      <h2 id="sign-out-title">Sign out</h2>
      <p>End your managed session on this device. Public browsing remains available.</p>
      <button
        className="button button--secondary"
        type="button"
        disabled={busy}
        onClick={() => void handleSignOut()}
      >
        {busy ? 'Signing Out\u2026' : 'Sign out'}
      </button>
      {error ? <p role="alert">We could not sign you out. Please try again.</p> : null}
    </section>
  );
}

export function AccountPage() {
  const { identity, isAuthenticated, isLoading } = useAuth();
  const { section = 'overview' } = useParams();
  const activeSection = ['overview', 'access', 'security'].includes(section) ? section : 'overview';

  usePageTitle('Account');

  return (
    <section
      className="auth-page account-page content-boundary"
      aria-labelledby="account-page-title"
    >
      <div className="auth-card">
        <p className="eyebrow">Identity and access</p>
        <h1 id="account-page-title">Account</h1>
        {isLoading ? (
          <p role="status">Loading account…</p>
        ) : isAuthenticated && identity ? (
          <>
            <LocalNavigation
              label="Account sections"
              items={[
                { label: 'Overview', to: '/account/overview' },
                { label: 'Access', to: '/account/access' },
                { label: 'Account management', to: '/account/security' },
              ]}
            />
            {activeSection === 'overview' ? (
              <AccountOverview identityEmail={identity.email} />
            ) : null}
            {activeSection === 'access' ? <SubmitterAccessPanel /> : null}
            {activeSection === 'security' ? (
              <>
                <AccountSignOutAction />
                <AccountDeletionForm />
              </>
            ) : null}
          </>
        ) : (
          <p>
            You are signed out. <Link to="/sign-in">Login or Sign up</Link> to view your account.
          </p>
        )}
      </div>
    </section>
  );
}
