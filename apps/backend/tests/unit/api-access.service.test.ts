import { describe, expect, test, vi } from 'vitest';

import type { ApiAccessRepository } from '../../src/modules/api-consumers/api-access.repository';
import { createApiAccessService } from '../../src/modules/api-consumers/api-access.service';
import type { ApiConsumerService } from '../../src/modules/api-consumers/api-consumer.service';

describe('API access service', () => {
  test('enriches pending administrator reviews with safe requester identity', async () => {
    const repository = {
      listPending: vi.fn().mockResolvedValue([
        {
          id: '4',
          requesterAccountId: '11',
          name: 'Match model',
          intendedUse: 'Research analysis',
          state: 'pending',
          createdAt: '2026-10-04T10:00:00.000Z',
          reviewedAt: null,
          reviewedBy: null,
          reviewReason: null,
          requesterAuthSubject: 'auth-requester',
          requesterDisplayName: 'Research User',
        },
      ]),
    } as unknown as ApiAccessRepository;
    const readEmail = vi.fn().mockResolvedValue('research@example.com');
    const service = createApiAccessService(repository, {} as ApiConsumerService, readEmail);

    await expect(service.listPending()).resolves.toEqual([
      expect.objectContaining({
        requester: { displayName: 'Research User', email: 'research@example.com' },
      }),
    ]);
    expect(readEmail).toHaveBeenCalledWith('auth-requester');
    expect(JSON.stringify(await service.listPending())).not.toContain('auth-requester');
  });
});
