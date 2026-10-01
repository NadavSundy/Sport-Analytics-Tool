import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  getPinnedShortcuts,
  MAX_PINNED_SHORTCUTS,
  togglePinnedShortcut,
  type PinnedShortcut,
} from './pinned-shortcuts';

export function PinShortcutButton({
  label,
  shortcut,
}: {
  label: string;
  shortcut: PinnedShortcut;
}) {
  const { identity, isAuthenticated } = useAuth();
  const accountId = isAuthenticated ? (identity?.id ?? null) : null;
  const [shortcuts, setShortcuts] = useState<PinnedShortcut[]>([]);

  useEffect(() => {
    setShortcuts(accountId ? getPinnedShortcuts(accountId) : []);
  }, [accountId]);

  if (!accountId) {
    return null;
  }

  const pinned = shortcuts.some(
    (candidate) => candidate.kind === shortcut.kind && candidate.id === shortcut.id,
  );
  const limitReached = !pinned && shortcuts.length >= MAX_PINNED_SHORTCUTS;

  return (
    <button
      aria-pressed={pinned}
      className="button button--secondary"
      disabled={limitReached}
      onClick={() => setShortcuts(togglePinnedShortcut(accountId, shortcut))}
      title={limitReached ? 'You can pin up to three shortcuts.' : undefined}
      type="button"
    >
      <span aria-hidden="true">{pinned ? '★' : '☆'} </span>
      {pinned ? `Unpin ${label}` : `Pin ${label}`}
    </button>
  );
}
