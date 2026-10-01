import type { BatchReportItem, BatchReportResponse, BatchStatus } from '@sport-analytics/contracts';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { signInPathFor } from '../auth/auth-return';
import { Breadcrumbs } from '../../components/NavigationPrimitives';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import { downloadBatchReport, getBatchReport, listBatches, mapBatchReference } from './batch-api';
import { useBatchCollectionsRevision } from './batch-collection-state';
import {
  formatBatchValidationMessage,
  formatValidationField,
  validationRuleLabel,
} from './submission-validation-copy';
import {
  describeFixtureReference,
  describeInningsReference,
  groupReferenceResolutions,
} from './unresolved-reference-summary';

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; batches: BatchStatus[]; nextCursor: string | null };

type ReportState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; report: BatchReportResponse['data'] };

type DownloadState =
  { kind: 'idle' } | { kind: 'downloading' } | { kind: 'error'; message: string };

const stateLabels: Record<BatchStatus['status'], string> = {
  received: 'Received',
  stored: 'Stored',
  validating: 'Validating',
  rejected: 'Rejected',
  awaiting_review: 'Awaiting review',
  correction_requested: 'Correction requested',
  publishing: 'Publishing',
  published: 'Published',
  partially_published: 'Partially published',
  failed: 'Failed',
  superseded: 'Superseded',
};

const stateDescriptions: Record<BatchStatus['status'], string> = {
  received: 'The package receipt is durable and storage is being confirmed.',
  stored: 'The package is stored safely and waiting for background validation.',
  validating: 'Fixtures and deliveries are being checked in the background.',
  rejected: 'Nothing was published. Open the item results to correct the reported problems.',
  awaiting_review: 'Automated checks passed and an administrator can review the staged records.',
  correction_requested: 'A reviewer requested changes. Upload a corrected replacement package.',
  publishing: 'Approved records are being published.',
  published: 'Every accepted record is published.',
  partially_published: 'Accepted records were published; rejected records remain in this report.',
  failed: 'Processing could not finish. The durable receipt and report remain available.',
  superseded: 'A corrected replacement now represents this source package.',
};

function correctedUploadPath(batch: BatchStatus): string {
  const parameters = new URLSearchParams({
    workflow: 'season',
    replaces: batch.batchReference,
    competitionId: batch.competitionId,
  });
  return `/submissions/new?${parameters.toString()}`;
}

function downloadUnavailableMessage(error: unknown, batchReference: string): string {
  const cause =
    error instanceof ApiResponseError
      ? error.message
      : 'Your connection or browser did not return a response from the report service.';
  return `${cause} Try the download again. If it is still unavailable, contact support and include batch reference ${batchReference}.`;
}

function outcomeLabel(outcome: BatchReportItem['outcome']) {
  return outcome === 'conflicting'
    ? 'Conflict'
    : outcome.charAt(0).toUpperCase() + outcome.slice(1);
}

