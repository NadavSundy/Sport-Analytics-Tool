import { randomUUID } from 'node:crypto';
import type { AccountDeletionResponse } from '@sport-analytics/contracts';

import type { DeleteAuthUser, VerifiedIdentity } from '../../auth/supabase-auth';
import type { ApplicationAccount } from '../accounts/account';
import { hashAuthenticationSubject } from '../accounts/account-subject';
import {
  AccountDeletionIncompleteError,
  RecentAuthenticationRequiredError,
} from './account-deletion.errors';
import {
  createAccountDeletionRepository,
  type AccountDeletionRepository,
} from './account-deletion.repository';

export const RECENT_AUTHENTICATION_WINDOW_MS = 15 * 60 * 1000;

export interface AccountDeletionService {
  deleteAccount(
    account: ApplicationAccount,
    identity: VerifiedIdentity,
  ): Promise<AccountDeletionResponse>;
}

function isRecentAuthentication(identity: VerifiedIdentity, now: Date): boolean {
  const lastSignInAt = identity.lastSignInAt;

  if (!lastSignInAt) {
    return false;
  }

  const age = now.getTime() - lastSignInAt.getTime();
  return age >= -60_000 && age <= RECENT_AUTHENTICATION_WINDOW_MS;
}

async function bestEffort(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // The account was disabled by prepare(). A failed status write must not
    // replace the safe public error or cause an unsafe compensating action.
  }
}

export function createAccountDeletionService(
  deleteAuthUser: DeleteAuthUser,
  repository: AccountDeletionRepository = createAccountDeletionRepository(),
  now: () => Date = () => new Date(),
  createTombstoneSubject: () => string = () => `deleted:${randomUUID()}`,
): AccountDeletionService {
  return {
    async deleteAccount(account, identity) {
      if (identity.uid !== account.subject) {
        throw new Error('Authenticated identity does not own the application account');
      }

      if (!isRecentAuthentication(identity, now())) {
        throw new RecentAuthenticationRequiredError();
      }

      const prepared = await repository.prepare(account.accountId);

      if (prepared.state === 'deleted') {
        return {
          data: {
            status: 'deleted',
            retainedCricketData: true,
          },
        };
      }

      if (prepared.state === 'auth_pending') {
        try {
          await deleteAuthUser(prepared.authSubject);
        } catch {
          await bestEffort(() => repository.markAuthDeletionFailed(account.accountId));
          throw new AccountDeletionIncompleteError();
        }

        try {
          await repository.markAuthDeleted(account.accountId);
        } catch {
          throw new AccountDeletionIncompleteError();
        }
      }

      try {
        await repository.finalize(
          account.accountId,
          createTombstoneSubject(),
          hashAuthenticationSubject(prepared.authSubject),
        );
      } catch {
        await bestEffort(() => repository.markFinalizationFailed(account.accountId));
        throw new AccountDeletionIncompleteError();
      }

      return {
        data: {
          status: 'deleted',
          retainedCricketData: true,
        },
      };
    },
  };
}
