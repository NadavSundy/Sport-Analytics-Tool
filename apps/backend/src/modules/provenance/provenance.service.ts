import {
  type EventProvenanceResponse,
  type ProvenanceSubmissionDetailResponse,
  type ProvenanceSubmissionListQuery,
  type ProvenanceSubmissionListResponse,
  type StatisticProvenanceResponse,
} from '@sport-analytics/contracts';
import { z } from 'zod';

import type { ApplicationAccount } from '../accounts/account';
import type { FixtureStatisticsService } from '../statistics/fixture-statistics.service';
import type { ParticipantAggregatesService } from '../statistics/participant-aggregates.service';
import { createCursor, InvalidCursorError, readCursor } from '../public-read/cursor';
import { createProvenanceRepository, type ProvenanceRepository } from './provenance.repository';

export class ProvenanceForbiddenError extends Error {}
export class ProvenanceNotFoundError extends Error {}
export class ProvenanceInputError extends Error {}

const submissionCursorSchema = z.object({
  receivedAt: z.string().datetime(),
  kind: z.enum(['direct', 'file', 'batch']),
  reference: z.string().min(1),
});
const contributorCursorSchema = z.object({ deliveryId: z.string().regex(/^\d+$/) });

export interface ProvenanceService {
  listSubmissions(
    account: ApplicationAccount,
    query: ProvenanceSubmissionListQuery,
  ): Promise<ProvenanceSubmissionListResponse>;
  getSubmission(
    account: ApplicationAccount,
    reference: string,
  ): Promise<ProvenanceSubmissionDetailResponse>;
  getEvent(account: ApplicationAccount, eventId: string): Promise<EventProvenanceResponse>;
  getStatistic(
    account: ApplicationAccount,
    fixtureId: string,
    statisticId: string,
  ): Promise<StatisticProvenanceResponse>;
  getParticipantStatistic(
    account: ApplicationAccount,
    participantId: string,
    statisticId: string,
    query: { limit: number; cursor?: string | undefined },
  ): Promise<StatisticProvenanceResponse>;
}

function reviewerScopes(account: ApplicationAccount): string[] {
  return account.role === 'admin' ? account.competitionIds : [];
}

function canReviewCompetition(account: ApplicationAccount, competitionId: string | null): boolean {
  return (
    account.role === 'admin' &&
    competitionId !== null &&
    account.competitionIds.includes(competitionId)
  );
}

