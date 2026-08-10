import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface AuthenticationPageProps {
  mode: 'create-account' | 'sign-in';
}

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

export function AuthenticationPage({ mode }: AuthenticationPageProps) {
  const { signInWithGoogle } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCreatingAccount = mode === 'create-account';
  const title = isCreatingAccount ? 'Create Account' : 'Sign In';

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
          {isCreatingAccount
            ? 'Use your Google identity to create your authentication account.'
            : 'Continue with your Google identity to sign in.'}
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
        <p className="auth-card__alternative">
          {isCreatingAccount ? (
            <>
              Already have an account? <Link to="/sign-in">Sign In</Link>
            </>
          ) : (
            <>
              New to Stat&rsquo;sTheGame? <Link to="/create-account">Create Account</Link>
            </>
          )}
        </p>
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
          <dl className="identity-details">
            <div>
              <dt>Email</dt>
              <dd>{identity.email ?? 'Not available'}</dd>
            </div>
          </dl>
        ) : (
          <p>
            You are signed out. <Link to="/sign-in">Sign In</Link> to view your account.
          </p>
        )}
      </div>
    </section>
  );
}
