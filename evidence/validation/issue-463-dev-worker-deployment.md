# Issue #463 — Dev batch worker deployment

**Date:** 10 September 2026
**Issue:** #463 — Provision dev batch worker and Service Bus pipeline

## Problem observed

Deployed batch submissions remained in `stored` state with zero accepted and rejected items because the development Azure environment did not contain the asynchronous batch worker or Service Bus queue required to process queued `batch.validate` jobs.

## Root cause

The worker implementation, infrastructure-as-code and deployment workflow already existed in the repository, but the worker infrastructure had not been provisioned in the development Azure environment.

The first live deployment also exposed deployment-path defects that were corrected during #463:

- the Gitea runner did not provide Azure CLI;
- cross-scope Bicep resource references prevented role-assignment deployment;
- the generated Service Bus namespace used a reserved suffix;
- Azure Container Registry Tasks were unavailable on the subscription, so image construction was moved to the Gitea runner and pushed to ACR;
- the active-revision health query returned no value because the JMESPath projection selected the first result incorrectly;
- health verification now waits for the deployed revision to become healthy.

## Deployment verification

Observed Azure development resources:

- resource group: `rg-statsthegame-dev`;
- worker Container App: `statsthegame-dev-batch-worker`;
- Service Bus queue: `batch-ingestion`;
- private staged Blob container: `staged-ingestion`;
- RBAC-enabled Key Vault containing the worker database reference;
- Azure Container Registry;
- managed worker runtime and image-pull identities.

Active worker revision verification:

```text
Health: Healthy
Running: Running
Replicas: 1
```

Hosted worker deployment workflow:

**Status:** PASS

The manual `deploy-worker.yml` workflow completed successfully from commit `88fb35e` on the Issue #463 branch. The workflow provisioned the worker infrastructure, built and pushed the worker image to Azure Container Registry, deployed the Container App revision and verified the active revision as healthy.

Independent Azure verification also reported:

```text
Health: Healthy
Running: Running
Replicas: 1
```

## Functional verification

### New valid batch

**Expected:** `Stored` → `Awaiting review`

**Observed:** PENDING

### Existing stored batch recovery

**Expected:** An existing batch with a pending `batch.validate` job/outbox command and an available staged source object is processed without resubmission.

**Observed:** PENDING

### Administrator review queue

**Expected:** The resulting `Awaiting review` batch is visible in the global administrator review queue.

**Observed:** PENDING

### Outbox and queue processing

**Expected:** Worker evidence shows outbox relay activity and successful `batch.validate` queue processing.

**Observed:** PENDING

## Acceptance decision

**PENDING.**

Issue #463 remains open until the hosted deployment workflow is green and the functional verification above is completed.

## AI Declaration

The preceding validation record was prepared with the assistance of ChatGPT-Web[GPT-5.6 Sol] and reviewed by the student before submission.
