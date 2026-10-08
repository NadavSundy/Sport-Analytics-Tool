import { analyticsQueryDefinitionSchema } from '@sport-analytics/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  createQueryDefinitionEvaluator,
  type QueryDefinitionNameResolver,
} from '../../src/modules/analytics-query/query-definition.evaluator';

/**
 * Issue #868: resolving a player name by surname when the name itself finds
 * nothing.
 *
 * The prompt asks the model for scorecard names, so the first search normally
 * succeeds. This covers what happens when it does not — `"Virat Kohli"` searched
 * whole matches nothing, because the scorecard says `"V Kohli"`.
 *
 * Two properties matter more than the happy path, and most of this file is about
 * them. The fallback must never *decide*: a surname match whose initial does not
 * agree with the hint is offered for confirmation rather than answered. And it
 * must stay one extra read of the same parameterised query, so the searches each
 * test makes are asserted, not just their outcome.
 */

const KOHLI = { participantId: '42', displayName: 'V Kohli' };

const AGGREGATES = {
  participantId: KOHLI.participantId,
  participantName: KOHLI.displayName,
  status: 'complete' as const,
  scope: { superOversIncluded: false as const },
  statistics: [
    {
      statisticId: 'stat_career',
      scope: 'career' as const,
      participantId: KOHLI.participantId,
      matchesPlayed: 10,
      batting: null,
      bowling: null,
    },
  ],
};

/**
 * Records every name searched, so a test can assert that the fallback ran (or did
 * not) rather than inferring it from the outcome.
 */
function resolverSpy(byName: (name: string) => { participantId: string; displayName: string }[]): {
  resolver: QueryDefinitionNameResolver;
  searched: string[];
} {
  const searched: string[] = [];

  return {
    searched,
    resolver: {
      async findParticipantsByName(name: string) {
        searched.push(name);
        const records = byName(name);
        return { records, totalRecords: records.length };
      },
      async findCompetitionsByName() {
        return { records: [{ competitionId: '1', name: 'Indian Premier League' }], hasMore: false };
      },
      async findSeasonExact() {
        return { competitionId: '1', competitionName: 'Indian Premier League', label: '2024' };
      },
      async findSeasonsByLabel() {
        return {
          records: [
            { competitionId: '1', competitionName: 'Indian Premier League', label: '2024' },
          ],
        };
      },
    },
  };
}

function evaluatorFor(resolver: QueryDefinitionNameResolver) {
  return createQueryDefinitionEvaluator({
    leaderboards: { getLeaderboard: vi.fn(async () => null) },
    participantAggregates: { getParticipantAggregates: vi.fn(async () => AGGREGATES) },
    names: resolver,
  });
}

function careerQuestion(name: string) {
  return analyticsQueryDefinitionSchema.parse({
    kind: 'participant_statistics',
    participant: { name },
    scope: 'career',
  });
}

/** The repository read is `display_name ILIKE '%name%'`, so this mirrors it. */
function matchingSubstring(...people: { participantId: string; displayName: string }[]) {
  return (name: string) =>
    people.filter((person) => person.displayName.toLowerCase().includes(name.trim().toLowerCase()));
}

describe('a full name that matches no scorecard name', () => {
  // The consistent path: the surname finds one person, and the hint's initial
  // agrees with theirs, so it resolves.
  it('resolves through the surname when the initial agrees', async () => {
    const { resolver, searched } = resolverSpy(matchingSubstring(KOHLI));

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Virat Kohli'));

    expect(evaluation.outcome).toBe('answered');
    // Exactly one extra read of the existing query, with the surname bound.
    expect(searched).toEqual(['Virat Kohli', 'Kohli']);
  });

  it('resolves a surname carrying a lowercase particle', async () => {
    const deKock = { participantId: '7', displayName: 'Q de Kock' };
    const { resolver, searched } = resolverSpy(matchingSubstring(deKock));

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Quinton de Kock'));

    expect(evaluation.outcome).toBe('answered');
    expect(searched).toEqual(['Quinton de Kock', 'Kock']);
  });

  it('resolves a three-part name on its last token', async () => {
    const deVilliers = { participantId: '9', displayName: 'AB de Villiers' };
    const { resolver, searched } = resolverSpy(matchingSubstring(deVilliers));

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Abraham de Villiers'));

    expect(evaluation.outcome).toBe('answered');
    expect(searched).toEqual(['Abraham de Villiers', 'Villiers']);
  });
});

