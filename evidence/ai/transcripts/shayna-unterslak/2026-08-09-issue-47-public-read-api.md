# Issue #47 Readiness

**User:** Anonymous  
**Created:** 8/9/2026 14:16:44  
**Updated:** 8/9/2026 18:21:05  
**Exported:** 8/9/2026 18:22:19  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a786f9b-5e38-83ea-b55d-7ef6ece3988b](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6a786f9b-5e38-83ea-b55d-7ef6ece3988b)  

## Prompt:
8/9/2026, 4:57:19 PM

how long will 47 take now?

## Response:
8/9/2026, 4:57:24 PM

Now that **#58, #59 and #62 are done/merged**, #47 should be much faster than it looked originally.

I’d estimate **about 4–6 focused hours of actual work**, assuming we don’t uncover a schema problem.

A realistic breakdown:

| Part | Rough time |
|---|---:|
| Extend repositories for list/detail/filter/pagination | 1–1.5 h |
| Seasons + competitor/participant mapping | 30–45 min |
| Services/controllers/routes | 1–1.5 h |
| Cursor pagination + not-found/error handling | 30–45 min |
| API tests | 45–60 min |
| Update OpenAPI from `planned` → `implemented` + examples/docs | 30–45 min |
| AI evidence, checks, commits, PR | 20–30 min |

So compared with what you've already done:

```text
#58   ██████
#59   █████
#62   ████████
#47   ██████████
```

It is probably the **largest single issue you've personally done so far**, but most of the difficult architecture is already solved.

We already have:

```text
✅ API conventions
✅ stable string IDs
✅ response envelopes
✅ error shape
✅ cursor pagination convention
✅ OpenAPI structure
✅ versioning rules
✅ pg database layer
✅ safe query helper
✅ competition repository foundation
✅ fixture repository foundation
✅ participant repository foundation
✅ handwritten API architecture
```

So #47 is now mostly connecting the pieces:

```text
HTTP
 ↓
route
 ↓
controller
 ↓
service
 ↓
repository
 ↓
PostgreSQL
```

and adding the actual public behaviour.

The main work will be these **10 endpoints**:

```http
GET /api/v1/competitions
GET /api/v1/competitions/:competitionId

GET /api/v1/seasons
GET /api/v1/seasons/:seasonId

GET /api/v1/fixtures
GET /api/v1/fixtures/:fixtureId

GET /api/v1/competitors
GET /api/v1/competitors/:competitorId

GET /api/v1/participants
GET /api/v1/participants/:participantId
```

with:

```text
anonymous access
+ filtering
+ cursor pagination
+ deterministic ordering
+ 404s
+ API tests
+ OpenAPI updates
```

I would do #47 in **three commits**:

```text
1. feat(api): add public read repositories and services
2. feat(api): add anonymous public read routes and tests
3. docs(api): document public read endpoints
```

So yes: **once #59 merges, we can start #47 immediately, and if you have a solid block of time you could realistically finish the implementation in one sitting or over two shorter sessions.**

## Prompt:
8/9/2026, 5:12:52 PM

give me the step by step

## Response:
8/9/2026, 5:13:05 PM

> **Planning the implementation**
>
> I’m treating PR #59 as merged and will build PR #47 on top of `main`. I’ll first verify the repository state, then add contracts, service logic, tests, documentation, and validation steps without assuming unmerged local changes.
>
> **Planned the implementation**
>
> 
>
> **Defining stable identifiers**
>
> I’m choosing deterministic opaque season identifiers and keyset cursors. I’ll apply consistent ordering, filtering, and date handling across collections while exposing only public fields and keeping internal source references private.
>
> **Defined stable identifiers**
>
> 
>
> **Inspecting Repository Structure and Patterns**
>
>
> **Inspected repository structure, backend patterns, configuration, and API test integrations**
>
> 
>
> Worked for 4m 11s

Yes. **Once #59 is merged, start #47 from the new `main`.** This is the full path I would use, and it keeps everything consistent with #58, #59, #62, the current cricket schema, and the handwritten-API requirement.

1. **Start #47 properly.** In Gitea, assign #47 to yourself and move it to `In Progress`. Then:

```powershell
git switch main
git pull origin main
git status
git switch -c feat/47-public-read-api
git branch --show-current
```

You want:

```text
feat/47-public-read-api
```

The API resources map to your existing database like this:

```text
API Competition  → competition
API Season       → distinct competition + fixture.season
API Fixture      → fixture
API Competitor   → team
API Participant  → person
```

**No migration. No new participant/season tables. No Supabase Data API.**

---

2. **Add the backend dependency on your shared contracts.** Open:

```text
apps/backend/package.json
```

Under `dependencies`, add:

```json
"@sport-analytics/contracts": "0.1.0",
```

Then:

```powershell
npm.cmd install
```

For #47, the `package-lock.json` change is legitimate.

---

3. **Create the public-read shared contracts.** Create:

```text
packages/contracts/src/public-read.ts
```

Use:

```ts
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
    if (
      value.startDateFrom &&
      value.startDateTo &&
      value.startDateFrom > value.startDateTo
    ) {
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

export const competitionResponseSchema =
  createResourceResponseSchema(competitionSchema);

export const competitionCollectionResponseSchema =
  createCollectionResponseSchema(competitionSchema);

export const seasonResponseSchema =
  createResourceResponseSchema(seasonSchema);

export const seasonCollectionResponseSchema =
  createCollectionResponseSchema(seasonSchema);

export const fixtureResponseSchema =
  createResourceResponseSchema(fixtureSchema);

export const fixtureCollectionResponseSchema =
  createCollectionResponseSchema(fixtureSchema);

export const competitorResponseSchema =
  createResourceResponseSchema(competitorSchema);

export const competitorCollectionResponseSchema =
  createCollectionResponseSchema(competitorSchema);

export const participantResponseSchema =
  createResourceResponseSchema(participantSchema);

export const participantCollectionResponseSchema =
  createCollectionResponseSchema(participantSchema);

export type Competition = z.infer<typeof competitionSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type Fixture = z.infer<typeof fixtureSchema>;
export type Competitor = z.infer<typeof competitorSchema>;
export type Participant = z.infer<typeof participantSchema>;

export type CompetitionListQuery = z.infer<
  typeof competitionListQuerySchema
>;
export type SeasonListQuery = z.infer<typeof seasonListQuerySchema>;
export type FixtureListQuery = z.infer<typeof fixtureListQuerySchema>;
export type CompetitorListQuery = z.infer<
  typeof competitorListQuerySchema
>;
export type ParticipantListQuery = z.infer<
  typeof participantListQuerySchema
>;
```

Then open:

```text
packages/contracts/src/index.ts
```

and add:

```ts
export * from './public-read';
```

Do not remove the existing `api` or `health` exports.

---

4. **Add contract tests.** Create:

```text
packages/contracts/src/tests/public-read.test.ts
```

Use:

```ts
import { describe, expect, test } from 'vitest';

import {
  fixtureListQuerySchema,
  participantListQuerySchema,
  seasonSchema,
} from '../public-read';

describe('public read contracts', () => {
  test('validates a season with a stable opaque identifier', () => {
    expect(
      seasonSchema.safeParse({
        seasonId: 'season_opaque-value',
        competitionId: '12',
        label: '2025/26',
      }).success,
    ).toBe(true);
  });

  test('applies pagination defaults', () => {
    expect(participantListQuerySchema.parse({})).toEqual({
      limit: 50,
    });
  });

  test('accepts fixture filters', () => {
    expect(
      fixtureListQuerySchema.parse({
        competitionId: '1',
        competitorId: '2',
        gender: 'female',
        startDateFrom: '2026-01-01',
        startDateTo: '2026-08-09',
        limit: '25',
      }),
    ).toEqual({
      competitionId: '1',
      competitorId: '2',
      gender: 'female',
      startDateFrom: '2026-01-01',
      startDateTo: '2026-08-09',
      limit: 25,
    });
  });

  test('rejects an invalid fixture date range', () => {
    expect(
      fixtureListQuerySchema.safeParse({
        startDateFrom: '2026-08-09',
        startDateTo: '2026-01-01',
      }).success,
    ).toBe(false);
  });
});
```

Run:

```powershell
npx.cmd prettier --write packages/contracts/src/public-read.ts packages/contracts/src/tests/public-read.test.ts packages/contracts/src/index.ts
npm.cmd run test:contracts
npm.cmd run typecheck --workspace=@sport-analytics/contracts
npm.cmd run lint --workspace=@sport-analytics/contracts
npm.cmd run build --workspace=@sport-analytics/contracts
```

**Stop here if anything fails.**

---

5. **Create the public-read helper folder.**

```text
apps/backend/src/modules/public-read/
```

Create:

```text
apps/backend/src/modules/public-read/opaque-value.ts
```

```ts
import { z } from 'zod';

export function encodeOpaqueValue(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString(
    'base64url',
  );
}

export function decodeOpaqueValue<T>(
  value: string,
  schema: z.ZodType<T>,
): T | null {
  try {
    const decoded = Buffer.from(value, 'base64url').toString(
      'utf8',
    );

    const parsed: unknown = JSON.parse(decoded);
    const result = schema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
```

Create:

```text
apps/backend/src/modules/public-read/season-id.ts
```

```ts
import { z } from 'zod';

import {
  decodeOpaqueValue,
  encodeOpaqueValue,
} from './opaque-value';

const seasonIdentitySchema = z.object({
  competitionId: z.string().min(1),
  label: z.string().min(1),
});

export interface SeasonIdentity {
  competitionId: string;
  label: string;
}

const SEASON_PREFIX = 'season_';

export function createSeasonId(
  identity: SeasonIdentity,
): string {
  return `${SEASON_PREFIX}${encodeOpaqueValue(identity)}`;
}

export function parseSeasonId(
  seasonId: string,
): SeasonIdentity | null {
  if (!seasonId.startsWith(SEASON_PREFIX)) {
    return null;
  }

  return decodeOpaqueValue(
    seasonId.slice(SEASON_PREFIX.length),
    seasonIdentitySchema,
  );
}
```

This gives us a stable season resource without inventing a new DB table.

---

6. **Add cursor support.** Create:

```text
apps/backend/src/modules/public-read/cursor.ts
```

```ts
import { z } from 'zod';

import {
  decodeOpaqueValue,
  encodeOpaqueValue,
} from './opaque-value';

export class InvalidCursorError extends Error {
  constructor() {
    super('The pagination cursor is invalid.');
    this.name = 'InvalidCursorError';
  }
}

export function createCursor(value: unknown): string {
  return encodeOpaqueValue(value);
}

export function readCursor<T>(
  value: string | undefined,
  schema: z.ZodType<T>,
): T | undefined {
  if (!value) {
    return undefined;
  }

  const decoded = decodeOpaqueValue(value, schema);

  if (!decoded) {
    throw new InvalidCursorError();
  }

  return decoded;
}
```

---

7. **Extend the competition repository from #62.** Open:

```text
apps/backend/src/modules/competitions/competition.repository.ts
```

Keep `findCompetitionById`, but replace/extend the list functionality with a paginated version:

