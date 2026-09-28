import { apiConsumerIssueSchema, type ApiConsumer } from '@sport-analytics/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { Breadcrumbs } from '../../components/NavigationPrimitives';
import { useAuth } from '../auth/AuthProvider';
import { signInPathFor } from '../auth/auth-return';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  AdminApiConsumerContractError,
  createAdministratorApiConsumer,
  getAdministratorApiConsumers,
  revokeAdministratorApiConsumerKey,
  rotateAdministratorApiConsumerKey,
} from './admin-api';

type PageState =
  | { kind: 'loading' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; consumers: ApiConsumer[] };

type OneTimeSecret = { apiKey: string; consumerName: string; reason: 'created' | 'rotated' };
type Confirmation =
  | { kind: 'rotate'; consumer: ApiConsumer }
  | { kind: 'revoke'; consumer: ApiConsumer; keyId: string; prefix: string };

interface FormErrors {
  name?: string | undefined;
  rateLimitPerMinute?: string | undefined;
  dailyQuota?: string | undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiResponseError || error instanceof AdminApiConsumerContractError) {
    return error.message;
  }
  return 'API consumer management could not be loaded. Please try again.';
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function activeKeys(consumer: ApiConsumer) {
  return consumer.keys.filter((key) => key.revokedAt === null);
}

function safeConsumer(result: ApiConsumer & { apiKey: string }): ApiConsumer {
  return {
    id: result.id,
    name: result.name,
    rateLimitPerMinute: result.rateLimitPerMinute,
    dailyQuota: result.dailyQuota,
    createdAt: result.createdAt,
    keys: result.keys,
  };
}

