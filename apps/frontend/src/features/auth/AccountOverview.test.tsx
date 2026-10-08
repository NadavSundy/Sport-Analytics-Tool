import type { CurrentUserProfile } from '@sport-analytics/contracts';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { AccountPage } from './AuthPages';
import { useAuth } from './AuthProvider';
import { getCurrentUserProfile } from './current-user-api';
import { useAuthenticatedApiClient } from './useAuthenticatedApiClient';

vi.mock('./AuthProvider', () => ({ useAuth: vi.fn() }));
vi.mock('./current-user-api', () => ({ getCurrentUserProfile: vi.fn() }));
vi.mock('./useAuthenticatedApiClient', () => ({ useAuthenticatedApiClient: vi.fn() }));
vi.mock('../submissions/BatchUploadPage', () => ({ competitionOptions: vi.fn() }));

function profile(role: 'admin' | 'submitter' | 'viewer', competitionIds: string[]) {
  return {
    role,
    approvalState: role === 'submitter' ? 'approved' : 'not_requested',
    competitionIds,
  } as CurrentUserProfile;
}

function renderOverview() {
  render(
    <MemoryRouter initialEntries={['/account/overview']}>
      <Routes>
        <Route path="/account/:section" element={<AccountPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function scopeValue() {
  const label = await screen.findByText('Competition scopes');
  return label.nextElementSibling;
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    identity: { email: 'person@example.com' },
    isAuthenticated: true,
    isLoading: false,
  } as ReturnType<typeof useAuth>);
  // The API client reference must remain stable across renders.
  vi.mocked(useAuthenticatedApiClient).mockReturnValue(
    {} as ReturnType<typeof useAuthenticatedApiClient>,
  );
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Account overview competition scopes', () => {
  it.each([[], ['7'], ['7', '8']])(
    'shows All for administrators with competition IDs %j',
    async (competitionIds) => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue(profile('admin', competitionIds));
      renderOverview();
      expect(await scopeValue()).toHaveTextContent('All');
      expect(
        screen.queryByRole('button', { name: /View approved competition scopes/i }),
      ).toBeNull();
    },
  );

  it('continues to show the assigned scope count for approved submitters', async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(profile('submitter', ['7', '8']));
    renderOverview();
    expect(await scopeValue()).toHaveTextContent('2');
    expect(
      screen.getByRole('button', { name: /View approved competition scopes/i }),
    ).toBeInTheDocument();
  });

  it('does not show scope counts for viewers without assignments', async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(profile('viewer', []));
    renderOverview();
    await screen.findByText('viewer');
    expect(screen.queryByText('Competition scopes')).toBeNull();
  });
});
