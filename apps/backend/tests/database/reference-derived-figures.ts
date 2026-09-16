import type { QueryExecutor } from '../../src/database';
import { listParticipantFixtures } from '../../src/modules/participants/participant.repository';
import { deriveFixtureStatistics } from '../../src/modules/statistics/fixture-statistics.derivation';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';

/**
 * Reference-fixture figures produced by the platform's own statistics paths
 * rather than by a test's inline SQL (issue #590).
 *
 * The published innings figures already asserted in the reference tests are
 * reproduced here from the fixture derivation, which classifies in TypeScript,
 * and from the participant fixture history, which classifies in SQL. Team
 * figures are the sums of the per-participant figures, so each one is fully
 * determined by the published innings record and no scorecard value is added.
 */

export interface TeamFigures {
  ballsFaced: number;
  legalBallsBowled: number;
  wides: number;
  noBalls: number;
  runsConceded: number;
}

export interface DerivedReferenceFigures {
  derivation: Map<string, TeamFigures>;
  history: Map<string, TeamFigures>;
}

function emptyTeamFigures(): TeamFigures {
  return { ballsFaced: 0, legalBallsBowled: 0, wides: 0, noBalls: 0, runsConceded: 0 };
}

function addTo(
  teams: Map<string, TeamFigures>,
  team: string,
  batting: { ballsFaced: number | null } | null,
  bowling: {
    legalBallsBowled: number | null;
    wides: number | null;
    noBalls: number | null;
    runsConceded: number | null;
  } | null,
): void {
  const figures = teams.get(team) ?? emptyTeamFigures();
  figures.ballsFaced += batting?.ballsFaced ?? 0;
  figures.legalBallsBowled += bowling?.legalBallsBowled ?? 0;
  figures.wides += bowling?.wides ?? 0;
  figures.noBalls += bowling?.noBalls ?? 0;
  figures.runsConceded += bowling?.runsConceded ?? 0;
  teams.set(team, figures);
}

export async function deriveReferenceFigures(
  executor: QueryExecutor,
  fixtureId: string,
): Promise<DerivedReferenceFigures> {
  const source = await loadFixtureStatisticsSource(fixtureId, executor);
  if (!source) {
    throw new Error(`Expected reference fixture ${fixtureId} to be available for derivation.`);
  }

  const derivation = new Map<string, TeamFigures>();
  const history = new Map<string, TeamFigures>();

  for (const statistic of deriveFixtureStatistics(source).statistics) {
    if (statistic.scope !== 'participant' || statistic.competitorName === null) {
      continue;
    }

    addTo(derivation, statistic.competitorName, statistic.batting, statistic.bowling);

    const page = await listParticipantFixtures(
      { participantId: statistic.participantId, limit: 50 },
      executor,
    );
    const record = page.records.find((candidate) => candidate.fixtureId === fixtureId);
    if (record) {
      addTo(history, record.teamName, record, record);
    }
  }

  return { derivation, history };
}

export interface PublishedInningsExtras {
  team: string;
  runs: number;
  deliveries: number;
  /** Null where the published record and the committed source disagree. */
  legalDeliveries: number | null;
  extras: number;
  byeRuns: number;
  legByeRuns: number;
  wideRuns: number;
  wideDeliveries: number;
  noBallRuns: number;
}

/**
 * The comparisons a published innings record fixes for the statistics paths.
 *
 * `batting` holds the batting team's summed figures and `bowling` the fielding
 * team's. Penalty runs are whatever part of the published extras is not a bye,
 * leg bye, wide or no-ball, and like byes and leg byes are not the bowler's.
 */
export function inningsExtrasComparisons(
  path: string,
  expected: PublishedInningsExtras,
  batting: TeamFigures | undefined,
  bowling: TeamFigures | undefined,
): Array<[string, number | string, number]> {
  const penaltyRuns =
    expected.extras -
    expected.byeRuns -
    expected.legByeRuns -
    expected.wideRuns -
    expected.noBallRuns;

  const comparisons: Array<[string, number | string, number]> = [
    [
      `${path} balls faced`,
      batting?.ballsFaced ?? 'missing',
      expected.deliveries - expected.wideDeliveries,
    ],
    [`${path} bowler wide runs`, bowling?.wides ?? 'missing', expected.wideRuns],
    [`${path} bowler no-ball runs`, bowling?.noBalls ?? 'missing', expected.noBallRuns],
    [
      `${path} runs conceded by bowlers`,
      bowling?.runsConceded ?? 'missing',
      expected.runs - expected.byeRuns - expected.legByeRuns - penaltyRuns,
    ],
  ];

  if (expected.legalDeliveries !== null) {
    comparisons.push([
      `${path} legal balls bowled`,
      bowling?.legalBallsBowled ?? 'missing',
      expected.legalDeliveries,
    ]);
  }

  return comparisons;
}
