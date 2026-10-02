const PINNED_SHORTCUTS_STORAGE_KEY_PREFIX = 'stats_pinned_';
export const MAX_PINNED_SHORTCUTS = 3;

type PinnedShortcutKind = 'competition' | 'team';

export interface PinnedShortcut {
  id: string;
  kind: PinnedShortcutKind;
}

function storageKey(accountId: string): string {
  return `${PINNED_SHORTCUTS_STORAGE_KEY_PREFIX}${accountId}`;
}

function serialize(shortcut: PinnedShortcut): string {
  return `${shortcut.kind === 'competition' ? 'comp' : 'team'}_${shortcut.id}`;
}

function parse(value: unknown): PinnedShortcut | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (value.startsWith('team_') && value.slice(5).trim()) {
    return { kind: 'team', id: value.slice(5) };
  }
  if (value.startsWith('comp_') && value.slice(5).trim()) {
    return { kind: 'competition', id: value.slice(5) };
  }
  return null;
}

function sameShortcut(left: PinnedShortcut, right: PinnedShortcut): boolean {
  return left.kind === right.kind && left.id === right.id;
}

export function getPinnedShortcuts(accountId: string): PinnedShortcut[] {
  try {
    const stored = window.localStorage.getItem(storageKey(accountId));
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(parse)
      .filter((shortcut): shortcut is PinnedShortcut => shortcut !== null)
      .filter(
        (shortcut, index, shortcuts) =>
          shortcuts.findIndex((candidate) => sameShortcut(candidate, shortcut)) === index,
      )
      .slice(0, MAX_PINNED_SHORTCUTS);
  } catch {
    return [];
  }
}

function persist(accountId: string, shortcuts: PinnedShortcut[]): void {
  try {
    window.localStorage.setItem(storageKey(accountId), JSON.stringify(shortcuts.map(serialize)));
    window.dispatchEvent(new Event('stats-pinned-change'));
  } catch {
    // Pinning remains available for the current view when storage is unavailable.
  }
}

export function togglePinnedShortcut(
  accountId: string,
  shortcut: PinnedShortcut,
): PinnedShortcut[] {
  const current = getPinnedShortcuts(accountId);
  const existing = current.some((candidate) => sameShortcut(candidate, shortcut));
  const next = existing
    ? current.filter((candidate) => !sameShortcut(candidate, shortcut))
    : current.length < MAX_PINNED_SHORTCUTS
      ? [...current, shortcut]
      : current;

  if (next !== current) {
    persist(accountId, next);
  }
  return next;
}
