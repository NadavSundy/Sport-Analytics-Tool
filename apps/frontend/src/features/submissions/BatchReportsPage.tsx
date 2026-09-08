import type {
  BatchReportItem,
  BatchReportResponse,
  BatchReviewRequest,
  BatchStatus,
  CurrentUserProfile,
} from '@sport-analytics/contracts';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  downloadBatchReport,
  getBatchReport,
  listBatches,
  mapBatchReference,
  reviewBatch,
} from './batch-api';

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; batches: BatchStatus[]; nextCursor: string | null };

type ReportState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; report: BatchReportResponse['data'] };

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

function outcomeLabel(outcome: BatchReportItem['outcome']) {
  return outcome === 'conflicting'
    ? 'Conflict'
    : outcome.charAt(0).toUpperCase() + outcome.slice(1);
}

function Summary({ batch }: { batch: BatchStatus }) {
  const partial = batch.counts.accepted > 0 && batch.counts.rejected > 0;
  return (
    <section className="batch-summary" aria-labelledby="batch-summary-title">
      <h2 id="batch-summary-title">Batch summary</h2>
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
    location.jsonPath ?? null,
  ]
    .filter(Boolean)
    .join(', ');
}

function ReferenceControl({
  batchReference,
  item,
  resolution,
}: {
  batchReference: string;
  item: BatchReportItem;
  resolution: BatchReportItem['referenceResolutions'][number];
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
      <legend>{resolution.entityType.replaceAll('_', ' ')} needs a match</legend>
      <p>
        Submitted value: <code>{JSON.stringify(resolution.submittedReference)}</code>
      </p>
      {resolution.reason ? <p>{resolution.reason}</p> : null}
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
      {items.map((item) => (
        <li key={item.ordinal} id={`batch-item-${item.ordinal}`}>
          <div className="batch-report-item__heading">
            <strong>{outcomeLabel(item.outcome)}</strong>
            <span>{item.context.description}</span>
          </div>
          <p id={`batch-item-${item.ordinal}-source`}>Source: {sourceLabel(item.location)}</p>
          {item.stagedRecordId ? <p>Staged record: {item.stagedRecordId}</p> : null}
          {item.acceptedRecordId ? <p>Accepted delivery: {item.acceptedRecordId}</p> : null}
          {item.errors.length > 0 ? (
            <ul>
              {item.errors.map((error, index) => (
                <li key={`${error.ruleCode}-${index}`}>
                  <code>{error.ruleCode}</code>: {error.message}{' '}
                  <a href={`#batch-item-${item.ordinal}-source`}>
                    Go to {sourceLabel(error.location)} — {error.context.description}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {item.referenceResolutions.map((resolution) => (
            <ReferenceControl
              batchReference={batchReference}
              item={item}
              resolution={resolution}
              key={resolution.referencePath}
            />
          ))}
        </li>
      ))}
    </ol>
  );
}

function BatchList() {
  const client = useAuthenticatedApiClient();
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
  }, [client]);

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
        <h2>No batches yet</h2>
        <p>Your uploaded batches will appear here.</p>
      </div>
    );
  return (
    <>
      <ul className="batch-list">
        {state.batches.map((batch) => (
          <li key={batch.batchReference}>
            <Link to={`/submissions/batches/${batch.batchReference}`}>{batch.batchReference}</Link>
            <span>
              Received {new Date(batch.receivedAt).toLocaleDateString()} ·{' '}
              {stateLabels[batch.status]} · {batch.counts.accepted} accepted ·{' '}
              {batch.counts.rejected} rejected
            </span>
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
  const [downloadState, setDownloadState] = useState<
    { kind: 'idle' } | { kind: 'downloading' } | { kind: 'error' }
  >({ kind: 'idle' });
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [reason, setReason] = useState('');
  const [decisionState, setDecisionState] = useState<
    { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  useEffect(() => {
    void Promise.all([getBatchReport(client, batchReference), getCurrentUserProfile(client)])
      .then(([response, currentProfile]) => {
        setProfile(currentProfile);
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
    } catch {
      setDownloadState({ kind: 'error' });
    }
  }

  async function decide(decision: BatchReviewRequest['decision']) {
    if (!reason.trim()) {
      setDecisionState({ kind: 'error', message: 'Enter a reason for the review decision.' });
      return;
    }
    setDecisionState({ kind: 'saving' });
    try {
      await reviewBatch(client, batchReference, { decision, reason: reason.trim() });
      const response = await getBatchReport(client, batchReference);
      setState({ kind: 'ready', report: response.data });
      setReason('');
      setDecisionState({ kind: 'idle' });
    } catch (error) {
      setDecisionState({
        kind: 'error',
        message:
          error instanceof ApiResponseError && error.status === 409
            ? error.message
            : 'The review decision could not be saved.',
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
  const canReview =
    profile?.role === 'admin' && profile.competitionIds.includes(state.report.batch.competitionId);
  return (
    <>
      <Summary batch={state.report.batch} />
      {state.report.batch.status === 'awaiting_review' && profile?.role === 'admin' ? (
        canReview ? (
          <section className="batch-review" aria-labelledby="batch-review-title">
            <h2 id="batch-review-title">Review decision</h2>
            <label htmlFor="batch-review-reason">Reason</label>
            <textarea
              id="batch-review-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={2000}
              disabled={decisionState.kind === 'saving'}
            />
            <div className="batch-review__actions">
              <button
                type="button"
                className="button button--primary"
                onClick={() => void decide('approved')}
                disabled={decisionState.kind === 'saving'}
              >
                Approve and publish
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void decide('returned_for_correction')}
                disabled={decisionState.kind === 'saving'}
              >
                Return for correction
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => void decide('rejected')}
                disabled={decisionState.kind === 'saving'}
              >
                Reject batch
              </button>
            </div>
            {decisionState.kind === 'error' ? <p role="alert">{decisionState.message}</p> : null}
            {decisionState.kind === 'saving' ? (
              <p role="status">Saving review decisionâ€¦</p>
            ) : null}
          </section>
        ) : (
          <p role="status">
            You cannot review this batch because its competition is outside your authorised scope.
          </p>
        )
      ) : null}
      {state.report.errorGroups.length > 0 ? (
        <p>
          Validation rules:{' '}
          {state.report.errorGroups.map((group) => `${group.ruleCode} (${group.count})`).join(', ')}
        </p>
      ) : null}
      <button
        className="button button--secondary"
        type="button"
        disabled={downloadState.kind === 'downloading'}
        onClick={() => void download()}
      >
        {downloadState.kind === 'downloading' ? 'Preparing report…' : 'Download JSON report'}
      </button>
      {downloadState.kind === 'error' ? (
        <p role="alert">The complete report is temporarily unavailable. Try the download again.</p>
      ) : null}
      <h2>Item results</h2>
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
  useEffect(() => {
    document.title = `${batchReference ? 'Batch report' : 'Batch reports'} | Stat'sTheGame`;
  }, [batchReference]);
  if (!isLoading && !isAuthenticated) return <Navigate to="/sign-in" replace />;
  return (
    <section className="submission-page content-boundary" aria-labelledby="batch-reports-title">
      <header className="page-heading submission-page__heading">
        <p className="eyebrow">Submitter workspace</p>
        <h1 id="batch-reports-title">
          {batchReference ? 'Batch result report' : 'Your batch reports'}
        </h1>
        <p>
          {batchReference
            ? 'Inspect every accepted and rejected source item.'
            : 'Track uploaded batch progress and inspect validation outcomes.'}
        </p>
        {batchReference ? (
          <Link to="/submissions/batches">Back to all batches</Link>
        ) : (
          <Link to="/submissions/batches/new">Upload a batch package</Link>
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
