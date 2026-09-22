# Production-scale deployment acceptance

Issue #565 defines the repeatable acceptance procedure for a deployed dataset release under a
representative corpus. It is an operator-run development/stable-environment exercise, not a CI job:
it needs a real administrator session, an already deployed API/frontend/worker and Azure telemetry.
The runner never accepts credentials on the command line and no result or secret belongs in Git until
the operator has reviewed it.

## Corpus and preconditions

Generate the entirely fictional deterministic corpus with 300 fixtures and 72,000 deliveries:

```powershell
npm.cmd run data:performance:generate -- --fixtures 300 --output data/performance/issue-565-representative-t20
```

The generated `manifest.json` records the fixture count, 240 deliveries per fixture and total delivery
count. Keep the generation command, manifest checksum and committed application SHA in the result. Do
not use the generated corpus as a substitute for the established production-scale canonical dataset
release; the latter must be exercised against a deployed environment with a fresh release version.

Before the run, confirm that the deployed frontend points to the deployed API, the frontend origin is
listed in the backend CORS configuration, an administrator can obtain a short-lived access token, and
the worker is healthy. The backend and worker deployment guides remain authoritative for environment,
identity and queue configuration.

## Automated HTTP acceptance

Set values only in the current PowerShell process. Use a fresh, stable release version for each full
run so the API must return an asynchronous `202` job rather than an existing immutable release.

```powershell
$env:PRODUCTION_ACCEPTANCE_API_BASE_URL = 'https://<api-fqdn>/api/v1'
$env:PRODUCTION_ACCEPTANCE_FRONTEND_URL = 'https://<frontend-host>'
$env:PRODUCTION_ACCEPTANCE_ADMIN_TOKEN = '<short-lived administrator access token>'
$env:PRODUCTION_ACCEPTANCE_RELEASE_VERSION = '2026.09.21-issue-565-<run>'
npm.cmd run verify:production-scale-deployment -- --output evidence/sprints/sprint-3/issue-565-live-result.json
Remove-Item Env:PRODUCTION_ACCEPTANCE_ADMIN_TOKEN
```

The runner fails unless it observes all of the following:

- `/health` returns the expected API identity and allows the deployed frontend origin through CORS;
- a database-backed public competition read and authenticated `/auth/me` request succeed;
- the frontend returns the application title;
- `POST /admin/dataset-releases` returns an asynchronous generation job;
- the job reaches `completed`, with a public fixture read sampled while it is `generating`;
- public release metadata and artifact retrieval succeed; and
- the SHA-256 of the downloaded artifact equals the published checksum.

The JSON output records the release version, event count, checksum and measured public-read durations.
It deliberately does not print the bearer token or API response bodies. A rerun that only verifies an
already published release must set `PRODUCTION_ACCEPTANCE_ALLOW_EXISTING_RELEASE=true`; it is not
evidence of a full asynchronous generation run.

## Recovery and duplicate-publication exercise

Run this only against the approved non-production acceptance environment. Start a fresh release,
wait until the job reports `generating`, then use the documented worker restart procedure in
[Azure Batch Worker](azure-worker.md). Record the worker revision, timestamp, job ID and safe worker
logs. Let the worker restart and complete the same release version.

The acceptance record must show that the job recovered to `completed`, the release metadata/artifact
remain retrievable, and the final version/checksum has one immutable publication. The worker's durable
lease, checkpoint and conflict-safe insert path are covered by its focused automated tests; the live
restart is evidence that the deployed queue, identity and storage path recover together. Do not kill
or restart a production worker merely to manufacture acceptance evidence.

## Azure availability and capacity evidence

While the job is generating, capture a single time window covering the worker run from the API and
worker Container Apps. Record:

- API and worker active revision health, replica count and restart/failure events;
- API and worker CPU and memory charts, including peak/average and the time range;
- HTTP failed-request/platform-error observations and any Azure outage/status evidence;
- the runner's public-read timings and any failed read; and
- the safe worker progress logs for the release job.

Use the Azure Portal Metrics/Log Analytics views or the team's approved Azure CLI queries; export or
screenshot only non-secret data. The evidence must name the exact resource group, revision and UTC
time range, but never include connection strings, tokens, storage keys or database URLs.

Copy the observed results into
`evidence/sprints/sprint-3/issue-565-production-scale-deployment-acceptance.md`. That file starts as
a template and must remain explicit about any unrun live step.

## Local contract coverage

The live runner itself is covered without contacting Azure:

```powershell
node --test tests/deployment/production-scale-acceptance.test.mjs
```

It verifies the release progression, foreground availability sample and checksum mismatch failure.
It does not claim live Azure capacity, a deployed browser journey, worker restart or outage evidence.

## AI Declaration

This procedure and the associated runner were generated and reviewed with the assistance of
Codex[GPT-5]. Live deployment, Azure telemetry and recovery observations must be recorded only after
an operator performs them.
