import type {
  BatchReportItem,
  BatchReportResponse,
  BatchReviewRequest,
  BatchStatus,
  CurrentUserProfile,
} from '@sport-analytics/contracts';
import { fixtureProposalSchema } from '@sport-analytics/contracts';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  getBatchReport,
  listAdminBatches,
  mapBatchReference,
  createBatchCanonicalFixture,
  resolvePublishedConflict,
  reviewBatch,
} from '../submissions/batch-api';

const statusLabels: Record<BatchStatus['status'], string> = {
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

type LoadState<T> =
  { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; value: T };

function hasFixtureProposal(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as { sourceId?: unknown; proposal?: unknown };
  return (
    typeof record.sourceId === 'string' && fixtureProposalSchema.safeParse(record.proposal).success
  );
}

function ReviewerGate({ profile, children }: { profile: CurrentUserProfile; children: ReactNode }) {
  return profile.role === 'admin' ? (
    children
  ) : (
    <div className="state-message state-message--error" role="alert">
      <h2>Administrator access required</h2>
      <p>Batch review decisions are available only to administrators.</p>
    </div>
  );
}

function batchSubmitterLabel(batch: BatchStatus): string {
  return batch.source.submitter.displayName ?? `Account ${batch.source.submitter.accountId}`;
}

function BatchQueueItem({ batch }: { batch: BatchStatus }) {
  return (
    <li>
      <div>
        <Link to={`/reviews/batches/${batch.batchReference}`}>
          {batch.source.fileName ?? batch.batchReference}
        </Link>
        <span>
          {batchSubmitterLabel(batch)} · Competition {batch.competitionId}
        </span>
      </div>
      <span>
        {statusLabels[batch.status]} · {batch.progress.accepted} accepted ·{' '}
        {batch.progress.rejected} rejected
      </span>
    </li>
  );
}

type BatchCollection = {
  batches: BatchStatus[];
  cursor: string | null;
};

type ReviewQueueReady = {
  profile: CurrentUserProfile;
  pending: BatchCollection;
  history: BatchCollection;
};

type HistoryStatus = BatchStatus['status'] | 'all';

function ReviewQueue() {
  const client = useAuthenticatedApiClient();
  const [pendingLoadingMore, setPendingLoadingMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>('all');
  const [state, setState] = useState<LoadState<ReviewQueueReady>>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    void getCurrentUserProfile(client, controller.signal)
      .then(async (profile) => {
        if (profile.role !== 'admin') {
          return {
            profile,
            pending: { batches: [], cursor: null },
            history: { batches: [], cursor: null },
          } satisfies ReviewQueueReady;
        }
        const [pending, history] = await Promise.all([
          listAdminBatches(client, undefined, 'awaiting_review', controller.signal),
          listAdminBatches(client, undefined, undefined, controller.signal),
        ]);
        return {
          profile,
          pending: { batches: pending.data, cursor: pending.pagination.nextCursor },
          history: { batches: history.data, cursor: history.pagination.nextCursor },
        } satisfies ReviewQueueReady;
      })
      .then((value) => {
        if (!controller.signal.aborted) setState({ kind: 'ready', value });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            kind: 'error',
            message: 'The administrator batch workspace could not be loaded.',
          });
      });
    return () => controller.abort();
  }, [client]);

  if (state.kind === 'loading') return <p role="status">Loading batch management…</p>;
  if (state.kind === 'error') return <p role="alert">{state.message}</p>;

  async function loadMorePending() {
    if (state.kind !== 'ready' || !state.value.pending.cursor) return;
    setPendingLoadingMore(true);
    setPendingError(null);
    try {
      const response = await listAdminBatches(
        client,
        state.value.pending.cursor,
        'awaiting_review',
      );
      setState({
        kind: 'ready',
        value: {
          ...state.value,
          pending: {
            batches: [...state.value.pending.batches, ...response.data],
            cursor: response.pagination.nextCursor,
          },
        },
      });
    } catch {
      setPendingError('More pending batches could not be loaded.');
    } finally {
      setPendingLoadingMore(false);
    }
  }

  async function loadMoreHistory() {
    if (state.kind !== 'ready' || !state.value.history.cursor) return;
    setHistoryLoadingMore(true);
    setHistoryError(null);
    try {
      const response = await listAdminBatches(
        client,
        state.value.history.cursor,
        historyStatus === 'all' ? undefined : historyStatus,
      );
      setState({
        kind: 'ready',
        value: {
          ...state.value,
          history: {
            batches: [...state.value.history.batches, ...response.data],
            cursor: response.pagination.nextCursor,
          },
        },
      });
    } catch {
      setHistoryError('More batch history could not be loaded.');
    } finally {
      setHistoryLoadingMore(false);
    }
  }

  async function changeHistoryStatus(nextStatus: HistoryStatus) {
    if (state.kind !== 'ready') return;
    setHistoryStatus(nextStatus);
    setHistoryRefreshing(true);
    setHistoryError(null);
    try {
      const response = await listAdminBatches(
        client,
        undefined,
        nextStatus === 'all' ? undefined : nextStatus,
      );
      setState({
        kind: 'ready',
        value: {
          ...state.value,
          history: { batches: response.data, cursor: response.pagination.nextCursor },
        },
      });
    } catch {
      setHistoryError('The selected batch history could not be loaded.');
    } finally {
      setHistoryRefreshing(false);
    }
  }

  return (
    <ReviewerGate profile={state.value.profile}>
      <section className="review-batch-section" aria-labelledby="needs-review-title">
        <div>
          <h2 id="needs-review-title">Needs review</h2>
          <p className="review-scope-note">
            Showing every batch currently awaiting administrator review.
          </p>
        </div>
        {state.value.pending.batches.length === 0 ? (
          <p role="status">No batches are awaiting your review.</p>
        ) : (
          <ul className="batch-list review-queue">
            {state.value.pending.batches.map((batch) => (
              <BatchQueueItem key={batch.batchReference} batch={batch} />
            ))}
          </ul>
        )}
        {state.value.pending.cursor ? (
          <button
            className="button button--secondary"
            type="button"
            disabled={pendingLoadingMore}
            onClick={() => void loadMorePending()}
          >
            {pendingLoadingMore ? 'Loading…' : 'Load more pending batches'}
          </button>
        ) : null}
        {pendingError ? <p role="alert">{pendingError}</p> : null}
      </section>

      <section className="review-batch-section" aria-labelledby="batch-history-title">
        <div className="review-history__heading">
          <div>
            <h2 id="batch-history-title">All batches</h2>
            <p>Global batch history across every submitter and lifecycle state.</p>
          </div>
          <label className="review-history__filter">
            Status
            <select
              value={historyStatus}
              disabled={historyRefreshing}
              onChange={(event) => void changeHistoryStatus(event.target.value as HistoryStatus)}
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {historyRefreshing ? <p role="status">Refreshing batch history…</p> : null}
        {!historyRefreshing && state.value.history.batches.length === 0 ? (
          <p role="status">No batches match this status.</p>
        ) : (
          <ul className="batch-list review-queue">
            {state.value.history.batches.map((batch) => (
              <BatchQueueItem key={batch.batchReference} batch={batch} />
            ))}
          </ul>
        )}
        {state.value.history.cursor ? (
          <button
            className="button button--secondary"
            type="button"
            disabled={historyLoadingMore || historyRefreshing}
            onClick={() => void loadMoreHistory()}
          >
            {historyLoadingMore ? 'Loading…' : 'Load more batch history'}
          </button>
        ) : null}
        {historyError ? <p role="alert">{historyError}</p> : null}
      </section>
    </ReviewerGate>
  );
}

