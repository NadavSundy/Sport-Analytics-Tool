# Create bug issue

**User:** Anonymous  
**Created:** 9/18/2026 16:24:18  
**Updated:** 9/19/2026 9:51:39  
**Exported:** 9/21/2026 14:36:20  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aad4991-80bc-83e9-ae70-5b892a2ee6c7](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aad4991-80bc-83e9-ae70-5b892a2ee6c7)  

## Prompt:
9/18/2026, 4:24:18 PM

![034b5019-c2f7-4274-9719-8462acf56c51.png](https://chatgpt.com/backend-api/estuary/content?id=file_000000009b6c82118c1376492c6dc1e9&ts=497220&p=fs&cid=1&sig=93de868f7a4d78e05f3594fa49646394f33ee3f883b0ab0b1ce7429ed55a48e2&v=0)

make an issue for this

## Response:
9/18/2026, 4:24:24 PM

# Bug: Dataset releases page fails to load due to `500 Internal Server Error`

```md
## Bug Summary

The **Dataset releases** page cannot load any dataset releases in the deployed application.

The frontend displays:

> **Dataset releases could not be loaded**  
> An unexpected server error occurred.

Browser DevTools shows that the request to the backend `dataset-releases` endpoint returns:

`500 Internal Server Error`

This prevents users from viewing or downloading published dataset releases.

---

## Steps to Reproduce

1. Open the deployed Stat'sTheGame application.
2. Navigate to **Downloads**.
3. Wait for the **Dataset releases** page to load.
4. Observe the error message.
5. Open browser DevTools → **Console** or **Network**.
6. Observe the request to the `dataset-releases` endpoint.

---

## Actual Behaviour

- Dataset releases are not displayed.
- The page enters its error state.
- The backend request returns **HTTP 500**.
- Clicking **Try again** repeats the failed request.

Console evidence:

```text
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
.../dataset-releases
```

---

## Expected Behaviour

The `dataset-releases` endpoint should successfully return the available published dataset releases.

The Downloads page should display each release and its available metadata/download options.

If no releases exist, the API should return a valid empty response and the UI should display an appropriate empty state rather than a server error.

---

## Investigation Scope

Determine why the deployed backend fails when handling the dataset releases request.

Check:

- backend logs for the failing request;
- database/query failures;
- missing production migrations or tables;
- missing environment/configuration values;
- object-storage configuration;
- release metadata/schema assumptions;
- behaviour when zero dataset releases exist;
- differences between local/test and deployed environments.

The frontend should **not** be modified merely to hide the backend failure.

---

## Acceptance Criteria

- [ ] `GET` dataset releases endpoint no longer returns `500` during normal operation.
- [ ] An environment containing zero releases returns a valid successful empty response.
- [ ] Existing releases are returned correctly.
- [ ] The Downloads page renders returned releases successfully.
- [ ] **Try again** successfully recovers after a transient failure.
- [ ] Backend failures remain handled by the existing user-visible error state.
- [ ] Regression tests cover the discovered failure condition.
- [ ] API/integration tests cover both zero-release and populated-release responses.
- [ ] Fix is verified against the deployed environment.
- [ ] Relevant backend logs/evidence are attached to the issue or PR.

---

## Priority

**High**

This breaks the public dataset-release workflow and prevents users from accessing published analytical datasets.

## Evidence

Screenshot captured from the deployed application showing the Dataset releases failure and `500 Internal Server Error`.
```

**Suggested title:** `Bug: Dataset releases endpoint returns 500 and prevents Downloads page loading`

This is worth treating as **High priority**, because versioned dataset releases are explicitly part of the Sport Analytics Tool requirements, rather than just a cosmetic Downloads feature. `sport_analytics (1).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/18/2026, 4:25:13 PM

give it to me as a code

## Response:
9/18/2026, 4:25:18 PM

```md
# Bug: Dataset releases endpoint returns 500 and prevents Downloads page loading

## Bug Summary

The **Dataset releases** page cannot load any dataset releases in the deployed application.

The frontend displays:

> **Dataset releases could not be loaded**  
> An unexpected server error occurred.

Browser DevTools shows that the request to the backend `dataset-releases` endpoint returns:

`500 Internal Server Error`

This prevents users from viewing or downloading published dataset releases.

---

## Steps to Reproduce

1. Open the deployed Stat'sTheGame application.
2. Navigate to **Downloads**.
3. Wait for the **Dataset releases** page to load.
4. Observe the error message.
5. Open browser DevTools → **Console** or **Network**.
6. Observe the request to the `dataset-releases` endpoint.

---

## Actual Behaviour

- Dataset releases are not displayed.
- The page enters its error state.
- The backend request returns **HTTP 500**.
- Clicking **Try again** repeats the failed request.

Console evidence:

```text
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
.../dataset-releases
```

---

## Expected Behaviour

The `dataset-releases` endpoint should successfully return the available published dataset releases.

The Downloads page should display each release and its available metadata/download options.

If no releases exist, the API should return a valid empty response and the UI should display an appropriate empty state rather than a server error.

---

## Investigation Scope

Determine why the deployed backend fails when handling the dataset releases request.

Check:

- Backend logs for the failing request.
- Database/query failures.
- Missing production migrations or tables.
- Missing environment/configuration values.
- Object-storage configuration.
- Release metadata/schema assumptions.
- Behaviour when zero dataset releases exist.
- Differences between local/test and deployed environments.

The frontend should **not** be modified merely to hide the backend failure.

---

## Acceptance Criteria

- [ ] `GET` dataset releases endpoint no longer returns `500` during normal operation.
- [ ] An environment containing zero releases returns a valid successful empty response.
- [ ] Existing releases are returned correctly.
- [ ] The Downloads page renders returned releases successfully.
- [ ] **Try again** successfully recovers after a transient failure.
- [ ] Backend failures remain handled by the existing user-visible error state.
- [ ] Regression tests cover the discovered failure condition.
- [ ] API/integration tests cover both zero-release and populated-release responses.
- [ ] Fix is verified against the deployed environment.
- [ ] Relevant backend logs/evidence are attached to the issue or PR.

---

## Priority

**High**

This breaks the public dataset-release workflow and prevents users from accessing published analytical datasets.

---

## Evidence

Screenshot captured from the deployed application showing:

- `Dataset releases could not be loaded`
- `An unexpected server error occurred`
- `500 (Internal Server Error)` for the `dataset-releases` request

---

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.
```

## Prompt:
9/18/2026, 4:25:35 PM

download file

## Response:
9/18/2026, 4:25:50 PM

[Download the issue Markdown file](sandbox:/mnt/data/bug-dataset-releases-500.md)

## Prompt:
9/19/2026, 9:26:10 AM

[Logo](https://sdp.ms.wits.ac.za/) ([image](https://sdp.ms.wits.ac.za/assets/img/logo.svg))[Issues](https://sdp.ms.wits.ac.za/issues)[Pull Requests](https://sdp.ms.wits.ac.za/pulls)[Milestones](https://sdp.ms.wits.ac.za/milestones)[Explore](https://sdp.ms.wits.ac.za/explore/repos)

[svg](https://sdp.ms.wits.ac.za/notifications)

svg

[**git-push-pray**](https://sdp.ms.wits.ac.za/git-push-pray)**/**[**Sport-Analytics-Tool**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool)

**Internal**

[svgCode](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/)[**svgIssues27**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues)[svgPull Requests](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[svgActions](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[svgPackages](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/packages)[svgProjects](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[**2**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[svgReleases](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/releases)[svgWiki](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/wiki)[svgActivity](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/activity)[svgSettings](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/settings)

# Bug: Dataset releases page fails to load due to 500 Internal Server Error #676

**svgOpen**

opened 17 hours ago by [Dean](https://sdp.ms.wits.ac.za/Dean) · 0 comments

[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=80))

[**Dean**](https://sdp.ms.wits.ac.za/Dean) commented [17 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#issue-3410)

**Member**

# [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#bug-dataset-releases-endpoint-returns-500-and-prevents-downloads-page-loading)Bug: Dataset releases endpoint returns 500 and prevents Downloads page loading

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#bug-summary)Bug Summary

The **Dataset releases** page cannot load any dataset releases in the deployed application.

The frontend displays:

> **Dataset releases could not be loaded**
> An unexpected server error occurred.

Browser DevTools shows that the request to the backend `dataset-releases` endpoint returns:

`500 Internal Server Error`

This prevents users from viewing or downloading published dataset releases.

---

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#steps-to-reproduce)Steps to Reproduce

1. Open the deployed Stat'sTheGame application.
2. Navigate to **Downloads**.
3. Wait for the **Dataset releases** page to load.
4. Observe the error message.
5. Open browser DevTools → **Console** or **Network**.
6. Observe the request to the `dataset-releases` endpoint.

---

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#actual-behaviour)Actual Behaviour

- Dataset releases are not displayed.
- The page enters its error state.
- The backend request returns **HTTP 500**.
- Clicking **Try again** repeats the failed request.

Console evidence:

```text
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
.../dataset-releases

```

---

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#expected-behaviour)Expected Behaviour

The `dataset-releases` endpoint should successfully return the available published dataset releases.

The Downloads page should display each release and its available metadata/download options.

If no releases exist, the API should return a valid empty response and the UI should display an appropriate empty state rather than a server error.

---

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#investigation-scope)Investigation Scope

Determine why the deployed backend fails when handling the dataset releases request.

Check:

- Backend logs for the failing request.
- Database/query failures.
- Missing production migrations or tables.
- Missing environment/configuration values.
- Object-storage configuration.
- Release metadata/schema assumptions.
- Behaviour when zero dataset releases exist.
- Differences between local/test and deployed environments.

The frontend should **not** be modified merely to hide the backend failure.

---

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#acceptance-criteria)Acceptance Criteria

- `GET` dataset releases endpoint no longer returns `500` during normal operation.
- An environment containing zero releases returns a valid successful empty response.
- Existing releases are returned correctly.
- The Downloads page renders returned releases successfully.
- **Try again** successfully recovers after a transient failure.
- Backend failures remain handled by the existing user-visible error state.
- Regression tests cover the discovered failure condition.
- API/integration tests cover both zero-release and populated-release responses.
- Fix is verified against the deployed environment.
- Relevant backend logs/evidence are attached to the issue or PR.

---

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#priority)Priority

**High**

This breaks the public dataset-release workflow and prevents users from accessing published analytical datasets.

---

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#evidence)Evidence

[image.png](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/attachments/9ef54a0d-51e8-4e17-877b-a6f5e38188bd)
Screenshot captured from the deployed application showing:

- `Dataset releases could not be loaded`
- `An unexpected server error occurred`
- `500 (Internal Server Error)` for the `dataset-releases` request

---

Tool: ChatGPT Web | Model: GPT-5.6 Thinking

[svg ](https://sdp.ms.wits.ac.za/attachments/9ef54a0d-51e8-4e17-877b-a6f5e38188bd "Click to see \"image.png\" in a new tab")[**image.png**](https://sdp.ms.wits.ac.za/attachments/9ef54a0d-51e8-4e17-877b-a6f5e38188bd "Click to see \"image.png\" in a new tab")

128 KiB

svg[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=56)) [**Dean**](https://sdp.ms.wits.ac.za/Dean) added the 

[**bug**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=1)

 label 17 hours ago

svg[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=56)) [**Dean**](https://sdp.ms.wits.ac.za/Dean) added this to the **Sport Analytics - Bug Tracker** project 17 hours ago

svg[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=56)) [**Dean**](https://sdp.ms.wits.ac.za/Dean) added the 

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**severity: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=223)

 labels 17 hours ago

svg[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=56)) [**Dean**](https://sdp.ms.wits.ac.za/Dean) self-assigned this 1 minute ago

[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=80))

**Write**Preview

Drop files or click here to upload.

[**bug**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=1)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**severity: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=223)

No Milestone

[svgSport Analytics - Bug Tracker](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/32)

[DeanDean](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/676#) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=40))

**1 Participants**

[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=40))

**Notifications**

**Due Date**

No due date set.

**Dependencies**

No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#676

[Powered by Gitea](https://about.gitea.com/)Version: 1.24.7 Page:**109ms**Template:**22ms**

[Licenses](https://sdp.ms.wits.ac.za/assets/licenses.txt)[API](https://sdp.ms.wits.ac.za/api/swagger)

help me with this

## Response:
9/19/2026, 9:26:14 AM

> **Investigating the endpoint**
>
> I’m narrowing this to deployment, routing, authentication, or a backend exception. I’ll verify the live URL, inspect recent container logs, and compare the deployed environment variables with the application’s expected configuration.
>
> **Investigated the endpoint**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 30s

Treat this as a **backend/deployment bug first**. Do not change the frontend error handling until we know why the deployed `dataset-releases` request is throwing `500`.

### 1. Reproduce it while watching the backend logs

Open **Terminal 1**:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

RESOURCE_GROUP="rg-statsthegame-dev"
CONTAINER_APP="statsthegame-dev-api"

az containerapp logs show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_APP" \
  --type console \
  --follow
```

Leave that running.

Now open the deployed site and go to **Downloads**, or press **Try again**.

The important thing is the backend stack trace that appears in Terminal 1. That should tell us whether this is a database, storage, environment, validation, or code-path problem.

### 2. Also inspect the request directly

In Chrome DevTools → **Network** → click the failed `dataset-releases` request → copy the full **Request URL**.

Then:

```bash
DATASET_URL="PASTE_FULL_REQUEST_URL_HERE"

curl -i "$DATASET_URL"
```

If the endpoint requires no authentication, this should reproduce the same `500` independently of React.

### 3. Check deployed configuration without exposing secrets

Run:

```bash
RESOURCE_GROUP="rg-statsthegame-dev"
CONTAINER_APP="statsthegame-dev-api"

az containerapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_APP" \
  --query "properties.template.containers[0].env[].{Name:name,SecretRef:secretRef}" \
  -o table
```

Also check the revisions:

```bash
az containerapp revision list \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_APP" \
  -o table
```

Don't paste actual secret values here. Environment variable **names** and `secretRef` names are enough.

### 4. Locate the dataset release implementation locally

Run this from the repo root:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

rg -n \
  "dataset-releases|dataset releases|datasetReleases|DatasetRelease|dataset_release" \
  apps packages docs
```

Also:

```bash
rg -n \
  "dataset.*release|release.*dataset" \
  apps/backend packages docs/api
```

And check the OpenAPI definition:

```bash
rg -n -C 15 "dataset-releases" docs/api/openapi.yaml
```

The OpenAPI contract should remain the source of truth while fixing this. Don't alter the API response just to make the test pass.

### 5. What we're looking for

The backend log will probably put the failure into one of these categories:

| Log/error | Fix direction |
|---|---|
| `relation ... does not exist`, missing column/table | Deployment database is missing a migration |
| storage/container/blob error | Object-storage configuration or secret is missing/wrong |
| `Cannot read properties of undefined/null` | Empty dataset-release state isn't handled |
| Zod/schema/serialization error | DB → API response mapping violates contract |
| connection refused/authentication failed | Deployed DB/storage credentials/configuration |
| only production fails, local passes | Deployment/configuration/migration divergence |

The issue specifically requires a successful empty state as well as populated releases, so if the bug is something like this:

```ts
const latest = releases[0];

return {
  releases,
  schemaVersion: latest.schemaVersion,
};
```

then an empty database would produce a server exception. The correct fix would be in the service/repository serialization path, with a regression test-not a frontend workaround.

### TDD approach for #676

Before modifying production code, add a regression test reproducing the actual failure.

The minimum cases should be:

```text
RED
1. zero releases -> endpoint returns the documented successful empty response
2. one or more releases -> endpoint returns the documented releases
3. repository/storage failure -> endpoint returns the documented server error response

GREEN
Implement the smallest backend fix that makes those tests pass.

REFACTOR
Remove any duplicated guards/error handling and retain the OpenAPI response contract.

VERIFY
Backend unit/integration tests
Contract tests
Lint
Typecheck
Local endpoint
Deployed endpoint
```

This is important for the project because versioned dataset snapshots with schema/field descriptions/checksums are explicitly an Intermediate Sport Analytics requirement. `sport_analytics (1).pdf`

**Send me the output from the Azure log command immediately after clicking `Try again`.** From that stack trace I can tell you the exact file/code to change rather than guessing.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:29:10 AM

https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net/api/v1/dataset-releases

[Attachment: Pasted text.txt]

## Response:
9/19/2026, 9:29:10 AM

> **Diagnosing deployment mismatch**
>
> I’m comparing the URL with the logs: the URL uses Azure App Service, while the command monitors Azure Container Apps. The logs may be healthy but belong to a different deployment.
>
> **Diagnosed deployment mismatch**
>
> 
>
> **Searching the web**
>
> 
>
> **Checking Azure API Endpoint Response**
>
>
> **Checked Azure API endpoint response**
>
> 
>
> Worked for 38s

That URL identifies the key problem: **the frontend is calling an Azure App Service API, but the logs you were watching are from the Azure Container App.** So the logs you pasted are for the wrong backend instance. `Pasted text.txt`

You currently have two different API hosts:

```text
Frontend request / failing endpoint:
https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net
                                                          ^^^^^^^^^^^^^^^^^
                                                          Azure App Service

Backend you were tailing:
statsthegame-dev-api
Azure Container App
```

Your recent Container App API was:

```text
https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io
```

### First: test both APIs

Run this exactly:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

OLD_API="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"
NEW_API="https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io"

echo "=== APP SERVICE ==="
curl -i "$OLD_API/api/v1/dataset-releases"

echo
echo "=== CONTAINER APP ==="
curl -i "$NEW_API/api/v1/dataset-releases"
```

Send me the complete output of both.

### Very likely scenario

If you get something like:

```text
APP SERVICE
HTTP/2 500

CONTAINER APP
HTTP/2 200
```

then **#676 is actually caused by the frontend still pointing at the old App Service deployment**.

In that case, do **not** change the dataset-release backend implementation. We need to update the frontend's deployed API base URL.

Find every reference to the old host:

```bash
rg -n \
  "statsthegame-api-dev|azurewebsites.net|VITE_API|API_BASE|API_URL" \
  . \
  --glob '!node_modules/**' \
  --glob '!dist/**'
```

Also inspect your frontend environment files:

```bash
find apps/frontend -maxdepth 2 -type f \
  \( -name ".env*" -o -name "*env*" \) \
  -print
```

And:

```bash
grep -Rni \
  "statsthegame-api-dev\|azurewebsites.net\|azurecontainerapps.io" \
  apps/frontend \
  --exclude-dir=node_modules \
  --exclude-dir=dist
```

### Check the deployed frontend configuration

Because this is a Vite-style frontend, the API URL may have been compiled into the deployment at build time.

Check your Azure frontend settings:

```bash
az webapp config appsettings list \
  --resource-group rg-statsthegame-dev \
  --name statsthegame-web-dev-dngxgqb2esbudsce \
  --query "[].{Name:name,Value:value}" \
  -o table
```

Look specifically for values such as:

```text
VITE_API_BASE_URL
VITE_API_URL
API_BASE_URL
```

If it currently contains:

```text
https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net
```

and the Container App is now the canonical API, it needs to become:

```text
https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io
```

But **don't change it yet**-first run the two `curl` commands. That will tell us conclusively whether this is a deployment routing/config bug or a real dataset-release implementation bug.

### If the App Service is intentionally still the backend

Then we need its logs, not Container App logs. Find it with:

```bash
az webapp list \
  --query "[?contains(name, 'statsthegame-api-dev')].{Name:name,ResourceGroup:resourceGroup,State:state,Host:defaultHostName}" \
  -o table
```

Then tail it:

```bash
RESOURCE_GROUP="<resource-group-from-command>"
WEBAPP="<webapp-name-from-command>"

az webapp log config \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP" \
  --application-logging filesystem \
  --level information

az webapp log tail \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP"
```

Then reload:

```text
https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net/api/v1/dataset-releases
```

The important next step is therefore **the two-API `curl` comparison**. Paste that output next and we can determine the fix without touching unrelated code.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:30:30 AM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

OLD_API="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"
NEW_API="https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io"

echo "=== APP SERVICE ==="
curl -i "$OLD_API/api/v1/dataset-releases"-i "$NEW_API/api/v1/dataset-rele
=== APP SERVICE ===
HTTP/1.1 500 Internal Server Error
Content-Length: 91
Content-Type: application/json; charset=utf-8
Date: Sat, 19 Sep 2026 07:30:19 GMT
Access-Control-Allow-Credentials: true
ETag: W/"5b-VWwA37HHHqJBTITOfH4rQIr7S8k"
Vary: Origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
API-Version: v1

{"error":{"code":"INTERNAL_SERVER_ERROR","message":"An unexpected server error occurred."}}
=== CONTAINER APP ===
HTTP/2 500 
content-security-policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
cross-origin-opener-policy: same-origin
cross-origin-resource-policy: same-origin
origin-agent-cluster: ?1
referrer-policy: no-referrer
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: SAMEORIGIN
x-permitted-cross-domain-policies: none
x-xss-protection: 0
vary: Origin
access-control-allow-credentials: true
api-version: v1
content-type: application/json; charset=utf-8
content-length: 91
etag: W/"5b-VWwA37HHHqJBTITOfH4rQIr7S8k"
date: Sat, 19 Sep 2026 07:30:19 GMT

{"error":{"code":"INTERNAL_SERVER_ERROR","message":"An unexpected server error occurred."}}dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/19/2026, 9:30:39 AM

> **Diagnosing identical failures**
>
> I’m noting that both endpoints returning the same response suggests shared application or proxy behavior, not necessarily a routing mismatch. I’d capture fresh container logs immediately after one request, focusing on the exception and requested path.
>
> **Diagnosed identical failures**
>
> 
>
> Worked for 11s

Both backends returning the **same `500` response** rules out the frontend API URL as the cause. This is now a genuine backend/shared-infrastructure bug in #676.

The important result is:

```text
OLD App Service   -> 500 INTERNAL_SERVER_ERROR
NEW Container App -> 500 INTERNAL_SERVER_ERROR
```

So **do not change the frontend URL or frontend error handling**.

### 1. Get the actual exception from the Container App

Your previous log output mostly contained request-completion noise. Run this instead:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

RESOURCE_GROUP="rg-statsthegame-dev"
CONTAINER_APP="statsthegame-dev-api"
API="https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io"

# Trigger the failure
curl -sS -i "$API/api/v1/dataset-releases"

echo
echo "========== RECENT RELEVANT LOGS =========="

az containerapp logs show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_APP" \
  --type console \
  --tail 200 |
grep -iE \
  "dataset|release|error|exception|stack|prisma|postgres|sql|blob|storage|500"
```

Paste the complete output.

If that filter produces nothing useful, run:

```bash
az containerapp logs show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_APP" \
  --type console \
  --tail 100
```

immediately after another `curl`.

### 2. Locate the exact endpoint implementation

While we're doing that, find the source files:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

rg -n \
  "dataset-releases|DatasetRelease|datasetRelease|dataset_release" \
  apps/backend packages \
  --glob '*.ts'
```

Then find where the route is mounted:

```bash
rg -n -C 8 \
  "dataset-releases" \
  apps/backend/src \
  --glob '*.ts'
```

### 3. Check the database/migration side

This failure occurring on **both deployments** makes a shared database/schema problem particularly plausible.

Run:

```bash
rg -n \
  "dataset.*release|release.*dataset" \
  apps/backend \
  packages \
  --glob '*.sql' \
  --glob '*.ts' \
  --glob '*.prisma'
```

Also show your migration directories:

```bash
find . \
  \( -path '*migration*' -o -path '*migrations*' \) \
  -type f |
sort |
tail -50
```

Do **not** paste database passwords or connection strings.

### 4. Check relevant environment-variable names

We only need the names, not their secret values:

```bash
az containerapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_APP" \
  --query "properties.template.containers[0].env[].{Name:name,SecretRef:secretRef}" \
  -o table
```

We're especially interested in anything relating to:

```text
DATABASE
POSTGRES
SQL
AZURE_STORAGE
BLOB
OBJECT_STORAGE
DATASET
RELEASE
```

### What the result already tells us

The earlier theory was:

```text
frontend -> obsolete App Service -> 500
frontend -> Container App -> maybe 200
```

Your test disproved that.

We now have:

```text
                    ┌─ App Service ──── 500
dataset-releases ───┤
                    └─ Container App ── 500
                              │
                     shared implementation /
                     DB / storage / config
```

The identical JSON error is likely your centralized error handler converting the underlying exception into:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected server error occurred."
  }
}
```

That is good API behaviour from a security perspective—the internal exception isn't leaked publicly—but we now need the server-side logs to see the original cause.

### Don't start changing code yet

For TDD, once we identify the underlying failure, create the regression test **before** the production fix.

Likely examples:

```ts
it('returns an empty release collection when no dataset releases exist', async () => {
  // reproduce deployed failure
});
```

or, if it's a schema/storage issue:

```ts
it('lists release metadata without requiring unavailable release artifacts', async () => {
  // reproduce exact discovered condition
});
```

But we shouldn't guess the test until the server error tells us what actually failed.

**Run the first log command and the two `rg` commands next. Paste those outputs.** That should get us from “endpoint returns 500” to the exact repository/service line responsible.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:32:09 AM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

RESOURCE_GROUP="rg-statsthegame-dev"
CONTAINER_APP="statsthegame-dev-api"
API="https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io"

# Trigger the failure
curl -sS -i "$API/api/v1/dataset-releases"

500"prisma|postgres|sql|blob|storage|
HTTP/2 500 
content-security-policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
cross-origin-opener-policy: same-origin
cross-origin-resource-policy: same-origin
origin-agent-cluster: ?1
referrer-policy: no-referrer
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: SAMEORIGIN
x-permitted-cross-domain-policies: none
x-xss-protection: 0
vary: Origin
access-control-allow-credentials: true
api-version: v1
content-type: application/json; charset=utf-8
content-length: 91
etag: W/"5b-VWwA37HHHqJBTITOfH4rQIr7S8k"
date: Sat, 19 Sep 2026 07:31:21 GMT

{"error":{"code":"INTERNAL_SERVER_ERROR","message":"An unexpected server error occurred."}}
========== RECENT RELEVANT LOGS ==========
{"TimeStamp": "2026-09-19T07:31:35.65006", "Log": "Successfully Connected to container: 'api' [Revision: 'statsthegame-dev-api--0000001', Replica: 'statsthegame-dev-api--0000001-774dfcfd85-72cj9']"}
{"TimeStamp": "2026-09-19T07:13:24.0586361+00:00", "Log": "'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests\",\"cross-origin-opener-policy\":\"same-origin\",\"cross-origin-resource-policy\":\"same-origin\",\"origin-agent-cluster\":\"?1\",\"referrer-policy\":\"no-referrer\",\"strict-transport-security\":\"max-age=31536000; includeSubDomains\",\"x-content-type-options\":\"nosniff\",\"x-dns-prefetch-control\":\"off\",\"x-download-options\":\"noopen\",\"x-frame-options\":\"SAMEORIGIN\",\"x-permitted-cross-domain-policies\":\"none\",\"x-xss-protection\":\"0\",\"vary\":\"Origin\",\"access-control-allow-credentials\":\"true\",\"api-version\":\"v1\",\"content-type\":\"application/json; charset=utf-8\",\"content-length\":\"86\",\"etag\":\"W/\\\"56-/9oY500Zv+zyEl3E6PuZ5sHZp/Q\\\"\"}},\"responseTime\":0,\"msg\":\"request completed\"}"}
{"TimeStamp": "2026-09-19T07:28:22.6855008+00:00", "Log": "'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests\",\"cross-origin-opener-policy\":\"same-origin\",\"cross-origin-resource-policy\":\"same-origin\",\"origin-agent-cluster\":\"?1\",\"referrer-policy\":\"no-referrer\",\"strict-transport-security\":\"max-age=31536000; includeSubDomains\",\"x-content-type-options\":\"nosniff\",\"x-dns-prefetch-control\":\"off\",\"x-download-options\":\"noopen\",\"x-frame-options\":\"SAMEORIGIN\",\"x-permitted-cross-domain-policies\":\"none\",\"x-xss-protection\":\"0\",\"vary\":\"Origin\",\"access-control-allow-credentials\":\"true\",\"api-version\":\"v1\",\"content-type\":\"application/json; charset=utf-8\",\"content-length\":\"86\",\"etag\":\"W/\\\"56-9Fmszwij++MT9nELOgblpbfkMNY\\\"\"}},\"responseTime\":1,\"msg\":\"request completed\"}"}
{"TimeStamp": "2026-09-19T07:30:19.5430219+00:00", "Log": "'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests\",\"cross-origin-opener-policy\":\"same-origin\",\"cross-origin-resource-policy\":\"same-origin\",\"origin-agent-cluster\":\"?1\",\"referrer-policy\":\"no-referrer\",\"strict-transport-security\":\"max-age=31536000; includeSubDomains\",\"x-content-type-options\":\"nosniff\",\"x-dns-prefetch-control\":\"off\",\"x-download-options\":\"noopen\",\"x-frame-options\":\"SAMEORIGIN\",\"x-permitted-cross-domain-policies\":\"none\",\"x-xss-protection\":\"0\",\"vary\":\"Origin\",\"access-control-allow-credentials\":\"true\",\"api-version\":\"v1\",\"content-type\":\"application/json; charset=utf-8\",\"content-length\":\"91\",\"etag\":\"W/\\\"5b-VWwA37HHHqJBTITOfH4rQIr7S8k\\\"\"}},\"err\":{\"type\":\"Error\",\"message\":\"failed with status code 500\",\"stack\":\"Error: failed with status code 500\\n    at onResFinished (/workspace/node_modules/pino-http/logger.js:115:39)\\n    at ServerResponse.onResponseComplete (/workspace/node_modules/pino-http/logger.js:178:14)\\n    at ServerResponse.emit (node:events:531:35)\\n    at onFinish (node:_http_outgoing:1084:10)\\n    at callback (node:internal/streams/writable:766:21)\\n    at afterWrite (node:internal/streams/writable:710:5)\\n    at afterWriteTick (node:internal/streams/writable:696:10)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:88:21)\"},\"responseTime\":178,\"msg\":\"request errored\"}"}
{"TimeStamp": "2026-09-19T07:31:09.6026957+00:00", "Log": "'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests\",\"cross-origin-opener-policy\":\"same-origin\",\"cross-origin-resource-policy\":\"same-origin\",\"origin-agent-cluster\":\"?1\",\"referrer-policy\":\"no-referrer\",\"strict-transport-security\":\"max-age=31536000; includeSubDomains\",\"x-content-type-options\":\"nosniff\",\"x-dns-prefetch-control\":\"off\",\"x-download-options\":\"noopen\",\"x-frame-options\":\"SAMEORIGIN\",\"x-permitted-cross-domain-policies\":\"none\",\"x-xss-protection\":\"0\",\"vary\":\"Origin\",\"access-control-allow-credentials\":\"true\",\"api-version\":\"v1\",\"content-type\":\"application/json; charset=utf-8\",\"content-length\":\"91\",\"etag\":\"W/\\\"5b-VWwA37HHHqJBTITOfH4rQIr7S8k\\\"\"}},\"err\":{\"type\":\"Error\",\"message\":\"failed with status code 500\",\"stack\":\"Error: failed with status code 500\\n    at onResFinished (/workspace/node_modules/pino-http/logger.js:115:39)\\n    at ServerResponse.onResponseComplete (/workspace/node_modules/pino-http/logger.js:178:14)\\n    at ServerResponse.emit (node:events:531:35)\\n    at onFinish (node:_http_outgoing:1084:10)\\n    at callback (node:internal/streams/writable:766:21)\\n    at afterWrite (node:internal/streams/writable:710:5)\\n    at afterWriteTick (node:internal/streams/writable:696:10)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:88:21)\"},\"responseTime\":1251,\"msg\":\"request errored\"}"}
{"TimeStamp": "2026-09-19T07:31:21.7760083+00:00", "Log": "'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests\",\"cross-origin-opener-policy\":\"same-origin\",\"cross-origin-resource-policy\":\"same-origin\",\"origin-agent-cluster\":\"?1\",\"referrer-policy\":\"no-referrer\",\"strict-transport-security\":\"max-age=31536000; includeSubDomains\",\"x-content-type-options\":\"nosniff\",\"x-dns-prefetch-control\":\"off\",\"x-download-options\":\"noopen\",\"x-frame-options\":\"SAMEORIGIN\",\"x-permitted-cross-domain-policies\":\"none\",\"x-xss-protection\":\"0\",\"vary\":\"Origin\",\"access-control-allow-credentials\":\"true\",\"api-version\":\"v1\",\"content-type\":\"application/json; charset=utf-8\",\"content-length\":\"91\",\"etag\":\"W/\\\"5b-VWwA37HHHqJBTITOfH4rQIr7S8k\\\"\"}},\"err\":{\"type\":\"Error\",\"message\":\"failed with status code 500\",\"stack\":\"Error: failed with status code 500\\n    at onResFinished (/workspace/node_modules/pino-http/logger.js:115:39)\\n    at ServerResponse.onResponseComplete (/workspace/node_modules/pino-http/logger.js:178:14)\\n    at ServerResponse.emit (node:events:531:35)\\n    at onFinish (node:_http_outgoing:1084:10)\\n    at callback (node:internal/streams/writable:766:21)\\n    at afterWrite (node:internal/streams/writable:710:5)\\n    at afterWriteTick (node:internal/streams/writable:696:10)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:88:21)\"},\"responseTime\":1378,\"msg\":\"request errored\"}"}
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ az containerapp logs show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_APP" \
  --type console \
  --tail 100
Bad Request({"error":{"code":"InvalidApiVersionParameter","message":"The api-version '2025-07-01' is invalid. The supported versions are '2026-06-01,2025-04-01,2025-03-01,2024-10-01-preview,2024-11-01,2024-08-01,2024-07-01,2024-06-01-preview,2024-03-01,2023-07-01,2023-07-01-preview,2023-03-01-preview,2022-12-01,2022-11-01-preview,2022-09-01,2022-06-01,2022-05-01,2022-03-01-preview,2022-01-01,2021-04-01,2021-01-01,2020-10-01,2020-09-01,2020-08-01,2020-07-01,2020-06-01,2020-05-01,2020-01-01,2019-11-01,2019-10-01,2019-09-01,2019-08-01,2019-07-01,2019-06-01,2019-05-10,2019-05-01,2019-03-01,2018-11-01,2018-09-01,2018-08-01,2018-07-01,2018-06-01,2018-05-01,2018-02-01,2018-01-01,2017-12-01,2017-08-01,2017-06-01,2017-05-10,2017-05-01,2017-03-01,2016-09-01,2016-07-01,2016-06-01,2016-02-01,2015-11-01,2015-01-01,2014-04-01-preview,2014-04-01,2014-01-01,2013-03-01,2014-02-26,2014-04'."}})
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/19/2026, 9:32:17 AM

> **Searched 1 website**
>
> 
>
> Worked for 13s

The current logs still **do not contain the real exception**. They only show `pino-http` noticing that the response finished with status `500`:

```text
Error: failed with status code 500
at onResFinished (.../pino-http/logger.js:115:39)
```

That stack trace is **not the cause of #676**. It is generated after your app has already decided to return `500`.

The next step is to find the backend error handler and dataset-release route locally.

Run these three commands:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

echo "=== DATASET RELEASE IMPLEMENTATION ==="
rg -n -C 12 \
  "dataset-releases|DatasetRelease|datasetRelease|dataset_release" \
  apps/backend/src \
  packages \
  --glob '*.ts'

echo
echo "=== INTERNAL ERROR HANDLING ==="
rg -n -C 12 \
  "INTERNAL_SERVER_ERROR|An unexpected server error occurred|errorHandler|error handler|logger\.error|log\.error" \
  apps/backend/src \
  --glob '*.ts'

echo
echo "=== DATASET RELEASE TESTS ==="
rg -n -C 8 \
  "dataset-releases|DatasetRelease|datasetRelease" \
  apps/backend/tests \
  tests \
  --glob '*.ts'
```