describe('a surname match whose initial disagrees', () => {
  // The inconsistent path, and the reason the fallback exists as a fallback: it
  // may suggest, never decide. Resolving here would hand the reader somebody
  // else's figures with nothing to show a substitution happened.
  it('is offered as a single candidate rather than answered', async () => {
    const { resolver, searched } = resolverSpy(matchingSubstring(KOHLI));

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Suresh Kohli'));

    expect(evaluation.outcome).toBe('entity_ambiguous');
    if (evaluation.outcome !== 'entity_ambiguous') return;
    expect(evaluation.candidates).toEqual([{ id: '42', displayName: 'V Kohli' }]);
    expect(evaluation.nameHint).toBe('Suresh Kohli');
    expect(evaluation.reference).toBe('participant');
    expect(searched).toEqual(['Suresh Kohli', 'Kohli']);
  });

  // "did you mean", not a dead end: the reader gets something to act on.
  it('is not reported as not found', async () => {
    const { resolver } = resolverSpy(matchingSubstring(KOHLI));

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Suresh Kohli'));

    expect(evaluation.outcome).not.toBe('entity_not_found');
  });

  // Only the leading initial counts. `"Mahendra Dhoni"` agrees with `"MS Dhoni"`;
  // `"Sachin Dhoni"` does not, because `S` is a middle initial and matching it
  // would answer a different person's question.
  it('compares the leading initial and not the middle ones', async () => {
    const dhoni = { participantId: '3', displayName: 'MS Dhoni' };
    const { resolver } = resolverSpy(matchingSubstring(dhoni));

    expect((await evaluatorFor(resolver).evaluate(careerQuestion('Mahendra Dhoni'))).outcome).toBe(
      'answered',
    );
    expect((await evaluatorFor(resolver).evaluate(careerQuestion('Sachin Dhoni'))).outcome).toBe(
      'entity_ambiguous',
    );
  });

  // The accepted cost of the leading-initial rule: a scorecard that orders
  // initials differently asks instead of resolving. Asking is the safe side.
  it('asks rather than resolves when the scorecard reverses the initials', async () => {
    const karthik = { participantId: '8', displayName: 'KD Karthik' };
    const { resolver } = resolverSpy(matchingSubstring(karthik));

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Dinesh Karthik'));

    expect(evaluation.outcome).toBe('entity_ambiguous');
    if (evaluation.outcome !== 'entity_ambiguous') return;
    expect(evaluation.candidates).toEqual([{ id: '8', displayName: 'KD Karthik' }]);
  });
});

describe('a common surname', () => {
  // Many matches are reported with candidates to choose from, never narrowed: a
  // guess is the one outcome the fallback must not produce.
  it('is reported ambiguous with candidates when the surname is crowded', async () => {
    const sharmas = Array.from({ length: 4 }, (_, index) => ({
      participantId: String(index),
      displayName: `${'ABCD'[index]} Sharma`,
    }));
    const { resolver, searched } = resolverSpy(matchingSubstring(...sharmas));

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Rohit Sharma'));

    expect(evaluation.outcome).toBe('entity_ambiguous');
    if (evaluation.outcome !== 'entity_ambiguous') return;
    expect(evaluation.candidates).toHaveLength(4);
    expect(searched).toEqual(['Rohit Sharma', 'Sharma']);
  });

  // Past the search limit a second exact match may sit outside the page, so the
  // existing unnarrowable rule applies to the fallback too, capped at five.
  it('is reported ambiguous with at most five candidates past the search limit', async () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      participantId: String(index),
      displayName: `X${index} Khan`,
    }));
    const { resolver } = resolverSpy(() => many);

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Imran Khan'));

    expect(evaluation.outcome).toBe('entity_ambiguous');
    if (evaluation.outcome !== 'entity_ambiguous') return;
    expect(evaluation.candidates).toHaveLength(5);
  });
});

