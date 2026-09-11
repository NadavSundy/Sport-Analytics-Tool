import { datasetReleaseVersionSchema, type DatasetRelease } from '@sport-analytics/contracts';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { datasetReleaseArtifactUrl } from '../../api/public-read';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  AdminDatasetReleaseContractError,
  createAdministratorDatasetRelease,
} from './admin-dataset-release-api';

type AccessState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string };

const versionGuidance =
  'Use 1–64 letters, numbers, dots, underscores, or hyphens, beginning with a letter or number.';

function formatCreationTime(value: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiResponseError && error.kind === 'unauthenticated') {
    return 'Your session is no longer valid. Sign in again before publishing a release.';
  }
  if (error instanceof ApiResponseError && error.kind === 'forbidden') {
    return 'Your signed-in account is not authorised to publish dataset releases.';
  }
  if (error instanceof ApiResponseError || error instanceof AdminDatasetReleaseContractError) {
    return error.message;
  }
  return 'The dataset release could not be published. Please try again.';
}

export function AdminDatasetReleasePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const client = useAuthenticatedApiClient();
  const [accessState, setAccessState] = useState<AccessState>({ kind: 'loading' });
  const [version, setVersion] = useState('');
  const [versionError, setVersionError] = useState<string>();
  const [submissionError, setSubmissionError] = useState<string>();
  const [isPublishing, setIsPublishing] = useState(false);
  const [release, setRelease] = useState<DatasetRelease>();
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Publish Dataset Release | Stat'sTheGame";
  }, []);

  const checkAccess = useCallback(
    async (signal?: AbortSignal) => {
      setAccessState({ kind: 'loading' });
      try {
        const profile = await getCurrentUserProfile(client, signal);
        setAccessState(profile.role === 'admin' ? { kind: 'ready' } : { kind: 'forbidden' });
      } catch (error) {
        if (signal?.aborted) return;
        if (error instanceof ApiResponseError && error.kind === 'forbidden') {
          setAccessState({ kind: 'forbidden' });
        } else {
          setAccessState({ kind: 'error', message: errorMessage(error) });
        }
      }
    },
    [client],
  );

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const controller = new AbortController();
    void checkAccess(controller.signal);
    return () => controller.abort();
  }, [checkAccess, isAuthenticated, isLoading]);

  useEffect(() => {
    if (versionError || submissionError || release) {
      feedbackRef.current?.focus();
    }
  }, [release, submissionError, versionError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPublishing || accessState.kind !== 'ready') return;

    const parsedVersion = datasetReleaseVersionSchema.safeParse(version);
    if (!parsedVersion.success) {
      setVersionError(versionGuidance);
      setSubmissionError(undefined);
      setRelease(undefined);
      return;
    }

    setVersionError(undefined);
    setSubmissionError(undefined);
    setRelease(undefined);
    setIsPublishing(true);
    try {
      setRelease(await createAdministratorDatasetRelease(client, { version: parsedVersion.data }));
    } catch (error) {
      setSubmissionError(errorMessage(error));
    } finally {
      setIsPublishing(false);
    }
  }

  if (!isLoading && !isAuthenticated) return <Navigate to="/sign-in" replace />;

  return (
    <section className="admin-release-page content-boundary" aria-labelledby="admin-release-title">
      <header className="page-heading admin-release-page__heading">
        <p className="eyebrow">Administrator workspace</p>
        <h1 id="admin-release-title">Publish dataset release</h1>
        <p>
          Generate a versioned snapshot of published accepted deliveries and make it available to
          public data consumers.
        </p>
      </header>

      {isLoading || accessState.kind === 'loading' ? (
        <div className="state-message" role="status">
          <h2>Checking release permission</h2>
          <p>Confirming that your account can publish dataset releases…</p>
        </div>
      ) : accessState.kind === 'forbidden' ? (
        <div className="state-message state-message--error" role="alert">
          <h2>Administrator access required</h2>
          <p>Your signed-in account cannot generate or publish dataset releases.</p>
        </div>
      ) : accessState.kind === 'error' ? (
        <div className="state-message state-message--error" role="alert">
          <h2>Release permission could not be checked</h2>
          <p>{accessState.message}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void checkAccess()}
          >
            Retry permission check
          </button>
        </div>
      ) : (
        <div className="admin-release-workspace">
          <div className="admin-release-warning">
            <p className="eyebrow">Permanent public action</p>
            <h2>Review the version before publishing</h2>
            <p>
              Publishing immediately creates an immutable snapshot in the public dataset-release
              catalogue. An existing version cannot be overwritten; corrections require a new
              version.
            </p>
          </div>

          <form
            className="admin-release-form"
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="field admin-release-form__field">
              <label htmlFor="dataset-release-version">Release version</label>
              <input
                id="dataset-release-version"
                name="version"
                type="text"
                autoComplete="off"
                aria-describedby={`dataset-release-version-help${versionError ? ' dataset-release-version-error' : ''}`}
                aria-invalid={versionError ? 'true' : undefined}
                disabled={isPublishing}
                value={version}
                onChange={(event) => {
                  setVersion(event.target.value);
                  setVersionError(undefined);
                  setSubmissionError(undefined);
                  setRelease(undefined);
                }}
              />
              <p id="dataset-release-version-help" className="field-help">
                {versionGuidance} Example: 2026.09.2
              </p>
              {versionError ? (
                <p id="dataset-release-version-error" className="field-error">
                  {versionError}
                </p>
              ) : null}
            </div>
            <button className="button button--primary" type="submit" disabled={isPublishing}>
              {isPublishing ? 'Publishing release…' : 'Generate and publish snapshot'}
            </button>
          </form>

          {versionError || submissionError ? (
            <div
              ref={feedbackRef}
              className="admin-release-feedback admin-release-feedback--error"
              role="alert"
              tabIndex={-1}
            >
              <h2>Dataset release was not published</h2>
              <p>{versionError ?? submissionError}</p>
            </div>
          ) : null}

          {release ? (
            <div
              ref={feedbackRef}
              className="admin-release-feedback admin-release-feedback--success"
              role="status"
              tabIndex={-1}
            >
              <p className="eyebrow">Public release available</p>
              <h2>Dataset {release.version}</h2>
              <p>This immutable snapshot is now available in the public release catalogue.</p>
              <dl className="admin-release-facts">
                <div>
                  <dt>Created</dt>
                  <dd>{formatCreationTime(release.createdAt)}</dd>
                </div>
                <div>
                  <dt>Events</dt>
                  <dd>{release.eventCount.toLocaleString('en-ZA')}</dd>
                </div>
                <div className="admin-release-facts__checksum">
                  <dt>SHA-256 checksum</dt>
                  <dd>
                    <code>{release.checksum}</code>
                  </dd>
                </div>
              </dl>
              <div className="admin-release-actions">
                <Link
                  className="button button--primary"
                  to={`/dataset-releases/${encodeURIComponent(release.version)}`}
                >
                  View public release
                </Link>
                <a
                  className="button button--secondary"
                  download={`dataset-release-${release.version}.json`}
                  href={datasetReleaseArtifactUrl(release.version)}
                >
                  Download JSON artefact
                </a>
                <Link className="text-link" to="/dataset-releases">
                  Browse release catalogue
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
