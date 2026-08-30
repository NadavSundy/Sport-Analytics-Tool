import { useState } from 'react';
import {
  ApiContractError,
  downloadFixtureEventExport,
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

export function EventExportControls({
  filters,
  fixtureId,
  hasEvents,
}: {
  filters: FixtureEventExportFilters;
  fixtureId: string;
  hasEvents: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingFormat, setPendingFormat] = useState<FixtureEventExportFormat | null>(null);

  async function download(format: FixtureEventExportFormat) {
    setError(null);
    setPendingFormat(format);
    try {
      const data = await downloadFixtureEventExport(fixtureId, format, filters);
      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `fixture-${fixtureId}-events.${format}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
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
        <p>Download the currently displayed accepted-event slice for analysis.</p>
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
