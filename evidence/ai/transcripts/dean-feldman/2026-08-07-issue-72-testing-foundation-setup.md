# Testing Foundation Setup

**User:** Anonymous  
**Created:** 8/7/2026 8:00:44  
**Updated:** 8/7/2026 8:37:48  
**Exported:** 8/7/2026 12:55:13  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a75745d-0b78-83ea-a847-0b2fc6c0e842](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a75745d-0b78-83ea-a847-0b2fc6c0e842)  

## Prompt:
8/7/2026, 8:00:40 AM

Description
Complete the shared automated testing foundation for the frontend, backend API, database and browser-level workflows.

The repository already uses Vitest, React Testing Library and Supertest. This issue must complete the supporting test environment so that feature teams can write reliable tests and Gitea Actions can run them consistently.

This issue sets up testing infrastructure. Tests for individual features must still be included in their own implementation issues.

Scope
Included
Confirm the test structure for unit, component, API integration and end-to-end tests.
Configure an isolated PostgreSQL test database.
Add commands to migrate, reset and seed the test database safely.
Create reusable test fixtures, builders or helper functions.
Configure test environment variables without committing secrets.
Configure Firebase authentication testing using an emulator or approved test doubles.
Configure browser end-to-end testing using Playwright or the team’s approved alternative.
Add test coverage reporting.
Ensure frontend, backend, database and shared-contract tests run from the repository root.
Ensure the testing commands can run in Gitea Actions.
Document where each type of test belongs and how developers run it.
Add at least one working example for each configured testing layer.
Excluded
Writing every feature test for the project.
Full Basic workflow testing.
Intermediate-scale performance testing.
Formal user testing.
Final accessibility and security audits.
Testing against the production database or production Firebase project.
Required Testing Layers
The testing foundation must support:

unit tests for statistic calculations and utility functions;
frontend component tests using React Testing Library;
backend API tests using Supertest;
database integration tests using an isolated test database;
browser end-to-end tests;
automated accessibility checks where practical;
shared contract and schema tests.
Acceptance Criteria
Unit, frontend, backend and contract tests run successfully from the repository root.
An isolated PostgreSQL test database is configured.
Test database migrations can run automatically.
The test database can be reset and seeded safely.
Tests never connect to the production database.
Reusable test fixtures or builders exist for the main domain entities.
Firebase authentication can be tested without using real user accounts.
A browser end-to-end test runner is configured.
At least one browser smoke test runs successfully.
At least one frontend component test demonstrates the approved testing pattern.
At least one backend API integration test demonstrates the approved testing pattern.
At least one database integration test demonstrates commit and rollback behaviour.
At least one shared contract or schema test demonstrates the approved testing pattern.
Test coverage can be generated using a documented command.
Gitea Actions runs the required automated tests.
Failed tests cause the CI workflow to fail.
Test credentials and secrets are not committed.
Testing documentation explains how and where to write each test type.
npm run check passes.
The work is reviewed and merged through a Pull Request.
Suggested Commands
Add or confirm commands similar to:

npm test
npm run test:unit
npm run test:frontend
npm run test:api
npm run test:database
npm run test:e2e
npm run test:coverage
npm run check
The final command names may follow the repository’s existing naming conventions.

Dependencies
Existing monorepo and workspace setup.
Existing Vitest, React Testing Library and Supertest configuration.
PostgreSQL development environment.
Firebase authentication foundation.
Gitea Actions CI workflow.
Database migration and seed tooling.
Where a dependency is not complete, coordinate with the related issue rather than duplicating its implementation.

Testing and Verification
Verify the testing foundation by running:

A frontend component test.
A backend API test.
A database integration test.
A shared contract or schema test.
A browser smoke test.
The full root test command.
npm run check.
The same test workflow through Gitea Actions.
All tests must be repeatable on another developer’s machine using the documented setup instructions.

Documentation and Evidence
Provide:

testing setup documentation;
required environment-variable examples;
test database instructions;
example tests for each configured layer;
local test output;
test coverage output;
a passing Gitea Actions run;
the linked Pull Request.
Security, Accessibility and Reliability
Security
Never use production credentials in tests.
Never run destructive test cleanup against development or production databases.
Do not commit Firebase service credentials, database passwords or access tokens.
Use clearly separated test environment variables.
Ensure test logs do not expose secrets or authentication tokens.
Accessibility
The browser and component testing setup should support automated accessibility checks for relevant frontend pages and components.

Reliability
Tests must be:

isolated;
deterministic;
repeatable;
independent of execution order;
responsible for cleaning up their own test data.
A test must not depend on data left behind by another test.

Definition of Done
This issue is complete when the team has a documented and repeatable testing environment that supports frontend, backend, database, contract and browser tests locally and in Gitea Actions.

The separate Basic vertical-slice testing issue will use this foundation to test the complete workflow:

Administrator approves submitter
        ↓
Approved submitter signs in
        ↓
Submitter uploads fixture events
        ↓
Invalid events receive useful rejection messages
        ↓
Valid events are stored with provenance
        ↓
Statistics are derived from the events
        ↓
Public users view the statistics without signing in
Project and Git Methodology
Keep this issue in Backlog until it is assigned and its dependencies are understood.

Move it to Ready once it satisfies the team’s Definition of Ready.

Create the branch from the latest main using:

test/<issue-number>-testing-foundation
Use small, meaningful commits following the approved Conventional Commit format.

Reference the issue in commit bodies using:

Refs #<issue-number>
Run all relevant tests and npm run check before opening the Pull Request.

Move the issue to In Review when the Pull Request is opened.

The Pull Request must include:

a summary of the testing infrastructure added;
testing performed;
evidence of passing local tests;
evidence of passing Gitea Actions;
known limitations;
documentation changes;
Closes #<issue-number>.
Move the issue to Done only after:

review approval;
passing CI;
required changes are addressed;
the Pull Request is merged.
Record relevant AI-assisted work in the repository AI usage register.

Include the required Assisted-by trailer in commits where AI generated or substantially modified code.

AI Declaration
The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

hhow to test that all is complet

## Response:
8/7/2026, 8:00:44 AM

> **Planning verification steps**
>
> I’m organizing testing around the rubric: build checks, interaction flows, accessibility, deployment, and documentation. I’ll include concrete commands plus manual scenarios so the user can confirm the project is complete.
>
> **Planned verification steps**
>
> 
>
> **Structuring the test plan**
>
> I’m using a table for the verification matrix and a code block for commands. I’ll cover repeatability, database safety, authentication, UI behavior, accessibility, documentation, and CI readiness without assuming particular scripts.
>
> **Structured the test plan**
>
> 
>
> Worked for 29s

## Recommended outcome

Do **not** mark this issue complete just because `npm test` is green. Treat it as complete only when you can prove, from a **fresh clone**, that every acceptance criterion works locally **and** the same workflow passes in Gitea Actions.

For this issue, I would run a formal **testing-foundation verification pass** before merging the PR.

This is worth doing carefully because automated testing is explicitly worth **10% in Milestone 2**, with the Advanced band requiring useful UI and API testing, and testing is worth **8% again in the final submission**. `project_briefs (4).pdf`

---

# 1. Start from a clean clone

This is the most important first test because the issue says:

> “All tests must be repeatable on another developer’s machine using the documented setup instructions.”

Don't verify only inside Dean's existing working directory.

On another folder/machine:

```bash
git clone https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
cd Sport-Analytics-Tool

git switch test/72-testing-foundation
```

Then:

```bash
npm ci
```

Do **not** copy over:

- `node_modules`
- `.env`
- local databases
- Playwright caches
- coverage directories

Follow only the instructions contained in the repository.

If that doesn't work, the testing foundation is not yet reproducible.

---

# 2. First inspect the available test commands

From the repository root:

```bash
npm run
```

You should see equivalents of:

```text
test
test:unit
test:frontend
test:api
test:database
test:e2e
test:coverage
check
```

They don't have to use those exact names, but all the required layers need to be runnable **from the repository root**.

Then test them individually.

```bash
npm run test:unit
npm run test:frontend
npm run test:api
npm run test:database
npm run test:e2e
npm run test:coverage
npm test
npm run check
```

Every command should exit with:

```text
exit code 0
```

If one of those commands only exists inside `frontend/` or `backend/` and cannot be invoked from the root, then that acceptance criterion is not satisfied.

---

# 3. Verify each testing layer independently

Use this as your actual acceptance matrix.

| Requirement | What you should prove | Pass condition |
|---|---|---|
| Unit tests | Run calculation/utility example | Test executes and passes |
| React component | Run RTL example | Component renders and behaviour is asserted |
| API | Run Supertest example | Request reaches Express/API handler and response is asserted |
| PostgreSQL | Run DB integration example | Real test PostgreSQL DB is used |
| DB commit/rollback | Inspect/run transaction test | Commit persists; rollback does not |
| Contracts | Run schema/Zod example | Valid data accepted and invalid data rejected |
| E2E | Run Playwright smoke test | Browser starts and page/workflow assertion passes |
| Accessibility | Run configured axe/accessibility test where provided | Accessibility runner executes successfully |
| Firebase auth | Run emulator/mock auth example | No real Firebase user/account is required |
| Coverage | Run coverage command | Coverage report is produced |
| Full suite | `npm test` | All required automated layers pass |
| Repository checks | `npm run check` | Zero failures |

For this particular issue, you don't need hundreds of tests yet. You need a **working example proving every testing mechanism works**. Feature teams then add their real feature tests in their implementation issues.

---

# 4. Test the PostgreSQL safety properly

