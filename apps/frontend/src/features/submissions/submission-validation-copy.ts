import type { ApiErrorDetail } from '@sport-analytics/contracts';

const fieldLabels: Record<string, string> = {
  file: 'File',
  fixtureId: 'Fixture',
  schemaVersion: 'Schema version',
  eventId: 'Event identifier',
  inningsId: 'Innings',
  sequenceNumber: 'Delivery sequence',
  occurrenceSequence: 'Delivery sequence',
  overNumber: 'Over number',
  positionInOver: 'Delivery in over',
  ballNumber: 'Ball number',
  ballLabel: 'Ball number',
  striker: 'Striker',
  strikerId: 'Striker',
  nonStriker: 'Non-striker',
  nonStrikerId: 'Non-striker',
  bowler: 'Bowler',
  bowlerId: 'Bowler',
  'runs.offBat': 'Runs off bat',
  'runs.extras': 'Extra runs',
  'runs.total': 'Total runs',
  'runs.nonBoundary': 'Non-boundary runs',
  'extras.byes': 'Byes',
  'extras.legByes': 'Leg byes',
  'extras.noBalls': 'No-balls',
  'extras.wides': 'Wides',
  'extras.penalty': 'Penalty runs',
  wickets: 'Wickets',
  'wickets.*.kind': 'Dismissal type',
  'wickets.*.playerOut': 'Dismissed player',
  'wickets.*.playerOutId': 'Dismissed player',
  'wickets.*.fielders': 'Fielders',
};

const validationRuleLabels: Record<string, string> = {
  EVENT_SCHEMA_INVALID: 'Event data needs correction',
  STAGED_EVENT_INVALID: 'Event data needs correction',
  INVALID_VALUE: 'Value needs correction',
  PACKAGE_ITEM_INVALID: 'Package item needs correction',
  PACKAGE_PARSE_FAILED: 'Package could not be read',
  PACKAGE_ENVELOPE_MISMATCH: 'Package details do not match',
  CSV_MALFORMED_ROW: 'CSV row could not be read',
  CSV_COLUMN_COUNT: 'CSV row has the wrong number of columns',
  NDJSON_MALFORMED_RECORD: 'NDJSON record could not be read',
  NDJSON_MANIFEST_INVALID: 'NDJSON manifest needs correction',
  NDJSON_FIXTURE_INVALID: 'Fixture data needs correction',
  NDJSON_INNINGS_INVALID: 'Innings data needs correction',
  NDJSON_PARTICIPANT_INVALID: 'Participant data needs correction',
  NDJSON_EVENT_INVALID: 'Event data needs correction',
  NDJSON_CONTEXT_MISSING: 'Required context is missing',
  NDJSON_RECORD_TYPE: 'NDJSON record type is not supported',
  REFERENCE_RESOLUTION_FAILED: 'Reference could not be matched',
  REFERENCE_RESOLUTION_MISSING: 'Reference is missing',
  UNRESOLVED_REFERENCE: 'Reference could not be matched',
  REFERENCE_AMBIGUOUS: 'More than one match was found',
  AMBIGUOUS_REFERENCE: 'More than one match was found',
  AMBIGUOUS_PARTICIPANT: 'More than one participant matches',
  DUPLICATE_BATCH_ITEM: 'Duplicate item',
  DUPLICATE_SOURCE_EVENT: 'Duplicate event',
  DUPLICATE_OCCURRENCE_SEQUENCE: 'Duplicate delivery sequence',
  EXACT_PUBLISHED_DUPLICATE: 'Event is already published',
  EVENT_POSITION_UNAVAILABLE: 'Delivery position is already in use',
  EVENT_CONFLICT: 'Event conflicts with existing data',
  PUBLISHED_DELIVERY_CONFLICT: 'Delivery conflicts with published data',
  PUBLISHED_NATURAL_KEY_CONFLICT: 'Delivery conflicts with published data',
  FIXTURE_METADATA_CONFLICT: 'Fixture details conflict with existing data',
  BALL_NUMBER_OVER_MISMATCH: 'Ball number does not match the over',
  BALL_NUMBER_PROGRESSION_INVALID: 'Ball numbers are out of sequence',
  STRIKER_TEAM_INVALID: 'Striker does not belong to the batting team',
  NON_STRIKER_TEAM_INVALID: 'Non-striker does not belong to the batting team',
  BOWLER_TEAM_INVALID: 'Bowler does not belong to the fielding team',
  DISMISSED_PLAYER_INVALID: 'Dismissed player does not match the delivery',
  PARTICIPANT_COMPETITOR_UNKNOWN: 'Participant team could not be confirmed',
  CONTRADICTORY_WICKET: 'Wicket details conflict',
  DUPLICATE_WICKET: 'Wicket is duplicated',
  CRICKET_BUSINESS_RULE_FAILED: 'Cricket validation failed',
  NO_ACCEPTED_EVENTS: 'No valid events remain',
  INNINGS_WITHOUT_ACCEPTED_EVENTS: 'An innings has no valid events',
};

