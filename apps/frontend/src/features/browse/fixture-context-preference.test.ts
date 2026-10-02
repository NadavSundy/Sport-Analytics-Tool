import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearFixtureContextPreference,
  getFixtureContextPreference,
  setFixtureContextPreference,
} from './fixture-context-preference';

describe('fixture context preference storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps a saved competition and season context scoped to the authenticated account', () => {
    setFixtureContextPreference('account-one', {
      competitionId: 'competition-1',
      seasonId: 'season-2026',
    });

    expect(getFixtureContextPreference('account-one')).toEqual({
      competitionId: 'competition-1',
      seasonId: 'season-2026',
    });
    expect(getFixtureContextPreference('account-two')).toBeNull();
  });

  it('ignores malformed stored values and clears a saved context', () => {
    window.localStorage.setItem('statsthegame:fixture-context:account-one', '{not-json');

    expect(getFixtureContextPreference('account-one')).toBeNull();

    setFixtureContextPreference('account-one', {
      competitionId: 'competition-1',
      seasonId: 'season-2026',
    });
    clearFixtureContextPreference('account-one');

    expect(getFixtureContextPreference('account-one')).toBeNull();
  });
});
