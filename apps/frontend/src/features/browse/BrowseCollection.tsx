import type { CollectionResponse } from '../../api/public-read';
import { type FormEvent, type ReactNode, useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NameCombobox, type NameComboboxOption } from './NameCombobox';
import { usePublicData } from './usePublicData';

interface TextFilterField {
  kind?: 'text';
  label: string;
  name: string;
  placeholder?: string;
  type?: 'date' | 'search' | 'text';
}

export interface NameComboboxFilterField {
  clears?: string[];
  dependsOn?: string[];
  entityName: string;
  kind: 'combobox';
  label: string;
  loadOptions(filters: URLSearchParams, signal: AbortSignal): Promise<NameComboboxOption[]>;
  name: string;
  placeholder?: string;
  routeValue: 'name' | 'reference';
}

export type FilterField = TextFilterField | NameComboboxFilterField;

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

function isComboboxField(field: FilterField): field is NameComboboxFilterField {
  return field.kind === 'combobox';
}

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

function dependentFieldNames(fields: FilterField[], parentName: string): string[] {
  const names = new Set<string>();

  function addDependents(name: string) {
    const field = fields.find((candidate) => candidate.name === name);
    if (!field || !isComboboxField(field)) {
      return;
    }

    for (const dependent of field.clears ?? []) {
      if (!names.has(dependent)) {
        names.add(dependent);
        addDependents(dependent);
      }
    }
  }

  addDependents(parentName);
  return [...names];
}

function FilterCombobox({
  field,
  inputValue,
  selectedValue,
  values,
  validationMessage,
  onInputChange,
  onSelectionChange,
  onSelectionResolved,
}: {
  field: NameComboboxFilterField;
  inputValue: string;
  selectedValue: string;
  values: Record<string, string>;
  validationMessage?: string | undefined;
  onInputChange(value: string): void;
  onSelectionChange(option: NameComboboxOption | null): void;
  onSelectionResolved(option: NameComboboxOption | null): void;
}) {
  const dependencyKey = useMemo(() => {
    const params = new URLSearchParams();
    for (const dependency of field.dependsOn ?? []) {
      const value = values[dependency];
      if (value) {
        params.set(dependency, value);
      }
    }
    return params.toString();
  }, [field.dependsOn, values]);
  const loadOptions = useCallback(
    (signal: AbortSignal) => field.loadOptions(new URLSearchParams(dependencyKey), signal),
    [dependencyKey, field],
  );

  return (
    <NameCombobox
      dependencyKey={dependencyKey}
      entityName={field.entityName}
      inputValue={inputValue}
      label={field.label}
      loadOptions={loadOptions}
      onInputChange={onInputChange}
      onSelectionChange={onSelectionChange}
      onSelectionResolved={onSelectionResolved}
      placeholder={field.placeholder}
      selectedValue={selectedValue}
      validationMessage={validationMessage}
    />
  );
}

