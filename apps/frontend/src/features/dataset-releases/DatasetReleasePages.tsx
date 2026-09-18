import type { DatasetRelease } from '@sport-analytics/contracts';
import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';

import { datasetReleaseArtifactUrl, publicReadApi } from '../../api/public-read';
import {
  DetailError,
  DetailLayout,
  DetailLoading,
  RecordFact,
  RecordFacts,
} from '../browse/RecordDetail';
import { usePublicData } from '../browse/usePublicData';

function formatCreationTime(value: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

function scopeLabel(scope: DatasetRelease['scope']): string {
  return scope === 'published-accepted-deliveries' ? 'Published accepted deliveries' : scope;
}

export function DatasetReleaseCataloguePage() {
  const load = useCallback((signal: AbortSignal) => publicReadApi.listDatasetReleases(signal), []);
  const state = usePublicData(load, 'dataset-releases');

  return (
    <section className="release-page content-boundary">
      <header className="page-heading">
        <p className="eyebrow">Data downloads</p>
        <h1>Dataset releases</h1>
        <p>
          Discover immutable snapshots of published cricket data, review their scope and schema, and
          verify every download with its SHA-256 checksum.
        </p>
      </header>

      {state.status === 'loading' ? (
        <div className="state-message" role="status">
          <h3>Loading dataset releases</h3>
          <p>The available snapshots are being requested from the Sport Analytics API.</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="state-message state-message--error" role="alert">
          <h3>Dataset releases could not be loaded</h3>
          <p>{state.error.message}</p>
          <button className="button button--secondary" onClick={state.reload} type="button">
            Try again
          </button>
        </div>
      ) : null}

      {state.status === 'ready' && state.data.data.length === 0 ? (
        <div className="state-message">
          <h3>No dataset releases are available</h3>
          <p>Published snapshots will appear here when an administrator creates one.</p>
        </div>
      ) : null}

      {state.status === 'ready' && state.data.data.length > 0 ? (
        <div className="release-catalogue" aria-live="polite">
          <div className="results-heading">
            <h2>Available releases</h2>
            <p>{state.data.data.length} immutable snapshots</p>
          </div>
          <ul className="release-list">
            {state.data.data.map((release) => (
              <li key={release.releaseId}>
                <div>
                  <p className="eyebrow">Release {release.version}</p>
                  <h3>
                    <Link to={`/dataset-releases/${encodeURIComponent(release.version)}`}>
                      Dataset {release.version}
                    </Link>
                  </h3>
                  <p>{scopeLabel(release.scope)}</p>
                </div>
                <dl>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatCreationTime(release.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Events</dt>
                    <dd>{release.eventCount.toLocaleString('en-ZA')}</dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>{release.formatVersion}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function DatasetReleaseDetailPage() {
  const { version = '' } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => publicReadApi.getDatasetRelease(version, signal),
    [version],
  );
  const state = usePublicData(load, version);

  if (state.status === 'loading') {
    return <DetailLoading label="dataset release" />;
  }

  if (state.status === 'error') {
    return <DetailError error={state.error} label="Dataset release" reload={state.reload} />;
  }

  const release = state.data.data;

  return (
    <DetailLayout
      backLabel="dataset releases"
      backTo="/dataset-releases"
      eyebrow="Immutable snapshot"
      title={`Dataset ${release.version}`}
    >
      <p className="release-summary">
        This release contains {release.eventCount.toLocaleString('en-ZA')} published accepted
        deliveries. Retain the checksum with your analysis to verify the downloaded bytes.
      </p>
      <RecordFacts>
        <RecordFact label="Created" value={formatCreationTime(release.createdAt)} />
        <RecordFact
          label="Snapshot identity"
          value={release.snapshotId ?? 'Legacy release; snapshot identity unavailable'}
        />
        <RecordFact
          label="Snapshot as of"
          value={
            release.snapshotAsOf
              ? formatCreationTime(release.snapshotAsOf)
              : 'Legacy release; snapshot time unavailable'
          }
        />
        <RecordFact label="Scope" value={scopeLabel(release.scope)} />
        <RecordFact label="Format version" value={release.formatVersion} />
        <RecordFact label="Event count" value={release.eventCount.toLocaleString('en-ZA')} />
      </RecordFacts>

      <section className="release-download" aria-labelledby="release-download-heading">
        <h2 id="release-download-heading">Download and verify</h2>
        <p>
          Download the canonical JSON artefact. Calculate its SHA-256 digest and compare it with the
          published checksum below.
        </p>
        <a
          className="button button--primary"
          download={`dataset-release-${release.version}.json`}
          href={datasetReleaseArtifactUrl(release.version)}
        >
          Download JSON artefact
        </a>
        <dl className="release-checksum">
          <div>
            <dt>SHA-256 checksum</dt>
            <dd>
              <code>{release.checksum}</code>
            </dd>
          </div>
        </dl>
      </section>

      <section className="release-schema" aria-labelledby="release-schema-heading">
        <h2 id="release-schema-heading">Schema and fields</h2>
        <p>The artefact includes these documented fields for every delivery event.</p>
        <dl>
          {release.fields.map((field) => (
            <div key={field.name}>
              <dt>
                <code>{field.name}</code>
              </dt>
              <dd>{field.description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </DetailLayout>
  );
}
