import type {
  ApiErrorDetail,
  BatchReceiptResponse,
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
import { BatchUploadInputError, MAX_BATCH_BYTES, uploadBatch } from './batch-api';
import { BatchUploadWorkflow, type PackageUploadScope } from './BatchUploadPage';
import { CorrectionWorkspace } from './CorrectionWorkspace';
import {
  listAllFixtures,
  listScopedFixtures,
  SubmissionInputError,
  submitEvents,
} from './submission-api';
import { SingleFixturePackageError, validateSingleFixturePackage } from './single-fixture-package';

const EMPTY_EVENTS = '[]';

type AccessState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'forbidden';
      role: CurrentUserProfile['role'];
      approvalState: CurrentUserProfile['approvalState'];
    }
  | {
      kind: 'permitted';
      fixtures: Fixture[];
      profile: CurrentUserProfile & { role: 'submitter' | 'admin' };
    };

type SubmissionWorkflow = 'fixture' | PackageUploadScope | 'technical';

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
  | { kind: 'acceptedBatch'; receipt: BatchReceiptResponse['data']; fixture: Fixture }
  | { kind: 'rejected'; message: string; details: ApiErrorDetail[] }
  | { kind: 'error'; message: string };

function usePageTitle() {
  useEffect(() => {
    document.title = "Submit Events | Stat'sTheGame";
  }, []);
}

function formatFixtureOption(fixture: Fixture): string {
  const teams =
    fixture.competitors.map((competitor) => competitor.name).join(' v ') || 'Teams unavailable';
  const competition = fixture.competitionName ?? 'Competition unavailable';
  return `${fixture.startDate} — ${teams} — ${competition}, ${fixture.seasonLabel} (${fixture.matchType})`;
}

function newDecisionKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')));
    reader.addEventListener('error', () =>
      reject(new Error('The selected file could not be read.')),
    );
    reader.readAsText(file);
  });
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