function FilterForm({ fields }: { fields: FilterField[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialValues = Object.fromEntries(
    fields.map((field) => [field.name, searchParams.get(field.name) ?? '']),
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [inputValues, setInputValues] = useState<Record<string, string>>(
    Object.fromEntries(
      fields.map((field) => [
        field.name,
        isComboboxField(field) && field.routeValue === 'name'
          ? (initialValues[field.name] ?? '')
          : '',
      ]),
    ),
  );
  const [appliedLabels, setAppliedLabels] = useState<Record<string, string>>(
    Object.fromEntries(
      fields.map((field) => [
        field.name,
        isComboboxField(field) && field.routeValue === 'name'
          ? (initialValues[field.name] ?? '')
          : '',
      ]),
    ),
  );
  const [selectionValid, setSelectionValid] = useState<Record<string, boolean>>({});
  const [validationMessages, setValidationMessages] = useState<Record<string, string>>({});

  function clearDependentState(parentName: string) {
    const dependents = dependentFieldNames(fields, parentName);
    if (dependents.length === 0) {
      return;
    }

    setValues((current) => {
      const next = { ...current };
      dependents.forEach((name) => (next[name] = ''));
      return next;
    });
    setInputValues((current) => {
      const next = { ...current };
      dependents.forEach((name) => (next[name] = ''));
      return next;
    });
    setSelectionValid((current) => {
      const next = { ...current };
      dependents.forEach((name) => (next[name] = true));
      return next;
    });
    setValidationMessages((current) => {
      const next = { ...current };
      dependents.forEach((name) => delete next[name]);
      return next;
    });
  }

  function updateInput(field: NameComboboxFilterField, inputValue: string) {
    const hadSelection = Boolean(values[field.name]);
    setInputValues((current) => ({ ...current, [field.name]: inputValue }));
    setValues((current) => ({ ...current, [field.name]: '' }));
    setSelectionValid((current) => ({ ...current, [field.name]: true }));
    setValidationMessages((current) => {
      const next = { ...current };
      delete next[field.name];
      return next;
    });
    if (hadSelection) {
      clearDependentState(field.name);
    }
  }

  function updateSelection(field: NameComboboxFilterField, option: NameComboboxOption | null) {
    const previousValue = values[field.name];
    const nextValue = option?.value ?? '';
    setValues((current) => ({ ...current, [field.name]: nextValue }));
    setInputValues((current) => ({ ...current, [field.name]: option?.label ?? '' }));
    setSelectionValid((current) => ({ ...current, [field.name]: true }));
    setValidationMessages((current) => {
      const next = { ...current };
      delete next[field.name];
      return next;
    });
    if (previousValue !== nextValue) {
      clearDependentState(field.name);
    }
  }

  function resolveSelection(field: NameComboboxFilterField, option: NameComboboxOption | null) {
    setSelectionValid((current) => ({ ...current, [field.name]: Boolean(option) }));
    if (option) {
      setInputValues((current) => ({ ...current, [field.name]: option.label }));
      if (searchParams.get(field.name) === option.value) {
        setAppliedLabels((current) => ({ ...current, [field.name]: option.label }));
      }
      setValidationMessages((current) => {
        const next = { ...current };
        delete next[field.name];
        return next;
      });
    } else {
      setValidationMessages((current) => ({
        ...current,
        [field.name]: `The selected ${field.entityName} is no longer available. Clear it or choose another.`,
      }));
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextValidationMessages: Record<string, string> = {};

    for (const field of fields.filter(isComboboxField)) {
      if (inputValues[field.name]?.trim() && !values[field.name]) {
        nextValidationMessages[field.name] =
          `Choose a ${field.entityName} from the suggestions or clear the field.`;
      } else if (values[field.name] && selectionValid[field.name] === false) {
        nextValidationMessages[field.name] =
          `The selected ${field.entityName} is no longer available. Clear it or choose another.`;
      }
    }

    setValidationMessages(nextValidationMessages);
    if (Object.keys(nextValidationMessages).length > 0) {
      return;
    }

    const formValues = new FormData(event.currentTarget);
    const nextSearch = new URLSearchParams();

    for (const field of fields) {
      const text = isComboboxField(field)
        ? values[field.name]
        : String(formValues.get(field.name) ?? '').trim();
      if (text) {
        nextSearch.set(field.name, text);
      }
    }

    const limit = String(formValues.get('limit') ?? '').trim();
    if (limit) {
      nextSearch.set('limit', limit);
    }

    setSearchParams(nextSearch);
  }

  const activeFilters = fields.flatMap((field) => {
    const value = searchParams.get(field.name);
    if (!value) {
      return [];
    }

    if (!isComboboxField(field)) {
      return [{ label: field.label, value }];
    }

    return [
      {
        label: field.label,
        value: appliedLabels[field.name] || `${field.entityName} name unavailable`,
      },
    ];
  });

  return (
    <form className="filter-panel" onSubmit={applyFilters}>
      <div className="filter-panel__heading">
        <h2>Filter records</h2>
        <Link className="text-link" to=".">
          Clear filters
        </Link>
      </div>
      <div className="filter-grid">
        {fields.map((field) => {
          if (isComboboxField(field)) {
            return (
              <FilterCombobox
                field={field}
                inputValue={inputValues[field.name] ?? ''}
                key={field.name}
                onInputChange={(value) => updateInput(field, value)}
                onSelectionChange={(option) => updateSelection(field, option)}
                onSelectionResolved={(option) => resolveSelection(field, option)}
                selectedValue={values[field.name] ?? ''}
                validationMessage={validationMessages[field.name]}
                values={values}
              />
            );
          }

          const { label, name, placeholder, type = 'text' } = field;
          return (
            <label className="field" key={name}>
              <span>{label}</span>
              <input
                defaultValue={searchParams.get(name) ?? ''}
                name={name}
                placeholder={placeholder}
                type={type}
              />
            </label>
          );
        })}
        <label className="field">
          <span>Records per page</span>
          <select defaultValue={searchParams.get('limit') ?? '50'} name="limit">
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>

      {activeFilters.length > 0 ? (
        <div aria-live="polite" className="active-filter-summary">
          <h3>Active filters</h3>
          <ul>
            {activeFilters.map((filter) => (
              <li key={filter.label}>
                <span>{filter.label}:</span> {filter.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
        <FilterForm fields={filters} key={searchParams.toString()} />

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
