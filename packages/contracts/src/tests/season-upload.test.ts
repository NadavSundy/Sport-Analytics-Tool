import { describe, expect, test } from 'vitest';

import {
  FIXTURE_PROPOSAL_CONTRACT_VERSION,
  SEASON_UPLOAD_CONTRACT_VERSION,
  referenceResolutionRequirementSchema,
  seasonUploadManifestSchema,
  seasonUploadPackageSchema,
} from '../season-upload';

const homeTeam = { context: { name: 'Wits University' } };
const awayTeam = { context: { name: 'University of Cape Town' } };

function event(overrides = {}) {
  return {
    eventId: 'cricsheet:delivery:1412526-1-1',
    occurrenceSequence: 1,
    overNumber: 0,
    positionInOver: 0,
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
  test('accepts authoritative innings powerplays and rejects malformed or overlapping ranges', () => {
    const withPowerplays = (powerplays: unknown[]) =>
      seasonPackage({
        fixtures: [
          fixture({
            innings: [
              {
                context: { ordinal: 1, battingTeam: homeTeam },
                powerplays,
                events: [event()],
              },
            ],
          }),
        ],
      });

    expect(
      seasonUploadPackageSchema.safeParse(
        withPowerplays([
          { from: 0.1, to: 5.6, type: 'mandatory' },
          { from: 6.1, to: 16.6, type: 'batting' },
        ]),
      ).success,
    ).toBe(true);
    expect(
      seasonUploadPackageSchema.safeParse(
        withPowerplays([{ from: 5.6, to: 0.1, type: 'mandatory' }]),
      ).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse(
        withPowerplays([
          { from: 0.1, to: 5.6, type: 'mandatory' },
          { from: 5.6, to: 6.6, type: 'batting' },
        ]),
      ).success,
    ).toBe(false);
  });

  test('requires a complete proposal for the canonical-creation package version', () => {
    const fixtureProposal = {
      endDate: '2026-03-14',
      matchType: 'T20',
      teamType: 'university',
      gender: 'female',
      ballsPerOver: 6,
      outcome: 'no result',
      sourceVersion: 'cricsheet-1.1',
      sourceRevision: 2,
    };
    const complete = seasonPackage({
      contractVersion: FIXTURE_PROPOSAL_CONTRACT_VERSION,
      fixtures: [
        fixture({
          sourceId: 'cricsheet:fixture:1412526',
          proposal: fixtureProposal,
        }),
      ],
    });

    expect(seasonUploadPackageSchema.safeParse(complete).success).toBe(true);
    expect(
      seasonUploadPackageSchema.safeParse({
        ...complete,
        fixtures: [fixture({ sourceId: 'cricsheet:fixture:1412526' })],
      }).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse({
        ...complete,
        fixtures: [
          fixture({
            sourceId: 'cricsheet:fixture:1412526',
            proposal: { ...fixtureProposal, outcome: 'unknown' },
          }),
        ],
      }).success,
    ).toBe(false);
    const requiredFields = [
      'endDate',
      'matchType',
      'teamType',
      'gender',
      'ballsPerOver',
      'outcome',
      'sourceVersion',
      'sourceRevision',
    ] as const satisfies readonly (keyof typeof fixtureProposal)[];
    for (const field of requiredFields) {
      const incompleteProposal = Object.fromEntries(
        Object.entries(fixtureProposal).filter(([key]) => key !== field),
      );
      expect(
        seasonUploadPackageSchema.safeParse({
          ...complete,
          fixtures: [
            fixture({ sourceId: 'cricsheet:fixture:1412526', proposal: incompleteProposal }),
          ],
        }).success,
      ).toBe(false);
    }
    expect(
      seasonUploadPackageSchema.safeParse({
        ...complete,
        fixtures: [
          fixture({
            sourceId: 'cricsheet:fixture:1412526',
            proposal: { ...fixtureProposal, endDate: '2026-03-13' },
          }),
        ],
      }).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse({
        ...complete,
        fixtures: [
          fixture({
            sourceId: 'cricsheet:fixture:1412526',
            proposal: { ...fixtureProposal, ballsPerOver: 0 },
          }),
        ],
      }).success,
    ).toBe(false);
  });
  test('accepts a fixture package using readable context without database keys', () => {
    const result = seasonUploadPackageSchema.safeParse(seasonPackage());

    expect(result.success).toBe(true);
    expect(JSON.stringify(seasonPackage())).not.toMatch(/"(?:fixture|innings|participant|team)Id"/);
  });

  test('requires explicit canonical coordinates while keeping the display label optional', () => {
    const explicitWithoutLabel = event({ ballLabel: undefined });
    expect(
      seasonUploadPackageSchema.safeParse(
        seasonPackage({
          fixtures: [
            fixture({
              innings: [
                { context: { ordinal: 1, battingTeam: homeTeam }, events: [explicitWithoutLabel] },
              ],
            }),
          ],
        }),
      ).success,
    ).toBe(true);

    const missingOver = event({ overNumber: undefined });
    const missingPosition = event({ positionInOver: undefined });
    for (const invalidEvent of [missingOver, missingPosition]) {
      expect(
        seasonUploadPackageSchema.safeParse(
          seasonPackage({
            fixtures: [
              fixture({
                innings: [
                  { context: { ordinal: 1, battingTeam: homeTeam }, events: [invalidEvent] },
                ],
              }),
            ],
          }),
        ).success,
      ).toBe(false);
    }
  });

  test('rejects malformed and contradictory display labels', () => {
    for (const invalidEvent of [event({ ballLabel: 'first ball' }), event({ overNumber: 1 })]) {
      const result = seasonUploadPackageSchema.safeParse(
        seasonPackage({
          fixtures: [
            fixture({
              innings: [{ context: { ordinal: 1, battingTeam: homeTeam }, events: [invalidEvent] }],
            }),
          ],
        }),
      );
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toMatch(/ball label/i);
    }
  });

  test('accepts a representative 70-fixture season without application database identifiers', () => {
    const representativeSeason = seasonPackage({
      fixtures: Array.from({ length: 70 }, (_, fixtureIndex) =>
        fixture({
          sourceId: `cricsheet:fixture:season-${fixtureIndex + 1}`,
          innings: [
            {
              sourceId: `cricsheet:innings:season-${fixtureIndex + 1}-1`,
              context: {
                ordinal: 0,
                battingTeam: homeTeam,
              },
              events: [
                event({
                  eventId: `cricsheet:delivery:season-${fixtureIndex + 1}-1`,
                  occurrenceSequence: 1,
                }),
                event({
                  eventId: `cricsheet:delivery:season-${fixtureIndex + 1}-2`,
                  occurrenceSequence: 2,
                  ballLabel: '0.2',
                }),
              ],
            },
          ],
        }),
      ),
    });

    const result = seasonUploadPackageSchema.safeParse(representativeSeason);

    expect(result.success).toBe(true);
    expect(representativeSeason.fixtures).toHaveLength(70);
    expect(JSON.stringify(representativeSeason)).not.toMatch(
      /"(?:fixture|innings|participant|team|competition|submission|batch)Id"\s*:/,
    );
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
              context: { ordinal: 0, battingTeam: homeTeam },
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
              context: { ordinal: 0, battingTeam: awayTeam },
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

  test('accepts wicket and fielder references without database identifiers', () => {
    const result = seasonUploadPackageSchema.safeParse(
      seasonPackage({
        fixtures: [
          fixture({
            innings: [
              {
                context: {
                  ordinal: 1,
                  battingTeam: homeTeam,
                },
                events: [
                  event({
                    wickets: [
                      {
                        kind: 'caught',
                        playerOut: {
                          context: {
                            name: 'A. Batter',
                            team: homeTeam,
                          },
                        },
                        fielders: [
                          {
                            participant: {
                              context: {
                                name: 'B. Bowler',
                                team: awayTeam,
                              },
                            },
                          },
                        ],
                      },
                    ],
                  }),
                ],
              },
            ],
          }),
        ],
      }),
    );

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected wicket package to parse.');
    }

    expect(result.data.fixtures[0]?.innings[0]?.events[0]?.wickets[0]?.kind).toBe('caught');
  });

  test('rejects an extras breakdown that disagrees with runs.extras', () => {
    const result = seasonUploadPackageSchema.safeParse(
      seasonPackage({
        fixtures: [
          fixture({
            innings: [
              {
                context: {
                  ordinal: 1,
                  battingTeam: homeTeam,
                },
                events: [
                  event({
                    runs: {
                      offBat: 0,
                      extras: 2,
                      total: 2,
                    },
                    extras: {
                      wides: 1,
                    },
                  }),
                ],
              },
            ],
          }),
        ],
      }),
    );

    expect(result.success).toBe(false);
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

  test('rejects source-only references without a durable canonical resolver', () => {
    const sourceOnly = (sourceId: string) => ({ sourceId });

    expect(
      seasonUploadPackageSchema.safeParse(
        seasonPackage({ competition: sourceOnly('cricsheet:competition:varsity-cup') }),
      ).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse(
        seasonPackage({ season: sourceOnly('cricsheet:season:2026') }),
      ).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse(
        seasonPackage({
          fixtures: [
            fixture({
              context: { date: '2026-03-14', teams: [sourceOnly('cricsheet:team:wits'), awayTeam] },
            }),
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse(
        seasonPackage({
          fixtures: [fixture({ sourceId: 'other:fixture:1412526', context: undefined })],
        }),
      ).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse(
        seasonPackage({
          fixtures: [
            fixture({
              innings: [
                {
                  sourceId: 'cricsheet:innings:1412526-1',
                  events: [event()],
                },
              ],
            }),
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      seasonUploadPackageSchema.safeParse(
        seasonPackage({
          fixtures: [
            fixture({
              innings: [
                {
                  context: { ordinal: 1, battingTeam: homeTeam },
                  events: [event({ striker: sourceOnly('other:participant:player-1') })],
                },
              ],
            }),
          ],
        }),
      ).success,
    ).toBe(false);
  });

  test('accepts source-only references backed by durable canonical mappings', () => {
    const result = seasonUploadPackageSchema.safeParse(
      seasonPackage({
        fixtures: [
          {
            sourceId: 'app:fixture:101',
            innings: [
              {
                sourceId: 'app:innings:201',
                events: [
                  event({
                    striker: { sourceId: 'cricsheet:participant:player-1' },
                    nonStriker: { sourceId: 'app:participant:301' },
                    bowler: { sourceId: 'app:participant:302' },
                  }),
                ],
              },
            ],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
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