function SubmissionWorkflowSelector({
  value,
  onChange,
}: {
  value: SubmissionWorkflow;
  onChange: (workflow: SubmissionWorkflow) => void;
}) {
  const options: Array<{ value: SubmissionWorkflow; label: string; description: string }> = [
    {
      value: 'fixture',
      label: 'Single fixture',
      description: 'Upload one fixture using readable team, competition, season and player names.',
    },
    {
      value: 'season',
      label: 'Season',
      description: 'Upload one season containing one or more fixtures.',
    },
    {
      value: 'catalogue',
      label: 'Back catalogue',
      description: 'Upload historical fixtures spanning one or more seasons.',
    },
    {
      value: 'technical',
      label: 'Advanced technical JSON',
      description: 'Paste canonical delivery JSON when application references are already known.',
    },
  ];

  return (
    <fieldset className="submission-mode submission-workflow-selector">
      <legend>What are you submitting?</legend>
      <p className="field-help">
        Choose a scope to see only the controls and guidance needed for that submission.
      </p>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name="submission-workflow"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>
            <strong>{option.label}</strong>
            <span className="field-help">{option.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function SubmissionForm({
  fixtures,
  role,
  mode,
}: {
  fixtures: Fixture[];
  role: 'submitter' | 'admin';
  mode: 'file' | 'json';
}) {
  const client = useAuthenticatedApiClient();

  const [fixtureId, setFixtureId] = useState(fixtures[0]?.fixtureId ?? '');
  const [eventJson, setEventJson] = useState(EMPTY_EVENTS);
  const [file, setFile] = useState<File | null>(null);
  const [decisionKey, setDecisionKey] = useState(newDecisionKey);
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });

  const resultRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      result.kind === 'accepted' ||
      result.kind === 'acceptedBatch' ||
      result.kind === 'rejected' ||
      result.kind === 'error'
    ) {
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
        if (!/\.(json|csv)$/i.test(file.name)) {
          throw new SubmissionInputError('Choose a JSON or CSV fixture package.');
        }
        if (file.size > MAX_BATCH_BYTES) {
          throw new BatchUploadInputError('The package is larger than the 50 MB upload limit.');
        }
        const fixture = fixtures.find((candidate) => candidate.fixtureId === fixtureId);
        if (!fixture?.competitionId) {
          throw new SubmissionInputError('Select an available fixture before uploading.');
        }
        validateSingleFixturePackage(file.name, await readFileText(file), fixture);
        const response = await uploadBatch(client, fixture.competitionId, file, decisionKey);

        setResult({
          kind: 'acceptedBatch',
          receipt: response.data,
          fixture,
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
      if (error instanceof SubmissionInputError || error instanceof SingleFixturePackageError) {
        setResult({
          kind: 'rejected',
          message: error.message,
          details: [],
        });
      } else if (error instanceof BatchUploadInputError) {
        setResult({
          kind: 'rejected',
          message:
            error.message === 'Choose a JSON, CSV, or NDJSON package.'
              ? 'Choose a JSON or CSV fixture package.'
              : error.message,
          details: [],
        });
      } else if (error instanceof ApiResponseError && error.details) {
        setResult({
          kind: 'rejected',
          message: error.message,
          details: error.details,
        });
      } else if (mode === 'file' && error instanceof ApiResponseError && error.status === 409) {
        setResult({
          kind: 'error',
          message: `${error.message} Retry the unchanged file to reuse its receipt, or select a corrected file to start a replacement upload.`,
        });
      } else if (mode === 'file' && error instanceof ApiResponseError && error.status === 413) {
        setResult({
          kind: 'error',
          message: 'The fixture package exceeds the 50 MB upload limit.',
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
              ? mode === 'file' && error.status === 503
                ? 'Fixture-package storage is temporarily unavailable. Retry the same file safely.'
                : error.message
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

        <div className="submission-field">
          <label htmlFor="submission-fixture">Fixture</label>

          <select
            id="submission-fixture"
            aria-describedby="submission-fixture-help"
            value={fixtureId}
            onChange={(event) => {
              setFixtureId(event.target.value);
              setDecisionKey(newDecisionKey());
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

          <p id="submission-fixture-help" className="field-help">
            Choose by date, teams, competition and season. The application uses the underlying
            reference; you never need to enter a database ID.
          </p>
        </div>

        {mode === 'file' ? (
          <>
            <section className="batch-guidance" aria-labelledby="single-upload-guidance-title">
              <h2 id="single-upload-guidance-title">Before you upload</h2>
              <p>
                Upload one JSON or CSV spreadsheet package up to 50 MB. Include one fixture and no
                more than 50,000 delivery events.
              </p>
              <p>Every package must include:</p>
              <ul>
                <li>a contract version and stable package reference;</li>
                <li>competition and season names;</li>
                <li>fixture date and both team names;</li>
                <li>innings number and batting-team name; and</li>
                <li>stable event references, player names, delivery order and runs.</li>
              </ul>
              <p>
                Names are resolved within the selected competition and the season named in the
                package. Ambiguous or missing matches appear later in the batch report with labeled
                correction controls.
              </p>
              <p>
                Before upload, the fixture date and team names are checked against your selection.
                Choose Season or Back catalogue for a package containing multiple fixtures.
              </p>
              <div className="batch-guidance__actions">
                <a
                  className="button button--secondary"
                  href="/season-upload-template.json"
                  download
                >
                  Download JSON template
                </a>
                <a className="button button--secondary" href="/season-upload-template.csv" download>
                  Download spreadsheet template
                </a>
              </div>
            </section>

            <div className="submission-field">
              <label htmlFor="submission-file">Fixture package</label>

              <p id="submission-file-help" className="field-help">
                Choose a completed <code>.json</code> or <code>.csv</code> template. Processing
                continues after you leave, and retrying the unchanged file safely reuses the same
                request.
              </p>

              <input
                id="submission-file"
                type="file"
                accept=".json,application/json,.csv,text/csv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setDecisionKey(newDecisionKey());
                  resetResult();
                }}
                aria-describedby={
                  ['submission-file-help', resultDescriptionId].filter(Boolean).join(' ') ||
                  undefined
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
          </>
        ) : (
          <>
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
              ? 'Upload fixture package'
              : 'Submit events'}
        </button>

        {result.kind === 'submitting' ? (
          <p className="submission-progress" role="status">
            {mode === 'file'
              ? 'Uploading the fixture package and creating its durable receipt…'
              : 'Validating and storing the submission…'}
          </p>
        ) : null}

        <div id={resultDescriptionId} ref={resultRegionRef}>
          {result.kind === 'acceptedBatch' ? (
            <div className="submission-result submission-result--success" role="status">
              <h2 tabIndex={-1} data-result-heading>
                Fixture package received safely
              </h2>

              <p>
                Processing continues after you leave this page. Use the durable receipt to follow
                validation and resolve any readable-name ambiguity.
              </p>

              <dl className="submission-reference">
                <div>
                  <dt>Receipt</dt>
                  <dd>{result.receipt.batchReference}</dd>
                </div>

                <div>
                  <dt>Fixture</dt>
                  <dd>{formatFixtureOption(result.fixture)}</dd>
                </div>

                <div>
                  <dt>Received</dt>
                  <dd>{new Date(result.receipt.receivedAt).toLocaleString()}</dd>
                </div>
              </dl>

              <Link
                className="button button--primary"
                to={`/submissions/batches/${result.receipt.batchReference}`}
              >
                Track validation and errors
              </Link>
            </div>
          ) : result.kind === 'accepted' ? (
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
  const [workflow, setWorkflow] = useState<SubmissionWorkflow>('fixture');

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
          profile: { ...profile, role: profile.role },
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
          Upload a single fixture, a season or a back catalogue from one guided workflow. Use
          readable names and let the platform resolve application references.
        </p>
        <div className="page-heading__actions">
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
        <>
          <SubmissionWorkflowSelector value={workflow} onChange={setWorkflow} />
          {workflow === 'season' || workflow === 'catalogue' ? (
            <BatchUploadWorkflow key={workflow} profile={accessState.profile} scope={workflow} />
          ) : (
            <SubmissionForm
              key={workflow}
              fixtures={accessState.fixtures}
              role={accessState.profile.role}
              mode={workflow === 'fixture' ? 'file' : 'json'}
            />
          )}
        </>
      )}
    </section>
  );
}
