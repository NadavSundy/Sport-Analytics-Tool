import type { ApiErrorDetail, Fixture, SubmissionResponse } from '@sport-analytics/contracts';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  getCurrentUserProfile,
  listScopedFixtures,
  SubmissionInputError,
  submitEvents,
  type CurrentUserProfile,
} from './submission-api';

const EMPTY_EVENTS = '[]';

type AccessState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'unapproved'; approvalState: CurrentUserProfile['approvalState'] }
  | { kind: 'approved'; fixtures: Fixture[] };

type ResultState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'accepted'; response: SubmissionResponse }
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

function formatValidationLocation(detail: ApiErrorDetail): string {
  const eventLabel =
    detail.eventIndex === undefined ? 'Submission' : `Event ${detail.eventIndex + 1}`;
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

function UnapprovedState({
  approvalState,
}: {
  approvalState: CurrentUserProfile['approvalState'];
}) {
  const detail =
    approvalState === 'pending'
      ? 'Your submitter request is pending approval.'
      : 'Your account is not approved to submit event data.';

  return (
    <div className="state-message" role="status">
      <h2>Submitter approval required</h2>
      <p>{detail} The backend will continue to protect every submission and fixture scope.</p>
      <Link className="button button--secondary" to="/account">
        Return to account
      </Link>
    </div>
  );
}

function ValidationResults({ message, details }: { message: string; details: ApiErrorDetail[] }) {
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
              <strong>{formatValidationLocation(detail)}</strong>
              <span>{detail.message}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function SubmissionForm({ fixtures }: { fixtures: Fixture[] }) {
  const client = useAuthenticatedApiClient();
  const [fixtureId, setFixtureId] = useState(fixtures[0]?.fixtureId ?? '');
  const [eventJson, setEventJson] = useState(EMPTY_EVENTS);
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
    setResult({ kind: 'submitting' });

    try {
      const response = await submitEvents(client, fixtureId, eventJson);
      setResult({ kind: 'accepted', response });
    } catch (error) {
      if (error instanceof SubmissionInputError) {
        setResult({ kind: 'rejected', message: error.message, details: [] });
      } else if (error instanceof ApiResponseError && error.details) {
        setResult({ kind: 'rejected', message: error.message, details: error.details });
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
        <p>Your account is approved, but it currently has no available fixtures in its scope.</p>
      </div>
    );
  }

  const resultDescriptionId =
    result.kind === 'rejected' ? 'submission-validation-results' : undefined;

  return (
    <form className="submission-form" onSubmit={handleSubmit}>
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
          Only fixtures in your server-returned competition scope appear.
        </p>
      </div>

      <div className="submission-field">
        <label htmlFor="submission-events">Delivery events JSON</label>
        <p id="submission-events-help" className="field-help">
          Paste the <code>events</code> array for Basic schema 1.0. Fixture and schema version are
          added automatically. Final statistic totals are derived by the platform and are not
          accepted here.
        </p>
        <textarea
          id="submission-events"
          value={eventJson}
          onChange={(event) => {
            setEventJson(event.target.value);
            resetResult();
          }}
          aria-describedby={
            ['submission-events-help', resultDescriptionId].filter(Boolean).join(' ') || undefined
          }
          aria-invalid={result.kind === 'rejected'}
          disabled={result.kind === 'submitting'}
          spellCheck={false}
          rows={18}
        />
      </div>

      <button
        className="button button--primary"
        type="submit"
        disabled={result.kind === 'submitting'}
      >
        {result.kind === 'submitting' ? 'Submitting events…' : 'Submit events'}
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
          <ValidationResults message={result.message} details={result.details} />
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
  );
}

export function SubmissionPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const client = useAuthenticatedApiClient();
  const [accessState, setAccessState] = useState<AccessState>({ kind: 'loading' });

  usePageTitle();

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();
    setAccessState({ kind: 'loading' });

    void getCurrentUserProfile(client, controller.signal)
      .then(async (profile) => {
        if (profile.approvalState !== 'approved') {
          setAccessState({ kind: 'unapproved', approvalState: profile.approvalState });
          return;
        }

        const fixtures = await listScopedFixtures(profile.competitionIds, controller.signal);
        setAccessState({ kind: 'approved', fixtures });
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
              : 'Your submitter approval and fixture scope could not be loaded. Please try again.',
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
        <p className="eyebrow">Approved submitter workspace</p>
        <h1 id="submission-page-title">Submit Delivery Events</h1>
        <p>
          Select an authorised fixture and send ordered delivery events for backend validation and
          storage.
        </p>
      </header>

      {isLoading || accessState.kind === 'loading' ? (
        <div className="state-message" role="status">
          <h2>Checking submission access</h2>
          <p>Loading your persisted approval state and competition scope…</p>
        </div>
      ) : accessState.kind === 'error' ? (
        <AccessError message={accessState.message} />
      ) : accessState.kind === 'unapproved' ? (
        <UnapprovedState approvalState={accessState.approvalState} />
      ) : (
        <SubmissionForm fixtures={accessState.fixtures} />
      )}
    </section>
  );
}
