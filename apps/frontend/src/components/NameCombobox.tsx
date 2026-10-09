import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface NameComboboxOption {
  description?: string;
  keywords?: string[];
  label: string;
  value: string;
}

interface NameComboboxProps {
  descriptionId?: string;
  dependencyKey: string;
  disabled?: boolean;
  entityName: string;
  inputValue: string;
  label: string;
  loadOptions(query: string, signal: AbortSignal): Promise<NameComboboxOption[]>;
  onInputChange(value: string): void;
  onSelectionChange(option: NameComboboxOption | null): void;
  onSelectionResolved(option: NameComboboxOption | null): void;
  placeholder?: string | undefined;
  resolveSelectedOption?(value: string, signal: AbortSignal): Promise<NameComboboxOption | null>;
  selectedValue: string;
  validationMessage?: string | undefined;
}

type OptionsState =
  | { status: 'idle'; options: NameComboboxOption[] }
  | { status: 'loading'; options: NameComboboxOption[] }
  | { status: 'ready'; options: NameComboboxOption[] }
  | { status: 'error'; options: NameComboboxOption[] };

function normalizedText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scoreText(value: string, query: string): number | null {
  const normalizedValue = normalizedText(value);
  const normalizedQuery = normalizedText(query.trim());

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedValue === normalizedQuery) {
    return 10_000;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 8_000 - normalizedValue.length;
  }

  const wordIndex = normalizedValue.search(new RegExp(`(?:^|\\s)${escapeRegExp(normalizedQuery)}`));
  if (wordIndex >= 0) {
    return 7_000 - wordIndex;
  }

  const substringIndex = normalizedValue.indexOf(normalizedQuery);
  if (substringIndex >= 0) {
    return 6_000 - substringIndex;
  }

  let valueIndex = 0;
  let previousMatch = -2;
  let score = 1_000;

  for (const character of normalizedQuery) {
    const matchIndex = normalizedValue.indexOf(character, valueIndex);
    if (matchIndex < 0) {
      return null;
    }

    score += matchIndex === previousMatch + 1 ? 20 : 5;
    score -= matchIndex - valueIndex;
    previousMatch = matchIndex;
    valueIndex = matchIndex + 1;
  }

  return score - normalizedValue.length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function fuzzyRankOptions(
  options: NameComboboxOption[],
  query: string,
): NameComboboxOption[] {
  return options
    .map((option) => {
      const scores = [option.label, ...(option.keywords ?? [])]
        .map((value) => scoreText(value, query))
        .filter((score): score is number => score !== null);

      return {
        option,
        score: scores.length > 0 ? Math.max(...scores) : null,
      };
    })
    .filter(
      (candidate): candidate is { option: NameComboboxOption; score: number } =>
        candidate.score !== null,
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.option.label.localeCompare(right.option.label),
    )
    .map(({ option }) => option);
}

