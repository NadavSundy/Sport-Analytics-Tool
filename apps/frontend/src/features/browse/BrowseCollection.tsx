import type { CollectionResponse } from '../../api/public-read';
import { type FormEvent, type ReactNode, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePublicData } from './usePublicData';

export interface FilterField {
  label: string;
  name: string;
  placeholder?: string;
  type?: 'date' | 'search' | 'text';
}

interface BrowseCollectionProps<Resource> {
  description: string;
  emptyMessage: string;
  eyebrow: string;
  filters: FilterField[];
  load: (search: string, signal: AbortSignal) => Promise<CollectionResponse<Resource>>;
  renderItem: (resource: Resource) => ReactNode;
  resourceLabel: string;
  title: string;
}

const paginationKeys = ['cursor', 'limit'];

function normalizedSearch(searchParams: URLSearchParams, filters: FilterField[]): string {
  const allowedKeys = new Set([...paginationKeys, ...filters.map(({ name }) => name)]);
  const requestParams = new URLSearchParams();

  searchParams.forEach((value, key) => {
    if (allowedKeys.has(key) && value.trim()) {
      requestParams.set(key, value);
    }
  });

  const query = requestParams.toString();
  return query ? `?${query}` : '';
}

function FilterForm({ fields }: { fields: FilterField[] }) {
  const [searchParams, setSearchParams] = useSearchParams();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const nextSearch = new URLSearchParams();

    values.forEach((value, key) => {
      const text = String(value).trim();
      if (text) {
        nextSearch.set(key, text);
      }
    });

    setSearchParams(nextSearch);
  }

  return (
    <form className="filter-panel" key={searchParams.toString()} onSubmit={applyFilters}>
      <div className="filter-panel__heading">
        <h2>Filter records</h2>
        <Link className="text-link" to=".">
          Clear filters
        </Link>
      </div>
      <div className="filter-grid">
        {fields.map(({ label, name, placeholder, type = 'text' }) => (
          <label className="field" key={name}>
            <span>{label}</span>
            <input
              defaultValue={searchParams.get(name) ?? ''}
              name={name}
              placeholder={placeholder}
              type={type}
            />
          </label>
        ))}
        <label className="field">
          <span>Records per page</span>
          <select defaultValue={searchParams.get('limit') ?? '50'} name="limit">
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>
      <button className="button button--primary" type="submit">
        Apply filters
      </button>
    </form>
  );
}

export function BrowseCollection<Resource>({
  description,
  emptyMessage,
  eyebrow,
  filters,
  load,
  renderItem,
  resourceLabel,
  title,
}: BrowseCollectionProps<Resource>) {
  const [searchParams] = useSearchParams();
  const search = normalizedSearch(searchParams, filters);
  const loadRecords = useCallback((signal: AbortSignal) => load(search, signal), [load, search]);
  const state = usePublicData(loadRecords, search);

  return (
    <div className="browse-page">
      <header className="page-heading content-boundary">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <div className="browse-page__content content-boundary">
        <FilterForm fields={filters} />

        <section aria-labelledby="results-heading" className="results-region">
          <div className="results-heading">
            <h2 id="results-heading">Published {resourceLabel}</h2>
            {state.status === 'ready' ? (
              <p aria-live="polite">
                {state.data.data.length} {state.data.data.length === 1 ? 'record' : 'records'} on
                this page
              </p>
            ) : null}
          </div>

          {state.status === 'loading' ? (
            <div className="state-message" role="status">
              <h3>Loading {resourceLabel}</h3>
              <p>Published records are being requested from the Sport Analytics API.</p>
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="state-message state-message--error" role="alert">
              <h3>{title} could not be loaded</h3>
              <p>{state.error.message}</p>
              <button className="button button--secondary" onClick={state.reload} type="button">
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
              <ul className="record-list">{state.data.data.map(renderItem)}</ul>
              {state.data.pagination.nextCursor ? (
                <nav aria-label={`${title} pagination`} className="pagination">
                  <Link
                    className="button button--secondary"
                    to={{
                      search: (() => {
                        const nextSearch = new URLSearchParams(searchParams);
                        nextSearch.set('cursor', state.data.pagination.nextCursor);
                        return `?${nextSearch.toString()}`;
                      })(),
                    }}
                  >
                    Next page
                  </Link>
                </nav>
              ) : (
                <p className="pagination__end">End of published results</p>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
