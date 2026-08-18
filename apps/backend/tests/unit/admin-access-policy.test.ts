import { describe, expect, test } from 'vitest';

import { resolveSubmitterAccessTransition } from '../../src/modules/admin/admin-access-policy';

describe('administrator submitter-access transition policy', () => {
  test.each([
    ['pending approval', { role: 'viewer', approvalState: 'pending' }, 'grant', 'approve'],
    ['pending rejection', { role: 'viewer', approvalState: 'pending' }, 'reject', 'reject'],
    ['approved scope update', { role: 'submitter', approvalState: 'approved' }, 'grant', 'scope'],
    ['approved revocation', { role: 'submitter', approvalState: 'approved' }, 'revoke', 'revoke'],
  ] as const)('allows %s', (_label, target, action, expectedTransition) => {
    expect(resolveSubmitterAccessTransition(target, action)).toBe(expectedTransition);
  });

  test.each([
    ['approval without a request', { role: 'viewer', approvalState: 'not_requested' }, 'grant'],
    ['approval after rejection', { role: 'viewer', approvalState: 'rejected' }, 'grant'],
    ['rejection without a request', { role: 'viewer', approvalState: 'not_requested' }, 'reject'],
    ['rejection of a submitter', { role: 'submitter', approvalState: 'approved' }, 'reject'],
    ['revocation of a viewer', { role: 'viewer', approvalState: 'approved' }, 'revoke'],
    ['revocation of a pending viewer', { role: 'viewer', approvalState: 'pending' }, 'revoke'],
    [
      'scope update on inconsistent state',
      { role: 'submitter', approvalState: 'pending' },
      'grant',
    ],
  ] as const)('rejects %s', (_label, target, action) => {
    expect(() => resolveSubmitterAccessTransition(target, action)).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SUBMITTER_ACCESS_TRANSITION',
        message:
          "The requested submitter access transition is not valid for the account's current state.",
      }),
    );
  });
});