Paste that output. That should expose the exact route → service → repository chain and tell us whether the original exception is being swallowed.

Your Azure CLI error is a **separate CLI tooling issue**:

```text
The api-version '2025-07-01' is invalid
```

Microsoft's current Container Apps guidance recommends keeping both Azure CLI and the `containerapp` extension updated, and `az containerapp logs show --tail` itself is still supported. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/container-apps/deploy-express-cli?utm_source=chatgpt.com))

Fix that separately with:

```bash
az version

az extension show \
  --name containerapp \
  --query "{name:name,version:version}" \
  -o table

az upgrade

az extension update --name containerapp
```

If the extension update still leaves the bad API-version problem:

```bash
az extension remove --name containerapp
az extension add --name containerapp --upgrade
```

Then retry:

```bash
az containerapp logs show \
  --resource-group rg-statsthegame-dev \
  --name statsthegame-dev-api \
  --type console \
  --tail 100
```

Microsoft documents `--tail` as accepting `0-300` log messages, so your `--tail 100` syntax is valid; the failure is coming from the installed CLI/extension version rather than your command. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/container-apps/log-streaming?utm_source=chatgpt.com))

### What we know about #676 now

```text
GET /api/v1/dataset-releases
        │
        ├── old App Service  → 500
        └── Container App    → 500
                                  │
                       centralized error handler
                                  │
                "An unexpected server error occurred."
```