export function NameCombobox({
  descriptionId,
  dependencyKey,
  disabled = false,
  entityName,
  inputValue,
  label,
  loadOptions,
  onInputChange,
  onSelectionChange,
  onSelectionResolved,
  placeholder,
  resolveSelectedOption,
  selectedValue,
  validationMessage,
}: NameComboboxProps) {
  const generatedId = useId();
  const inputId = `name-combobox-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const feedbackId = `${inputId}-feedback`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const loadedRequestKeyRef = useRef<string | null>(null);
  const onSelectionResolvedRef = useRef(onSelectionResolved);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<OptionsState>({ status: 'idle', options: [] });
  const requestKey = `${dependencyKey}\u0000${inputValue.trim()}`;
  const shouldResolveSelected =
    Boolean(selectedValue) &&
    !inputValue.trim() &&
    (state.status === 'idle' || state.status === 'loading') &&
    Boolean(resolveSelectedOption);
  const shouldLoad =
    (open && loadedRequestKeyRef.current !== requestKey) ||
    (Boolean(selectedValue) &&
      !resolveSelectedOption &&
      (state.status === 'idle' || state.status === 'loading'));

  useEffect(() => {
    onSelectionResolvedRef.current = onSelectionResolved;
  }, [onSelectionResolved]);

  useEffect(() => {
    if (!shouldLoad && !shouldResolveSelected) {
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ status: 'loading', options: current.options }));

    const load = shouldResolveSelected
      ? resolveSelectedOption!(selectedValue, controller.signal).then((option) =>
          option ? [option] : [],
        )
      : loadOptions(inputValue.trim(), controller.signal);

    void load
      .then((options) => {
        if (controller.signal.aborted) {
          return;
        }

        if (!shouldResolveSelected) {
          loadedRequestKeyRef.current = requestKey;
        }
        setState({ status: 'ready', options });
        if (selectedValue && !inputValue.trim()) {
          onSelectionResolvedRef.current(
            options.find((option) => option.value === selectedValue) ?? null,
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          loadedRequestKeyRef.current = requestKey;
          setState((current) => ({ status: 'error', options: current.options }));
        }
      });

    return () => controller.abort();
  }, [
    inputValue,
    loadOptions,
    requestKey,
    requestVersion,
    resolveSelectedOption,
    selectedValue,
    shouldLoad,
    shouldResolveSelected,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function dismiss(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  const selectedOption = state.options.find((option) => option.value === selectedValue);
  const searchQuery = selectedOption?.label === inputValue ? '' : inputValue;
  const rankedOptions = useMemo(
    () => fuzzyRankOptions(state.options, searchQuery),
    [searchQuery, state.options],
  );
  const activeOption = activeIndex >= 0 ? rankedOptions[activeIndex] : undefined;
  const optionsPending = open && loadedRequestKeyRef.current !== requestKey;
  const activeOptionId = activeOption ? `${listboxId}-${activeIndex}` : undefined;

  // Keyboard navigation moves the active option with aria-activedescendant
  // while focus stays on the input, so the browser will not scroll the list on
  // its own. Bring the active option into view when it would otherwise sit
  // outside the scrolled list.
  useEffect(() => {
    if (!activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeOptionId]);

  function showOptions() {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(-1);
  }

  function choose(option: NameComboboxOption) {
    onSelectionChange(option);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'Tab') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      showOptions();
      if (rankedOptions.length > 0) {
        setActiveIndex((current) => {
          if (event.key === 'ArrowDown') {
            return current < rankedOptions.length - 1 ? current + 1 : 0;
          }
          return current > 0 ? current - 1 : rankedOptions.length - 1;
        });
      }
      return;
    }

    if (event.key === 'Home' && open && rankedOptions.length > 0) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End' && open && rankedOptions.length > 0) {
      event.preventDefault();
      setActiveIndex(rankedOptions.length - 1);
      return;
    }

    if (event.key === 'Enter' && open && activeOption) {
      event.preventDefault();
      choose(activeOption);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const announcement = (() => {
    if (!open) {
      return selectedOption ? `${selectedOption.label} selected.` : '';
    }
    if (state.status === 'loading' || optionsPending) {
      return searchQuery
        ? `Matching ${entityName} options are loading.`
        : `Loading ${entityName} options.`;
    }
    if (state.status === 'error') {
      return `${label} options could not be loaded.`;
    }
    if (state.status === 'ready' && rankedOptions.length === 0) {
      return searchQuery
        ? `No such ${entityName} was found.`
        : `No ${entityName} options are available.`;
    }
    if (state.status === 'ready') {
      return `${rankedOptions.length} ${entityName} ${rankedOptions.length === 1 ? 'option' : 'options'} available.`;
    }
    return '';
  })();

  return (
    <div className="field name-combobox" onBlur={handleBlur} ref={wrapperRef}>
      <label htmlFor={inputId}>{label}</label>
      <div className="name-combobox__control">
        <input
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-describedby={
            [descriptionId, validationMessage ? feedbackId : undefined].filter(Boolean).join(' ') ||
            undefined
          }
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={validationMessage ? 'true' : undefined}
          autoComplete="off"
          disabled={disabled}
          id={inputId}
          onChange={(event) => {
            onInputChange(event.target.value);
            showOptions();
          }}
          onFocus={() => {
            if (open) {
              showOptions();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          type="text"
          value={inputValue}
        />
        {selectedValue ? (
          <button
            aria-label={`Clear ${label.toLocaleLowerCase()}`}
            className="name-combobox__clear"
            disabled={disabled}
            onClick={() => {
              onSelectionChange(null);
              setOpen(false);
            }}
            type="button"
          >
            Clear
          </button>
        ) : null}
        <button
          aria-label={`${open ? 'Hide' : 'Show'} ${label.toLocaleLowerCase()} options`}
          aria-expanded={open}
          className="name-combobox__toggle"
          disabled={disabled}
          onClick={() => {
            if (open) {
              setOpen(false);
              setActiveIndex(-1);
            } else {
              showOptions();
            }
          }}
          type="button"
        >
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
      </div>

      {validationMessage ? (
        <p className="field-error" id={feedbackId}>
          {validationMessage}
        </p>
      ) : null}

      <span aria-live="polite" className="visually-hidden">
        {announcement}
      </span>

      {open ? (
        // Pressing anywhere in the popover — an option, the list's scrollbar or
        // its padding — must not move focus off the input. Without this, a press
        // on the scrollbar (which belongs to the list, not to an option) sent
        // focus to the body, the blur handler closed the list and it could only
        // be scrolled with a wheel or trackpad (#907). Scrollbar dragging is not
        // a default action of `mousedown`, so it still works.
        <div
          className="name-combobox__popover"
          onMouseDown={(event) => {
            if (event.button === 0) event.preventDefault();
          }}
        >
          {state.status === 'loading' || optionsPending ? (
            <p className="name-combobox__state" role="status">
              {searchQuery
                ? `Matching ${entityName} options are loading…`
                : `Loading ${entityName} options…`}
            </p>
          ) : null}

          {state.status === 'error' && !optionsPending ? (
            <div className="name-combobox__state name-combobox__state--error" role="alert">
              <p>{label} options could not be loaded.</p>
              <button
                className="button button--secondary"
                onClick={() => {
                  loadedRequestKeyRef.current = null;
                  setRequestVersion((version) => version + 1);
                }}
                type="button"
              >
                Retry {entityName} options
              </button>
            </div>
          ) : null}

          {state.status === 'ready' && !optionsPending && rankedOptions.length === 0 ? (
            <p className="name-combobox__state" role="status">
              {searchQuery
                ? `No such ${entityName} was found.`
                : `No ${entityName} options are available.`}
            </p>
          ) : null}

          {state.status === 'ready' && !optionsPending && rankedOptions.length > 0 ? (
            <ul
              aria-label={`${label} options`}
              className="name-combobox__options"
              id={listboxId}
              role="listbox"
            >
              {rankedOptions.map((option, index) => (
                <li
                  aria-selected={option.value === selectedValue}
                  className={
                    index === activeIndex
                      ? 'name-combobox__option is-active'
                      : 'name-combobox__option'
                  }
                  id={`${listboxId}-${index}`}
                  key={option.value}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                >
                  <span>{option.label}</span>
                  {option.description ? <small>{option.description}</small> : null}
                  {option.value === selectedValue ? (
                    <small className="name-combobox__selected-marker">Selected</small>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
