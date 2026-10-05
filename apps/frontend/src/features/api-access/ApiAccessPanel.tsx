import type {
  AdministratorApiConsumerUsageResponse,
  ApiAccessRequest,
  ApiConsumer,
} from '@sport-analytics/contracts';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { Button } from '../../components/Button';
import { Message } from '../../components/Message';
import { TextField } from '../../components/TextField';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  generateApiKey,
  getApiAccess,
  getApiUsage,
  requestApiAccess,
  revokeApiKey,
  rotateApiKey,
} from './api-access-api';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; request: ApiAccessRequest | null; consumer: ApiConsumer | null };
type UsageData = AdministratorApiConsumerUsageResponse['data'];
type UsageState =
  { kind: 'idle' } | { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: UsageData };

function validUsageDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function usageWindowError(from: string, to: string): string | null {
  if (!validUsageDate(from) || !validUsageDate(to)) return 'Enter valid From and To dates in UTC.';
  const days =
    Math.floor(
      (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) /
        86_400_000,
    ) + 1;
  if (days < 1) return 'To date must be on or after From date.';
  if (days > 31) return 'Choose a period of no more than 31 UTC dates.';
  return null;
}

export function ApiAccessPanel() {
  const client = useAuthenticatedApiClient();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [secret, setSecret] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<UsageState>({ kind: 'idle' });
  const [usageFrom, setUsageFrom] = useState('');
  const [usageTo, setUsageTo] = useState('');
  const [usageValidationError, setUsageValidationError] = useState<string | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState({ kind: 'loading' });
      try {
        const result = await getApiAccess(client, signal);
        setState({ kind: 'ready', ...result });
      } catch {
        if (!signal?.aborted) setState({ kind: 'error' });
      }
    },
    [client],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => {
      controller.abort();
      setSecret(null);
    };
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const request = await requestApiAccess(client, {
        name: String(data.get('name') ?? ''),
        intendedUse: String(data.get('intendedUse') ?? ''),
      });
      setState({ kind: 'ready', request, consumer: null });
    } finally {
      setBusy(false);
    }
  }
  async function issue(consumer: ApiConsumer, rotate: boolean) {
    setBusy(true);
    try {
      const result = rotate
        ? await rotateApiKey(client, consumer.id)
        : await generateApiKey(client, consumer.id);
      const { apiKey, ...updated } = result;
      setState((current) =>
        current.kind === 'ready' ? { ...current, consumer: updated } : current,
      );
      setCopyState('idle');
      setSecret(apiKey);
    } finally {
      setBusy(false);
    }
  }

  async function submitUsage(event: FormEvent<HTMLFormElement>, consumer: ApiConsumer) {
    event.preventDefault();
    const validation = usageWindowError(usageFrom, usageTo);
    setUsageValidationError(validation);
    if (validation) return;
    setUsage({ kind: 'loading' });
    try {
      setUsage({
        kind: 'ready',
        data: await getApiUsage(client, consumer.id, {
          from: usageFrom,
          to: usageTo,
          limit: 100,
        }),
      });
    } catch {
      setUsage({ kind: 'error' });
    }
  }

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  }

  function dismissSecret() {
    setSecret(null);
    setCopyState('idle');
  }

  return (
    <section className="api-access-flow" aria-labelledby="api-access-title">
      <header className="api-access-flow__header">
        <h2 id="api-access-title">API access</h2>
        <p>Request managed API capacity for an external application or integration.</p>
      </header>
      {state.kind === 'loading' ? <p role="status">Loading API access…</p> : null}
      {state.kind === 'error' ? (
        <Message heading="API access could not be loaded" variant="error">
          <p>Please try again. If the problem continues, contact an administrator.</p>
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </Message>
      ) : null}
      {state.kind === 'ready' && !state.request ? (
        <form
          className="api-access-request-form ui-card"
          aria-label="API access request"
          onSubmit={(event) => void submit(event)}
        >
          <TextField
            name="name"
            label="Consumer or application name"
            helpText="Use a name that clearly identifies the application consuming the API."
            required
            maxLength={120}
          />
          <div className="ui-field">
            <label htmlFor="api-access-intended-use">
              Intended use <span aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </label>
            <textarea
              className="ui-field__input api-access-request-form__textarea"
              id="api-access-intended-use"
              name="intendedUse"
              aria-describedby="api-access-intended-use-help"
              required
              rows={6}
              minLength={10}
              maxLength={500}
            />
            <p className="ui-field__help" id="api-access-intended-use-help">
              Briefly explain how the application will use the API and its data.
            </p>
          </div>
          <div className="api-access-request-form__actions">
            <Button type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Request API access'}
            </Button>
          </div>
        </form>
      ) : null}
      {state.kind === 'ready' && state.request?.state === 'pending' ? (
        <Message heading="Awaiting administrator review">
          <p>Your API access request is pending. We will show the decision here.</p>
        </Message>
      ) : null}
      {state.kind === 'ready' && state.request?.state === 'rejected' ? (
        <Message heading="API access request rejected" variant="warning">
          <p>
            {state.request.reviewReason
              ? `Review reason: ${state.request.reviewReason}`
              : 'No review reason was provided.'}
          </p>
          <Button
            variant="secondary"
            onClick={() => setState({ kind: 'ready', request: null, consumer: null })}
          >
            Submit a new request
          </Button>
        </Message>
      ) : null}
      {state.kind === 'ready' && state.consumer ? (
        <div className="api-access-consumer ui-card">
          <h3>{state.consumer.name}</h3>
          <p>
            {state.consumer.rateLimitPerMinute} requests per minute; {state.consumer.dailyQuota}{' '}
            requests per UTC day.
          </p>
          <div className="api-access-consumer__actions">
            {state.consumer.keys.some((key) => key.revokedAt === null) ? (
              <>
                <Button disabled={busy} onClick={() => void issue(state.consumer!, true)}>
                  Rotate API key
                </Button>
                {state.consumer.keys
                  .filter((key) => key.revokedAt === null)
                  .map((key) => (
                    <Button
                      key={key.id}
                      variant="secondary"
                      onClick={async () => {
                        await revokeApiKey(client, state.consumer!.id, key.id);
                        await load();
                      }}
                    >
                      Revoke API key
                    </Button>
                  ))}
              </>
            ) : (
              <Button disabled={busy} onClick={() => void issue(state.consumer!, false)}>
                Generate API key
              </Button>
            )}
          </div>
          <section className="api-access-usage" aria-labelledby="api-access-usage-title">
            <h4 id="api-access-usage-title">Usage</h4>
            <p>Select up to 31 inclusive UTC dates to inspect your request total.</p>
            <form
              className="api-consumer-usage-form"
              aria-describedby="api-access-usage-help"
              noValidate
              onSubmit={(event) => void submitUsage(event, state.consumer!)}
            >
              <div>
                <label htmlFor="api-access-usage-from">From date (UTC)</label>
                <input
                  id="api-access-usage-from"
                  type="date"
                  required
                  value={usageFrom}
                  aria-invalid={Boolean(usageValidationError)}
                  aria-describedby={usageValidationError ? 'api-access-usage-error' : undefined}
                  onChange={(event) => setUsageFrom(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="api-access-usage-to">To date (UTC)</label>
                <input
                  id="api-access-usage-to"
                  type="date"
                  required
                  value={usageTo}
                  aria-invalid={Boolean(usageValidationError)}
                  aria-describedby={usageValidationError ? 'api-access-usage-error' : undefined}
                  onChange={(event) => setUsageTo(event.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" disabled={usage.kind === 'loading'}>
                {usage.kind === 'loading' ? 'Loading usage…' : 'View API usage'}
              </Button>
              <p id="api-access-usage-help">Usage dates are evaluated in UTC.</p>
              {usageValidationError ? (
                <p id="api-access-usage-error" className="field-error" role="alert">
                  {usageValidationError}
                </p>
              ) : null}
            </form>
            {usage.kind === 'ready' ? (
              <div className="api-access-usage__result" role="status">
                <p>
                  {usage.data.from} to {usage.data.to} UTC
                </p>
                <p>
                  <strong>Requests in period: {usage.data.totalRequests.toLocaleString()}</strong>
                </p>
              </div>
            ) : usage.kind === 'error' ? (
              <Message variant="error">
                <p>API usage could not be loaded. Please try again.</p>
              </Message>
            ) : null}
          </section>
        </div>
      ) : null}
      {secret ? (
        <div
          className="api-access-secret-dialog ui-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-key-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') dismissSecret();
          }}
        >
          <h3 id="api-key-title">Copy your API key now</h3>
          <p>This secret is shown once and is not stored.</p>
          <code>{secret}</code>
          <div className="api-access-secret-dialog__actions">
            <Button autoFocus onClick={() => void copySecret()}>
              Copy API key
            </Button>
            <Button variant="secondary" onClick={dismissSecret}>
              I have saved the key
            </Button>
          </div>
          {copyState === 'success' ? <p role="status">API key copied.</p> : null}
          {copyState === 'error' ? (
            <p role="alert">The key could not be copied. Select and copy it before continuing.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
