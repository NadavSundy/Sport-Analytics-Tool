import type {
  ApiErrorDetail,
  Fixture,
  Participant,
  SubmissionEvent,
} from '@sport-analytics/contracts';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ApiResponseError } from '../../api/client';
import { TextField } from '../../components/TextField';
import { publicReadApi } from '../../api/public-read';
import { usePublicData } from '../browse/usePublicData';
import { FixtureStatisticsOverview } from '../statistics/StatisticsPages';
import { useAuthenticatedApiClient } from '../auth/useAuthenticatedApiClient';
import { correctEvent } from './correction-api';

type CorrectionResult =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'accepted'; revision: number }
  | { kind: 'rejected'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'denied' };

type FieldErrors = Record<string, string>;

function eventLabel(event: SubmissionEvent): string {
  return `Delivery ${event.sequenceNumber} - ball ${event.ballNumber}`;
}

function fieldKey(detail: ApiErrorDetail): string {
  const field = detail.field?.replace(/^event\./, '') ?? 'eventId';

  if (field === 'runs.total') {
    return 'runs.offBat';
  }

  if (field === 'runs.extras' || field.startsWith('extras.')) {
    return field === 'runs.extras' ? 'extras' : field;
  }

  if (field.startsWith('wickets')) {
    return 'wickets';
  }

  return field;
}

function detailsToFieldErrors(details: ApiErrorDetail[]): FieldErrors {
  return details.reduce<FieldErrors>((errors, detail) => {
    const key = fieldKey(detail);
    errors[key] = errors[key] ? `${errors[key]} ${detail.message}` : detail.message;
    return errors;
  }, {});
}

function participantName(participants: Participant[], participantId: string): string {
  return (
    participants.find((participant) => participant.participantId === participantId)?.displayName ??
    'Participant unavailable'
  );
}

interface ParticipantSelectProps {
  disabled: boolean;
  error?: string;
  id: string;
  label: string;
  onChange: (participantId: string) => void;
  participants: Participant[];
  value: string;
}