const validationRuleGuidance: Record<string, string> = {
  EVENT_SCHEMA_INVALID: 'Check this source value and correct it before resubmitting.',
  STAGED_EVENT_INVALID: 'Check this source value and correct it before resubmitting.',
  INVALID_VALUE: 'Check this source value and correct it before resubmitting.',
  PACKAGE_ITEM_INVALID: 'Check the reported source item and correct it before resubmitting.',
  PACKAGE_PARSE_FAILED: 'Check the file format and syntax, then try the upload again.',
  PACKAGE_ENVELOPE_MISMATCH: 'Check the package header and the selected submission context.',
  CSV_MALFORMED_ROW: 'Check the quoted values and separators on this row.',
  CSV_COLUMN_COUNT: 'Check that this row has the same columns as the CSV header.',
  NDJSON_MALFORMED_RECORD: 'Check that this line contains one complete JSON object.',
  NDJSON_MANIFEST_INVALID: 'Check the manifest fields and try the upload again.',
  NDJSON_FIXTURE_INVALID: 'Check the fixture details on this record.',
  NDJSON_INNINGS_INVALID: 'Check the innings details on this record.',
  NDJSON_PARTICIPANT_INVALID: 'Check the participant details on this record.',
  NDJSON_EVENT_INVALID: 'Check the event details on this record.',
  NDJSON_CONTEXT_MISSING: 'Add the missing competition, season or fixture context.',
  NDJSON_RECORD_TYPE: 'Use one of the supported NDJSON record types.',
  REFERENCE_RESOLUTION_FAILED: 'Check the spelling or choose a matching record.',
  REFERENCE_RESOLUTION_MISSING: 'Add the missing name or reference before continuing.',
  UNRESOLVED_REFERENCE: 'Check the spelling or choose a matching record.',
  REFERENCE_AMBIGUOUS: 'Choose the correct match before continuing.',
  AMBIGUOUS_REFERENCE: 'Choose the correct match before continuing.',
  AMBIGUOUS_PARTICIPANT: 'Choose the correct participant before continuing.',
  DUPLICATE_BATCH_ITEM: 'Remove the repeated item or confirm which version should remain.',
  DUPLICATE_SOURCE_EVENT: 'Remove the repeated event or correct its source reference.',
  DUPLICATE_OCCURRENCE_SEQUENCE: 'Check the delivery order and remove the repeated sequence.',
  EXACT_PUBLISHED_DUPLICATE: 'No new copy is needed; the matching event is already published.',
  EVENT_POSITION_UNAVAILABLE: 'Check the fixture, innings, over and delivery position.',
  EVENT_CONFLICT: 'Check the submitted event against the existing published event.',
  PUBLISHED_DELIVERY_CONFLICT: 'Check the fixture, innings, over and delivery position.',
  PUBLISHED_NATURAL_KEY_CONFLICT: 'Check the fixture, innings, over and delivery position.',
  FIXTURE_METADATA_CONFLICT: 'Check the fixture date, teams and other fixture details.',
  BALL_NUMBER_OVER_MISMATCH: 'Check both the over number and the printed ball number.',
  BALL_NUMBER_PROGRESSION_INVALID: 'Check the order of deliveries within this over.',
  STRIKER_TEAM_INVALID: 'Check the striker and the batting team for this innings.',
  NON_STRIKER_TEAM_INVALID: 'Check the non-striker and the batting team for this innings.',
  BOWLER_TEAM_INVALID: 'Check the bowler and the fielding team for this innings.',
  DISMISSED_PLAYER_INVALID: 'Check the wicket and the batters involved in this delivery.',
  PARTICIPANT_COMPETITOR_UNKNOWN: 'Check the participant name and team context.',
  CONTRADICTORY_WICKET: 'Check the wicket type and the dismissal details.',
  DUPLICATE_WICKET: 'Remove the repeated wicket entry.',
  CRICKET_BUSINESS_RULE_FAILED: 'Check the reported delivery details and correct them.',
  NO_ACCEPTED_EVENTS: 'Correct the rejected events before asking for review.',
  INNINGS_WITHOUT_ACCEPTED_EVENTS: 'Correct or remove the invalid innings before continuing.',
};

