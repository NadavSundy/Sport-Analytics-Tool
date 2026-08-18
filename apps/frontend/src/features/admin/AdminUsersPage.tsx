import type {
  AdministratorCompetitionScope,
  AdministratorManagedUser,
  AdministratorSubmitterAccessUpdate,
} from '@sport-analytics/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  AdminUserManagementContractError,
  getAdministratorUserManagement,
  rejectAdministratorSubmitterAccessRequest,
  updateAdministratorSubmitterAccess,
} from './admin-api';

interface ManagementData {
  users: AdministratorManagedUser[];
  availableScopes: AdministratorCompetitionScope[];
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: ManagementData };

type Feedback = { userId: string; kind: 'success' | 'error'; message: string } | undefined;

type PendingAction =
  { userId: string; kind: 'approve' | 'reject' | 'scope' | 'revoke' } | undefined;

const roleLabels: Record<AdministratorManagedUser['role'], string> = {
  viewer: 'Viewer',
  submitter: 'Submitter',
  admin: 'Administrator',
};

const approvalLabels: Record<AdministratorManagedUser['approvalState'], string> = {
  not_requested: 'Not requested',
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Not approved',
};

function usePageTitle() {
  useEffect(() => {
    document.title = "Manage Users | Stat'sTheGame";
  }, []);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiResponseError && error.kind === 'unauthenticated') {
    return 'Your session is no longer valid. Sign in again to continue.';
  }

  if (error instanceof ApiResponseError || error instanceof AdminUserManagementContractError) {
    return error.message;
  }

  return 'User management could not be loaded. Please try again.';
}

function userLabel(user: AdministratorManagedUser): string {
  return user.displayName ?? `Account ${user.id}`;
}

function accessAudit(user: AdministratorManagedUser): string | null {
  if (!user.submitterAccessUpdatedAt) {
    return null;
  }

  const actor = user.submitterAccessUpdatedBy
    ? (user.submitterAccessUpdatedBy.displayName ?? `Account ${user.submitterAccessUpdatedBy.id}`)
    : 'a former administrator';

  return `${new Date(user.submitterAccessUpdatedAt).toLocaleString()} by ${actor}`;
}

interface ManagedUserCardProps {
  user: AdministratorManagedUser;
  availableScopes: AdministratorCompetitionScope[];
  pendingAction: PendingAction;
  feedback: Feedback;
  onUpdate: (
    user: AdministratorManagedUser,
    update: AdministratorSubmitterAccessUpdate,
    kind: NonNullable<PendingAction>['kind'],
  ) => Promise<void>;
}

