#!/usr/bin/env node
// Validates a filled-in COR-01 events.json against the real submission contract.
//
//   node validate.js [events.json] [fixtureId]
//
// It runs the two checks the server runs, in the server's order:
//
//   1. submissionRequestSchema  — the contract the frontend parses against
//      before POSTing (submission-api.ts:347).
//   2. validateCricketBusinessRules — the cricket rules the backend applies
//      inside the write transaction (submission.repository.ts:301).
//
// Placeholder IDs are substituted with throwaway numeric identifiers first, so
// the template itself can be checked. Neither check can prove the identifiers
// exist in the target fixture, that the players are in its squad, or that the
// delivery coordinates are free — only the server decides those.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const repoRoot = resolve(__dirname, '../../../..');
const {
  submissionRequestSchema,
  validateCricketBusinessRules,
  DIRECT_SUBMISSION_SCHEMA_VERSION,
} = require(resolve(repoRoot, 'packages/contracts/dist/index.js'));

// The settled #605 target: fixture 10266, innings 20540.
const TARGET_FIXTURE_ID = '10266';

const PLACEHOLDERS = {
  __INNINGS_ID__: '1',
  __STRIKER_ID__: '2',
  __NON_STRIKER_ID__: '3',
  __BOWLER_ID__: '4',
};

const file = process.argv[2] ?? resolve(__dirname, 'events.json');
// The form supplies fixtureId itself, so it is not in events.json. Pass the real
// one to check the payload exactly as the frontend builds it.
const fixtureId = process.argv[3] ?? TARGET_FIXTURE_ID;
let text = readFileSync(file, 'utf8');

const substituted = [];
for (const [token, value] of Object.entries(PLACEHOLDERS)) {
  if (text.includes(token)) {
    substituted.push(token);
    text = text.replaceAll(token, value);
  }
}

const events = JSON.parse(text);
const result = submissionRequestSchema.safeParse({
  fixtureId,
  schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
  events,
});

if (substituted.length > 0) {
  console.log(`Substituted placeholders: ${substituted.join(', ')}`);
  console.log('Shape check only — fill in real identifiers before the session.\n');
}

if (!result.success) {
  console.error('INVALID against submissionRequestSchema:\n');
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(
  `VALID against submissionRequestSchema ` +
    `(schemaVersion ${DIRECT_SUBMISSION_SCHEMA_VERSION}, fixtureId ${fixtureId}).`,
);

// The cricket rules need to know which side each participant is on. Derive that
// from the first event's own roles: striker and non-striker bat, the bowler
// bowls. This verifies the package is internally consistent — notably the
// printed ball-number progression, and any later event that reuses a batter as
// the bowler. Real squad and team membership is checked server-side.
const [first] = result.data.events;
const BATTING_TEAM = '10';
const BOWLING_TEAM = '20';
const participantTeamById = {
  [first.strikerId]: BATTING_TEAM,
  [first.nonStrikerId]: BATTING_TEAM,
  [first.bowlerId]: BOWLING_TEAM,
};
const inningsById = Object.fromEntries(
  [...new Set(result.data.events.map((event) => event.inningsId))].map((inningsId) => [
    inningsId,
    { battingTeamId: BATTING_TEAM, bowlingTeamId: BOWLING_TEAM },
  ]),
);

const violations = validateCricketBusinessRules(result.data.events, {
  inningsById,
  participantTeamById,
});

if (violations.length > 0) {
  console.error('\nINVALID against validateCricketBusinessRules:\n');
  for (const violation of violations) {
    console.error(
      `  [${violation.code}] event ${violation.eventIndex} ${violation.fieldPath}: ${violation.message}`,
    );
  }
  process.exit(1);
}

console.log('VALID against validateCricketBusinessRules (no violations).');
console.log(`Events: ${result.data.events.length}`);
for (const event of result.data.events) {
  console.log(
    `  seq ${event.sequenceNumber}  over ${event.overNumber}.${event.positionInOver}  ` +
      `ball ${event.ballNumber ?? '(none)'}  offBat ${event.runs.offBat}  total ${event.runs.total}`,
  );
}