function DialogFrame({
  labelledBy,
  children,
  initialFocusRef,
  onClose,
  busy = false,
}: {
  labelledBy: string;
  children: React.ReactNode;
  initialFocusRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialFocusRef.current?.focus();
  }, [initialFocusRef]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
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

  return (
    <div className="admin-dialog-backdrop">
      <div
        ref={dialogRef}
        className="admin-manage-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}

function OneTimeKeyDialog({ secret, onDismiss }: { secret: OneTimeSecret; onDismiss: () => void }) {
  const dismissRef = useRef<HTMLButtonElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(secret.apiKey);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <DialogFrame
      labelledBy="one-time-api-key-title"
      initialFocusRef={dismissRef}
      onClose={onDismiss}
    >
      <header className="admin-manage-dialog__header">
        <div>
          <p className="eyebrow">One-time secret</p>
          <h2 id="one-time-api-key-title">
            API key {secret.reason === 'created' ? 'created' : 'rotated'}
          </h2>
        </div>
        <button
          ref={dismissRef}
          className="button button--secondary"
          type="button"
          onClick={onDismiss}
        >
          Dismiss key
        </button>
      </header>
      <div className="admin-dialog-section">
        <p className="state-message state-message--warning">
          This is the only time the complete key for <strong>{secret.consumerName}</strong> will be
          shown. Copy it into the consumer&apos;s secret manager before dismissing this view.
        </p>
        <pre className="api-consumer-secret" aria-label="New API key">
          <code>{secret.apiKey}</code>
        </pre>
        <button className="button button--primary" type="button" onClick={() => void copyKey()}>
          Copy API key
        </button>
        {copyState === 'success' ? (
          <p role="status" aria-live="polite">
            API key copied.
          </p>
        ) : copyState === 'error' ? (
          <p role="alert">The key could not be copied. Select and copy it before dismissing.</p>
        ) : null}
      </div>
    </DialogFrame>
  );
}

function ConfirmationDialog({
  confirmation,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  confirmation: Confirmation;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const rotate = confirmation.kind === 'rotate';
  return (
    <DialogFrame
      labelledBy="api-consumer-confirmation-title"
      initialFocusRef={confirmRef}
      onClose={onCancel}
      busy={busy}
    >
      <h2 id="api-consumer-confirmation-title">{rotate ? 'Rotate API key?' : 'Revoke API key?'}</h2>
      <p>
        {rotate
          ? `Rotating ${confirmation.consumer.name}'s key will immediately stop every previous active key from working.`
          : `Revoking key ${confirmation.prefix} for ${confirmation.consumer.name} will immediately stop it from working.`}
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {busy ? <p role="status">Updating key. Please wait.</p> : null}
      <div className="admin-access-form__actions">
        <button
          ref={confirmRef}
          className="button button--danger"
          type="button"
          disabled={busy}
          onClick={onConfirm}
        >
          {rotate ? 'Rotate key' : 'Revoke key'}
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </DialogFrame>
  );
}

function ConsumerFacts({ consumer }: { consumer: ApiConsumer }) {
  const active = activeKeys(consumer).length;
  return (
    <dl className="api-consumer-facts">
      <div>
        <dt>Consumer ID</dt>
        <dd>{consumer.id}</dd>
      </div>
      <div>
        <dt>Key state</dt>
        <dd>{active > 0 ? `${active} active` : 'No active keys'}</dd>
      </div>
      <div>
        <dt>Rate limit</dt>
        <dd>{consumer.rateLimitPerMinute.toLocaleString()} requests/minute</dd>
      </div>
      <div>
        <dt>Daily quota</dt>
        <dd>{consumer.dailyQuota.toLocaleString()} requests/UTC day</dd>
      </div>
      <div>
        <dt>Created</dt>
        <dd>{dateTime(consumer.createdAt)} UTC</dd>
      </div>
    </dl>
  );
}

export function AdminApiConsumersPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const { consumerId } = useParams();
  const client = useAuthenticatedApiClient();
  const [pageState, setPageState] = useState<PageState>({ kind: 'loading' });
  const [name, setName] = useState('');
  const [rateLimit, setRateLimit] = useState('60');
  const [dailyQuota, setDailyQuota] = useState('10000');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<OneTimeSecret | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const confirmationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = `API Consumers | Stat'sTheGame`;
  }, []);

  const loadConsumers = useCallback(
    async (signal?: AbortSignal) => {
      setPageState({ kind: 'loading' });
      try {
        const profile = await getCurrentUserProfile(client, signal);
        if (profile.role !== 'admin') {
          setPageState({ kind: 'forbidden' });
          return;
        }
        setPageState({
          kind: 'ready',
          consumers: await getAdministratorApiConsumers(client, signal),
        });
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
    void loadConsumers(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, isLoading, loadConsumers]);

  function replaceConsumer(updated: ApiConsumer) {
    setPageState((current) =>
      current.kind === 'ready'
        ? {
            kind: 'ready',
            consumers: current.consumers.map((consumer) =>
              consumer.id === updated.id ? updated : consumer,
            ),
          }
        : current,
    );
  }

  function closeConfirmation() {
    setConfirmation(null);
    setActionError(null);
    requestAnimationFrame(() => confirmationTriggerRef.current?.focus());
  }

  function requestConfirmation(next: Confirmation, trigger: HTMLButtonElement) {
    confirmationTriggerRef.current = trigger;
    setActionError(null);
    setActionFeedback(null);
    setConfirmation(next);
  }

  function dismissSecret() {
    const reason = secret?.reason;
    setSecret(null);
    requestAnimationFrame(() => {
      if (reason === 'created') createButtonRef.current?.focus();
      else confirmationTriggerRef.current?.focus();
    });
  }

  async function confirmKeyAction() {
    if (!confirmation) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (confirmation.kind === 'rotate') {
        const result = await rotateAdministratorApiConsumerKey(client, confirmation.consumer.id);
        replaceConsumer(safeConsumer(result));
        setSecret({ apiKey: result.apiKey, consumerName: result.name, reason: 'rotated' });
      } else {
        await revokeAdministratorApiConsumerKey(
          client,
          confirmation.consumer.id,
          confirmation.keyId,
        );
        const consumers = await getAdministratorApiConsumers(client);
        setPageState({ kind: 'ready', consumers });
        setActionFeedback(`API key ${confirmation.prefix} was revoked.`);
      }
      setConfirmation(null);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setActionBusy(false);
    }
  }

  async function submitConsumer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = apiConsumerIssueSchema.safeParse({
      name,
      rateLimitPerMinute: Number(rateLimit),
      dailyQuota: Number(dailyQuota),
    });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const rateValue = Number(rateLimit);
      const quotaValue = Number(dailyQuota);
      setFormErrors({
        name: flattened.name
          ? name.trim()
            ? 'Use no more than 120 characters.'
            : 'Enter a consumer name.'
          : undefined,
        rateLimitPerMinute: flattened.rateLimitPerMinute
          ? 'Enter 1 to 10,000 requests per minute.'
          : !Number.isInteger(rateValue) || rateValue < 1 || rateValue > 10_000
            ? 'Enter 1 to 10,000 requests per minute.'
            : undefined,
        dailyQuota: flattened.dailyQuota
          ? 'Enter 1 to 10,000 requests per UTC day.'
          : !Number.isInteger(quotaValue) || quotaValue < 1 || quotaValue > 10_000
            ? 'Enter 1 to 10,000 requests per UTC day.'
            : undefined,
      });
      return;
    }
    setFormErrors({});
    setCreating(true);
    try {
      const result = await createAdministratorApiConsumer(client, parsed.data);
      const consumer = safeConsumer(result);
      setPageState((current) =>
        current.kind === 'ready'
          ? { kind: 'ready', consumers: [...current.consumers, consumer] }
          : current,
      );
      setName('');
      setRateLimit('60');
      setDailyQuota('10000');
      setSecret({ apiKey: result.apiKey, consumerName: result.name, reason: 'created' });
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to={signInPathFor(`${location.pathname}${location.search}`)} replace />;
  }

  const consumers = pageState.kind === 'ready' ? pageState.consumers : [];
  const selectedConsumer = consumerId
    ? consumers.find((consumer) => consumer.id === consumerId)
    : undefined;

  return (
    <section
      className="admin-api-consumers-page content-boundary"
      aria-labelledby="api-consumers-title"
    >
      <Breadcrumbs
        items={[
          { label: 'Administration', to: '/admin' },
          { label: 'API consumers', to: consumerId ? '/admin/api-consumers' : '#' },
          ...(consumerId ? [{ label: selectedConsumer?.name ?? 'Consumer detail', to: '#' }] : []),
        ]}
      />
      <header className="page-heading">
        <p className="eyebrow">Administration</p>
        <h1 id="api-consumers-title">{selectedConsumer?.name ?? 'API consumers'}</h1>
        <p>
          {consumerId
            ? 'Review safe configuration and manage this consumer’s active keys.'
            : 'Issue and manage credentials, rate limits, and daily quotas for external API integrations.'}
        </p>
        <Link to="/api">Open API Explorer</Link>
      </header>

      {isLoading || pageState.kind === 'loading' ? (
        <div className="state-message" role="status">
          <h2>Loading API consumers</h2>
          <p>Checking administrator permission and retrieving safe consumer metadata...</p>
        </div>
      ) : pageState.kind === 'forbidden' ? (
        <div className="state-message state-message--error" role="alert">
          <h2>Administrator access required</h2>
          <p>Your signed-in account cannot manage API consumers.</p>
        </div>
      ) : pageState.kind === 'error' ? (
        <div className="state-message state-message--error" role="alert">
          <h2>API consumers could not be loaded</h2>
          <p>{pageState.message}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void loadConsumers()}
          >
            Retry loading API consumers
          </button>
        </div>
      ) : consumerId && !selectedConsumer ? (
        <div className="state-message state-message--error" role="alert">
          <h2>API consumer not found</h2>
          <p>This consumer is not available in your administrator-owned consumer list.</p>
          <Link to="/admin/api-consumers">Return to API consumers</Link>
        </div>
      ) : selectedConsumer ? (
        <>
          <section className="api-consumer-panel" aria-labelledby="consumer-configuration-title">
            <h2 id="consumer-configuration-title">Configuration</h2>
            <ConsumerFacts consumer={selectedConsumer} />
          </section>
          <section className="api-consumer-panel" aria-labelledby="consumer-keys-title">
            <div className="api-consumer-section-heading">
              <div>
                <h2 id="consumer-keys-title">Key management</h2>
                <p>Only safe prefixes and lifecycle dates are shown after issue or rotation.</p>
              </div>
              <button
                className="button button--primary"
                type="button"
                onClick={(event) =>
                  requestConfirmation(
                    { kind: 'rotate', consumer: selectedConsumer },
                    event.currentTarget,
                  )
                }
              >
                Rotate key
              </button>
            </div>
            {selectedConsumer.keys.length === 0 ? (
              <p>No keys have been issued.</p>
            ) : (
              <ul className="api-consumer-key-list">
                {selectedConsumer.keys.map((key) => (
                  <li key={key.id}>
                    <div>
                      <strong>{key.prefix}</strong>
                      <span
                        className={`admin-status-badge admin-status-badge--${key.revokedAt ? 'rejected' : 'approved'}`}
                      >
                        {key.revokedAt ? 'Revoked' : 'Active'}
                      </span>
                    </div>
                    <p>
                      Key ID {key.id} · Created {dateTime(key.createdAt)} UTC
                      {key.revokedAt ? ` · Revoked ${dateTime(key.revokedAt)} UTC` : ''}
                    </p>
                    {!key.revokedAt ? (
                      <button
                        className="button button--danger"
                        type="button"
                        onClick={(event) =>
                          requestConfirmation(
                            {
                              kind: 'revoke',
                              consumer: selectedConsumer,
                              keyId: key.id,
                              prefix: key.prefix,
                            },
                            event.currentTarget,
                          )
                        }
                      >
                        Revoke key {key.prefix}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {actionFeedback ? (
              <p role="status" aria-live="polite">
                {actionFeedback}
              </p>
            ) : null}
          </section>
        </>
      ) : (
        <>
          <section className="api-consumer-panel" aria-labelledby="create-consumer-title">
            <h2 id="create-consumer-title">Create consumer</h2>
            <form
              className="api-consumer-form"
              onSubmit={(event) => void submitConsumer(event)}
              noValidate
            >
              <div>
                <label htmlFor="consumer-name">Consumer name</label>
                <input
                  id="consumer-name"
                  value={name}
                  maxLength={120}
                  required
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={formErrors.name ? 'consumer-name-error' : undefined}
                  onChange={(event) => setName(event.target.value)}
                />
                {formErrors.name ? (
                  <p id="consumer-name-error" className="field-error" role="alert">
                    {formErrors.name}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="consumer-rate-limit">Rate limit (requests per minute)</label>
                <input
                  id="consumer-rate-limit"
                  type="number"
                  min="1"
                  max="10000"
                  required
                  value={rateLimit}
                  aria-invalid={Boolean(formErrors.rateLimitPerMinute)}
                  aria-describedby={
                    formErrors.rateLimitPerMinute ? 'consumer-rate-limit-error' : undefined
                  }
                  onChange={(event) => setRateLimit(event.target.value)}
                />
                {formErrors.rateLimitPerMinute ? (
                  <p id="consumer-rate-limit-error" className="field-error" role="alert">
                    {formErrors.rateLimitPerMinute}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="consumer-daily-quota">Daily quota (requests per UTC day)</label>
                <input
                  id="consumer-daily-quota"
                  type="number"
                  min="1"
                  max="10000"
                  required
                  value={dailyQuota}
                  aria-invalid={Boolean(formErrors.dailyQuota)}
                  aria-describedby={
                    formErrors.dailyQuota ? 'consumer-daily-quota-error' : undefined
                  }
                  onChange={(event) => setDailyQuota(event.target.value)}
                />
                {formErrors.dailyQuota ? (
                  <p id="consumer-daily-quota-error" className="field-error" role="alert">
                    {formErrors.dailyQuota}
                  </p>
                ) : null}
              </div>
              <button
                ref={createButtonRef}
                className="button button--primary"
                type="submit"
                disabled={creating}
              >
                {creating ? 'Creating consumer...' : 'Create consumer'}
              </button>
              {creating ? <p role="status">Creating consumer and issuing its first key.</p> : null}
              {formError ? <p role="alert">{formError}</p> : null}
            </form>
          </section>
          <section className="api-consumer-panel" aria-labelledby="consumer-list-title">
            <h2 id="consumer-list-title">Consumer list</h2>
            {consumers.length === 0 ? (
              <div className="state-message" role="status">
                <h3>No API consumers</h3>
                <p>Create a consumer to issue its first one-time API key.</p>
              </div>
            ) : (
              <div
                className="api-consumer-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="API consumers table"
                aria-describedby="consumer-list-caption"
              >
                <table className="api-consumer-table">
                  <caption id="consumer-list-caption">
                    Safe API consumer configuration and key state
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Consumer</th>
                      <th scope="col">State</th>
                      <th scope="col">Rate limit</th>
                      <th scope="col">Daily quota</th>
                      <th scope="col">Created</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumers.map((consumer) => (
                      <tr key={consumer.id}>
                        <th scope="row">
                          <strong>{consumer.name}</strong>
                          <span>ID {consumer.id}</span>
                        </th>
                        <td>{activeKeys(consumer).length > 0 ? 'Active key' : 'No active key'}</td>
                        <td>{consumer.rateLimitPerMinute.toLocaleString()}/minute</td>
                        <td>{consumer.dailyQuota.toLocaleString()}/UTC day</td>
                        <td>{dateTime(consumer.createdAt)} UTC</td>
                        <td>
                          <Link to={`/admin/api-consumers/${encodeURIComponent(consumer.id)}`}>
                            Manage {consumer.name}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {confirmation ? (
        <ConfirmationDialog
          confirmation={confirmation}
          busy={actionBusy}
          error={actionError}
          onCancel={closeConfirmation}
          onConfirm={() => void confirmKeyAction()}
        />
      ) : null}
      {secret ? <OneTimeKeyDialog secret={secret} onDismiss={dismissSecret} /> : null}
    </section>
  );
}
