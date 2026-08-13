import { z } from 'zod';

import {
  apiDateSchema,
  apiIdentifierSchema,
  createCollectionResponseSchema,
  createResourceResponseSchema,
  paginationQuerySchema,
} from './api';

const filterTextSchema = z.string().trim().min(1);

export const competitionSchema = z.object({
  competitionId: apiIdentifierSchema,
  name: z.string().min(1),
});

export const seasonSchema = z.object({
  seasonId: apiIdentifierSchema,
  competitionId: apiIdentifierSchema,
  label: z.string().min(1),
});

export const fixtureSchema = z.object({
  fixtureId: apiIdentifierSchema,
  competitionId: apiIdentifierSchema.nullable(),
  seasonId: apiIdentifierSchema.nullable(),
  season: z.string().min(1),
  matchType: z.string().min(1),
  teamType: z.string().min(1),
  gender: z.string().min(1),
  ballsPerOver: z.number().int().positive(),
  scheduledOvers: z.number().int().positive().nullable(),
  startDate: apiDateSchema,
  endDate: apiDateSchema,
});

export const competitorSchema = z.object({
  competitorId: apiIdentifierSchema,
  name: z.string().min(1),
});

export const participantSchema = z.object({
  participantId: apiIdentifierSchema,
  displayName: z.string().min(1),
});


export const competitionListQuerySchema = paginationQuerySchema.extend({
  name: filterTextSchema.optional(),
});

export const seasonListQuerySchema = paginationQuerySchema.extend({
  competitionId: apiIdentifierSchema.optional(),
});

export const fixtureListQuerySchema = paginationQuerySchema
  .extend({
    competitionId: apiIdentifierSchema.optional(),
    seasonId: apiIdentifierSchema.optional(),
    competitorId: apiIdentifierSchema.optional(),
    gender: filterTextSchema.optional(),
    startDateFrom: apiDateSchema.optional(),
    startDateTo: apiDateSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.startDateFrom && value.startDateTo && value.startDateFrom > value.startDateTo) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDateTo'],
        message: 'startDateTo must be on or after startDateFrom.',
      });
    }
  });

export const competitorListQuerySchema = paginationQuerySchema.extend({
  competitionId: apiIdentifierSchema.optional(),
  seasonId: apiIdentifierSchema.optional(),
  name: filterTextSchema.optional(),
});

export const participantListQuerySchema = paginationQuerySchema.extend({
  fixtureId: apiIdentifierSchema.optional(),
  competitorId: apiIdentifierSchema.optional(),
  name: filterTextSchema.optional(),
});

export const competitionResponseSchema = createResourceResponseSchema(competitionSchema);

export const competitionCollectionResponseSchema =
  createCollectionResponseSchema(competitionSchema);

export const seasonResponseSchema = createResourceResponseSchema(seasonSchema);

export const seasonCollectionResponseSchema = createCollectionResponseSchema(seasonSchema);

export const fixtureResponseSchema = createResourceResponseSchema(fixtureSchema);

export const fixtureCollectionResponseSchema = createCollectionResponseSchema(fixtureSchema);

export const competitorResponseSchema = createResourceResponseSchema(competitorSchema);

export const competitorCollectionResponseSchema = createCollectionResponseSchema(competitorSchema);

export const participantResponseSchema = createResourceResponseSchema(participantSchema);

export const participantCollectionResponseSchema =
  createCollectionResponseSchema(participantSchema);

export type Competition = z.infer<typeof competitionSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type Fixture = z.infer<typeof fixtureSchema>;
export type Competitor = z.infer<typeof competitorSchema>;
export type Participant = z.infer<typeof participantSchema>;

export type CompetitionListQuery = z.infer<typeof competitionListQuerySchema>;
export type SeasonListQuery = z.infer<typeof seasonListQuerySchema>;
export type FixtureListQuery = z.infer<typeof fixtureListQuerySchema>;
export type CompetitorListQuery = z.infer<typeof competitorListQuerySchema>;
export type ParticipantListQuery = z.infer<typeof participantListQuerySchema>;