So this is **not**:

```text
❌ frontend rendering bug
❌ wrong frontend API URL
❌ Container App ingress problem
❌ App Service-only deployment problem
```

It is much more likely in the shared backend path:

```text
route
  ↓
dataset-release service
  ↓
repository / database / object storage
  ↓
exception
  ↓
central error middleware
  ↓
500
```

Also, the request taking roughly `178 ms` to `1.3 s` suggests it is getting into application work before failing rather than immediately failing route matching.

Once you paste the three `rg` outputs, I can tell you **which test to add first for TDD and which exact file should be changed**.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

---

**Sources:**

- [Quickstart: Deploy an Express Container App Using the Azure CLI | Microsoft Learn](https://learn.microsoft.com/en-us/azure/container-apps/deploy-express-cli?utm_source=chatgpt.com)

## Prompt:
9/19/2026, 9:33:30 AM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

echo "=== DATASET RELEASE IMPLEMENTATION ==="
rg -n -C 12 \
  "dataset-releases|DatasetRelease|datasetRelease|dataset_release" \
  apps/backend/src \
  packages \
  --glob '*.ts'

echo
echo "=== INTERNAL ERROR HANDLING ==="
rg -n -C 12 \
  "INTERNAL_SERVER_ERROR|An unexpected server error occurred|errorHandler|error handler|logger\.error|log\.error" \
  --glob '*.ts'tests \tasetRelease|datasetRelease" \
=== DATASET RELEASE IMPLEMENTATION ===
Command 'rg' not found, but can be installed with:
sudo snap install ripgrep  # version 12.1.0, or
sudo apt  install ripgrep  # version 14.0.3-1
See 'snap info ripgrep' for additional versions.

=== INTERNAL ERROR HANDLING ===
Command 'rg' not found, but can be installed with:
sudo snap install ripgrep  # version 12.1.0, or
sudo apt  install ripgrep  # version 14.0.3-1
See 'snap info ripgrep' for additional versions.

=== DATASET RELEASE TESTS ===
Command 'rg' not found, but can be installed with:
sudo snap install ripgrep  # version 12.1.0, or
sudo apt  install ripgrep  # version 14.0.3-1
See 'snap info ripgrep' for additional versions.
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/19/2026, 9:33:33 AM

Use standard `grep` instead of `rg`. Also, part of the command you pasted got mangled around `--glob '*.ts'`, so run these cleanly one at a time.

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

echo "=== DATASET RELEASE IMPLEMENTATION ==="

grep -RniE \
  "dataset-releases|DatasetRelease|datasetRelease|dataset_release" \
  apps/backend/src packages \
  --include='*.ts'
```

Then:

```bash
echo "=== INTERNAL ERROR HANDLING ==="

grep -RniE \
  "INTERNAL_SERVER_ERROR|An unexpected server error occurred|errorHandler|error handler|logger\.error|log\.error" \
  apps/backend/src \
  --include='*.ts'
```

Then:

```bash
echo "=== DATASET RELEASE TESTS ==="

grep -RniE \
  "dataset-releases|DatasetRelease|datasetRelease" \
  apps/backend/tests tests \
  --include='*.ts' 2>/dev/null
```

I also want the actual relevant files with surrounding code, not just filenames. This version gives us context:

```bash
echo "=== DATASET RELEASE IMPLEMENTATION WITH CONTEXT ==="

grep -RniE -B 12 -A 12 \
  "dataset-releases|DatasetRelease|datasetRelease|dataset_release" \
  apps/backend/src packages \
  --include='*.ts'
```

And for the central error handler:

```bash
echo "=== ERROR HANDLER WITH CONTEXT ==="

grep -RniE -B 15 -A 20 \
  "INTERNAL_SERVER_ERROR|An unexpected server error occurred" \
  apps/backend/src \
  --include='*.ts'
```

If the output is enormous, get the file list first:

```bash
grep -RliE \
  "dataset-releases|DatasetRelease|datasetRelease|dataset_release" \
  apps/backend/src packages \
  --include='*.ts'
```

You can also install `ripgrep` later if you want:

```bash
sudo apt update
sudo apt install -y ripgrep
```

But **you do not need to install anything to continue debugging #676**.

The next useful output for me is specifically:

```text
1. Dataset-release route/controller file
2. Dataset-release service file
3. Dataset-release repository/storage file
4. Central error-handler file
5. Existing dataset-release tests
```

Paste the output from the five `grep` commands above and I can narrow this to the exact failing layer and give you the TDD test to add first.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:34:45 AM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ az version

az extension show \
  --name containerapp \
  --query "{name:name,version:version}" \
  -o table

az upgrade

az extension update --name containerapp
{
  "azure-cli": "2.89.0",
  "azure-cli-core": "2.89.0",
  "azure-cli-telemetry": "1.1.0",
  "extensions": {}
}
The extension containerapp is not installed. Please install the extension via `az extension add -n containerapp`.
This command is in preview and under development. Reference and support levels: https://aka.ms/CLI_refstatus
Your current Azure CLI version is 2.89.0. Latest version available is 2.90.0.
Please check the release notes first: https://learn.microsoft.com/cli/azure/release-notes-azure-cli
Do you want to continue? (Y/n): y
[sudo] password for dean: 
Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease
Get:2 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]
Hit:3 https://packages.microsoft.com/repos/azure-cli noble InRelease         
Get:4 http://archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]      
Get:5 http://archive.ubuntu.com/ubuntu noble-backports InRelease [126 kB]
Get:6 http://security.ubuntu.com/ubuntu noble-security/main amd64 Components [46.3 kB]
Get:7 http://archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages [1275 kB]
Get:8 http://security.ubuntu.com/ubuntu noble-security/universe amd64 Components [76.2 kB]
Get:9 http://archive.ubuntu.com/ubuntu noble-updates/main amd64 Components [180 kB]
Get:10 http://archive.ubuntu.com/ubuntu noble-updates/universe amd64 Packages [1689 kB]
Get:11 http://archive.ubuntu.com/ubuntu noble-updates/universe amd64 Components [388 kB]
Get:12 http://archive.ubuntu.com/ubuntu noble-updates/multiverse amd64 Components [940 B]
Get:13 http://archive.ubuntu.com/ubuntu noble-backports/main amd64 Packages [65.9 kB]
Get:14 http://archive.ubuntu.com/ubuntu noble-backports/main amd64 Components [5764 B]
Get:15 http://archive.ubuntu.com/ubuntu noble-backports/universe amd64 Packages [34.6 kB]
Get:16 http://archive.ubuntu.com/ubuntu noble-backports/universe Translation-en [18.7 kB]
Get:17 http://archive.ubuntu.com/ubuntu noble-backports/universe amd64 Components [12.6 kB]
Fetched 4171 kB in 3s (1355 kB/s)                               
Reading package lists... Done
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following packages were automatically installed and are no longer required:
  libdrm-nouveau2 libdrm-radeon1 libgl1-amber-dri libglapi-mesa
  libxcb-dri2-0
Use 'sudo apt autoremove' to remove them.
The following packages will be upgraded:
  azure-cli
1 upgraded, 0 newly installed, 0 to remove and 80 not upgraded.
Need to get 56.7 MB of archives.
After this operation, 3345 kB of additional disk space will be used.
Get:1 https://packages.microsoft.com/repos/azure-cli noble/main amd64 azure-cli amd64 2.90.0-1~noble [56.7 MB]
Fetched 56.7 MB in 5s (12.0 MB/s)    
(Reading database ... 144255 files and directories currently installed.)
Preparing to unpack .../azure-cli_2.90.0-1~noble_amd64.deb ...
Unpacking azure-cli (2.90.0-1~noble) over (2.89.0-1~noble) ...
Setting up azure-cli (2.90.0-1~noble) ...
Upgrade finished.
The extension containerapp is not installed. Please install the extension via `az extension add -n containerapp`.
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

[Attachment: Pasted text.txt]

## Response:
9/19/2026, 9:34:45 AM

> **Diagnosing the shared failure**
>
> I’m narrowing this to a server-side schema or data mismatch, most likely a missing or outdated `dataset_release` table/column in the shared production database. Both deployments failing together strongly points there, though malformed snapshot data could also trigger the mapper.
>
> **Diagnosed the shared failure**
>
> 
>
> Worked for 27s

The evidence now narrows #676 substantially: **`GET /api/v1/dataset-releases` does not need object storage to list releases. Its critical dependency is the `dataset_release` database query.** The strongest current hypothesis is therefore a **deployed database schema/migration mismatch**, not Azure Blob Storage. `Pasted text.txt`

From your code, the request path is:

```text
GET /api/v1/dataset-releases
        ↓
dataset-release.routes.ts:76
        ↓
service.listReleases()
        ↓
repository.list(deploymentEnvironment)
        ↓
SELECT ... FROM dataset_release
        ↓
500
```

The repository query is specifically:

```sql
SELECT
  release_id::text AS "releaseId",
  version,
  created_at::text AS "createdAt",
  snapshot_id::text AS "snapshotId",
  snapshot_as_of::text AS "snapshotAsOf",
  event_count AS "eventCount",
  checksum_sha256 AS checksum
FROM dataset_release
WHERE deployment_environment=$1
ORDER BY created_at DESC,version DESC
```

And importantly, the object-storage guard you found is inside `requestRelease()`, not the listing path. `Pasted text.txt`

Run these next.

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

echo "=== SERVICE LIST IMPLEMENTATION ==="
sed -n '95,180p' \
  apps/backend/src/modules/dataset-releases/dataset-release.service.ts

echo
echo "=== DATASET RELEASE MIGRATIONS ==="
grep -RniE \
  "CREATE TABLE.*dataset_release|ALTER TABLE.*dataset_release|dataset_release_job|checksum_sha256|snapshot_as_of" \
  . \
  --include='*.sql' \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git
```

Then inspect how your project actually applies DB migrations:

```bash
echo "=== DATABASE/MIGRATION SCRIPTS ==="

node - <<'NODE'
for (const file of ['./package.json', './apps/backend/package.json']) {
  try {
    const pkg = require(file);
    console.log(`\n${file}`);
    for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
      if (/migrat|database|db:|schema/i.test(`${name} ${command}`)) {
        console.log(`${name}: ${command}`);
      }
    }
  } catch {}
}
NODE
```

Also install the Container Apps extension now that Azure CLI itself is updated:

```bash
az extension add \
  --name containerapp \
  --upgrade

az extension show \
  --name containerapp \
  --query "{name:name,version:version}" \
  -o table
```

Then retry:

```bash
az containerapp logs show \
  --resource-group rg-statsthegame-dev \
  --name statsthegame-dev-api \
  --type console \
  --tail 100
```

### Why I suspect a migration

Your listing function directly queries the `dataset_release` table and expects all of these columns:

```text
deployment_environment
release_id
version
created_at
snapshot_id
snapshot_as_of
event_count
checksum_sha256
```

Any one of these conditions would give exactly the `500` you're seeing:

```text
relation "dataset_release" does not exist

column "snapshot_id" does not exist

column "snapshot_as_of" does not exist

column "checksum_sha256" does not exist

column "deployment_environment" does not exist
```

Because both the old App Service and new Container App fail, a shared dev database with an old schema fits the evidence especially well.

### One secondary possibility

The service contains this conversion:

```ts
function toApiDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Dataset release timestamp is invalid.');
  }

  return date.toISOString();
}
```

So an existing release row containing a timestamp Node cannot parse could also cause listing to fail. But schema/migration failure is currently the stronger hypothesis.

### Your error logging also needs improvement - but separately

Your global handler currently does:

```ts
const message = error instanceof Error ? error.message : 'Unknown error';

response.status(500).json({
  error: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected server error occurred.',
  },
});

console.error(message);
```

That explains why debugging this is unnecessarily difficult: it throws away the stack and structured context. `Pasted text.txt`

Do **not** change that as part of #676 yet. It would broaden the issue unnecessarily. Later, create a separate observability issue to replace it with structured server-side error logging while preserving the sanitized public `500` response.

For #676, **do not change the frontend, object storage, or dataset-release service yet**. Run the migration searches above first. If they reveal a `dataset_release` migration that has not been applied to dev, we can verify and fix the actual deployment state rather than patching working application code.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:37:40 AM

[Attachment: Pasted text.txt]

[Attachment: Pasted text (2).txt]

## Response:
9/19/2026, 9:37:40 AM

> **Tracing the database failure**
>
> I’m focusing on the hidden database error rather than the API symptom. I’d first inspect `executeQuery`, migration status, and the deployed schema, then run a read-only query to confirm whether the snapshot columns and tables actually exist.
>
> **Traced the database failure**
>
> 
>
> **Verifying migration state**
>
> I’m checking whether the deployed database is missing the new snapshot schema or using the wrong connection. I’d compare migration status, confirm the target database, and run a read-only schema check before changing anything.
>
> Worked for 15s

The new log confirms #676 is a **database-layer failure**, not frontend or object storage. The key line is:

```text
database operation could not be completed.
```

It appears immediately before the `500` response. `Pasted text (2).txt`

Given your repository code, the strongest suspect is that the deployed database is **behind the code's migration level**. In particular, your listing query expects `snapshot_id` and `snapshot_as_of`, and those were only added by:

```text
database/migrations/20260917120000000_dataset-release-snapshots.sql
```

Your endpoint code now selects them unconditionally. `Pasted text.txt`

Do these checks **before changing any code**.

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

echo "=== FIND DATABASE ERROR WRAPPER ==="

grep -Rni -B 15 -A 25 \
  "database operation could not be completed" \
  apps/backend/src \
  --include='*.ts'
```

Then check which migrations the database believes are applied:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

npm run db:migrate:dry --workspace=@sport-analytics/backend
```

If that shows any of these as pending:

```text
20260909100000000_dataset-releases
20260914100000000_stream-dataset-release-artifacts
20260914150000000_async-dataset-release-jobs
20260917120000000_dataset-release-snapshots
```

then we have almost certainly found #676.

Also verify the local backend `.env` can actually reach the DB:

```bash
npm run db:check --workspace=@sport-analytics/backend
```

Do **not** paste `DATABASE_URL` or passwords.

I also want to see how your SQL helper works before I give you a schema-inspection command:

```bash
sed -n '1,240p' apps/backend/scripts/sql.ts
```

And show the actual snapshot migration:

```bash
cat database/migrations/20260917120000000_dataset-release-snapshots.sql
```

### Most likely failure

Your code currently runs roughly:

```sql
SELECT
  release_id,
  version,
  created_at,
  snapshot_id,
  snapshot_as_of,
  event_count,
  checksum_sha256
FROM dataset_release
WHERE deployment_environment = $1;
```

But if the dev database has not received the 17 September migration, PostgreSQL will produce something equivalent to:

```text
column "snapshot_id" does not exist
```

or:

```text
column "snapshot_as_of" does not exist
```

Your DB abstraction then converts that into:

```text
database operation could not be completed.
```

and the error middleware converts that into the public:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected server error occurred."
  }
}
```

That sequence now fits all the evidence.

### If `db:migrate:dry` confirms pending migrations

Do **not** immediately edit `dataset-release.repository.ts` to tolerate an outdated schema. That would hide a deployment problem and create two supported database schemas.

The intended fix would instead be:

```bash
npm run db:migrate --workspace=@sport-analytics/backend
```

**But don't run that yet.** First paste the output of:

```text
npm run db:migrate:dry --workspace=@sport-analytics/backend
```

I want to verify exactly what it proposes to apply before we modify the shared dev database.

Your Container Apps CLI issue is also resolved: the `containerapp` extension is now installed as `1.3.0b5`, and log retrieval works again. `Pasted text (2).txt`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:40:27 AM

[Attachment: Pasted text.txt]

## Response:
9/19/2026, 9:40:29 AM

> **Diagnosing schema drift**
>
> I’m tracing the failure to a likely mismatch between the deployed database and application code. The migration dry run shows seven unapplied migrations, so I’m prioritizing schema verification and controlled migration before changing repository logic.
>
> **Diagnosed schema drift**
>
> 
>
> Worked for 17s

You have now found the likely root cause of **#676**: the database targeted by your backend `.env` is **seven migrations behind**, including the exact migration that adds the columns the deployed `GET /dataset-releases` query now requires. `Pasted text.txt`

The key mismatch is:

```text
Backend code expects:
dataset_release.snapshot_id
dataset_release.snapshot_as_of

