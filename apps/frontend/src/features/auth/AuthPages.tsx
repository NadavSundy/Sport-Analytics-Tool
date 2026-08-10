import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface AuthenticationPageProps {
  mode: 'create-account' | 'sign-in';
}

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Stat'sTheGame`;
  }, [title]);
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