describe('when the fallback must not run', () => {
  it('does not search twice for a single-token hint', async () => {
    const { resolver, searched } = resolverSpy(() => []);

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Nobody'));

    expect(evaluation.outcome).toBe('entity_not_found');
    expect(searched).toEqual(['Nobody']);
  });

  // Below the floor a "surname" is a substring matching most of the corpus, so an
  // honest miss beats five names picked at random.
  it('does not search on a surname below the length floor', async () => {
    const { resolver, searched } = resolverSpy(() => []);

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('V K'));

    expect(evaluation.outcome).toBe('entity_not_found');
    expect(searched).toEqual(['V K']);
  });

  it('does not run when the name itself resolved', async () => {
    const { resolver, searched } = resolverSpy(matchingSubstring(KOHLI));

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('V Kohli'));

    expect(evaluation.outcome).toBe('answered');
    expect(searched).toEqual(['V Kohli']);
  });

  // An ambiguous first search is already something the reader can act on, so it
  // is reported rather than replaced by a broader one.
  it('does not run when the name itself was ambiguous', async () => {
    const { resolver, searched } = resolverSpy(
      matchingSubstring(KOHLI, { participantId: '43', displayName: 'V Kohli' }),
    );

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('V Kohli'));

    expect(evaluation.outcome).toBe('entity_ambiguous');
    expect(searched).toEqual(['V Kohli']);
  });

  it('reports not found when neither the name nor the surname matches', async () => {
    const { resolver, searched } = resolverSpy(() => []);

    const evaluation = await evaluatorFor(resolver).evaluate(careerQuestion('Imaginary Person'));

    expect(evaluation.outcome).toBe('entity_not_found');
    if (evaluation.outcome !== 'entity_not_found') return;
    // The hint reported is the reader's, not the surname the fallback tried.
    expect(evaluation.nameHint).toBe('Imaginary Person');
    expect(searched).toEqual(['Imaginary Person', 'Person']);
  });
});

describe('a comparison', () => {
  it('falls back for each participant independently', async () => {
    const gaikwad = { participantId: '55', displayName: 'RD Gaikwad' };
    const { resolver, searched } = resolverSpy(matchingSubstring(KOHLI, gaikwad));

    const evaluation = await evaluatorFor(resolver).evaluate(
      analyticsQueryDefinitionSchema.parse({
        kind: 'participant_comparison',
        participants: [{ name: 'Virat Kohli' }, { name: 'Ruturaj Gaikwad' }],
        scope: 'career',
      }),
    );

    expect(evaluation.outcome).toBe('answered');
    expect(searched).toEqual(['Virat Kohli', 'Kohli', 'Ruturaj Gaikwad', 'Gaikwad']);
  });

  it('names the second participant when it is the one that cannot be pinned', async () => {
    const { resolver } = resolverSpy(matchingSubstring(KOHLI));

    const evaluation = await evaluatorFor(resolver).evaluate(
      analyticsQueryDefinitionSchema.parse({
        kind: 'participant_comparison',
        participants: [{ name: 'Virat Kohli' }, { name: 'Imaginary Person' }],
        scope: 'career',
      }),
    );

    expect(evaluation.outcome).toBe('entity_not_found');
    if (evaluation.outcome !== 'entity_not_found') return;
    expect(evaluation.reference).toBe('participants.1');
  });
});
