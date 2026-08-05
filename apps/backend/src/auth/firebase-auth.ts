import { applicationDefault, getApps, initializeApp, type AppOptions } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Environment } from '../config/env';

const FIREBASE_APP_NAME = 'sport-analytics-api';

type FirebaseEnvironment = Pick<Environment, 'FIREBASE_PROJECT_ID' | 'FIREBASE_AUTH_EMULATOR_HOST'>;

export interface VerifiedIdentity {
  uid: string;
}

export type VerifyIdToken = (idToken: string) => Promise<VerifiedIdentity>;

function createFirebaseOptions(environment: FirebaseEnvironment): AppOptions {
  const options: AppOptions = {
    projectId: environment.FIREBASE_PROJECT_ID,
  };

  if (!environment.FIREBASE_AUTH_EMULATOR_HOST) {
    options.credential = applicationDefault();
  }

  return options;
}

export function createFirebaseTokenVerifier(environment: FirebaseEnvironment): VerifyIdToken {
  const existingApp = getApps().find((app) => app.name === FIREBASE_APP_NAME);

  const firebaseApp =
    existingApp ?? initializeApp(createFirebaseOptions(environment), FIREBASE_APP_NAME);

  const firebaseAuth = getAuth(firebaseApp);

  return async (idToken) => {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken, true);

    return {
      uid: decodedToken.uid,
    };
  };
}
