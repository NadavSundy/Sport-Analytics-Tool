import type { BatchReportItem, BatchReportResponse, BatchStatus } from '@sport-analytics/contracts';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import { downloadBatchReport, getBatchReport, listBatches } from './batch-api';

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
  publishing: 'Publishing',
  published: 'Published',
  partially_published: 'Partially published',
  failed: 'Failed',
  superseded: 'Superseded',
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
    </section>
  );
}

function ReportItems({ items }: { items: BatchReportItem[] }) {
  if (items.length === 0) return <p>No report items are available yet.</p>;
  return (
    <ol className="batch-report-items">
      {items.map((item) => (
        <li key={item.ordinal}>
          <div className="batch-report-item__heading">
            <strong>{outcomeLabel(item.outcome)}</strong>
            <span>{item.context.description}</span>
          </div>
          <p>
            Source: {item.location.filePath ?? 'uploaded package'}
            {item.location.sheetName ? `, sheet ${item.location.sheetName}` : ''}
            {item.location.rowNumber ? `, row ${item.location.rowNumber}` : ''}
            {item.location.jsonPath ? `, ${item.location.jsonPath}` : ''}
          </p>
          {item.stagedRecordId ? <p>Staged record: {item.stagedRecordId}</p> : null}
          {item.acceptedRecordId ? <p>Accepted delivery: {item.acceptedRecordId}</p> : null}
          {item.errors.length > 0 ? (
            <ul>
              {item.errors.map((error, index) => (
                <li key={`${error.ruleCode}-${index}`}>
                  <code>{error.ruleCode}</code>: {error.message}
                </li>
              ))}
            </ul>
          ) : null}
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
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void getBatchReport(client, batchReference)
      .then((response) => setState({ kind: 'ready', report: response.data }))
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
    setDownloading(true);
    try {
      await downloadBatchReport(client, batchReference);
    } finally {
      setDownloading(false);
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
        <p>
          Validation rules:{' '}
          {state.report.errorGroups.map((group) => `${group.ruleCode} (${group.count})`).join(', ')}
        </p>
      ) : null}
      <button
        className="button button--secondary"
        type="button"
        disabled={downloading}
        onClick={() => void download()}
      >
        {downloading ? 'Preparing report…' : 'Download JSON report'}
      </button>
      <h2>Item results</h2>
      <ReportItems items={state.report.items} />
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
          <Link to="/submissions/new">Submit delivery events</Link>
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