function normaliseFieldPath(field: string): string {
  return field
    .trim()
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^events\.\d+\.?/, '')
    .replace(/^event\./, '')
    .replace(/\.\d+\./g, '.*.')
    .replace(/\.\d+$/, '.*');
}

function humaniseToken(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLocaleLowerCase();
  if (!words) return 'Value';
  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}

export function formatValidationField(field: string): string {
  const normalised = normaliseFieldPath(field);
  const knownPath = Object.keys(fieldLabels)
    .filter((path) => normalised === path || normalised.endsWith(`.${path}`))
    .sort((left, right) => right.length - left.length)[0];
  if (knownPath) return fieldLabels[knownPath]!;

  const lastSegment = normalised
    .split('.')
    .filter((segment) => segment && segment !== '*')
    .at(-1);
  return humaniseToken(lastSegment ?? normalised);
}

export function formatApiValidationLocation(
  detail: ApiErrorDetail,
  uploadedFile: boolean,
): string {
  const containerLabel =
    detail.eventIndex === undefined
      ? uploadedFile
        ? 'File'
        : 'Submission'
      : `${uploadedFile ? 'Row' : 'Event'} ${detail.eventIndex + 1}`;

  if (!detail.field) return containerLabel;
  const fieldLabel = formatValidationField(detail.field);
  if (detail.eventIndex === undefined && containerLabel === fieldLabel) return containerLabel;
  return `${containerLabel} — ${fieldLabel}`;
}

function plainSchemaMessage(message: string): string {
  const trimmed = message.trim();
  if (/^required\.?$/i.test(trimmed)) return 'This value is required.';
  if (/^expected number, received string/i.test(trimmed)) {
    return 'Use a number here instead of text.';
  }
  if (/^expected number, received /i.test(trimmed)) return 'Use a number here.';
  if (/^expected string, received number/i.test(trimmed)) {
    return 'Use text here instead of a number.';
  }
  if (/^expected string, received /i.test(trimmed)) return 'Use text here.';
  if (/^expected array, received /i.test(trimmed)) return 'Use a list of values here.';
  if (/invalid uuid/i.test(trimmed)) return 'This identifier is not in the expected format.';
  if (/invalid enum value/i.test(trimmed)) {
    return 'Choose one of the supported values for this field.';
  }
  if (/invalid literal value/i.test(trimmed)) return 'Use the required value for this field.';
  return trimmed;
}

export function formatApiValidationMessage(detail: ApiErrorDetail): string {
  return plainSchemaMessage(detail.message);
}

export function formatSchemaValidationFailure(message: string, field?: string): string {
  const plainMessage = plainSchemaMessage(message);
  return field ? `${formatValidationField(field)}: ${plainMessage}` : plainMessage;
}

export function validationRuleLabel(ruleCode: string): string {
  return validationRuleLabels[ruleCode] ?? 'Validation problem';
}

export function formatBatchValidationMessage(ruleCode: string, message: string): string {
  const plainMessage = plainSchemaMessage(message);
  const guidance = validationRuleGuidance[ruleCode];
  if (!guidance) return plainMessage;
  if (plainMessage.endsWith(guidance)) return plainMessage;
  return `${plainMessage}${/[.!?]$/.test(plainMessage) ? '' : '.'} ${guidance}`;
}
