# Fix Azure RBAC Deployment

**User:** Anonymous  
**Created:** 9/22/2026 17:50:25  
**Updated:** 9/22/2026 18:19:32  
**Exported:** 9/26/2026 13:11:41  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ab2a3c1-65e4-83ea-bb3a-6daf2567aa1c](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ab2a3c1-65e4-83ea-bb3a-6daf2567aa1c)  

## Prompt:
9/22/2026, 5:50:24 PM

[Logo](https://sdp.ms.wits.ac.za/) ([image](https://sdp.ms.wits.ac.za/assets/img/logo.svg))[Issues](https://sdp.ms.wits.ac.za/issues)[Pull Requests](https://sdp.ms.wits.ac.za/pulls)[Milestones](https://sdp.ms.wits.ac.za/milestones)[Explore](https://sdp.ms.wits.ac.za/explore/repos)

[svg](https://sdp.ms.wits.ac.za/notifications)

svg

[**git-push-pray**](https://sdp.ms.wits.ac.za/git-push-pray)**/**[**Sport-Analytics-Tool**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool)

**Internal**

[svgCode](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/)[svgIssues](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues)[**23**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues)[svgPull Requests](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[**2**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[**svgActions1**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[svgPackages](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/packages)[svgProjects](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[**2**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[svgReleases](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/releases)[svgWiki](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/wiki)[svgActivity](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/activity)[svgSettings](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/settings)

svg

## Merge pull request 'fix(deployment): prevent backend schema drift' ([#689](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/689)) from fix/678-prevent-schema-drift into main

[**ci.yml**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/?workflow=ci.yml)\:Commit[317e980fd0](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/commit/317e980fd0dd97040dc3d3833cea2e8f36d2f05c)pushed by[Dean](https://sdp.ms.wits.ac.za/Dean)[**main**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main)

[svgplan](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/0)

[Re-run1m10s](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/0)

[svgvalidation](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/1)

[Re-run0s](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/1)

[svgbrowser](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/2)

[Re-run0s](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/2)

[svgquality](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/3)

[Re-run4s](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/3)

[svgdeploy_frontend](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/4)

[Re-run3m36s](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/4)

[**svgdeploy_backend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/5)

[**Re-run3m28s**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/5)

[svgdeploy_docs](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/6)

[Re-run3m50s](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/6)

[svgdeploy_worker](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/7)

[Re-run10m7s](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/7)

[svgcoverage](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/8)

[Re-run3m19s](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/jobs/8)

Artifacts

- [svgrepository-coverage-317e980fd0dd97040dc3d3833cea2e8f36d2f05c](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions/runs/1282/artifacts/repository-coverage-317e980fd0dd97040dc3d3833cea2e8f36d2f05c)svg

### deploy_backend

Failure

svgsvgSet up job7s

svgsvgCheck out validated main commit40s

svgsvgSet up Node.js17s

svgsvgInstall root workspace dependencies51s

svgsvgValidate Container Apps deployment configuration1s

svgsvgVerify Docker npm registry connectivity6s

svgsvgInstall Azure CLI1m6s

svgsvgSign in to Azure7s

svgsvgApply pending backend database migrations3s

Run echo "Applying reviewed backend database migrations before backend activation."

Applying reviewed backend database migrations before backend activation.

ERROR: (Forbidden) Caller is not authorized to perform action on resource.

If role assignments, deny assignments or role definitions were changed recently, please observe propagation time.

Caller: appid=\*\*\*;oid=67ab2f7f-7929-4a43-b59a-aa405d4726a3;iss=[https://sts.windows.net/4b1b908c-5582-4377-ba07-a36d65e34934/](https://sts.windows.net/4b1b908c-5582-4377-ba07-a36d65e34934/)

Action: 'Microsoft.KeyVault/vaults/secrets/getSecret/action'

Resource: '/subscriptions/1d637eb6-257f-47bf-aeee-9cc0387ad705/resourcegroups/\*\*\*/providers/microsoft.keyvault/vaults/\*\*\*/secrets/backend-database-url'

Assignment: (not found)

DenyAssignmentId: null

DecisionReason: null 

Vault: \*\*\*;location=southafricanorth

Code: Forbidden

Message: Caller is not authorized to perform action on resource.

If role assignments, deny assignments or role definitions were changed recently, please observe propagation time.

Caller: appid=\*\*\*;oid=67ab2f7f-7929-4a43-b59a-aa405d4726a3;iss=[https://sts.windows.net/4b1b908c-5582-4377-ba07-a36d65e34934/](https://sts.windows.net/4b1b908c-5582-4377-ba07-a36d65e34934/)

Action: 'Microsoft.KeyVault/vaults/secrets/getSecret/action'

Resource: '/subscriptions/1d637eb6-257f-47bf-aeee-9cc0387ad705/resourcegroups/\*\*\*/providers/microsoft.keyvault/vaults/\*\*\*/secrets/backend-database-url'

Assignment: (not found)

DenyAssignmentId: null

DecisionReason: null 

Vault: \*\*\*;location=southafricanorth

Inner error: {

    "code": "ForbiddenByRbac"

}

\##[error]Process completed with exit code 1.

svgsvgSign in to Azure Container Registry0s

svgsvgPrepare Docker Buildx0s

svgsvgVerify Buildx npm registry connectivity0s

svgsvgBuild immutable backend container image0s

svgsvgSmoke check backend container image0s

svgsvgPush immutable backend image to Azure Container Registry0s

svgsvgDeploy backend Container Apps revision0s

svgsvgWait for the healthy backend Container Apps revision0s

svgsvgResolve backend Container Apps HTTPS endpoint0s

svgsvgSmoke check deployed backend health0s

svgsvgSmoke check deployed database access0s

svgsvgSmoke check deployed dataset-release schema access0s

svgsvgComplete job9s

[Powered by Gitea](https://about.gitea.com/)Version: 1.24.7 Page:**25ms**Template:**7ms**

[Licenses](https://sdp.ms.wits.ac.za/assets/licenses.txt)[API](https://sdp.ms.wits.ac.za/api/swagger)

## Response:
9/22/2026, 5:50:27 PM

The deployment failure is **Azure RBAC on Key Vault**, not a code/schema issue.

Your new migration step is running correctly:

```
Apply pending backend database migrations before backend activation
```

but the GitHub/Gitea Actions Azure identity does not have permission to read:

```
Microsoft.KeyVault/vaults/secrets/getSecret/action

Secret:
backend-database-url
```

The important part:

```
Assignment: (not found)
Inner error:
"code": "ForbiddenByRbac"
```

means the service principal / managed identity used by CI has **no Key Vault Secrets User role assignment**.

---

## Fix

### 1. Identify the deployment identity

From the error:

```
oid=67ab2f7f-7929-4a43-b59a-aa405d4726a3
```

This is the object ID of the identity running deployment.

Run:

```bash
az ad sp show --id 67ab2f7f-7929-4a43-b59a-aa405d4726a3
```

Confirm the app name.

---

### 2. Get your Key Vault resource ID

```bash
az keyvault show \
  --name <YOUR_KEYVAULT_NAME> \
  --resource-group <YOUR_RESOURCE_GROUP> \
  --query id \
  -o tsv
```

Example:

```
/subscriptions/.../resourceGroups/.../providers/Microsoft.KeyVault/vaults/...
```

---

### 3. Assign Key Vault Secrets User

Run:

```bash
az role assignment create \
  --assignee-object-id 67ab2f7f-7929-4a43-b59a-aa405d4726a3 \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.KeyVault/vaults/<vault>"
```

---

### 4. Verify

```bash
az role assignment list \
  --assignee 67ab2f7f-7929-4a43-b59a-aa405d4726a3 \
  --scope "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.KeyVault/vaults/<vault>" \
  -o table
```

Expected:

```
Role                       Scope
-------------------------  --------------------------------
Key Vault Secrets User     .../vaults/<vault>
```

---

### 5. Re-run only deploy_backend

The rest already passed:

✅ plan  
✅ validation  
✅ browser  
✅ quality  
✅ frontend deployment  
✅ docs deployment  
✅ worker deployment  

Only backend failed.

---

## Why this happened

Your change in `fix/678-prevent-schema-drift` introduced a deployment-time migration execution. That is the correct architecture because the migration now happens before backend activation.

However, the migration container/job needs the database URL secret.

Previously:

```
CI → Container Apps deploy
```

did not require reading the secret.

Now:

```
CI → Key Vault
       |
       ↓
 backend-database-url
       |
       ↓
 Prisma migration
       |
       ↓
 Container Apps
```

so the deployment identity needs Key Vault access.

This aligns with the brief requirement that deployment/security infrastructure is properly configured, and your deployment pipeline is already demonstrating CI/CD automation. `project_briefs (4).pdf`

---

## Do NOT change

Do not:
- hardcode `DATABASE_URL`
- move secrets into GitHub variables
- disable the migration step
- make Key Vault public

The fix is purely RBAC.

---

AI attribution (COMS3011A):
Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/22/2026, 6:14:16 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ az ad sp show --id 67ab2f7f-7929-4a43-b59a-aa405d4726a3
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#servicePrincipals/$entity",
  "accountEnabled": true,
  "addIns": [],
  "alternativeNames": [],
  "appDescription": null,
  "appDisplayName": "statsthegame-worker-deployer",
  "appId": "7f0eba18-b734-443f-ba81-e059248ed9e7",
  "appOwnerOrganizationId": "4b1b908c-5582-4377-ba07-a36d65e34934",
  "appRoleAssignmentRequired": false,
  "appRoles": [],
  "applicationTemplateId": null,
  "createdByAppId": "b677c290-cf4b-4a8e-a60e-91ba650a4abe",
  "createdDateTime": "2026-09-10T15:13:13Z",
  "deletedDateTime": null,
  "description": null,
  "disabledByMicrosoftStatus": null,
  "displayName": "statsthegame-worker-deployer",
  "homepage": null,
  "id": "67ab2f7f-7929-4a43-b59a-aa405d4726a3",
  "info": {
    "logoUrl": null,
    "marketingUrl": null,
    "privacyStatementUrl": null,
    "supportUrl": null,
    "termsOfServiceUrl": null
  },
  "isDisabled": null,
  "keyCredentials": [],
  "loginUrl": null,
  "logoutUrl": null,
  "notes": null,
  "notificationEmailAddresses": [],
  "oauth2PermissionScopes": [],
  "passwordCredentials": [],
  "preferredSingleSignOnMode": null,
  "preferredTokenSigningKeyThumbprint": null,
  "replyUrls": [],
  "resourceSpecificApplicationPermissions": [],
  "samlSingleSignOnSettings": null,
  "servicePrincipalNames": [
    "7f0eba18-b734-443f-ba81-e059248ed9e7"
  ],
  "servicePrincipalType": "Application",
  "signInAudience": "AzureADMyOrg",
  "tags": [],
  "tokenEncryptionKeyId": null,
  "verifiedPublisher": {
    "addedDateTime": null,
    "displayName": null,
    "verifiedPublisherId": null
  }
}
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ az keyvault show \
  --name <YOUR_KEYVAULT_NAME> \
  --resource-group <YOUR_RESOURCE_GROUP> \
  --query id \
  -o tsv
-bash: YOUR_KEYVAULT_NAME: No such file or directory
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/22/2026, 6:14:21 PM

Confirmed. The failing identity is:

```text
Service Principal:
statsthegame-worker-deployer

Object ID:
67ab2f7f-7929-4a43-b59a-aa405d4726a3

Application ID:
7f0eba18-b734-443f-ba81-e059248ed9e7
```

The previous command failed because `<YOUR_KEYVAULT_NAME>` and `<YOUR_RESOURCE_GROUP>` were placeholders. You need the actual Azure resource names.

Run this to discover the Key Vault:

```bash
az keyvault list -o table
```

You should see something like:

```text
Name                         ResourceGroup
---------------------------  -------------------
statsthegame-dev-kv          statsthegame-dev-rg
```

Then run:

```bash
az keyvault show \
  --name statsthegame-dev-kv \
  --resource-group statsthegame-dev-rg \
  --query id \
  -o tsv
```

Copy the returned ID.

Then assign the role:

```bash
az role assignment create \
  --assignee-object-id 67ab2f7f-7929-4a43-b59a-aa405d4726a3 \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "$(az keyvault show \
    --name statsthegame-dev-kv \
    --resource-group statsthegame-dev-rg \
    --query id \
    -o tsv)"
```

Verify:

```bash
az role assignment list \
  --assignee 67ab2f7f-7929-4a43-b59a-aa405d4726a3 \
  --scope "$(az keyvault show \
    --name statsthegame-dev-kv \
    --resource-group statsthegame-dev-rg \
    --query id \
    -o tsv)" \
  -o table
```

Expected:

```text
Principal                         Role
--------------------------------  ------------------------
statsthegame-worker-deployer      Key Vault Secrets User
```

Then rerun the failed `deploy_backend` job.

This is the correct fix because your deployment pipeline now performs migrations before backend activation, so the deployment identity must be able to retrieve the database secret. The project brief requires CI/CD deployment processes and secure authentication practices rather than bypassing security controls. `project_briefs (4).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/22/2026, 6:14:52 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ az keyvault list -o table
Location          Name                 ResourceGroup
----------------  -------------------  -------------------
southafricanorth  statsthegame-dev-kv  rg-statsthegame-dev
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ az keyvault show \
  --name statsthegame-dev-kv \
  --resource-group statsthegame-dev-rg \
  --query id \
  -o tsv
(ResourceGroupNotFound) Resource group 'statsthegame-dev-rg' could not be found.
Code: ResourceGroupNotFound
Message: Resource group 'statsthegame-dev-rg' could not be found.
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
9/22/2026, 6:14:55 PM

You have the correct values now. The mistake was only the resource group name.

Your Key Vault is:

```text
Name:
statsthegame-dev-kv

Resource Group:
rg-statsthegame-dev
```

Run:

```bash
az keyvault show \
  --name statsthegame-dev-kv \
  --resource-group rg-statsthegame-dev \
  --query id \
  -o tsv
```

Then assign the permission:

```bash
az role assignment create \
  --assignee-object-id 67ab2f7f-7929-4a43-b59a-aa405d4726a3 \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "$(az keyvault show \
    --name statsthegame-dev-kv \
    --resource-group rg-statsthegame-dev \
    --query id \
    -o tsv)"
```

Verify:

```bash
az role assignment list \
  --assignee 67ab2f7f-7929-4a43-b59a-aa405d4726a3 \
  --scope "$(az keyvault show \
    --name statsthegame-dev-kv \
    --resource-group rg-statsthegame-dev \
    --query id \
    -o tsv)" \
  -o table
```

You should see:

```text
Role
-------------------------
Key Vault Secrets User
```

After that, rerun only:

```text
deploy_backend
```

The failure should move past:

```text
Apply pending backend database migrations
```

because the deployment identity (`statsthegame-worker-deployer`) will finally be able to read:

```text
backend-database-url
```

No code changes are required. This is an Azure RBAC configuration fix introduced by the migration deployment step. Your CI/CD setup remains aligned with the project requirement for automated deployment processes. `project_briefs (4).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/22/2026, 6:16:33 PM

so what did you do

## Response:
9/22/2026, 6:16:37 PM

I have not changed anything in Azure yet. I only **diagnosed the failure and gave you the commands to fix it**.

What happened:

1. Your deployment failed because this identity:

```text
statsthegame-worker-deployer
Object ID:
67ab2f7f-7929-4a43-b59a-aa405d4726a3
```

tried to read this Key Vault secret:

```text
backend-database-url
```

but Azure denied it:

```text
ForbiddenByRbac
Assignment: (not found)
```

Meaning:

> The deployment service principal exists, but it has no permission to read secrets from the Key Vault.

---

2. I asked you to identify the identity.

You ran:

```bash
az ad sp show --id 67ab2f7f-7929-4a43-b59a-aa405d4726a3
```

and confirmed:

```text
statsthegame-worker-deployer
```

---

3. I asked you to find the Key Vault.

You ran:

```bash
az keyvault list -o table
```

and found:

```text
Key Vault:
statsthegame-dev-kv

Resource Group:
rg-statsthegame-dev
```

---

4. The next step is the actual fix:

Give that deployment identity permission:

```
statsthegame-worker-deployer
          |
          |  Key Vault Secrets User role
          ↓
statsthegame-dev-kv
          |
          ↓
backend-database-url secret
```

The command:

```bash
az role assignment create ...
```

will create that Azure RBAC role assignment.

After that:

- CI logs into Azure ✅
- CI reads `backend-database-url` ✅
- Prisma migration runs ✅
- Backend deployment continues ✅

So currently:

**Changed by me:** nothing  
**Diagnosed:** Azure RBAC missing permission  
**Next action:** run the role assignment command to grant the deployment identity Key Vault secret access.

## Prompt:
9/22/2026, 6:19:12 PM

what was the actual problem

## Response:
9/22/2026, 6:19:15 PM

The **actual problem** was:

> Your new deployment step added database migrations during backend deployment, but the Azure identity running that deployment did not have permission to read the database secret from Azure Key Vault.

Before this change, your deployment flow was effectively:

```
CI/CD Pipeline
      |
      ↓
Deploy Backend Container App
      |
      ↓
Backend starts
```

After `fix/678-prevent-schema-drift`, it became:

```
CI/CD Pipeline
      |
      ↓
Login to Azure as statsthegame-worker-deployer
      |
      ↓
Read backend-database-url from Key Vault  ❌
      |
      ↓
Run database migrations
      |
      ↓
Deploy backend
```

The failure happened here:

```
Microsoft.KeyVault/vaults/secrets/getSecret/action
```

Azure was saying:

```
Caller: statsthegame-worker-deployer
Secret: backend-database-url
Assignment: (not found)
Decision: ForbiddenByRbac
```

Meaning:

- ✅ The service principal exists.
- ✅ Azure authentication worked.
- ✅ The deployment workflow reached the migration stage.
- ❌ The service principal had **no RBAC role allowing Key Vault secret reads**.

The missing permission was:

```
statsthegame-worker-deployer
          |
          needs
          ↓
Key Vault Secrets User
          |
          ↓
statsthegame-dev-kv/backend-database-url
```

So the code change itself was not broken. The deployment became more secure by requiring the database secret at migration time, but the infrastructure permissions were not updated alongside it.

The fix is to add the Azure RBAC assignment:

```
Role:
Key Vault Secrets User

Scope:
statsthegame-dev-kv

Principal:
statsthegame-worker-deployer
```

After that, the pipeline should continue past:

```
Apply pending backend database migrations before backend activation
```

and proceed with the backend deployment. This is consistent with the project requirement that deployment infrastructure and CI/CD processes are configured correctly rather than bypassing security controls. `project_briefs (4).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)