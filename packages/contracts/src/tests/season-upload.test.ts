import { describe, expect, test } from 'vitest';

import {
  SEASON_UPLOAD_CONTRACT_VERSION,
  referenceResolutionRequirementSchema,
  seasonUploadManifestSchema,
  seasonUploadPackageSchema,
} from '../season-upload';

const homeTeam = { sourceId: 'cricsheet:team:wits' };
const awayTeam = { context: { name: 'University of Cape Town' } };

function event(overrides = {}) {
  return {
    eventId: 'cricsheet:delivery:1412526-1-1',
    occurrenceSequence: 1,
    ballLabel: '0.1',
    striker: { sourceId: 'cricsheet:participant:player-1' },
    nonStriker: { context: { name: 'A. Batter', team: homeTeam } },
    bowler: { context: { name: 'B. Bowler', team: awayTeam } },
    runs: { offBat: 4, extras: 0, total: 4 },
    ...overrides,
  };
}

function fixture(overrides = {}) {
  return {
    context: { date: '2026-03-14', teams: [homeTeam, awayTeam] },
    innings: [
      {
        context: { ordinal: 1, battingTeam: homeTeam },
        events: [event()],
      },
    ],
    ...overrides,
  };
}

function seasonPackage(overrides = {}) {
  return {
    contractVersion: SEASON_UPLOAD_CONTRACT_VERSION,
    packageId: 'cricsheet:package:varsity-cup-2026',
    competition: { context: { name: 'Varsity Cup', country: 'South Africa' } },
    season: { context: { name: '2026' } },
    fixtures: [fixture()],
    ...overrides,
  };
}

describe('versioned season-upload contract', () => {
  test('accepts a fixture package using readable context without database keys', () => {
    const result = seasonUploadPackageSchema.safeParse(seasonPackage());

    expect(result.success).toBe(true);
    expect(JSON.stringify(seasonPackage())).not.toMatch(/"(?:fixture|innings|participant|team)Id"/);
  });

  test('accepts a season package and treats array/file order independently from occurrence order', () => {
    const laterEvent = event({
      eventId: 'cricsheet:delivery:1412526-1-2',
      occurrenceSequence: 2,
      ballLabel: '0.2',
    });
    const packageWithArrivalOrderReversed = seasonPackage({
      fixtures: [
        fixture({
          sourceId: 'cricsheet:fixture:1412526',
          innings: [
            {
              sourceId: 'cricsheet:innings:1412526-1',
              events: [laterEvent, event()],
            },
          ],
        }),
        fixture({
          sourceId: 'cricsheet:fixture:1412527',
          context: { date: '2026-03-21', teams: [awayTeam, homeTeam] },
          innings: [
            {
              sourceId: 'cricsheet:innings:1412527-1',
              events: [
                event({
                  eventId: 'cricsheet:delivery:1412527-1-1',
                  occurrenceSequence: 1,
                }),
              ],
            },
          ],
        }),
      ],
    });

    expect(seasonUploadPackageSchema.safeParse(packageWithArrivalOrderReversed).success).toBe(true);
  });

  test('rejects duplicate delivery identities and occurrence sequences', () => {
    const duplicate = seasonPackage({
      fixtures: [
        fixture({
          innings: [
            {
              context: { ordinal: 1, battingTeam: homeTeam },
              events: [event(), event()],
            },
          ],
        }),
      ],
    });

    expect(seasonUploadPackageSchema.safeParse(duplicate).success).toBe(false);
  });

  test('accepts a correction only when it identifies the corrected stable event', () => {
    const correction = seasonPackage({
      fixtures: [
        fixture({
          innings: [
            {
              context: { ordinal: 1, battingTeam: homeTeam },
              events: [
                event({
                  eventId: 'cricsheet:delivery:1412526-1-1-revision-2',
                  operation: 'correction',
                  correctsEventId: 'cricsheet:delivery:1412526-1-1',
                  runs: { offBat: 6, extras: 0, total: 6 },
                }),
              ],
            },
          ],
        }),
      ],
    });

    expect(seasonUploadPackageSchema.safeParse(correction).success).toBe(true);
    expect(
      seasonUploadPackageSchema.safeParse({
        ...correction,
        fixtures: [
          fixture({
            innings: [
              {
                context: { ordinal: 1, battingTeam: homeTeam },
                events: [event({ operation: 'correction' })],
              },
            ],
          }),
        ],
      }).success,
    ).toBe(false);
  });

  test('rejects invalid reference entity types and non-namespaced identifiers', () => {
    expect(
      seasonUploadPackageSchema.safeParse({
        ...seasonPackage(),
        fixtures: [fixture({ sourceId: '1412526' })],
      }).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse({
        ...seasonPackage(),
        fixtures: [fixture({ sourceId: 'cricsheet:team:1412526' })],
      }).success,
    ).toBe(false);
  });

  test('defines an explicit resolution requirement for ambiguous participants', () => {
    expect(
      referenceResolutionRequirementSchema.safeParse({
        code: 'AMBIGUOUS_REFERENCE',
        referencePath: 'fixtures.0.innings.0.events.0.striker',
        submittedReference: { context: { name: 'A. Smith' } },
        candidates: [
          { sourceId: 'cricsheet:participant:smith-1', label: 'A. Smith (Wits)' },
          { sourceId: 'cricsheet:participant:smith-2', label: 'A. Smith (UCT)' },
        ],
        resolutionRequired: true,
      }).success,
    ).toBe(true);
  });

  test('accepts a multi-file manifest and rejects duplicate file entries', () => {
    const validManifest = {
      contractVersion: SEASON_UPLOAD_CONTRACT_VERSION,
      packageId: 'cricsheet:package:varsity-cup-2026',
      files: [
        { path: 'fixtures.json', mediaType: 'application/json', sha256: 'a'.repeat(64) },
        { path: 'deliveries.csv', mediaType: 'text/csv', sha256: 'b'.repeat(64) },
      ],
    };

    expect(seasonUploadManifestSchema.safeParse(validManifest).success).toBe(true);
    expect(
      seasonUploadManifestSchema.safeParse({
        ...validManifest,
        files: [validManifest.files[0], validManifest.files[0]],
      }).success,
    ).toBe(false);
  });
});
