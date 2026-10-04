import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NATURAL_LANGUAGE_QUERY_CASES,
  compareTranslation,
  renderResults,
  summarise,
} from './natural-language-query-cases.mjs';

const caseById = (id) => NATURAL_LANGUAGE_QUERY_CASES.find((entry) => entry.id === id);

test('the evaluation set covers every kind and the attacks worth testing', () => {
  assert.ok(
    NATURAL_LANGUAGE_QUERY_CASES.length >= 20,
    `expected at least 20 cases, found ${NATURAL_LANGUAGE_QUERY_CASES.length}`,
  );

  const kinds = new Set(
    NATURAL_LANGUAGE_QUERY_CASES.flatMap((entry) => entry.accept.map((matcher) => matcher.kind)),
  );
  assert.deepEqual([...kinds].sort(), [
    'leaderboard',
    'participant_comparison',
    'participant_statistics',
    'unsupported',
  ]);

  const reasons = new Set(
    NATURAL_LANGUAGE_QUERY_CASES.flatMap((entry) =>
      entry.accept.map((matcher) => matcher.reason).filter(Boolean),
    ),
  );
  for (const reason of ['bowler_type', 'venue', 'batting_hand', 'match_phase', 'super_over']) {
    assert.ok(reasons.has(reason), `no case expects the ${reason} refusal`);
  }

  assert.ok(
    NATURAL_LANGUAGE_QUERY_CASES.filter((entry) => entry.id.startsWith('injection-')).length >= 3,
    'expected at least three prompt-injection cases',
  );
  assert.ok(caseById('ambiguous-name'), 'expected a case for an unqualified name');
});

test('every case has a unique id and a non-empty question', () => {
  const ids = NATURAL_LANGUAGE_QUERY_CASES.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, 'case ids are not unique');

  for (const entry of NATURAL_LANGUAGE_QUERY_CASES) {
    assert.ok(entry.question.trim().length > 0, `${entry.id} has no question`);
    // The endpoint refuses anything longer, so a case that could never be sent
    // would silently never be tested.
    assert.ok(entry.question.length <= 300, `${entry.id} exceeds the 300-character bound`);
    assert.ok(entry.accept.length >= 1, `${entry.id} accepts nothing`);
  }
});

test('a matching definition passes', () => {
  const result = compareTranslation(caseById('unsupported-venue'), {
    kind: 'unsupported',
    reason: 'venue',
  });

  assert.equal(result.pass, true);
  assert.equal(result.id, 'unsupported-venue');
});

// The comparator has to be able to fail, or a run would report success whatever
// the provider returned.
test('a wrong kind fails and says what was expected', () => {
  const result = compareTranslation(caseById('unsupported-venue'), {
    kind: 'leaderboard',
    metric: 'most_sixes',
    scope: 'competition',
  });

  assert.equal(result.pass, false);
  assert.match(result.detail, /expected one of/);
  assert.match(result.detail, /unsupported reason=venue/);
  assert.match(result.detail, /got leaderboard/);
});

test('the right kind with the wrong reason fails', () => {
  const result = compareTranslation(caseById('unsupported-venue'), {
    kind: 'unsupported',
    reason: 'other',
  });

  assert.equal(result.pass, false);
});

test('the right metric with the wrong scope fails', () => {
  const result = compareTranslation(caseById('leaderboard-runs-season'), {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'competition',
  });

  assert.equal(result.pass, false);
});

test('a case accepting two readings passes on either', () => {
  const ambiguous = caseById('ambiguous-name');

  assert.equal(
    compareTranslation(ambiguous, { kind: 'unsupported', reason: 'ambiguous' }).pass,
    true,
  );
  assert.equal(
    compareTranslation(ambiguous, {
      kind: 'participant_statistics',
      participant: { name: 'Rahul' },
      scope: 'career',
    }).pass,
    true,
  );
  assert.equal(compareTranslation(ambiguous, { kind: 'unsupported', reason: 'venue' }).pass, false);
});

test('a nested name must match, not merely be present', () => {
  const withName = caseById('participant-career');

  assert.equal(
    compareTranslation(withName, {
      kind: 'participant_statistics',
      scope: 'career',
      participant: { name: 'Someone Else' },
    }).pass,
    false,
  );
});

test('keys a case does not name are not examined', () => {
  const result = compareTranslation(caseById('leaderboard-runs-season'), {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
    limit: 10,
  });

  assert.equal(result.pass, true);
});

test('a case naming a limit fails when the limit differs', () => {
  const result = compareTranslation(caseById('leaderboard-sixes-limit'), {
    kind: 'leaderboard',
    metric: 'most_sixes',
    scope: 'season',
    limit: 10,
  });

  assert.equal(result.pass, false);
});