```ts
import {
  executeQuery,
  getDatabasePool,
  type QueryExecutor,
} from '../../database';

export interface CompetitionRecord {
  competitionId: string;
  name: string;
}

export interface CompetitionListOptions {
  limit: number;
  name?: string;
  after?: {
    name: string;
    competitionId: string;
  };
}

export interface CompetitionPage {
  records: CompetitionRecord[];
  hasMore: boolean;
}

export async function listCompetitions(
  options: CompetitionListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitionPage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.name) {
    values.push(`%${options.name}%`);
    conditions.push(`name ILIKE $${values.length}`);
  }

  if (options.after) {
    values.push(options.after.name);
    const nameParameter = values.length;

    values.push(options.after.competitionId);
    const idParameter = values.length;

    conditions.push(
      `(name, competition_id) > ($${nameParameter}::text, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  const result = await executeQuery<CompetitionRecord>(
    executor,
    `
      SELECT
        competition_id::text AS "competitionId",
        name
      FROM competition
      ${where}
      ORDER BY name ASC, competition_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findCompetitionById(
  competitionId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitionRecord | null> {
  const result = await executeQuery<CompetitionRecord>(
    executor,
    `
      SELECT
        competition_id::text AS "competitionId",
        name
      FROM competition
      WHERE competition_id = $1
    `,
    [competitionId],
  );

  return result.rows[0] ?? null;
}
```

Notice: fixed deterministic ordering:

```text
name ASC
competition_id ASC
```

The ID is the tie-breaker.

---

8. **Add the season repository.** Create:

```text
apps/backend/src/modules/seasons/season.repository.ts
```

```ts
import {
  executeQuery,
  getDatabasePool,
  type QueryExecutor,
} from '../../database';

export interface SeasonRecord {
  competitionId: string;
  label: string;
}

export interface SeasonListOptions {
  limit: number;
  competitionId?: string;
  after?: {
    competitionId: string;
    label: string;
  };
}

export async function listSeasons(
  options: SeasonListOptions,
  executor: QueryExecutor = getDatabasePool(),
) {
  const innerConditions = ['competition_id IS NOT NULL'];
  const outerConditions: string[] = [];
  const values: unknown[] = [];

  if (options.competitionId) {
    values.push(options.competitionId);
    innerConditions.push(
      `competition_id = $${values.length}::bigint`,
    );
  }

  if (options.after) {
    values.push(options.after.competitionId);
    const competitionParameter = values.length;

    values.push(options.after.label);
    const seasonParameter = values.length;

    outerConditions.push(
      `(competition_id, season) > ($${competitionParameter}::bigint, $${seasonParameter}::text)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const outerWhere =
    outerConditions.length > 0
      ? `WHERE ${outerConditions.join(' AND ')}`
      : '';

  const result = await executeQuery<SeasonRecord>(
    executor,
    `
      WITH seasons AS (
        SELECT DISTINCT competition_id, season
        FROM fixture
        WHERE ${innerConditions.join(' AND ')}
      )
      SELECT
        competition_id::text AS "competitionId",
        season AS label
      FROM seasons
      ${outerWhere}
      ORDER BY competition_id ASC, season ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findSeason(
  competitionId: string,
  label: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<SeasonRecord | null> {
  const result = await executeQuery<SeasonRecord>(
    executor,
    `
      SELECT
        competition_id::text AS "competitionId",
        season AS label
      FROM fixture
      WHERE competition_id = $1
        AND season = $2
      LIMIT 1
    `,
    [competitionId, label],
  );

  return result.rows[0] ?? null;
}
```

---

9. **Extend the fixture repository.** Keep your existing `findFixtureById()`, but add a paginated `listFixtures()`.

Use deterministic ordering:

```text
start_date ASC
fixture_id ASC
```

Support:

```text
competitionId
season
competitorId
gender
startDateFrom
startDateTo
cursor
limit
```

The key SQL filters should be:

```sql
f.competition_id = $n
f.season = $n
f.gender = $n
f.start_date >= $n
f.start_date <= $n
```

Competitor filtering should use the existing relationship:

```sql
EXISTS (
  SELECT 1
  FROM fixture_team ft
  WHERE ft.fixture_id = f.fixture_id
    AND ft.team_id = $n
)
```

And cursor pagination:

```sql
(f.start_date, f.fixture_id) >
($n::date, $m::bigint)
```

Do **not** use `OFFSET`.

---

10. **Add the competitor repository.** Create:

```text
apps/backend/src/modules/competitors/competitor.repository.ts
```

The public competitor is the existing `team`.

Expose only:

```text
competitorId
name
```

Implement:

```ts
findCompetitorById()
listCompetitors()
```

Filtering by competition/season should use:

```text
team
 ↓
fixture_team
 ↓
fixture
```

Ordering:

```text
team.name ASC
team.team_id ASC
```

Again, fetch `limit + 1` and return `hasMore`.

---

11. **Extend the participant repository.** Your public participant is `person`.

Keep any #62 fixture-specific repository method already there, but add:

```ts
findParticipantById()
listParticipants()
```

Expose only:

```text
participantId
displayName
```

Do **not** expose:

```text
source_ref
aliases
auth data
submission data
```

Filters:

```text
fixtureId
competitorId
name
```

Use the existing:

```text
person
 ↓
fixture_squad
 ↓
team / fixture
```

Ordering:

```text
display_name ASC
person_id ASC
```

---

12. **Now create the service layer.** Create:

```text
apps/backend/src/modules/public-read/public-read.service.ts
```

This service should be the only place that:

- decodes cursors;
- creates `nextCursor`;
- creates/parses `seasonId`;
- checks conflicting filters;
- converts repository records into API resource shapes.

The interface should be:

```ts
import type {
  Competition,
  CompetitionListQuery,
  Competitor,
  CompetitorListQuery,
  Fixture,
  FixtureListQuery,
  Participant,
  ParticipantListQuery,
  Season,
  SeasonListQuery,
} from '@sport-analytics/contracts';

export interface PublicReadService {
  listCompetitions(
    query: CompetitionListQuery,
  ): Promise<{
    data: Competition[];
    pagination: { nextCursor: string | null };
  }>;

  getCompetition(
    competitionId: string,
  ): Promise<Competition | null>;

  listSeasons(
    query: SeasonListQuery,
  ): Promise<{
    data: Season[];
    pagination: { nextCursor: string | null };
  }>;

  getSeason(seasonId: string): Promise<Season | null>;

  listFixtures(
    query: FixtureListQuery,
  ): Promise<{
    data: Fixture[];
    pagination: { nextCursor: string | null };
  }>;

  getFixture(fixtureId: string): Promise<Fixture | null>;

  listCompetitors(
    query: CompetitorListQuery,
  ): Promise<{
    data: Competitor[];
    pagination: { nextCursor: string | null };
  }>;

  getCompetitor(
    competitorId: string,
  ): Promise<Competitor | null>;

  listParticipants(
    query: ParticipantListQuery,
  ): Promise<{
    data: Participant[];
    pagination: { nextCursor: string | null };
  }>;

  getParticipant(
    participantId: string,
  ): Promise<Participant | null>;
}
```

The service maps:

```text
fixture.competitionId + fixture.season
        ↓
createSeasonId(...)
        ↓
fixture.seasonId
```

If `competitionId` is null:

```text
seasonId = null
```

Also, if somebody supplies both:

```text
competitionId=10
seasonId=<season belonging to competition 20>
```

return a controlled `400`, not contradictory results.

---

13. **Add a small public-read input error.** Create:

```text
apps/backend/src/modules/public-read/public-read.errors.ts
```

```ts
export class PublicReadInputError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_CURSOR'
      | 'INVALID_FILTER',
    message: string,
  ) {
    super(message);
    this.name = 'PublicReadInputError';
  }
}
```

Your `InvalidCursorError` can either extend this, or the service can translate it into this error.

---

14. **Before routes, compile the database/service layer.**

```powershell
npx.cmd prettier --write apps/backend/src/modules
npm.cmd run build --workspace=@sport-analytics/contracts
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run build --workspace=@sport-analytics/backend
```

Do **not** continue if these fail.

This is your natural **Commit 1** point:

```text
feat(api): add public read repositories and services

Refs #47

Assisted-by: ChatGPT-Web[GPT-5.6 Sol]
```

---

15. **Create the controller.** Create:

```text
apps/backend/src/modules/public-read/public-read.controller.ts
```

Its responsibilities should be only:

```text
validate query
↓
call service
↓
return response
```

For bad query parameters return:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request is invalid.",
    "details": []
  }
}
```

For invalid cursor/filter:

```json
{
  "error": {
    "code": "INVALID_CURSOR",
    "message": "The pagination cursor is invalid."
  }
}
```

For unknown IDs:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Competition not found."
  }
}
```

Do not expose DB errors.

---

16. **Create the anonymous routes.** Create:

```text
apps/backend/src/modules/public-read/public-read.routes.ts
```

Register:

```ts
router.get('/competitions', ...);
router.get('/competitions/:competitionId', ...);

router.get('/seasons', ...);
router.get('/seasons/:seasonId', ...);

router.get('/fixtures', ...);
router.get('/fixtures/:fixtureId', ...);

router.get('/competitors', ...);
router.get('/competitors/:competitorId', ...);

router.get('/participants', ...);
router.get('/participants/:participantId', ...);
```

**Do not add:**

```ts
requireAuthentication(...)
```

These are deliberately public.

---

17. **Mount the router in `app.ts`.** Update:

```text
apps/backend/src/app.ts
```

Add `publicReadService` as an injectable dependency so API tests don't require PostgreSQL:

```ts
export interface AppDependencies {
  environment?: Environment;
  verifyAccessToken?: VerifyAccessToken;
  publicReadService?: PublicReadService;
}
```

Then create the default service if one isn't supplied and mount:

```ts
app.use(
  '/api/v1',
  createPublicReadRouter(publicReadService),
);
```

This must be before:

```ts
app.use(notFoundHandler);
app.use(errorHandler);
```

---

18. **Update the test app for service injection.** In:

```text
apps/backend/tests/test-app.ts
```

allow:

```ts
createTestApp(
  verifyAccessToken,
  publicReadService,
)
```

Existing auth/health tests must continue working unchanged.

---

19. **Create API tests.** Create:

```text
apps/backend/tests/api/public-read.test.ts
```

You need coverage for all five resources.

At minimum test:

```text
GET /competitions                     200
GET /competitions/:id                 200

GET /seasons                          200
GET /seasons/:id                      200

GET /fixtures                         200
GET /fixtures/:id                     200

GET /competitors                      200
GET /competitors/:id                  200

GET /participants                     200
GET /participants/:id                200
```

Then specifically test:

**Anonymous access**

No `Authorization` header:

```http
GET /api/v1/competitions
```

must still return `200`.

Verify the Supabase token verifier was **not called**.

**Filtering**

Example:

```http
GET /api/v1/fixtures?competitionId=1&competitorId=2&gender=female&startDateFrom=2026-01-01
```

and verify the parsed query reaches the mocked service correctly.

**Pagination**

Mock:

```json
{
  "data": [],
  "pagination": {
    "nextCursor": "opaque-next-page"
  }
}
```

and verify the HTTP response preserves it.

Then send:

```http
?cursor=opaque-next-page
```

and verify the service receives the cursor.

**Not found**

Mock:

```text
getCompetition() → null
```

then:

```http
GET /api/v1/competitions/999999
```

must return:

```text
404
```

with:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Competition not found."
  }
}
```

**Invalid query**

Example:

```http
GET /api/v1/fixtures?limit=999
```

must return `400`.

**Bad date range**

```http
GET /api/v1/fixtures?startDateFrom=2026-08-09&startDateTo=2026-01-01
```

must return `400`.

---

20. **Run all public API verification.**

```powershell
npm.cmd run build --workspace=@sport-analytics/contracts
npm.cmd run test:contracts
npm.cmd run test:api
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run build --workspace=@sport-analytics/backend
```

If these pass, this is your natural **Commit 2**:

```text
feat(api): add anonymous public read endpoints

