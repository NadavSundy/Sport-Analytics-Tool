import type {
  BatchReceiptResponse,
  Competition,
  CurrentUserProfile,
} from '@sport-analytics/contracts';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiResponseError } from '../../api/client';
import { publicReadApi } from '../../api/public-read';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import {
  batchUploadIdempotencyKey,
  BatchUploadInputError,
  MAX_BATCH_BYTES,
  uploadBatch,
} from './batch-api';
import { invalidateBatchCollections } from './batch-collection-state';

type AccessState =
  | { kind: 'loading' }
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

export type PackageUploadScope = 'season' | 'catalogue';

export function BatchUploadWorkflow({
  profile,
  scope,
}: {
  profile: CurrentUserProfile;
  scope: PackageUploadScope;
}) {
  const client = useAuthenticatedApiClient();
  const [access, setAccess] = useState<AccessState>({ kind: 'loading' });
  const [competitionId, setCompetitionId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<UploadState>({ kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setAccess({ kind: 'loading' });
    void competitionOptions(profile, controller.signal)
      .then((competitions) => {
        setAccess({ kind: 'ready', competitions });
        setCompetitionId(competitions[0]?.competitionId ?? '');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAccess({ kind: 'error', message: 'Your upload scope could not be loaded.' });
        }
      });
    return () => controller.abort();
  }, [profile]);

  useEffect(() => {
    if (upload.kind === 'accepted' || upload.kind === 'error') {
      resultRef.current?.querySelector<HTMLElement>('[data-upload-result]')?.focus();
    }
  }, [upload]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (upload.kind === 'uploading' || upload.kind === 'accepted') return;
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
      const response = await uploadBatch(
        client,
        competitionId,
        file,
        await batchUploadIdempotencyKey(competitionId, file),
      );
      invalidateBatchCollections();
      const competition =
        access.kind === 'ready'
          ? access.competitions.find((option) => option.competitionId === competitionId)
          : undefined;
      setUpload({
        kind: 'accepted',
        receipt: response.data,
        context:
          scope === 'season'
            ? `${competition?.name ?? 'Selected competition'} · season named in package`
            : `${competition?.name ?? 'Selected competition'} · seasons named in package`,
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
                ? 'Upload storage is temporarily unavailable. Retry this same file to reuse the upload request safely.'
                : 'The upload could not be completed. Retry this same file safely.';
      setUpload({ kind: 'error', message });
    }
  }

  const busy = upload.kind === 'uploading';
  const completed = upload.kind === 'accepted';
  const scopeLabel = scope === 'season' ? 'season' : 'back catalogue';

  return (
    <div className="batch-upload-workflow">
      <section className="batch-guidance" aria-labelledby="batch-guidance-title">
        <h2 id="batch-guidance-title">
          Before you upload a {scope === 'season' ? 'season' : 'back catalogue'}
        </h2>
        <p>
          Upload one JSON, CSV spreadsheet, or NDJSON file up to 50 MB and 50,000 delivery events.
          At most three uploads may be processing at once. Each upload is checked in the background
          before it can be reviewed and published.
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

      {access.kind === 'loading' ? (
        <div className="state-message" role="status">
          <h2>Loading upload choices</h2>
          <p>Checking your competition scope…</p>
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
              disabled={busy || completed}
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

          {scope === 'season' ? (
            <p className="field-help">
              The season name and reference inside the package are authoritative and are validated
              during processing. Known seasons are not selected during upload.
            </p>
          ) : (
            <p className="field-help">
              Each season is identified by its readable name inside the package.
            </p>
          )}

          <div className="submission-field">
            <label htmlFor="batch-file">
              {scope === 'season' ? 'Season' : 'Back catalogue'} package
            </label>
            <input
              id="batch-file"
              type="file"
              accept=".json,application/json,.csv,text/csv,.ndjson,application/x-ndjson"
              disabled={busy || completed}
              aria-describedby="batch-file-help"
              aria-invalid={upload.kind === 'error'}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setUpload({ kind: 'idle' });
              }}
            />
            <p id="batch-file-help" className="field-help">
              JSON, CSV or NDJSON; maximum {MAX_BATCH_BYTES / 1024 / 1024} MB. Selecting a corrected
              file starts a replacement upload. Retrying unchanged content, including after a page
              refresh and reselecting the file, reuses the same request and receipt.
            </p>
            {file ? <p className="field-help">Selected: {file.name}</p> : null}
          </div>

          {upload.kind !== 'accepted' ? (
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Uploading package…' : `Upload ${scopeLabel} package`}
            </button>
          ) : null}

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
                  {scope === 'season' ? 'Season' : 'Back catalogue'} upload failed
                </h2>
                <p>{upload.message}</p>
              </div>
            ) : upload.kind === 'accepted' ? (
              <div className="submission-result" role="status">
                <h2 tabIndex={-1} data-upload-result>
                  {scope === 'season' ? 'Season upload received' : 'Back catalogue upload received'}
                </h2>
                <p>
                  Your {scopeLabel} file has been received. The platform is checking it in the
                  background; it is not published yet. You may leave this page safely.
                </p>
                <p>
                  Next: open the submission report to see processing progress and any validation
                  problems. If corrections are needed, update the file and submit it again. After
                  validation succeeds, an administrator can review it for publication.
                </p>
                <dl className="submission-reference">
                  <div>
                    <dt>Submission receipt</dt>
                    <dd>{upload.receipt.batchReference}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>Received — validation pending</dd>
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
                  View submission report
                </Link>
                <Link className="button button--secondary" to="/submissions/batches">
                  View submission history
                </Link>
              </div>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