export function createProvenanceService(
  fixtureStatisticsService: FixtureStatisticsService,
  repository: ProvenanceRepository = createProvenanceRepository(),
  participantAggregatesService?: ParticipantAggregatesService,
): ProvenanceService {
  return {
    async listSubmissions(account, query) {
      let before: z.infer<typeof submissionCursorSchema> | undefined;
      if (query.cursor) {
        try {
          before = readCursor(query.cursor, submissionCursorSchema);
        } catch (error) {
          if (error instanceof InvalidCursorError || error instanceof z.ZodError) {
            throw new ProvenanceInputError('The pagination cursor is invalid.');
          }
          throw error;
        }
      }

      const records = await repository.listSubmissions({
        accountId: account.accountId,
        reviewerCompetitionIds: reviewerScopes(account),
        ...(query.kind ? { kind: query.kind } : {}),
        ...(before ? { before } : {}),
        limit: query.limit + 1,
      });
      const page = records.slice(0, query.limit);
      const last = page.at(-1);
      return {
        data: page,
        pagination: {
          nextCursor:
            records.length > query.limit && last
              ? createCursor({
                  receivedAt: last.receivedAt,
                  kind: last.kind,
                  reference: last.reference,
                })
              : null,
        },
      };
    },

    async getSubmission(account, reference) {
      const submission = await repository.findSubmission(
        reference,
        account.accountId,
        reviewerScopes(account),
      );
      if (!submission) throw new ProvenanceNotFoundError('Submission provenance was not found.');

      if (submission.kind === 'batch' && submission.batchReference) {
        const [lifecycle, decisions] = await Promise.all([
          repository.listBatchLifecycle(submission.batchReference),
          repository.listBatchDecisions(submission.batchReference),
        ]);
        return {
          data: {
            ...submission,
            lifecycle:
              lifecycle.length > 0
                ? lifecycle
                : [
                    {
                      fromState: null,
                      toState: submission.status,
                      at: submission.receivedAt,
                      actorKind: 'api',
                      actorIdentifier: submission.submitter.accountId ?? 'tombstoned',
                      reason: 'Batch received.',
                    },
                  ],
            decisions,
          },
        };
      }

      return {
        data: {
          ...submission,
          lifecycle: [
            {
              fromState: null,
              toState: submission.status,
              at: submission.receivedAt,
              actorKind: 'api',
              actorIdentifier: submission.submitter.accountId ?? 'tombstoned',
              reason:
                submission.status === 'accepted'
                  ? 'Submission validated and accepted.'
                  : 'Submission lifecycle state recorded.',
            },
          ],
          decisions:
            submission.status === 'accepted' || submission.status === 'rejected'
              ? [
                  {
                    decision: submission.status,
                    actor: null,
                    decidedAt: submission.receivedAt,
                    reason: null,
                  },
                ]
              : [],
        },
      };
    },

    async getEvent(account, eventId) {
      if (!/^\d+$/.test(eventId)) {
        throw new ProvenanceNotFoundError('Event provenance was not found.');
      }
      const event = await repository.findEvent(eventId);
      if (!event) throw new ProvenanceNotFoundError('Event provenance was not found.');

      const ownsSource = event.submitterId === account.accountId;
      if (!ownsSource && !canReviewCompetition(account, event.competitionId)) {
        throw new ProvenanceForbiddenError();
      }

      return {
        data: {
          eventId: event.eventId,
          sourceEventId: event.sourceEventId,
          fixtureId: event.fixtureId,
          competitionId: event.competitionId,
          currentDeliveryId: event.currentDeliveryId,
          revisions: event.revisions,
        },
      };
    },

    async getStatistic(account, fixtureId, statisticId) {
      if (!/^\d+$/.test(fixtureId)) {
        throw new ProvenanceNotFoundError('Statistic provenance was not found.');
      }
      const competitionId = await repository.findFixtureCompetition(fixtureId);
      if (competitionId === undefined) {
        throw new ProvenanceNotFoundError('Statistic provenance was not found.');
      }

      const statistic = await fixtureStatisticsService.getFixtureStatistic(fixtureId, statisticId, {
        includeContributors: true,
      });
      if (!statistic) throw new ProvenanceNotFoundError('Statistic provenance was not found.');

      const deliveryIds = statistic.contributingEvents?.map((event) => event.eventId) ?? [];
      const contributors = await repository.listContributorSources(deliveryIds);
      const ownsEverySource =
        contributors.length === deliveryIds.length &&
        contributors.every(
          (contributor) => contributor.source.submitter.accountId === account.accountId,
        );

      if (!ownsEverySource && !canReviewCompetition(account, competitionId)) {
        throw new ProvenanceForbiddenError();
      }

      return {
        data: {
          statisticId: statistic.statisticId,
          fixtureId: statistic.fixtureId,
          participantId: null,
          statisticCode: statistic.statisticCode,
          scope: statistic.scope,
          sourceEventCount: statistic.sourceEventCount,
          contributors,
          pagination: { nextCursor: null },
        },
      };
    },

    async getParticipantStatistic(account, participantId, statisticId, query) {
      if (!/^\d+$/.test(participantId) || !participantAggregatesService) {
        throw new ProvenanceNotFoundError('Statistic provenance was not found.');
      }
      let before: string | undefined;
      if (query.cursor) {
        try {
          before = readCursor(query.cursor, contributorCursorSchema).deliveryId;
        } catch {
          throw new ProvenanceInputError('The pagination cursor is invalid.');
        }
      }
      const statistic = await participantAggregatesService.getParticipantAggregate(
        participantId,
        statisticId,
      );
      if (!statistic) throw new ProvenanceNotFoundError('Statistic provenance was not found.');
      const records =
        before === undefined
          ? await repository.listParticipantContributorSources(
              participantId,
              statistic,
              query.limit + 1,
            )
          : await repository.listParticipantContributorSources(
              participantId,
              statistic,
              query.limit + 1,
              before,
            );
      const contributors = records.slice(0, query.limit);
      const ownsEverySource = contributors.every(
        (contributor) => contributor.source.submitter.accountId === account.accountId,
      );
      const competitionId = statistic.scope === 'career' ? null : statistic.competitionId;
      if (!ownsEverySource && !canReviewCompetition(account, competitionId))
        throw new ProvenanceForbiddenError();
      const last = contributors.at(-1);
      return {
        data: {
          statisticId: statistic.statisticId,
          fixtureId: null,
          participantId,
          statisticCode: statistic.statisticCode,
          scope: statistic.scope,
          sourceEventCount: statistic.sourceEventCount,
          contributors,
          pagination: {
            nextCursor:
              records.length > query.limit && last
                ? createCursor({ deliveryId: last.deliveryId })
                : null,
          },
        },
      };
    },
  };
}
