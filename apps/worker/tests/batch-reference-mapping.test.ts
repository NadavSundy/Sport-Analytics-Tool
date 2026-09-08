import { describe, expect, test } from 'vitest';

import { referenceOverridesForChunk } from '../src/batch-validation-job';

describe('batch reference mapping reprocessing', () => {
  test('binds a retained item decision to the current chunk-local path', () => {
    const result = referenceOverridesForChunk(
      [
        {
          decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
          itemOrdinal: 42,
          referencePath: 'fixtures.7.innings.2.events.19.striker',
          entityType: 'participant',
          canonicalId: '71',
        },
      ],
      new Map([[42, 'fixtures.0.innings.0.events.0']]),
    );

    expect(result.overrides.get('fixtures.0.innings.0.events.0.striker')).toEqual({
      entityType: 'participant',
      canonicalId: '71',
    });
    expect(result.decisionReferencesByPath.get('fixtures.0.innings.0.events.0.striker')).toEqual([
      '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
    ]);
  });

  test('does not apply competing selections to a shared chunk reference', () => {
    const result = referenceOverridesForChunk(
      [
        {
          decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
          itemOrdinal: 1,
          referencePath: 'competition',
          entityType: 'competition',
          canonicalId: '5',
        },
        {
          decisionReference: '26c75206-b66e-46c5-a174-3612d05e6d9c',
          itemOrdinal: 2,
          referencePath: 'competition',
          entityType: 'competition',
          canonicalId: '6',
        },
      ],
      new Map([
        [1, 'fixtures.0.innings.0.events.0'],
        [2, 'fixtures.0.innings.0.events.1'],
      ]),
    );

    expect(result.overrides.has('competition')).toBe(false);
    expect(result.decisionReferencesByPath.has('competition')).toBe(false);
  });
});