Refs #47

Assisted-by: ChatGPT-Web[GPT-5.6 Sol]
```

---

21. **Update #59's OpenAPI specification.** Open:

```text
docs/api/openapi.yaml
```

For these ten operations:

```text
competitions list/detail
seasons list/detail
fixtures list/detail
competitors list/detail
participants list/detail
```

change:

```yaml
x-implementation-status: planned
```

to:

```yaml
x-implementation-status: implemented
```

Do **not** change submission to implemented.

Then ensure the documented filters exactly match what you implemented.

Do not document a filter that your backend doesn't support.

---

22. **Add example requests/responses.** Create:

```text
docs/api/public-read.md
```

Document:

```text
Anonymous access
Resource IDs
Competition endpoints
Season endpoints
Fixture endpoints
Competitor endpoints
Participant endpoints
Filters
Cursor pagination
Deterministic ordering
404 behaviour
```

Include examples such as:

```http
GET /api/v1/fixtures?competitionId=12&limit=25
```

and:

```json
{
  "data": [
    {
      "fixtureId": "481",
      "competitionId": "12",
      "seasonId": "season_...",
      "season": "2026",
      "matchType": "T20",
      "teamType": "international",
      "gender": "male",
      "ballsPerOver": 6,
      "scheduledOvers": 20,
      "startDate": "2026-08-09",
      "endDate": "2026-08-09"
    }
  ],
  "pagination": {
    "nextCursor": "..."
  }
}
```

Explicitly say:

> Cursors and resource identifiers are opaque. Consumers must not derive meaning from their representation.

Also document the fixed deterministic ordering for each collection.

---

23. **Update the API overview and MkDocs navigation.**

In:

```text
docs/api/overview.md
```

add the public-read endpoints to the current endpoints section.

In:

```text
mkdocs.yml
```

your API area should become roughly:

```yaml
- API:
    - Overview: api/overview.md
    - Shared Contracts: api/contracts.md
    - Public Read API: api/public-read.md
    - OpenAPI Specification: api/openapi.md
    - Versioning and Deprecation: api/versioning.md
```

Preserve anything else already there.

Add/update the required AI declarations on AI-assisted docs.

---

24. **Validate OpenAPI and documentation.**

```powershell
npm.cmd run openapi:lint
python -m mkdocs build --strict
```

Then remove generated site files:

```powershell
git restore --source=HEAD --staged --worktree -- site
git clean -fd -- site
```

---

25. **Run the final #47 checks.**

```powershell
npx.cmd prettier --check packages/contracts/src apps/backend/src apps/backend/tests/api docs/api mkdocs.yml

npm.cmd run test:contracts
npm.cmd run test:unit
npm.cmd run test:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run openapi:lint
npm.cmd run check

git diff --check
git status --short
```

Because your Gitea runner still isn't available, database/CI verification remains subject to the same documented infrastructure limitation from #62. Do **not** claim CI passed.

---

26. **Update AI evidence.**

Save this transcript under:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-09-issue-47-public-read-api.pdf
```

Add a #47 row to:

```text
evidence/ai/registers/shayna-unterslak.csv
```

Don't update the README again if `ChatGPT-Web[GPT-5.6 Sol]` is already declared.

---

27. **Make the documentation/evidence commit.**

```text
docs(api): document public read endpoints

Refs #47

Assisted-by: ChatGPT-Web[GPT-5.6 Sol]
```

That gives you the intended three-commit history:

```text
feat(api): add public read repositories and services
feat(api): add anonymous public read endpoints
docs(api): document public read endpoints
```

---

28. **Push and open the PR.**

```powershell
git push -u origin feat/47-public-read-api
```

PR title:

```text
feat(api): implement public sport data read endpoints
```

The PR should say:

```text
Closes #47
```

and explicitly confirm:

```text
✅ anonymous
✅ handwritten Express API
✅ no Supabase-generated Data API
✅ stable IDs
✅ cursor pagination
✅ deterministic ordering
✅ filters
✅ 404s
✅ API tests
✅ OpenAPI updated
✅ docs updated
```

Then move #47 to `In Review`.

---

The important thing is **don't try to implement all 10 routes immediately**. Do it in these three checkpoints:

```text
A. Contracts + repositories + service
               ↓ PASS CHECKS
B. Controllers + routes + API tests
               ↓ PASS CHECKS
C. OpenAPI + docs + evidence
               ↓
PR
```

That will make #47 much easier to debug.

**Start with Steps 1–4 only.** Once the contracts tests pass, move to the repositories rather than changing 20 files at once.

## Prompt:
8/9/2026, 5:48:30 PM

give again from step 9, u stoped giving what to do

## Response:
8/9/2026, 5:48:46 PM

> **Clarifying implementation steps**
>
> I’m picking up at step 9 and will provide concrete, copy-ready changes in sequence: fixtures, repositories, service logic, error handling, routes, tests, and documentation, while aligning with the merged branch structure.
>
> **Clarified implementation steps**
>
> 
>
> **Inspecting Repository Files for Exact Implementation Steps**
>
>
> **Continuing implementation**
>
> I’m continuing from step 9 with the concrete sequence: fixture fixtures and repositories first, then service methods, error handling, routes, integration tests, and final documentation updates.
>
> **Continued implementation work**
>
> 
>
> **Inspected repository backend files, routes, error handling, and test conventions**
>
> 
>
> Worked for 2m 25s

Yes — from **Step 9 onward I’ll give you the actual files and code**, not just tell you what needs implementing.

I’m assuming Steps 1–8 are done and passing, so you currently have:

```text
public-read contracts ✅
opaque-value.ts ✅
season-id.ts ✅
cursor.ts ✅
competition repository updated ✅
season repository added ✅
```

## 9. Replace `fixture.repository.ts`

Open:

```text
apps/backend/src/modules/fixtures/fixture.repository.ts
```

Replace the whole file with:

```ts
import {
  executeQuery,
  getDatabasePool,
  type QueryExecutor,
} from '../../database';

export interface FixtureRecord {
  fixtureId: string;
  competitionId: string | null;
  season: string;
  matchType: string;
  teamType: string;
  gender: string;
  ballsPerOver: number;
  scheduledOvers: number | null;
  startDate: string;
  endDate: string;
}

export interface FixtureListOptions {
  limit: number;
  competitionId?: string;
  season?: string;
  competitorId?: string;
  gender?: string;
  startDateFrom?: string;
  startDateTo?: string;
  after?: {
    startDate: string;
    fixtureId: string;
  };
}

export interface FixturePage {
  records: FixtureRecord[];
  hasMore: boolean;
}

export async function listFixtures(
  options: FixtureListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixturePage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.competitionId) {
    values.push(options.competitionId);
    conditions.push(
      `f.competition_id = $${values.length}::bigint`,
    );
  }

  if (options.season) {
    values.push(options.season);
    conditions.push(`f.season = $${values.length}::text`);
  }

  if (options.competitorId) {
    values.push(options.competitorId);
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM fixture_team ft
        WHERE ft.fixture_id = f.fixture_id
          AND ft.team_id = $${values.length}::bigint
      )
    `);
  }

  if (options.gender) {
    values.push(options.gender);
    conditions.push(`f.gender = $${values.length}::text`);
  }

  if (options.startDateFrom) {
    values.push(options.startDateFrom);
    conditions.push(
      `f.start_date >= $${values.length}::date`,
    );
  }

  if (options.startDateTo) {
    values.push(options.startDateTo);
    conditions.push(
      `f.start_date <= $${values.length}::date`,
    );
  }

  if (options.after) {
    values.push(options.after.startDate);
    const dateParameter = values.length;

    values.push(options.after.fixtureId);
    const idParameter = values.length;

    conditions.push(
      `(f.start_date, f.fixture_id) > ($${dateParameter}::date, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  const result = await executeQuery<FixtureRecord>(
    executor,
    `
      SELECT
        f.fixture_id::text AS "fixtureId",
        f.competition_id::text AS "competitionId",
        f.season,
        f.match_type AS "matchType",
        f.team_type AS "teamType",
        f.gender,
        f.balls_per_over AS "ballsPerOver",
        f.scheduled_overs AS "scheduledOvers",
        f.start_date::text AS "startDate",
        f.end_date::text AS "endDate"
      FROM fixture f
      ${where}
      ORDER BY f.start_date ASC, f.fixture_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findFixtureById(
  fixtureId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureRecord | null> {
  const result = await executeQuery<FixtureRecord>(
    executor,
    `
      SELECT
        fixture_id::text AS "fixtureId",
        competition_id::text AS "competitionId",
        season,
        match_type AS "matchType",
        team_type AS "teamType",
        gender,
        balls_per_over AS "ballsPerOver",
        scheduled_overs AS "scheduledOvers",
        start_date::text AS "startDate",
        end_date::text AS "endDate"
      FROM fixture
      WHERE fixture_id = $1::bigint
    `,
    [fixtureId],
  );

  return result.rows[0] ?? null;
}
```

This gives fixtures:

```text
filters
+ deterministic start_date / fixture_id ordering
+ cursor pagination
+ limit + 1 page detection
```

No `OFFSET`.

---

## 10. Create the competitor repository

Create folder:

```text
apps/backend/src/modules/competitors/
```

Create:

```text
apps/backend/src/modules/competitors/competitor.repository.ts
```

Paste:

```ts
import {
  executeQuery,
  getDatabasePool,
  type QueryExecutor,
} from '../../database';

export interface CompetitorRecord {
  competitorId: string;
  name: string;
}

export interface CompetitorListOptions {
  limit: number;
  competitionId?: string;
  season?: string;
  name?: string;
  after?: {
    name: string;
    competitorId: string;
  };
}

export interface CompetitorPage {
  records: CompetitorRecord[];
  hasMore: boolean;
}

export async function listCompetitors(
  options: CompetitorListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitorPage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.name) {
    values.push(`%${options.name}%`);
    conditions.push(`t.name ILIKE $${values.length}`);
  }

  if (options.competitionId || options.season) {
    const fixtureConditions = [
      'ft.team_id = t.team_id',
    ];

    if (options.competitionId) {
      values.push(options.competitionId);
      fixtureConditions.push(
        `f.competition_id = $${values.length}::bigint`,
      );
    }

    if (options.season) {
      values.push(options.season);
      fixtureConditions.push(
        `f.season = $${values.length}::text`,
      );
    }

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM fixture_team ft
        INNER JOIN fixture f
          ON f.fixture_id = ft.fixture_id
        WHERE ${fixtureConditions.join(' AND ')}
      )
    `);
  }

  if (options.after) {
    values.push(options.after.name);
    const nameParameter = values.length;

    values.push(options.after.competitorId);
    const idParameter = values.length;

    conditions.push(
      `(t.name, t.team_id) > ($${nameParameter}::text, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  const result = await executeQuery<CompetitorRecord>(
    executor,
    `
      SELECT
        t.team_id::text AS "competitorId",
        t.name
      FROM team t
      ${where}
      ORDER BY t.name ASC, t.team_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findCompetitorById(
  competitorId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitorRecord | null> {
  const result = await executeQuery<CompetitorRecord>(
    executor,
    `
      SELECT
        team_id::text AS "competitorId",
        name
      FROM team
      WHERE team_id = $1::bigint
    `,
    [competitorId],
  );

  return result.rows[0] ?? null;
}
```

Again:

```text
API competitor = cricket team
```

We are **not inventing another competitor table**.

---

## 11. Replace/extend participant repository

Open:

```text
apps/backend/src/modules/participants/participant.repository.ts
```

Replace it with:

```ts
import {
  executeQuery,
  getDatabasePool,
  type QueryExecutor,
} from '../../database';

export interface ParticipantRecord {
  participantId: string;
  displayName: string;
}

export interface FixtureParticipantRecord {
  participantId: string;
  displayName: string;
  teamId: string;
  teamName: string;
  role: string | null;
}

export interface ParticipantListOptions {
  limit: number;
  fixtureId?: string;
  competitorId?: string;
  name?: string;
  after?: {
    displayName: string;
    participantId: string;
  };
}

export interface ParticipantPage {
  records: ParticipantRecord[];
  hasMore: boolean;
}

export async function listParticipants(
  options: ParticipantListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ParticipantPage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.name) {
    values.push(`%${options.name}%`);
    conditions.push(
      `p.display_name ILIKE $${values.length}`,
    );
  }

  if (options.fixtureId || options.competitorId) {
    const squadConditions = [
      'fs.person_id = p.person_id',
    ];

    if (options.fixtureId) {
      values.push(options.fixtureId);
      squadConditions.push(
        `fs.fixture_id = $${values.length}::bigint`,
      );
    }

    if (options.competitorId) {
      values.push(options.competitorId);
      squadConditions.push(
        `fs.team_id = $${values.length}::bigint`,
      );
    }

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM fixture_squad fs
        WHERE ${squadConditions.join(' AND ')}
      )
    `);
  }

  if (options.after) {
    values.push(options.after.displayName);
    const nameParameter = values.length;

    values.push(options.after.participantId);
    const idParameter = values.length;

    conditions.push(
      `(p.display_name, p.person_id) > ($${nameParameter}::text, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  const result = await executeQuery<ParticipantRecord>(
    executor,
    `
      SELECT
        p.person_id::text AS "participantId",
        p.display_name AS "displayName"
      FROM person p
      ${where}
      ORDER BY p.display_name ASC, p.person_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findParticipantById(
  participantId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ParticipantRecord | null> {
  const result = await executeQuery<ParticipantRecord>(
    executor,
    `
      SELECT
        person_id::text AS "participantId",
        display_name AS "displayName"
      FROM person
      WHERE person_id = $1::bigint
    `,
    [participantId],
  );

  return result.rows[0] ?? null;
}

export async function listFixtureParticipants(
  fixtureId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureParticipantRecord[]> {
  const result = await executeQuery<FixtureParticipantRecord>(
    executor,
    `
      SELECT
        p.person_id::text AS "participantId",
        p.display_name AS "displayName",
        t.team_id::text AS "teamId",
        t.name AS "teamName",
        fs.role
      FROM fixture_squad fs
      INNER JOIN person p
        ON p.person_id = fs.person_id
      INNER JOIN team t
        ON t.team_id = fs.team_id
      WHERE fs.fixture_id = $1::bigint
      ORDER BY
        t.name ASC,
        p.display_name ASC,
        p.person_id ASC
    `,
    [fixtureId],
  );

  return result.rows;
}
```

We've preserved the #62 `listFixtureParticipants()` method rather than deleting functionality already merged.

---

## 12. Add the public-read service error

Create:

```text
apps/backend/src/modules/public-read/public-read.errors.ts
```

Paste:

```ts
export type PublicReadInputErrorCode =
  | 'INVALID_CURSOR'
  | 'INVALID_FILTER';

export class PublicReadInputError extends Error {
  constructor(
    public readonly code: PublicReadInputErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PublicReadInputError';
  }
}
```

---

## 13. Create the complete public-read service

Create:

```text
apps/backend/src/modules/public-read/public-read.service.ts
```

Paste:

```ts
import type {
  Competition,
  CompetitionListQuery,
  Competitor,
  CompetitorListQuery,
  Fixture,
  FixtureListQuery,
  Participant,
  ParticipantListQuery,
  Season,
  SeasonListQuery,
} from '@sport-analytics/contracts';
import { z } from 'zod';

import {
  findCompetitionById,
  listCompetitions as listCompetitionRecords,
} from '../competitions/competition.repository';
import {
  findCompetitorById,
  listCompetitors as listCompetitorRecords,
} from '../competitors/competitor.repository';
import {
  findFixtureById,
  listFixtures as listFixtureRecords,
  type FixtureRecord,
} from '../fixtures/fixture.repository';
import {
  findParticipantById,
  listParticipants as listParticipantRecords,
} from '../participants/participant.repository';
import {
  findSeason,
  listSeasons as listSeasonRecords,
} from '../seasons/season.repository';
import {
  createCursor,
  InvalidCursorError,
  readCursor,
} from './cursor';
import { PublicReadInputError } from './public-read.errors';
import {
  createSeasonId,
  parseSeasonId,
} from './season-id';

const databaseIdSchema = z.string().regex(/^\d+$/);

const competitionCursorSchema = z.object({
  name: z.string(),
  competitionId: databaseIdSchema,
});

const seasonCursorSchema = z.object({
  competitionId: databaseIdSchema,
  label: z.string(),
});

const fixtureCursorSchema = z.object({
  startDate: z.string().date(),
  fixtureId: databaseIdSchema,
});

const competitorCursorSchema = z.object({
  name: z.string(),
  competitorId: databaseIdSchema,
});

const participantCursorSchema = z.object({
  displayName: z.string(),
  participantId: databaseIdSchema,
});

export interface PublicReadService {
  listCompetitions(
    query: CompetitionListQuery,
  ): Promise<{
    data: Competition[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getCompetition(
    competitionId: string,
  ): Promise<Competition | null>;

  listSeasons(
    query: SeasonListQuery,
  ): Promise<{
    data: Season[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getSeason(seasonId: string): Promise<Season | null>;

  listFixtures(
    query: FixtureListQuery,
  ): Promise<{
    data: Fixture[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getFixture(fixtureId: string): Promise<Fixture | null>;

  listCompetitors(
    query: CompetitorListQuery,
  ): Promise<{
    data: Competitor[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getCompetitor(
    competitorId: string,
  ): Promise<Competitor | null>;

  listParticipants(
    query: ParticipantListQuery,
  ): Promise<{
    data: Participant[];
    pagination: {
      nextCursor: string | null;
    };
  }>;

  getParticipant(
    participantId: string,
  ): Promise<Participant | null>;
}

function isDatabaseId(value: string): boolean {
  return databaseIdSchema.safeParse(value).success;
}

function assertDatabaseFilter(
  value: string | undefined,
  field: string,
): void {
  if (value && !isDatabaseId(value)) {
    throw new PublicReadInputError(
      'INVALID_FILTER',
      `${field} is invalid.`,
    );
  }
}

function decodeCursor<T>(
  cursor: string | undefined,
  schema: z.ZodType<T>,
): T | undefined {
  try {
    return readCursor(cursor, schema);
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      throw new PublicReadInputError(
        'INVALID_CURSOR',
        'The pagination cursor is invalid.',
      );
    }

    throw error;
  }
}

function createNextCursor<T>(
  hasMore: boolean,
  records: T[],
  toCursor: (record: T) => unknown,
): string | null {
  if (!hasMore || records.length === 0) {
    return null;
  }

  const finalRecord = records[records.length - 1];

  return createCursor(toCursor(finalRecord));
}

function mapFixture(record: FixtureRecord): Fixture {
  return {
    fixtureId: record.fixtureId,
    competitionId: record.competitionId,
    seasonId: record.competitionId
      ? createSeasonId({
          competitionId: record.competitionId,
          label: record.season,
        })
      : null,
    season: record.season,
    matchType: record.matchType,
    teamType: record.teamType,
    gender: record.gender,
    ballsPerOver: record.ballsPerOver,
    scheduledOvers: record.scheduledOvers,
    startDate: record.startDate,
    endDate: record.endDate,
  };
}

function resolveSeasonFilter(
  seasonId: string | undefined,
  competitionId: string | undefined,
): {
  competitionId: string | undefined;
  season: string | undefined;
} {
  if (!seasonId) {
    return {
      competitionId,
      season: undefined,
    };
  }

  const identity = parseSeasonId(seasonId);

  if (
    !identity ||
    !isDatabaseId(identity.competitionId)
  ) {
    throw new PublicReadInputError(
      'INVALID_FILTER',
      'seasonId is invalid.',
    );
  }

  if (
    competitionId &&
    competitionId !== identity.competitionId
  ) {
    throw new PublicReadInputError(
      'INVALID_FILTER',
      'competitionId does not match seasonId.',
    );
  }

  return {
    competitionId: identity.competitionId,
    season: identity.label,
  };
}

export function createPublicReadService(): PublicReadService {
  return {
    async listCompetitions(query) {
      const after = decodeCursor(
        query.cursor,
        competitionCursorSchema,
      );

      const page = await listCompetitionRecords({
        limit: query.limit,
        name: query.name,
        after,
      });

      return {
        data: page.records,
        pagination: {
          nextCursor: createNextCursor(
            page.hasMore,
            page.records,
            (record) => ({
              name: record.name,
              competitionId: record.competitionId,
            }),
          ),
        },
      };
    },

    async getCompetition(competitionId) {
      if (!isDatabaseId(competitionId)) {
        return null;
      }

      return findCompetitionById(competitionId);
    },

    async listSeasons(query) {
      assertDatabaseFilter(
        query.competitionId,
        'competitionId',
      );

      const after = decodeCursor(
        query.cursor,
        seasonCursorSchema,
      );

      const page = await listSeasonRecords({
        limit: query.limit,
        competitionId: query.competitionId,
        after,
      });

      const data: Season[] = page.records.map(
        (record) => ({
          seasonId: createSeasonId({
            competitionId: record.competitionId,
            label: record.label,
          }),
          competitionId: record.competitionId,
          label: record.label,
        }),
      );

      return {
        data,
        pagination: {
          nextCursor: createNextCursor(
            page.hasMore,
            page.records,
            (record) => ({
              competitionId: record.competitionId,
              label: record.label,
            }),
          ),
        },
      };
    },

    async getSeason(seasonId) {
      const identity = parseSeasonId(seasonId);

      if (
        !identity ||
        !isDatabaseId(identity.competitionId)
      ) {
        return null;
      }

      const record = await findSeason(
        identity.competitionId,
        identity.label,
      );

      if (!record) {
        return null;
      }

      return {
        seasonId,
        competitionId: record.competitionId,
        label: record.label,
      };
    },

    async listFixtures(query) {
      assertDatabaseFilter(
        query.competitionId,
        'competitionId',
      );
      assertDatabaseFilter(
        query.competitorId,
        'competitorId',
      );

      const seasonFilter = resolveSeasonFilter(
        query.seasonId,
        query.competitionId,
      );

      const after = decodeCursor(
        query.cursor,
        fixtureCursorSchema,
      );

      const page = await listFixtureRecords({
        limit: query.limit,
        competitionId:
          seasonFilter.competitionId,
        season: seasonFilter.season,
        competitorId: query.competitorId,
        gender: query.gender,
        startDateFrom: query.startDateFrom,
        startDateTo: query.startDateTo,
        after,
      });

      return {
        data: page.records.map(mapFixture),
        pagination: {
          nextCursor: createNextCursor(
            page.hasMore,
            page.records,
            (record) => ({
              startDate: record.startDate,
              fixtureId: record.fixtureId,
            }),
          ),
        },
      };
    },

    async getFixture(fixtureId) {
      if (!isDatabaseId(fixtureId)) {
        return null;
      }

      const record = await findFixtureById(fixtureId);

      return record ? mapFixture(record) : null;
    },

    async listCompetitors(query) {
      assertDatabaseFilter(
        query.competitionId,
        'competitionId',
      );

      const seasonFilter = resolveSeasonFilter(
        query.seasonId,
        query.competitionId,
      );

      const after = decodeCursor(
        query.cursor,
        competitorCursorSchema,
      );

      const page = await listCompetitorRecords({
        limit: query.limit,
        competitionId:
          seasonFilter.competitionId,
        season: seasonFilter.season,
        name: query.name,
        after,
      });

      return {
        data: page.records,
        pagination: {
          nextCursor: createNextCursor(
            page.hasMore,
            page.records,
            (record) => ({
              name: record.name,
              competitorId: record.competitorId,
            }),
          ),
        },
      };
    },

    async getCompetitor(competitorId) {
      if (!isDatabaseId(competitorId)) {
        return null;
      }

      return findCompetitorById(competitorId);
    },

    async listParticipants(query) {
      assertDatabaseFilter(
        query.fixtureId,
        'fixtureId',
      );
      assertDatabaseFilter(
        query.competitorId,
        'competitorId',
      );

      const after = decodeCursor(
        query.cursor,
        participantCursorSchema,
      );

      const page = await listParticipantRecords({
        limit: query.limit,
        fixtureId: query.fixtureId,
        competitorId: query.competitorId,
        name: query.name,
        after,
      });

      return {
        data: page.records,
        pagination: {
          nextCursor: createNextCursor(
            page.hasMore,
            page.records,
            (record) => ({
              displayName: record.displayName,
              participantId: record.participantId,
            }),
          ),
        },
      };
    },

    async getParticipant(participantId) {
      if (!isDatabaseId(participantId)) {
        return null;
      }

      return findParticipantById(participantId);
    },
  };
}
```

---

## 14. Format + compile before touching routes

Run:

```powershell
npx.cmd prettier --write apps/backend/src/modules
```

Then:

```powershell
npm.cmd run build --workspace=@sport-analytics/contracts
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run build --workspace=@sport-analytics/backend
```

**If any command fails, stop and send me the error.**

Do not continue to routes while the service/repository layer doesn't compile.

---

## 15. First commit once Step 14 passes

Check:

```powershell
git status --short
```

Stage the contracts/repository/service work:

```powershell
git add apps/backend/package.json
git add package-lock.json
git add packages/contracts/src/public-read.ts
git add packages/contracts/src/tests/public-read.test.ts
git add packages/contracts/src/index.ts

git add apps/backend/src/modules/competitions
git add apps/backend/src/modules/seasons
git add apps/backend/src/modules/fixtures
git add apps/backend/src/modules/competitors
git add apps/backend/src/modules/participants
git add apps/backend/src/modules/public-read/opaque-value.ts
git add apps/backend/src/modules/public-read/season-id.ts
git add apps/backend/src/modules/public-read/cursor.ts
git add apps/backend/src/modules/public-read/public-read.errors.ts
git add apps/backend/src/modules/public-read/public-read.service.ts
```

Check:

```powershell
git diff --cached --stat
git diff --cached
```

Commit:

```powershell
git commit -m "feat(api): add public read data and service layer" -m "Refs #47" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

---

# ROUTES / CONTROLLERS

## 16. Create the controller

Create:

```text
apps/backend/src/modules/public-read/public-read.controller.ts
```

Paste:

```ts
import {
  competitionListQuerySchema,
  competitorListQuerySchema,
  fixtureListQuerySchema,
  participantListQuerySchema,
  seasonListQuerySchema,
} from '@sport-analytics/contracts';
import type {
  Request,
  RequestHandler,
  Response,
} from 'express';
import type { z } from 'zod';

import { PublicReadInputError } from './public-read.errors';
import type { PublicReadService } from './public-read.service';

type AsyncHandler = (
  request: Request,
  response: Response,
) => Promise<void>;

function wrapPublicHandler(
  handler: AsyncHandler,
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response).catch((error) => {
      if (error instanceof PublicReadInputError) {
        response.status(400).json({
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

function parseQuery<T>(
  schema: z.ZodType<T>,
  request: Request,
  response: Response,
): T | undefined {
  const result = schema.safeParse(request.query);

  if (result.success) {
    return result.data;
  }

  response.status(400).json({
    error: {
      code: 'VALIDATION_FAILED',
      message: 'The request is invalid.',
      details: result.error.issues.map((issue) => ({
        code: 'INVALID_FIELD',
        message: issue.message,
        ...(issue.path.length > 0
          ? {
              field: issue.path.join('.'),
            }
          : {}),
      })),
    },
  });

  return undefined;
}

function sendNotFound(
  response: Response,
  resource: string,
): void {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `${resource} not found.`,
    },
  });
}

export function createPublicReadController(
  service: PublicReadService,
) {
  return {
    listCompetitions: wrapPublicHandler(
      async (request, response) => {
        const query = parseQuery(
          competitionListQuerySchema,
          request,
          response,
        );

        if (!query) {
          return;
        }

        response.status(200).json(
          await service.listCompetitions(query),
        );
      },
    ),

    getCompetition: wrapPublicHandler(
      async (request, response) => {
        const competition =
          await service.getCompetition(
            request.params.competitionId,
          );

        if (!competition) {
          sendNotFound(response, 'Competition');
          return;
        }

        response.status(200).json({
          data: competition,
        });
      },
    ),

    listSeasons: wrapPublicHandler(
      async (request, response) => {
        const query = parseQuery(
          seasonListQuerySchema,
          request,
          response,
        );

        if (!query) {
          return;
        }

        response
          .status(200)
          .json(await service.listSeasons(query));
      },
    ),

    getSeason: wrapPublicHandler(
      async (request, response) => {
        const season = await service.getSeason(
          request.params.seasonId,
        );

        if (!season) {
          sendNotFound(response, 'Season');
          return;
        }

        response.status(200).json({
          data: season,
        });
      },
    ),

    listFixtures: wrapPublicHandler(
      async (request, response) => {
        const query = parseQuery(
          fixtureListQuerySchema,
          request,
          response,
        );

        if (!query) {
          return;
        }

        response
          .status(200)
          .json(await service.listFixtures(query));
      },
    ),

    getFixture: wrapPublicHandler(
      async (request, response) => {
        const fixture = await service.getFixture(
          request.params.fixtureId,
        );

        if (!fixture) {
          sendNotFound(response, 'Fixture');
          return;
        }

        response.status(200).json({
          data: fixture,
        });
      },
    ),

    listCompetitors: wrapPublicHandler(
      async (request, response) => {
        const query = parseQuery(
          competitorListQuerySchema,
          request,
          response,
        );

        if (!query) {
          return;
        }

        response.status(200).json(
          await service.listCompetitors(query),
        );
      },
    ),

    getCompetitor: wrapPublicHandler(
      async (request, response) => {
        const competitor =
          await service.getCompetitor(
            request.params.competitorId,
          );

        if (!competitor) {
          sendNotFound(response, 'Competitor');
          return;
        }

        response.status(200).json({
          data: competitor,
        });
      },
    ),

    listParticipants: wrapPublicHandler(
      async (request, response) => {
        const query = parseQuery(
          participantListQuerySchema,
          request,
          response,
        );

        if (!query) {
          return;
        }

        response.status(200).json(
          await service.listParticipants(query),
        );
      },
    ),

    getParticipant: wrapPublicHandler(
      async (request, response) => {
        const participant =
          await service.getParticipant(
            request.params.participantId,
          );

        if (!participant) {
          sendNotFound(response, 'Participant');
          return;
        }

        response.status(200).json({
          data: participant,
        });
      },
    ),
  };
}
```

---

## 17. Create the routes

Create:

```text
apps/backend/src/modules/public-read/public-read.routes.ts
```

Paste:

```ts
import { Router } from 'express';

import { createPublicReadController } from './public-read.controller';
import type { PublicReadService } from './public-read.service';

export function createPublicReadRouter(
  service: PublicReadService,
): Router {
  const router = Router();
  const controller =
    createPublicReadController(service);

  router.get(
    '/competitions',
    controller.listCompetitions,
  );

  router.get(
    '/competitions/:competitionId',
    controller.getCompetition,
  );

  router.get('/seasons', controller.listSeasons);

  router.get(
    '/seasons/:seasonId',
    controller.getSeason,
  );

  router.get('/fixtures', controller.listFixtures);

  router.get(
    '/fixtures/:fixtureId',
    controller.getFixture,
  );

  router.get(
    '/competitors',
    controller.listCompetitors,
  );

  router.get(
    '/competitors/:competitorId',
    controller.getCompetitor,
  );

  router.get(
    '/participants',
    controller.listParticipants,
  );

  router.get(
    '/participants/:participantId',
    controller.getParticipant,
  );

  return router;
}
```

Notice there is **no**:

```ts
requireAuthentication(...)
```

That is intentional.

---

## 18. Update `app.ts`

Open:

```text
apps/backend/src/app.ts
```

Add these imports:

```ts
import { createPublicReadRouter } from './modules/public-read/public-read.routes';
import {
  createPublicReadService,
  type PublicReadService,
} from './modules/public-read/public-read.service';
```

Change:

```ts
export interface AppDependencies {
  environment?: Environment;
  verifyAccessToken?: VerifyAccessToken;
}
```

to:

```ts
export interface AppDependencies {
  environment?: Environment;
  verifyAccessToken?: VerifyAccessToken;
  publicReadService?: PublicReadService;
}
```

After this existing code:

```ts
const verifyAccessToken =
  dependencies.verifyAccessToken ??
  createSupabaseTokenVerifier(environment);
```

add:

```ts
const publicReadService =
  dependencies.publicReadService ??
  createPublicReadService();
```

Then after:

```ts
app.use('/api/v1/auth', createAuthRouter(verifyAccessToken));
```

add:

```ts
app.use(
  '/api/v1',
  createPublicReadRouter(publicReadService),
);
```

So the bottom should now be:

```ts
app.use('/api/v1/health', healthRouter);
app.use(
  '/api/v1/auth',
  createAuthRouter(verifyAccessToken),
);
app.use(
  '/api/v1',
  createPublicReadRouter(publicReadService),
);

app.use(notFoundHandler);
app.use(errorHandler);
```

This is still:

```text
our Express routes
→ our service
→ our repositories
→ pg
→ PostgreSQL
```

No Supabase-generated application API.

---

## 19. Update `tests/test-app.ts`

Open:

```text
apps/backend/tests/test-app.ts
```

Add:

```ts
import type { PublicReadService } from '../src/modules/public-read/public-read.service';
```

Change:

```ts
export function createTestApp(
  verifyAccessToken: VerifyAccessToken = acceptTestIdentity,
) {
```

to:

```ts
export function createTestApp(
  verifyAccessToken: VerifyAccessToken = acceptTestIdentity,
  publicReadService?: PublicReadService,
) {
```

And change the `createApp()` call to:

```ts
return createApp({
  environment: testEnvironment,
  verifyAccessToken,
  publicReadService,
});
```

Existing auth tests can continue calling:

```ts
createTestApp(verifyAccessToken)
```

unchanged.

---

# API TESTS

## 20. Create `public-read.test.ts`

Create:

```text
apps/backend/tests/api/public-read.test.ts
```

Paste:

```ts
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { PublicReadService } from '../../src/modules/public-read/public-read.service';
import { PublicReadInputError } from '../../src/modules/public-read/public-read.errors';
import { createTestApp } from '../test-app';

function createService(
  overrides: Partial<PublicReadService> = {},
): PublicReadService {
  return {
    async listCompetitions() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getCompetition() {
      return null;
    },

    async listSeasons() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getSeason() {
      return null;
    },

    async listFixtures() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getFixture() {
      return null;
    },

    async listCompetitors() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getCompetitor() {
      return null;
    },

    async listParticipants() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getParticipant() {
      return null;
    },

    ...overrides,
  };
}

describe('public read API', () => {
  test('lists competitions without authentication', async () => {
    const verifyAccessToken =
      vi.fn<VerifyAccessToken>();

    const listCompetitions = vi
      .fn<PublicReadService['listCompetitions']>()
      .mockResolvedValue({
        data: [
          {
            competitionId: '1',
            name: 'Example Competition',
          },
        ],
        pagination: {
          nextCursor: 'next-page',
        },
      });

    const response = await request(
      createTestApp(
        verifyAccessToken,
        createService({
          listCompetitions,
        }),
      ),
    )
      .get('/api/v1/competitions')
      .expect(200);

    expect(verifyAccessToken).not.toHaveBeenCalled();

    expect(listCompetitions).toHaveBeenCalledWith({
      limit: 50,
    });

    expect(response.body).toEqual({
      data: [
        {
          competitionId: '1',
          name: 'Example Competition',
        },
      ],
      pagination: {
        nextCursor: 'next-page',
      },
    });
  });

  test('retrieves a competition by stable identifier', async () => {
    const getCompetition = vi
      .fn<PublicReadService['getCompetition']>()
      .mockResolvedValue({
        competitionId: '12',
        name: 'Test Competition',
      });

    const response = await request(
      createTestApp(
        undefined,
        createService({
          getCompetition,
        }),
      ),
    )
      .get('/api/v1/competitions/12')
      .expect(200);

    expect(response.body).toEqual({
      data: {
        competitionId: '12',
        name: 'Test Competition',
      },
    });
  });

  test('lists and retrieves seasons', async () => {
    const listSeasons = vi
      .fn<PublicReadService['listSeasons']>()
      .mockResolvedValue({
        data: [
          {
            seasonId: 'season_example',
            competitionId: '12',
            label: '2026',
          },
        ],
        pagination: {
          nextCursor: null,
        },
      });

    const getSeason = vi
      .fn<PublicReadService['getSeason']>()
      .mockResolvedValue({
        seasonId: 'season_example',
        competitionId: '12',
        label: '2026',
      });

    const app = createTestApp(
      undefined,
      createService({
        listSeasons,
        getSeason,
      }),
    );

    await request(app)
      .get('/api/v1/seasons?competitionId=12')
      .expect(200);

    expect(listSeasons).toHaveBeenCalledWith({
      competitionId: '12',
      limit: 50,
    });

    const detail = await request(app)
      .get('/api/v1/seasons/season_example')
      .expect(200);

    expect(detail.body.data.label).toBe('2026');
  });

  test('passes fixture filters and pagination to the service', async () => {
    const listFixtures = vi
      .fn<PublicReadService['listFixtures']>()
      .mockResolvedValue({
        data: [],
        pagination: {
          nextCursor: 'next-fixture-page',
        },
      });

    const app = createTestApp(
      undefined,
      createService({
        listFixtures,
      }),
    );

    const response = await request(app)
      .get('/api/v1/fixtures')
      .query({
        competitionId: '1',
        competitorId: '2',
        gender: 'female',
        startDateFrom: '2026-01-01',
        startDateTo: '2026-08-09',
        limit: '25',
      })
      .expect(200);

    expect(listFixtures).toHaveBeenCalledWith({
      competitionId: '1',
      competitorId: '2',
      gender: 'female',
      startDateFrom: '2026-01-01',
      startDateTo: '2026-08-09',
      limit: 25,
    });

    expect(response.body.pagination.nextCursor).toBe(
      'next-fixture-page',
    );

    await request(app)
      .get('/api/v1/fixtures')
      .query({
        cursor: 'next-fixture-page',
      })
      .expect(200);

    expect(listFixtures).toHaveBeenLastCalledWith({
      cursor: 'next-fixture-page',
      limit: 50,
    });
  });

  test('retrieves a fixture', async () => {
    const getFixture = vi
      .fn<PublicReadService['getFixture']>()
      .mockResolvedValue({
        fixtureId: '100',
        competitionId: '12',
        seasonId: 'season_example',
        season: '2026',
        matchType: 'T20',
        teamType: 'international',
        gender: 'male',
        ballsPerOver: 6,
        scheduledOvers: 20,
        startDate: '2026-08-09',
        endDate: '2026-08-09',
      });

    const response = await request(
      createTestApp(
        undefined,
        createService({
          getFixture,
        }),
      ),
    )
      .get('/api/v1/fixtures/100')
      .expect(200);

    expect(response.body.data.fixtureId).toBe('100');
  });

  test('lists and retrieves competitors', async () => {
    const listCompetitors = vi
      .fn<PublicReadService['listCompetitors']>()
      .mockResolvedValue({
        data: [
          {
            competitorId: '20',
            name: 'Team Example',
          },
        ],
        pagination: {
          nextCursor: null,
        },
      });

    const getCompetitor = vi
      .fn<PublicReadService['getCompetitor']>()
      .mockResolvedValue({
        competitorId: '20',
        name: 'Team Example',
      });

    const app = createTestApp(
      undefined,
      createService({
        listCompetitors,
        getCompetitor,
      }),
    );

    await request(app)
      .get(
        '/api/v1/competitors?competitionId=12&name=Team',
      )
      .expect(200);

    expect(listCompetitors).toHaveBeenCalledWith({
      competitionId: '12',
      name: 'Team',
      limit: 50,
    });

    const detail = await request(app)
      .get('/api/v1/competitors/20')
      .expect(200);

    expect(detail.body.data.competitorId).toBe('20');
  });

  test('lists and retrieves participants', async () => {
    const listParticipants = vi
      .fn<PublicReadService['listParticipants']>()
      .mockResolvedValue({
        data: [
          {
            participantId: '30',
            displayName: 'Player Example',
          },
        ],
        pagination: {
          nextCursor: null,
        },
      });

    const getParticipant = vi
      .fn<PublicReadService['getParticipant']>()
      .mockResolvedValue({
        participantId: '30',
        displayName: 'Player Example',
      });

    const app = createTestApp(
      undefined,
      createService({
        listParticipants,
        getParticipant,
      }),
    );

    await request(app)
      .get(
        '/api/v1/participants?fixtureId=100&competitorId=20',
      )
      .expect(200);

    expect(listParticipants).toHaveBeenCalledWith({
      fixtureId: '100',
      competitorId: '20',
      limit: 50,
    });

    const detail = await request(app)
      .get('/api/v1/participants/30')
      .expect(200);

    expect(detail.body.data.displayName).toBe(
      'Player Example',
    );
  });

  test('returns a clear not-found response for an unknown identifier', async () => {
    const response = await request(
      createTestApp(
        undefined,
        createService({
          getCompetition: async () => null,
        }),
      ),
    )
      .get('/api/v1/competitions/999999')
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Competition not found.',
      },
    });
  });

  test('rejects invalid collection query parameters', async () => {
    const response = await request(
      createTestApp(
        undefined,
        createService(),
      ),
    )
      .get('/api/v1/fixtures?limit=999')
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_FAILED',
    );
  });

  test('rejects an invalid fixture date range', async () => {
    const response = await request(
      createTestApp(
        undefined,
        createService(),
      ),
    )
      .get('/api/v1/fixtures')
      .query({
        startDateFrom: '2026-08-09',
        startDateTo: '2026-01-01',
      })
      .expect(400);

    expect(response.body.error.code).toBe(
      'VALIDATION_FAILED',
    );
  });

  test('returns a clear invalid-cursor response', async () => {
    const listCompetitions = vi
      .fn<PublicReadService['listCompetitions']>()
      .mockRejectedValue(
        new PublicReadInputError(
          'INVALID_CURSOR',
          'The pagination cursor is invalid.',
        ),
      );

    const response = await request(
      createTestApp(
        undefined,
        createService({
          listCompetitions,
        }),
      ),
    )
      .get('/api/v1/competitions?cursor=broken')
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CURSOR',
        message:
          'The pagination cursor is invalid.',
      },
    });
  });
});
```

---

## 21. Format and run the API checks

Run:

```powershell
npx.cmd prettier --write apps/backend/src/modules/public-read apps/backend/src/app.ts apps/backend/tests/test-app.ts apps/backend/tests/api/public-read.test.ts
```

Then:

```powershell
npm.cmd run test:contracts
npm.cmd run test:api
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run build --workspace=@sport-analytics/backend
```

If anything fails, **stop and send me the error**.

---

## 22. Second commit

If Step 21 passes:

```powershell
git add apps/backend/src/modules/public-read/public-read.controller.ts
git add apps/backend/src/modules/public-read/public-read.routes.ts
git add apps/backend/src/app.ts
git add apps/backend/tests/test-app.ts
git add apps/backend/tests/api/public-read.test.ts
```

Check:

```powershell
git diff --cached
```

Commit:

```powershell
git commit -m "feat(api): add anonymous public read endpoints" -m "Refs #47" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

---

# OPENAPI + DOCS

## 23. Update `openapi.yaml`

Open:

```text
docs/api/openapi.yaml
```

For these ten operations:

```text
GET /api/v1/competitions
GET /api/v1/competitions/{competitionId}

GET /api/v1/seasons
GET /api/v1/seasons/{seasonId}

GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}

GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}

GET /api/v1/participants
GET /api/v1/participants/{participantId}
```

change each:

```yaml
x-implementation-status: planned
```

to:

```yaml
x-implementation-status: implemented
```

**Do not change:**

```text
POST /api/v1/submissions
```

That stays:

```yaml
x-implementation-status: planned
```

Also find the `Fixture` schema.

Make its `required:` section include:

```yaml
required:
  - fixtureId
  - competitionId
  - seasonId
  - season
  - matchType
  - teamType
  - gender
  - ballsPerOver
  - scheduledOvers
  - startDate
  - endDate
```

That aligns OpenAPI with your Zod contract: nullable fields are still **present**, even when their value is `null`.

---

## 24. Create `docs/api/public-read.md`

Paste:

````md
# Public read API

The public read API provides anonymous access to competition and fixture reference data.

No sign-in or bearer token is required for these endpoints.

All application data is served through the handwritten Express backend. Supabase-generated Data API or PostgREST endpoints are not used as the public Sport Analytics API.

## Base path

```text
/api/v1
```

## Resources

The public API exposes:

- competitions;
- seasons;
- fixtures;
- competitors; and
- participants.

For cricket, competitors are teams and participants are people/players.

## Competition endpoints

```http
GET /api/v1/competitions
GET /api/v1/competitions/{competitionId}
```

Supported collection filter:

```text
name
```

Deterministic ordering:

```text
name ASC
competitionId ASC
```

## Season endpoints

```http
GET /api/v1/seasons
GET /api/v1/seasons/{seasonId}
```

Supported collection filter:

```text
competitionId
```

A season resource is derived from a competition and the season value recorded on its fixtures.

`seasonId` is a stable opaque identifier derived by the backend. Consumers must not decode or derive meaning from its representation.

Deterministic ordering:

```text
competitionId ASC
season ASC
```

## Fixture endpoints

```http
GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}
```

Supported collection filters:

```text
competitionId
seasonId
competitorId
gender
startDateFrom
startDateTo
```

The date bounds are inclusive.

Example:

```http
GET /api/v1/fixtures?competitionId=12&competitorId=20&limit=25
```

Example response:

```json
{
  "data": [
    {
      "fixtureId": "481",
      "competitionId": "12",
      "seasonId": "season_...",
      "season": "2026",
      "matchType": "T20",
      "teamType": "international",
      "gender": "male",
      "ballsPerOver": 6,
      "scheduledOvers": 20,
      "startDate": "2026-08-09",
      "endDate": "2026-08-09"
    }
  ],
  "pagination": {
    "nextCursor": null
  }
}
```

Deterministic fixture ordering:

```text
startDate ASC
fixtureId ASC
```

## Competitor endpoints

```http
GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}
```

Supported filters:

```text
competitionId
seasonId
name
```

A competitor represents a cricket team.

Deterministic ordering:

```text
name ASC
competitorId ASC
```

## Participant endpoints

```http
GET /api/v1/participants
GET /api/v1/participants/{participantId}
```

Supported filters:

```text
fixtureId
competitorId
name
```

Only public participant fields are returned.

Internal source references, authentication data, submission records and audit information are not exposed.

Deterministic ordering:

```text
displayName ASC
participantId ASC
```

## Pagination

Collection endpoints use cursor pagination.

The default page size is:

```text
50
```

The maximum page size is:

```text
100
```

Example:

```http
GET /api/v1/competitions?limit=25
```

A response may contain:

```json
{
  "pagination": {
    "nextCursor": "opaque-next-cursor"
  }
}
```

The next request can use:

```http
GET /api/v1/competitions?limit=25&cursor=opaque-next-cursor
```

Cursors and resource identifiers are opaque. Consumers must not derive meaning from their representation.

## Not-found responses

Unknown resource identifiers return HTTP `404`.

Example:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Competition not found."
  }
}
```

## Invalid requests

Invalid filters, page sizes or cursors return HTTP `400` using the shared machine-readable API error format.

## OpenAPI

The machine-readable specification is documented in the [OpenAPI specification](openapi.md).

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
````

---

## 25. Update `docs/api/overview.md`

Under your current endpoints section, add:

```md
### Public read

The following endpoints are available without authentication:

```text
GET /api/v1/competitions
GET /api/v1/competitions/{competitionId}
GET /api/v1/seasons
GET /api/v1/seasons/{seasonId}
GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}
GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}
GET /api/v1/participants
GET /api/v1/participants/{participantId}
```

See [Public Read API](public-read.md) for filters, pagination,
ordering and example responses.
```

Keep/update the existing AI declaration at the bottom. Don't add a duplicate `## AI Declaration`.

---

## 26. Update `mkdocs.yml`

Your API section should now contain:

```yaml
- API:
    - Overview: api/overview.md
    - Shared Contracts: api/contracts.md
    - Public Read API: api/public-read.md
    - OpenAPI Specification: api/openapi.md
    - Versioning and Deprecation: api/versioning.md
```

Preserve any additional pages that already exist.

---

## 27. Validate docs/OpenAPI

Run:

```powershell
npx.cmd prettier --write docs/api/openapi.yaml docs/api/public-read.md docs/api/overview.md mkdocs.yml
```

Then:

```powershell
npm.cmd run openapi:lint
python -m mkdocs build --strict
```

Then remove generated `site/` changes:

```powershell
git restore --source=HEAD --staged --worktree -- site
git clean -fd -- site
```

---

# FINAL VERIFICATION

## 28. Run everything

```powershell
npm.cmd run test:contracts
npm.cmd run test:unit
npm.cmd run test:api
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run openapi:lint
npm.cmd run check
```

Then:

```powershell
git diff --check
git status --short
```

If `npm run check` fails because of **existing unrelated formatting on `main`**, don't randomly fix those files. Send me the output.

---

# AI + THIRD COMMIT

## 29. Save transcript

Save this session as:

```text
evidence/ai/transcripts/shayna-unterslak/2026-08-09-issue-47-public-read-api.pdf
```

Check it contains no passwords/tokens/secrets.

---

## 30. Add your CSV row

Add this as one physical row to:

```text
evidence/ai/registers/shayna-unterslak.csv
```

```csv
"2026-08-09","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","Planning; code generation; API design; test generation; documentation; technical guidance; debugging","Issue #47: implement anonymous public competition, season, fixture, competitor and participant read APIs","Shared public-read contracts; deterministic cursor pagination; competition, season, fixture, competitor and participant repository queries; public-read service, controller and handwritten Express routes; anonymous API tests; OpenAPI implementation-status and contract updates; public-read API documentation","Reviewed the implementation against the existing sport-domain schema, shared API conventions, OpenAPI baseline, repository architecture and handwritten API requirement; ran contract and API tests, type-check, lint, build, OpenAPI validation and documentation validation locally before Pull Request submission; CI execution remains dependent on the outstanding course Gitea Actions runner.","evidence/ai/transcripts/shayna-unterslak/2026-08-09-issue-47-public-read-api.pdf; Issue #47; Pull Request and commit references pending"
```

Only keep the verification wording if those commands actually pass.

---

## 31. Third commit

Stage:

```powershell
git add docs/api/openapi.yaml
git add docs/api/public-read.md
git add docs/api/overview.md
git add mkdocs.yml
git add evidence/ai/registers/shayna-unterslak.csv
git add "evidence/ai/transcripts/shayna-unterslak/2026-08-09-issue-47-public-read-api.pdf"
```

Check:

```powershell
git diff --cached
```

Commit:

```powershell
git commit -m "docs(api): document public read endpoints" -m "Refs #47" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

---

## 32. Final branch check and push

```powershell
git status
git log --oneline -4
git diff main...HEAD --stat
git diff --check main...HEAD
```

You should have roughly:

```text
docs(api): document public read endpoints
feat(api): add anonymous public read endpoints
feat(api): add public read data and service layer
```

Then:

```powershell
git push -u origin feat/47-public-read-api
```

At that point **the implementation is done** and we do the #47 PR.

For now, do **Steps 9–14 only first**. If the backend typecheck/lint/build all pass, make Commit 1 and then move to the routes.

## Prompt:
8/9/2026, 5:55:03 PM

[Attachment: Pasted text(2).txt]

## Response:
8/9/2026, 5:55:07 PM

> **Fixing TypeScript errors**
>
> I’m seeing two configuration-related issues: indexed access may be `undefined`, and optional properties reject explicit `undefined`. I’d narrow the final record, then conditionally spread `startCursor` and `endCursor` only when values exist. fileciteturn0file0
>
> **Fixed TypeScript errors**
>
> 
>
> Worked for 10s

Yep - this is fixable, and it’s **not a problem with the overall design**. Your lint already passes; TypeScript is rejecting two patterns because the project has strict settings enabled, especially `exactOptionalPropertyTypes`. All six errors are in `public-read.service.ts`. `Pasted text.txt`

Do **not** change `tsconfig.json` and do **not** loosen the repository interfaces. Fix the service properly.

## 1. Fix `createNextCursor`

Open:

```text
apps/backend/src/modules/public-read/public-read.service.ts
```

Find this:

```ts
function createNextCursor<T>(
  hasMore: boolean,
  records: T[],
  toCursor: (record: T) => unknown,
): string | null {
  if (!hasMore || records.length === 0) {
    return null;
  }

  const finalRecord = records[records.length - 1];

  return createCursor(toCursor(finalRecord));
}
```

Replace it with:

```ts
function createNextCursor<T>(
  hasMore: boolean,
  records: T[],
  toCursor: (record: T) => unknown,
): string | null {
  if (!hasMore || records.length === 0) {
    return null;
  }

  const finalRecord = records[records.length - 1]!;

  return createCursor(toCursor(finalRecord));
}
```

The `!` is safe here because immediately above we explicitly proved:

```ts
records.length !== 0
```

---

# 2. Fix `listCompetitions`

Find:

```ts
const page = await listCompetitionRecords({
  limit: query.limit,
  name: query.name,
  after,
});
```

Replace with:

```ts
const page = await listCompetitionRecords({
  limit: query.limit,
  ...(query.name !== undefined
    ? { name: query.name }
    : {}),
  ...(after !== undefined ? { after } : {}),
});
```

Why? With:

```text
exactOptionalPropertyTypes: true
```

these are different:

```ts
{ name: undefined } // ❌
{}                  // ✅
```

If an optional property doesn't exist, TypeScript wants us to **omit it entirely**.

---

# 3. Fix `listSeasons`

Find:

```ts
const page = await listSeasonRecords({
  limit: query.limit,
  competitionId: query.competitionId,
  after,
});
```

Replace with:

```ts
const page = await listSeasonRecords({
  limit: query.limit,
  ...(query.competitionId !== undefined
    ? { competitionId: query.competitionId }
    : {}),
  ...(after !== undefined ? { after } : {}),
});
```

---

# 4. Fix `listFixtures`

Find the whole block:

```ts
const page = await listFixtureRecords({
  limit: query.limit,
  competitionId:
    seasonFilter.competitionId,
  season: seasonFilter.season,
  competitorId: query.competitorId,
  gender: query.gender,
  startDateFrom: query.startDateFrom,
  startDateTo: query.startDateTo,
  after,
});
```

Replace it with:

```ts
const page = await listFixtureRecords({
  limit: query.limit,
  ...(seasonFilter.competitionId !== undefined
    ? {
        competitionId:
          seasonFilter.competitionId,
      }
    : {}),
  ...(seasonFilter.season !== undefined
    ? { season: seasonFilter.season }
    : {}),
  ...(query.competitorId !== undefined
    ? { competitorId: query.competitorId }
    : {}),
  ...(query.gender !== undefined
    ? { gender: query.gender }
    : {}),
  ...(query.startDateFrom !== undefined
    ? { startDateFrom: query.startDateFrom }
    : {}),
  ...(query.startDateTo !== undefined
    ? { startDateTo: query.startDateTo }
    : {}),
  ...(after !== undefined ? { after } : {}),
});
```

---

# 5. Fix `listCompetitors`

Find:

```ts
const page = await listCompetitorRecords({
  limit: query.limit,
  competitionId:
    seasonFilter.competitionId,
  season: seasonFilter.season,
  name: query.name,
  after,
});
```

Replace with:

```ts
const page = await listCompetitorRecords({
  limit: query.limit,
  ...(seasonFilter.competitionId !== undefined
    ? {
        competitionId:
          seasonFilter.competitionId,
      }
    : {}),
  ...(seasonFilter.season !== undefined
    ? { season: seasonFilter.season }
    : {}),
  ...(query.name !== undefined
    ? { name: query.name }
    : {}),
  ...(after !== undefined ? { after } : {}),
});
```

---

# 6. Fix `listParticipants`

Find:

```ts
const page = await listParticipantRecords({
  limit: query.limit,
  fixtureId: query.fixtureId,
  competitorId: query.competitorId,
  name: query.name,
  after,
});
```

Replace with:

```ts
const page = await listParticipantRecords({
  limit: query.limit,
  ...(query.fixtureId !== undefined
    ? { fixtureId: query.fixtureId }
    : {}),
  ...(query.competitorId !== undefined
    ? { competitorId: query.competitorId }
    : {}),
  ...(query.name !== undefined
    ? { name: query.name }
    : {}),
  ...(after !== undefined ? { after } : {}),
});
```

---

# 7. Format the file

Run:

```powershell
npx.cmd prettier --write apps/backend/src/modules/public-read/public-read.service.ts
```

---

# 8. Run the three checks again

```powershell
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run build --workspace=@sport-analytics/backend
```

What we want:

```text
typecheck ✅
lint      ✅
build     ✅
```

### Why this happened

Your repo has strong TypeScript settings, which is actually useful here.

The first error:

```text
T | undefined is not assignable to T
```

comes from TypeScript treating array indexing as potentially missing even though we checked the array length.

The other five errors all come from:

```text
exactOptionalPropertyTypes: true
```

So for an interface like:

```ts
interface Options {
  name?: string;
}
```

TypeScript expects either:

```ts
{}
```

or:

```ts
{ name: 'T20' }
```

but **not**:

```ts
{ name: undefined }
```

The conditional spreads above preserve that distinction instead of weakening your compiler settings.

After those three commands run, send me the output. **If they all pass, Step 14 is complete and you can make Commit 1 before we continue to the controller/routes.**

## Prompt:
8/9/2026, 6:04:46 PM

[Attachment: Pasted text(3).txt]

## Response:
8/9/2026, 6:04:53 PM

> **Fixing the test setup**
>
> I’m tracing the 500s first: the test app isn’t injecting the mocked read service, so requests reach the database. I’m also tightening query-schema output typing and handling route parameters safely to resolve the TypeScript errors.
>
> **Fixed the test setup**
>
> 
>
> Worked for 12s

This is actually one clear wiring problem plus one TypeScript typing issue - not eight separate API failures.

The giveaway is that every test which reaches the service returns `500` with:

```text
DATABASE_URL is not configured.
```

while the three tests that fail before calling the service pass. `Pasted text.txt`

That means your mocked `publicReadService` is **not being injected into `createApp()`**, so the tests fall back to the real database-backed service.

Do these fixes exactly.

## 1. Fix `tests/test-app.ts`

Open:

```text
apps/backend/tests/test-app.ts
```

You likely currently have something similar to:

```ts
export function createTestApp(
  verifyAccessToken: VerifyAccessToken = acceptTestIdentity,
  publicReadService?: PublicReadService,
) {
  return createApp({
    environment: testEnvironment,
    verifyAccessToken,
  });
}
```

That explains this lint error:

```text
'publicReadService' is defined but never used
```

Change it to:

```ts
export function createTestApp(
  verifyAccessToken: VerifyAccessToken = acceptTestIdentity,
  publicReadService?: PublicReadService,
) {
  return createApp({
    environment: testEnvironment,
    verifyAccessToken,
    ...(publicReadService !== undefined
      ? { publicReadService }
      : {}),
  });
}
```

Why the conditional spread? Your repo uses:

```text
exactOptionalPropertyTypes: true
```

so we should omit the property rather than explicitly pass:

```ts
publicReadService: undefined
```

This should fix all of those unexpected database calls.

---

## 2. Fix the controller query typing

Open:

```text
apps/backend/src/modules/public-read/public-read.controller.ts
```

Find your current:

```ts
function parseQuery<T>(
  schema: z.ZodType<T>,
  request: Request,
  response: Response,
): T | undefined {
```

Replace that function signature with:

```ts
function parseQuery<S extends z.ZodTypeAny>(
  schema: S,
  request: Request,
  response: Response,
): z.output<S> | undefined {
```

Keep the body the same:

```ts
function parseQuery<S extends z.ZodTypeAny>(
  schema: S,
  request: Request,
  response: Response,
): z.output<S> | undefined {
  const result = schema.safeParse(request.query);

  if (result.success) {
    return result.data;
  }

  response.status(400).json({
    error: {
      code: 'VALIDATION_FAILED',
      message: 'The request is invalid.',
      details: result.error.issues.map((issue) => ({
        code: 'INVALID_FIELD',
        message: issue.message,
        ...(issue.path.length > 0
          ? {
              field: issue.path.join('.'),
            }
          : {}),
      })),
    },
  });

  return undefined;
}
```

### Why this fixes the `limit` errors

Your schema has a default:

```ts
limit: 50
```

There is an important distinction between:

```text
Zod input
limit can be omitted

Zod output
limit is definitely number
```

The old generic erased that distinction, so TypeScript thought:

```ts
limit?: number
```

was being sent to a service that requires:

```ts
limit: number
```

Using:

```ts
z.output<S>
```

tells TypeScript to use the **post-validation result**, where the default has already been applied.

---

## 3. Fix the five path-parameter errors

You also have errors such as:

```text
string | undefined is not assignable to string
```

for:

```ts
request.params.competitionId
request.params.seasonId
request.params.fixtureId
request.params.competitorId
request.params.participantId
```

Add this helper underneath `parseQuery()`:

```ts
function getPathParameter(
  request: Request,
  name: string,
): string {
  const value = request.params[name];

  if (value === undefined) {
    throw new Error(
      `Expected route parameter "${name}" was not provided.`,
    );
  }

  return value;
}
```

This isn't user input validation - Express cannot reach these handlers without matching the corresponding route parameter. It simply narrows the Express TypeScript type safely.

Now change each detail handler.

### Competition

Replace:

```ts
const competition =
  await service.getCompetition(
    request.params.competitionId,
  );
```

with:

```ts
const competition =
  await service.getCompetition(
    getPathParameter(
      request,
      'competitionId',
    ),
  );
```

### Season

Replace:

```ts
const season = await service.getSeason(
  request.params.seasonId,
);
```

with:

```ts
const season = await service.getSeason(
  getPathParameter(request, 'seasonId'),
);
```

### Fixture

Replace:

```ts
const fixture = await service.getFixture(
  request.params.fixtureId,
);
```

with:

```ts
const fixture = await service.getFixture(
  getPathParameter(request, 'fixtureId'),
);
```

### Competitor

Replace:

```ts
const competitor =
  await service.getCompetitor(
    request.params.competitorId,
  );
```

with:

```ts
const competitor =
  await service.getCompetitor(
    getPathParameter(
      request,
      'competitorId',
    ),
  );
```

### Participant

Replace:

```ts
const participant =
  await service.getParticipant(
    request.params.participantId,
  );
```

with:

```ts
const participant =
  await service.getParticipant(
    getPathParameter(
      request,
      'participantId',
    ),
  );
```

---

## 4. Format the two files

Run:

```powershell
npx.cmd prettier --write apps/backend/src/modules/public-read/public-read.controller.ts apps/backend/tests/test-app.ts
```

---

## 5. Typecheck and lint first

Before running the API tests again:

```powershell
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run build --workspace=@sport-analytics/backend
```

We want:

```text
typecheck ✅
lint      ✅
build     ✅
```

---

## 6. Then rerun the API tests

```powershell
npm.cmd run test:api
```

What should change is important:

```text
BEFORE
public read test
→ default real service
→ getDatabasePool()
→ DATABASE_URL missing
→ 500 ❌

AFTER
public read test
→ injected fake PublicReadService
→ mock response
→ 200 / 404 etc. ✅
```

You **do not need to configure `DATABASE_URL`** to make these API/controller tests pass. They are intentionally testing HTTP behaviour with the service boundary mocked.

And those existing:

```text
DATABASE_URL is not configured.
```

messages should disappear from the public-read tests.

---

## 7. If all that passes

Then run:

```powershell
npm.cmd run test:contracts
npm.cmd run test:api
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run build --workspace=@sport-analytics/backend
```

If all five pass, **Commit 2 is ready**:

```powershell
git add apps/backend/src/modules/public-read/public-read.controller.ts
git add apps/backend/src/modules/public-read/public-read.routes.ts
git add apps/backend/src/app.ts
git add apps/backend/tests/test-app.ts
git add apps/backend/tests/api/public-read.test.ts

git diff --cached --stat
```

Then:

```powershell
git commit -m "feat(api): add anonymous public read endpoints" -m "Refs #47" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

So fix **`test-app.ts` + controller typing**, rerun those commands, and we should be through the route/test stage.

## Prompt:
8/9/2026, 6:09:52 PM

can i continue now?

[Attachment: Pasted text(4).txt]

## Response:
8/9/2026, 6:09:55 PM

Yes - **you can continue now.** The API test suite is clean: all **15 tests passed**, including all **11 public-read tests**, plus auth and health. The previous `DATABASE_URL` problem is gone, so the mocked service injection is working correctly. `Pasted text.txt`

Before making Commit 2, run these three final checks:

```powershell
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run build --workspace=@sport-analytics/backend
```

If all three pass, make **Commit 2**:

```powershell
git add apps/backend/src/modules/public-read/public-read.controller.ts
git add apps/backend/src/modules/public-read/public-read.routes.ts
git add apps/backend/src/app.ts
git add apps/backend/tests/test-app.ts
git add apps/backend/tests/api/public-read.test.ts

git diff --cached --stat
```

Then:

```powershell
git commit -m "feat(api): add anonymous public read endpoints" -m "Refs #47" -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

After that, continue with **Step 23: OpenAPI + documentation**:

```text
docs/api/openapi.yaml
docs/api/public-read.md
docs/api/overview.md
mkdocs.yml
```

So yes: **the routes/tests stage is working; you're ready to move on once those three compile/lint checks are green.**

## Prompt:
8/9/2026, 6:17:02 PM

> 25\. Update `docs/api/overview.md`
> ----------------------------------
> 
> Under your current endpoints section, add:
> 
> Markdown
> 
>     ### Public read
>     
>     The following endpoints are available without authentication:
>     
>     ```text
>     GET /api/v1/competitions
>     GET /api/v1/competitions/{competitionId}
>     GET /api/v1/seasons
>     GET /api/v1/seasons/{seasonId}
>     GET /api/v1/fixtures
>     GET /api/v1/fixtures/{fixtureId}
>     GET /api/v1/competitors
>     GET /api/v1/competitors/{competitorId}
>     GET /api/v1/participants
>     GET /api/v1/participants/{participantId}
> 
> See Public Read API for filters, pagination,  
> ordering and example responses.
> 
>     
>     Keep/update the existing AI declaration at the bottom. Don't add a duplicate `## AI Declaration`.
>     
>     ---
>     
>     ## 26. Update `mkdocs.yml`
>     
>     Your API section should now contain:
>     
>     ```yaml
>     - API:
>         - Overview: api/overview.md
>         - Shared Contracts: api/contracts.md
>         - Public Read API: api/public-read.md
>         - OpenAPI Specification: api/openapi.md
>         - Versioning and Deprecation: api/versioning.md
> 
> Preserve any additional pages that already exist.

give me 25 in 1 markdown block pls

## Response:
8/9/2026, 6:17:07 PM

````md
### Public read

The following endpoints are available without authentication:

```text
GET /api/v1/competitions
GET /api/v1/competitions/{competitionId}
GET /api/v1/seasons
GET /api/v1/seasons/{seasonId}
GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}
GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}
GET /api/v1/participants
GET /api/v1/participants/{participantId}
```

See [Public Read API](public-read.md) for filters, pagination, deterministic ordering and example responses.
````



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)