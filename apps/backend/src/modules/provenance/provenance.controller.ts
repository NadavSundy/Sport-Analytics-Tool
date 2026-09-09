import {
  apiIdentifierSchema,
  provenanceSubmissionListQuerySchema,
} from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import { rejectAuthorization } from '../../middleware/authorization-response';
import type { ApplicationAccount } from '../accounts/account';
import {
  ProvenanceForbiddenError,
  ProvenanceInputError,
  ProvenanceNotFoundError,
  type ProvenanceService,
} from './provenance.service';

function account(response: Response): ApplicationAccount {
  const authenticated = response.locals.authenticatedAccount as ApplicationAccount | undefined;
  if (!authenticated) throw new Error('Provenance controller requires an authenticated account');
  return authenticated;
}

function rejectReadError(response: Response, error: unknown): boolean {
  if (error instanceof ProvenanceForbiddenError) {
    rejectAuthorization(response);
    return true;
  }
  if (error instanceof ProvenanceNotFoundError) {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } });
    return true;
  }
  if (error instanceof ProvenanceInputError) {
    response.status(400).json({ error: { code: 'INVALID_QUERY', message: error.message } });
    return true;
  }
  return false;
}

export function createProvenanceSubmissionListController(
  service: ProvenanceService,
): RequestHandler {
  return (request, response, next) => {
    const query = provenanceSubmissionListQuerySchema.safeParse(request.query);
    if (!query.success) {
      response.status(400).json({
        error: { code: 'INVALID_QUERY', message: 'The provenance list query is invalid.' },
      });
      return;
    }
    let authenticated: ApplicationAccount;
    try {
      authenticated = account(response);
    } catch (error) {
      next(error);
      return;
    }
    void service
      .listSubmissions(authenticated, query.data)
      .then((result) => response.json(result))
      .catch((error: unknown) => {
        if (rejectReadError(response, error)) return;
        next(error);
      });
  };
}

export function createProvenanceSubmissionController(service: ProvenanceService): RequestHandler {
  return (request, response, next) => {
    const reference = request.params.reference;
    if (!reference || (!/^\d+$/.test(reference) && !zUuid(reference))) {
      response.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Submission provenance was not found.' },
      });
      return;
    }
    let authenticated: ApplicationAccount;
    try {
      authenticated = account(response);
    } catch (error) {
      next(error);
      return;
    }
    void service
      .getSubmission(authenticated, reference)
      .then((result) => response.json(result))
      .catch((error: unknown) => {
        if (rejectReadError(response, error)) return;
        next(error);
      });
  };
}

function zUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function createEventProvenanceController(service: ProvenanceService): RequestHandler {
  return (request, response, next) => {
    const eventId = apiIdentifierSchema.safeParse(request.params.eventId);
    if (!eventId.success) {
      response.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Event provenance was not found.' },
      });
      return;
    }
    let authenticated: ApplicationAccount;
    try {
      authenticated = account(response);
    } catch (error) {
      next(error);
      return;
    }
    void service
      .getEvent(authenticated, eventId.data)
      .then((result) => response.json(result))
      .catch((error: unknown) => {
        if (rejectReadError(response, error)) return;
        next(error);
      });
  };
}

export function createStatisticProvenanceController(service: ProvenanceService): RequestHandler {
  return (request, response, next) => {
    const fixtureId = apiIdentifierSchema.safeParse(request.params.fixtureId);
    const statisticId = apiIdentifierSchema.safeParse(request.params.statisticId);
    if (!fixtureId.success || !statisticId.success) {
      response.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Statistic provenance was not found.' },
      });
      return;
    }
    let authenticated: ApplicationAccount;
    try {
      authenticated = account(response);
    } catch (error) {
      next(error);
      return;
    }
    void service
      .getStatistic(authenticated, fixtureId.data, statisticId.data)
      .then((result) => response.json(result))
      .catch((error: unknown) => {
        if (rejectReadError(response, error)) return;
        next(error);
      });
  };
}
