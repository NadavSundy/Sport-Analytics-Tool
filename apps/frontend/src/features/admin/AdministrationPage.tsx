import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { CurrentUserProfile } from '@sport-analytics/contracts';
import { Breadcrumbs } from '../../components/NavigationPrimitives';
import { useAuth } from '../auth/AuthProvider';
import { signInPathFor } from '../auth/auth-return';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';

export function AdministrationPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const client = useAuthenticatedApiClient();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    void getCurrentUserProfile(client, controller.signal)
      .then(setProfile)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [client, isAuthenticated]);

  if (!isLoading && !isAuthenticated) {
    return <Navigate to={signInPathFor(`${location.pathname}${location.search}`)} replace />;
  }

  return (
    <section
      className="content-boundary administration-page"
      aria-labelledby="administration-title"
    >
      <Breadcrumbs items={[{ label: 'Administration', to: '#' }]} />
      <header className="page-heading">
        <p className="eyebrow">Administration</p>
        <h1 id="administration-title">Administration</h1>
        <p>Manage existing access controls and dataset publishing.</p>
      </header>
      {isLoading || (!profile && !failed) ? (
        <p role="status">Checking administrator accessâ€¦</p>
      ) : null}
      {failed ? <p role="alert">Administrator access could not be confirmed.</p> : null}
      {profile && profile.role !== 'admin' ? (
        <div className="state-message state-message--error" role="alert">
          <h2>Administrator access required</h2>
          <p>This area is available only to administrators.</p>
        </div>
      ) : null}
      {profile?.role === 'admin' ? (
        <div className="administration-links">
          <section>
            <h2>Users &amp; access</h2>
            <p>Search users, review roles, and manage submitter competition scopes.</p>
            <Link className="button button--secondary" to="/admin/users">
              Manage users
            </Link>
          </section>
          <section>
            <h2>Data governance</h2>
            <p>Publish versioned dataset releases and inspect the public release catalogue.</p>
            <div className="administration-links__actions">
              <Link className="button button--primary" to="/admin/dataset-releases/new">
                Publish dataset release
              </Link>
              <Link to="/dataset-releases">View release catalogue</Link>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
