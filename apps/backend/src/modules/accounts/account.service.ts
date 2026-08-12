import type { VerifiedIdentity } from '../../auth/supabase-auth';
import type { ApplicationAccount } from './account';
import { synchronizeApplicationAccount } from './account.repository';

export type SynchronizeAccount = (identity: VerifiedIdentity) => Promise<ApplicationAccount>;

export function createAccountSynchronizer(): SynchronizeAccount {
  return synchronizeApplicationAccount;
}