This deserves extra attention because accidentally pointing tests at your development/production DB is one of the most dangerous failures in this issue.

First verify the test environment.

For example, your test configuration might contain something conceptually like:

```env
NODE_ENV=test
DATABASE_URL=postgresql://.../sport_analytics_test
```

Your exact naming may differ.

Run:

```bash
npm run test:database
```

Then confirm that the test database - not the normal development database - receives the temporary records.

### Test the destructive-operation guard

Your reset/migration tooling should actively refuse suspicious database names/environments.

For example, point the script at a deliberately **fake non-test database URL**, not an actual production DB:

```text
postgresql://localhost/sport_analytics
```

Then try the destructive reset command.

Expected result:

```text
ERROR: Refusing to reset non-test database
```

or equivalent.

It should abort **before executing destructive SQL**.

This directly demonstrates:

> Tests never connect to the production database.

and:

> Never run destructive test cleanup against development or production databases.

---

# 5. Test database reset → migrate → seed

You should also prove that the test DB can be rebuilt from nothing.

Whatever scripts your implementation provides, the sequence should amount to:

```text
reset
   ↓
migrate
   ↓
seed
   ↓
run tests
```

For example:

```bash
npm run test:db:reset
npm run test:db:migrate
npm run test:db:seed
npm run test:database
```

Use your actual command names.

Then run the sequence **again**.

It should work twice.

That's important because the requirement is not merely that setup works once - it needs to be deterministic and repeatable.

---

# 6. Verify the commit/rollback database test

Open the database integration example.

You want to see something equivalent to these two cases.

### Commit

```text
BEGIN
insert fixture
COMMIT

query fixture
→ fixture exists
```

### Rollback

```text
BEGIN
insert fixture
ROLLBACK

query fixture
→ fixture does NOT exist
```

Also verify that the test doesn't depend on something another test inserted earlier.

Run the database suite several times:

```bash
npm run test:database
npm run test:database
npm run test:database
```

It should pass each time.

Then, if Vitest supports it in your configuration, run tests with a different/random ordering or individually to make sure they aren't order-dependent.

---

# 7. Verify the frontend example is a real RTL test

Don't accept a meaningless test like:

```ts
expect(true).toBe(true);
```

A good infrastructure example should look conceptually like:

```tsx
render(<SomeComponent />);

expect(
  screen.getByRole("heading", { name: /something/i }),
).toBeInTheDocument();
```

Even better, demonstrate interaction:

```tsx
await user.click(screen.getByRole("button", { name: /submit/i }));

expect(...).toBe(...);
```

You're demonstrating the pattern feature teams should copy.

---

# 8. Verify the Supertest example

The backend test should actually exercise an HTTP endpoint.

Conceptually:

```ts
const response = await request(app)
  .get("/api/health")
  .expect(200);

expect(response.body).toEqual({
  status: "ok",
});
```

It should not require manually starting the backend in another terminal if your chosen Supertest structure doesn't require it.

That proves the API integration test infrastructure is genuinely usable.

This matters particularly for your project because the Sport Analytics brief explicitly says the **API is the product rather than merely an accessory to the web interface**. `sport_analytics (1).pdf`

---

# 9. Verify the shared contract/schema test

For example, if you're using Zod:

```text
valid event
→ parse succeeds

invalid event
→ parse fails with useful validation information
```

You should test both.

This foundation is especially relevant to your Sport Analytics project because submitted event data is supposed to be checked against the platform's event schema before it is accepted. `sport_analytics (1).pdf`

You aren't testing the entire upload workflow in this issue, but you are proving that the shared schema-testing mechanism works.

---

# 10. Verify Firebase without real accounts

This one is easy to accidentally fake.

When running:

```bash
npm run test:api
npm run test:e2e
```

you should **not** need:

- someone's personal Firebase account;
- production Firebase credentials;
- production service-account JSON;
- manually created test users in your live Firebase project.

You want either:

```text
Firebase Authentication Emulator
```

or approved test doubles/mocks depending on the layer.

If using the emulator, verify the test environment points to it and that shutting down or clearing the emulator doesn't leave test state affecting later runs.

A particularly useful test is:

```text
run auth test
↓
clear/restart emulator
↓
run auth test again
↓
same result
```

---

# 11. Verify Playwright from scratch

Run:

```bash
npm run test:e2e
```

If necessary, your setup documentation should tell a new developer how to install the browser binaries, e.g. through the project's documented Playwright setup.

The smoke test should do something meaningful, for example:

```text
start frontend/backend
↓
open browser
↓
navigate to app
↓
confirm expected page loads
↓
finish successfully
```

It doesn't yet need to execute your entire:

```text
Administrator approves submitter
→ login
→ upload
→ validation
→ storage
→ statistics
→ public viewing
```

workflow.

That belongs in the separate vertical-slice issue you described.

---

# 12. Test the accessibility infrastructure

Your issue says accessibility tests should be supported “where practical.”

For the foundation I would expect at least one demonstration using something such as:

```text
axe + React Testing Library
```

or:

```text
axe + Playwright
```

For example:

```text
render component/page
↓
run axe
↓
assert no accessibility violations
```

You aren't claiming a final WCAG audit at this point.

You're demonstrating that feature developers have a mechanism they can reuse.

Accessibility itself is also a compulsory course requirement, and it carries **5% in the final App rubric**. `project_briefs (4).pdf`

---

# 13. Verify coverage

Run:

```bash
npm run test:coverage
```

Then check that an actual report was produced.

Likely something such as:

```text
coverage/
coverage/index.html
coverage/lcov.info
```

depending on your configuration.

You should see numbers for things like:

```text
Statements
Branches
Functions
Lines
```

You do **not** need to claim that high coverage has already been achieved if this issue only establishes the infrastructure.

The distinction matters:

> ✅ “Coverage reporting is configured and working.”

is acceptable.

> ❌ “The project has comprehensive testing.”

would not yet be supported merely by one example per layer.

---

# 14. Test the complete root command

Now do the most important local run:

```bash
npm test
```

The complete root test should run everything that your team has defined as part of the mandatory automated suite.

Then:

```bash
npm run check
```

Both must pass.

I would capture this output for PR evidence.

Something like:

```text
Unit          PASS
Frontend      PASS
Contracts     PASS
API           PASS
Database      PASS
E2E           PASS

Tests:        XX passed
Exit code:    0
```

Use the **real output** - don't manufacture a summary like this unless it matches what actually ran.

---

# 15. Test that the CI genuinely fails when tests fail

This acceptance criterion is often overlooked:

> Failed tests cause the CI workflow to fail.

First inspect your Gitea Actions workflow for things that could hide failures.

Bad:

```yaml
run: npm test || true
```

Bad:

```yaml
continue-on-error: true
```

Bad:

```yaml
npm test
exit 0
```

You want the test step's non-zero exit code to fail the job.

The strongest proof is to make a **temporary disposable branch**, deliberately break an example test, push it, and verify Gitea Actions goes red.

For example locally alter an assertion:

```ts
expect(1).toBe(2);
```

Push the temporary branch.

Expected:

```text
Gitea Actions
❌ test job failed
```

Then delete/revert that temporary change. **Do not merge it.**

Afterwards push the correct branch again:

```text
Gitea Actions
✅ test job passed
```

That gives very strong evidence that CI is enforcing tests rather than merely executing them.

---

# 16. Verify CI starts everything it depends on

Your Gitea runner should be capable of reproducing the environment without Dean's computer.

Check that CI deals with everything required by your suite, including as applicable:

```text
npm ci
PostgreSQL test service
test environment variables
database migrations
database seed/reset
Firebase emulator/test doubles
Playwright browser installation
frontend/backend startup for E2E
unit/component/API/database/contract tests
npm run check
```

A local pass combined with a CI failure caused by “Postgres wasn't running” means the issue is **not done**.

---

# 17. Check for committed secrets

Before opening/merging the PR, run:

```bash
git status
```

and inspect the changed files:

```bash
git diff main...HEAD
```

Look specifically for:

```text
.env
.env.test
serviceAccount.json
firebase*.json containing credentials
DATABASE_URL with passwords
API keys
tokens
private keys
```

A safe repository would normally commit something like:

```text
.env.test.example
```

but not:

```text
.env.test
```

with real secrets.

Also inspect CI logs. A secret being hidden from Git but printed into Actions output is still a problem.

---

# 18. Test the fixtures/builders

You stated:

> Reusable test fixtures or builders exist for the main domain entities.

Find them and verify they aren't just dead files.

For your cricket/event model, I would expect reusable constructors/builders for entities along the lines of:

```text
competition
season
fixture
team
player
submission
event/delivery
```

depending on what has actually been implemented so far.

At least one example test should use one of these helpers.

For instance:

```ts
const fixture = buildFixture({
  status: "completed",
});
```

rather than every future test having to construct enormous hard-coded objects.

---

# 19. Verify the documentation as though you know nothing

Get another group member to follow the testing docs **without verbal help from you**.

They should be able to answer:

| Question | Docs should explain |
|---|---|
| How do I install everything? | Yes |
| What test DB do I create? | Yes |
| What environment variables do I need? | Yes |
| How do I run unit tests? | Yes |
| Where do frontend tests belong? | Yes |
| Where do API tests belong? | Yes |
| Where do DB tests belong? | Yes |
| Where do contract tests belong? | Yes |
| Where do E2E tests belong? | Yes |
| How do I reset the DB safely? | Yes |
| How does Firebase testing work? | Yes |
| How do I run coverage? | Yes |
| How does CI execute tests? | Yes |
| What should a new feature test include? | Yes |

