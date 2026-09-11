import { useState } from 'react';
import {
  ApiContractError,
  downloadFixtureStatisticEventExport,
  fixtureEventExportFilename,
  type FixtureEventExportFilters,
  type FixtureEventExportFormat,
} from '../../api/public-read';
import { ApiResponseError } from '../../api/client';

function exportErrorMessage(error: unknown): string {
  if (error instanceof ApiResponseError && error.message) {
    return error.message;
  }
  if (error instanceof ApiContractError) {
    return 'The export response could not be understood. Please try again.';
  }
  return 'The export could not be downloaded. Check your connection and try again.';
}

function eventCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'event' : 'events'}`;
}

function formatLabel(format: FixtureEventExportFormat): string {
  return format === 'csv' ? 'CSV' : 'JSON';
}

export function EventExportControls({
  eventCount,
  filenameFilters,
  fixtureId,
  statisticId,
}: {
  eventCount: number;
  filenameFilters: FixtureEventExportFilters;
  fixtureId: string;
  statisticId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [downloadedFormat, setDownloadedFormat] = useState<FixtureEventExportFormat | null>(null);
  const [pendingFormat, setPendingFormat] = useState<FixtureEventExportFormat | null>(null);

  const hasEvents = eventCount > 0;

  async function download(format: FixtureEventExportFormat) {
    setError(null);
    setDownloadedFormat(null);
    setPendingFormat(format);
    try {
      const data = await downloadFixtureStatisticEventExport(fixtureId, statisticId, format);
      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fixtureEventExportFilename(fixtureId, format, filenameFilters);
      link.click();
      URL.revokeObjectURL(objectUrl);
      setDownloadedFormat(format);
    } catch (caughtError) {
      setError(exportErrorMessage(caughtError));
    } finally {
      setPendingFormat(null);
    }
  }

  return (
    <section aria-labelledby="event-export-heading" className="event-export-controls">
      <div>
        <p className="eyebrow">Accepted event data</p>
        <h2 id="event-export-heading">Export this trace</h2>
        <p>
          Download the {eventCountLabel(eventCount)} shown in this trace, in match order, for
          analysis.
        </p>
        {hasEvents ? (
          // Always mounted, so assistive technology announces each change.
          <p aria-live="polite" className="event-export-controls__status" role="status">
            {pendingFormat
              ? `Preparing the ${formatLabel(pendingFormat)} export of ${eventCountLabel(eventCount)}…`
              : downloadedFormat
                ? `${formatLabel(downloadedFormat)} export of ${eventCountLabel(eventCount)} downloaded.`
                : null}
          </p>
        ) : null}
      </div>
      {hasEvents ? (
        <div aria-label="Export format" className="event-export-controls__actions">
          <button
            className="button button--secondary"
            disabled={pendingFormat !== null}
            onClick={() => void download('csv')}
            type="button"
          >
            {pendingFormat === 'csv' ? 'Preparing CSV…' : 'Download CSV'}
          </button>
          <button
            className="button button--secondary"
            disabled={pendingFormat !== null}
            onClick={() => void download('json')}
            type="button"
          >
            {pendingFormat === 'json' ? 'Preparing JSON…' : 'Download JSON'}
          </button>
        </div>
      ) : (
        <p className="event-export-controls__empty" role="status">
          No accepted events are available to export for this trace.
        </p>
      )}
      {error ? (
        <p className="event-export-controls__error" role="alert">
          Export unavailable: {error}
        </p>
      ) : null}
    </section>
  );
}
