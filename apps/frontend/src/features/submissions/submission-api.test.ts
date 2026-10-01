import { readFileSync } from 'node:fs';

import type { Fixture } from '@sport-analytics/contracts';
import { describe, expect, it } from 'vitest';

import { parseCsvRecords, readSingleFixturePackageContext } from './single-fixture-package';
import {
  createFixtureProposalBatchFile,
  createTechnicalBatchFile,
  SubmissionInputError,
} from './submission-api';

const seasonUploadCsvTemplate = readFileSync('public/season-upload-template.csv', 'utf8');

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', reject);
    reader.readAsText(file);
  });
}

describe('new fixture proposal packages', () => {
  it('converts the guided CSV template to the version 1.1 proposal contract', async () => {
    const source = seasonUploadCsvTemplate
      .replace('Competition name', 'Example Competition')
      .replace('2026-03-14', '2026-08-20')
      .replaceAll('Home team', 'Wanderers')
      .replaceAll('Away team', 'Strikers');
    expect(readSingleFixturePackageContext('new-fixture.csv', source)).toEqual({
      competitionName: 'Example Competition',
      seasonName: '2026',
      date: '2026-08-20',
      teams: ['Wanderers', 'Strikers'],
    });

    const file = createFixtureProposalBatchFile('new-fixture.csv', source, {
      competitionName: 'Example Competition',
      seasonName: '2026',
      startDate: '2026-08-20',
      homeTeamName: 'Wanderers',
      awayTeamName: 'Strikers',
      proposal: {
        endDate: '2026-08-20',
        matchType: 'T20',
        teamType: 'club',
        gender: 'female',
        ballsPerOver: 6,
        outcome: 'no result',
        sourceVersion: '1',
        sourceRevision: 0,
      },
    });
    const [header, row] = parseCsvRecords(await readFile(file));
    const value = (field: string) => row?.[header?.indexOf(field) ?? -1];

    expect(file.name).toBe('fixture-proposal.csv');
    expect(file.type).toBe('text/csv');
    expect(value('contractVersion')).toBe('1.1');
    expect(value('fixtureSourceId')).toMatch(/^submitter:fixture:/);
    expect(value('competitionName')).toBe('Example Competition');
    expect(value('fixtureEndDate')).toBe('2026-08-20');
    expect(value('fixtureMatchType')).toBe('T20');
    expect(value('fixtureTeamType')).toBe('club');
    expect(value('fixtureGender')).toBe('female');
    expect(value('fixtureBallsPerOver')).toBe('6');
    expect(value('fixtureOutcome')).toBe('no result');
    expect(value('fixtureSourceVersion')).toBe('1');
    expect(value('fixtureSourceRevision')).toBe('0');
  });

  it('preserves the winning team in a won CSV fixture proposal', async () => {
    const source = seasonUploadCsvTemplate
      .replace('Competition name', 'Example Competition')
      .replace('2026-03-14', '2026-08-20')
      .replaceAll('Home team', 'Wanderers')
      .replaceAll('Away team', 'Strikers');
    const file = createFixtureProposalBatchFile('new-fixture.csv', source, {
      competitionName: 'Example Competition',
      seasonName: '2026',
      startDate: '2026-08-20',
      homeTeamName: 'Wanderers',
      awayTeamName: 'Strikers',
      proposal: {
        endDate: '2026-08-20',
        matchType: 'T20',
        teamType: 'club',
        gender: 'female',
        ballsPerOver: 6,
        outcome: 'won',
        winner: 'Wanderers',
        sourceVersion: '1',
        sourceRevision: 0,
      },
    });
    const [header, row] = parseCsvRecords(await readFile(file));

    expect(row?.[header?.indexOf('fixtureWinner') ?? -1]).toBe('Wanderers');
  });
});

describe('technical JSON validation feedback (#801)', () => {
  const fixture = {
    fixtureId: '9',
    competitionId: '5',
    competitionName: 'Premier T20',
    season: '2026',
  } as Fixture;

  it('reports every invalid field with its event number, not only the first', () => {
    let caught: unknown;
    try {
      createTechnicalBatchFile(fixture, JSON.stringify([{ eventId: 'e1' }]), 'issue-801');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(SubmissionInputError);
    const error = caught as SubmissionInputError;
    expect(error.message).toMatch(/problems were found/);
    expect(error.details.length).toBeGreaterThan(1);
    expect(error.details.every((detail) => detail.eventIndex === 0)).toBe(true);
    expect(error.details.map((detail) => detail.field)).toEqual(
      expect.arrayContaining(['events.0.strikerId', 'events.0.bowlerId']),
    );
  });

  it('keeps the single-issue message unchanged', () => {
    expect(() => createTechnicalBatchFile(fixture, '{ not json', 'issue-801')).toThrow(
      'Enter valid JSON before submitting.',
    );
  });
});