The course rubric specifically awards **5% in Milestone 2 for Testing Documentation**, with the Advanced description asking for extensive testing documentation including automated testing procedure and testing policy. `project_briefs (4).pdf`

So this documentation isn't just nice to have - it's directly useful for marks.

---

# 20. Your final PR verification command sequence

I would have whoever owns this issue run approximately this from the repository root before requesting final review:

```bash
npm ci

npm run test:unit
npm run test:frontend
npm run test:api
npm run test:database
npm run test:e2e
npm run test:coverage

npm test
npm run check
```

Use the actual script names in your repository if they differ.

Then:

```bash
git status
```

You ideally want:

```text
nothing to commit, working tree clean
```

Coverage reports, Playwright artifacts, database files, etc. shouldn't accidentally dirty the repository unless deliberately tracked.

---

# The final sign-off I would use

Before moving **#72** to Done, I would require this table to be completely green:

| Verification | Status |
|---|---|
| Fresh clone setup works | ⬜ |
| `npm ci` works | ⬜ |
| Unit example passes | ⬜ |
| RTL component example passes | ⬜ |
| Supertest API example passes | ⬜ |
| PostgreSQL integration example passes | ⬜ |
| Commit/rollback example passes | ⬜ |
| Contract/schema example passes | ⬜ |
| Firebase test uses no real users | ⬜ |
| Playwright smoke test passes | ⬜ |
| Accessibility test support demonstrated | ⬜ |
| Test DB reset works | ⬜ |
| Test DB migration works | ⬜ |
| Test DB seed works | ⬜ |
| Non-test DB safety guard works | ⬜ |
| Fixtures/builders actually used | ⬜ |
| Coverage report generated | ⬜ |
| `npm test` passes from root | ⬜ |
| `npm run check` passes | ⬜ |
| Gitea Actions passes | ⬜ |
| Deliberately failed test makes CI fail | ⬜ |
| No secrets committed/logged | ⬜ |
| Testing documentation independently followed | ⬜ |
| PR reviewed | ⬜ |
| Reviewer comments resolved | ⬜ |
| AI register updated | ⬜ |
| AI-assisted commits attributed | ⬜ |
| PR merged into `main` | ⬜ |

Only once **every applicable box is checked** should the issue go from **In Review → Done**.

One other point: because AI-generated/substantially modified code needs attribution in the commit and the repository needs to document its AI tooling, make sure the testing-infrastructure commits have the required `Assisted-by:` trailer and the usage is captured appropriately. That's explicitly required by the COMS3011A AI policy. `ai_policy.pdf`

If you give me the **current testing-foundation branch/repository ZIP**, I can go through these acceptance criteria **one by one against the actual files** and tell you exactly which ones are ✅ complete, ⚠️ partially complete, or ❌ missing.

## Prompt:
8/7/2026, 8:07:04 AM

k give me steps
we suing supabase ad not firebase

## Prompt:
8/7/2026, 8:16:12 AM

...

## Response:
8/7/2026, 8:16:27 AM

> **Clarifying the Supabase setup**
>
> I’m adapting the testing plan from Firebase to Supabase. I’ll verify whether Supabase handles authentication, database access, or both, then define isolated tests for each area without assuming Supabase automatically provides application API endpoints.
>
> **Clarified the Supabase setup**
>
> 
>
> Worked for 19s

## Recommended outcome

Yes - replace **Firebase** in that testing issue with **Supabase**.

For your architecture, I would use:

```text
React frontend
      ↓ HTTP
Hand-written Node/Express API
      ↓
Supabase PostgreSQL

Authentication
      ↓
Supabase Auth
```

The important restriction is that your frontend must **not use Supabase's generated database API as your application API**. The brief explicitly says you must design and implement your own HTTP API and specifically lists Supabase/Firebase-generated endpoints as something you may not substitute for it. `project_briefs (4).pdf`

Here is exactly how I would verify your testing-foundation PR.

### Step 1 - Update the issue from Firebase → Supabase

Change:

```text
Configure Firebase authentication testing using an emulator or approved test doubles.
```

to:

```text
Configure Supabase authentication testing using the local Supabase development environment
or approved test doubles.
```

Change:

```text
Firebase authentication can be tested without using real user accounts.
```

to:

```text
Supabase authentication can be tested without using production user accounts
or the production Supabase project.
```

And replace references to:

```text
production Firebase project
Firebase service credentials
```

with:

```text
production Supabase project
Supabase production credentials
```

---

## Step 2 - Go to your testing branch

From the repository:

```bash
git switch test/72-testing-foundation
git pull
```

Then check where you are:

```bash
git status
```

You want to see the testing branch.

---

## Step 3 - Install everything cleanly

Run from the **repository root**:

```bash
npm ci
```

This must work.

If it doesn't, fix that before doing anything else because another developer and Gitea Actions must be able to reproduce the environment.

---

## Step 4 - See what testing commands exist

Run:

```bash
npm run
```

You should have commands equivalent to:

```text
test
test:unit
test:frontend
test:api
test:database
test:e2e
test:coverage
check
```

They don't have to have exactly those names.

### Send me the output of:

```bash
npm run
```

and I can check whether your scripts satisfy the issue.

---

## Step 5 - Run the simple tests first

Run:

```bash
npm run test:unit
```

Expected:

```text
PASS
```

Then:

```bash
npm run test:frontend
```

Expected:

```text
PASS
```

Then:

```bash
npm run test:api
```

Expected:

```text
PASS
```

Then:

```bash
npm run test:contracts
```

if that is your contract command.

If you don't have `test:contracts`, check whether it is included in another command.

At this point you want:

```text
✅ Unit
✅ React Testing Library
✅ Supertest
✅ Zod/shared contract
```

---

# Step 6 - Check your Supabase/Postgres test configuration

This one is critical.

Your normal architecture may connect to a hosted Supabase PostgreSQL database.

**Your automated tests should not use that production database.**

I recommend something like:

```text
Production
Supabase hosted PostgreSQL
        ↑
       NO
     TESTS

Testing
        ↓
isolated local PostgreSQL
```

You do **not** need to run database integration tests against your actual hosted Supabase project.

Your test config should have something conceptually like:

```env
NODE_ENV=test

DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sport_analytics_test
```

Not:

```env
DATABASE_URL=<your actual Supabase production connection string>
```

---

# Step 7 - Check `.env` safety

Run:

```bash
git status
```

Then:

```bash
git ls-files | findstr ".env"
```

On PowerShell/Windows.

You ideally want things such as:

```text
.env.example
.env.test.example
```

but **not**:

```text
.env
.env.test
```

containing real credentials.

Also inspect:

```bash
git diff main...HEAD
```

Make sure you haven't committed:

```text
Supabase database password
SUPABASE_SERVICE_ROLE_KEY
access tokens
production DATABASE_URL
JWT signing secrets
```

---

# Step 8 - Start the test PostgreSQL database

This depends on how you implemented your PR.

If you use Docker, it might be something like:

```bash
docker compose up -d postgres-test
```

or:

```bash
docker compose -f docker-compose.test.yml up -d
```

Then:

```bash
docker ps
```

You should see the test PostgreSQL container running.

**Use your actual repository command names.**

---

# Step 9 - Test database migration

Run your test migration command.

For example:

```bash
npm run test:db:migrate
```

or possibly:

```bash
npm run db:migrate:test
```

Expected:

```text
migration successful
```

Then run it again.

It should remain safe and predictable.

---

# Step 10 - Test database reset

Run:

```bash
npm run test:db:reset
```

or whatever you've called it.

It should:

```text
clear TEST database
↓
recreate schema
↓
apply migrations
```

Then run it again.

It should succeed again.

---

# Step 11 - Test database seeding

Run:

```bash
npm run test:db:seed
```

Then:

```bash
npm run test:database
```

Expected:

```text
PASS
```

Run it a second time:

```bash
npm run test:database
```

Again:

```text
PASS
```

This helps prove tests aren't dependent on garbage left over from the previous run.

---

# Step 12 - Test the database safety guard

This is one of the most important tests.

Your destructive database reset script should refuse to operate on a non-test database.

For example, your code might check that the database name ends in:

```text
_test
```

or that:

```text
NODE_ENV=test
```

and an explicit test DB marker exist.

The important behaviour is:

```text
test DB
→ reset allowed

normal/prod DB
→ reset REFUSED
```

Don't test this against your real Supabase database.

Use a fake/local URL such as:

```text
postgresql://localhost/sport_analytics
```

and make sure the script stops **before connecting destructively**.

---

# Step 13 - Test the database transaction example

Run:

```bash
npm run test:database
```

Look for the example required by your issue:

### Commit

```text
BEGIN
↓
INSERT
↓
COMMIT
↓
record exists
```

### Rollback

```text
BEGIN
↓
INSERT
↓
ROLLBACK
↓
record does not exist
```

Both should be tested.

---

# Step 14 - Test Supabase Auth

Because you're using Supabase rather than Firebase, the auth requirement becomes:

```text
Tests must not create/use real production users.
```

There are two acceptable approaches.

**Preferred for integration/E2E:** local Supabase Auth.

Conceptually:

```text
Supabase local stack
       ↓
local Auth
       ↓
test user
       ↓
your handwritten API
```

**For unit/API tests:** approved test doubles/mocks for verified Supabase identity.

You do not need every API test to boot an entire Supabase environment.

The important thing is that this should **never require someone's actual Supabase account or production user**.

---

# Step 15 - Check that auth still goes through YOUR backend

This is important because of the project rules.

Something like this is okay:

```text
Browser
   ↓
Supabase Auth
   ↓ token
Browser
   ↓ Authorization: Bearer ...
YOUR Express API
   ↓ validates identity
Supabase PostgreSQL
```

But don't build this:

```text
React
 ↓
Supabase autogenerated database API
 ↓
Database
```

as the core application API.

That would conflict with the handwritten-API requirement in the official brief. `project_briefs (4).pdf`

---

# Step 16 - Test the frontend example

Run:

```bash
npm run test:frontend
```

Open the example test as well.

It should test something real with React Testing Library, for example:

```ts
render(<Component />);

expect(
  screen.getByRole("heading")
).toBeInTheDocument();
```

Even better if it uses:

```ts
userEvent
```

to interact with the component.

Not just:

```ts
expect(true).toBe(true);
```

---

# Step 17 - Test your Supertest API example

Run:

```bash
npm run test:api
```

The example should actually send a request to your API.

Something like:

```ts
await request(app)
  .get("/api/health")
  .expect(200);
```

This demonstrates that feature teams can write proper API tests.

This is particularly important for this project because the Sport Analytics brief says the API is the platform's product, including access to fixtures, events and derived statistics. `sport_analytics (1).pdf`

---

# Step 18 - Test your shared event schema

Run your contract tests:

```bash
npm run test:contracts
```

You want an example proving:

```text
valid cricket event
→ accepted

invalid cricket event
→ rejected
```

This will later be crucial because your actual project brief requires submissions to be validated against the event schema and rejected with useful errors when invalid. `sport_analytics (1).pdf`

---

# Step 19 - Run Playwright

Run:

```bash
npm run test:e2e
```

You want at least one browser smoke test.

For now it can be simple:

```text
start application
      ↓
open browser
      ↓
visit homepage
      ↓
page loads
      ↓
expected content exists
```

Expected:

```text
1 passed
```

You don't yet need the complete submitter → event → statistics workflow in this infrastructure issue.

---

# Step 20 - Check accessibility support

Your issue says the infrastructure should support accessibility testing.

You should have something like:

```text
axe
```

used with either:

```text
React Testing Library
```

or:

```text
Playwright
```

At least one example should demonstrate:

```text
page/component
      ↓
accessibility scan
      ↓
no detected violations
```

This is useful beyond the issue because accessibility is a compulsory project requirement. `project_briefs (4).pdf`

---

# Step 21 - Generate coverage

Run:

```bash
npm run test:coverage
```

Expected output should include something like:

```text
Statements
Branches
Functions
Lines
```

And usually generate:

```text
coverage/
```

Don't worry if coverage percentage isn't huge yet.

This issue is establishing the **coverage infrastructure**.

Feature issues will increase actual coverage later.

---

# Step 22 - Run absolutely everything

Now from the root:

```bash
npm test
```

This must pass.

Then:

```bash
npm run check
```

This must also pass.

You want:

```text
✅ npm test
✅ npm run check
```

---

# Step 23 - Test from a fresh clone

Now do the best reproducibility test.

In another directory:

```bash
git clone https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git testing-clean
cd testing-clean

git switch test/72-testing-foundation

npm ci
```

Follow only the README/testing documentation.

Then run:

```bash
npm test
npm run check
```

If you need secret knowledge from Dean's existing PC to make it work, the documentation/setup isn't complete yet.

---

# Step 24 - Check Gitea Actions

Push the branch:

```bash
git push
```

Go to:

```text
Gitea
→ Actions
→ latest workflow
```

Everything must be green.

You want:

```text
✅ dependencies
✅ test database
✅ migrations
✅ tests
✅ check
```

---

# Step 25 - Prove CI fails on a broken test

This is worth doing once.

Make a temporary branch:

```bash
git switch -c test/ci-failure-check
```

Temporarily change a test to:

```ts
expect(1).toBe(2);
```

Commit and push it.

The Action should go:

```text
❌ FAILED
```

Then delete/revert that temporary branch/change.

That proves:

> failed tests cause CI to fail.

---

# Step 26 - Final completion check

Before merging #72/#77, I would require:

```text
[ ] npm ci
[ ] unit test
[ ] frontend component test
[ ] Supertest API test
[ ] PostgreSQL integration test
[ ] transaction commit test
[ ] transaction rollback test
[ ] contract/schema test
[ ] Supabase auth test without production users
[ ] Playwright smoke test
[ ] accessibility example
[ ] database reset
[ ] database migration
[ ] database seed
[ ] destructive DB safety protection
[ ] coverage generated
[ ] npm test
[ ] npm run check
[ ] clean-clone test
[ ] Gitea Actions passes
[ ] failed test makes Gitea fail
[ ] no secrets committed
[ ] testing docs accurate
[ ] PR reviewed
[ ] AI attribution recorded
```

And **update the issue itself from Firebase to Supabase before closing it**, otherwise your evidence and acceptance criteria won't match what you actually implemented.

The AI policy also requires AI-generated/substantially modified code commits to contain the `Assisted-by:` attribution, so keep that on the testing-foundation commits. `ai_policy.pdf`

### Do this first now

Run these **three commands and paste me the entire output**:

```bash
git status
npm run
git diff --stat main...HEAD
```

Then I'll take you through the testing **one command at a time** and tell you exactly what is ✅ complete and what still needs fixing.

## Prompt:
8/7/2026, 8:19:14 AM

[Attachment: Pasted text.txt]

## Response:
8/7/2026, 8:19:17 AM

> **Reviewing implementation gaps**
>
> I’m checking whether the changes truly satisfy the acceptance criteria. The main concern is that the default root test command may skip database and end-to-end suites, while two zero-byte files appear accidentally added; I’d investigate those before merging.
>
> **Reviewed implementation gaps**
>
> 
>
> Worked for 15s

## Recommended outcome

Your testing foundation looks **structurally close to complete**, but I would **not merge it yet**. Your output confirms the branch is clean and has commands for unit, frontend, API, database, contracts, E2E, coverage, CI and `check`. It also shows database safety tests, transaction tests, builders, Playwright, accessibility tests and testing documentation. `Pasted text.txt`

There are two things I want to investigate immediately:

1. `npm test` currently does **not** run database or E2E tests; `npm run test:ci` does.
2. Your diff contains two suspicious zero-byte entries named `npm` and `sport-analytics-tool@0.1.0`. Those may be accidental files and should probably not be committed. `Pasted text.txt`

We'll verify this in stages rather than running everything blindly.

### Step 1 - Check the suspicious files

Run these from the repo root:

```bash
ls -la npm sport-analytics-tool@0.1.0 2>/dev/null
```

Then:

```bash
git diff --name-status main...HEAD
```

And:

```bash
git ls-files npm sport-analytics-tool@0.1.0
```

Paste the output.

If those are accidental empty files, we'll remove them before merge.

### Step 2 - Check for Firebase references

Because you're actually using **Supabase**, we need to make sure this testing branch hasn't accidentally documented Firebase.

Run:

```bash
grep -Rni --exclude-dir=node_modules --exclude-dir=.git "firebase" .
```

Then:

```bash
grep -Rni --exclude-dir=node_modules --exclude-dir=.git "supabase" \
  apps/backend docs tests .gitea package.json
```

Paste both outputs.

We want the testing docs and auth test infrastructure to say **Supabase**, not Firebase.

### Step 3 - Check the environment-variable setup

Run:

```bash
cat apps/backend/.env.example
```

Then:

```bash
cat .gitignore
```

Then check tracked environment files:

```bash
git ls-files | grep -E '(^|/)\.env($|\.)'
```

We need to establish:

```text
✅ example values are committed
✅ real secrets are ignored
✅ test database is clearly separated
✅ production Supabase credentials are not used for tests
```

### Step 4 - Install cleanly

After those checks, run:

```bash
npm ci
```

If it succeeds, do:

```bash
npm run test:unit
```

Then:

```bash
npm run test:frontend
```

Then:

```bash
npm run test:api
```

Then:

```bash
npm run test:contracts
```

Don't run the database/E2E suite yet-we'll first inspect how your test database is configured so there is no chance of touching your hosted Supabase database.

### One issue I can already see

Your current scripts are:

```text
npm test
    ↓
unit
frontend
api
contracts
```

while:

```text
npm run test:ci
    ↓
npm test
database
e2e
```

That's not inherently wrong, but your issue explicitly talks about verifying **“the full root test command.”** I think you should document:

```text
npm test
= fast/default automated tests

npm run test:ci
= complete test suite including PostgreSQL + Playwright
```

Alternatively, and probably cleaner for this issue, make `npm test` represent the complete suite and introduce `test:fast` for the quicker set. We can decide once we see the CI workflow.

### Do these now

Just send me the output of these five commands:

```bash
ls -la npm sport-analytics-tool@0.1.0 2>/dev/null

git ls-files npm sport-analytics-tool@0.1.0

grep -Rni --exclude-dir=node_modules --exclude-dir=.git "firebase" .

cat apps/backend/.env.example

git ls-files | grep -E '(^|/)\.env($|\.)'
```

Then I'll tell you exactly what to fix, if anything, before we actually run the PostgreSQL/Supabase tests.

## Prompt:
8/7/2026, 8:20:27 AM

