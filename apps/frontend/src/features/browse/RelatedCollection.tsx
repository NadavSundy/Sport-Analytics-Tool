import { type ReactNode, useCallback, useId, useMemo, useState } from 'react';

import type { CollectionResponse } from '../../api/public-read';
import { usePublicData } from './usePublicData';

interface RelatedCollectionProps<Resource> {
  emptyMessage: string;
  filters: URLSearchParams;
  load(search: string, signal: AbortSignal): Promise<CollectionResponse<Resource>>;
  renderRecords(resources: Resource[]): ReactNode;
  resourceLabel: string;
  title: string;
}

export function RelatedCollection<Resource>({
  emptyMessage,
  filters,
  load,
  renderRecords,
  resourceLabel,
  title,
}: RelatedCollectionProps<Resource>) {
  const headingId = useId();
  const [cursor, setCursor] = useState<string | null>(null);
  const search = useMemo(() => {
    const params = new URLSearchParams(filters);
    params.set('limit', '10');
    if (cursor) {
      params.set('cursor', cursor);
    }
    return `?${params.toString()}`;
  }, [cursor, filters]);
  const loadRecords = useCallback((signal: AbortSignal) => load(search, signal), [load, search]);
  const state = usePublicData(loadRecords, search);

  return (
    <section aria-labelledby={headingId} className="related-collection">
      <div className="results-heading">
        <h2 id={headingId}>{title}</h2>
        {state.status === 'ready' ? (
          <p aria-live="polite">
            {state.data.data.length} {state.data.data.length === 1 ? 'record' : 'records'} on this
            page
          </p>
        ) : null}
      </div>

      {state.status === 'loading' ? (
        <div className="state-message" role="status">
          <h3>Loading {resourceLabel}</h3>
          <p>The related published records are being requested.</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="state-message state-message--error" role="alert">
          <h3>{title} could not be loaded</h3>
          <p>Published {resourceLabel} could not be requested. Try this section again.</p>
          <button
            aria-label={`Retry ${resourceLabel}`}
            className="button button--secondary"
            onClick={state.reload}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      {state.status === 'ready' && state.data.data.length === 0 ? (
        <div className="state-message" role="status">
          <h3>No {resourceLabel} found</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : null}

      {state.status === 'ready' && state.data.data.length > 0 ? (
        <>
          {renderRecords(state.data.data)}
          {state.data.pagination.nextCursor ? (
            <nav aria-label={`${title} pagination`} className="pagination">
              <button
                aria-label={`Next ${resourceLabel} page`}
                className="button button--secondary"
                onClick={() => setCursor(state.data.pagination.nextCursor)}
                type="button"
              >
                Next page
              </button>
            </nav>
          ) : (
            <p className="pagination__end">End of published results</p>
          )}
        </>
      ) : null}
    </section>
  );
}