function ParticipantSelect({
  disabled,
  error,
  id,
  label,
  onChange,
  participants,
  value,
}: ParticipantSelectProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      <select
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className="ui-field__input"
        disabled={disabled}
        id={id}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
        value={value}
      >
        {!participants.some((participant) => participant.participantId === value) ? (
          <option value={value}>{participantName(participants, value)}</option>
        ) : null}
        {participants.map((participant) => (
          <option key={participant.participantId} value={participant.participantId}>
            {participant.displayName}
          </option>
        ))}
      </select>
      {error ? (
        <p className="ui-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function numberValue(value: string): number {
  return Number.parseInt(value, 10) || 0;
}

function extraTotal(event: SubmissionEvent): number {
  return Object.values(event.extras).reduce<number>((total, value) => total + (value ?? 0), 0);
}

interface CorrectionFormProps {
  event: SubmissionEvent;
  fieldErrors: FieldErrors;
  fixture: Fixture;
  onChange: (event: SubmissionEvent) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>, wicketsJson: string) => void;
  participants: Participant[];
  result: CorrectionResult;
}

function CorrectionForm({
  event,
  fieldErrors,
  fixture,
  onChange,
  onSubmit,
  participants,
  result,
}: CorrectionFormProps) {
  const disabled = result.kind === 'submitting';
  const [wicketsJson, setWicketsJson] = useState(() => JSON.stringify(event.wickets, null, 2));
  const extras = extraTotal(event);

  useEffect(() => {
    setWicketsJson(JSON.stringify(event.wickets, null, 2));
  }, [event.eventId, event.wickets]);

  function update<Key extends keyof SubmissionEvent>(key: Key, value: SubmissionEvent[Key]) {
    onChange({ ...event, [key]: value });
  }

  function updateExtra(key: keyof SubmissionEvent['extras'], value: number) {
    onChange({
      ...event,
      runs: { ...event.runs, extras: extras - (event.extras[key] ?? 0) + value },
      extras: { ...event.extras, [key]: value },
    });
  }

  const totalRuns = event.runs.offBat + extras;

  return (
    <form
      className="correction-form"
      onSubmit={(submitEvent) => onSubmit(submitEvent, wicketsJson)}
    >
      <header className="correction-form__heading">
        <div>
          <p className="eyebrow">Current accepted event</p>
          <h3>{eventLabel(event)}</h3>
        </div>
        <p>{fixture.competitors.map((team) => team.name).join(' vs ')}</p>
      </header>

      <dl className="correction-event-reference">
        <div>
          <dt>Event reference</dt>
          <dd
            aria-describedby={fieldErrors.eventId ? 'correction-event-reference-error' : undefined}
          >
            {event.eventId}
          </dd>
          {fieldErrors.eventId ? (
            <dd className="ui-field__error" id="correction-event-reference-error">
              {fieldErrors.eventId}
            </dd>
          ) : null}
        </div>
        <div>
          <dt>Occurrence order</dt>
          <dd>{event.sequenceNumber} (kept by the backend)</dd>
        </div>
      </dl>

      <fieldset className="correction-fieldset">
        <legend>Delivery position</legend>
        <div className="correction-form__grid">
          <TextField
            disabled={disabled}
            error={fieldErrors.inningsId ?? ''}
            id="correction-innings"
            label="Innings reference"
            onChange={(changeEvent) => update('inningsId', changeEvent.target.value)}
            required
            value={event.inningsId}
          />
          <TextField
            disabled={disabled}
            error={fieldErrors.overNumber ?? ''}
            id="correction-over"
            label="Over number"
            min={0}
            onChange={(changeEvent) => update('overNumber', numberValue(changeEvent.target.value))}
            required
            type="number"
            value={event.overNumber}
          />
          <TextField
            disabled={disabled}
            error={fieldErrors.positionInOver ?? ''}
            id="correction-position"
            label="Delivery position in over"
            min={0}
            onChange={(changeEvent) =>
              update('positionInOver', numberValue(changeEvent.target.value))
            }
            required
            type="number"
            value={event.positionInOver}
          />
          <TextField
            disabled={disabled}
            error={fieldErrors.ballNumber ?? ''}
            helpText="Use the printed cricket form, for example 5.1."
            id="correction-ball-number"
            label="Printed ball number"
            onChange={(changeEvent) => update('ballNumber', changeEvent.target.value)}
            required
            value={event.ballNumber}
          />
        </div>
      </fieldset>

      <fieldset className="correction-fieldset">
        <legend>Players</legend>
        <div className="correction-form__grid">
          <ParticipantSelect
            disabled={disabled}
            error={fieldErrors.strikerId ?? ''}
            id="correction-striker"
            label="Striker"
            onChange={(participantId) => update('strikerId', participantId)}
            participants={participants}
            value={event.strikerId}
          />
          <ParticipantSelect
            disabled={disabled}
            error={fieldErrors.nonStrikerId ?? ''}
            id="correction-non-striker"
            label="Non-striker"
            onChange={(participantId) => update('nonStrikerId', participantId)}
            participants={participants}
            value={event.nonStrikerId}
          />
          <ParticipantSelect
            disabled={disabled}
            error={fieldErrors.bowlerId ?? ''}
            id="correction-bowler"
            label="Bowler"
            onChange={(participantId) => update('bowlerId', participantId)}
            participants={participants}
            value={event.bowlerId}
          />
        </div>
      </fieldset>

      <fieldset className="correction-fieldset">
        <legend>Runs and extras</legend>
        <div className="correction-form__grid">
          <TextField
            disabled={disabled}
            error={fieldErrors['runs.offBat'] ?? ''}
            id="correction-off-bat"
            label="Runs off the bat"
            min={0}
            onChange={(changeEvent) =>
              update('runs', {
                ...event.runs,
                offBat: numberValue(changeEvent.target.value),
                extras,
                total: numberValue(changeEvent.target.value) + extras,
              })
            }
            required
            type="number"
            value={event.runs.offBat}
          />
          {(
            [
              ['wides', 'Wides'],
              ['noBalls', 'No-balls'],
              ['byes', 'Byes'],
              ['legByes', 'Leg-byes'],
              ['penalty', 'Penalty extras'],
            ] as const
          ).map(([key, label]) => (
            <TextField
              disabled={disabled}
              error={fieldErrors[`extras.${key}`] ?? fieldErrors.extras ?? ''}
              id={`correction-${key}`}
              key={key}
              label={label}
              min={0}
              onChange={(changeEvent) => updateExtra(key, numberValue(changeEvent.target.value))}
              required
              type="number"
              value={event.extras[key] ?? 0}
            />
          ))}
        </div>
        <dl className="correction-derived-values" aria-label="Read-only derived event values">
          <div>
            <dt>Delivery extras</dt>
            <dd>{extras}</dd>
          </div>
          <div>
            <dt>Delivery total</dt>
            <dd>{totalRuns}</dd>
          </div>
        </dl>
        <p className="field-help">
          These delivery values are calculated from the editable run fields. Published match and
          player statistics remain read-only and are recalculated by the backend.
        </p>
        <label className="correction-checkbox" htmlFor="correction-non-boundary">
          <input
            checked={event.runs.nonBoundary}
            disabled={disabled}
            id="correction-non-boundary"
            onChange={(changeEvent) =>
              update('runs', { ...event.runs, nonBoundary: changeEvent.target.checked })
            }
            type="checkbox"
          />
          Mark runs off the bat as non-boundary runs
        </label>
      </fieldset>

      <div className="submission-field correction-wickets-field">
        <label htmlFor="correction-wickets">Wickets on this delivery</label>
        <p className="field-help" id="correction-wickets-help">
          Edit the prefilled Basic schema wicket array. Use an empty array when no wicket fell.
        </p>
        <textarea
          aria-describedby={[
            'correction-wickets-help',
            fieldErrors.wickets ? 'correction-wickets-error' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={fieldErrors.wickets ? true : undefined}
          disabled={disabled}
          id="correction-wickets"
          onChange={(changeEvent) => setWicketsJson(changeEvent.target.value)}
          rows={8}
          spellCheck={false}
          value={wicketsJson}
        />
        {fieldErrors.wickets ? (
          <p className="ui-field__error" id="correction-wickets-error">
            {fieldErrors.wickets}
          </p>
        ) : null}
      </div>

      <button className="button button--primary" disabled={disabled} type="submit">
        {disabled ? 'Saving correction...' : 'Save correction'}
      </button>
    </form>
  );
}

export function CorrectionWorkspace({
  fixture,
  initialEvents,
}: {
  fixture: Fixture;
  initialEvents: SubmissionEvent[];
}) {
  const client = useAuthenticatedApiClient();
  const headingId = useId();
  const resultRegionRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState(initialEvents[0]?.eventId ?? '');
  const [draft, setDraft] = useState(initialEvents[0]);
  const [result, setResult] = useState<CorrectionResult>({ kind: 'idle' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [statisticsRefresh, setStatisticsRefresh] = useState(0);
  const loadParticipants = useCallback(
    (signal: AbortSignal) =>
      publicReadApi.listParticipants(
        `?fixtureId=${encodeURIComponent(fixture.fixtureId)}&limit=100`,
        signal,
      ),
    [fixture.fixtureId],
  );
  const participantsState = usePublicData(loadParticipants, fixture.fixtureId);

  useEffect(() => {
    if (
      result.kind === 'accepted' ||
      result.kind === 'rejected' ||
      result.kind === 'error' ||
      result.kind === 'denied'
    ) {
      resultRegionRef.current
        ?.querySelector<HTMLElement>('[data-correction-result-heading]')
        ?.focus();
    }
  }, [result]);

  function chooseEvent(eventId: string) {
    const selected = events.find((event) => event.eventId === eventId);
    setSelectedEventId(eventId);
    setDraft(selected);
    setResult({ kind: 'idle' });
    setFieldErrors({});
  }

  async function handleCorrection(
    submitEvent: React.FormEvent<HTMLFormElement>,
    wicketsJson: string,
  ) {
    submitEvent.preventDefault();
    if (!draft) {
      return;
    }

    let wickets: SubmissionEvent['wickets'];
    try {
      const parsed = JSON.parse(wicketsJson) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error();
      }
      wickets = parsed as SubmissionEvent['wickets'];
    } catch {
      setFieldErrors({ wickets: 'Enter a valid JSON array of wickets.' });
      setResult({ kind: 'rejected', message: 'The correction contains invalid wicket data.' });
      return;
    }

    const correctedDraft = {
      ...draft,
      runs: {
        ...draft.runs,
        extras: extraTotal(draft),
        total: draft.runs.offBat + extraTotal(draft),
      },
      wickets,
    };
    setResult({ kind: 'submitting' });
    setFieldErrors({});

    try {
      const response = await correctEvent(client, fixture.fixtureId, correctedDraft);
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.eventId === correctedDraft.eventId ? correctedDraft : event,
        ),
      );
      setDraft(correctedDraft);
      setResult({ kind: 'accepted', revision: response.data.revision });
      setStatisticsRefresh((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiResponseError && (error.status === 401 || error.status === 403)) {
        setResult({ kind: 'denied' });
      } else if (error instanceof ApiResponseError && error.status === 409) {
        setFieldErrors({
          eventId: error.message,
          inningsId: error.message,
          overNumber: error.message,
          positionInOver: error.message,
        });
        setResult({
          kind: 'rejected',
          message:
            'This event changed or its delivery position now conflicts with another accepted event. Review the highlighted event position before trying again.',
        });
      } else if (error instanceof ApiResponseError && error.details) {
        setFieldErrors(detailsToFieldErrors(error.details));
        setResult({ kind: 'rejected', message: error.message });
      } else {
        setResult({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'The correction could not be saved. The current event remains unchanged.',
        });
      }
    }
  }

  return (
    <section aria-labelledby={headingId} className="correction-workspace">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Accepted submission</p>
          <h2 id={headingId}>Correct an accepted event</h2>
        </div>
        <p>{events.length} available</p>
      </div>
      <p className="correction-workspace__intro">
        Choose an event from this accepted submission. The form keeps the event identity and
        occurrence order while the backend validates and stores an immutable correction.
      </p>

      {result.kind === 'denied' ? (
        <div className="state-message state-message--error" ref={resultRegionRef} role="alert">
          <h3 data-correction-result-heading tabIndex={-1}>
            Correction access denied
          </h3>
          <p>
            Your session, submitter role, or competition scope no longer permits this correction.
            The accepted event was not changed.
          </p>
        </div>
      ) : participantsState.status === 'loading' ? (
        <div className="state-message" role="status">
          <h3>Loading correction labels</h3>
          <p>Loading the participating player names for this match...</p>
        </div>
      ) : participantsState.status === 'error' ? (
        <div className="state-message state-message--error" role="alert">
          <h3>Correction form could not be loaded</h3>
          <p>Player labels are unavailable, so no correction action is offered.</p>
          <button
            className="button button--secondary"
            onClick={participantsState.reload}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {events.length > 1 ? (
            <div className="submission-field correction-event-picker">
              <label htmlFor="correction-event">Accepted event</label>
              <select
                disabled={result.kind === 'submitting'}
                id="correction-event"
                onChange={(changeEvent) => chooseEvent(changeEvent.target.value)}
                value={selectedEventId}
              >
                {events.map((event) => (
                  <option key={event.eventId} value={event.eventId}>
                    {eventLabel(event)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {draft ? (
            <CorrectionForm
              event={draft}
              fieldErrors={fieldErrors}
              fixture={fixture}
              onChange={(changedEvent) => {
                setDraft(changedEvent);
                if (result.kind !== 'idle' && result.kind !== 'submitting') {
                  setResult({ kind: 'idle' });
                  setFieldErrors({});
                }
              }}
              onSubmit={handleCorrection}
              participants={participantsState.data.data}
              result={result}
            />
          ) : null}

          <div ref={resultRegionRef}>
            {result.kind === 'accepted' ? (
              <div className="submission-result submission-result--success" role="status">
                <h3 data-correction-result-heading tabIndex={-1}>
                  Correction saved
                </h3>
                <p>
                  Revision {result.revision} is now current. The displayed event and match
                  statistics below have been refreshed.
                </p>
              </div>
            ) : result.kind === 'rejected' ? (
              <div className="submission-result submission-result--error" role="alert">
                <h3 data-correction-result-heading tabIndex={-1}>
                  Correction rejected
                </h3>
                <p>{result.message} The accepted event was not changed.</p>
              </div>
            ) : result.kind === 'error' ? (
              <div className="submission-result submission-result--error" role="alert">
                <h3 data-correction-result-heading tabIndex={-1}>
                  Correction failed
                </h3>
                <p>{result.message}</p>
              </div>
            ) : null}
          </div>
        </>
      )}

      <FixtureStatisticsOverview
        fixtureId={fixture.fixtureId}
        key={`${fixture.fixtureId}:${statisticsRefresh}`}
      />
    </section>
  );
}
