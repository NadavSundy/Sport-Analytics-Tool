import {
  batchReferenceSchema,
  FIXTURE_PROPOSAL_CONTRACT_VERSION,
  type ApiErrorDetail,
  type BatchReceiptResponse,
  type Competition,
  type CurrentUserProfile,
  type Fixture,
  type SubmissionEvent,
  type SubmissionResponse,
} from '@sport-analytics/contracts';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import { BatchUploadInputError, MAX_BATCH_BYTES, uploadBatch } from './batch-api';
import {
  BatchUploadWorkflow,
  competitionOptions,
  type PackageUploadScope,
} from './BatchUploadPage';
import { invalidateBatchCollections } from './batch-collection-state';
import { CorrectionWorkspace } from './CorrectionWorkspace';
import {
  listAllFixtures,
  listScopedFixtures,
  SubmissionInputError,
  createFixtureProposalBatchFile,
  createTechnicalBatchFile,
  submitLegacyAdminEvents,
} from './submission-api';
import {
  SingleFixturePackageError,
  readSingleFixturePackageContext,
  validateSingleFixturePackage,
  validateSingleFixturePackageContext,
} from './single-fixture-package';
import {
  formatApiValidationLocation,
  formatApiValidationMessage,
} from './submission-validation-copy';

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

const NEW_FIXTURE_VALUE = 'new';
const NEW_FIXTURE_MATCH_TYPES = ['T20'] as const;
const NEW_FIXTURE_TEAM_TYPES = ['club', 'international'] as const;
const NEW_FIXTURE_GENDERS = ['female', 'male'] as const;

type CompetitionState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; competitions: Competition[] }
  | { kind: 'error' };

type NewFixtureDraft = {
  competitionId: string;
  submittedCompetitionName: string;
  seasonName: string;
  startDate: string;
  endDate: string;
  homeTeamName: string;
  awayTeamName: string;
  matchType: string;
  teamType: string;
  gender: string;
  ballsPerOver: string;
  outcome: 'won' | 'tie' | 'draw' | 'no result';
  sourceVersion: string;
  sourceRevision: string;
};

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
  | {
      kind: 'acceptedBatch';
      receipt: BatchReceiptResponse['data'];
      fixtureLabel: string;
      fixtureProposal?: boolean;
    }
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

function normaliseFixtureValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function findMatchingFixtureProposal(
  fixtures: Fixture[],
  proposal: NewFixtureDraft,
): Fixture | undefined {
  const proposedTeams = [proposal.homeTeamName, proposal.awayTeamName]
    .map(normaliseFixtureValue)
    .sort()
    .join('|');

  if (
    !proposal.competitionId ||
    !proposal.seasonName.trim() ||
    !proposal.startDate ||
    proposedTeams === '|'
  ) {
    return undefined;
  }

  return fixtures.find(
    (fixture) =>
      fixture.competitionId === proposal.competitionId &&
      normaliseFixtureValue(fixture.season) === normaliseFixtureValue(proposal.seasonName) &&
      fixture.startDate === proposal.startDate &&
      fixture.competitors
        .map((competitor) => normaliseFixtureValue(competitor.name))
        .sort()
        .join('|') === proposedTeams,
  );
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
              <strong>{formatApiValidationLocation(detail, uploadedFile)}</strong>
              <span>{formatApiValidationMessage(detail)}</span>
              <details className="validation-technical-details">
                <summary>Technical details</summary>
                <p>
                  <code>{detail.code}</code>
                  {detail.field ? (
                    <>
                      {' · '}
                      <code>{detail.field}</code>
                    </>
                  ) : null}
                </p>
                {formatApiValidationMessage(detail) !== detail.message ? (
                  <p>{detail.message}</p>
                ) : null}
              </details>
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
  type Option = { value: SubmissionWorkflow; label: string; description: string };

  const guidedOptions: Option[] = [
    {
      value: 'fixture',
      label: 'Single fixture',
      description:
        'One match only. Choose this when your file contains events for a single fixture.',
    },
    {
      value: 'season',
      label: 'Season',
      description:
        'Several fixtures from one competition season. The season is named inside your upload file.',
    },
    {
      value: 'catalogue',
      label: 'Back catalogue',
      description: 'Historical fixtures covering multiple seasons.',
    },
  ];

  // The advanced mode keeps canonical identifiers (#360); it is set apart so a
  // submitter cannot mistake it for a guided upload (#500).
  const advancedOption: Option = {
    value: 'technical',
    label: 'Advanced technical JSON',
    description:
      'For technical integrations. Every event needs application identifiers for its innings and players; choose a guided upload if you do not have them.',
  };

  function renderOption(option: Option) {
    return (
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
    );
  }

  return (
    <fieldset className="submission-mode submission-workflow-selector">
      <legend>What are you submitting?</legend>
      <p className="field-help">
        Choose how much match data your file contains. After upload, the platform checks the file in
        the background before it can be published.
      </p>
      <div
        className="submission-workflow-group"
        role="group"
        aria-labelledby="submission-workflow-guided-title"
      >
        <p id="submission-workflow-guided-title" className="submission-workflow-group__title">
          Guided upload: readable names, no database IDs
        </p>
        {guidedOptions.map(renderOption)}
      </div>
      <div
        className="submission-workflow-group submission-workflow-group--advanced"
        role="group"
        aria-labelledby="submission-workflow-advanced-title"
      >
        <p id="submission-workflow-advanced-title" className="submission-workflow-group__title">
          Advanced: application identifiers required
        </p>
        {renderOption(advancedOption)}
      </div>
    </fieldset>
  );
}