function Summary({ batch }: { batch: BatchStatus }) {
  const partial = batch.counts.accepted > 0 && batch.counts.rejected > 0;
  return (
    <section className="batch-summary" aria-labelledby="batch-summary-title">
      <h2 id="batch-summary-title">Status summary</h2>
      <p className="batch-summary__state">
        <strong>{stateLabels[batch.status]}</strong>
        {partial ? ' — partial success' : ''}
      </p>
      <p>{stateDescriptions[batch.status]}</p>
      <dl className="batch-counts">
        <div>
          <dt>Total</dt>
          <dd>{batch.progress.total}</dd>
        </div>
        <div>
          <dt>Accepted</dt>
          <dd>{batch.counts.accepted}</dd>
        </div>
        <div>
          <dt>Rejected</dt>
          <dd>{batch.counts.rejected}</dd>
        </div>
        <div>
          <dt>Unresolved</dt>
          <dd>{batch.counts.unresolved}</dd>
        </div>
        <div>
          <dt>Duplicates</dt>
          <dd>{batch.counts.duplicate}</dd>
        </div>
        <div>
          <dt>Conflicts</dt>
          <dd>{batch.counts.conflicting}</dd>
        </div>
      </dl>
      <p>
        Processed {batch.progress.processed} of {batch.progress.total}. Last updated{' '}
        {new Date(batch.updatedAt).toLocaleString()}.
      </p>
      <dl className="batch-metadata">
        <div>
          <dt>Source file</dt>
          <dd>{batch.source.fileName ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Submitter</dt>
          <dd>
            {batch.source.submitter.displayName ?? `Account ${batch.source.submitter.accountId}`}
          </dd>
        </div>
        <div>
          <dt>Received</dt>
          <dd>{new Date(batch.receivedAt).toLocaleString()}</dd>
        </div>
      </dl>
      <details className="validation-technical-details">
        <summary>Technical details</summary>
        <dl className="batch-metadata">
          <div>
            <dt>Submission reference</dt>
            <dd>
              <code>{batch.batchReference}</code>
            </dd>
          </div>
          <div>
            <dt>Checksum</dt>
            <dd>
              <code>{batch.source.checksum ?? 'Pending'}</code>
            </dd>
          </div>
          <div>
            <dt>Package version</dt>
            <dd>
              <code>{batch.source.packageVersion}</code>
            </dd>
          </div>
        </dl>
      </details>
      {batch.lineage.replacesBatchReference ? (
        <p>
          Corrected replacement for{' '}
          <Link to={`/submissions/batches/${batch.lineage.replacesBatchReference}`}>
            {batch.lineage.replacesBatchReference}
          </Link>
          .
        </p>
      ) : null}
      {batch.lineage.supersededByBatchReference ? (
        <p>
          Superseded by{' '}
          <Link to={`/submissions/batches/${batch.lineage.supersededByBatchReference}`}>
            {batch.lineage.supersededByBatchReference}
          </Link>
          .
        </p>
      ) : null}
      {batch.status === 'correction_requested' ? (
        <p>
          <Link className="button button--primary" to={correctedUploadPath(batch)}>
            Upload corrected replacement
          </Link>
        </p>
      ) : null}
      {batch.counts.duplicate > 0 ? (
        <p>
          Duplicate items reuse the already known record; they are not published twice. Corrected
          replacements are retained separately and supersede the earlier version only after review.
        </p>
      ) : null}
      {batch.review ? (
        <p>
          Review: {batch.review.decision.replaceAll('_', ' ')} by{' '}
          {batch.review.actor.displayName ?? `account ${batch.review.actor.accountId}`} on{' '}
          {new Date(batch.review.decidedAt).toLocaleString()}. Reason: {batch.review.reason}
        </p>
      ) : null}
    </section>
  );
}

function sourceLabel(location: BatchReportItem['location']) {
  return [
    location.filePath ?? 'uploaded package',
    location.sheetName ? `sheet ${location.sheetName}` : null,
    location.rowNumber ? `row ${location.rowNumber}` : null,
    location.jsonPath ? formatValidationField(location.jsonPath) : null,
  ]
    .filter(Boolean)
    .join(', ');
}

function ReferenceControl({
  batchReference,
  item,
  resolution,
  embedded = false,
}: {
  batchReference: string;
  item: BatchReportItem;
  resolution: BatchReportItem['referenceResolutions'][number];
  /** Rendered inside an explanatory notice that already shows the context and reason. */
  embedded?: boolean;
}) {
  const client = useAuthenticatedApiClient();
  const [candidateReference, setCandidateReference] = useState(
    resolution.candidates[0]?.candidateReference ?? '',
  );
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'saving' } | { kind: 'queued' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const controlId = `mapping-${item.ordinal}-${resolution.referencePath.replace(/[^a-z0-9]/gi, '-')}`;

  async function save() {
    if (!candidateReference) return;
    setState({ kind: 'saving' });
    try {
      await mapBatchReference(client, batchReference, {
        itemOrdinal: item.ordinal,
        referencePath: resolution.referencePath,
        candidateReference,
        decisionKey: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      });
      setState({ kind: 'queued' });
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof ApiResponseError && error.status === 409
            ? `${error.message} Reload the report to see the current choices.`
            : 'This mapping could not be saved. Try again.',
      });
    }
  }

  return (
    <fieldset className="batch-reference-control" disabled={state.kind === 'saving'}>
      <legend>
        {embedded
          ? 'Choose the correct match'
          : `${resolution.entityType.replaceAll('_', ' ')} needs a match`}
      </legend>
      {embedded ? null : (
        <>
          <p>
            Submitted value: <code>{JSON.stringify(resolution.submittedReference)}</code>
          </p>
          {resolution.reason ? <p>{resolution.reason}</p> : null}
        </>
      )}
      {resolution.requiredAction === 'contact_reviewer' || resolution.candidates.length === 0 ? (
        <p role="status">
          No safe existing match is available. Contact a reviewer; the system will not guess or
          create a record silently.
        </p>
      ) : (
        <>
          <label htmlFor={controlId}>Choose the matching {resolution.entityType}</label>
          <select
            id={controlId}
            value={candidateReference}
            onChange={(event) => setCandidateReference(event.target.value)}
          >
            {resolution.candidates.map((candidate) => (
              <option key={candidate.candidateReference} value={candidate.candidateReference}>
                {candidate.label}
              </option>
            ))}
          </select>
          <button
            className="button button--secondary"
            type="button"
            disabled={state.kind === 'queued'}
            onClick={() => void save()}
          >
            {state.kind === 'saving'
              ? 'Saving match…'
              : state.kind === 'queued'
                ? 'Match queued'
                : 'Use selected match'}
          </button>
          {state.kind === 'queued' ? (
            <p role="status">
              Match saved. Background validation continues after you leave; reload this report for
              updated results.
            </p>
          ) : state.kind === 'error' ? (
            <p role="alert">{state.message}</p>
          ) : null}
        </>
      )}
    </fieldset>
  );
}