But this migration is still pending:
20260917120000000_dataset-release-snapshots
```

That matches the deployed log:

```text
database operation could not be completed.
```

So **do not patch `dataset-release.repository.ts`**. The schema needs to catch up to the application.

Before applying anything, confirm the current schema and migration state explicitly:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

cat > apps/backend/check-dataset-release-schema.sql <<'SQL'
SELECT current_database() AS database_name, current_user AS database_user;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dataset_release'
ORDER BY ordinal_position;

SELECT
  name,
  run_on
FROM public.pgmigrations
WHERE name LIKE '%dataset-release%'
   OR name LIKE '%dataset_release%'
ORDER BY run_on;
SQL

npm run db:sql --workspace=@sport-analytics/backend -- check-dataset-release-schema.sql
```

You should expect `snapshot_id` and `snapshot_as_of` to be absent.

Then remove the temporary query file:

```bash
rm apps/backend/check-dataset-release-schema.sql
```

## The actual fix

Your dry run shows these seven migrations pending:

```text
20260915100000000_invalidate-venue-coordinates
20260916111247059_delivery-extras-non-negative
20260916210000000_participant-aggregate-indexes
20260917100000000_participant-statistics-versions
20260917120000000_dataset-release-snapshots
20260917180000000_powerplay-provenance
20260918100000000_participant-aggregate-snapshots
```