function ConfirmationDialog({
  decision,
  reason,
  saving,
  onCancel,
  onConfirm,
}: {
  decision: BatchReviewRequest['decision'];
  reason: string;
  saving: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === cancelRef.current) {
          event.preventDefault();
          confirmRef.current?.focus();
        } else if (!event.shiftKey && document.activeElement === confirmRef.current) {
          event.preventDefault();
          cancelRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onCancel, saving]);
  const label =
    decision === 'approved'
      ? 'Approve and publish'
      : decision === 'rejected'
        ? 'Reject batch'
        : 'Return for correction';
  return (
    <div className="review-dialog-backdrop">
      <section
        className="review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-confirm-title"
        aria-describedby="review-confirm-description"
      >
        <h2 id="review-confirm-title">Confirm {label.toLowerCase()}</h2>
        <p id="review-confirm-description">
          This records a reviewer decision and changes the batch lifecycle. Reason: {reason}
        </p>
        <div className="batch-review__actions">
          <button
            ref={cancelRef}
            className="button button--secondary"
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            className={decision === 'rejected' ? 'button button--danger' : 'button button--primary'}
            type="button"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? 'Saving…' : `Confirm ${label.toLowerCase()}`}
          </button>
        </div>
      </section>
    </div>
  );
}

function SourceMetadata({ batch }: { batch: BatchStatus }) {
  return (
    <section className="batch-summary" aria-labelledby="source-metadata-title">
      <h2 id="source-metadata-title">Source and provenance</h2>
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
        <div>
          <dt>Checksum (SHA-256)</dt>
          <dd>
            <code>{batch.source.checksum ?? 'Pending'}</code>
          </dd>
        </div>
        <div>
          <dt>Package version</dt>
          <dd>{batch.source.packageVersion}</dd>
        </div>
      </dl>
    </section>
  );
}

