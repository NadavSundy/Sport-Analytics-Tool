import { describe, expect, test } from 'vitest';

import { resolveSubmitterAccessTransition } from '../../src/modules/admin/admin-access-policy';

describe('administrator submitter-access transition policy', () => {
  test.each([
    ['pending approval', { role: 'viewer', approvalState: 'pending' }, true, 'approve'],
    ['pending rejection', { role: 'viewer', approvalState: 'pending' }, false, 'reject'],
    ['approved scope update', { role: 'submitter', approvalState: 'approved' }, true, 'scope'],
    ['approved revocation', { role: 'submitter', approvalState: 'approved' }, false, 'revoke'],
  ] as const)('allows %s', (_label, target, approved, expectedTransition) => {
    expect(
      resolveSubmitterAccessTransition(target, {
        approved,
        competitionIds: approved ? ['7'] : [],
      }),
    ).toBe(expectedTransition);
  });

  test.each([
    ['not_requested', { role: 'viewer', approvalState: 'not_requested' }],
    ['rejected', { role: 'viewer', approvalState: 'rejected' }],
    ['approved viewer', { role: 'viewer', approvalState: 'approved' }],
    ['inconsistent submitter', { role: 'submitter', approvalState: 'pending' }],
  ] as const)('rejects approval for a %s account', (_label, target) => {
    expect(() =>
      resolveSubmitterAccessTransition(target, {
        approved: true,
        competitionIds: ['7'],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'SUBMITTER_REQUEST_NOT_PENDING',
        message: 'This account does not have a pending submitter access request.',
      }),
    );
  });
});