test('a missing definition fails rather than throwing', () => {
  for (const value of [undefined, null]) {
    const result = compareTranslation(caseById('unsupported-venue'), value);
    assert.equal(result.pass, false);
    assert.match(result.detail, /no definition/);
  }
});

test('the summary counts passes and failures', () => {
  assert.deepEqual(summarise([{ pass: true }, { pass: false }, { pass: true }]), {
    passed: 2,
    total: 3,
    failed: 1,
  });
});

test('the rendered record names the model, the date and every case', () => {
  const rendered = renderResults({
    model: 'claude-haiku-4-5-20251001',
    startedAt: '2026-10-01T08:00:00.000Z',
    results: [
      { id: 'leaderboard-runs-season', pass: true, detail: 'leaderboard metric=most_runs' },
      { id: 'unsupported-venue', pass: false, detail: 'expected a | b; got c' },
    ],
  });

  assert.match(rendered, /claude-haiku-4-5-20251001/);
  assert.match(rendered, /\| Date \| 2026-10-01 \|/);
  assert.match(rendered, /\| Passed \| 1 \|/);
  assert.match(rendered, /\| Failed \| 1 \|/);
  assert.match(rendered, /\| leaderboard-runs-season \| pass \|/);
  assert.match(rendered, /\| unsupported-venue \| FAIL \|/);
  // A detail containing a pipe would otherwise break the table it sits in.
  assert.match(rendered, /expected a \\\| b; got c/);
});

// Nothing about a key may reach the record a run leaves behind.
test('the rendered record contains no credential-shaped text', () => {
  const rendered = renderResults({
    model: 'claude-haiku-4-5-20251001',
    startedAt: '2026-10-01T08:00:00.000Z',
    results: [{ id: 'leaderboard-runs-season', pass: true, detail: 'leaderboard' }],
  });

  assert.doesNotMatch(rendered, /sk-ant/i);
  assert.doesNotMatch(rendered, /LLM_API_KEY/);
  assert.doesNotMatch(rendered, /api[_-]?key/i);
});

test('the issue #851 behaviours each have a case', () => {
  for (const id of [
    'scoped-season-average',
    'scoped-competition-figures',
    'scoped-comparison-competition',
    'subjective-best-batter',
    'subjective-all-time-bowler',
  ]) {
    assert.ok(caseById(id), `no case for ${id}`);
  }
});

// A refusal that suggests nothing is what issue #851 was raised about, so a case
// expecting help must fail when none arrives.
test('a case expecting suggestions fails on a bare refusal', () => {
  const subjective = caseById('subjective-best-batter');

  const bare = compareTranslation(subjective, { kind: 'unsupported', reason: 'ambiguous' }, []);
  assert.equal(bare.pass, false);
  assert.match(bare.detail, /suggested nothing/);

  const helped = compareTranslation(subjective, { kind: 'unsupported', reason: 'ambiguous' }, [
    { kind: 'leaderboard', metric: 'most_runs', scope: 'competition' },
  ]);
  assert.equal(helped.pass, true);
  assert.match(helped.detail, /1 suggestion/);
});

test('a case not expecting suggestions is unaffected by them', () => {
  const scoped = caseById('scoped-season-average');
  const definition = {
    kind: 'participant_statistics',
    scope: 'season',
    participant: { name: 'V Kohli' },
  };

  assert.equal(compareTranslation(scoped, definition).pass, true);
  assert.equal(compareTranslation(scoped, definition, []).pass, true);
});

test('a wrong definition still fails even when suggestions arrive', () => {
  const result = compareTranslation(
    caseById('scoped-season-average'),
    { kind: 'unsupported', reason: 'ambiguous' },
    [{ kind: 'leaderboard', metric: 'most_runs', scope: 'competition' }],
  );

  assert.equal(result.pass, false);
});

/**
 * Issue #851: the widget offers four questions as buttons, and one of them
 * regressed without any case failing because the set tested a different wording
 * of it. A demo button is the first thing anyone tries, so each one is covered
 * verbatim.
 */
test('every question the widget offers is covered verbatim', async () => {
  const { readFile } = await import('node:fs/promises');
  const examples = await readFile(
    new URL('../apps/frontend/src/features/natural-language-query/examples.ts', import.meta.url),
    'utf8',
  );

  const offered = [...examples.matchAll(/question:\s*(?:'([^']*)'|"([^"]*)")/g)].map(
    ([, single, double]) => single ?? double,
  );
  assert.equal(offered.length, 4, 'expected the widget to offer four example questions');

  const asked = new Set(NATURAL_LANGUAGE_QUERY_CASES.map((entry) => entry.question));
  for (const question of offered) {
    assert.ok(asked.has(question), `the evaluation set does not ask: ${question}`);
  }
});
