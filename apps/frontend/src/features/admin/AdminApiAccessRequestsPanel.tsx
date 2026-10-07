import type { AdministratorApiAccessRequest } from '@sport-analytics/contracts';
import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/Button';
import { Message } from '../../components/Message';
import { TextField } from '../../components/TextField';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import { decideApiAccessRequest, getPendingApiAccessRequests } from './admin-api';

type RejectionConfirmation = {
  form: HTMLFormElement;
  item: AdministratorApiAccessRequest;
};

export function AdminApiAccessRequestsPanel() {
  const client = useAuthenticatedApiClient();
  const [requests, setRequests] = useState<AdministratorApiAccessRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<RejectionConfirmation | null>(null);
  const rejectionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmRejectionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (rejection) confirmRejectionRef.current?.focus();
  }, [rejection]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRequests(await getPendingApiAccessRequests(client));
    } catch {
      setError('Pending API access requests could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function decide(
    item: AdministratorApiAccessRequest,
    decision: 'approved' | 'rejected',
    form: HTMLFormElement,
  ) {
    setBusy(item.id);
    setError(null);
    const data = new FormData(form);
    try {
      await decideApiAccessRequest(client, item.id, {
        decision,
        reviewReason: String(data.get('reviewReason') || '') || undefined,
        ...(decision === 'approved'
          ? {
              rateLimitPerMinute: Number(data.get('rateLimitPerMinute')),
              dailyQuota: Number(data.get('dailyQuota')),
            }
          : {}),
      });
      setRequests((current) => current?.filter(({ id }) => id !== item.id) ?? []);
      setRejection(null);
    } catch {
      setError(`The request for ${item.name} could not be ${decision}. Please try again.`);
    } finally {
      setBusy(null);
    }
  }

  function cancelRejection() {
    setRejection(null);
    requestAnimationFrame(() => rejectionTriggerRef.current?.focus());
  }

  return (
    <section
      className="api-consumer-panel api-access-review"
      aria-labelledby="access-requests-title"
    >
      <header className="api-access-review__header">
        <h2 id="access-requests-title">Pending API access requests</h2>
        <p>Review the intended use and set managed capacity before making a decision.</p>
      </header>
      {error ? (
        <Message variant="error">
          <p>{error}</p>
        </Message>
      ) : null}
      {requests === null ? (
        <Button variant="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Loading requests…' : 'Review pending requests'}
        </Button>
      ) : requests.length === 0 ? (
        <Message>
          <p>No pending API access requests.</p>
        </Message>
      ) : (
        <div className="api-access-review__list">
          {requests.map((item) => {
            const headingId = `api-access-request-${item.id}-title`;
            const reasonHelpId = `api-access-request-${item.id}-reason-help`;
            const confirmingRejection = rejection?.item.id === item.id;
            return (
              <article
                key={item.id}
                className="api-access-review__card ui-card"
                role="group"
                aria-labelledby={headingId}
              >
                <header className="api-access-review__card-header">
                  <div>
                    <h3 id={headingId}>{item.name}</h3>
                    <p className="api-access-review__metadata">
                      Requested by{' '}
                      <strong>{item.requester.displayName ?? 'Unnamed account'}</strong>
                    </p>
                    <p className="api-access-review__metadata">
                      <a href={`mailto:${item.requester.email}`}>{item.requester.email}</a>
                    </p>
                  </div>
                  <span className="api-access-review__status">Pending</span>
                </header>
                <section
                  className="api-access-review__intended-use"
                  aria-labelledby={`api-access-request-${item.id}-use-title`}
                >
                  <h4 id={`api-access-request-${item.id}-use-title`}>Intended use</h4>
                  <p>{item.intendedUse}</p>
                </section>
                <form
                  className="api-access-review__form"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <fieldset className="api-access-review__capacity">
                    <legend>Capacity</legend>
                    <div className="api-access-review__capacity-grid">
                      <TextField
                        id={`api-access-request-${item.id}-rate-limit`}
                        name="rateLimitPerMinute"
                        label="Requests per minute"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="10000"
                        defaultValue="60"
                        required
                      />
                      <TextField
                        id={`api-access-request-${item.id}-daily-quota`}
                        name="dailyQuota"
                        label="Requests per UTC day"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="10000"
                        defaultValue="10000"
                        required
                      />
                    </div>
                  </fieldset>
                  <div className="ui-field">
                    <label htmlFor={`api-access-request-${item.id}-reason`}>
                      Review reason (optional)
                    </label>
                    <textarea
                      className="ui-field__input api-access-review__reason"
                      id={`api-access-request-${item.id}-reason`}
                      name="reviewReason"
                      aria-describedby={reasonHelpId}
                      rows={4}
                      maxLength={500}
                    />
                    <p className="ui-field__help" id={reasonHelpId}>
                      This reason is recorded with the review decision.
                    </p>
                  </div>
                  <footer className="api-access-review__actions">
                    <Button
                      disabled={busy === item.id}
                      onClick={(event) => void decide(item, 'approved', event.currentTarget.form!)}
                    >
                      Approve request
                    </Button>
                    <Button
                      className="api-access-review__reject"
                      variant="secondary"
                      disabled={busy === item.id}
                      onClick={(event) => {
                        rejectionTriggerRef.current = event.currentTarget;
                        setRejection({ item, form: event.currentTarget.form! });
                      }}
                    >
                      Reject request
                    </Button>
                  </footer>
                </form>
                {confirmingRejection ? (
                  <div
                    className="admin-confirmation api-access-review__confirmation"
                    role="alertdialog"
                    aria-labelledby={`api-access-request-${item.id}-confirmation-title`}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && busy !== item.id) cancelRejection();
                    }}
                  >
                    <h4 id={`api-access-request-${item.id}-confirmation-title`}>
                      Reject API access request?
                    </h4>
                    <p>
                      This records a rejection for {item.name}. The requester may submit a new
                      request later.
                    </p>
                    <div className="api-access-review__confirmation-actions">
                      <Button
                        ref={confirmRejectionRef}
                        variant="destructive"
                        disabled={busy === item.id}
                        onClick={() => void decide(item, 'rejected', rejection.form)}
                      >
                        Confirm rejection
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy === item.id}
                        onClick={cancelRejection}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