Because `node-pg-migrate` maintains migration ordering, **do not try to manually run only the dataset-release SQL**. Apply the normal migration chain:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

npm run db:migrate --workspace=@sport-analytics/backend
```

That changes the database, so first make sure `apps/backend/.env` is pointing at the intended **development database**, not a local/test/prod database.

You can safely inspect the destination without exposing the password:

```bash
node --env-file=apps/backend/.env - <<'NODE'
const raw = process.env.DATABASE_URL;

if (!raw) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

const url = new URL(raw);

console.log({
  host: url.hostname,
  port: url.port || 'default',
  database: url.pathname.replace(/^\//, ''),
  user: url.username,
});
NODE
```

**Do not paste the complete `DATABASE_URL`.**

If that is your intended shared dev DB, then run the migration.

## After migration

Immediately verify that there are no pending migrations:

```bash
npm run db:migrate:dry --workspace=@sport-analytics/backend
```

Ideally:

```text
No migrations to run
```

Then test the API:

```bash
API="https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io"

curl -i "$API/api/v1/dataset-releases"
```

For an environment with no releases, the correct result should now be approximately:

```http
HTTP/2 200
content-type: application/json

{"data":[]}
```

Then test the App Service too:

```bash
OLD_API="https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net"

curl -i "$OLD_API/api/v1/dataset-releases"
```

Because both applications appear to use the same underlying database, both should recover if schema drift is the actual cause.

## Then run regression checks

After applying the migrations:

```bash
npm run test --workspace=@sport-analytics/backend -- dataset-release

npm run typecheck --workspace=@sport-analytics/backend

npm run lint --workspace=@sport-analytics/backend
```

Also run the relevant database test suite:

```bash
npm run test:database --workspace=@sport-analytics/backend
```

### Important permanent fix

There is a larger deployment defect here: **code containing a dependency on the 17 September schema was deployed while that migration had not been applied**.

So #676 should fix the immediate outage by migrating the dev DB, but you should also create a follow-up deployment issue such as:

```text
DevOps: Prevent backend deployment when required database migrations are pending
```

The CI/CD deployment should ensure:

```text
build/test
    ↓
database migration/check
    ↓
backend deployment
    ↓
post-deployment smoke test
    ↓
GET /api/v1/dataset-releases → 200
```

That is much stronger than adding application code that silently supports stale schemas, and it directly supports the project's CI/CD requirement.

**Next:** run the schema-check command above. If it confirms `snapshot_id` / `snapshot_as_of` are missing and the displayed host is definitely your dev DB, then run `npm run db:migrate --workspace=@sport-analytics/backend`.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:43:25 AM

[Attachment: Pasted text.txt]

## Response:
9/19/2026, 9:43:25 AM

#676’s root cause is confirmed and the backend fix is successful: **the deployed development database was behind the application schema**. After applying the seven pending migrations, including `20260917120000000_dataset-release-snapshots`, both deployed APIs changed from `500` to `200` and return the published dataset release. `Pasted text.txt`

The important evidence is:

```text
Before:
GET /api/v1/dataset-releases
→ 500 INTERNAL_SERVER_ERROR
→ "database operation could not be completed."

Database schema:
snapshot_id      MISSING
snapshot_as_of   MISSING

Pending migration:
20260917120000000_dataset-release-snapshots

After:
npm run db:migrate
npm run db:migrate:dry
→ No migrations to run!

Container App:
GET /api/v1/dataset-releases → 200

App Service:
GET /api/v1/dataset-releases → 200
```

The existing release returning:

```json
{
  "snapshotId": null,
  "snapshotAsOf": null
}
```

is consistent with the migration: those fields are nullable specifically so releases created before snapshot support remain valid. `Pasted text.txt`

## Do this now

First, open the deployed application and refresh **Downloads → Dataset releases**. You should now see `2026.09.14v1Public` rather than the error state.

Then run the relevant checks:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

npm run test --workspace=@sport-analytics/backend -- dataset-release

npm run typecheck --workspace=@sport-analytics/backend

npm run lint --workspace=@sport-analytics/backend
```

If practical before closing #676, also run:

```bash
npm run test:database --workspace=@sport-analytics/backend
```

## Comment to add to #676

Use this:

````md
## Root Cause & Resolution

### Root cause

The deployed development database schema was behind the currently deployed backend code.

`GET /api/v1/dataset-releases` queries the following columns from `dataset_release`:

```text
snapshot_id
snapshot_as_of
```

These columns are introduced by:

```text
20260917120000000_dataset-release-snapshots
```

The migration had not been applied to the development database, so the repository query failed and the database abstraction returned:

```text
The database operation could not be completed.
```

The global error handler consequently returned:

```http
500 INTERNAL_SERVER_ERROR
```

### Resolution

Applied all pending development database migrations using:

```bash
npm run db:migrate --workspace=@sport-analytics/backend
```

Migration status was then verified using:

```bash
npm run db:migrate:dry --workspace=@sport-analytics/backend
```

Result:

```text
No migrations to run!
```

### Deployment verification

Container App API:

```text
GET /api/v1/dataset-releases
→ HTTP 200
```

App Service API:

```text
GET /api/v1/dataset-releases
→ HTTP 200
```

The API now successfully returns the existing published release:

```text
2026.09.14v1Public
```

### Conclusion

The fault was caused by **deployment database schema drift**, not by the frontend, API route implementation, or object storage.

No application workaround was required.

A follow-up DevOps issue should ensure required migrations are applied/validated before backend deployment so incompatible application and database versions cannot be deployed together.
````

After confirming the actual Downloads page renders, attach a screenshot and close **#676**.

## Follow-up issue worth creating

This incident exposed a CI/CD gap rather than just a one-off database problem:

```text
DevOps: Prevent deployment when production/development database migrations are pending
```

The deployment pipeline should eventually enforce:

```text
CI tests
   ↓
build
   ↓
migration validation / application
   ↓
API deployment
   ↓
smoke tests
   ↓
GET /api/v1/dataset-releases → 200
```

That is the permanent protection against this exact failure recurring.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:45:57 AM

does the code not automaically update the migratiuons?

## Response:
9/19/2026, 9:46:10 AM

No — **the migrations are defined in the codebase, but they only update the database when something explicitly runs the migration command**.

Your repo has:

```bash
npm run db:migrate --workspace=@sport-analytics/backend
```

which executes `node-pg-migrate up`. But simply deploying newer backend code does **not** automatically execute that command.

That is exactly what happened here:

```text
Backend deployed:
expects snapshot_id + snapshot_as_of

Database:
still on older migration state

Result:
GET /dataset-releases → 500
```

After you manually ran:

```bash
npm run db:migrate --workspace=@sport-analytics/backend
```

the DB schema caught up and the endpoint immediately returned `200`. So the current deployment process is clearly **not guaranteeing migrations run before the new backend becomes active**.

What we need to determine now is whether your CI/CD was *supposed* to run them but doesn't. Check with:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

grep -RniE \
  "db:migrate|node-pg-migrate|migration" \
  .gitea .github scripts infra azure* Dockerfile* \
  --exclude-dir=node_modules \
  --exclude-dir=.git 2>/dev/null
```

And:

```bash
grep -RniE \
  "deploy|containerapp|webapp|azure" \
  .gitea .github \
  --exclude-dir=node_modules 2>/dev/null
```

If you paste that output, I can tell you which of these is true:

```text
A. No migration step exists
   → add one to CI/CD

B. Migration step exists but runs against wrong DB
   → fix environment/secret wiring

C. Migration step exists but runs after deployment
   → fix deployment ordering

D. Migration step exists but failure is ignored
   → make deployment fail if migration fails
```

For this project, the desired deployment flow should be:

```text
tests/lint/build
      ↓
db:migrate
      ↓
deploy backend
      ↓
smoke test
      ↓
promote/complete deployment
```

So yes, **you can make migrations automatic as part of deployment**, but they are not automatic merely because the migration files exist in Git.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:48:03 AM

but was this intentional cause it might use a lot of bandwith and crash the backend ? or is that only for generating new releases

## Response:
9/19/2026, 9:48:08 AM

The concern about **bandwidth / heavy processing is mainly for generating new dataset releases, not for applying this migration**.

For the migration that caused #676:

```text
20260917120000000_dataset-release-snapshots
```

it only does things like:

```sql
ALTER TABLE dataset_release
  ADD COLUMN snapshot_id uuid,
  ADD COLUMN snapshot_as_of timestamptz;

ALTER TABLE dataset_release_job
  ADD COLUMN snapshot_id uuid,
  ADD COLUMN snapshot_as_of timestamptz;

CREATE TABLE dataset_release_snapshot_event (...);
```

There is **no backfill of 3.2 million events**, no artifact generation, no Azure Blob upload, and no dataset download. So this specific migration should be relatively lightweight.

The expensive operation is the **actual release generation**:

```text
admin requests release
      ↓
background job queued
      ↓
accepted delivery events read
      ↓
millions of events processed
      ↓
JSON/artifact generated
      ↓
checksum calculated
      ↓
artifact uploaded to object storage
```

That is where you could see significant:

- DB read load
- CPU/memory use
- object-storage bandwidth
- large artifact writes
- long-running worker activity

Your existing release had about:

```text
3,207,110 events
```

so generating that release is vastly more resource-intensive than adding two nullable columns.

There **is** a legitimate reason teams sometimes do not automatically run migrations on every deployment, though: migrations can still be operationally risky. For example, some migrations may:

```text
CREATE INDEX on millions of rows
ALTER a large table
backfill millions of records
change constraints
lock tables
take a long time
fail halfway through
```

And your pending migration set actually included things such as:

```sql
CREATE INDEX delivery_non_striker_idx ...
CREATE INDEX delivery_wicket_fielder_person_idx ...
```

Those could place meaningful load on PostgreSQL, especially on a large `delivery` table.

So there are two separate concerns:

| Operation | Potentially expensive? | Main risk |
|---|---:|---|
| Add nullable columns | Low | Short schema lock |
| Create new empty table | Low | Minimal |
| Add/check constraints | Low–Medium | Table validation/locking |
| Create indexes on huge tables | Medium–High | DB CPU/I/O/locking |
| Generate dataset release | **High** | DB reads + worker CPU + storage bandwidth |
| Upload dataset artifact | **High** | Network/storage bandwidth |

So **manual migrations could be an intentional safety choice**, but if so, your deployment process still needs a guard.

The unsafe part wasn't that migrations were manual. The unsafe part was:

```text
new backend deployed
        ↓
backend assumes new schema
        ↓
migration not applied
        ↓
production-style endpoint breaks
```

A safer design does not necessarily mean "always run migrations automatically." It could instead be:

```text
CI/CD
  ↓
check pending migrations
  ↓
if pending → STOP deployment
  ↓
operator applies/reviews migrations
  ↓
deployment resumes
```

That may actually be preferable for your project because it prevents an unexpectedly expensive migration from automatically hitting the shared DB while also preventing schema drift.

So for StatsTheGame, I would separate the two:

```text
Dataset release generation
→ async background worker
→ deliberately controlled because expensive

Database migrations
→ deployment/schema-management concern
→ either automatically applied OR deployment blocked until applied
```

**The release-generation architecture is the part designed around potentially massive workload. The missing migration itself wasn't avoiding that workload.**

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:48:40 AM

[Attachment: Pasted text.txt]

## Response:
9/19/2026, 9:48:41 AM

This confirms it: **your current deployment pipeline does not automatically apply database migrations before deploying the backend.** The only migration execution found is in the local database test helper; the actual backend deployment workflows contain deployment and smoke checks, but no `db:migrate` / `node-pg-migrate` step. `Pasted text.txt`

So #676 happened because the pipeline effectively does this:

```text
tests/build
    ↓
build backend image
    ↓
deploy Container App revision
    ↓
health smoke test
    ↓
database-access smoke test
```

but it does **not** currently do:

```text
database migration
```

before deploying code that expects the new schema. `Pasted text.txt`

Also, the existing database smoke check does not appear to protect you from this class of bug. It proved the backend could access the database, but not that the database schema matched the deployed application's required migration level. That is why deployment could succeed while `/dataset-releases` immediately returned `500`.

### Was this intentional?

We cannot establish intent from the grep output alone. There is no evidence here saying, for example:

> "Migrations are intentionally manual because of database load."

What the repository evidence does establish is:

```text
Local DB testing:
scripts/test-database-local.mjs
→ explicitly applies migrations

Deployment:
.gitea/workflows/ci.yml
→ deploys backend
→ does not apply migrations

Rollback App Service workflow:
.gitea/workflows/deploy-backend.yml
→ deploys backend
→ does not apply migrations
```

`Pasted text.txt`

So this looks more like a **deployment-process gap** than something clearly designed to protect bandwidth.

And your earlier concern about huge workload remains separate: **generating a dataset release is the expensive operation**. Applying schema migrations can be risky depending on the migration, but it does not inherently regenerate the 3.2-million-event dataset.

### What I would change

For this project, I would not blindly run every migration automatically immediately before deployment. A safer pipeline is:

```text
CI quality gates
      ↓
check pending migrations
      ↓
if none
      └──────────────→ deploy

if pending
      ↓
apply reviewed migrations
      ↓
verify migration state
      ↓
deploy backend
      ↓
schema-aware smoke tests
```

The important guarantee is:

> **Never deploy backend code whose required database migrations have not been applied.**

For your current system, that could mean automatically applying migrations on `main`, or deliberately requiring a migration step before deployment. Either approach would have prevented #676.

### One more important weakness

You currently have a smoke test labelled:

```text
Smoke check deployed database access
```

but #676 proves "database access works" is insufficient.

Add a post-deployment smoke check for one or more endpoints that exercise current schema:

```bash
curl --fail \
  "$BACKEND_URL/api/v1/dataset-releases"
```

and ideally an explicit migration-state check before deployment.

That gives you two protections:

```text
Pre-deploy:
DB migration state compatible?

Post-deploy:
actual schema-dependent endpoint returns 2xx?
```

I would therefore create a separate issue rather than fold this into #676:

```text
DevOps: Prevent backend deployment when database migrations are pending
```

Acceptance criteria should include migration detection, deployment blocking or controlled application, and schema-dependent smoke testing.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:49:55 AM

make the issue - is it a bug?

## Response:
9/19/2026, 9:50:02 AM

> **Drafting bug issue**
>
> I’m classifying this as a production deployment bug: the pipeline is allowing backend code to deploy before required database migrations run, causing `/api/tasks` to return HTTP 500. I’m framing the fix around migration ordering, verification, and rollback safety.
>
> **Drafted bug issue**
>
> 
>
> Worked for 7s

Yes - **log this as a Bug**, specifically a **DevOps / deployment bug**. The deployed backend was allowed to go live while the database was missing required migrations, which caused a real `500` outage. Your current deployment workflows deploy and smoke-test the backend but do not run or enforce migration compatibility. `Pasted text.txt`

```md
# Bug: Backend deployment does not prevent database schema drift

## Summary

The backend deployment pipeline can deploy application code that depends on database migrations which have not yet been applied to the shared development database.

This caused #676: `GET /api/v1/dataset-releases` returned `500 INTERNAL_SERVER_ERROR` because the deployed backend expected `dataset_release.snapshot_id` and `dataset_release.snapshot_as_of`, while migration `20260917120000000_dataset-release-snapshots` had not been applied.

Applying the pending migrations immediately restored the endpoint to `HTTP 200`.

## Problem

The current CI/CD backend deployment flow:

1. Builds and tests the application.
2. Builds and pushes the backend container image.
3. Deploys the new Azure Container Apps revision.
4. Performs health and database-access smoke checks.

However, it does not ensure that the target database schema is compatible with the application being deployed.

A successful database connection is insufficient because the database may be reachable while still missing required tables, columns, indexes, constraints, or functions.

## Evidence

Before migrations were applied:

```text
GET /api/v1/dataset-releases
→ HTTP 500

Backend logs:
The database operation could not be completed.
```

The deployed database was missing:

```text
dataset_release.snapshot_id
dataset_release.snapshot_as_of
```

The following migration was still pending:

```text
20260917120000000_dataset-release-snapshots
```

`npm run db:migrate:dry --workspace=@sport-analytics/backend` showed seven pending migrations.

After running:

```bash
npm run db:migrate --workspace=@sport-analytics/backend
```

migration verification returned:

```text
No migrations to run!
```

Both deployed backends then returned:

```text
GET /api/v1/dataset-releases
→ HTTP 200
```

## Root Cause

Deployment does not currently enforce database migration compatibility before activating backend code.

The repository contains migration tooling:

```bash
npm run db:migrate --workspace=@sport-analytics/backend
npm run db:migrate:dry --workspace=@sport-analytics/backend
```

but the deployment workflows do not use it as part of the backend deployment process.

## Required Behaviour

Backend code must not be deployed against an incompatible database schema.

Migration handling should be explicit and safe. The pipeline should either:

- apply reviewed pending migrations before deploying schema-dependent application code; or
- detect pending migrations and block deployment until they have been applied.

Do not silently ignore pending migrations.

## Scope

Update the backend deployment process so that:

- migration compatibility is checked before backend deployment;
- pending required migrations cannot be silently skipped;
- migration failures prevent deployment;
- migration status is visible in CI/CD logs;
- database credentials remain sourced securely from the existing deployment secret infrastructure;
- the deployed application is smoke-tested against at least one schema-dependent endpoint;
- rollback/deployment workflows cannot silently deploy code against an incompatible schema.

The migration process must remain separate from dataset-release generation. Applying database schema migrations must not automatically generate a new dataset release.

## Acceptance Criteria

- [ ] CI/CD checks database migration state before deploying the backend.
- [ ] A deployment cannot complete successfully when required migrations are missing.
- [ ] Pending migrations are either applied through a controlled migration step or deployment is explicitly blocked.
- [ ] Migration command failure causes the deployment job to fail.
- [ ] Secrets such as `DATABASE_URL` are never printed in CI logs.
- [ ] Existing migration ordering through `node-pg-migrate` is preserved.
- [ ] Backend deployment only proceeds after migration compatibility is confirmed.
- [ ] Post-deployment smoke testing includes a schema-dependent endpoint such as `GET /api/v1/dataset-releases`.
- [ ] The smoke test fails deployment verification if the endpoint returns `5xx`.
- [ ] Existing health and database-access smoke checks remain operational.
- [ ] Dataset-release generation is not triggered by the migration process.
- [ ] Automated tests cover the deployment/migration decision logic.
- [ ] Deployment documentation explains how migrations are handled and how failed migrations are recovered.
- [ ] Verification evidence demonstrates a stale-schema deployment being rejected or corrected before backend activation.

## Suggested Verification

Demonstrate the following scenario in CI or an isolated test environment:

```text
Database schema behind application
        ↓
deployment starts
        ↓
migration compatibility check detects pending migration
        ↓
migration applied successfully OR deployment blocked
        ↓
backend is never activated against incompatible schema
```

Then verify:

```text
GET /api/v1/dataset-releases
→ 200
```

## Related Issues

- Refs #676 - Dataset releases endpoint returned 500 due to unapplied database migration.
- Refs #596 - Dataset release snapshot migration introduced the schema dependency.

## Priority

High

## Severity

High

## Type

Bug - DevOps / Deployment / Database Schema
```

I would put this in the **Bug Tracker**, because there is already demonstrated user-facing failure, not just a potential CI improvement. The later implementation can decide whether the safest policy is **automatic migration** or **block deployment until reviewed migrations are applied**; the bug requirement is that incompatible code and schema must never be deployed together.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/19/2026, 9:51:09 AM

give it as a md file to downoad

## Response:
9/19/2026, 9:51:19 AM

> **Creating downloadable backend deployment bug markdown file**
>
>
> **Created downloadable backend deployment bug markdown file**
>
> 
>
> Worked for 24s

[Download the Markdown issue file](sandbox:/mnt/data/bug-backend-deployment-schema-drift.md)



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)