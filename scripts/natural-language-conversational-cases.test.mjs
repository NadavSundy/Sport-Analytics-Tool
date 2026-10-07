import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONVERSATIONAL_QUERY_CASES,
  TESTER_QUESTION_CASES,
} from './natural-language-conversational-cases.mjs';
import {
  NATURAL_LANGUAGE_QUERY_CASES,
  compareTranslation,
  renderResults,
} from './natural-language-query-cases.mjs';

/**
 * The issue #868 cases and the scoring they added, tested without a provider
 * call.
 *
 * Most of this guards the case list itself. A case the endpoint would refuse, or
 * a history the contract would reject, is a case that silently never tests
 * anything — and the only way to find that out otherwise is to pay for a run and
 * read a failure that looks like a provider problem.
 */

const caseById = (id) => NATURAL_LANGUAGE_QUERY_CASES.find((entry) => entry.id === id);

const KOHLI_CAREER = {
  kind: 'participant_statistics',
  participant: { name: 'V Kohli' },
  scope: 'career',
};

test('the conversational cases cover everything issue #868 asked for', () => {
  const ids = CONVERSATIONAL_QUERY_CASES.map((entry) => entry.id);

  for (const prefix of ['followup-', 'casual-', 'name-', 'default-', 'injection-']) {
    assert.ok(
      ids.some((id) => id.startsWith(prefix)),
      `no case covers ${prefix}`,
    );
  }

  // The three follow-up shapes the issue named.
  assert.ok(caseById('followup-pronoun'), 'no pronoun follow-up case');
  assert.ok(caseById('followup-season-change'), 'no season-change follow-up case');
  assert.ok(caseById('followup-comparison'), 'no comparison follow-up case');

  // The two casual wordings the issue named.
  assert.ok(
    CONVERSATIONAL_QUERY_CASES.some((entry) => entry.question.includes('smashes the most sixes')),
    'no case asks the "smashes the most sixes" wording',
  );
  assert.ok(
    CONVERSATIONAL_QUERY_CASES.some((entry) => entry.question.includes('best economy')),
    'no case asks the "best economy" wording',
  );

  // The three name forms the issue named.
  for (const form of ['Virat Kohli', 'Kohli career', 'King Kohli']) {
    assert.ok(
      CONVERSATIONAL_QUERY_CASES.some((entry) => entry.question.includes(form)),
      `no case asks the name form ${form}`,
    );
  }
});

test('a follow-up case sends turns and the rest do not', () => {
  const withHistory = CONVERSATIONAL_QUERY_CASES.filter((entry) => entry.conversation);

  assert.ok(withHistory.length >= 6, 'expected at least six multi-turn cases');

  for (const entry of withHistory) {
    // The endpoint refuses a sixth turn, so a case carrying one would be refused
    // before it ever reached the provider.
    assert.ok(entry.conversation.length <= 5, `${entry.id} sends more than five turns`);
    assert.ok(entry.conversation.length >= 1, `${entry.id} sends an empty conversation`);

    for (const turn of entry.conversation) {
      assert.ok(turn.question.trim().length > 0, `${entry.id} has a turn with no question`);
      assert.ok(turn.question.length <= 300, `${entry.id} has an over-long turn question`);
      assert.ok(typeof turn.definition?.kind === 'string', `${entry.id} has a turn with no kind`);
    }
  }
});

test('every case the issue added could actually be sent', () => {
  for (const entry of [...CONVERSATIONAL_QUERY_CASES, ...TESTER_QUESTION_CASES]) {
    assert.ok(entry.question.trim().length > 0, `${entry.id} has no question`);
    assert.ok(entry.question.length <= 300, `${entry.id} exceeds the 300-character bound`);
    assert.ok(entry.accept?.length >= 1, `${entry.id} accepts nothing`);
  }
});

test('the whole set has unique ids after the lists are joined', () => {
  const ids = NATURAL_LANGUAGE_QUERY_CASES.map((entry) => entry.id);

  assert.equal(new Set(ids).size, ids.length, 'case ids are not unique across the joined lists');
  assert.ok(
    NATURAL_LANGUAGE_QUERY_CASES.length > CONVERSATIONAL_QUERY_CASES.length,
    'the joined set dropped the issue #815 cases',
  );
});