/** Item-level rule codes that only restate an unresolved reference already explained above. */
const REFERENCE_FAILURE_RULES = new Set(['REFERENCE_RESOLUTION_FAILED', 'UNRESOLVED_REFERENCE']);

function deliveryLabel(context: BatchReportItem['context']) {
  if (context.overNumber === null) return 'Event';
  return context.positionInOver === null
    ? `Over ${context.overNumber}`
    : `Over ${context.overNumber}, delivery ${context.positionInOver}`;
}

function UnresolvedFixtureNotice({
  batchReference,
  item,
  fixture,
  dependents,
  foldedErrors,
}: {
  batchReference: string;
  item: BatchReportItem;
  fixture: BatchReportItem['referenceResolutions'][number];
  dependents: BatchReportItem['referenceResolutions'];
  foldedErrors: BatchReportItem['errors'];
}) {
  const headingId = `batch-item-${item.ordinal}-fixture-error`;
  const match = describeFixtureReference(fixture.submittedReference);
  const canChoose = fixture.requiredAction === 'select_candidate' && fixture.candidates.length > 0;
  const waiting = dependents
    .map((dependent) =>
      dependent.entityType === 'innings'
        ? describeInningsReference(dependent.submittedReference)
        : null,
    )
    .filter((label): label is string => label !== null);

  return (
    <section className="batch-fixture-error" aria-labelledby={headingId}>
      <h3 id={headingId}>Match could not be found</h3>
      <p>We could not match this event to an existing fixture.</p>
      {match.title || match.date || match.venue ? (
        <dl className="batch-fixture-error__context">
          {match.title ? (
            <div>
              <dt>Match</dt>
              <dd>{match.title}</dd>
            </div>
          ) : null}
          {match.date ? (
            <div>
              <dt>Date</dt>
              <dd>{match.date}</dd>
            </div>
          ) : null}
          {match.venue ? (
            <div>
              <dt>Venue</dt>
              <dd>{match.venue}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <p>
        {canChoose
          ? 'More than one existing fixture could be this match.'
          : 'This match is not in the system yet, so events from it cannot be accepted.'}
      </p>
      {waiting.length > 0 ? <p>Also waiting on this match: {waiting.join('; ')}.</p> : null}
      <p className="batch-fixture-error__action">
        <strong>What to do:</strong>{' '}
        {canChoose
          ? 'Choose the correct match below, or ask a reviewer if it is not listed.'
          : 'Ask a reviewer to match or create this fixture before this event can be accepted.'}
      </p>
      {canChoose ? (
        <ReferenceControl
          batchReference={batchReference}
          item={item}
          resolution={fixture}
          embedded
        />
      ) : null}
      <p>
        <a href={`#batch-item-${item.ordinal}-source`}>
          View in {item.location.filePath ?? 'uploaded package'}
        </a>
      </p>
      <details className="validation-technical-details">
        <summary>Technical details</summary>
        <p>{item.context.description}</p>
        {item.stagedRecordId ? <p>Staged record: {item.stagedRecordId}</p> : null}
        {match.sourceReference ? (
          <p>
            Fixture source reference: <code>{match.sourceReference}</code>
          </p>
        ) : null}
        {[fixture, ...dependents].map((resolution) => (
          <div key={resolution.referencePath}>
            <p>
              <code>{resolution.referencePath}</code> ({resolution.entityType}, {resolution.state},{' '}
              {resolution.requiredAction.replaceAll('_', ' ')})
            </p>
            {resolution.reason ? <p>{resolution.reason}</p> : null}
            <p>
              Submitted value: <code>{JSON.stringify(resolution.submittedReference)}</code>
            </p>
          </div>
        ))}
        {foldedErrors.map((error, index) => (
          <p key={`${error.ruleCode}-${index}`}>
            <code>{error.ruleCode}</code>
            {error.location.jsonPath ? (
              <>
                {' · '}
                <code>{error.location.jsonPath}</code>
              </>
            ) : null}{' '}
            {error.message}
          </p>
        ))}
      </details>
    </section>
  );
}

function ReportItems({
  batchReference,
  items,
}: {
  batchReference: string;
  items: BatchReportItem[];
}) {
  if (items.length === 0) return <p>No report items are available yet.</p>;
  return (
    <ol className="batch-report-items">
      {items.map((item) => {
        const grouped = groupReferenceResolutions(item.referenceResolutions);
        const fixtureRooted = grouped.fixture !== null;
        const visibleErrors = fixtureRooted
          ? item.errors.filter((error) => !REFERENCE_FAILURE_RULES.has(error.ruleCode))
          : item.errors;
        const foldedErrors = fixtureRooted
          ? item.errors.filter((error) => REFERENCE_FAILURE_RULES.has(error.ruleCode))
          : [];
        return (
          <li key={item.ordinal} id={`batch-item-${item.ordinal}`}>
            <div className="batch-report-item__heading">
              <strong>{outcomeLabel(item.outcome)}</strong>
              <span>{fixtureRooted ? deliveryLabel(item.context) : item.context.description}</span>
            </div>
            <p id={`batch-item-${item.ordinal}-source`}>Source: {sourceLabel(item.location)}</p>
            {item.correctionTarget ? (
              <p>
                Correction target: <code>{item.correctionTarget.sourceEventId}</code>
                {item.correctionTarget.resolvedDeliveryId
                  ? ` (published delivery ${item.correctionTarget.resolvedDeliveryId})`
                  : ' (not resolved)'}
              </p>
            ) : null}
            {item.stagedRecordId && !fixtureRooted ? (
              <p>Staged record: {item.stagedRecordId}</p>
            ) : null}
            {grouped.fixture ? (
              <UnresolvedFixtureNotice
                batchReference={batchReference}
                item={item}
                fixture={grouped.fixture}
                dependents={grouped.dependents}
                foldedErrors={foldedErrors}
              />
            ) : null}
            {item.acceptedRecordId ? <p>Accepted delivery: {item.acceptedRecordId}</p> : null}
            {visibleErrors.length > 0 ? (
              <ul>
                {visibleErrors.map((error, index) => (
                  <li key={`${error.ruleCode}-${index}`}>
                    <strong>{validationRuleLabel(error.ruleCode)}</strong>{' '}
                    <span>{formatBatchValidationMessage(error.ruleCode, error.message)}</span>{' '}
                    <a href={`#batch-item-${item.ordinal}-source`}>
                      Go to {sourceLabel(error.location)} — {error.context.description}
                    </a>
                    <details className="validation-technical-details">
                      <summary>Technical details</summary>
                      <p>
                        <code>{error.ruleCode}</code>
                        {error.location.jsonPath ? (
                          <>
                            {' · '}
                            <code>{error.location.jsonPath}</code>
                          </>
                        ) : null}
                      </p>
                      <p>{error.message}</p>
                    </details>
                  </li>
                ))}
              </ul>
            ) : null}
            {grouped.independent.map((resolution) => (
              <ReferenceControl
                batchReference={batchReference}
                item={item}
                resolution={resolution}
                key={resolution.referencePath}
              />
            ))}
          </li>
        );
      })}
    </ol>
  );
}

function BatchList() {
  const client = useAuthenticatedApiClient();
  const collectionRevision = useBatchCollectionsRevision();
  const [state, setState] = useState<ListState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([getCurrentUserProfile(client, controller.signal), listBatches(client)])
      .then(([profile, response]) => {
        if (profile.role !== 'submitter' && profile.role !== 'admin') {
          setState({ kind: 'error', message: 'Submitter or reviewer access is required.' });
          return;
        }
        setState({
          kind: 'ready',
          batches: response.data,
          nextCursor: response.pagination.nextCursor,
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            kind: 'error',
            message:
              error instanceof ApiResponseError && error.kind === 'forbidden'
                ? 'You cannot inspect batch reports.'
                : 'Batch reports could not be loaded.',
          });
        }
      });
    return () => controller.abort();
  }, [client, collectionRevision]);

  async function loadMore(cursor: string) {
    const response = await listBatches(client, cursor);
    setState((current) =>
      current.kind === 'ready'
        ? {
            kind: 'ready',
            batches: [...current.batches, ...response.data],
            nextCursor: response.pagination.nextCursor,
          }
        : current,
    );
  }

  if (state.kind === 'loading')
    return (
      <div className="state-message" role="status">
        <h2>Loading batches</h2>
      </div>
    );
  if (state.kind === 'error')
    return (
      <div className="state-message state-message--error" role="alert">
        <h2>Reports unavailable</h2>
        <p>{state.message}</p>
      </div>
    );
  if (state.batches.length === 0)
    return (
      <div className="state-message" role="status">
        <h2>No submissions yet</h2>
        <p>You haven't submitted anything yet.</p>
        <Link className="button button--primary" to="/submissions/new">
          Submit data
        </Link>
      </div>
    );
  return (
    <>
      <ul className="batch-list">
        {state.batches.map((batch) => (
          <li key={batch.batchReference}>
            <Link to={`/submissions/batches/${batch.batchReference}`}>
              {batch.source.fileName ?? 'Submission report'}
            </Link>
            <span>
              Received {new Date(batch.receivedAt).toLocaleDateString()} ·{' '}
              {stateLabels[batch.status]} · {batch.counts.accepted} accepted ·{' '}
              {batch.counts.rejected} rejected
            </span>
            <code>{batch.batchReference}</code>
            {batch.lineage.replacesBatchReference ? (
              <span>
                Replaces{' '}
                <Link to={`/submissions/batches/${batch.lineage.replacesBatchReference}`}>
                  {batch.lineage.replacesBatchReference}
                </Link>
              </span>
            ) : null}
            {batch.lineage.supersededByBatchReference ? (
              <span>
                Superseded by{' '}
                <Link to={`/submissions/batches/${batch.lineage.supersededByBatchReference}`}>
                  {batch.lineage.supersededByBatchReference}
                </Link>
              </span>
            ) : null}
            {batch.status === 'correction_requested' ? (
              <Link to={correctedUploadPath(batch)}>Upload corrected replacement</Link>
            ) : null}
          </li>
        ))}
      </ul>
      {state.nextCursor ? (
        <button
          className="button button--secondary"
          type="button"
          onClick={() => void loadMore(state.nextCursor!)}
        >
          Load more
        </button>
      ) : null}
    </>
  );
}

function BatchReport({ batchReference }: { batchReference: string }) {
  const client = useAuthenticatedApiClient();
  const [state, setState] = useState<ReportState>({ kind: 'loading' });
  const [downloadState, setDownloadState] = useState<DownloadState>({ kind: 'idle' });
  useEffect(() => {
    void getBatchReport(client, batchReference)
      .then((response) => {
        setState({ kind: 'ready', report: response.data });
      })
      .catch(() => setState({ kind: 'error', message: 'This batch report could not be loaded.' }));
  }, [batchReference, client]);

  async function loadMore(cursor: string) {
    const response = await getBatchReport(client, batchReference, cursor);
    setState((current) =>
      current.kind === 'ready'
        ? {
            kind: 'ready',
            report: { ...response.data, items: [...current.report.items, ...response.data.items] },
          }
        : current,
    );
  }

  async function download() {
    setDownloadState({ kind: 'downloading' });
    try {
      await downloadBatchReport(client, batchReference);
      setDownloadState({ kind: 'idle' });
    } catch (error: unknown) {
      setDownloadState({
        kind: 'error',
        message: downloadUnavailableMessage(error, batchReference),
      });
    }
  }

  if (state.kind === 'loading')
    return (
      <div className="state-message" role="status">
        <h2>Loading report</h2>
      </div>
    );
  if (state.kind === 'error')
    return (
      <div className="state-message state-message--error" role="alert">
        <h2>Report unavailable</h2>
        <p>{state.message}</p>
      </div>
    );
  return (
    <>
      <Summary batch={state.report.batch} />
      {state.report.errorGroups.length > 0 ? (
        <section
          className="batch-validation-summary"
          aria-labelledby="batch-validation-summary-title"
        >
          <h2 id="batch-validation-summary-title">What needs attention</h2>
          <ul>
            {state.report.errorGroups.map((group) => (
              <li key={group.ruleCode}>
                {validationRuleLabel(group.ruleCode)} ({group.count})
              </li>
            ))}
          </ul>
          <details className="validation-technical-details">
            <summary>Technical validation details</summary>
            <ul>
              {state.report.errorGroups.map((group) => (
                <li key={group.ruleCode}>
                  <code>{group.ruleCode}</code> ({group.count})
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}
      <button
        className="button button--secondary"
        type="button"
        disabled={downloadState.kind === 'downloading'}
        onClick={() => void download()}
      >
        {downloadState.kind === 'downloading' ? 'Preparing report…' : 'Download JSON report'}
      </button>
      {downloadState.kind === 'error' ? <p role="alert">{downloadState.message}</p> : null}
      <h2>Results</h2>
      <ReportItems batchReference={batchReference} items={state.report.items} />
      {state.report.pagination.nextCursor ? (
        <button
          className="button button--secondary"
          type="button"
          onClick={() => void loadMore(state.report.pagination.nextCursor!)}
        >
          Load more results
        </button>
      ) : null}
    </>
  );
}

export function BatchReportsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { batchReference } = useParams();
  const location = useLocation();
  useEffect(() => {
    document.title = `${batchReference ? 'Submission report' : 'My submissions'} | Stat'sTheGame`;
  }, [batchReference]);
  if (!isLoading && !isAuthenticated)
    return <Navigate to={signInPathFor(`${location.pathname}${location.search}`)} replace />;
  return (
    <section className="submission-page content-boundary" aria-labelledby="batch-reports-title">
      <Breadcrumbs
        items={
          batchReference
            ? [
                { label: 'Manage Submission', to: '/submissions/new' },
                { label: 'My submissions', to: '/submissions/batches' },
                { label: 'Submission report', to: '#' },
              ]
            : [
                { label: 'Manage Submission', to: '/submissions/new' },
                { label: 'My submissions', to: '#' },
              ]
        }
      />
      <header className="page-heading submission-page__heading">
        <p className="eyebrow">Manage Submission</p>
        <h1 id="batch-reports-title">{batchReference ? 'Submission report' : 'My submissions'}</h1>
        <p>
          {batchReference
            ? 'Inspect every accepted and rejected source item.'
            : 'Track uploaded batch progress and inspect validation outcomes.'}
        </p>
        {batchReference ? (
          <Link to="/submissions/batches">Back to submissions</Link>
        ) : (
          <Link className="button button--primary" to="/submissions/new">
            New submission
          </Link>
        )}
      </header>
      {isLoading ? (
        <div className="state-message" role="status">
          <h2>Checking access</h2>
        </div>
      ) : batchReference ? (
        <BatchReport batchReference={batchReference} />
      ) : (
        <BatchList />
      )}
    </section>
  );
}
