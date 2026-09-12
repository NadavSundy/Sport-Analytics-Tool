import type {
  AdministratorCompetitionScope,
  AdministratorManagedUser,
  AdministratorSubmitterAccessUpdate,
} from '@sport-analytics/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  updateAdministratorUserRole,
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
type ActionKind = 'promote' | 'approve' | 'reject' | 'scope' | 'revoke';
type PendingAction = { userId: string; kind: ActionKind } | undefined;
type Feedback = { userId: string; kind: 'success' | 'error'; message: string } | undefined;
type RoleFilter = 'all' | AdministratorManagedUser['role'];
type ApprovalFilter = 'all' | AdministratorManagedUser['approvalState'];

const roleLabels: Record<AdministratorManagedUser['role'], string> = {
  viewer: 'Viewer',
  submitter: 'Submitter',
  admin: 'Administrator',
};
const approvalLabels: Record<AdministratorManagedUser['approvalState'], string> = {
  not_requested: 'Not requested',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
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
  return user.displayName ?? user.email;
}

function scopeLabel(user: AdministratorManagedUser): string {
  if (user.role === 'admin') return 'All competitions';
  if (user.competitionScopes.length > 0) {
    return user.competitionScopes.map((scope) => scope.name).join(', ');
  }
  return user.requestedCompetition?.name ?? 'None assigned';
}

function hasPendingAdditionalScopeRequest(user: AdministratorManagedUser): boolean {
  return Boolean(
    user.role === 'submitter' &&
    user.approvalState === 'approved' &&
    user.requestedCompetition &&
    !user.competitionScopes.some(
      (scope) => scope.competitionId === user.requestedCompetition?.competitionId,
    ),
  );
}

function StatusBadge({ user }: { user: AdministratorManagedUser }) {
  const pendingAdditionalScope = hasPendingAdditionalScopeRequest(user);
  const relevant = user.role === 'submitter' || user.approvalState !== 'not_requested';
  return relevant ? (
    <span
      className={`admin-status-badge admin-status-badge--${pendingAdditionalScope ? 'pending' : user.approvalState}`}
    >
      {pendingAdditionalScope ? 'Scope request pending' : approvalLabels[user.approvalState]}
    </span>
  ) : (
    <span className="admin-status-badge admin-status-badge--neutral">Not requested</span>
  );
}

interface ManageDialogProps {
  user: AdministratorManagedUser;
  availableScopes: AdministratorCompetitionScope[];
  pendingAction: PendingAction;
  feedback: Feedback;
  onClose: () => void;
  onUpdateAccess: (
    user: AdministratorManagedUser,
    update: AdministratorSubmitterAccessUpdate,
    kind: Exclude<ActionKind, 'promote'>,
  ) => Promise<void>;
  onPromote: (user: AdministratorManagedUser) => Promise<void>;
}

