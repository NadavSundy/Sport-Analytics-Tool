import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { seasonUploadManifestSchema, seasonUploadPackageSchema } from '../season-upload';
import { DIRECT_SUBMISSION_SCHEMA_VERSION, submissionRequestSchema } from '../submissions';

/**
 * The templates a submitter downloads must stay valid against the contract the
 * server enforces, so stale guidance fails here rather than in a user's upload
 * (#801).
 */
function shipped(name: string): unknown {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), '../../apps/frontend/public', name), 'utf8'),
  ) as unknown;
}

describe('shipped submission templates match the current contract (#801)', () => {
  it('accepts the single-season JSON template', () => {
    const parsed = seasonUploadPackageSchema.safeParse(shipped('season-upload-template.json'));
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it('accepts the split-package manifest template', () => {
    const parsed = seasonUploadManifestSchema.safeParse(
      shipped('season-upload-manifest-template.json'),
    );
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it('accepts a back-catalogue template that spans at least two seasons', () => {
    const parsed = seasonUploadPackageSchema.safeParse(
      shipped('season-upload-catalogue-template.json'),
    );
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
    if (!parsed.success) return;

    const defaultSeason = parsed.data.season.context?.name;
    const seasons = new Set(
      parsed.data.fixtures.map((fixture) => fixture.season?.context?.name ?? defaultSeason),
    );
    expect(seasons.size).toBeGreaterThanOrEqual(2);
    expect(parsed.data.fixtures.some((fixture) => fixture.season !== undefined)).toBe(true);
  });

  it('accepts the advanced technical events example as a direct submission', () => {
    const parsed = submissionRequestSchema.safeParse({
      fixtureId: '1',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: shipped('technical-events-example.json'),
    });
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });
});