// The placeholder is for the maintainer to fill in. It must stay a list, so that
// spreading it into the set is always valid.
test('the tester placeholder is an empty list ready to be filled in', () => {
  assert.ok(Array.isArray(TESTER_QUESTION_CASES));
  assert.deepEqual(TESTER_QUESTION_CASES, []);
});

test('an expected assumption must be reported to pass', () => {
  const sixes = caseById('default-competition-sixes');
  const definition = {
    kind: 'leaderboard',
    metric: 'most_sixes',
    scope: 'competition',
    competition: { name: 'Indian Premier League' },
  };

  assert.equal(compareTranslation(sixes, definition, [], ['competition']).pass, true);

  // The definition matched, but the reader was not told the competition was
  // filled in, so they were shown an answer to a narrower question.
  const silent = compareTranslation(sixes, definition, [], []);
  assert.equal(silent.pass, false);
  assert.match(silent.detail, /assumed none, expected competition/);
});

test('an unexpected assumption also fails', () => {
  const named = caseById('default-competition-not-assumed-when-named');
  const definition = {
    kind: 'leaderboard',
    metric: 'most_sixes',
    scope: 'competition',
    competition: { name: 'Indian Premier League' },
  };

  assert.equal(compareTranslation(named, definition, [], []).pass, true);

  const spurious = compareTranslation(named, definition, [], ['competition']);
  assert.equal(spurious.pass, false);
  assert.match(spurious.detail, /assumed competition, expected none/);
});

// A season must never be assumed, so the case expects a refusal that still helps.
test('a season question expects a refusal with suggestions and no assumption', () => {
  const lastSeason = caseById('default-no-season-assumed');
  const refusal = { kind: 'unsupported', reason: 'ambiguous' };
  const suggestion = [{ kind: 'leaderboard', metric: 'most_runs', scope: 'competition' }];

  assert.equal(compareTranslation(lastSeason, refusal, suggestion, []).pass, true);
  // A bare refusal gives the reader nothing to ask instead.
  assert.equal(compareTranslation(lastSeason, refusal, [], []).pass, false);
  // And a guessed season is the thing the rule exists to prevent.
  assert.equal(compareTranslation(lastSeason, refusal, suggestion, ['competition']).pass, false);
});

test('a case naming no assumptions is not scored on them', () => {
  const pronoun = caseById('followup-pronoun');

  assert.equal(pronoun.expectAssumptions, undefined);
  assert.equal(compareTranslation(pronoun, KOHLI_CAREER, [], ['competition']).pass, true);
});

test('a passing case records what was assumed in its detail', () => {
  const sixes = caseById('default-competition-sixes');
  const result = compareTranslation(
    sixes,
    {
      kind: 'leaderboard',
      metric: 'most_sixes',
      scope: 'competition',
      competition: { name: 'Indian Premier League' },
    },
    [],
    ['competition'],
  );

  assert.equal(result.pass, true);
  assert.match(result.detail, /\(assumed competition\)/);
});

test('the rendered record reports the turn count per case and in the summary', () => {
  const rendered = renderResults({
    model: 'claude-haiku-4-5-20251001',
    startedAt: '2026-10-07T08:00:00.000Z',
    results: [
      { id: 'followup-pronoun', pass: true, detail: 'participant_statistics', turns: 2 },
      { id: 'casual-goat', pass: false, detail: 'unsupported', turns: 0 },
    ],
  });

  assert.match(rendered, /\| Multi-turn cases \| 1 \|/);
  assert.match(rendered, /\| followup-pronoun \| 2 \| pass \|/);
  assert.match(rendered, /\| casual-goat \| 0 \| FAIL \|/);
});

// A result from a failure path carries no turn count, and the record must still
// render rather than printing "undefined" into the table.
test('the rendered record tolerates a result with no turn count', () => {
  const rendered = renderResults({
    model: 'claude-haiku-4-5-20251001',
    startedAt: '2026-10-07T08:00:00.000Z',
    results: [{ id: 'followup-pronoun', pass: false, detail: 'LlmTimeoutError: timed out' }],
  });

  assert.match(rendered, /\| followup-pronoun \| 0 \| FAIL \|/);
  assert.doesNotMatch(rendered, /undefined/);
});