function ManageDialog({
  user,
  availableScopes,
  pendingAction,
  feedback,
  onClose,
  onUpdateAccess,
  onPromote,
}: ManageDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const confirmationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const assignedIds = useMemo(
    () => user.competitionScopes.map((scope) => scope.competitionId),
    [user.competitionScopes],
  );
  const hasPendingRequest = user.role === 'viewer' && user.approvalState === 'pending';
  const isSubmitter = user.role === 'submitter' && user.approvalState === 'approved';
  const hasPendingAdditionalScopeRequestValue = hasPendingAdditionalScopeRequest(user);
  const requestedScopeIds = useMemo(
    () =>
      hasPendingAdditionalScopeRequestValue && user.requestedCompetition
        ? [...assignedIds, user.requestedCompetition.competitionId]
        : assignedIds,
    [assignedIds, hasPendingAdditionalScopeRequestValue, user.requestedCompetition],
  );
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>(
    hasPendingRequest && user.requestedCompetition
      ? [user.requestedCompetition.competitionId]
      : requestedScopeIds,
  );
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ActionKind | null>(null);
  const isBusy = pendingAction?.userId === user.id;
  const auditActor = user.submitterAccessUpdatedBy
    ? (user.submitterAccessUpdatedBy.displayName ?? `Account ${user.submitterAccessUpdatedBy.id}`)
    : 'a former administrator';

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedScopeIds(
      hasPendingRequest && user.requestedCompetition
        ? [user.requestedCompetition.competitionId]
        : requestedScopeIds,
    );
    setSelectionError(null);
    setConfirmation(null);
  }, [hasPendingRequest, requestedScopeIds, user.requestedCompetition]);

  useEffect(() => {
    if (confirmation) confirmRef.current?.focus();
  }, [confirmation]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !isBusy) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
    );
    if (!controls?.length) return;
    const first = controls[0]!;
    const last = controls[controls.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function toggleScope(id: string) {
    setSelectionError(null);
    setSelectedScopeIds((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
  }

  function requestConfirmation(kind: ActionKind, trigger: HTMLButtonElement) {
    confirmationTriggerRef.current = trigger;
    setConfirmation(kind);
  }

  function cancelConfirmation() {
    setConfirmation(null);
    requestAnimationFrame(() => confirmationTriggerRef.current?.focus());
  }

  function requestScopeSave(trigger: HTMLButtonElement) {
    if (selectedScopeIds.length === 0) {
      setSelectionError('Select at least one competition scope.');
      return;
    }
    requestConfirmation(isSubmitter ? 'scope' : 'approve', trigger);
  }

  async function confirmAction() {
    const action = confirmation;
    setConfirmation(null);
    if (!action) return;
    if (action === 'promote') {
      await onPromote(user);
    } else if (action === 'reject') {
      await onUpdateAccess(user, { approved: false, competitionIds: [] }, 'reject');
    } else if (action === 'revoke') {
      await onUpdateAccess(user, { approved: false, competitionIds: [] }, 'revoke');
    } else {
      await onUpdateAccess(user, { approved: true, competitionIds: selectedScopeIds }, action);
    }
    closeRef.current?.focus();
  }

  const confirmationText =
    confirmation === 'promote'
      ? `Promote ${user.email} to Administrator? This grants full administrative access and cannot be undone here.`
      : confirmation === 'approve'
        ? `Approve ${user.email} as a submitter for ${user.requestedCompetition?.name ?? 'the requested competition'}?`
        : confirmation === 'reject'
          ? hasPendingAdditionalScopeRequestValue
            ? `Reject ${user.email}'s request for ${user.requestedCompetition?.name ?? 'the additional competition'} while keeping their existing competition access?`
            : `Reject the pending submitter request from ${user.email}?`
          : confirmation === 'revoke'
            ? `Revoke all submitter access and competition scopes from ${user.email}?`
            : confirmation === 'scope'
              ? hasPendingAdditionalScopeRequestValue
                ? `Approve ${user.email}'s additional scope request for ${user.requestedCompetition?.name ?? 'the requested competition'}?`
                : `Replace ${user.email}'s competition permissions with the selected scopes?`
              : null;

  return (
    <div
      className="admin-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="admin-manage-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <header className="admin-manage-dialog__header">
          <div>
            <p className="eyebrow">Manage account</p>
            <h2 id="admin-dialog-title">{userLabel(user)}</h2>
            <p>{user.email}</p>
          </div>
          <button
            ref={closeRef}
            className="button button--secondary"
            type="button"
            disabled={isBusy}
            onClick={onClose}
            aria-label={`Close management view for ${user.email}`}
          >
            Close
          </button>
        </header>

        <section className="admin-dialog-section" aria-labelledby="account-details-title">
          <h3 id="account-details-title">Account</h3>
          <dl className="admin-user-facts">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>{user.id}</dd>
            </div>
            <div>
              <dt>Account state</dt>
              <dd>{user.disabled ? 'Disabled' : 'Active'}</dd>
            </div>
            <div>
              <dt>Current role</dt>
              <dd>{roleLabels[user.role]}</dd>
            </div>
            <div>
              <dt>Submitter status</dt>
              <dd>{approvalLabels[user.approvalState]}</dd>
            </div>
            <div>
              <dt>Competition permissions</dt>
              <dd>{scopeLabel(user)}</dd>
            </div>
            {hasPendingAdditionalScopeRequestValue ? (
              <div>
                <dt>Pending additional scope request</dt>
                <dd>{user.requestedCompetition?.name}</dd>
              </div>
            ) : null}
            {user.submitterAccessUpdatedAt ? (
              <div className="admin-user-facts__audit">
                <dt>Last access change</dt>
                <dd>
                  {new Date(user.submitterAccessUpdatedAt).toLocaleString()} by {auditActor}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="admin-dialog-section" aria-labelledby="admin-actions-title">
          <h3 id="admin-actions-title">Administrative actions</h3>
          {user.disabled ? (
            <p className="admin-user-card__protected">
              Disabled accounts cannot receive access changes.
            </p>
          ) : user.role === 'admin' ? (
            <p className="admin-user-card__protected">
              Administrator accounts are protected from role and submitter access changes.
            </p>
          ) : (
            <>
              {(isSubmitter || hasPendingRequest) && (
                <fieldset className="admin-scope-fieldset" disabled={isBusy}>
                  <legend>{isSubmitter ? 'Competition scopes' : 'Requested competition'}</legend>
                  <p className="field-help">
                    {isSubmitter
                      ? hasPendingAdditionalScopeRequestValue
                        ? `The submitter requested ${user.requestedCompetition?.name}. Approval must include that competition and keeps access server-controlled.`
                        : 'Select every competition this user may submit data for.'
                      : 'Approval grants the competition selected in the user request.'}
                  </p>
                  {isSubmitter ? (
                    availableScopes.length > 0 ? (
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
                      <p>No competition scopes are available.</p>
                    )
                  ) : (
                    <p>
                      <strong>
                        {user.requestedCompetition?.name ?? 'No competition supplied'}
                      </strong>
                    </p>
                  )}
                  {selectionError ? (
                    <p className="admin-access-form__error" role="alert">
                      {selectionError}
                    </p>
                  ) : null}
                  <div className="admin-access-form__actions">
                    <button
                      className="button button--primary"
                      type="button"
                      disabled={isBusy || (!isSubmitter && !user.requestedCompetition)}
                      onClick={(event) => requestScopeSave(event.currentTarget)}
                    >
                      {isSubmitter
                        ? hasPendingAdditionalScopeRequestValue
                          ? 'Approve additional scope'
                          : 'Save scope changes'
                        : 'Approve submitter'}
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      disabled={isBusy}
                      onClick={(event) =>
                        requestConfirmation(
                          isSubmitter && !hasPendingAdditionalScopeRequestValue
                            ? 'revoke'
                            : 'reject',
                          event.currentTarget,
                        )
                      }
                    >
                      {isSubmitter
                        ? hasPendingAdditionalScopeRequestValue
                          ? 'Reject scope request'
                          : 'Revoke submitter access'
                        : 'Reject request'}
                    </button>
                  </div>
                </fieldset>
              )}
              {!isSubmitter && !hasPendingRequest ? (
                <p className="admin-user-card__protected">
                  No submitter request is currently available to manage.
                </p>
              ) : null}
              <div className="admin-role-action">
                <h4>Administrator role</h4>
                <p>
                  Promotion grants full user-management access. Viewer and Submitter changes use the
                  approval workflow above.
                </p>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={isBusy}
                  onClick={(event) => requestConfirmation('promote', event.currentTarget)}
                >
                  Promote to Administrator
                </button>
              </div>
            </>
          )}
        </section>

        {confirmationText ? (
          <div
            className="admin-confirmation"
            role="alertdialog"
            aria-labelledby="admin-confirmation-title"
          >
            <h3 id="admin-confirmation-title">Confirm access change</h3>
            <p>{confirmationText}</p>
            <div className="admin-access-form__actions">
              <button
                ref={confirmRef}
                className="button button--danger"
                type="button"
                onClick={() => void confirmAction()}
              >
                Confirm change
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={cancelConfirmation}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {isBusy ? (
          <p role="status" aria-live="polite">
            Saving access change. Please wait.
          </p>
        ) : null}
        {feedback?.userId === user.id ? (
          <p
            className={`admin-access-feedback admin-access-feedback--${feedback.kind}`}
            role={feedback.kind === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const client = useAuthenticatedApiClient();
  const [pageState, setPageState] = useState<PageState>({ kind: 'loading' });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>();
  const [feedback, setFeedback] = useState<Feedback>();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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
        setPageState({ kind: 'ready', data: await getAdministratorUserManagement(client, signal) });
      } catch (error) {
        if (signal?.aborted) return;
        if (error instanceof ApiResponseError && error.kind === 'forbidden') {
          setPageState({ kind: 'forbidden' });
        } else {
          setPageState({ kind: 'error', message: errorMessage(error) });
        }
      }
    },
    [client],
  );

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, isLoading, loadUsers]);

  function replaceUser(updatedUser: AdministratorManagedUser) {
    setPageState((current) =>
      current.kind === 'ready'
        ? {
            kind: 'ready',
            data: {
              ...current.data,
              users: current.data.users.map((user) =>
                user.id === updatedUser.id ? updatedUser : user,
              ),
            },
          }
        : current,
    );
  }

  async function updateAccess(
    user: AdministratorManagedUser,
    update: AdministratorSubmitterAccessUpdate,
    kind: Exclude<ActionKind, 'promote'>,
  ) {
    setPendingAction({ userId: user.id, kind });
    setFeedback(undefined);
    try {
      const updated =
        kind === 'reject'
          ? await rejectAdministratorSubmitterAccessRequest(client, user.id)
          : await updateAdministratorSubmitterAccess(client, user.id, update);
      replaceUser(updated);
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
      setFeedback({ userId: user.id, kind: 'error', message: errorMessage(error) });
    } finally {
      setPendingAction(undefined);
    }
  }

  async function promote(user: AdministratorManagedUser) {
    setPendingAction({ userId: user.id, kind: 'promote' });
    setFeedback(undefined);
    try {
      replaceUser(await updateAdministratorUserRole(client, user.id, { role: 'admin' }));
      setFeedback({
        userId: user.id,
        kind: 'success',
        message: `${userLabel(user)} is now an Administrator.`,
      });
    } catch (error) {
      setFeedback({ userId: user.id, kind: 'error', message: errorMessage(error) });
    } finally {
      setPendingAction(undefined);
    }
  }

  function openManagement(userId: string, trigger: HTMLElement) {
    returnFocusRef.current = trigger;
    setFeedback(undefined);
    setSelectedUserId(userId);
  }

  function closeManagement() {
    setSelectedUserId(null);
    setFeedback(undefined);
    requestAnimationFrame(() => {
      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus();
      } else {
        searchRef.current?.focus();
      }
    });
  }

  if (!isLoading && !isAuthenticated) return <Navigate to="/sign-in" replace />;

  const users = pageState.kind === 'ready' ? pageState.data.users : [];
  const query = search.trim().toLocaleLowerCase();
  const visibleUsers = users.filter(
    (user) =>
      (!query ||
        user.email.toLocaleLowerCase().includes(query) ||
        user.id.toLocaleLowerCase().includes(query)) &&
      (roleFilter === 'all' || user.role === roleFilter) &&
      (approvalFilter === 'all' || user.approvalState === approvalFilter),
  );
  const selectedUser = users.find((user) => user.id === selectedUserId);

  return (
    <section className="admin-users-page content-boundary" aria-labelledby="admin-users-title">
      <header className="page-heading admin-users-page__heading">
        <p className="eyebrow">Administrator workspace</p>
        <h1 id="admin-users-title">Manage users</h1>
        <p>
          Find accounts, understand access at a glance, and manage roles, requests, and competition
          permissions.
        </p>
      </header>

      {isLoading || pageState.kind === 'loading' ? (
        <div className="state-message" role="status">
          <h2>Loading registered users</h2>
          <p>Checking administrator permission and retrieving user access...</p>
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
      ) : users.length === 0 ? (
        <div className="state-message" role="status">
          <h2>No registered users</h2>
          <p>No user accounts are currently available to manage.</p>
        </div>
      ) : (
        <>
          <div className="admin-user-toolbar" aria-label="User list controls">
            <div className="admin-user-toolbar__search">
              <label htmlFor="admin-user-search">Search users</label>
              <input
                ref={searchRef}
                id="admin-user-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by email or user ID"
              />
            </div>
            <div>
              <label htmlFor="admin-role-filter">Role</label>
              <select
                id="admin-role-filter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              >
                <option value="all">All roles</option>
                <option value="viewer">Viewer</option>
                <option value="submitter">Submitter</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label htmlFor="admin-approval-filter">Submitter status</label>
              <select
                id="admin-approval-filter"
                value={approvalFilter}
                onChange={(event) => setApprovalFilter(event.target.value as ApprovalFilter)}
              >
                <option value="all">All statuses</option>
                <option value="not_requested">Not requested</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <p role="status">
              Showing {visibleUsers.length} of {users.length} users
            </p>
          </div>
          {visibleUsers.length === 0 ? (
            <div className="state-message" role="status">
              <h2>No users match the current search or filters.</h2>
              <p>Change or clear the search and filters to see other accounts.</p>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('all');
                  setApprovalFilter('all');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <caption className="visually-hidden">
                  Registered application users and their current access
                </caption>
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Role</th>
                    <th scope="col">Submitter status</th>
                    <th scope="col">Competition scope</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={
                        user.approvalState === 'pending'
                          ? 'admin-users-table__attention'
                          : undefined
                      }
                    >
                      <td data-label="User">
                        <strong>{user.email}</strong>
                        <span>
                          {user.displayName ?? 'No display name'} · ID {user.id}
                        </span>
                      </td>
                      <td data-label="Role">
                        <span className={`admin-role-badge admin-role-badge--${user.role}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td data-label="Submitter status">
                        <StatusBadge user={user} />
                        {user.previouslyRevoked ? (
                          <span className="admin-attention-label">Previously revoked</span>
                        ) : null}
                      </td>
                      <td data-label="Competition scope">{scopeLabel(user)}</td>
                      <td data-label="Actions">
                        <button
                          className="button button--secondary"
                          type="button"
                          aria-label={`Manage ${user.email}`}
                          onClick={(event) => openManagement(user.id, event.currentTarget)}
                        >
                          {user.approvalState === 'pending' ? 'Review' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedUser && pageState.kind === 'ready' ? (
        <ManageDialog
          user={selectedUser}
          availableScopes={pageState.data.availableScopes}
          pendingAction={pendingAction}
          feedback={feedback}
          onClose={closeManagement}
          onUpdateAccess={updateAccess}
          onPromote={promote}
        />
      ) : null}
    </section>
  );
}