> Paste the output

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ ls -la npm sport-analytics-tool@0.1.0 2>/dev/null
-rwxrwxrwx 1 dean dean 0 Aug  6 19:57 npm
-rwxrwxrwx 1 dean dean 0 Aug  6 19:57 sport-analytics-tool@0.1.0
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git diff --name-status main...HEAD
M       .gitea/workflows/ci.yml
M       .gitignore
M       apps/backend/.env.example
M       apps/backend/package.json
A       apps/backend/scripts/reset-test-database.ts
A       apps/backend/scripts/seed-test-database.ts
A       apps/backend/scripts/test-database-safety.ts
A       apps/backend/tests/auth/token-verifiers.ts
A       apps/backend/tests/database/transaction.database.test.ts
A       apps/backend/tests/fixtures/domain-builders.ts
A       apps/backend/tests/unit/domain-builders.test.ts
A       apps/backend/tests/unit/test-database-safety.test.ts
M       apps/frontend/src/test/setup.ts
M       apps/frontend/tsconfig.app.json
M       docs/database/schema.md
M       docs/development/testing.md
M       evidence/ai/ai-usage-register.csv
A       npm
M       package-lock.json
M       package.json
M       packages/contracts/package.json
A       packages/contracts/src/tests/health.test.ts
A       playwright.config.ts
A       sport-analytics-tool@0.1.0
A       tests/e2e/accessibility.spec.ts
A       tests/e2e/smoke.spec.ts
Invalid mark letter �  (press RETURN)
[2]+  Stopped                 git diff --name-status main...HEAD
[200~git ls-files npm sport-analytics-tool@0.1.0^[[201~^C^C
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git ls-files npm sport-analytics-tool@0.1.0
npm
sport-analytics-tool@0.1.0
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
8/7/2026, 8:20:38 AM

> **Cleaning tracked artifacts**
>
> I’ve confirmed the files are empty and already tracked. I’m removing only those specific files, then I’ll verify the diff and commit the cleanup. Since this isn’t generated code, the AI trailer may not be necessary unless the project requires it for every assisted change.
>
> **Cleaned tracked artifacts**
>
> 
>
> Worked for 12s

## Recommended outcome

We found a real issue: **both `npm` and `sport-analytics-tool@0.1.0` are accidental empty files and are currently tracked by Git.** They should be removed before the PR is merged.

The `Invalid mark letter` / stopped `git diff` message is just the terminal pager getting confused by pasted control characters; it isn't a repository problem.

### Step 1 — Remove the accidental files

Run:

```bash
git rm -- npm sport-analytics-tool@0.1.0
```

Then:

```bash
git status
```

You should see roughly:

```text
deleted: npm
deleted: sport-analytics-tool@0.1.0
```

Do **not commit yet**. We'll check the remaining testing setup first and then make a clean commit.

### Step 2 — Check for Firebase references

Because you're actually using Supabase, run:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  "firebase" .
```

If it prints nothing, great.

Then run:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  "supabase" apps/backend docs tests .gitea package.json
```

### Step 3 — Check the test environment configuration

Run:

```bash
cat apps/backend/.env.example
```

Then:

```bash
git ls-files | grep -E '(^|/)\.env($|\.)'
```

Then:

```bash
cat .gitignore
```

### Send me these four outputs

```bash
git status
```

```bash
grep -Rni --exclude-dir=node_modules --exclude-dir=.git "firebase" .
```

```bash
cat apps/backend/.env.example
```

```bash
git ls-files | grep -E '(^|/)\.env($|\.)'
```

After that we'll verify the **database safety setup before running any database tests**, because I want to make absolutely sure your test scripts cannot touch the hosted Supabase database.

## Prompt:
8/7/2026, 8:22:35 AM

[Attachment: Pasted text.txt]

## Response:
8/7/2026, 8:22:39 AM

> **Planning next checks**
>
> I’m reviewing the repository evidence and noticing the main integration is Supabase rather than Firebase. I’ll verify environment-file handling, database isolation, authentication tests, and migration behavior before recommending the smallest next step.
>
> **Planned next checks**
>
> 
>
> Worked for 22s

## Recommended outcome

The environment setup looks mostly correct. We have **three checks passed** already:

- ✅ `.env` is **not tracked by Git** - only `.env.example` files are tracked.
- ✅ Supabase is clearly the active authentication provider.
- ✅ Production/dev credentials are separated from the committed examples. `Pasted text.txt`

There are two things to fix/verify before running database tests.

First, the accidental `npm` and `sport-analytics-tool@0.1.0` files were successfully removed. The second `git rm` failed only because they were already gone - that's fine.

Second, your pasted `.env.example` ended with:

```text
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/sport_analytics_
```

That might just be the shell prompt joining onto the line, but we need to confirm the actual value ends in something clearly test-only such as:

```text
sport_analytics_test
```

### Step 1 - Check the test database URL exactly

Run:

```bash
tail -n 8 apps/backend/.env.example
```

We want to see:

```env
# Dedicated isolated test database.
# This must never point to the development or production database.
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/sport_analytics_test
```

A separate database in the same local PostgreSQL server is fine for this foundation. The important part is that the database itself is isolated and the destructive scripts refuse non-test URLs.

### Step 2 - Check your database safety implementation

Before we execute anything destructive, show me these files:

```bash
cat apps/backend/scripts/test-database-safety.ts
```

```bash
cat apps/backend/scripts/reset-test-database.ts
```

```bash
cat apps/backend/scripts/seed-test-database.ts
```

And:

```bash
cat apps/backend/package.json
```

I want to check that:

```text
DATABASE_URL_TEST
       ↓
safety validation
       ↓
must clearly be a TEST database
       ↓
reset/migrate/seed allowed
```

and not:

```text
DATABASE_URL
       ↓
accidentally reset development/Supabase
```

### Step 3 - Check CI's database configuration

Run:

```bash
cat .gitea/workflows/ci.yml
```

The Supabase values you showed in CI are fake test placeholders, which is good. `Pasted text.txt`

But we need to check whether Gitea Actions also starts PostgreSQL and gives it an isolated test database.

### Step 4 - Check auth tests

Your output already shows this promising structure:

```text
apps/backend/tests/auth/token-verifiers.ts
apps/backend/tests/auth.test.ts
apps/backend/tests/test-app.ts
```

and `test-app.ts` uses fake Supabase configuration. `Pasted text.txt`

Now run:

```bash
cat apps/backend/tests/auth/token-verifiers.ts
```

and:

```bash
sed -n '1,140p' apps/backend/tests/auth.test.ts
```

We want to confirm automated tests inject a fake token verifier instead of contacting the hosted Supabase Auth service.

That would satisfy the revised requirement:

> Supabase authentication can be tested without production user accounts.

### About the Firebase references

You **do not need to remove every word “Firebase” from the repository**.

Your docs have legitimate comparison/history references such as:

```text
Supabase Auth | Firebase Authentication | Auth0
```

and:

```text
Firebase Authentication is therefore not part of the current runtime architecture
```

Those are fine. `Pasted text.txt`

What would be bad is executable testing configuration that still tries to run a Firebase emulator. So later we'll use a more targeted search instead of scanning generated coverage files.

### One security observation

Your local:

```text
apps/backend/.env
```

contains the real Supabase project configuration. That's expected for local development, and Git is correctly ignoring it. `git ls-files` confirms it isn't committed. `Pasted text.txt`

Keep these rules:

```text
✅ SUPABASE_URL                 local env / deployment config
✅ publishable key              intended for public-client use
❌ database password            never commit
❌ service_role / secret key    never commit
❌ OAuth client secret          never commit
❌ user access tokens           never commit/log
```

## Do these now

Paste the output of these **six commands**:

```bash
tail -n 8 apps/backend/.env.example

cat apps/backend/scripts/test-database-safety.ts

cat apps/backend/scripts/reset-test-database.ts

cat apps/backend/scripts/seed-test-database.ts

cat apps/backend/package.json

cat .gitea/workflows/ci.yml
```

Don't run `test:database` yet. Once I check those, we'll safely run **reset → migrate → seed → transaction tests** and tick off the database acceptance criteria one by one.

## Prompt:
8/7/2026, 8:25:21 AM

> Before we execute anything destructive, show me these files:

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cat apps/backend/scripts/test-database-safety.ts
export function assertSafeTestDatabase(
  testDatabaseUrl: string | undefined,
  developmentDatabaseUrl: string | undefined,
  nodeEnvironment: string | undefined,
): URL {
  if (nodeEnvironment !== 'test') {
    throw new Error('Test database commands require NODE_ENV=test.');
  }

  if (!testDatabaseUrl) {
    throw new Error('DATABASE_URL_TEST is required.');
  }

  if (developmentDatabaseUrl && testDatabaseUrl === developmentDatabaseUrl) {
    throw new Error('DATABASE_URL_TEST must not match DATABASE_URL.');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(testDatabaseUrl);
  } catch {
    throw new Error('DATABASE_URL_TEST must be a valid URL.');
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL_TEST must use the PostgreSQL protocol.');
  }

  const databaseName = parsedUrl.pathname.replace(/^\//, '').toLowerCase();

  if (!databaseName.includes('test')) {
    throw new Error('The test database name must contain "test".');
  }

  return parsedUrl;
}
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cat apps/backend/scripts/reset-test-database.ts
import { spawn } from 'node:child_process';

import { Client } from 'pg';

import { assertSafeTestDatabase } from './test-database-safety';

async function runMigrations(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'npx',
      [
        'node-pg-migrate',
        'up',
        '--database-url-var',
        'DATABASE_URL_TEST',
        '--migrations-dir',
        '../../database/migrations',
        '--ignore-pattern',
        'README.md',
      ],
      {
        cwd: new URL('..', import.meta.url),
        env: process.env,
        shell: process.platform === 'win32',
        stdio: 'inherit',
      },
    );

    child.once('error', reject);

    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Migration process exited with code ${code}.`));
    });
  });
}

async function resetTestDatabase(): Promise<void> {
  const databaseUrl = assertSafeTestDatabase(
    process.env.DATABASE_URL_TEST,
    process.env.DATABASE_URL,
    process.env.NODE_ENV,
  );

  const client = new Client({
    connectionString: databaseUrl.toString(),
  });

  try {
    await client.connect();

    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
  } finally {
    await client.end();
  }

  await runMigrations();
}

resetTestDatabase().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown database reset error.');
  process.exitCode = 1;
});
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cat apps/backend/scripts/seed-test-database.ts
import { Client } from 'pg';

import { assertSafeTestDatabase } from './test-database-safety';

async function seedTestDatabase(): Promise<void> {
  const databaseUrl = assertSafeTestDatabase(
    process.env.DATABASE_URL_TEST,
    process.env.DATABASE_URL,
    process.env.NODE_ENV,
  );

  const client = new Client({
    connectionString: databaseUrl.toString(),
  });

  try {
    await client.connect();

    await client.query(
      `
        UPDATE database_health
        SET note = $1
        WHERE id = 1
      `,
      ['Test database seeded.'],
    );
  } finally {
    await client.end();
  }
}

seedTestDatabase().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown database seed error.');
  process.exitCode = 1;
});
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cat apps/backend/package.json
{
  "name": "@sport-analytics/backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint src tests --ext .ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:api": "vitest run tests/api tests/auth.test.ts tests/health.test.ts",
    "test:database": "vitest run tests/database",
    "test:coverage": "vitest run --coverage",
    "db:check": "tsx --env-file=.env scripts/check-connection.ts",
    "db:ingest": "tsx --env-file=.env scripts/ingest-match.ts",
    "db:validate": "tsx --env-file=.env scripts/validate-match.ts",
    "db:migrate": "cross-env NODE_EXTRA_CA_CERTS=certs/supabase-ca.crt node-pg-migrate up --envPath .env --migrations-dir ../../database/migrations --ignore-pattern \"README.md\" --reject-unauthorized true",
    "db:migrate:down": "cross-env NODE_EXTRA_CA_CERTS=certs/supabase-ca.crt node-pg-migrate down --envPath .env --migrations-dir ../../database/migrations --ignore-pattern \"README.md\" --reject-unauthorized true",
    "db:migrate:dry": "cross-env NODE_EXTRA_CA_CERTS=certs/supabase-ca.crt node-pg-migrate up --envPath .env --migrations-dir ../../database/migrations --ignore-pattern \"README.md\" --reject-unauthorized true --dry-run",
    "db:migrate:create": "node-pg-migrate create --migrations-dir ../../database/migrations --ignore-pattern \"README.md\" --migration-filename-format utc -j sql",
    "db:test:migrate": "cross-env NODE_ENV=test node-pg-migrate up --database-url-var DATABASE_URL_TEST --envPath .env.test --migrations-dir ../../database/migrations --ignore-pattern \"README.md\"",
    "db:test:reset": "cross-env NODE_ENV=test tsx --env-file=.env.test scripts/reset-test-database.ts",
    "db:test:seed": "cross-env NODE_ENV=test tsx --env-file=.env.test scripts/seed-test-database.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.112.1",
    "cors": "^2.8.5",
    "dotenv": "^17.4.2",
    "express": "^4.21.1",
    "helmet": "^8.0.0",
    "pg": "^8.22.0",
    "pino-http": "^10.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.9.0",
    "@types/pg": "^8.20.4",
    "@types/supertest": "^6.0.2",
    "cross-env": "^10.1.0",
    "node-pg-migrate": "^9.0.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "vitest": "^2.1.4"
  }
}
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
8/7/2026, 8:25:31 AM

> **Reviewing test setup**
>
> I’m checking the scripts for destructive behavior, environment loading, migration consistency, and reliable seeding. The main concern is that the reset guard may still allow wiping an unintended database under certain naming conditions.
>
> **Reviewed test setup**
>
> 
>
> Worked for 11s

Good — I’ve checked the destructive database code. **It is reasonably protected, so we can proceed, but I want one final environment check before actually resetting anything.**

Your current protection does three useful things:

- requires `NODE_ENV=test`;
- requires `DATABASE_URL_TEST`;
- refuses when `DATABASE_URL_TEST === DATABASE_URL`;
- requires the database name itself to contain `"test"`.

So a URL such as:

```text
postgresql://postgres:postgres@localhost:5432/sport_analytics_test
```

is allowed, while your normal:

```text
.../sport_analytics
```

would be rejected.

That is a good foundation.

One small hardening improvement I would recommend later is refusing remote hosts for destructive reset commands unless an explicit override is supplied. That would make it even harder to accidentally reset a hosted PostgreSQL database. But you don't need to stop testing now.

## Step 1 — Confirm the actual test URL

Run:

```bash
tail -n 5 apps/backend/.env.example
```

Then check whether you already have a local ignored test environment:

```bash
ls -la apps/backend/.env.test
```

If it exists, **do not paste the whole file if it contains secrets**. Instead run:

```bash
grep -E '^(NODE_ENV|DATABASE_URL_TEST)=' apps/backend/.env.test
```

We want something like:

```text
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/sport_analytics_test
```

We specifically do **not** want a Supabase-hosted URL here.

---

## Step 2 — Run the database safety unit tests first

This has no destructive database effect:

```bash
npm run test:unit
```

Your branch contains:

```text
apps/backend/tests/unit/test-database-safety.test.ts
```

so this should exercise the safety function before we touch PostgreSQL.

Expected:

```text
PASS
```

If that fails, stop there and paste the output.

---

## Step 3 — Verify PostgreSQL is actually available locally

Run:

```bash
psql --version
```

and:

```bash
pg_isready
```

If you're using Docker instead:

```bash
docker ps
```

We need an isolated local PostgreSQL server.

If `pg_isready` says something like:

```text
localhost:5432 - accepting connections
```

we can continue.

---

## Step 4 — Check whether the test database exists

Assuming the URL is:

```text
postgresql://postgres:postgres@localhost:5432/sport_analytics_test
```

run:

```bash
psql -U postgres -h localhost -lqt | cut -d \| -f 1 | grep sport_analytics_test
```

If nothing appears, create it:

```bash
createdb -U postgres -h localhost sport_analytics_test
```

This creates a completely separate local database.

Your structure should therefore be:

```text
Local PostgreSQL
│
├── sport_analytics
│   └── development
│
└── sport_analytics_test
    └── automated tests
```

Your hosted Supabase PostgreSQL database is not involved.

---

## Step 5 — Make sure `.env.test` exists

Your scripts explicitly expect:

```text
apps/backend/.env.test
```

because you have:

```json
"db:test:reset": "cross-env NODE_ENV=test tsx --env-file=.env.test scripts/reset-test-database.ts"
```

and:

```json
"db:test:migrate": "... --envPath .env.test ..."
```

So from `apps/backend/`, `.env.test` needs to exist locally.

If it doesn't, create:

```bash
nano apps/backend/.env.test
```

with something like:

```env
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/sport_analytics_test
```

You don't actually need to put:

```env
NODE_ENV=test
```

in there because your npm scripts already force it.

Your `.gitignore` correctly ignores `.env.test`, so don't commit it.

---

## Step 6 — Run migration only

Before resetting anything, test migrations:

```bash
npm run db:test:migrate --workspace=@sport-analytics/backend
```

Expected:

```text
Applying migrations...
...
Migration complete
```

or equivalent.

Then run it again:

```bash
npm run db:test:migrate --workspace=@sport-analytics/backend
```

It should say there are no new migrations or otherwise succeed cleanly.

That proves:

> ✅ Test database migrations can run automatically.

---

## Step 7 — Now test the reset

Once the URL is confirmed to be the local `sport_analytics_test` DB:

```bash
npm run db:test:reset --workspace=@sport-analytics/backend
```

Your code will do:

```text
assertSafeTestDatabase()
        ↓
connect to DATABASE_URL_TEST
        ↓
DROP SCHEMA public CASCADE
        ↓
CREATE SCHEMA public
        ↓
run all migrations
```

That is exactly the sort of deterministic reset this issue needs.

Then run it **again**:

```bash
npm run db:test:reset --workspace=@sport-analytics/backend
```

Both runs should succeed.

---

## Step 8 — Seed it

Then:

```bash
npm run db:test:seed --workspace=@sport-analytics/backend
```

One thing I noticed in your seed script:

```sql
UPDATE database_health
SET note = $1
WHERE id = 1
```

That works only if `database_health.id = 1` already exists.

So after running the seed, check:

```bash
psql -U postgres -h localhost -d sport_analytics_test
```

Then:

```sql
SELECT * FROM database_health;
```

You should see:

```text
Test database seeded.
```

Then quit:

```text
\q
```

If no row exists, then the seed script isn't truly seeding anything — it's just updating an existing row. In that case we should change it to an `INSERT ... ON CONFLICT` implementation.

---

## Step 9 — Run the database integration test

Now:

```bash
npm run test:database
```

Your branch contains:

```text
apps/backend/tests/database/transaction.database.test.ts
```

so we want to see the transaction test pass.

Specifically it should prove:

```text
BEGIN
INSERT
COMMIT
→ data remains
```

and:

```text
BEGIN
INSERT
ROLLBACK
→ data disappears
```

Expected overall:

```text
PASS
```

---

## Step 10 — Deliberately test the safety guard

We also want proof that destructive commands refuse bad configuration.

You already have automated safety tests, so first rely on those rather than manually risking anything.

Run:

```bash
npm run test:unit
```

and verify there are cases for:

```text
NODE_ENV != test
→ rejected

DATABASE_URL_TEST missing
→ rejected

DATABASE_URL_TEST == DATABASE_URL
→ rejected

database name doesn't contain "test"
→ rejected
```

That gives you direct evidence for:

> ✅ Tests never connect destructively to development/production databases.

---

## One improvement I recommend before final merge

Your current check:

```ts
if (!databaseName.includes('test')) {
```

is decent, but something called:

```text
production_test_backup
```

would still pass.

I'd eventually strengthen it to require a deliberate suffix, for example:

```ts
if (!databaseName.endsWith('_test')) {
  throw new Error('The test database name must end with "_test".');
}
```

Then:

```text
sport_analytics_test     ✅
sport_analytics           ❌
production_test_backup    ❌
```

That's clearer and safer.

I'd also consider blocking remote database hosts for `db:test:reset`, since your intended automated test DB is local/CI PostgreSQL.

---

### Do only these three things now

Run:

```bash
grep -E '^(NODE_ENV|DATABASE_URL_TEST)=' apps/backend/.env.test
```

```bash
npm run test:unit
```

```bash
pg_isready
```

Paste those outputs. Then we'll do the actual **migration → reset → seed → database integration test** in that order.

## Prompt:
8/7/2026, 8:33:10 AM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ npm run test:coverage

> sport-analytics-tool@0.1.0 test:coverage
> npm run test:coverage --workspaces --if-present


> @sport-analytics/backend@0.1.0 test:coverage
> vitest run --coverage


 RUN  v2.1.9 /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/backend
      Coverage enabled with v8

 · tests/auth.test.ts (3)
 ❯ tests/database/transaction.database.test.ts (1)
   ❯ PostgreSQL transaction behaviour (1)
     ⠏ [ beforeAll ]
     ↓ rolls back changes made inside a transaction [skip
ped]
     ⠏ [ afterAll ]
 ✓ tests/unit/test-database-safety.test.ts (6)
 ❯ tests/health.test.ts (1)
   ❯ GET /api/v1/health (1)
     ⠙ returns the API health state
 ✓ tests/unit/domain-builders.test.ts (1)
{"level":30,"time":1786084367437,"pid":31204,"hostname":"Leonard","req":{"id":1,"method":"GET","url":"/api/v1/health","query":{},"params":{},"headers":{"host":"127.0.0.1:33185","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":51550},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-policy":"same-origin","cross-origin-resource-policy":"same-origin","origin-agent-cluster":"?1","referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff","x-dns-prefetch-control":"off","x-download-options":"noopen","x-frame-options":"SAMEORIGIN","x-permitted-cross-domain-policies":"none","x-xss-protection":"0","vary":"Origin","access-control-allow-credentials":"true","content-type":"application/json; charset=utf-8","content-length":"86","etag":"W/\"56-Lt954whrSbltPPa6dUWERwj1PcA\""}},"responseTime":5,"msg":"request completed"}
{"level":30,"time":1786084367439,"pid":31195,"hostname":"Leonard","req":{"id":1,"method":"GET","url":"/api/v1/auth/me","query":{},"params":{},"headers":{"host":"127.0.0.1:34393","accept-encoding":"gzip, deflate","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":36360},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests","cross-origin-opener-po
 ❯ tests/auth.test.ts (3)
   ❯ GET /api/v1/auth/me (3)
     ⠙ rejects a request without a bearer token
     · rejects a token that cannot be validated
     · returns the verified identity for a valid token
 ❯ tests/database/transaction.database.test.ts (1)
   ❯ PostgreSQL transaction behaviour (1)
     ⠋ [ beforeAll ]
     ↓ rolls back changes made inside a transaction [skip
ped]
     ⠋ [ afterAll ]
 ✓ tests/unit/test-database-safety.test.ts (6)
 ❯ tests/health.test.ts (1)
   ❯ GET /api/v1/health (1)
     ⠹ returns the API health state
 ✓ tests/unit/domain-builders.test.ts (1)
{"level":30,"time":1786084367452,"pid":31195,"hostname":"Leonard","req":{"id":1,"method":"GET","url":"/api/v1/auth/me","query":{},"params":{},"headers":{"host":"127.0.0.1:35525","accept-encoding":"gzip, deflate","authorization":"[Redacted]","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":53202},"res":{"statusCode":401,"headers":{"content-security-policy":"default-src 'self';
 ❯ tests/auth.test.ts (3)
   ❯ GET /api/v1/auth/me (3)
     ⠹ rejects a request without a bearer token
     · rejects a token that cannot be validated
     · returns the verified identity for a valid token
 ❯ tests/database/transaction.database.test.ts (1)
   ❯ PostgreSQL transaction behaviour (1)
     ⠙ [ beforeAll ]
     ↓ rolls back changes made inside a transaction [skip
ped]
     ⠙ [ afterAll ]
 ✓ tests/unit/test-database-safety.test.ts (6)
 ❯ tests/health.test.ts (1)
   ❯ GET /api/v1/health (1)
     ⠸ returns the API health state
 ✓ tests/unit/domain-builders.test.ts (1)
{"level":30,"time":1786084367459,"pid":31195,"hostname":"Leonard","req":{"id":1,"method":"GET","url":"/api/v1/auth/me","query":{},"params":{},"headers":{"host":"127.0.0.1:39531","accept-encoding":"gzip, deflate","authorization":"[Redacted]","connection":"close"},"remoteAddress":"::ffff:127.0.0.1","remotePort":33560},"res":{"statusCode":200,"headers":{"content-security-policy":"default-src 'self';
 ✓ tests/auth.test.ts (3)
 ✓ tests/health.test.ts (1)
 ❯ tests/database/transaction.database.test.ts (1)
   ❯ PostgreSQL transaction behaviour (1)
     ⠹ [ beforeAll ]
     ↓ rolls back changes made inside a transaction [skipped]
     ⠹ [ afterAll ]
 ✓ tests/unit/domain-builders.test.ts (1)
 ✓ tests/unit/test-database-safety.test.ts (6)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/database/transaction.database.test.ts > PostgreSQL transaction behaviour
Error: DATABASE_URL_TEST is required.
 ❯ Module.assertSafeTestDatabase scripts/test-database-safety.ts:11:11
      9| 
     10|   if (!testDatabaseUrl) {
     11|     throw new Error('DATABASE_URL_TEST is requi…
       |           ^
     12|   }
     13| 
 ❯ tests/database/transaction.database.test.ts:10:25

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/database/transaction.database.test.ts > PostgreSQL transaction behaviour
TypeError: Cannot read properties of undefined (reading 'end')
 ❯ tests/database/transaction.database.test.ts:24:18
     22| 
     23|   afterAll(async () => {
     24|     await client.end();
       |                  ^
     25|   });
     26| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed | 4 passed (5)
      Tests  11 passed | 1 skipped (12)
   Start at  08:32:37
   Duration  7.74s (transform 1.45s, setup 0ms, collect 11.89s, tests 154ms, environment 1ms, prepare 7.31s)

npm error Lifecycle script `test:coverage` failed with error:
npm error code 1
npm error path /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/backend
npm error workspace @sport-analytics/backend@0.1.0
npm error location /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/backend
npm error command failed
npm error command sh -c vitest run --coverage

dean@Leonard:

## Response:
8/7/2026, 8:33:21 AM

> **Fixing coverage setup**
>
> I’m tracing the failure to database tests requiring environment variables that coverage doesn’t load. I’m weighing whether to exclude integration tests from default coverage or configure a test database, with the documented command remaining reliable.
>
> **Fixed coverage setup**
>
> 
>
> Worked for 10s

## Recommended outcome

This failure is useful: **your coverage setup is not complete yet.** The command is accidentally picking up the PostgreSQL integration test, but `test:coverage` does not load `DATABASE_URL_TEST`.

The good news is that your ordinary backend tests are passing:

```text
✅ auth tests: 3
✅ health test: 1
✅ database safety tests: 6
✅ domain builder test: 1
❌ database transaction suite: environment not configured
```

There is also a small bug in the transaction test cleanup: when `beforeAll` fails, `client` never gets created, but `afterAll` still calls `client.end()`.

I recommend **keeping database integration tests separate from the normal coverage command**. You already have `npm run test:database` specifically for the real PostgreSQL tests. Coverage should be easy to generate without requiring every developer to have PostgreSQL running.

### Step 1 - Fix the transaction-test cleanup

Open:

```bash
nano apps/backend/tests/database/transaction.database.test.ts
```

You probably currently have something similar to:

```ts
let client: Client;

beforeAll(async () => {
  // create client
});

afterAll(async () => {
  await client.end();
});
```

Change the declaration and cleanup to:

```ts
let client: Client | undefined;

afterAll(async () => {
  if (client) {
    await client.end();
  }
});
```

Do **not** change the actual transaction test behaviour.

This fixes the secondary:

```text
Cannot read properties of undefined (reading 'end')
```

error.

---

## Step 2 - Make backend coverage exclude DB integration tests

Your current script is:

```json
"test:coverage": "vitest run --coverage"
```

That discovers **everything**, including:

```text
tests/database/transaction.database.test.ts
```

Change it to cover the ordinary backend testing layers while leaving PostgreSQL integration to `test:database`.

In:

```bash
nano apps/backend/package.json
```

change:

```json
"test:coverage": "vitest run --coverage"
```

to:

```json
"test:coverage": "vitest run --coverage tests/unit tests/api tests/auth.test.ts tests/health.test.ts"
```

So your testing responsibilities become:

```text
test:coverage
├── backend unit tests
├── backend API tests
├── auth API tests
└── health API tests

test:database
└── real isolated PostgreSQL integration tests
```

That is a clean separation for this issue.

Your root coverage command already uses all workspaces, so the frontend/contracts workspaces can generate their own coverage as applicable.

---

## Step 3 - Run coverage again

Now run:

```bash
npm run test:coverage
```

We want it to complete without attempting:

```text
transaction.database.test.ts
```

At the end you should get a coverage table resembling:

```text
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|--------
All files             | ...
```

It does **not matter yet if the percentages are low**. This issue requires the coverage mechanism to work, not comprehensive feature coverage.

---

## Step 4 - Verify the report exists

After it passes:

```bash
find . -maxdepth 4 -type f \( -name "index.html" -o -name "lcov.info" \) | grep coverage
```

You should find generated coverage artifacts.

They must remain untracked because your `.gitignore` already ignores `coverage/`.

Check:

```bash
git status
```

Coverage files should **not** appear.

---

## Step 5 - Now configure the DB test separately

The original failure:

```text
Error: DATABASE_URL_TEST is required.
```

is actually the desired safety behaviour. Your script correctly refused to guess a database.

Now check:

```bash
ls -la apps/backend/.env.test
```

If you get:

```text
No such file or directory
```

create it:

```bash
nano apps/backend/.env.test
```

with:

```env
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/sport_analytics_test
```

Only use that if your local PostgreSQL really runs on that host/port with those credentials.

Do **not** put your Supabase-hosted database URL there.

---

## Step 6 - One more improvement to the issue

Your coverage failure revealed a useful distinction that should be documented in `docs/development/testing.md`:

```text
npm run test:coverage
```

generates coverage for the unit/component/API/contract suites.

```text
npm run test:database
```

runs PostgreSQL integration tests against the dedicated isolated test database.

That makes it explicit why coverage does not automatically connect to PostgreSQL.

---

## Step 7 - Save this as evidence

Your failed run is actually useful engineering evidence, but the evidence you ultimately attach to the PR should be the **fixed passing run**.

Do not claim:

> Coverage passed.

until you've rerun it successfully.

The course AI policy also makes the team responsible for checking AI-assisted work rather than merely accepting generated code, so finding and correcting this kind of issue is exactly the verification you should preserve. `ai_policy.pdf`

### Do this now

Make the **two code changes** above, then run:

```bash
npm run test:coverage
```

and:

```bash
git status
```

Paste both outputs. Then we'll tick off **coverage ✅** and move directly onto the isolated PostgreSQL test.

## Prompt:
8/7/2026, 8:34:51 AM

> You probably currently have something similar to:
> 
> TypeScript
> 
>     let client: Client;
>     
>     beforeAll(async () => {
>       // create client
>     });
>     
>     afterAll(async () => {
>       await client.end();
>     }

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

describe('PostgreSQL transaction behaviour', () => {
  let client: Client | undefined;

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );

    client = new Client({
      connectionString: databaseUrl.toString(),
    });

    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  test('rolls back changes made inside a transaction', async () => {
    const originalResult = await client.query<{
      note: string;
    }>(
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(originalResult.rowCount).toBe(1);

    const originalNote = originalResult.rows[0].note;
    const temporaryNote = 'Temporary transaction test value.';

    await client.query('BEGIN');

    try {
      await client.query(
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [temporaryNote],
      );

      const insideTransaction = await client.query<{
        note: string;
      }>(
        `
          SELECT note
          FROM database_health
          WHERE id = 1
        `,
      );

      expect(insideTransaction.rows[0].note).toBe(temporaryNote);
    } finally {
      await client.query('ROLLBACK');
    }

    const afterRollback = await client.query<{
      note: string;
    }>(
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(afterRollback.rows[0].note).toBe(originalNote);
  });
});

## Response:
8/7/2026, 8:35:03 AM

> **Reviewing database tests**
>
> I’m identifying the main gaps: the current test covers rollback but not commit, and the nullable client can cause TypeScript errors. I’ll provide a corrected example with safe setup, cleanup, and explicit commit/rollback coverage.
>
> **Reviewed database tests**
>
> 
>
> Worked for 7s

## Recommended outcome

Yes — your file is already using:

```ts
let client: Client | undefined;
```

so the declaration is correct. The problem is specifically here:

```ts
afterAll(async () => {
  await client.end();
});
```

Because `beforeAll()` can fail before assigning `client`, `afterAll()` must guard against `undefined`.

Also, your current test only proves **rollback**. Your issue explicitly requires the database integration example to demonstrate **commit and rollback behaviour**, so I would fix both at once.

Replace the file with this:

```ts
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

describe('PostgreSQL transaction behaviour', () => {
  let client: Client | undefined;

  function getClient(): Client {
    if (!client) {
      throw new Error('Test database client has not been initialised.');
    }

    return client;
  }

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );

    client = new Client({
      connectionString: databaseUrl.toString(),
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  test('rolls back changes made inside a transaction', async () => {
    const databaseClient = getClient();

    const originalResult = await databaseClient.query<{
      note: string;
    }>(
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(originalResult.rowCount).toBe(1);

    const originalNote = originalResult.rows[0].note;
    const temporaryNote = 'Temporary rollback test value.';

    await databaseClient.query('BEGIN');

    try {
      await databaseClient.query(
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [temporaryNote],
      );

      const insideTransaction = await databaseClient.query<{
        note: string;
      }>(
        `
          SELECT note
          FROM database_health
          WHERE id = 1
        `,
      );

      expect(insideTransaction.rows[0].note).toBe(temporaryNote);
    } finally {
      await databaseClient.query('ROLLBACK');
    }

    const afterRollback = await databaseClient.query<{
      note: string;
    }>(
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(afterRollback.rows[0].note).toBe(originalNote);
  });

  test('commits changes made inside a transaction', async () => {
    const databaseClient = getClient();

    const originalResult = await databaseClient.query<{
      note: string;
    }>(
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(originalResult.rowCount).toBe(1);

    const originalNote = originalResult.rows[0].note;
    const committedNote = 'Temporary commit test value.';

    try {
      await databaseClient.query('BEGIN');

      await databaseClient.query(
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [committedNote],
      );

      await databaseClient.query('COMMIT');

      const afterCommit = await databaseClient.query<{
        note: string;
      }>(
        `
          SELECT note
          FROM database_health
          WHERE id = 1
        `,
      );

      expect(afterCommit.rows[0].note).toBe(committedNote);
    } finally {
      // Restore the original value so this test leaves no data behind.
      await databaseClient.query(
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [originalNote],
      );
    }
  });
});
```

### Why this is better

The first fix prevents the secondary error you saw:

```text
Cannot read properties of undefined (reading 'end')
```

because cleanup now does:

```ts
if (client) {
  await client.end();
}
```

The `getClient()` helper also avoids sprinkling unsafe `client!` assertions throughout the test.

More importantly, you now prove both required behaviours:

```text
ROLLBACK test
BEGIN
→ UPDATE
→ confirm temporary value exists inside transaction
→ ROLLBACK
→ confirm original value remains
```

and:

```text
COMMIT test
BEGIN
→ UPDATE
→ COMMIT
→ confirm new value remains
→ restore original value
```

The final restoration is important for your reliability requirement: **the test cleans up its own changes and doesn't leave state behind for another test.**

### Then make the coverage change

In `apps/backend/package.json`, change:

```json
"test:coverage": "vitest run --coverage"
```

to:

```json
"test:coverage": "vitest run --coverage tests/unit tests/api tests/auth.test.ts tests/health.test.ts"
```

That prevents the coverage command from accidentally trying to run the real PostgreSQL integration suite without `DATABASE_URL_TEST`.

Then run:

```bash
npm run test:coverage
```

If that passes, run:

```bash
git status
```

Paste the coverage output next. After that we'll configure and run the real isolated database test separately.

## Prompt:
8/7/2026, 8:37:30 AM

help commit

## Response:
8/7/2026, 8:37:36 AM

## Recommended outcome

Make this a small **testing fix commit**: remove the accidental empty files, fix the DB transaction test cleanup/commit coverage, and fix coverage so it does not accidentally require PostgreSQL.

First check exactly what is currently modified:

```bash
git status
```

Then stage only the files involved in this fix:

```bash
git add \
  apps/backend/tests/database/transaction.database.test.ts \
  apps/backend/package.json
```

The accidental files were removed with `git rm`, so their deletions should already be staged. Confirm with:

```bash
git status
```

You should see roughly:

```text
modified:   apps/backend/package.json
modified:   apps/backend/tests/database/transaction.database.test.ts
deleted:    npm
deleted:    sport-analytics-tool@0.1.0
```

Before committing, run the non-database checks that are safe right now:

```bash
npm run test:unit
npm run test:api
npm run test:coverage
```

If those pass, commit with:

```bash
git commit -m "test: fix testing foundation coverage and database cleanup" \
  -m "Exclude PostgreSQL integration tests from the standard coverage run, make transaction test cleanup safe when setup fails, add commit behaviour coverage, and remove accidental empty files." \
  -m "Refs #72" \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"
```

That attribution is appropriate because AI substantially helped modify the testing code, and the COMS3011A policy requires an `Assisted-by:` declaration for AI-generated code. `ai_policy.pdf`

Then push:

```bash
git push
```

Finally confirm:

```bash
git status
git log -1 --format=full
```

You want a clean working tree and the commit message to include:

```text
Refs #72

Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]
```

After that, continue with the isolated PostgreSQL test setup before considering the PR complete.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)