function ErrorGroups({ report }: { report: BatchReportResponse['data'] }) {
  return (
    <section aria-labelledby="rejection-groups-title">
      <h2 id="rejection-groups-title">Rejections by rule</h2>
      {report.errorGroups.length === 0 ? (
        <p>No validation rejections.</p>
      ) : (
        report.errorGroups.map((group) => {
          const details = report.items.flatMap((item) =>
            item.errors.filter((error) => error.ruleCode === group.ruleCode),
          );
          return (
            <details className="review-error-group" key={group.ruleCode}>
              <summary>
                <code>{group.ruleCode}</code> · {group.count}{' '}
                {group.count === 1 ? 'rejection' : 'rejections'}
              </summary>
              {details.length > 0 ? (
                <ul>
                  {details.map((error, index) => (
                    <li key={`${error.location.ordinal}-${index}`}>
                      {error.context.description} {error.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Load more report results to inspect additional examples.</p>
              )}
            </details>
          );
        })
      )}
    </section>
  );
}

function ReferenceResolution({
  batchReference,
  packageVersion,
  item,
  refresh,
}: {
  batchReference: string;
  packageVersion: string;
  item: BatchReportItem;
  refresh(): Promise<void>;
}) {
  const client = useAuthenticatedApiClient();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  return (
    <>
      {item.referenceResolutions.map((resolution) => (
        <div className="reference-resolution" key={resolution.referencePath}>
          <h3>
            {resolution.entityType}: {String(resolution.submittedReference ?? 'No submitted label')}
          </h3>
          <p>
            <strong>{resolution.state}</strong>
            {resolution.reason ? ` · ${resolution.reason}` : ''}
          </p>
          {resolution.candidates.length === 0 ? (
            <>
              <p>No proposed match is available.</p>
              {resolution.entityType === 'fixture' &&
              packageVersion === '1.1' &&
              hasFixtureProposal(resolution.submittedReference) ? (
                <button
                  className="button button--primary"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setSaving(true);
                    setFeedback(null);
                    void createBatchCanonicalFixture(client, batchReference, {
                      itemOrdinal: item.ordinal,
                      referencePath: resolution.referencePath,
                      decisionKey: `create-${batchReference}-${item.ordinal}-${resolution.referencePath}`,
                    })
                      .then(() => {
                        setFeedback('Canonical fixture decision queued for validation.');
                        return refresh();
                      })
                      .catch(() => setFeedback('The canonical fixture could not be created.'))
                      .finally(() => setSaving(false));
                  }}
                >
                  Create canonical fixture from proposal
                </button>
              ) : null}
            </>
          ) : (
            <ul>
              {resolution.candidates.map((candidate) => (
                <li key={candidate.candidateReference}>
                  <span>{candidate.label}</span>
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSaving(true);
                      setFeedback(null);
                      void mapBatchReference(client, batchReference, {
                        itemOrdinal: item.ordinal,
                        referencePath: resolution.referencePath,
                        candidateReference: candidate.candidateReference,
                        decisionKey: `review-${batchReference}-${item.ordinal}-${resolution.referencePath}-${candidate.candidateReference}`,
                      })
                        .then((response) => {
                          setFeedback(
                            `Mapping ${response.data.status}. The batch will be reprocessed safely.`,
                          );
                          return refresh();
                        })
                        .catch((error: unknown) =>
                          setFeedback(
                            error instanceof ApiResponseError && error.status === 409
                              ? error.message
                              : 'The mapping could not be saved.',
                          ),
                        )
                        .finally(() => setSaving(false));
                    }}
                  >
                    Use {candidate.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {feedback ? <p role="status">{feedback}</p> : null}
        </div>
      ))}
    </>
  );
}

function PublishedConflictResolution({
  batchReference,
  item,
  refresh,
}: {
  batchReference: string;
  item: BatchReportItem;
  refresh(): Promise<void>;
}) {
  const client = useAuthenticatedApiClient();
  const conflict = item.publishedConflict;
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  if (!conflict) return null;

  const publishedDeliveryId = conflict.existingDeliveryId;
  async function resolve(decision: 'use_existing' | 'replace_published') {
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setFeedback('Explain the conflict decision in at least 10 characters.');
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await resolvePublishedConflict(client, batchReference, {
        itemOrdinal: item.ordinal,
        existingDeliveryId: publishedDeliveryId,
        decision,
        reason: trimmed,
      });
      setFeedback(
        decision === 'use_existing'
          ? 'Conflict resolved by keeping the published delivery.'
          : 'Conflict resolved as an immutable correction. Review the batch before publication.',
      );
      await refresh();
    } catch (error) {
      setFeedback(
        error instanceof ApiResponseError && error.status === 409
          ? error.message
          : 'The published-delivery conflict could not be resolved.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="published-conflict-resolution">
      <h3>{item.context.description}</h3>
      <p>
        Existing published delivery <code>{conflict.existingDeliveryId}</code> differs from the
        submitted delivery.
      </p>
      <table>
        <caption>Fields that differ</caption>
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Submitted</th>
            <th scope="col">Published</th>
          </tr>
        </thead>
        <tbody>
          {conflict.differences.map((difference) => (
            <tr key={difference.fieldPath}>
              <th scope="row">{difference.fieldPath}</th>
              <td>
                <code>{JSON.stringify(difference.submittedValue)}</code>
              </td>
              <td>
                <code>{JSON.stringify(difference.publishedValue)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <label>
        Resolution reason
        <textarea
          value={reason}
          maxLength={2000}
          disabled={saving}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="batch-review__actions">
        <button
          className="button button--secondary"
          type="button"
          disabled={saving}
          onClick={() => void resolve('use_existing')}
        >
          Keep published delivery
        </button>
        <button
          className="button button--primary"
          type="button"
          disabled={saving || !conflict.correctionPermitted}
          onClick={() => void resolve('replace_published')}
        >
          Approve submitted correction
        </button>
      </div>
      {!conflict.correctionPermitted ? (
        <p role="status">This conflict cannot be converted into an immutable correction.</p>
      ) : null}
      {feedback ? <p role="status">{feedback}</p> : null}
    </article>
  );
}

function ReviewDetail({ batchReference }: { batchReference: string }) {
  const client = useAuthenticatedApiClient();
  const [state, setState] = useState<
    LoadState<{ profile: CurrentUserProfile; report: BatchReportResponse['data'] }>
  >({ kind: 'loading' });
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<BatchReviewRequest['decision'] | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const load = useCallback(async () => {
    const [profile, response] = await Promise.all([
      getCurrentUserProfile(client),
      getBatchReport(client, batchReference),
    ]);
    setState({ kind: 'ready', value: { profile, report: response.data } });
  }, [batchReference, client]);
  async function loadMore() {
    if (state.kind !== 'ready' || !state.value.report.pagination.nextCursor) return;
    setLoadingMore(true);
    setFeedback(null);
    try {
      const response = await getBatchReport(
        client,
        batchReference,
        state.value.report.pagination.nextCursor,
      );
      setState({
        kind: 'ready',
        value: {
          ...state.value,
          report: {
            ...state.value.report,
            items: [...state.value.report.items, ...response.data.items],
            pagination: response.data.pagination,
          },
        },
      });
    } catch {
      setFeedback('More report results could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  }
  useEffect(() => {
    void load().catch(() =>
      setState({ kind: 'error', message: 'This review could not be loaded.' }),
    );
  }, [load]);
  function cancel() {
    setPending(null);
    queueMicrotask(() => triggerRef.current?.focus());
  }
  function begin(decision: BatchReviewRequest['decision'], target: HTMLButtonElement) {
    const trimmed = reason.trim();
    if (!trimmed || (decision !== 'approved' && trimmed.length < 10)) {
      setFeedback(
        decision === 'approved'
          ? 'Enter a reason before continuing.'
          : 'Explain the rejection or correction in at least 10 characters.',
      );
      return;
    }
    triggerRef.current = target;
    setFeedback(null);
    setPending(decision);
  }
  async function confirm() {
    if (!pending) return;
    setSaving(true);
    try {
      await reviewBatch(client, batchReference, { decision: pending, reason: reason.trim() });
      setPending(null);
      setReason('');
      setFeedback('Decision recorded. The current lifecycle state is shown below.');
      await load();
    } catch (error) {
      setPending(null);
      setFeedback(
        error instanceof ApiResponseError && error.status === 409
          ? `This action was already completed or is no longer valid: ${error.message}`
          : 'The review decision could not be saved. Try again.',
      );
    } finally {
      setSaving(false);
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }
  if (state.kind === 'loading') return <p role="status">Loading reviewer workspace…</p>;
  if (state.kind === 'error') return <p role="alert">{state.message}</p>;
  const { profile, report } = state.value;
  return (
    <ReviewerGate profile={profile}>
      <Link to="/reviews/batches">Back to review queue</Link>
      <p className={`batch-lifecycle batch-lifecycle--${report.batch.status}`} role="status">
        Current state: <strong>{statusLabels[report.batch.status]}</strong>
      </p>
      <SourceMetadata batch={report.batch} />
      <section aria-labelledby="review-summary-title">
        <h2 id="review-summary-title">Validation and reference summary</h2>
        <dl className="batch-counts">
          <div>
            <dt>Accepted</dt>
            <dd>{report.reviewSummary.validation.accepted}</dd>
          </div>
          <div>
            <dt>Rejected</dt>
            <dd>{report.reviewSummary.validation.rejected}</dd>
          </div>
          <div>
            <dt>Blocking errors</dt>
            <dd>{report.reviewSummary.validation.blockingErrors}</dd>
          </div>
          <div>
            <dt>Duplicates</dt>
            <dd>{report.reviewSummary.validation.duplicate}</dd>
          </div>
          <div>
            <dt>Conflicts</dt>
            <dd>{report.reviewSummary.validation.conflicting}</dd>
          </div>
          <div>
            <dt>Resolved references</dt>
            <dd>{report.reviewSummary.resolution.resolved}</dd>
          </div>
          <div>
            <dt>Ambiguous</dt>
            <dd>{report.reviewSummary.resolution.ambiguous}</dd>
          </div>
          <div>
            <dt>Unresolved</dt>
            <dd>{report.reviewSummary.resolution.unresolved}</dd>
          </div>
          <div>
            <dt>Invalid references</dt>
            <dd>{report.reviewSummary.resolution.invalid}</dd>
          </div>
          <div>
            <dt>Proposed matches</dt>
            <dd>{report.reviewSummary.resolution.proposed}</dd>
          </div>
        </dl>
      </section>
      <ErrorGroups report={report} />
      <section aria-labelledby="published-conflicts-title">
        <h2 id="published-conflicts-title">Published delivery conflicts</h2>
        {report.items.some((item) => item.publishedConflict) ? (
          report.items.map((item) => (
            <PublishedConflictResolution
              key={item.ordinal}
              batchReference={batchReference}
              item={item}
              refresh={load}
            />
          ))
        ) : (
          <p>No unresolved published-delivery conflicts are shown.</p>
        )}
      </section>
      <section aria-labelledby="fixture-summary-title">
        <h2 id="fixture-summary-title">Fixture summaries</h2>
        {report.fixtureSummaries.length === 0 ? (
          <p>No fixture summaries are available.</p>
        ) : (
          <ul className="fixture-summary-list">
            {report.fixtureSummaries.map((fixture) => (
              <li key={fixture.fixtureId ?? fixture.label}>
                <strong>{fixture.label}</strong>
                <span>
                  {fixture.total} items · {fixture.accepted} accepted · {fixture.rejected} rejected
                  · {fixture.unresolved} unresolved
                </span>
              </li>
            ))}
          </ul>
        )}
        <h3>Accepted content sample</h3>
        <p>
          Showing at most 15 accepted items; the full season-scale dataset is never rendered here.
        </p>
        {report.acceptedSamples.length === 0 ? (
          <p>No accepted samples are available.</p>
        ) : (
          <ol className="accepted-samples">
            {report.acceptedSamples.map((item) => (
              <li key={item.ordinal}>
                {item.context.description}
                {item.correctionTarget ? (
                  <span>
                    {' '}
                    Target: <code>{item.correctionTarget.sourceEventId}</code>
                    {item.correctionTarget.resolvedDeliveryId
                      ? ` (published delivery ${item.correctionTarget.resolvedDeliveryId})`
                      : ' (not resolved)'}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
      <section aria-labelledby="reference-review-title">
        <h2 id="reference-review-title">References requiring attention</h2>
        {report.items.some((item) => item.referenceResolutions.length > 0) ? (
          report.items.map((item) => (
            <ReferenceResolution
              key={item.ordinal}
              batchReference={batchReference}
              packageVersion={report.batch.source.packageVersion}
              item={item}
              refresh={load}
            />
          ))
        ) : (
          <p>All displayed references are resolved.</p>
        )}
        {report.pagination.nextCursor ? (
          <button
            className="button button--secondary"
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? 'Loading…' : 'Load more report results'}
          </button>
        ) : null}
      </section>
      {report.batch.status === 'awaiting_review' ? (
        <section className="batch-review" aria-labelledby="decision-title">
          <h2 id="decision-title">Review decision</h2>
          {report.reviewSummary.approvalBlocked ? (
            <div className="state-message state-message--error" role="alert">
              <strong>Approval unavailable</strong>
              <ul>
                {report.reviewSummary.blockingReasons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {!report.reviewSummary.approvalBlocked && report.batch.counts.rejected > 0 ? (
            <div className="state-message" role="status">
              <strong>Only the accepted subset will publish</strong>
              <p>
                Approving publishes {report.batch.counts.accepted} accepted{' '}
                {report.batch.counts.accepted === 1 ? 'record' : 'records'}. The{' '}
                {report.batch.counts.rejected} rejected{' '}
                {report.batch.counts.rejected === 1 ? 'record remains' : 'records remain'}{' '}
                unpublished and retained in this report.
              </p>
            </div>
          ) : null}
          <label htmlFor="review-reason">
            Reason <span>(required; corrections and rejections need at least 10 characters)</span>
          </label>
          <textarea
            id="review-reason"
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={saving}
          />
          <div className="batch-review__actions">
            <button
              className="button button--primary"
              type="button"
              disabled={saving || report.reviewSummary.approvalBlocked}
              onClick={(event) => begin('approved', event.currentTarget)}
            >
              Approve and publish
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={saving}
              onClick={(event) => begin('returned_for_correction', event.currentTarget)}
            >
              Return for correction
            </button>
            <button
              className="button button--danger"
              type="button"
              disabled={saving}
              onClick={(event) => begin('rejected', event.currentTarget)}
            >
              Reject batch
            </button>
          </div>
        </section>
      ) : (
        <p>
          This batch is no longer awaiting a decision. Duplicate or competing actions are not
          submitted.
        </p>
      )}
      {feedback ? (
        <p role="status" aria-live="polite">
          {feedback}
        </p>
      ) : null}
      {pending ? (
        <ConfirmationDialog
          decision={pending}
          reason={reason.trim()}
          saving={saving}
          onCancel={cancel}
          onConfirm={() => void confirm()}
        />
      ) : null}
    </ReviewerGate>
  );
}

export function BatchReviewWorkspacePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { batchReference } = useParams();
  useEffect(() => {
    document.title = `${batchReference ? 'Review batch' : 'Batch management'} | Stat'sTheGame`;
  }, [batchReference]);
  if (!isLoading && !isAuthenticated) return <Navigate to="/sign-in" replace />;
  return (
    <section className="review-workspace content-boundary" aria-labelledby="review-workspace-title">
      <header className="page-heading review-workspace__heading">
        <p className="eyebrow">Reviewer workspace</p>
        <h1 id="review-workspace-title">
          {batchReference ? 'Review staged batch' : 'Batch management'}
        </h1>
        <p>
          {batchReference
            ? 'Evaluate a bounded, accessible summary before making a publication decision.'
            : 'Review pending batches and inspect the complete ingestion history.'}
        </p>
      </header>
      {isLoading ? (
        <p role="status">Checking reviewer access…</p>
      ) : batchReference ? (
        <ReviewDetail batchReference={batchReference} />
      ) : (
        <ReviewQueue />
      )}
    </section>
  );
}
