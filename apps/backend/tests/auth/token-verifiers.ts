import type { VerifiedIdentity, VerifyAccessToken } from '../../src/auth/supabase-auth';

export const approvedSubmitterIdentity: VerifiedIdentity = {
  uid: 'approved-submitter-test-user',
};

export const administratorIdentity: VerifiedIdentity = {
  uid: 'administrator-test-user',
};

export function acceptingTokenVerifier(
  identity: VerifiedIdentity = approvedSubmitterIdentity,
): VerifyAccessToken {
  return async () => identity;
}

export const rejectingTokenVerifier: VerifyAccessToken = async () => {
  throw new Error('Invalid test token.');
};