function ManagedUserCard({
  user,
  availableScopes,
  pendingAction,
  feedback,
  onUpdate,
}: ManagedUserCardProps) {
  const assignedIds = useMemo(
    () => user.competitionScopes.map((scope) => scope.competitionId),
    [user.competitionScopes],
  );
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>(assignedIds);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const isBusy = pendingAction?.userId === user.id;
  const isSubmitter = user.role === 'submitter' && user.approvalState === 'approved';
  const hasPendingRequest = user.role === 'viewer' && user.approvalState === 'pending';
  const isManageable = user.role !== 'admin' && !user.disabled;
  const canManageAccess = isManageable && (isSubmitter || hasPendingRequest);
  const audit = accessAudit(user);
  const selectionChanged =
    [...selectedScopeIds].sort().join(',') !== [...assignedIds].sort().join(',');

  useEffect(() => {
    setSelectedScopeIds(assignedIds);
    setSelectionError(null);
  }, [assignedIds]);

  function toggleScope(competitionId: string) {
    setSelectionError(null);
    setSelectedScopeIds((current) =>
      current.includes(competitionId)
        ? current.filter((id) => id !== competitionId)
        : [...current, competitionId],
    );
  }

  async function saveAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedScopeIds.length === 0) {
      setSelectionError('Select at least one competition scope.');
      return;
    }

    await onUpdate(
      user,
      { approved: true, competitionIds: selectedScopeIds },
      isSubmitter ? 'scope' : 'approve',
    );
  }

  return (
    <article className="admin-user-card" aria-labelledby={`admin-user-${user.id}`}>
      <header className="admin-user-card__header">
        <div>
          <p className="admin-user-card__id">Account {user.id}</p>
          <h2 id={`admin-user-${user.id}`}>{userLabel(user)}</h2>
        </div>
        <span className={`admin-role-badge admin-role-badge--${user.role}`}>
          {roleLabels[user.role]}
        </span>
      </header>

      <dl className="admin-user-facts">
        <div>
          <dt>Role</dt>
          <dd>{roleLabels[user.role]}</dd>
        </div>
        <div>
          <dt>Approval</dt>
          <dd>{approvalLabels[user.approvalState]}</dd>
        </div>
        <div>
          <dt>Competition scope</dt>
          <dd>
            {user.competitionScopes.length > 0
              ? user.competitionScopes.map((scope) => scope.name).join(', ')
              : 'None assigned'}
          </dd>
        </div>
        <div>
          <dt>Account state</dt>
          <dd>{user.disabled ? 'Disabled' : 'Active'}</dd>
        </div>
        {audit ? (
          <div className="admin-user-facts__audit">
            <dt>Last access change</dt>
            <dd>{audit}</dd>
          </div>
        ) : null}
      </dl>

      {canManageAccess ? (
        <form className="admin-access-form" onSubmit={(event) => void saveAccess(event)}>
          <fieldset disabled={isBusy} aria-describedby={`scope-help-${user.id}`}>
            <legend>{isSubmitter ? 'Update competition scope' : 'Approve and assign scope'}</legend>
            <p id={`scope-help-${user.id}`} className="field-help">
              Submission permission takes effect only for the selected competitions.
            </p>
            {availableScopes.length > 0 ? (
              <div className="admin-scope-options">
                {availableScopes.map((scope) => (
                  <label key={scope.competitionId}>
                    <input
                      type="checkbox"
                      checked={selectedScopeIds.includes(scope.competitionId)}
                      onChange={() => toggleScope(scope.competitionId)}
                    />
                    <span>{scope.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="admin-access-form__empty" role="status">
                No competition scopes are available. This user cannot be approved yet.
              </p>
            )}
          </fieldset>

          {selectionError ? (
            <p className="admin-access-form__error" role="alert">
              {selectionError}
            </p>
          ) : null}

          <div className="admin-access-form__actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={
                isBusy || availableScopes.length === 0 || (isSubmitter && !selectionChanged)
              }
            >
              {isBusy && pendingAction.kind !== 'revoke'
                ? isSubmitter
                  ? 'Saving scope...'
                  : 'Approving submitter...'
                : isSubmitter
                  ? 'Save scope changes'
                  : 'Approve submitter'}
            </button>
            {isSubmitter ? (
              <button
                className="button button--danger"
                type="button"
                disabled={isBusy}
                onClick={() =>
                  void onUpdate(user, { approved: false, competitionIds: [] }, 'revoke')
                }
              >
                {isBusy && pendingAction.kind === 'revoke'
                  ? 'Revoking access...'
                  : 'Revoke submitter access'}
              </button>
            ) : hasPendingRequest ? (
              <button
                className="button button--danger"
                type="button"
                disabled={isBusy}
                onClick={() =>
                  void onUpdate(user, { approved: false, competitionIds: [] }, 'reject')
                }
              >
                {isBusy && pendingAction.kind === 'reject'
                  ? 'Rejecting request...'
                  : 'Reject request'}
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="admin-user-card__protected" role="status">
          {user.role === 'admin'
            ? 'Administrator accounts are protected from submitter access changes.'
            : user.disabled
              ? 'Disabled accounts cannot receive submitter access changes.'
              : user.approvalState === 'not_requested'
                ? 'No submitter access request has been made.'
                : user.approvalState === 'rejected'
                  ? 'This request was rejected. The user must make a new request before approval.'
                  : user.approvalState === 'approved'
                    ? "This account's previously approved submitter access has been revoked."
                    : 'This account has no actionable pending submitter request.'}
        </p>
      )}

      {feedback?.userId === user.id ? (
        <p
          className={`admin-access-feedback admin-access-feedback--${feedback.kind}`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}
    </article>
  );
}

export function AdminUsersPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const client = useAuthenticatedApiClient();
  const [pageState, setPageState] = useState<PageState>({ kind: 'loading' });
  const [filter, setFilter] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>();
  const [feedback, setFeedback] = useState<Feedback>();

  usePageTitle();

  const loadUsers = useCallback(
    async (signal?: AbortSignal) => {
      setPageState({ kind: 'loading' });
      setFeedback(undefined);

      try {
        const profile = await getCurrentUserProfile(client, signal);

        if (profile.role !== 'admin') {
          setPageState({ kind: 'forbidden' });
          return;
        }

        const data = await getAdministratorUserManagement(client, signal);
        setPageState({ kind: 'ready', data });
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        if (error instanceof ApiResponseError && error.kind === 'forbidden') {
          setPageState({ kind: 'forbidden' });
          return;
        }

        setPageState({ kind: 'error', message: errorMessage(error) });
      }
    },
    [client],
  );

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();
    void loadUsers(controller.signal);

    return () => controller.abort();
  }, [isAuthenticated, isLoading, loadUsers]);

  async function updateAccess(
    user: AdministratorManagedUser,
    update: AdministratorSubmitterAccessUpdate,
    kind: NonNullable<PendingAction>['kind'],
  ) {
    setPendingAction({ userId: user.id, kind });
    setFeedback(undefined);

    try {
      const updatedUser =
        kind === 'reject'
          ? await rejectAdministratorSubmitterAccessRequest(client, user.id)
          : await updateAdministratorSubmitterAccess(client, user.id, update);

      setPageState((current) =>
        current.kind === 'ready'
          ? {
              kind: 'ready',
              data: {
                ...current.data,
                users: current.data.users.map((candidate) =>
                  candidate.id === updatedUser.id ? updatedUser : candidate,
                ),
              },
            }
          : current,
      );
      setFeedback({
        userId: user.id,
        kind: 'success',
        message:
          kind === 'revoke'
            ? `Submitter access was revoked for ${userLabel(user)}.`
            : kind === 'reject'
              ? `Submitter request was rejected for ${userLabel(user)}.`
              : kind === 'scope'
                ? `Competition scope was updated for ${userLabel(user)}.`
                : `${userLabel(user)} is now an approved submitter.`,
      });
    } catch (error) {
      setFeedback({
        userId: user.id,
        kind: 'error',
        message:
          error instanceof ApiResponseError || error instanceof AdminUserManagementContractError
            ? error.message
            : 'The submitter access change could not be saved. Please try again.',
      });
    } finally {
      setPendingAction(undefined);
    }
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  const normalizedFilter = filter.trim().toLocaleLowerCase();
  const visibleUsers =
    pageState.kind === 'ready'
      ? pageState.data.users.filter((user) => {
          if (!normalizedFilter) {
            return true;
          }

          return [
            user.displayName,
            user.id,
            roleLabels[user.role],
            approvalLabels[user.approvalState],
            ...user.competitionScopes.map((scope) => scope.name),
          ]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase().includes(normalizedFilter));
        })
      : [];

  return (
    <section className="admin-users-page content-boundary" aria-labelledby="admin-users-title">
      <header className="page-heading admin-users-page__heading">
        <p className="eyebrow">Administrator workspace</p>
        <h1 id="admin-users-title">User Access Management</h1>
        <p>
          Review registered accounts, approve or revoke submitters, and keep every contributor
          within a defined competition scope.
        </p>
      </header>

      {isLoading || pageState.kind === 'loading' ? (
        <div className="state-message" role="status">
          <h2>Loading registered users</h2>
          <p>Checking administrator permission and current access assignments...</p>
        </div>
      ) : pageState.kind === 'forbidden' ? (
        <div className="state-message state-message--error" role="alert">
          <h2>Administrator access required</h2>
          <p>Your signed-in account cannot view or change user access.</p>
        </div>
      ) : pageState.kind === 'error' ? (
        <div className="state-message state-message--error" role="alert">
          <h2>User management could not be loaded</h2>
          <p>{pageState.message}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void loadUsers()}
          >
            Retry loading users
          </button>
        </div>
      ) : (
        <>
          <div className="admin-user-toolbar">
            <div>
              <label htmlFor="admin-user-filter">Find a registered user</label>
              <input
                id="admin-user-filter"
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Name, account, role, or competition"
              />
            </div>
            <p role="status">
              Showing {visibleUsers.length} of {pageState.data.users.length}{' '}
              {pageState.data.users.length === 1 ? 'user' : 'users'}
            </p>
          </div>

          {visibleUsers.length > 0 ? (
            <div className="admin-user-list">
              {visibleUsers.map((user) => (
                <ManagedUserCard
                  key={user.id}
                  user={user}
                  availableScopes={pageState.data.availableScopes}
                  pendingAction={pendingAction}
                  feedback={feedback}
                  onUpdate={updateAccess}
                />
              ))}
            </div>
          ) : (
            <div className="state-message" role="status">
              <h2>No matching users</h2>
              <p>Change the filter to see other registered accounts.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
