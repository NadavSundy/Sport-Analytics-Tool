import type {
  BatchReceiptResponse,
  Competition,
  CurrentUserProfile,
  Season,
} from '@sport-analytics/contracts';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { publicReadApi } from '../../api/public-read';
import { useAuth } from '../auth/AuthProvider';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import { BatchUploadInputError, MAX_BATCH_BYTES, uploadBatch } from './batch-api';

type AccessState =
  | { kind: 'loading' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; competitions: Competition[] };

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'error'; message: string }
  | { kind: 'accepted'; receipt: BatchReceiptResponse['data']; context: string };

async function listAllCompetitions(signal: AbortSignal): Promise<Competition[]> {
  const competitions: Competition[] = [];
  let cursor: string | null = null;
  do {
    const parameters = new URLSearchParams({ limit: '100' });
    if (cursor) parameters.set('cursor', cursor);
    const response = await publicReadApi.listCompetitions(`?${parameters.toString()}`, signal);
    competitions.push(...response.data);
    cursor = response.pagination.nextCursor;
  } while (cursor);
  return competitions;
}

async function competitionOptions(profile: CurrentUserProfile, signal: AbortSignal) {
  const competitions =
    profile.role === 'admin'
      ? await listAllCompetitions(signal)
      : await Promise.all(
          profile.competitionIds.map(async (competitionId) => {
            const response = await publicReadApi.getCompetition(competitionId, signal);
            return response.data;
          }),
        );
  return competitions.sort((left, right) => left.name.localeCompare(right.name));
}

async function seasonOptions(competitionId: string, signal: AbortSignal): Promise<Season[]> {
  const seasons: Season[] = [];
  let cursor: string | null = null;
  do {
    const parameters = new URLSearchParams({ competitionId, limit: '100' });
    if (cursor) parameters.set('cursor', cursor);
    const response = await publicReadApi.listSeasons(`?${parameters.toString()}`, signal);
    seasons.push(...response.data);
    cursor = response.pagination.nextCursor;
  } while (cursor);
  return seasons.sort((left, right) => right.label.localeCompare(left.label));
}

function newDecisionKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function BatchUploadPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const client = useAuthenticatedApiClient();
  const [access, setAccess] = useState<AccessState>({ kind: 'loading' });
  const [competitionId, setCompetitionId] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonState, setSeasonState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>(
    'idle',
  );
  const [seasonId, setSeasonId] = useState('package');
  const [file, setFile] = useState<File | null>(null);
  const [decisionKey, setDecisionKey] = useState(newDecisionKey);
  const [upload, setUpload] = useState<UploadState>({ kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Upload a batch | Stat'sTheGame";
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const controller = new AbortController();
    void getCurrentUserProfile(client, controller.signal)
      .then(async (profile) => {
        if (profile.role !== 'submitter' && profile.role !== 'admin') {
          setAccess({ kind: 'forbidden' });
          return;
        }
        const competitions = await competitionOptions(profile, controller.signal);
        setAccess({ kind: 'ready', competitions });
        setCompetitionId(competitions[0]?.competitionId ?? '');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAccess({ kind: 'error', message: 'Your upload scope could not be loaded.' });
        }
      });
    return () => controller.abort();
  }, [client, isAuthenticated, isLoading]);

  useEffect(() => {
    if (!competitionId) return;
    const controller = new AbortController();
    setSeasonState('loading');
    setSeasonId('package');
    void seasonOptions(competitionId, controller.signal)
      .then((options) => {
        setSeasons(options);
        setSeasonState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSeasons([]);
          setSeasonState('unavailable');
        }
      });
    return () => controller.abort();
  }, [competitionId]);

  useEffect(() => {
    if (upload.kind === 'accepted' || upload.kind === 'error') {
      resultRef.current?.querySelector<HTMLElement>('[data-upload-result]')?.focus();
    }
  }, [upload]);

  if (!isLoading && !isAuthenticated) return <Navigate to="/sign-in" replace />;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setUpload({ kind: 'error', message: 'Choose a package before uploading.' });
      return;
    }
    if (!competitionId) {
      setUpload({ kind: 'error', message: 'Choose an authorised competition.' });
      return;
    }
    setUpload({ kind: 'uploading' });
    try {
      const response = await uploadBatch(client, competitionId, file, decisionKey);
      const competition =
        access.kind === 'ready'
          ? access.competitions.find((option) => option.competitionId === competitionId)
          : undefined;
      const season = seasons.find((option) => option.seasonId === seasonId);
      setUpload({
        kind: 'accepted',
        receipt: response.data,
        context: `${competition?.name ?? 'Selected competition'} · ${season?.label ?? 'season named in package'}`,
      });
    } catch (error) {
      const message =
        error instanceof BatchUploadInputError
          ? error.message
          : error instanceof ApiResponseError && error.status === 409
            ? `${error.message} If this is a corrected replacement, choose the corrected file again to start a new upload.`
            : error instanceof ApiResponseError && error.status === 413
              ? 'The server rejected this package because it exceeds the 50 MB limit.'
              : error instanceof ApiResponseError && error.status === 503
                ? 'Batch storage is temporarily unavailable. Retry this same file to reuse the upload request safely.'
                : 'The batch could not be uploaded. Retry this same file safely.';
      setUpload({ kind: 'error', message });
    }
  }

  const busy = upload.kind === 'uploading';

  return (
    <section className="submission-page content-boundary" aria-labelledby="batch-upload-title">
      <header className="page-heading submission-page__heading">
        <p className="eyebrow">Submitter workspace</p>
        <h1 id="batch-upload-title">Upload fixtures, seasons or back catalogues</h1>
        <p>
          Choose readable competition context, download a template, and send one package for
          background validation. You never need a database ID.
        </p>
        <Link to="/submissions/batches">View submission history</Link>
      </header>

      <section className="batch-guidance" aria-labelledby="batch-guidance-title">
        <h2 id="batch-guidance-title">Before you upload</h2>
        <p>
          Upload one JSON, CSV spreadsheet, or NDJSON file up to 50 MB and 50,000 delivery events.
          At most three batches may be processing at once.
        </p>
        <p>Every package must include:</p>
        <ul>
          <li>
            <code>contractVersion</code> and a stable <code>packageId</code>;
          </li>
          <li>competition and season names or stable provider references;</li>
          <li>fixture date and team names, then innings number and batting team; and</li>
          <li>each delivery&apos;s reference, order, participants and runs.</li>
        </ul>
        <p>
          Stable provider references are optional when the documented readable context is supplied.
        </p>
        <div className="batch-guidance__actions">
          <a className="button button--secondary" href="/season-upload-template.json" download>
            Download JSON template
          </a>
          <a className="button button--secondary" href="/season-upload-template.csv" download>
            Download spreadsheet template
          </a>
        </div>
      </section>

      {isLoading || access.kind === 'loading' ? (
        <div className="state-message" role="status">
          <h2>Loading upload choices</h2>
          <p>Checking your competition scope…</p>
        </div>
      ) : access.kind === 'forbidden' ? (
        <div className="state-message" role="status">
          <h2>Submitter role required</h2>
          <p>Your account is not authorised to upload batch packages.</p>
        </div>
      ) : access.kind === 'error' ? (
        <div className="state-message state-message--error" role="alert">
          <h2>Upload choices unavailable</h2>
          <p>{access.message}</p>
        </div>
      ) : access.competitions.length === 0 ? (
        <div className="state-message" role="status">
          <h2>No authorised competitions</h2>
          <p>Ask an administrator to assign a competition before uploading.</p>
        </div>
      ) : (
        <form className="submission-form batch-upload-form" onSubmit={submit}>
          <div className="submission-field">
            <label htmlFor="batch-competition">Competition</label>
            <select
              id="batch-competition"
              value={competitionId}
              disabled={busy}
              onChange={(event) => {
                setCompetitionId(event.target.value);
                setUpload({ kind: 'idle' });
              }}
            >
              {access.competitions.map((competition) => (
                <option value={competition.competitionId} key={competition.competitionId}>
                  {competition.name}
                </option>
              ))}
            </select>
            <p className="field-help">Only competitions authorised by the server appear here.</p>
          </div>

          <div className="submission-field">
            <label htmlFor="batch-season">Season context</label>
            <select
              id="batch-season"
              value={seasonId}
              disabled={busy || seasonState === 'loading'}
              onChange={(event) => setSeasonId(event.target.value)}
            >
              <option value="package">New or historical season named in the package</option>
              {seasons.map((season) => (
                <option value={season.seasonId} key={season.seasonId}>
                  {season.label} — {season.competitionName}
                </option>
              ))}
            </select>
            <p className="field-help" role={seasonState === 'unavailable' ? 'status' : undefined}>
              {seasonState === 'loading'
                ? 'Loading known seasons…'
                : seasonState === 'unavailable'
                  ? 'Known seasons are unavailable. You can still use the readable season name in your package.'
                  : 'This label helps confirm context; the package season is validated during processing.'}
            </p>
          </div>

          <div className="submission-field">
            <label htmlFor="batch-file">Batch package</label>
            <input
              id="batch-file"
              type="file"
              accept=".json,application/json,.csv,text/csv,.ndjson,application/x-ndjson"
              disabled={busy}
              aria-describedby="batch-file-help"
              aria-invalid={upload.kind === 'error'}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setDecisionKey(newDecisionKey());
                setUpload({ kind: 'idle' });
              }}
            />
            <p id="batch-file-help" className="field-help">
              JSON, CSV or NDJSON; maximum {MAX_BATCH_BYTES / 1024 / 1024} MB. Selecting a corrected
              file starts a replacement upload. Retrying unchanged content safely reuses the same
              request and receipt.
            </p>
            {file ? <p className="field-help">Selected: {file.name}</p> : null}
          </div>

          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Uploading package…' : 'Upload batch package'}
          </button>

          {busy ? (
            <div className="batch-upload-progress" role="status">
              <progress aria-label="Upload progress" />
              <p>Uploading {file?.name}. Keep this page open until the durable receipt appears.</p>
            </div>
          ) : null}

          <div ref={resultRef}>
            {upload.kind === 'error' ? (
              <div className="submission-result submission-result--error" role="alert">
                <h2 tabIndex={-1} data-upload-result>
                  Batch upload failed
                </h2>
                <p>{upload.message}</p>
              </div>
            ) : upload.kind === 'accepted' ? (
              <div className="submission-result" role="status">
                <h2 tabIndex={-1} data-upload-result>
                  Batch received safely
                </h2>
                <p>
                  Processing continues after you leave this page. The same unchanged upload request
                  reuses this receipt instead of creating a duplicate batch.
                </p>
                <dl className="submission-reference">
                  <div>
                    <dt>Receipt</dt>
                    <dd>{upload.receipt.batchReference}</dd>
                  </div>
                  <div>
                    <dt>Context</dt>
                    <dd>{upload.context}</dd>
                  </div>
                  <div>
                    <dt>Received</dt>
                    <dd>{new Date(upload.receipt.receivedAt).toLocaleString()}</dd>
                  </div>
                </dl>
                <Link
                  className="button button--primary"
                  to={`/submissions/batches/${upload.receipt.batchReference}`}
                >
                  Track this batch
                </Link>
              </div>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
