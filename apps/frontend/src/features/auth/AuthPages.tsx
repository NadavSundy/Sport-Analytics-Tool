import type { AccountDeletionResponse } from '@sport-analytics/contracts';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiResponseError } from '../../api/client';
import { SubmitterAccessPanel } from '../submitter-access/SubmitterAccessPanel';
import { useAuth } from './AuthProvider';
import { useAuthenticatedApiClient } from './useAuthenticatedApiClient';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = 'Login or Sign up';

  usePageTitle(title);

  async function handleGoogleAuthentication() {
    setIsProcessing(true);
    setError(null);

    try {
      await signInWithGoogle();
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
          Continue with your Google identity. Supabase will securely handle your login or sign-up.
        </p>
        <button
          className="button button--primary"
          type="button"
          onClick={handleGoogleAuthentication}
          disabled={isProcessing}
        >
          {isProcessing ? 'Connecting to Google…' : 'Continue with Google'}
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

  usePageTitle('Completing Sign In');

  useEffect(() => {
    if (callbackError && (location.search || location.hash)) {
      navigate('/auth/callback', { replace: true });
    }
  }, [callbackError, location.hash, location.search, navigate]);
  useEffect(() => {
    if (!callbackError && !isLoading && isAuthenticated) {
      navigate('/account', { replace: true });
    }
  }, [callbackError, isAuthenticated, isLoading, navigate]);

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

export function AccountPage() {
  const { identity, isAuthenticated, isLoading } = useAuth();

  usePageTitle('Account');

  return (
    <section className="auth-page content-boundary" aria-labelledby="account-page-title">
      <div className="auth-card">
        <p className="eyebrow">Supabase identity</p>
        <h1 id="account-page-title">Account</h1>
        {isLoading ? (
          <p role="status">Loading account…</p>
        ) : isAuthenticated && identity ? (
          <>
            <dl className="identity-details">
              <div>
                <dt>Email</dt>
                <dd>{identity.email ?? 'Not available'}</dd>
              </div>
            </dl>
            <SubmitterAccessPanel />
            <AccountDeletionForm />
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
