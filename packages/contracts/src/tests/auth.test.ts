import { describe, expect, test } from 'vitest';

import {
  APPLICATION_ROLES,
  administratorSubmitterAccessUpdateSchema,
  administratorUserManagementResponseSchema,
  applicationRoleSchema,
  currentUserProfileResponseSchema,
  submitterAccessRequestResponseSchema,
  submitterApprovalStateSchema,
} from '../auth';

describe('application role contract', () => {
  test.each(APPLICATION_ROLES)('accepts the %s role', (role) => {
    expect(applicationRoleSchema.parse(role)).toBe(role);
  });

  test.each(['administrator', 'approved_submitter', 'owner'])(
    'rejects the unsupported %s role',
    (role) => {
      expect(applicationRoleSchema.safeParse(role).success).toBe(false);
    },
  );
});

describe('administrator user-management contracts', () => {
  test('accepts users, scope choices, and access audit data', () => {
    expect(
      administratorUserManagementResponseSchema.parse({
        data: {
          users: [
            {
              id: '42',
              displayName: 'Contributor',
              role: 'submitter',
              approvalState: 'approved',
              competitionScopes: [{ competitionId: '7', name: 'Premier T20' }],
              disabled: false,
              updatedAt: '2026-08-16T12:00:00.000Z',
              submitterAccessUpdatedAt: '2026-08-16T12:00:00.000Z',
              submitterAccessUpdatedBy: {
                id: '1',
                displayName: 'Administrator',
              },
            },
          ],
          availableScopes: [{ competitionId: '7', name: 'Premier T20' }],
        },
      }),
    ).toMatchObject({
      data: {
        users: [{ id: '42', role: 'submitter' }],
      },
    });
  });

  test('requires at least one unique competition scope for approval', () => {
    expect(
      administratorSubmitterAccessUpdateSchema.safeParse({
        approved: true,
        competitionIds: [],
      }).success,
    ).toBe(false);
    expect(
      administratorSubmitterAccessUpdateSchema.safeParse({
        approved: true,
        competitionIds: ['7', '7'],
      }).success,
    ).toBe(false);
    expect(
      administratorSubmitterAccessUpdateSchema.safeParse({
        approved: true,
        competitionIds: ['7'],
      }).success,
    ).toBe(true);
  });

  test('does not allow revoked access to retain competition scopes', () => {
    expect(
      administratorSubmitterAccessUpdateSchema.safeParse({
        approved: false,
        competitionIds: ['7'],
      }).success,
    ).toBe(false);
    expect(
      administratorSubmitterAccessUpdateSchema.safeParse({
        approved: false,
        competitionIds: [],
      }).success,
    ).toBe(true);
  });
});

describe('submitter approval state contract', () => {
  test.each(['not_requested', 'pending', 'approved', 'rejected'] as const)(
    'accepts the %s state',
    (approvalState) => {
      expect(submitterApprovalStateSchema.parse(approvalState)).toBe(approvalState);
    },
  );

  test('rejects an unsupported approval state', () => {
    expect(submitterApprovalStateSchema.safeParse('revoked').success).toBe(false);
  });
});

describe('current user profile response contract', () => {
  test.each(['not_requested', 'pending', 'approved', 'rejected'] as const)(
    'accepts a current-user response with %s submitter access',
    (approvalState) => {
      const result = currentUserProfileResponseSchema.safeParse({
        user: {
          id: '42',
          subject: 'supabase-user-123',
          displayName: 'Example User',
          role: 'viewer',
          approvalState,
          competitionIds: [],
        },
      });

      expect(result.success).toBe(true);
    },
  );

  test('retains a legacy approved request state separately from the viewer role', () => {
    const result = currentUserProfileResponseSchema.safeParse({
      user: {
        id: '42',
        subject: 'supabase-user-123',
        displayName: 'Example User',
        role: 'viewer',
        approvalState: 'approved',
        competitionIds: ['7', '12'],
      },
    });

    expect(result.success).toBe(true);
  });

  test('accepts a null display name', () => {
    const result = currentUserProfileResponseSchema.safeParse({
      user: {
        id: '42',
        subject: 'supabase-user-123',
        displayName: null,
        role: 'viewer',
        approvalState: 'not_requested',
        competitionIds: [],
      },
    });

    expect(result.success).toBe(true);
  });

  test('rejects a response without the approval state', () => {
    const result = currentUserProfileResponseSchema.safeParse({
      user: {
        id: '42',
        subject: 'supabase-user-123',
        displayName: 'Example User',
        role: 'viewer',
        competitionIds: [],
      },
    });

    expect(result.success).toBe(false);
  });

  test('rejects duplicate competition scope identifiers', () => {
    const result = currentUserProfileResponseSchema.safeParse({
      user: {
        id: '42',
        subject: 'supabase-user-123',
        displayName: 'Example User',
        role: 'viewer',
        approvalState: 'approved',
        competitionIds: ['7', '7'],
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('submitter access request response contract', () => {
  test('accepts the persisted pending request response', () => {
    expect(
      submitterAccessRequestResponseSchema.parse({
        data: {
          accountId: '42',
          approvalState: 'pending',
        },
      }),
    ).toEqual({
      data: {
        accountId: '42',
        approvalState: 'pending',
      },
    });
  });

  test.each(['not_requested', 'approved', 'rejected'])(
    'rejects the non-pending %s state',
    (approvalState) => {
      expect(
        submitterAccessRequestResponseSchema.safeParse({
          data: {
            accountId: '42',
            approvalState,
          },
        }).success,
      ).toBe(false);
    },
  );
});
