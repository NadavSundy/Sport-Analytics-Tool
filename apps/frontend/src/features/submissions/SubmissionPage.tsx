import type {
  ApiErrorDetail,
  CurrentUserProfile,
  Fixture,
  SubmissionEvent,
  SubmissionResponse,
} from '@sport-analytics/contracts';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import { CorrectionWorkspace } from './CorrectionWorkspace';
import {
  listAllFixtures,
  listScopedFixtures,
  SubmissionInputError,
  submitEvents,
  submitSubmissionFile,
} from './submission-api';

const EMPTY_EVENTS = '[]';

type AccessState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'forbidden';
      role: CurrentUserProfile['role'];
      approvalState: CurrentUserProfile['approvalState'];
    }
  | { kind: 'permitted'; fixtures: Fixture[]; role: 'submitter' | 'admin' };

type ResultState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | {
      kind: 'accepted';
      response: SubmissionResponse;
      correctionContext?: {
        events: SubmissionEvent[];
        fixture: Fixture;
      };
    }
  | { kind: 'rejected'; message: string; details: ApiErrorDetail[] }
  | { kind: 'error'; message: string };

function usePageTitle() {
  useEffect(() => {
    document.title = "Submit Events | Stat'sTheGame";
  }, []);
}

function formatFixtureOption(fixture: Fixture): string {
  return `${fixture.startDate} — ${fixture.matchType}, ${fixture.season} (fixture ${fixture.fixtureId})`;
}

function formatValidationLocation(detail: ApiErrorDetail, uploadedFile: boolean): string {
  const eventLabel =
    detail.eventIndex === undefined
      ? uploadedFile
        ? 'File'
        : 'Submission'
      : `${uploadedFile ? 'Row' : 'Event'} ${detail.eventIndex + 1}`;

  let field = detail.field;

  if (field && detail.eventIndex !== undefined) {
    field = field.replace(new RegExp(`^events\\.${detail.eventIndex}\\.?`), '');
  }

  return field ? `${eventLabel} — ${field}` : eventLabel;
}

function AccessError({ message }: { message: string }) {
  return (
    <div className="state-message state-message--error" role="alert">
      <h2>Submission access could not be checked</h2>
      <p>{message}</p>
    </div>
  );
}

function ForbiddenState({
  role,
  approvalState,
}: {
  role: CurrentUserProfile['role'];
  approvalState: CurrentUserProfile['approvalState'];
}) {
  const detail =
    role === 'viewer' && approvalState === 'pending'
      ? 'Your submitter request is pending approval.'
      : 'Your account does not have the submitter role required to submit event data.';

  return (
    <div className="state-message" role="status">
      <h2>Submitter role required</h2>
      <p>{detail} The backend will continue to protect every submission and competition scope.</p>
      <Link className="button button--secondary" to="/account">
        Return to account
      </Link>
    </div>
  );
}

