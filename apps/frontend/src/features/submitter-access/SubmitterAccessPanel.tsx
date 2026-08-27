import type { Competition, CurrentUserProfile } from '@sport-analytics/contracts';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiResponseError } from '../../api/client';
import { CurrentUserContractError, getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  listRequestableCompetitions,
  requestSubmitterAccess,
  SubmitterAccessCompetitionOptionsError,
  SubmitterAccessContractError,
} from './submitter-access-api';

type ProfileState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; profile: CurrentUserProfile; competitions: Competition[] };

type Feedback = { kind: 'success' | 'error'; message: string } | null;

function hasSubmissionRole(profile: CurrentUserProfile): boolean {
  return profile.role === 'submitter' || profile.role === 'admin';
}

function canRequestAccess(profile: CurrentUserProfile): boolean {
  return (
    profile.role === 'viewer' &&
    (profile.approvalState === 'not_requested' || profile.approvalState === 'rejected')
  );
}

function profileErrorMessage(error: unknown): string {
  if (error instanceof ApiResponseError && error.kind === 'unauthenticated') {
    return 'Your session is no longer valid. Sign in again to check your submitter status.';
  }

  if (error instanceof CurrentUserContractError) {
    return error.message;
  }

  if (error instanceof SubmitterAccessCompetitionOptionsError) {
    return error.message;
  }

  return 'Your submitter status could not be loaded. Please try again.';
}

function requestErrorMessage(error: unknown): string {
  if (error instanceof ApiResponseError && error.kind === 'unauthenticated') {
    return 'Your session is no longer valid. Sign in again before requesting access.';
  }

  if (error instanceof ApiResponseError || error instanceof SubmitterAccessContractError) {
    return error.message;
  }

  return 'Your request could not be submitted. Please try again.';
}

