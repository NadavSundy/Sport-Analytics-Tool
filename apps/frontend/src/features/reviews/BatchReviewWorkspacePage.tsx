import type {
  ApiErrorDetail,
  BatchParticipantOnboardingDecision,
  BatchParticipantOnboardingTask,
  BatchReportItem,
  BatchReportResponse,
  BatchReviewRequest,
  BatchStatus,
  CurrentUserProfile,
} from '@sport-analytics/contracts';
import { fixtureProposalSchema } from '@sport-analytics/contracts';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { signInPathFor } from '../auth/auth-return';
import {
  AnchoredSection,
  Breadcrumbs,
  SectionNavigation,
} from '../../components/NavigationPrimitives';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  getBatchReport,
  listAdminBatches,
  mapBatchReference,
  createBatchCanonicalFixture,
  decideParticipantOnboarding,
  resolvePublishedConflict,
  reviewBatch,
} from '../submissions/batch-api';
import { useBatchCollectionsRevision } from '../submissions/batch-collection-state';

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

type ReferenceResolutionValue = BatchReportItem['referenceResolutions'][number];

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nestedContext(value: unknown): Record<string, unknown> | null {
  return recordValue(recordValue(value)?.context);
}

function nestedName(value: unknown): string | null {
  const name = nestedContext(value)?.name;
  return typeof name === 'string' && name.trim() ? name : null;
}

function submittedReferenceLabel(
  resolution: ReferenceResolutionValue,
  item: BatchReportItem,
): string {
  const submitted = recordValue(resolution.submittedReference);
  if (!submitted) {
    return typeof resolution.submittedReference === 'string' && resolution.submittedReference.trim()
      ? resolution.submittedReference
      : 'Submitted reference without readable context';
  }

  const context = recordValue(submitted.context);
  const sourceId = typeof submitted.sourceId === 'string' ? submitted.sourceId : null;
  if (resolution.entityType === 'fixture') {
    const teams = Array.isArray(context?.teams)
      ? context.teams.map(nestedName).filter((name): name is string => Boolean(name))
      : [];
    const date = typeof context?.date === 'string' ? context.date : null;
    const season = nestedName(submitted.season);
    const details = [
      teams.length === 2 ? teams.join(' vs ') : null,
      date,
      season ? `Season ${season}` : null,
    ].filter((value): value is string => Boolean(value));
    return details.join(' · ') || sourceId || item.context.fixtureLabel || 'Fixture reference';
  }
  if (resolution.entityType === 'participant') {
    const name = typeof context?.name === 'string' ? context.name : null;
    const team = nestedName(context?.team);
    return (
      [name, team].filter((value): value is string => Boolean(value)).join(' · ') ||
      sourceId ||
      'Participant reference'
    );
  }
  if (resolution.entityType === 'innings') {
    const ordinal = typeof context?.ordinal === 'number' ? `Innings ${context.ordinal + 1}` : null;
    const battingTeam = nestedName(context?.battingTeam);
    const fixture = item.context.fixtureLabel;
    return (
      [ordinal, battingTeam ? `${battingTeam} batting` : null, fixture]
        .filter((value): value is string => Boolean(value))
        .join(' · ') ||
      sourceId ||
      'Innings reference'
    );
  }

  const name = typeof context?.name === 'string' ? context.name : null;
  return name || sourceId || `${resolution.entityType} reference`;
}

function submittedReferenceSource(resolution: ReferenceResolutionValue): string | null {
  const sourceId = recordValue(resolution.submittedReference)?.sourceId;
  return typeof sourceId === 'string' ? sourceId : null;
}

function referenceHeading(resolution: ReferenceResolutionValue, item: BatchReportItem): string {
  const entity = `${resolution.entityType[0]!.toUpperCase()}${resolution.entityType.slice(1)}`;
  return `${entity}: ${submittedReferenceLabel(resolution, item)}`;
}

function isReviewerActionableReference(
  resolution: ReferenceResolutionValue,
  packageVersion: string,
): boolean {
  return (
    resolution.candidates.length > 0 ||
    (resolution.entityType === 'fixture' &&
      packageVersion === '1.1' &&
      hasFixtureProposal(resolution.submittedReference))
  );
}