function SubmissionForm({
  fixtures,
  profile,
  role,
  mode,
}: {
  fixtures: Fixture[];
  profile: CurrentUserProfile;
  role: 'submitter' | 'admin';
  mode: 'file' | 'json';
}) {
  const client = useAuthenticatedApiClient();

  const [fixtureId, setFixtureId] = useState(
    fixtures[0]?.fixtureId ?? (mode === 'file' ? NEW_FIXTURE_VALUE : ''),
  );
  const [competitionState, setCompetitionState] = useState<CompetitionState>({ kind: 'idle' });
  const [newFixture, setNewFixture] = useState<NewFixtureDraft>({
    competitionId: '',
    submittedCompetitionName: '',
    seasonName: '',
    startDate: '',
    endDate: '',
    homeTeamName: '',
    awayTeamName: '',
    matchType: 'T20',
    teamType: '',
    gender: '',
    ballsPerOver: '6',
    outcome: 'no result',
    sourceVersion: '1',
    sourceRevision: '0',
  });
  const [eventJson, setEventJson] = useState(EMPTY_EVENTS);
  const [file, setFile] = useState<File | null>(null);
  const [decisionKey, setDecisionKey] = useState(newDecisionKey);
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });

  const resultRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== 'file' || fixtureId !== NEW_FIXTURE_VALUE) return;
    const controller = new AbortController();
    setCompetitionState({ kind: 'loading' });
    void competitionOptions(profile, controller.signal)
      .then((competitions) => {
        setCompetitionState({ kind: 'ready', competitions });
        setNewFixture((draft) => {
          const submittedCompetition = competitions.find(
            (competition) =>
              competition.name.trim().toLocaleLowerCase() ===
              draft.submittedCompetitionName.trim().toLocaleLowerCase(),
          );
          return {
            ...draft,
            competitionId:
              submittedCompetition?.competitionId ??
              (competitions.some((competition) => competition.competitionId === draft.competitionId)
                ? draft.competitionId
                : (competitions[0]?.competitionId ?? '')),
          };
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setCompetitionState({ kind: 'error' });
      });
    return () => controller.abort();
  }, [fixtureId, mode, profile]);

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

  function beginNewFixtureProposal() {
    setFixtureId(NEW_FIXTURE_VALUE);
    setFile(null);
    setDecisionKey(newDecisionKey());
    resetResult();
  }

  function chooseExistingFixture() {
    if (!fixtures[0]) return;
    setFixtureId(fixtures[0].fixtureId);
    setFile(null);
    setDecisionKey(newDecisionKey());
    resetResult();
  }

  async function selectFile(selectedFile: File | null) {
    setFile(selectedFile);
    setDecisionKey(newDecisionKey());
    resetResult();
    if (!selectedFile || fixtureId !== NEW_FIXTURE_VALUE) return;

    try {
      const context = readSingleFixturePackageContext(
        selectedFile.name,
        await readFileText(selectedFile),
      );
      const matchingCompetition =
        competitionState.kind === 'ready'
          ? competitionState.competitions.find(
              (competition) =>
                competition.name.trim().toLocaleLowerCase() ===
                context.competitionName.trim().toLocaleLowerCase(),
            )
          : undefined;
      setNewFixture((draft) => ({
        ...draft,
        competitionId: matchingCompetition?.competitionId ?? draft.competitionId,
        submittedCompetitionName: context.competitionName,
        seasonName: context.seasonName,
        startDate: context.date,
        endDate: !draft.endDate || draft.endDate === draft.startDate ? context.date : draft.endDate,
        homeTeamName: context.teams[0] ?? '',
        awayTeamName: context.teams[1] ?? '',
      }));
    } catch (error) {
      setResult({
        kind: 'rejected',
        message:
          error instanceof SingleFixturePackageError
            ? error.message
            : 'The selected fixture package could not be read.',
        details: [],
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      result.kind === 'submitting' ||
      result.kind === 'accepted' ||
      result.kind === 'acceptedBatch'
    ) {
      return;
    }

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
        if (fixtureId === NEW_FIXTURE_VALUE) {
          const competition =
            competitionState.kind === 'ready'
              ? competitionState.competitions.find(
                  (candidate) => candidate.competitionId === newFixture.competitionId,
                )
              : undefined;
          if (!competition) {
            throw new SubmissionInputError('Choose an authorised competition for the new fixture.');
          }
          const contents = await readFileText(file);
          validateSingleFixturePackageContext(file.name, contents, {
            date: newFixture.startDate,
            teams: [newFixture.homeTeamName, newFixture.awayTeamName],
          });
          const proposalFile = createFixtureProposalBatchFile(file.name, contents, {
            competitionName: competition.name,
            seasonName: newFixture.seasonName,
            startDate: newFixture.startDate,
            homeTeamName: newFixture.homeTeamName,
            awayTeamName: newFixture.awayTeamName,
            proposal: {
              endDate: newFixture.endDate,
              matchType: newFixture.matchType,
              teamType: newFixture.teamType,
              gender: newFixture.gender,
              ballsPerOver: Number(newFixture.ballsPerOver),
              outcome: newFixture.outcome,
              sourceVersion: newFixture.sourceVersion,
              sourceRevision: Number(newFixture.sourceRevision),
            },
          });
          const response = await uploadBatch(
            client,
            competition.competitionId,
            proposalFile,
            decisionKey,
            undefined,
            FIXTURE_PROPOSAL_CONTRACT_VERSION,
          );

          invalidateBatchCollections();
          setResult({
            kind: 'acceptedBatch',
            receipt: response.data,
            fixtureLabel: `${newFixture.startDate} — ${newFixture.homeTeamName} v ${newFixture.awayTeamName} — ${competition.name}, ${newFixture.seasonName} (${newFixture.matchType})`,
            fixtureProposal: true,
          });
          return;
        }

        const fixture = fixtures.find((candidate) => candidate.fixtureId === fixtureId);
        if (!fixture?.competitionId) {
          throw new SubmissionInputError('Select an available fixture before uploading.');
        }
        validateSingleFixturePackage(file.name, await readFileText(file), fixture);
        const response = await uploadBatch(client, fixture.competitionId, file, decisionKey);

        invalidateBatchCollections();
        setResult({
          kind: 'acceptedBatch',
          receipt: response.data,
          fixtureLabel: formatFixtureOption(fixture),
        });
      } else {
        const fixture = fixtures.find((candidate) => candidate.fixtureId === fixtureId);
        if (!fixture?.competitionId) {
          throw new SubmissionInputError('Select an available fixture before submitting.');
        }

        if (role === 'admin') {
          const accepted = await submitLegacyAdminEvents(client, fixtureId, eventJson);
          setResult({
            kind: 'accepted',
            response: accepted.response,
            correctionContext: { events: accepted.events, fixture },
          });
        } else {
          const technicalFile = createTechnicalBatchFile(fixture, eventJson, decisionKey);
          const response = await uploadBatch(
            client,
            fixture.competitionId,
            technicalFile,
            decisionKey,
          );

          invalidateBatchCollections();
          setResult({
            kind: 'acceptedBatch',
            receipt: response.data,
            fixtureLabel: formatFixtureOption(fixture),
          });
        }
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

  if (fixtures.length === 0 && mode === 'json') {
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
  const completed = result.kind === 'accepted' || result.kind === 'acceptedBatch';
  const matchingFixtureProposal =
    mode === 'file' && fixtureId === NEW_FIXTURE_VALUE
      ? findMatchingFixtureProposal(fixtures, newFixture)
      : undefined;
  const fixturePackageInput = (
    <div className="submission-field">
      <label htmlFor="submission-file">Fixture package</label>
      <p id="submission-file-help" className="field-help">
        {fixtureId === NEW_FIXTURE_VALUE ? (
          <>
            Choose your completed <code>.json</code> or <code>.csv</code> template first. Its
            competition, season, date and teams will fill the new-fixture fields below.
          </>
        ) : (
          <>
            Choose a completed <code>.json</code> or <code>.csv</code> template.
          </>
        )}{' '}
        Processing continues after you leave, and retrying the unchanged file safely reuses the same
        request.
      </p>
      <input
        id="submission-file"
        type="file"
        accept=".json,application/json,.csv,text/csv"
        onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
        aria-describedby={
          ['submission-file-help', resultDescriptionId].filter(Boolean).join(' ') || undefined
        }
        aria-invalid={result.kind === 'rejected'}
        disabled={result.kind === 'submitting' || completed}
      />
      {file ? (
        <p className="field-help">
          Selected: {file.name} ({Math.ceil(file.size / 1024)} KB)
        </p>
      ) : null}
    </div>
  );

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

        {mode === 'file' && fixtureId === NEW_FIXTURE_VALUE ? (
          <section className="submission-scope" aria-labelledby="new-fixture-proposal-title">
            <h2 id="new-fixture-proposal-title">New fixture proposal</h2>
            <p>
              You are proposing a fixture for administrator review. The existing-fixture list is
              hidden while you complete this proposal.
            </p>
            <button
              className="button button--secondary"
              type="button"
              onClick={chooseExistingFixture}
              disabled={result.kind === 'submitting' || completed || fixtures.length === 0}
            >
              Choose an existing fixture
            </button>
          </section>
        ) : (
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
              disabled={result.kind === 'submitting' || completed}
            >
              {fixtures.map((fixture) => (
                <option key={fixture.fixtureId} value={fixture.fixtureId}>
                  {formatFixtureOption(fixture)}
                </option>
              ))}
            </select>

            <p id="submission-fixture-help" className="field-help">
              Choose an existing match by date and teams. You never need to enter a database ID.
            </p>
            {mode === 'file' ? (
              <button
                className="button button--secondary"
                type="button"
                onClick={beginNewFixtureProposal}
                disabled={result.kind === 'submitting' || completed}
              >
                Propose a new fixture
              </button>
            ) : null}
          </div>
        )}

        {mode === 'file' && fixtureId === NEW_FIXTURE_VALUE ? fixturePackageInput : null}

        {mode === 'file' && fixtureId === NEW_FIXTURE_VALUE ? (
          <fieldset className="submission-scope">
            <legend>New fixture metadata</legend>
            <p className="field-help">
              These details create a version 1.1 fixture proposal. The fixture remains unresolved
              until an administrator creates the canonical fixture from the proposal.
            </p>

            {matchingFixtureProposal ? (
              <div className="field-error" role="alert">
                <p>
                  This proposal matches the existing fixture{' '}
                  <strong>{formatFixtureOption(matchingFixtureProposal)}</strong>. Use that fixture
                  instead so the batch does not create a duplicate proposal.
                </p>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => {
                    setFixtureId(matchingFixtureProposal.fixtureId);
                    setFile(null);
                    setDecisionKey(newDecisionKey());
                    resetResult();
                  }}
                  disabled={result.kind === 'submitting' || completed}
                >
                  Use existing fixture
                </button>
              </div>
            ) : null}

            {competitionState.kind === 'loading' || competitionState.kind === 'idle' ? (
              <p role="status">Loading authorised competitions…</p>
            ) : competitionState.kind === 'error' ? (
              <p className="field-error" role="alert">
                Authorised competitions could not be loaded. Choose Existing fixture and try again,
                or reload this page.
              </p>
            ) : competitionState.competitions.length === 0 ? (
              <p role="status">No authorised competitions are available for a fixture proposal.</p>
            ) : (
              <div className="submission-field">
                <label htmlFor="new-fixture-competition">Competition</label>
                <select
                  id="new-fixture-competition"
                  value={newFixture.competitionId}
                  required
                  disabled={result.kind === 'submitting' || completed}
                  onChange={(event) => {
                    setNewFixture((draft) => ({ ...draft, competitionId: event.target.value }));
                    setDecisionKey(newDecisionKey());
                    resetResult();
                  }}
                >
                  {competitionState.competitions.map((competition) => (
                    <option key={competition.competitionId} value={competition.competitionId}>
                      {competition.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="submission-field">
              <label htmlFor="new-fixture-season">Season name</label>
              <input
                id="new-fixture-season"
                value={newFixture.seasonName}
                required
                maxLength={200}
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  setNewFixture((draft) => ({ ...draft, seasonName: event.target.value }));
                  resetResult();
                }}
              />
            </div>

            <div className="submission-field">
              <label htmlFor="new-fixture-start-date">Fixture date</label>
              <input
                id="new-fixture-start-date"
                type="date"
                value={newFixture.startDate}
                required
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  const startDate = event.target.value;
                  setNewFixture((draft) => ({
                    ...draft,
                    startDate,
                    endDate: draft.endDate || startDate,
                  }));
                  resetResult();
                }}
              />
            </div>

            <div className="submission-field">
              <label htmlFor="new-fixture-end-date">End date</label>
              <input
                id="new-fixture-end-date"
                type="date"
                value={newFixture.endDate}
                min={newFixture.startDate || undefined}
                required
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  setNewFixture((draft) => ({ ...draft, endDate: event.target.value }));
                  resetResult();
                }}
              />
            </div>

            {(
              [
                ['new-fixture-home-team', 'Home team name', 'homeTeamName'],
                ['new-fixture-away-team', 'Away team name', 'awayTeamName'],
                ['new-fixture-source-version', 'Source version', 'sourceVersion'],
              ] as const
            ).map(([id, label, field]) => (
              <div className="submission-field" key={id}>
                <label htmlFor={id}>{label}</label>
                <input
                  id={id}
                  value={newFixture[field]}
                  required
                  maxLength={200}
                  disabled={result.kind === 'submitting' || completed}
                  onChange={(event) => {
                    setNewFixture((draft) => ({ ...draft, [field]: event.target.value }));
                    resetResult();
                  }}
                />
              </div>
            ))}

            <div className="submission-field">
              <label htmlFor="new-fixture-match-type">Match type</label>
              <select
                id="new-fixture-match-type"
                value={newFixture.matchType}
                required
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  setNewFixture((draft) => ({ ...draft, matchType: event.target.value }));
                  resetResult();
                }}
              >
                {NEW_FIXTURE_MATCH_TYPES.map((matchType) => (
                  <option key={matchType} value={matchType}>
                    {matchType}
                  </option>
                ))}
              </select>
              <p className="field-hint">This platform currently supports T20 fixtures only.</p>
            </div>

            <div className="submission-field">
              <label htmlFor="new-fixture-team-type">Team type</label>
              <select
                id="new-fixture-team-type"
                value={newFixture.teamType}
                required
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  setNewFixture((draft) => ({ ...draft, teamType: event.target.value }));
                  resetResult();
                }}
              >
                <option value="">Select team type</option>
                {NEW_FIXTURE_TEAM_TYPES.map((teamType) => (
                  <option key={teamType} value={teamType}>
                    {teamType === 'club' ? 'Club / domestic' : 'International'}
                  </option>
                ))}
              </select>
            </div>

            <div className="submission-field">
              <label htmlFor="new-fixture-gender">Gender</label>
              <select
                id="new-fixture-gender"
                value={newFixture.gender}
                required
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  setNewFixture((draft) => ({ ...draft, gender: event.target.value }));
                  resetResult();
                }}
              >
                <option value="">Select gender</option>
                {NEW_FIXTURE_GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender === 'female' ? 'Women' : 'Men'}
                  </option>
                ))}
              </select>
            </div>

            <div className="submission-field">
              <label htmlFor="new-fixture-balls-per-over">Balls per over</label>
              <input
                id="new-fixture-balls-per-over"
                type="number"
                min="1"
                max="36"
                step="1"
                value={newFixture.ballsPerOver}
                required
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  setNewFixture((draft) => ({ ...draft, ballsPerOver: event.target.value }));
                  resetResult();
                }}
              />
            </div>

            <div className="submission-field">
              <label htmlFor="new-fixture-outcome">Outcome</label>
              <select
                id="new-fixture-outcome"
                value={newFixture.outcome}
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  setNewFixture((draft) => ({
                    ...draft,
                    outcome: event.target.value as NewFixtureDraft['outcome'],
                  }));
                  resetResult();
                }}
              >
                <option value="no result">No result</option>
                <option value="won">Won</option>
                <option value="tie">Tie</option>
                <option value="draw">Draw</option>
              </select>
            </div>

            <div className="submission-field">
              <label htmlFor="new-fixture-source-revision">Source revision</label>
              <input
                id="new-fixture-source-revision"
                type="number"
                min="0"
                step="1"
                value={newFixture.sourceRevision}
                required
                disabled={result.kind === 'submitting' || completed}
                onChange={(event) => {
                  setNewFixture((draft) => ({ ...draft, sourceRevision: event.target.value }));
                  resetResult();
                }}
              />
            </div>
          </fieldset>
        ) : null}

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
                <li>competition and season names;</li>
                <li>fixture date and both team names;</li>
                <li>innings number and batting-team name;</li>
                <li>player names, delivery order and runs; and</li>
                <li>a label for the package and a label for each delivery.</li>
              </ul>
              <p>
                You never need a database ID. The package and delivery labels are ones you make up
                and keep unchanged, such as <code>my-club:delivery:innings-0-ball-1</code>, so a
                retried upload is recognised rather than duplicated. Leave the provider reference
                columns (ending in <code>SourceId</code>) blank; the names are enough.
              </p>
              <p>
                Names are resolved within the selected competition and the season named in the
                package. Ambiguous or missing matches appear later in the batch report with labeled
                correction controls.
              </p>
              <p>
                Before upload, the fixture date and team names are checked against your selection.
                Choose Season when the file contains multiple fixtures from one season, or Back
                catalogue when it contains historical fixtures from multiple seasons.
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

            {fixtureId !== NEW_FIXTURE_VALUE ? fixturePackageInput : null}
          </>
        ) : (
          <>
            <div className="submission-field">
              <label htmlFor="submission-events">Delivery events JSON</label>

              <p id="submission-events-help" className="field-help">
                Paste the <code>events</code> array for Basic schema 1.0. This advanced mode uses
                application identifiers: each event needs <code>inningsId</code>,{' '}
                <code>strikerId</code>, <code>nonStrikerId</code> and <code>bowlerId</code>. To
                submit with readable team and player names instead, choose Single fixture. Fixture
                and schema version are added automatically. Final statistic totals are derived by
                the platform and are not accepted here.{' '}
                {role === 'admin'
                  ? 'Administrators use the privileged direct-import path; ordinary submitters are staged for review.'
                  : 'This technical input is staged and must pass review before publication.'}
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
                disabled={result.kind === 'submitting' || completed}
                spellCheck={false}
                rows={18}
              />
            </div>
          </>
        )}

        {!completed ? (
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
        ) : null}

        {result.kind === 'submitting' ? (
          <p className="submission-progress" role="status">
            {mode === 'file'
              ? 'Uploading the fixture package and creating its durable receipt…'
              : role === 'admin'
                ? 'Validating the privileged administrator import…'
                : 'Staging the technical submission for validation and review…'}
          </p>
        ) : null}

        <div id={resultDescriptionId} ref={resultRegionRef}>
          {result.kind === 'acceptedBatch' ? (
            <div className="submission-result submission-result--success" role="status">
              <h2 tabIndex={-1} data-result-heading>
                Fixture upload received
              </h2>

              <p>
                Your fixture file has been received. The platform is checking it in the background;
                it is not published yet. You may leave this page safely.
              </p>
              <p>
                {result.fixtureProposal
                  ? 'Next: open the submission report to follow reference resolution. An administrator can create the canonical fixture from your proposal; the submission is then revalidated before publication review.'
                  : 'Next: open the submission report to see processing progress and any validation problems. If corrections are needed, update the file and submit it again. After validation succeeds, an administrator can review it for publication.'}
              </p>

              <dl className="submission-reference">
                <div>
                  <dt>Submission receipt</dt>
                  <dd>{result.receipt.batchReference}</dd>
                </div>

                <div>
                  <dt>Status</dt>
                  <dd>Received — validation pending</dd>
                </div>

                <div>
                  <dt>Fixture</dt>
                  <dd>{result.fixtureLabel}</dd>
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
                View submission report
              </Link>
              <Link className="button button--secondary" to="/submissions/batches">
                View submission history
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
  const [searchParams] = useSearchParams();
  const requestedWorkflow = searchParams.get('workflow');
  const replacementReference = batchReferenceSchema.safeParse(searchParams.get('replaces'));
  const replacementCompetitionId = searchParams.get('competitionId');

  const [accessState, setAccessState] = useState<AccessState>({
    kind: 'loading',
  });
  const [workflow, setWorkflow] = useState<SubmissionWorkflow>(
    requestedWorkflow === 'season' || requestedWorkflow === 'catalogue'
      ? requestedWorkflow
      : 'fixture',
  );

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
          Choose whether your file contains one fixture, one season, or historical data from
          multiple seasons. Use readable names; after upload, the platform validates the file in the
          background before administrator review and publication.
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
            <BatchUploadWorkflow
              key={workflow}
              profile={accessState.profile}
              scope={workflow}
              {...(replacementReference.success && replacementCompetitionId
                ? {
                    replacement: {
                      batchReference: replacementReference.data,
                      competitionId: replacementCompetitionId,
                    },
                  }
                : {})}
            />
          ) : (
            <SubmissionForm
              key={workflow}
              fixtures={accessState.fixtures}
              profile={accessState.profile}
              role={accessState.profile.role}
              mode={workflow === 'fixture' ? 'file' : 'json'}
            />
          )}
        </>
      )}
    </section>
  );
}
