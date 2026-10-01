export const FIXTURE_CONTEXT_STORAGE_KEY_PREFIX = 'statsthegame:fixture-context:';

export interface FixtureContextPreference {
  competitionId: string;
  seasonId: string;
}

function storageKey(accountId: string): string {
  return `${FIXTURE_CONTEXT_STORAGE_KEY_PREFIX}${accountId}`;
}

function isFixtureContextPreference(value: unknown): value is FixtureContextPreference {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.competitionId === 'string' &&
    candidate.competitionId.trim().length > 0 &&
    typeof candidate.seasonId === 'string' &&
    candidate.seasonId.trim().length > 0
  );
}

export function getFixtureContextPreference(accountId: string): FixtureContextPreference | null {
  try {
    const stored = window.localStorage.getItem(storageKey(accountId));
    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);
    return isFixtureContextPreference(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setFixtureContextPreference(
  accountId: string,
  preference: FixtureContextPreference,
): void {
  try {
    window.localStorage.setItem(storageKey(accountId), JSON.stringify(preference));
  } catch {
    // Fixture browsing continues with the current URL when storage is unavailable.
  }
}

export function clearFixtureContextPreference(accountId: string): void {
  try {
    window.localStorage.removeItem(storageKey(accountId));
  } catch {
    // A browser can block storage access without preventing public browsing.
  }
}