// Nothing a tester or a turn carries may leak a credential into the record.
test('the rendered record contains no credential-shaped text', () => {
  const rendered = renderResults({
    model: 'claude-haiku-4-5-20251001',
    startedAt: '2026-10-07T08:00:00.000Z',
    results: CONVERSATIONAL_QUERY_CASES.map((entry) => ({
      id: entry.id,
      pass: true,
      detail: 'leaderboard',
      turns: entry.conversation?.length ?? 0,
    })),
  });

  assert.doesNotMatch(rendered, /sk-ant/i);
  assert.doesNotMatch(rendered, /LLM_API_KEY/);
});

/**
 * Run 1 of the issue #868 evaluation reported two failures as "expected one of
 * participant_statistics scope=career; got participant_statistics scope=career".
 * Identical, and therefore useless: the mismatching key was the participant
 * name, which the description did not print.
 */
test('a failure detail distinguishes two definitions that differ only by name', () => {
  const result = compareTranslation(caseById('participant-runs-only'), {
    kind: 'participant_statistics',
    scope: 'career',
    participant: { name: 'Quinton de Kock' },
  });

  assert.equal(result.pass, false);
  // Both names appear, so the line says what was wanted and what arrived.
  assert.match(result.detail, /participant=Q de Kock/);
  assert.match(result.detail, /participant=Quinton de Kock/);
  assert.notEqual(
    result.detail.split('; got ')[0],
    'expected one of ' + result.detail.split('; got ')[1],
  );
});

test('a failure detail names the competition and season a definition carried', () => {
  const result = compareTranslation(caseById('leaderboard-runs-season'), {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'competition',
    competition: { name: 'Big Bash League' },
  });

  assert.equal(result.pass, false);
  assert.match(result.detail, /competition=Big Bash League/);
});

test('a comparison names both participants', () => {
  const result = compareTranslation(caseById('comparison-career'), {
    kind: 'participant_comparison',
    scope: 'season',
    participants: [{ name: 'V Kohli' }, { name: 'RD Gaikwad' }],
  });

  assert.equal(result.pass, false);
  assert.match(result.detail, /participants=V Kohli vs RD Gaikwad/);
});

test('a season reference is described by competition and label', () => {
  const result = compareTranslation(caseById('participant-career'), {
    kind: 'participant_statistics',
    scope: 'season',
    participant: { name: 'BB McCullum' },
    season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
  });

  assert.equal(result.pass, false);
  assert.match(result.detail, /season=Indian Premier League 2026/);
});

// The two expectations run 1 showed to be wrong, re-pinned rather than loosened.
test('the name cases expect the scorecard form issue #868 requires', () => {
  const runsOnly = caseById('participant-runs-only');
  assert.deepEqual(runsOnly.accept[0].participant, { name: 'Q de Kock' });
  assert.equal(runsOnly.accept.length, 1, 'the pin was moved, not widened');

  const apostrophe = caseById('participant-apostrophe-name');
  assert.deepEqual(apostrophe.accept[0].participant, { name: "SNJ O'Keefe" });
  assert.equal(apostrophe.accept.length, 1, 'the pin was moved, not widened');
  // The point of the case is the apostrophe, so it has to survive the question.
  assert.ok(apostrophe.question.includes("O'Keefe"), 'the question lost its apostrophe');
});

test('a wording naming no published measure expects a refusal with help', () => {
  const hitter = caseById('casual-biggest-hitter');

  assert.deepEqual(hitter.accept, [{ kind: 'unsupported', reason: 'ambiguous' }]);
  assert.equal(hitter.expectSuggestions, true);
});

test("a reader's own short form is not scored as an assumption", () => {
  const abbreviated = caseById('default-abbreviation-is-not-an-assumption');

  assert.ok(abbreviated, 'no case covers an abbreviation the reader wrote');
  assert.deepEqual(abbreviated.expectAssumptions, []);
  assert.ok(abbreviated.question.includes('IPL'));
});
