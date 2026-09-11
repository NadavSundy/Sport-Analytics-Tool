import type { PublicEvent } from '@sport-analytics/contracts';
import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { createPublicEventRepository } from '../../src/modules/events/event.repository';

function event(eventId: string, sequenceNumber: number): PublicEvent {
  return {
    eventId,
    fixtureId: '100',
    competitionId: '10',
    competitionName: 'World Twenty20',
    inningsId: '200',
    inningsOrdinal: 0,
    sequenceNumber,
    overNumber: 4,
    positionInOver: sequenceNumber - 1,
    ballNumber: `4.${sequenceNumber}`,
    battingCompetitorId: '20',
    battingCompetitorName: 'India',
    bowlingCompetitorId: '21',
    bowlingCompetitorName: 'Pakistan',
    strikerParticipantId: '30',
    strikerParticipantName: 'Opening Batter',
    nonStrikerParticipantId: '31',
    nonStrikerParticipantName: 'Non-striker',
    bowlerParticipantId: '32',
    bowlerParticipantName: 'Opening Bowler',
    runs: {
      offBat: 0,
      extras: 0,
      total: 0,
      nonBoundary: false,
    },
    extras: {
      wides: null,
      noBalls: null,
      byes: null,
      legByes: null,
      penalty: null,
    },
    wickets: [],
  };
}

describe('public event repository', () => {
  test('selects accepted current revisions in fixture order with whitelisted filters', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [event('501', 2), event('502', 3), event('503', 4)],
      rowCount: 3,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });
    const repository = createPublicEventRepository({ query } as unknown as QueryExecutor);

    const page = await repository.listAcceptedFixtureEvents({
      fixtureId: '100',
      inningsId: '200',
      competitorId: '20',
      participantId: '30',
      overNumber: 4,
      wicketKind: 'caught',
      after: {
        inningsOrdinal: 0,
        sequenceNumber: 1,
        eventId: '500',
      },
      limit: 2,
    });

    expect(page.records.map((record) => record.eventId)).toEqual(['501', '502']);
    expect(page.hasMore).toBe(true);

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("source_submission.status = 'accepted'");
    expect(sql).toContain('FROM delivery_current delivery');
    expect(sql).not.toContain('DISTINCT ON');
    expect(sql).toContain('i.batting_team_id = $3::bigint');
    expect(sql).toContain('participant_wicket.player_out_id = $4::bigint');
    expect(sql).toContain('d.over_number = $5::smallint');
    expect(sql).toContain('filtered_wicket.kind = $6::text');
    expect(sql).toContain('ORDER BY i.ordinal ASC, d.innings_sequence ASC, d.delivery_id ASC');
    expect(sql).not.toContain('submitted_by AS');
    expect(sql).not.toContain('recorded_at AS');
    expect(query.mock.calls[0]?.[1]).toEqual([
      '100',
      '200',
      '20',
      '30',
      4,
      'caught',
      0,
      1,
      '500',
      3,
    ]);
  });

  test('scopes stable event detail reads to the fixture and accepted event set', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [event('500', 1)],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });
    const repository = createPublicEventRepository({ query } as unknown as QueryExecutor);

    await expect(repository.findAcceptedFixtureEvent('100', '500')).resolves.toEqual(
      event('500', 1),
    );

    expect(String(query.mock.calls[0]?.[0])).toContain('source_innings.fixture_id = $1::bigint');
    expect(String(query.mock.calls[0]?.[0])).toContain('d.delivery_id = $2::bigint');
    expect(query.mock.calls[0]?.[1]).toEqual(['100', '500', 2]);
  });
});
