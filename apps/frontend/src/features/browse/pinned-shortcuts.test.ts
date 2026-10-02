import { beforeEach, describe, expect, it } from 'vitest';
import { getPinnedShortcuts, togglePinnedShortcut, type PinnedShortcut } from './pinned-shortcuts';

describe('pinned shortcut storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores up to three team or competition shortcuts under the authenticated account key', () => {
    const team: PinnedShortcut = { kind: 'team', id: 'mancity' };

    togglePinnedShortcut('user-one', team);
    togglePinnedShortcut('user-one', { kind: 'competition', id: 'epl' });
    togglePinnedShortcut('user-one', { kind: 'team', id: 'arsenal' });
    togglePinnedShortcut('user-one', { kind: 'team', id: 'liverpool' });

    expect(JSON.parse(window.localStorage.getItem('stats_pinned_user-one') ?? '[]')).toEqual([
      'team_mancity',
      'comp_epl',
      'team_arsenal',
    ]);
    expect(getPinnedShortcuts('user-two')).toEqual([]);
  });

  it('unpins an existing shortcut and ignores malformed browser storage', () => {
    window.localStorage.setItem('stats_pinned_user-one', '{not-json');
    expect(getPinnedShortcuts('user-one')).toEqual([]);

    const team: PinnedShortcut = { kind: 'team', id: 'mancity' };
    togglePinnedShortcut('user-one', team);
    togglePinnedShortcut('user-one', team);

    expect(getPinnedShortcuts('user-one')).toEqual([]);
  });
});