export function SubmitterAccessPanel() {
  const client = useAuthenticatedApiClient();
  const [profileState, setProfileState] = useState<ProfileState>({ kind: 'loading' });
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const loadProfile = useCallback(
    async (signal?: AbortSignal) => {
      setProfileState({ kind: 'loading' });

      try {
        const profile = await getCurrentUserProfile(client, signal);
        const competitions = canRequestAccess(profile)
          ? await listRequestableCompetitions(signal)
          : [];
        const requestedCompetitionId = profile.requestedCompetition?.competitionId;
        const initialCompetitionId =
          competitions.find((competition) => competition.competitionId === requestedCompetitionId)
            ?.competitionId ??
          competitions[0]?.competitionId ??
          '';

        setSelectedCompetitionId(initialCompetitionId);
        setProfileState({ kind: 'ready', profile, competitions });
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        setProfileState({ kind: 'error', message: profileErrorMessage(error) });
      }
    },
    [client],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(controller.signal);

    return () => controller.abort();
  }, [loadProfile]);

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (profileState.kind !== 'ready' || !selectedCompetitionId) {
      return;
    }

    const existingProfile = profileState.profile;
    const existingCompetitions = profileState.competitions;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await requestSubmitterAccess(client, selectedCompetitionId);
      setProfileState({
        kind: 'ready',
        profile: {
          ...existingProfile,
          approvalState: 'pending',
          requestedCompetition: result.data.requestedCompetition,
        },
        competitions: existingCompetitions,
      });
      setFeedback({
        kind: 'success',
        message: `Your request for ${result.data.requestedCompetition.name} was submitted and is now awaiting administrator approval.`,
      });

      try {
        const persistedProfile = await getCurrentUserProfile(client);
        setProfileState({
          kind: 'ready',
          profile: persistedProfile,
          competitions: existingCompetitions,
        });
      } catch {
        setFeedback({
          kind: 'success',
          message:
            'Your request was saved, but the latest account profile could not be refreshed. Reload the page to check it again.',
        });
      }
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 409) {
        try {
          const persistedProfile = await getCurrentUserProfile(client);
          setProfileState({
            kind: 'ready',
            profile: persistedProfile,
            competitions: existingCompetitions,
          });

          if (
            hasSubmissionRole(persistedProfile) ||
            persistedProfile.approvalState === 'pending' ||
            persistedProfile.approvalState === 'approved'
          ) {
            setFeedback({
              kind: 'success',
              message: 'Your submitter status changed and has been refreshed from your account.',
            });
            return;
          }
        } catch {
          // Keep the original, safe conflict response when the latest profile
          // cannot be loaded.
        }
      }

      setFeedback({ kind: 'error', message: requestErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="submitter-access-panel" aria-labelledby="submitter-access-title">
      <div className="submitter-access-panel__heading">
        <div>
          <p className="eyebrow">Cricket event contribution</p>
          <h2 id="submitter-access-title">Submitter access</h2>
        </div>
        {profileState.kind === 'ready' ? (
          <p
            className={`submitter-access-state submitter-access-state--${
              profileState.profile.role === 'viewer'
                ? profileState.profile.approvalState
                : profileState.profile.role
            }`}
          >
            {profileState.profile.role === 'admin'
              ? 'Admin'
              : profileState.profile.role === 'submitter'
                ? 'Submitter'
                : profileState.profile.approvalState === 'not_requested'
                  ? 'Not requested'
                  : profileState.profile.approvalState === 'pending'
                    ? 'Pending approval'
                    : profileState.profile.approvalState === 'approved'
                      ? 'Approved'
                      : 'Not approved'}
          </p>
        ) : null}
      </div>

      {profileState.kind === 'loading' ? (
        <p className="submitter-access-panel__message" role="status">
          Loading your persisted submitter status…
        </p>
      ) : profileState.kind === 'error' ? (
        <div className="submitter-access-panel__error" role="alert">
          <p>{profileState.message}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void loadProfile()}
          >
            Retry status check
          </button>
        </div>
      ) : hasSubmissionRole(profileState.profile) ? (
        <div className="submitter-access-panel__message">
          <p>
            Your account has submission access. Submissions remain limited to the competitions
            assigned by an administrator.
          </p>
          <div className="submitter-access-panel__actions">
            <Link className="button button--primary" to="/submissions/new">
              Submit events
            </Link>
            {profileState.profile.role === 'admin' ? (
              <Link className="button button--secondary" to="/admin/users">
                Manage users
              </Link>
            ) : null}
          </div>
        </div>
      ) : profileState.profile.approvalState === 'pending' ? (
        <p className="submitter-access-panel__message" role="status">
          Your request
          {profileState.profile.requestedCompetition
            ? ` for ${profileState.profile.requestedCompetition.name}`
            : ''}{' '}
          is awaiting administrator review. You cannot submit another request while this one is
          pending.
        </p>
      ) : profileState.profile.approvalState === 'approved' ? (
        <p className="submitter-access-panel__message" role="status">
          Your previously approved submitter access has been revoked. Your account no longer permits
          submissions.
        </p>
      ) : (
        <div className="submitter-access-panel__message">
          <p>
            {profileState.profile.approvalState === 'rejected'
              ? 'Your previous request was declined. You can send a new request for review.'
              : 'Request permission to contribute cricket delivery-event data for one competition. An administrator will review the requested competition scope.'}
          </p>
          {profileState.competitions.length > 0 ? (
            <form
              className="submitter-access-request"
              onSubmit={(event) => void handleRequest(event)}
            >
              <label htmlFor="submitter-access-competition">Competition</label>
              <select
                id="submitter-access-competition"
                value={selectedCompetitionId}
                onChange={(event) => setSelectedCompetitionId(event.target.value)}
                disabled={isSubmitting}
              >
                {profileState.competitions.map((competition) => (
                  <option key={competition.competitionId} value={competition.competitionId}>
                    {competition.name}
                  </option>
                ))}
              </select>
              <p className="field-help">
                Approval grants submission access only within this competition.
              </p>
              <button
                className="button button--primary"
                type="submit"
                disabled={isSubmitting || !selectedCompetitionId}
              >
                {isSubmitting ? 'Requesting access…' : 'Request submitter access'}
              </button>
            </form>
          ) : (
            <p className="submitter-access-panel__empty" role="status">
              No competitions are currently available for an access request.
            </p>
          )}
        </div>
      )}

      {feedback ? (
        <p
          className={
            feedback.kind === 'error'
              ? 'submitter-access-feedback submitter-access-feedback--error'
              : 'submitter-access-feedback'
          }
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
