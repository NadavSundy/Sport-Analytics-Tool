import {
  administratorRoleUpdateSchema,
  administratorSubmitterAccessResponseSchema,
  administratorSubmitterAccessUpdateSchema,
  administratorUserManagementResponseSchema,
} from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import type { ApplicationAccount } from '../accounts/account';
import {
  AdminManagementConflictError,
  AdminEmailLookupUnavailableError,
  AdminUserNotFoundError,
  InvalidCompetitionScopesError,
} from './admin.errors';
import type { AdminService } from './admin.service';

function getAuthenticatedAccount(response: Response): ApplicationAccount {
  const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;

  if (!account) {
    throw new Error('Administrator controller requires an authenticated application account');
  }

  return account;
}

function validationDetails(
  issues: { message: string; path: PropertyKey[] }[],
): { code: string; message: string; field?: string }[] {
  return issues.map((issue) => ({
    code: 'INVALID_FIELD',
    message: issue.message,
    ...(issue.path.length > 0 ? { field: issue.path.join('.') } : {}),
  }));
}

function isDatabaseIdentifier(value: string): boolean {
  if (!/^\d+$/.test(value)) {
    return false;
  }

  try {
    return BigInt(value) <= 9_223_372_036_854_775_807n;
  } catch {
    return false;
  }
}

export function createAdminListUsersController(service: AdminService): RequestHandler {
  return (_request, response, next) => {
    void service
      .listUsers()
      .then((result) => {
        response.status(200).json(administratorUserManagementResponseSchema.parse(result));
      })
      .catch((error: unknown) => {
        if (error instanceof AdminEmailLookupUnavailableError) {
          response.status(503).json({
            error: {
              code: 'ADMIN_EMAIL_LOOKUP_UNAVAILABLE',
              message: error.message,
            },
          });
          return;
        }

        next(error);
      });
  };
}

export function createAdminUpdateRoleController(service: AdminService): RequestHandler {
  return (request, response, next) => {
    const targetAccountId = request.params.userId;
    const parsed = administratorRoleUpdateSchema.safeParse(request.body);

    if (!targetAccountId || !isDatabaseIdentifier(targetAccountId)) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The role update is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              field: 'userId',
              message: 'The user identifier is invalid.',
            },
          ],
        },
      });
      return;
    }

    if (!parsed.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The role update is invalid.',
          details: validationDetails(parsed.error.issues),
        },
      });
      return;
    }

    let administrator: ApplicationAccount;
    try {
      administrator = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    void service
      .updateRole(administrator, targetAccountId, parsed.data)
      .then((result) => {
        response.status(200).json(administratorSubmitterAccessResponseSchema.parse(result));
      })
      .catch((error: unknown) => {
        if (error instanceof AdminUserNotFoundError) {
          response.status(404).json({
            error: { code: 'USER_NOT_FOUND', message: error.message },
          });
          return;
        }
        if (error instanceof AdminManagementConflictError) {
          response.status(409).json({ error: { code: error.code, message: error.message } });
          return;
        }
        if (error instanceof AdminEmailLookupUnavailableError) {
          response.status(503).json({
            error: { code: 'ADMIN_EMAIL_LOOKUP_UNAVAILABLE', message: error.message },
          });
          return;
        }
        next(error);
      });
  };
}

export function createAdminUpdateSubmitterAccessController(service: AdminService): RequestHandler {
  return (request, response, next) => {
    const targetAccountId = request.params.userId;

    if (!targetAccountId || !isDatabaseIdentifier(targetAccountId)) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The submitter access update is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              field: 'userId',
              message: 'The user identifier is invalid.',
            },
          ],
        },
      });
      return;
    }

    const parsed = administratorSubmitterAccessUpdateSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The submitter access update is invalid.',
          details: validationDetails(parsed.error.issues),
        },
      });
      return;
    }

    const malformedCompetitionIds = parsed.data.competitionIds.filter(
      (competitionId) => !isDatabaseIdentifier(competitionId),
    );

    if (malformedCompetitionIds.length > 0) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The submitter access update is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              field: 'competitionIds',
              message: 'Every competition identifier must be valid.',
            },
          ],
        },
      });
      return;
    }

    let administrator: ApplicationAccount;

    try {
      administrator = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    void service
      .updateSubmitterAccess(administrator, targetAccountId, parsed.data)
      .then((result) => {
        response.status(200).json(administratorSubmitterAccessResponseSchema.parse(result));
      })
      .catch((error: unknown) => {
        if (error instanceof AdminUserNotFoundError) {
          response.status(404).json({
            error: {
              code: 'USER_NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }

        if (error instanceof InvalidCompetitionScopesError) {
          response.status(422).json({
            error: {
              code: 'INVALID_COMPETITION_SCOPE',
              message: error.message,
              details: [
                {
                  code: 'INVALID_SCOPE',
                  field: 'competitionIds',
                  message: 'Select only competition scopes that currently exist.',
                },
              ],
            },
          });
          return;
        }

        if (error instanceof AdminManagementConflictError) {
          response.status(409).json({
            error: {
              code: error.code,
              message: error.message,
            },
          });
          return;
        }

        next(error);
      });
  };
}

export function createAdminRejectSubmitterAccessRequestController(
  service: AdminService,
): RequestHandler {
  return (request, response, next) => {
    const targetAccountId = request.params.userId;

    if (!targetAccountId || !isDatabaseIdentifier(targetAccountId)) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The submitter access rejection is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              field: 'userId',
              message: 'The user identifier is invalid.',
            },
          ],
        },
      });
      return;
    }

    let administrator: ApplicationAccount;

    try {
      administrator = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    void service
      .rejectSubmitterAccessRequest(administrator, targetAccountId)
      .then((result) => {
        response.status(200).json(administratorSubmitterAccessResponseSchema.parse(result));
      })
      .catch((error: unknown) => {
        if (error instanceof AdminUserNotFoundError) {
          response.status(404).json({
            error: {
              code: 'USER_NOT_FOUND',
              message: error.message,
            },
          });
          return;
        }

        if (error instanceof AdminManagementConflictError) {
          response.status(409).json({
            error: {
              code: error.code,
              message: error.message,
            },
          });
          return;
        }

        next(error);
      });
  };
}