function lifecycleGuidance(report: BatchReportResponse['data']): string {
  switch (report.batch.status) {
    case 'received':
    case 'stored':
      return 'Queued for validation. Background processing has not started yet.';
    case 'validating':
      return 'Revalidation in progress. Reviewer actions are paused until processing finishes.';
    case 'awaiting_review':
      return report.reviewSummary.approvalBlocked
        ? 'Awaiting further review. Resolve the highlighted reviewer actions before publication.'
        : 'Ready for publication. Review the accepted content and record a decision.';
    case 'publishing':
      return 'Publication is in progress. No further reviewer action is currently possible.';
    case 'published':
      return 'Publication is complete. This submission is terminal.';
    case 'partially_published':
      return 'Publication is complete for the accepted subset. This submission is terminal.';
    case 'rejected':
      return 'Terminal rejection. No further reviewer action is possible for this submission.';
    case 'correction_requested':
      return 'Waiting for the submitter to provide a correction.';
    case 'failed':
      return 'Background processing failed. No reviewer action is currently possible.';
    case 'superseded':
      return 'This submission was superseded and is terminal. Follow its replacement batch.';
  }
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
      {batch.lineage.replacesBatchReference ? (
        <span>
          Replaces{' '}
          <Link to={`/reviews/batches/${batch.lineage.replacesBatchReference}`}>
            {batch.lineage.replacesBatchReference}
          </Link>
        </span>
      ) : null}
      {batch.lineage.supersededByBatchReference ? (
        <span>
          Superseded by{' '}
          <Link to={`/reviews/batches/${batch.lineage.supersededByBatchReference}`}>
            {batch.lineage.supersededByBatchReference}
          </Link>
        </span>
      ) : null}
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
  const collectionRevision = useBatchCollectionsRevision();
  const [pendingLoadingMore, setPendingLoadingMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>('all');
  const historyStatusRef = useRef<HistoryStatus>(historyStatus);
  historyStatusRef.current = historyStatus;
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
          listAdminBatches(
            client,
            undefined,
            historyStatusRef.current === 'all' ? undefined : historyStatusRef.current,
            controller.signal,
          ),
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
            message: 'The review queue could not be loaded.',
          });
      });
    return () => controller.abort();
  }, [client, collectionRevision]);

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
      <SectionNavigation
        label="Review queue sections"
        items={[
          { label: 'Needs review', to: '#needs-review' },
          { label: 'History', to: '#history' },
        ]}
      />
      <AnchoredSection id="needs-review">
        <section className="review-batch-section" aria-labelledby="needs-review-title">
          <div>
            <h2 id="needs-review-title">Needs review</h2>
            <p className="review-scope-note">
              Showing every batch currently awaiting administrator review.
            </p>
          </div>
          {state.value.pending.batches.length === 0 ? (
            <div className="state-message" role="status">
              <p>Nothing needs review.</p>
              <a href="#history">View review history</a>
            </div>
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
      </AnchoredSection>
      <AnchoredSection id="history">
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
      </AnchoredSection>
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
      {batch.lineage.replacesBatchReference ? (
        <p>
          Corrected replacement for{' '}
          <Link to={`/reviews/batches/${batch.lineage.replacesBatchReference}`}>
            {batch.lineage.replacesBatchReference}
          </Link>
          .
        </p>
      ) : null}
      {batch.lineage.supersededByBatchReference ? (
        <p>
          Superseded by{' '}
          <Link to={`/reviews/batches/${batch.lineage.supersededByBatchReference}`}>
            {batch.lineage.supersededByBatchReference}
          </Link>
          .
        </p>
      ) : null}
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

function ReferenceResolutionCard({
  batchReference,
  packageVersion,
  item,
  resolution,
  refresh,
  actionsAvailable,
  onActionQueued,
  onActionReady,
}: {
  batchReference: string;
  packageVersion: string;
  item: BatchReportItem;
  resolution: ReferenceResolutionValue;
  refresh(): Promise<BatchStatus['status']>;
  actionsAvailable: boolean;
  onActionQueued(): void;
  onActionReady(): void;
}) {
  const client = useAuthenticatedApiClient();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'status' | 'alert'; text: string } | null>(null);
  const heading = referenceHeading(resolution, item);
  const sourceId = submittedReferenceSource(resolution);
  async function refreshAfterQueuedAction(message: string) {
    setFeedback({ kind: 'status', text: message });
    try {
      const status = await refresh();
      if (status === 'awaiting_review') onActionReady();
    } catch {
      setFeedback({
        kind: 'status',
        text: `${message} The current batch status could not be refreshed.`,
      });
    }
  }
  return (
    <article className="reference-resolution" aria-label={heading}>
      <h3>{heading}</h3>
      {sourceId ? <p className="reference-resolution__source">Source: {sourceId}</p> : null}
      <p>
        <strong>{resolution.state}</strong>
        {resolution.reason ? ` · ${resolution.reason}` : ''}
      </p>
      {resolution.candidates.length === 0 ? (
        <>
          <p>No candidate match is available.</p>
          {resolution.entityType === 'fixture' &&
          packageVersion === '1.1' &&
          hasFixtureProposal(resolution.submittedReference) ? (
            <button
              className="button button--primary"
              type="button"
              disabled={saving || !actionsAvailable}
              onClick={() => {
                setSaving(true);
                setFeedback(null);
                onActionQueued();
                void createBatchCanonicalFixture(client, batchReference, {
                  itemOrdinal: item.ordinal,
                  referencePath: resolution.referencePath,
                  decisionKey: `create-${batchReference}-${item.ordinal}-${resolution.referencePath}`,
                })
                  .then(() => {
                    return refreshAfterQueuedAction(
                      'Canonical fixture decision queued for validation.',
                    );
                  })
                  .catch(() => {
                    setFeedback({
                      kind: 'alert',
                      text: 'The canonical fixture could not be created.',
                    });
                    onActionReady();
                  })
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
                disabled={saving || !actionsAvailable}
                onClick={() => {
                  setSaving(true);
                  setFeedback(null);
                  onActionQueued();
                  void mapBatchReference(client, batchReference, {
                    itemOrdinal: item.ordinal,
                    referencePath: resolution.referencePath,
                    candidateReference: candidate.candidateReference,
                    decisionKey: `review-${batchReference}-${item.ordinal}-${resolution.referencePath}-${candidate.candidateReference}`,
                  })
                    .then((response) => {
                      return refreshAfterQueuedAction(
                        `Mapping ${response.data.status}. The batch will be reprocessed safely.`,
                      );
                    })
                    .catch((error: unknown) => {
                      setFeedback({
                        kind: 'alert',
                        text:
                          error instanceof ApiResponseError && error.status === 409
                            ? error.message
                            : 'The mapping could not be saved.',
                      });
                      onActionReady();
                    })
                    .finally(() => setSaving(false));
                }}
              >
                Use {candidate.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!actionsAvailable && isReviewerActionableReference(resolution, packageVersion) ? (
        <p className="reference-resolution__notice">
          Actions are unavailable while this batch is not awaiting review.
        </p>
      ) : null}
      {feedback ? <p role={feedback.kind}>{feedback.text}</p> : null}
    </article>
  );
}

type ReviewReference = {
  key: string;
  item: BatchReportItem;
  resolution: ReferenceResolutionValue;
};

const unresolvedPageSize = 20;

function reviewReferences(report: BatchReportResponse['data']): ReviewReference[] {
  return report.blockingItems.flatMap((item) =>
    item.referenceResolutions.map((resolution) => ({
      key: `${item.ordinal}-${resolution.referencePath}`,
      item,
      resolution,
    })),
  );
}

function actionableReviewReferences(report: BatchReportResponse['data']): ReviewReference[] {
  return reviewReferences(report)
    .filter(({ resolution }) =>
      isReviewerActionableReference(resolution, report.batch.source.packageVersion),
    )
    .filter(
      (reference, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.resolution.entityType === reference.resolution.entityType &&
            candidate.resolution.referencePath === reference.resolution.referencePath,
        ) === index,
    );
}

function unresolvedReferenceTotal(report: BatchReportResponse['data']): number {
  return (
    report.reviewSummary.resolution.ambiguous +
    report.reviewSummary.resolution.unresolved +
    report.reviewSummary.resolution.invalid
  );
}

function fixtureGroupLabel(reference: ReviewReference): string {
  return (
    reference.item.context.fixtureLabel ??
    (reference.resolution.entityType === 'fixture'
      ? submittedReferenceLabel(reference.resolution, reference.item)
      : null) ??
    'Fixture context unavailable'
  );
}

function ReferenceReview({
  batchReference,
  report,
  refresh,
  view,
}: {
  batchReference: string;
  report: BatchReportResponse['data'];
  refresh(): Promise<BatchStatus['status']>;
  view: 'actions' | 'references';
}) {
  const [entityFilter, setEntityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [fixtureFilter, setFixtureFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);
  const [actionQueued, setActionQueued] = useState(false);
  const packageVersion = report.batch.source.packageVersion;
  const references = reviewReferences(report);
  const actionable = actionableReviewReferences(report);
  const informational = references.filter(
    ({ resolution }) => !isReviewerActionableReference(resolution, packageVersion),
  );
  const fixtureOptions = Array.from(
    new Set(
      informational
        .map(({ item }) => item.context.fixtureLabel)
        .filter((label): label is string => Boolean(label)),
    ),
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filtered = references.filter(({ item, resolution }) => {
    const searchable = [
      referenceHeading(resolution, item),
      resolution.reason,
      item.context.fixtureLabel,
      submittedReferenceSource(resolution),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLocaleLowerCase();
    return (
      !isReviewerActionableReference(resolution, packageVersion) &&
      (entityFilter === 'all' || resolution.entityType === entityFilter) &&
      (stateFilter === 'all' || resolution.state === stateFilter) &&
      (fixtureFilter === 'all' || item.context.fixtureLabel === fixtureFilter) &&
      (!normalizedSearch || searchable.includes(normalizedSearch))
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / unresolvedPageSize));
  const visible = filtered.slice(page * unresolvedPageSize, (page + 1) * unresolvedPageSize);
  const total = unresolvedReferenceTotal(report);
  const actionsAvailable = report.batch.status === 'awaiting_review' && !actionQueued;
  const currentAction = actionable[Math.min(actionIndex, Math.max(actionable.length - 1, 0))];

  useEffect(() => {
    if (actionIndex >= actionable.length && actionable.length > 0) {
      setActionIndex(actionable.length - 1);
    }
  }, [actionIndex, actionable.length]);

  function resetPageAnd(update: () => void) {
    update();
    setPage(0);
  }

  if (view === 'actions') {
    return (
      <section className="reference-actions" aria-labelledby="reference-actions-title">
        <div className="reference-review__heading">
          <div>
            <h2 id="reference-actions-title">Reviewer actions required</h2>
            <p>Work through candidate mappings and new-fixture proposals one item at a time.</p>
          </div>
          <strong>{actionable.length} need review</strong>
        </div>
        {currentAction ? (
          <>
            <section
              className="reference-action-group"
              aria-label={`Fixture group: ${fixtureGroupLabel(currentAction)}`}
            >
              <div className="reference-action-group__heading">
                <span>Fixture group</span>
                <strong>{fixtureGroupLabel(currentAction)}</strong>
              </div>
              <ReferenceResolutionCard
                key={currentAction.key}
                batchReference={batchReference}
                packageVersion={packageVersion}
                item={currentAction.item}
                resolution={currentAction.resolution}
                refresh={refresh}
                actionsAvailable={actionsAvailable}
                onActionQueued={() => setActionQueued(true)}
                onActionReady={() => setActionQueued(false)}
              />
            </section>
            <nav className="reference-action-navigation" aria-label="Unresolved reviewer actions">
              <button
                className="button button--secondary"
                type="button"
                disabled={actionIndex === 0}
                onClick={() => setActionIndex((current) => current - 1)}
              >
                Previous unresolved
              </button>
              <span aria-live="polite">
                Review item {actionIndex + 1} of {actionable.length}
              </span>
              <button
                className="button button--secondary"
                type="button"
                disabled={actionIndex + 1 >= actionable.length}
                onClick={() => setActionIndex((current) => current + 1)}
              >
                Next unresolved
              </button>
            </nav>
          </>
        ) : (
          <div className="review-work-complete" role="status">
            <strong>No reference decisions remain.</strong>
            <p>Review the batch summary to continue toward publication.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="reference-review" aria-labelledby="reference-review-title">
      <div className="reference-review__heading">
        <div>
          <h2 id="reference-review-title">Informational unresolved references</h2>
          <p>{total} unresolved references in total</p>
        </div>
        <strong>{filtered.length} shown by filters</strong>
      </div>
      <div className="reference-review__filters" aria-label="Unresolved reference filters">
        <label>
          Search loaded references
          <input
            type="search"
            value={search}
            onChange={(event) => resetPageAnd(() => setSearch(event.target.value))}
          />
        </label>
        <label>
          Entity type
          <select
            value={entityFilter}
            onChange={(event) => resetPageAnd(() => setEntityFilter(event.target.value))}
          >
            <option value="all">All entity types</option>
            {['fixture', 'innings', 'participant', 'team', 'competition'].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resolution state
          <select
            value={stateFilter}
            onChange={(event) => resetPageAnd(() => setStateFilter(event.target.value))}
          >
            <option value="all">All unresolved states</option>
            <option value="ambiguous">Ambiguous</option>
            <option value="unresolved">Unresolved</option>
            <option value="invalid">Invalid</option>
          </select>
        </label>
        {fixtureOptions.length > 0 ? (
          <label>
            Fixture
            <select
              value={fixtureFilter}
              onChange={(event) => resetPageAnd(() => setFixtureFilter(event.target.value))}
            >
              <option value="all">All fixtures</option>
              {fixtureOptions.map((fixture) => (
                <option key={fixture} value={fixture}>
                  {fixture}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {visible.length > 0 ? (
        <div className="reference-review__list">
          {visible.map(({ key, item, resolution }) => (
            <ReferenceResolutionCard
              key={key}
              batchReference={batchReference}
              packageVersion={packageVersion}
              item={item}
              resolution={resolution}
              refresh={refresh}
              actionsAvailable={actionsAvailable}
              onActionQueued={() => setActionQueued(true)}
              onActionReady={() => setActionQueued(false)}
            />
          ))}
        </div>
      ) : (
        <p>
          {total > 0
            ? 'No informational unresolved references match these filters.'
            : 'All references are resolved.'}
        </p>
      )}
      {filtered.length > unresolvedPageSize ? (
        <nav className="reference-review__pagination" aria-label="Unresolved reference pages">
          <button
            className="button button--secondary"
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
          >
            Show previous unresolved references
          </button>
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <button
            className="button button--secondary"
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((current) => current + 1)}
          >
            Show next unresolved references
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function PublishedConflictResolution({
  batchReference,
  item,
  refresh,
  resolutionAvailable,
}: {
  batchReference: string;
  item: BatchReportItem;
  refresh(): Promise<unknown>;
  resolutionAvailable: boolean;
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
      <div className="published-conflict-resolution__header">
        <div>
          <span className="published-conflict-resolution__eyebrow">Published data conflict</span>
          <h3>{item.context.description}</h3>
        </div>
        <span className="published-conflict-resolution__delivery-id">
          Delivery <code>{conflict.existingDeliveryId}</code>
        </span>
      </div>

      <p className="published-conflict-resolution__summary">
        Compare the staged values with the currently published delivery, record a reason, then
        choose which version should continue through review.
      </p>

      <div
        className="published-conflict-resolution__table-wrap"
        role="region"
        aria-label={`Differences for ${item.context.description}`}
        tabIndex={0}
      >
        <table className="published-conflict-resolution__table">
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
      </div>

      <div className="published-conflict-resolution__decision">
        <label className="published-conflict-resolution__reason">
          <span>Resolution reason</span>
          <textarea
            value={reason}
            maxLength={2000}
            disabled={saving}
            aria-describedby={`conflict-reason-help-${item.ordinal}`}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <p
          className="published-conflict-resolution__help"
          id={`conflict-reason-help-${item.ordinal}`}
        >
          Minimum 10 characters. The reason is retained as reviewer audit evidence.
        </p>

        {!resolutionAvailable ? (
          <p className="published-conflict-resolution__notice" role="status">
            Conflict decisions are available only while this batch is awaiting review.
          </p>
        ) : !conflict.correctionPermitted ? (
          <p className="published-conflict-resolution__notice" role="status">
            This legacy published delivery has no immutable lineage, so it cannot be replaced
            safely. You can still keep the published delivery and resolve the conflict.
          </p>
        ) : null}

        <div className="published-conflict-resolution__actions">
          <button
            className="button button--secondary"
            type="button"
            disabled={saving || !resolutionAvailable}
            onClick={() => void resolve('use_existing')}
          >
            {saving ? 'Saving…' : 'Keep published delivery'}
          </button>
          <button
            className="button button--primary"
            type="button"
            disabled={saving || !resolutionAvailable || !conflict.correctionPermitted}
            onClick={() => void resolve('replace_published')}
          >
            Approve submitted correction
          </button>
        </div>
      </div>

      {feedback ? (
        <p className="published-conflict-resolution__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </article>
  );
}

type LifecycleStep = {
  label: string;
  state: 'complete' | 'current' | 'upcoming';
};

function lifecycleSteps(report: BatchReportResponse['data']): LifecycleStep[] {
  const status = report.batch.status;
  const currentIndex =
    status === 'received' || status === 'stored'
      ? 0
      : status === 'validating' || status === 'failed'
        ? 1
        : status === 'awaiting_review' ||
            status === 'rejected' ||
            status === 'correction_requested' ||
            status === 'superseded'
          ? 2
          : status === 'publishing'
            ? 3
            : 4;
  const currentLabel =
    status === 'awaiting_review' && !report.reviewSummary.approvalBlocked
      ? 'Ready to publish'
      : statusLabels[status];
  const labels = ['Queued', 'Validating', 'Awaiting review', 'Publishing', 'Published'];

  return labels.map((label, index) => ({
    label: index === currentIndex ? currentLabel : label,
    state: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
  }));
}

function LifecycleIndicator({ report }: { report: BatchReportResponse['data'] }) {
  return (
    <section className="review-lifecycle" aria-labelledby="review-lifecycle-title">
      <div className="review-lifecycle__heading">
        <div>
          <p className="eyebrow">Batch lifecycle</p>
          <h2 id="review-lifecycle-title">{statusLabels[report.batch.status]}</h2>
        </div>
        <p role="status">{lifecycleGuidance(report)}</p>
      </div>
      <p className="review-lifecycle__current">
        Current state: <strong>{statusLabels[report.batch.status]}</strong>
      </p>
      <ol className="review-lifecycle__steps" aria-label="Batch lifecycle">
        {lifecycleSteps(report).map((step, index) => (
          <li
            key={`${index}-${step.label}`}
            className={`review-lifecycle__step review-lifecycle__step--${step.state}`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span className="review-lifecycle__marker" aria-hidden="true">
              {index + 1}
            </span>
            <span>
              <strong>{step.label}</strong>
              <small>
                {step.state === 'complete'
                  ? 'Complete'
                  : step.state === 'current'
                    ? 'Current state'
                    : 'Not reached'}
              </small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BatchOverview({
  report,
  actionCount,
}: {
  report: BatchReportResponse['data'];
  actionCount: number;
}) {
  return (
    <section className="review-overview" aria-labelledby="review-overview-title">
      <div className="review-overview__identity">
        <div>
          <p className="eyebrow">Batch under review</p>
          <h2 id="review-overview-title">
            {report.batch.source.fileName ?? report.batch.batchReference}
          </h2>
          <p>
            Submitted by {batchSubmitterLabel(report.batch)} · Reference{' '}
            <code>{report.batch.batchReference}</code>
          </p>
        </div>
        <span className={`review-overview__status review-overview__status--${report.batch.status}`}>
          {statusLabels[report.batch.status]}
        </span>
      </div>
      <dl className="review-overview__metrics">
        <div className={actionCount > 0 ? 'review-overview__metric--priority' : undefined}>
          <dt>Needs review</dt>
          <dd>{actionCount}</dd>
        </div>
        <div>
          <dt>Fixtures</dt>
          <dd>{report.fixtureSummaries.length}</dd>
        </div>
        <div>
          <dt>Submitted items</dt>
          <dd>{report.batch.progress.total}</dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * What the platform could not settle for itself, said plainly. Every one of
 * these is a decision rather than a guess it declined to make: a participant is
 * never matched on a name, so an unrecognised name is not a near miss.
 */
const onboardingReasonCopy: Record<BatchParticipantOnboardingTask['reason'], string> = {
  team_not_recognised:
    'The team this player was listed under is not one of the two teams of this fixture.',
  no_durable_identifier:
    'No durable identifier was submitted for this player, and a name alone is not evidence of identity.',
  ambiguous_name: 'More than one person on this platform carries this name.',
  identifier_not_found: 'The submitted identifier names nobody on this platform.',
};

/**
 * One reviewer answer, held until the whole array is submitted.
 *
 * Identity and team are separate because the endpoint treats them separately:
 * exactly one of a candidate or a durable identifier says who the participant
 * is, and an optional team says where they belong. Neither implies the other.
 */
type OnboardingIdentity =
  { kind: 'candidate'; personId: string } | { kind: 'identifier'; sourceId: string };

interface OnboardingAnswer {
  identity: OnboardingIdentity | null;
  teamName: string | null;
}

const emptyAnswer: OnboardingAnswer = { identity: null, teamName: null };

/**
 * A team is asked for when the submitted one is not one of the fixture's two.
 *
 * Keyed off the submitted team rather than the reason, because the server
 * checks the team on every decision whatever its reason:
 *
 *   const teamName = decision.teamName ?? task.submittedTeamName;
 *
 * A task reported for some other reason whose submitted team is still not one
 * of the two therefore fails on the team, and keying this off
 * `team_not_recognised` alone left the reviewer reading that fault with no
 * control to answer it. Issue #708, found in deployed acceptance testing.
 */
function needsTeam(task: BatchParticipantOnboardingTask): boolean {
  return (
    task.submittedTeamName === null ||
    !task.teams.some((team) => team.name === task.submittedTeamName)
  );
}

function toDecision(
  task: BatchParticipantOnboardingTask,
  answer: OnboardingAnswer | undefined,
): BatchParticipantOnboardingDecision | null {
  const identity = answer?.identity;
  if (!identity) return null;
  if (identity.kind === 'identifier' && identity.sourceId.trim().length === 0) return null;
  if (needsTeam(task) && !answer?.teamName) return null;
  return {
    taskReference: task.taskReference,
    ...(identity.kind === 'candidate'
      ? { personId: identity.personId }
      : { sourceId: identity.sourceId.trim() }),
    ...(answer?.teamName ? { teamName: answer.teamName } : {}),
  };
}

/**
 * Bounded and stable for the same set of tasks, so a retry after a failed
 * response is recognisable as the same submission. The references themselves
 * would run past the 255 characters the contract allows once a season-scale
 * batch has more than a handful of them.
 */
function onboardingDecisionKey(batchReference: string, taskReferences: string[]): string {
  let hash = 0x811c9dc5;
  for (const character of [...taskReferences].sort().join(',')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `onboard-${batchReference}-${taskReferences.length}-${hash.toString(16)}`;
}

function ParticipantOnboardingTaskCard({
  task,
  answer,
  fault,
  disabled,
  onAnswer,
}: {
  task: BatchParticipantOnboardingTask;
  answer: OnboardingAnswer;
  fault: string | undefined;
  disabled: boolean;
  onAnswer(next: OnboardingAnswer): void;
}) {
  const identityName = `onboarding-identity-${task.taskReference}`;
  const teamName = `onboarding-team-${task.taskReference}`;
  const identifierId = `onboarding-identifier-${task.taskReference}`;
  const faultId = `onboarding-fault-${task.taskReference}`;
  const answered = toDecision(task, answer) !== null;
  return (
    <article
      className={`participant-onboarding__task${fault ? ' participant-onboarding__task--faulted' : ''}`}
    >
      <div className="participant-onboarding__task-header">
        <h3>{task.submittedName}</h3>
        <span className="participant-onboarding__submitted-team">
          {task.submittedTeamName === null
            ? 'No team was submitted'
            : `Submitted as ${task.submittedTeamName}`}
        </span>
      </div>
      <p className="participant-onboarding__reason">{onboardingReasonCopy[task.reason]}</p>

      <fieldset className="participant-onboarding__question">
        <legend>Who is this player?</legend>
        {task.candidates.map((candidate) => (
          <label key={candidate.personId}>
            <input
              type="radio"
              name={identityName}
              disabled={disabled}
              checked={
                answer.identity?.kind === 'candidate' &&
                answer.identity.personId === candidate.personId
              }
              onChange={() =>
                onAnswer({
                  ...answer,
                  identity: { kind: 'candidate', personId: candidate.personId },
                })
              }
            />
            <span>{candidate.displayName}</span>
          </label>
        ))}
        <label>
          <input
            type="radio"
            name={identityName}
            disabled={disabled}
            checked={answer.identity?.kind === 'identifier'}
            onChange={() =>
              onAnswer({
                ...answer,
                identity: {
                  kind: 'identifier',
                  sourceId: answer.identity?.kind === 'identifier' ? answer.identity.sourceId : '',
                },
              })
            }
          />
          <span>Supply a durable identifier</span>
        </label>
        {answer.identity?.kind === 'identifier' ? (
          <div className="participant-onboarding__identifier">
            <label htmlFor={identifierId}>Durable identifier</label>
            <input
              id={identifierId}
              type="text"
              value={answer.identity.sourceId}
              disabled={disabled}
              aria-describedby={`${identifierId}-help`}
              onChange={(event) =>
                onAnswer({
                  ...answer,
                  identity: { kind: 'identifier', sourceId: event.target.value },
                })
              }
            />
            <p id={`${identifierId}-help`}>
              A registry reference such as <code>cricsheet:participant:abc123</code>, or{' '}
              <code>app:person:42</code> for someone already on this platform. A name is not an
              identifier and is never accepted as one.
            </p>
          </div>
        ) : null}
        {task.candidates.length === 0 ? (
          <p className="participant-onboarding__note">
            This task offers no candidate, so only a durable identifier can settle it.
          </p>
        ) : null}
      </fieldset>

      {needsTeam(task) ? (
        <fieldset className="participant-onboarding__question">
          <legend>Which team do they belong to?</legend>
          {task.teams.map((team) => (
            <label key={team.teamId}>
              <input
                type="radio"
                name={teamName}
                disabled={disabled}
                checked={answer.teamName === team.name}
                onChange={() => onAnswer({ ...answer, teamName: team.name })}
              />
              <span>{team.name}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {fault ? (
        <p className="participant-onboarding__fault" id={faultId} role="alert">
          {fault}
        </p>
      ) : answered ? (
        <p className="participant-onboarding__answered" role="status">
          Answered. It is applied when you submit.
        </p>
      ) : null}
    </article>
  );
}

function ParticipantOnboarding({
  batchReference,
  tasks,
  decisionsAvailable,
  refresh,
  onSettled,
}: {
  batchReference: string;
  tasks: BatchParticipantOnboardingTask[];
  decisionsAvailable: boolean;
  // Whatever the reload reports, the way the conflict card beside it declares
  // this. Settling a task cannot be the thing that decides the batch.
  refresh(): Promise<unknown>;
  // Settling the last task empties this list, which drops the needs-review
  // count to zero and moves the workspace to the decision view, unmounting this
  // section. A receipt rendered here would go with it, so it is reported to the
  // page-level status that sits outside the panels.
  onSettled(message: string): void;
}) {
  const client = useAuthenticatedApiClient();
  const [answers, setAnswers] = useState<Record<string, OnboardingAnswer>>({});
  const [faults, setFaults] = useState<ApiErrorDetail[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const decisions = tasks
    .map((task) => toDecision(task, answers[task.taskReference]))
    .filter((decision): decision is BatchParticipantOnboardingDecision => decision !== null);
  const faultByTask = new Map(
    faults
      .filter((detail) => detail.taskReference !== undefined)
      .map((detail) => [detail.taskReference, detail.message]),
  );

  async function submit() {
    if (decisions.length === 0) return;
    setSaving(true);
    setFeedback(null);
    setFaults([]);
    try {
      const receipt = await decideParticipantOnboarding(client, batchReference, {
        decisionKey: onboardingDecisionKey(
          batchReference,
          decisions.map((decision) => decision.taskReference),
        ),
        decisions,
      });
      const { onboarded, alreadyOnboarded, revalidationQueued } = receipt.data;
      setAnswers({});
      onSettled(
        `${onboarded} settled${alreadyOnboarded > 0 ? `, ${alreadyOnboarded} already settled` : ''}. ` +
          (revalidationQueued
            ? 'The batch is being revalidated once for all of them.'
            : 'Nothing changed, so there was nothing to revalidate.'),
      );
      await refresh();
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 409 && error.details) {
        // Every fault, never only the first. The array is applied all or
        // nothing, so a reviewer shown one at a time would resubmit once per
        // broken decision to discover the rest.
        setFaults(error.details);
        setFeedback(
          `Nothing was applied. ${error.details.length} of ${decisions.length} decisions could not be applied.`,
        );
      } else {
        setFeedback('The onboarding decisions could not be submitted.');
      }
    } finally {
      setSaving(false);
    }
  }

  const unattributed = faults.filter((detail) => detail.taskReference === undefined);
  return (
    <section className="participant-onboarding" aria-labelledby="participant-onboarding-title">
      <div className="participant-onboarding__heading">
        <div>
          <h2 id="participant-onboarding-title">Participants to onboard</h2>
          <p>
            One decision for each player, however many deliveries name them. Settle them together;
            the batch is revalidated once.
          </p>
        </div>
        <strong>{tasks.length} outstanding</strong>
      </div>
      {tasks.length === 0 ? (
        <p>No participant is waiting to be onboarded.</p>
      ) : (
        <>
          {tasks.map((task) => (
            <ParticipantOnboardingTaskCard
              key={task.taskReference}
              task={task}
              answer={answers[task.taskReference] ?? emptyAnswer}
              fault={faultByTask.get(task.taskReference)}
              disabled={saving || !decisionsAvailable}
              onAnswer={(next) =>
                setAnswers((current) => ({ ...current, [task.taskReference]: next }))
              }
            />
          ))}
          {unattributed.length > 0 ? (
            <ul className="participant-onboarding__faults" role="alert">
              {unattributed.map((detail) => (
                <li key={`${detail.code}-${detail.message}`}>{detail.message}</li>
              ))}
            </ul>
          ) : null}
          {!decisionsAvailable ? (
            <p className="participant-onboarding__note" role="status">
              Onboarding decisions are available only while this batch is awaiting review.
            </p>
          ) : null}
          <div className="participant-onboarding__actions">
            <button
              className="button button--primary"
              type="button"
              disabled={saving || !decisionsAvailable || decisions.length === 0}
              onClick={() => void submit()}
            >
              {saving
                ? 'Submitting…'
                : `Submit ${decisions.length} ${decisions.length === 1 ? 'decision' : 'decisions'}`}
            </button>
          </div>
          {feedback ? (
            <p className="participant-onboarding__feedback" role="status">
              {feedback}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

type WorkspaceView = 'review' | 'references' | 'summary' | 'decision';

const workspaceViews: WorkspaceView[] = ['review', 'references', 'summary', 'decision'];

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
  const [selectedView, setSelectedView] = useState<WorkspaceView | 'auto'>('auto');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const viewTabRefs = useRef<Partial<Record<WorkspaceView, HTMLButtonElement>>>({});
  const load = useCallback(async () => {
    const [profile, response] = await Promise.all([
      getCurrentUserProfile(client),
      getBatchReport(client, batchReference),
    ]);
    setState({ kind: 'ready', value: { profile, report: response.data } });
    return response.data.batch.status;
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

    const decision = pending;
    const reviewReason = reason.trim();

    setSaving(true);

    try {
      await reviewBatch(client, batchReference, {
        decision,
        reason: reviewReason,
      });

      setPending(null);
      setReason('');

      setFeedback(
        decision === 'approved'
          ? 'Approval recorded. Publication is continuing in the background. You may leave this page safely.'
          : 'Decision recorded. The current lifecycle state is shown below.',
      );

      await load();
    } catch (error) {
      setPending(null);

      /*
       * Approval is not safe to treat like an ordinary failed request:
       * the server may have committed the review decision before the
       * browser/proxy connection failed. Re-read durable state before
       * telling the reviewer that approval was not saved.
       */
      if (decision === 'approved') {
        try {
          const response = await getBatchReport(client, batchReference);
          const durableReport = response.data;

          if (
            durableReport.batch.review?.decision === 'approved' &&
            durableReport.batch.status !== 'awaiting_review'
          ) {
            if (state.kind === 'ready') {
              setState({
                kind: 'ready',
                value: {
                  profile: state.value.profile,
                  report: durableReport,
                },
              });
            }

            setReason('');
            setFeedback(
              'Approval recorded. Publication is continuing in the background. You may leave this page safely.',
            );

            return;
          }

          setFeedback(
            error instanceof ApiResponseError && error.status === 409
              ? `This action was already completed or is no longer valid: ${error.message}`
              : 'Approval could not be recorded. No review decision was saved.',
          );
        } catch {
          /*
           * If reconciliation itself cannot reach the backend, the result is
           * ambiguous. Do not encourage a potentially duplicate approval.
           */
          setFeedback(
            'The approval result could not be confirmed. Refresh the batch status before trying again.',
          );
        }

        return;
      }

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
  if (state.kind === 'loading') return <p role="status">Loading review queue…</p>;
  if (state.kind === 'error') return <p role="alert">{state.message}</p>;
  const { profile, report } = state.value;
  const newFixtureProposalCount = new Set(
    report.blockingItems.flatMap((item) =>
      item.referenceResolutions
        .filter(
          (resolution) =>
            resolution.entityType === 'fixture' &&
            report.batch.source.packageVersion === '1.1' &&
            hasFixtureProposal(resolution.submittedReference),
        )
        .map((resolution) => resolution.referencePath),
    ),
  ).size;
  const actionableReferences = actionableReviewReferences(report);
  const conflictItems = report.blockingItems.filter((item) => item.publishedConflict);
  const actionCount =
    actionableReferences.length + conflictItems.length + report.participantOnboarding.length;
  const referenceCount = reviewReferences(report).length;
  const activeView: WorkspaceView =
    selectedView === 'auto'
      ? actionCount > 0
        ? 'review'
        : report.batch.status === 'awaiting_review'
          ? 'decision'
          : 'summary'
      : selectedView;

  function selectView(view: WorkspaceView, focus = false) {
    setSelectedView(view);
    if (focus) viewTabRefs.current[view]?.focus();
  }

  function handleViewKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, view: WorkspaceView) {
    const currentIndex = workspaceViews.indexOf(view);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % workspaceViews.length;
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + workspaceViews.length) % workspaceViews.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = workspaceViews.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectView(workspaceViews[nextIndex]!, true);
  }

  return (
    <ReviewerGate profile={profile}>
      <Link to="/reviews/batches">Back to review queue</Link>
      <BatchOverview report={report} actionCount={actionCount} />
      <LifecycleIndicator report={report} />
      <div className="review-workspace-tabs" role="tablist" aria-label="Batch review views">
        <button
          ref={(node) => {
            if (node) viewTabRefs.current.review = node;
          }}
          id="review-view-tab"
          className="review-workspace-tabs__tab"
          type="button"
          role="tab"
          aria-selected={activeView === 'review'}
          aria-controls="review-view-panel"
          tabIndex={activeView === 'review' ? 0 : -1}
          onClick={() => selectView('review')}
          onKeyDown={(event) => handleViewKeyDown(event, 'review')}
        >
          Needs review ({actionCount})
        </button>
        <button
          ref={(node) => {
            if (node) viewTabRefs.current.references = node;
          }}
          id="references-view-tab"
          className="review-workspace-tabs__tab"
          type="button"
          role="tab"
          aria-selected={activeView === 'references'}
          aria-controls="references-view-panel"
          tabIndex={activeView === 'references' ? 0 : -1}
          onClick={() => selectView('references')}
          onKeyDown={(event) => handleViewKeyDown(event, 'references')}
        >
          References ({referenceCount})
        </button>
        <button
          ref={(node) => {
            if (node) viewTabRefs.current.summary = node;
          }}
          id="summary-view-tab"
          className="review-workspace-tabs__tab"
          type="button"
          role="tab"
          aria-selected={activeView === 'summary'}
          aria-controls="summary-view-panel"
          tabIndex={activeView === 'summary' ? 0 : -1}
          onClick={() => selectView('summary')}
          onKeyDown={(event) => handleViewKeyDown(event, 'summary')}
        >
          Batch summary
        </button>
        <button
          ref={(node) => {
            if (node) viewTabRefs.current.decision = node;
          }}
          id="decision-view-tab"
          className="review-workspace-tabs__tab"
          type="button"
          role="tab"
          aria-selected={activeView === 'decision'}
          aria-controls="decision-view-panel"
          tabIndex={activeView === 'decision' ? 0 : -1}
          onClick={() => selectView('decision')}
          onKeyDown={(event) => handleViewKeyDown(event, 'decision')}
        >
          Review decision
        </button>
      </div>

      <section
        id="review-view-panel"
        className="review-workspace-panel"
        role="tabpanel"
        aria-labelledby="review-view-tab"
        hidden={activeView !== 'review'}
      >
        {conflictItems.length > 0 ? (
          <section className="published-conflicts" aria-labelledby="published-conflicts-title">
            <div className="published-conflicts__heading">
              <div>
                <h2 id="published-conflicts-title">Published delivery conflicts</h2>
                <p>Resolve each conflict before the batch can be approved for publication.</p>
              </div>
              <strong>{report.reviewSummary.validation.conflicting} unresolved</strong>
            </div>
            {conflictItems.map((item) => (
              <PublishedConflictResolution
                key={item.ordinal}
                batchReference={batchReference}
                item={item}
                refresh={load}
                resolutionAvailable={report.batch.status === 'awaiting_review'}
              />
            ))}
          </section>
        ) : null}
        {report.participantOnboarding.length > 0 ? (
          <ParticipantOnboarding
            batchReference={batchReference}
            tasks={report.participantOnboarding}
            decisionsAvailable={report.batch.status === 'awaiting_review'}
            refresh={load}
            onSettled={setFeedback}
          />
        ) : null}
        <ReferenceReview
          batchReference={batchReference}
          report={report}
          refresh={load}
          view="actions"
        />
        {actionCount === 0 ? (
          <button
            className="button button--primary"
            type="button"
            onClick={() => selectView('decision', true)}
          >
            Continue to review decision
          </button>
        ) : null}
      </section>

      <section
        id="references-view-panel"
        className="review-workspace-panel"
        role="tabpanel"
        aria-labelledby="references-view-tab"
        hidden={activeView !== 'references'}
      >
        <ReferenceReview
          batchReference={batchReference}
          report={report}
          refresh={load}
          view="references"
        />
        {report.pagination.nextCursor ? (
          <section aria-labelledby="report-results-title">
            <h2 id="report-results-title">Report results</h2>
            <button
              className="button button--secondary"
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? 'Loading…' : 'Load more report results'}
            </button>
          </section>
        ) : null}
      </section>

      <section
        id="summary-view-panel"
        className="review-workspace-panel"
        role="tabpanel"
        aria-labelledby="summary-view-tab"
        hidden={activeView !== 'summary'}
      >
        <SourceMetadata batch={report.batch} />
        <section aria-labelledby="review-summary-title">
          <h2 id="review-summary-title">Validation and reference summary</h2>
          <div className="state-message batch-counts__explanation">
            <strong>Counts describe overlapping categories.</strong>
            <p>
              The same {report.batch.progress.total} submitted{' '}
              {report.batch.progress.total === 1 ? 'item' : 'items'} can be both rejected and{' '}
              unresolved. Do not add these counts together.
            </p>
          </div>
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
              <dt>Candidate matches</dt>
              <dd>{report.reviewSummary.resolution.proposed}</dd>
            </div>
            <div>
              <dt>New-fixture proposals requiring review</dt>
              <dd>{newFixtureProposalCount}</dd>
            </div>
          </dl>
        </section>
        <ErrorGroups report={report} />
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
                    {fixture.total} items · {fixture.accepted} accepted · {fixture.rejected}{' '}
                    rejected · {fixture.unresolved} unresolved
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="review-scope-note">
            Fixture totals are submitted items. Rejected and unresolved are overlapping labels, not
            additional items.
          </p>
          <details className="resolved-content">
            <summary>
              Show resolved content ({report.reviewSummary.resolution.resolved} resolved references)
            </summary>
            <h3>Accepted content sample</h3>
            <p>
              Showing at most 15 accepted items; the full season-scale dataset is never rendered
              here.
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
          </details>
        </section>
      </section>

      <section
        id="decision-view-panel"
        className="review-workspace-panel"
        role="tabpanel"
        aria-labelledby="decision-view-tab"
        hidden={activeView !== 'decision'}
      >
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
                Reject submission
              </button>
            </div>
          </section>
        ) : (
          <div>
            <p>
              This submission is no longer awaiting a decision. Duplicate or competing actions are
              not submitted.
            </p>
            <Link className="button button--secondary" to="/reviews/batches">
              Return to review queue
            </Link>
          </div>
        )}
      </section>
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
  const location = useLocation();
  useEffect(() => {
    document.title = `${batchReference ? 'Review submission' : 'Review queue'} | Stat'sTheGame`;
  }, [batchReference]);
  if (!isLoading && !isAuthenticated)
    return <Navigate to={signInPathFor(`${location.pathname}${location.search}`)} replace />;
  return (
    <section className="review-workspace content-boundary" aria-labelledby="review-workspace-title">
      <Breadcrumbs
        items={
          batchReference
            ? [
                { label: 'Manage Submission', to: '/reviews/batches' },
                { label: 'Review', to: '/reviews/batches' },
                { label: 'Submission', to: '#' },
              ]
            : [
                { label: 'Manage Submission', to: '/reviews/batches' },
                { label: 'Review queue', to: '#' },
              ]
        }
      />
      <header className="page-heading review-workspace__heading">
        <p className="eyebrow">Manage Submission</p>
        <h1 id="review-workspace-title">
          {batchReference ? 'Review staged submission' : 'Review queue'}
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