function ValidationResults({
  message,
  details,
  uploadedFile,
}: {
  message: string;
  details: ApiErrorDetail[];
  uploadedFile: boolean;
}) {
  return (
    <div className="submission-result submission-result--error" role="alert">
      <h2 tabIndex={-1} data-result-heading>
        Submission rejected
      </h2>

      <p>{message}</p>

      {details.length > 0 ? (
        <ol className="validation-results">
          {details.map((detail, index) => (
            <li
              key={`${detail.code}-${detail.eventIndex ?? 'submission'}-${detail.field ?? index}`}
            >
              <strong>{formatValidationLocation(detail, uploadedFile)}</strong>
              <span>{detail.message}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function SubmissionForm({ fixtures, role }: { fixtures: Fixture[]; role: 'submitter' | 'admin' }) {
  const client = useAuthenticatedApiClient();

  const [fixtureId, setFixtureId] = useState(fixtures[0]?.fixtureId ?? '');
  const [eventJson, setEventJson] = useState(EMPTY_EVENTS);
  const [mode, setMode] = useState<'file' | 'json'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });

  const resultRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result.kind === 'accepted' || result.kind === 'rejected' || result.kind === 'error') {
      resultRegionRef.current?.querySelector<HTMLElement>('[data-result-heading]')?.focus();
    }
  }, [result]);

  function resetResult() {
    if (result.kind !== 'idle' && result.kind !== 'submitting') {
      setResult({ kind: 'idle' });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === 'file' && !file) {
      setResult({
        kind: 'rejected',
        message: 'Choose a JSON or CSV file before submitting.',
        details: [],
      });
      return;
    }

    setResult({ kind: 'submitting' });

    try {
      if (mode === 'file' && file) {
        const response = await submitSubmissionFile(client, file);

        setResult({
          kind: 'accepted',
          response,
        });
      } else {
        const accepted = await submitEvents(client, fixtureId, eventJson);

        const fixture = fixtures.find(
          (candidate) => candidate.fixtureId === accepted.response.data.fixtureId,
        );

        if (!fixture) {
          throw new SubmissionInputError('Select an available fixture before submitting.');
        }

        setResult({
          kind: 'accepted',
          response: accepted.response,
          correctionContext: {
            events: accepted.events,
            fixture,
          },
        });
      }
    } catch (error) {
      if (error instanceof SubmissionInputError) {
        setResult({
          kind: 'rejected',
          message: error.message,
          details: [],
        });
      } else if (error instanceof ApiResponseError && error.details) {
        setResult({
          kind: 'rejected',
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof ApiResponseError && error.status === 403) {
        setResult({
          kind: 'error',
          message:
            'The backend did not permit this submission. Your approval or fixture scope may have changed.',
        });
      } else {
        setResult({
          kind: 'error',
          message:
            error instanceof ApiResponseError
              ? error.message
              : 'The submission could not be completed. Please try again.',
        });
      }
    }
  }

  if (fixtures.length === 0) {
    return (
      <div className="state-message" role="status">
        <h2>No in-scope fixtures</h2>
        <p>
          Your account has submission access, but it currently has no available fixtures in its
          scope.
        </p>
      </div>
    );
  }

  const resultDescriptionId =
    result.kind === 'rejected' ? 'submission-validation-results' : undefined;

  const competitions = [...new Set(fixtures.map((fixture) => fixture.competitionName))];

  return (
    <>
      <form className="submission-form" onSubmit={handleSubmit}>
        <fieldset className="submission-mode" disabled={result.kind === 'submitting'}>
          <legend>Choose how to submit</legend>

          <p className="field-help">
            Upload is the normal submitter workflow. The technical JSON editor remains available for
            advanced use.
          </p>

          <label>
            <input
              type="radio"
              name="submission-mode"
              value="file"
              checked={mode === 'file'}
              onChange={() => {
                setMode('file');
                resetResult();
              }}
            />
            Upload a JSON or CSV file
          </label>

          <label>
            <input
              type="radio"
              name="submission-mode"
              value="json"
              checked={mode === 'json'}
              onChange={() => {
                setMode('json');
                resetResult();
              }}
            />
            Paste technical JSON
          </label>
        </fieldset>

        <section className="submission-scope" aria-labelledby="submission-scope-title">
          <h2 id="submission-scope-title">
            {role === 'admin' ? 'Administrator submission access' : 'Your authorised competitions'}
          </h2>
          {role === 'admin' ? (
            <p>
              You may submit event data for any competition. The backend confirms your administrator
              role when it receives your submission.
            </p>
          ) : (
            <p>
              {competitions.join(', ')}. The backend checks this scope again when it receives your
              submission.
            </p>
          )}
        </section>

        {mode === 'file' ? (
          <div className="submission-field">
            <label htmlFor="submission-file">Event data file</label>

            <p id="submission-file-help" className="field-help">
              Choose one <code>.json</code> or <code>.csv</code> file up to 1 MB. CSV must use the
              documented header order.{' '}
              <a href="/submission-template.json" download>
                Download a JSON template
              </a>{' '}
              or{' '}
              <a href="/submission-template.csv" download>
                CSV template
              </a>
              .
            </p>

            <input
              id="submission-file"
              type="file"
              accept=".json,application/json,.csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                resetResult();
              }}
              aria-describedby={
                ['submission-file-help', resultDescriptionId].filter(Boolean).join(' ') || undefined
              }
              aria-invalid={result.kind === 'rejected'}
              disabled={result.kind === 'submitting'}
            />

            {file ? (
              <p className="field-help">
                Selected: {file.name} ({Math.ceil(file.size / 1024)} KB)
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="submission-field">
              <label htmlFor="submission-fixture">Fixture</label>

              <select
                id="submission-fixture"
                value={fixtureId}
                onChange={(event) => {
                  setFixtureId(event.target.value);
                  resetResult();
                }}
                disabled={result.kind === 'submitting'}
              >
                {fixtures.map((fixture) => (
                  <option key={fixture.fixtureId} value={fixture.fixtureId}>
                    {formatFixtureOption(fixture)}
                  </option>
                ))}
              </select>

              <p className="field-help">
                {role === 'admin'
                  ? 'Eligible fixtures from every competition appear for administrators.'
                  : 'Only fixtures in your server-returned competition scope appear.'}
              </p>
            </div>

            <div className="submission-field">
              <label htmlFor="submission-events">Delivery events JSON</label>

              <p id="submission-events-help" className="field-help">
                Paste the <code>events</code> array for Basic schema 1.0. Fixture and schema version
                are added automatically. Final statistic totals are derived by the platform and are
                not accepted here.
              </p>

              <textarea
                id="submission-events"
                value={eventJson}
                onChange={(event) => {
                  setEventJson(event.target.value);
                  resetResult();
                }}
                aria-describedby={
                  ['submission-events-help', resultDescriptionId].filter(Boolean).join(' ') ||
                  undefined
                }
                aria-invalid={result.kind === 'rejected'}
                disabled={result.kind === 'submitting'}
                spellCheck={false}
                rows={18}
              />
            </div>
          </>
        )}

        <button
          className="button button--primary"
          type="submit"
          disabled={result.kind === 'submitting'}
        >
          {result.kind === 'submitting'
            ? 'Submitting…'
            : mode === 'file'
              ? 'Upload and submit file'
              : 'Submit events'}
        </button>

        {result.kind === 'submitting' ? (
          <p className="submission-progress" role="status">
            Validating and storing the submission…
          </p>
        ) : null}

        <div id={resultDescriptionId} ref={resultRegionRef}>
          {result.kind === 'accepted' ? (
            <div className="submission-result submission-result--success" role="status">
              <h2 tabIndex={-1} data-result-heading>
                Submission accepted
              </h2>

              <p>
                The backend accepted and stored {result.response.data.eventCount}{' '}
                {result.response.data.eventCount === 1 ? 'event' : 'events'}.
              </p>

              <dl className="submission-reference">
                <div>
                  <dt>Submission reference</dt>
                  <dd>{result.response.data.submissionId}</dd>
                </div>

                <div>
                  <dt>Fixture</dt>
                  <dd>{result.response.data.fixtureId}</dd>
                </div>

                <div>
                  <dt>Received</dt>
                  <dd>{new Date(result.response.data.receivedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          ) : result.kind === 'rejected' ? (
            <ValidationResults
              message={result.message}
              details={result.details}
              uploadedFile={mode === 'file'}
            />
          ) : result.kind === 'error' ? (
            <div className="submission-result submission-result--error" role="alert">
              <h2 tabIndex={-1} data-result-heading>
                Submission failed
              </h2>
              <p>{result.message}</p>
            </div>
          ) : null}
        </div>
      </form>

      {result.kind === 'accepted' && result.correctionContext ? (
        <CorrectionWorkspace
          fixture={result.correctionContext.fixture}
          initialEvents={result.correctionContext.events}
          key={result.response.data.submissionId}
        />
      ) : null}
    </>
  );
}

export function SubmissionPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const client = useAuthenticatedApiClient();

  const [accessState, setAccessState] = useState<AccessState>({
    kind: 'loading',
  });

  usePageTitle();

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    setAccessState({ kind: 'loading' });

    void getCurrentUserProfile(client, controller.signal)
      .then(async (profile) => {
        if (profile.role !== 'submitter' && profile.role !== 'admin') {
          setAccessState({
            kind: 'forbidden',
            role: profile.role,
            approvalState: profile.approvalState,
          });
          return;
        }

        const fixtures =
          profile.role === 'admin'
            ? await listAllFixtures(controller.signal)
            : await listScopedFixtures(profile.competitionIds, controller.signal);

        setAccessState({
          kind: 'permitted',
          fixtures,
          role: profile.role,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setAccessState({
          kind: 'error',
          message:
            error instanceof ApiResponseError && error.kind === 'unauthenticated'
              ? 'Your session is no longer valid. Sign in again to continue.'
              : 'Your application role and fixture scope could not be loaded. Please try again.',
        });
      });

    return () => controller.abort();
  }, [client, isAuthenticated, isLoading]);

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <section className="submission-page content-boundary" aria-labelledby="submission-page-title">
      <header className="page-heading submission-page__heading">
        <p className="eyebrow">Submitter workspace</p>
        <h1 id="submission-page-title">Submit Delivery Events</h1>
        <p>
          Select an authorised fixture and send ordered delivery events for backend validation and
          storage.
        </p>
        <div className="page-heading__actions">
          <Link to="/submissions/batches/new">Upload a season or back catalogue</Link>
          <Link to="/submissions/batches">View submission history</Link>
        </div>
      </header>

      {isLoading || accessState.kind === 'loading' ? (
        <div className="state-message" role="status">
          <h2>Checking submission access</h2>
          <p>Loading your persisted role and competition scope…</p>
        </div>
      ) : accessState.kind === 'error' ? (
        <AccessError message={accessState.message} />
      ) : accessState.kind === 'forbidden' ? (
        <ForbiddenState role={accessState.role} approvalState={accessState.approvalState} />
      ) : (
        <SubmissionForm fixtures={accessState.fixtures} role={accessState.role} />
      )}
    </section>
  );
}
