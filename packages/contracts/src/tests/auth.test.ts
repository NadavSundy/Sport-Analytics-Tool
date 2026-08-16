import { describe, expect, test } from 'vitest';

import {
  accountDeletionRequestSchema,
  accountDeletionResponseSchema,
  currentUserProfileResponseSchema,
  submitterApprovalStateSchema,
} from '../auth';

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

describe('account deletion contracts', () => {
  test('requires the exact explicit confirmation value', () => {
    expect(accountDeletionRequestSchema.parse({ confirmation: 'DELETE' })).toEqual({
      confirmation: 'DELETE',
    });
    expect(accountDeletionRequestSchema.safeParse({ confirmation: 'delete' }).success).toBe(false);
    expect(
      accountDeletionRequestSchema.safeParse({ confirmation: 'DELETE', accountId: 'another-user' })
        .success,
    ).toBe(false);
  });

  test('describes successful deletion and retained cricket data', () => {
    expect(
      accountDeletionResponseSchema.parse({
        data: { status: 'deleted', retainedCricketData: true },
      }),
    ).toEqual({ data: { status: 'deleted', retainedCricketData: true } });
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

  test('accepts an approved submitter with competition scope', () => {
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
