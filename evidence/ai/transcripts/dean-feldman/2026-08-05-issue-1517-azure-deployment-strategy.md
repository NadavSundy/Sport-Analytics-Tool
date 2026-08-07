# Azure Deployment Strategy

**User:** Anonymous  
**Created:** 8/5/2026 20:41:03  
**Updated:** 8/5/2026 22:11:22  
**Exported:** 8/7/2026 12:52:52  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a7383b5-e028-83ea-9990-a46951142918](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a7383b5-e028-83ea-9990-a46951142918)  

## Prompt:
8/5/2026, 8:41:01 PM

Logo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
7
Pull Requests
1
Actions
8
Packages
Projects
1
Releases
Wiki
Activity
Settings
Establish the Azure backend deployment foundation #15
Open
opened 6 hours ago by Shayna · 0 comments

Shayna commented 6 hours ago
Member
Description
Investigate the suitable Azure hosting options and deploy the existing Express backend foundation to a non-production Azure environment.

The deployed application must expose the current health endpoint and use environment-based configuration. This issue establishes the deployment path only and must not add sport-specific functionality.

Motivation
The project requires deployment and CI/CD processes. Establishing the backend deployment path early removes uncertainty around hosting, environment configuration, logs and public service availability.

A successful health-endpoint deployment proves that the current backend can be built and hosted before database, authentication and product-specific functionality are added.

Scope
Included
comparing suitable Azure hosting options;
selecting and motivating one Azure service;
creating a non-production Azure resource;
deploying the current Express backend;
configuring environment variables securely;
verifying the public health endpoint;
documenting logs, costs and repeatable deployment steps;
recording the deployment decision.
Excluded
deploying the frontend application;
deploying the MkDocs site;
configuring the final production domain;
implementing sport-specific endpoints;
requiring the Supabase or authentication foundations to be complete;
creating a full production environment.
Acceptance Criteria
At least two suitable Azure hosting options are briefly compared
One hosting option is selected and motivated in an ADR
Expected free-tier or cost limitations are documented
A non-production Azure resource is created
The backend production build succeeds
The backend is deployed successfully
The deployed /api/v1/health endpoint returns HTTP 200
The deployed service uses environment-based configuration
No Azure credentials or secrets are committed
Production or hosted CORS behaviour is considered and documented
Application logs can be accessed
The deployment can be repeated using documented steps
The public backend URL is recorded in the deployment documentation
A rollback or redeployment approach is documented
The future CI/CD automation step is documented
No sport-specific endpoint or feature is added
Dependencies
An Azure subscription or approved student Azure access is required.

A manual deployment may be used for the initial foundation if the Gitea Actions runner is not yet available. Automated deployment can be completed once CI infrastructure is working.

Evidence
Evidence must include:

the Azure hosting ADR;
the public health-endpoint result;
deployment logs or screenshots;
secure configuration evidence;
repeatable deployment instructions;
cost or free-tier notes;
confirmation that no secrets were committed;
the linked Pull Request.
AI Declaration
The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

 Shayna added this to the Sprint 1 milestone 6 hours ago
 Shayna added the 
type: infrastructure
area: infrastructure
 labels 6 hours ago
 Shayna added this to the Sport-Analytics-Tool-Proj project 6 hours ago
 Shayna moved this to Ready in  Sport-Analytics-Tool-Proj on 6 hours ago
 Dean self-assigned this 6 hours ago
 Dean moved this to In Progress in  Sport-Analytics-Tool-Proj on 6 hours ago

Write
Preview
Leave a comment
Drop files or click here to upload.
area: infrastructure
type: infrastructure
Sprint 1
Sport-Analytics-Tool-Proj

Dean
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Dependencies
No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#15
 
Powered by Gitea
Version: 1.24.7 Page:
105ms
Template:
24ms
Licenses
API

Logo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
7
Pull Requests
1
Actions
8
Packages
Projects
1
Releases
Wiki
Activity
Settings
Establish Azure frontend deployment foundation #17
Open
opened 5 hours ago by Shayna · 0 comments

Shayna commented 5 hours ago
Member
Description
Establish the initial Azure deployment foundation for the Sport Analytics Tool frontend.

The frontend should be deployed from the existing Vite application and made available through a public HTTPS URL. The deployment must use environment-specific configuration so that the frontend can later communicate with the deployed backend without exposing backend secrets or database credentials.

The selected Azure hosting service and deployment approach must be documented and motivated.

Motivation
An early frontend deployment provides the team with a stable environment for stakeholder demonstrations, integration testing and user testing.

Keeping frontend deployment separate from backend deployment also provides clearer ownership, evidence and troubleshooting. Although the same team member may work on both Azure issues, each deployment should have its own branch, Pull Request and documentation.

Acceptance Criteria
An appropriate Azure hosting service for the Vite frontend has been selected.
The selected service and the reason for choosing it have been documented.
The frontend installs successfully using npm ci.
The frontend production build completes successfully.
The frontend is deployed to a publicly accessible HTTPS URL.
The deployed application loads successfully without blocking browser-console errors.
The deployed frontend displays the existing application interface correctly.
VITE_API_BASE_URL can be configured for the deployed environment.
No backend secrets, database credentials or private API keys are exposed through frontend environment variables.
Frontend deployment instructions are added to the repository documentation.
The public deployment URL is recorded in the documentation or Pull Request.
npm run check passes before the Pull Request is opened.
The work is completed through a reviewed Pull Request linked to this issue.
Dependencies
The final frontend-to-backend connection depends on the Azure backend deployment issue providing a working backend URL.
Automated deployment may depend on a Gitea Actions runner becoming available.
This issue does not include database provisioning or backend hosting.
Evidence
Link or attach:

the Pull Request implementing the deployment;
the public Azure frontend URL;
a screenshot of the deployed frontend;
evidence of a successful production build;
the updated deployment documentation; and
any Azure configuration evidence that does not expose secrets.
AI Declaration
The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

 Shayna added this to the Sprint 1 milestone 5 hours ago
 Shayna added the 
type: infrastructure
 label 5 hours ago
 Dean was assigned by Shayna 5 hours ago
 Shayna added this to the Sport-Analytics-Tool-Proj project 5 hours ago
 Shayna added the 
area: frontend
 label 5 hours ago
 Shayna moved this to Ready in  Sport-Analytics-Tool-Proj on 5 hours ago
 Dean moved this to In Progress in  Sport-Analytics-Tool-Proj on 4 hours ago

Write
Preview
Leave a comment
Drop files or click here to upload.
area: frontend
type: infrastructure
Sprint 1
Sport-Analytics-Tool-Proj

Dean
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Dependencies
No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#17
 
Powered by Gitea
Version: 1.24.7 Page:
103ms
Template:
22ms
Licenses
API

## Response:
8/5/2026, 8:41:03 PM

> **Searching the web**
>
> [Pricing - Wikipedia](https://en.wikipedia.org/wiki/Pricing)
> [Quickstart: Create a Node.js Web App - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
> [Static Web Apps pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/static/)
> [What is Pricing? | DealHub AI](https://dealhub.io/glossary/pricing/)
> [Pricing Methods: A Complete Guide | Esade](https://www.esade.edu/beyond/en/pricing-methods/)
> [How to Price a Product or Service](https://business.bankofamerica.com/en/resources/how-to-price-a-product-or-service)
> [Pricing is Strategy － Why Pricing is More than Just a Number](https://www.nri.com/en/media/column/mcs_blog/20251201.html)
> [How to Price Your Products (Pricing Strategy Guide) - YouTube](https://www.youtube.com/watch?v=U7BB1qNytcs)
> [Pricing - an overview | ScienceDirect Topics](https://www.sciencedirect.com/topics/social-sciences/pricing)
>
> **Searched 9 websites**
>
> 
>
> Worked for 9s

## Recommended outcome

Treat these as **two separate infrastructure deliverables**:

- **Issue #15:** Deploy the Express backend to **Azure App Service on Linux**.
- **Issue #17:** Deploy the Vite frontend to **Azure Static Web Apps**.
- Use separate branches, ADRs, deployment guides, evidence folders, and pull requests.
- Complete the backend first because the frontend’s deployed `VITE_API_BASE_URL` depends on its public URL.

This is appropriate for Milestone 1 because the rubric rewards early implementation of supporting requirements, comprehensive development planning, documented technology choices, and a usable deployment foundation. `project_briefs (4).pdf`

## Service choices

### Backend: Azure App Service

Recommended over Azure Container Apps for the initial foundation.

| Option | Advantages | Disadvantages |
|---|---|---|
| Azure App Service | Direct Node/Express support, simple deployment, environment settings, HTTPS, logs, free-tier path | Less container control; free-tier limitations |
| Azure Container Apps | Container-based, scalable, closer to production container workflows | More setup, registry/container complexity, unnecessary for the current health endpoint |

Microsoft’s current Node.js quickstart explicitly supports deploying Express applications to App Service and describes a Free-tier setup. The backend must listen on `process.env.PORT`, which App Service supplies. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs?utm_source=chatgpt.com))

### Frontend: Azure Static Web Apps

Recommended over a second App Service.

| Option | Advantages | Disadvantages |
|---|---|---|
| Azure Static Web Apps | Designed for Vite/static builds, public HTTPS, free plan, static hosting, lightweight | Vite variables must be available during the build |
| Azure App Service | Common deployment model with backend | Wasteful for static files, more configuration and potentially higher cost |

Azure Static Web Apps provides a Free plan with hosting and SSL, making it a strong fit for the non-production Vite frontend. ([Microsoft Azure](https://azure.microsoft.com/en-us/pricing/details/app-service/static/?utm_source=chatgpt.com))

---

# Issue #15 - Backend deployment

## 1. Create the branch

```bash
git switch main
git pull origin main
git switch -c infra/15-azure-backend-deployment
```

## 2. Verify the backend locally

From the repository root:

```bash
npm ci
npm run check
npm run build
npm test
```

Then start the production build using your actual workspace command, for example:

```bash
npm run start --workspace=backend
```

Test:

```bash
curl http://localhost:3000/api/v1/health
```

Expected:

```text
HTTP 200
```

Do not continue until this works locally.

## 3. Verify Azure-compatible port handling

Your backend must use the Azure-provided port.

Example:

```ts
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
```

Do not hard-code only port `3000`. Azure App Service supplies `PORT` to the application. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs?utm_source=chatgpt.com))

Also confirm that `package.json` has a production start command such as:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

The exact output path must match your repository.

## 4. Install and sign in to Azure CLI

```bash
az version
az login
az account show
```

List subscriptions if necessary:

```bash
az account list --output table
```

Select the correct subscription:

```bash
az account set --subscription "<SUBSCRIPTION_ID_OR_NAME>"
```

## 5. Set reusable names

Use globally unique lowercase names.

PowerShell:

```powershell
$RESOURCE_GROUP="rg-sport-analytics-dev"
$LOCATION="southafricanorth"
$APP_PLAN="asp-sport-analytics-dev"
$BACKEND_APP="sport-analytics-api-dev-<unique-suffix>"
```

Bash:

```bash
RESOURCE_GROUP="rg-sport-analytics-dev"
LOCATION="southafricanorth"
APP_PLAN="asp-sport-analytics-dev"
BACKEND_APP="sport-analytics-api-dev-<unique-suffix>"
```

Use `southafricanorth` only if the selected service and subscription make it available. Otherwise document the region selected and the reason.

## 6. Create Azure resources

```bash
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"
```

Create a Linux App Service plan:

```bash
az appservice plan create \
  --name "$APP_PLAN" \
  --resource-group "$RESOURCE_GROUP" \
  --sku F1 \
  --is-linux
```

Create the web application:

```bash
az webapp create \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN" \
  --runtime "NODE:22-lts"
```

Before using the runtime value, verify what your CLI currently supports:

```bash
az webapp list-runtimes --os linux | grep NODE
```

Choose the same supported major Node version that the repository declares.

## 7. Configure environment settings

Example non-secret settings:

```bash
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --settings \
    NODE_ENV=production \
    API_VERSION=v1
```

Later secrets such as database URLs must be configured in Azure settings, not committed to Git. App Service exposes manually configured application settings as environment variables. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings?utm_source=chatgpt.com))

Do not put these in source control:

```text
DATABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AUTH_CLIENT_SECRET
AZURE_CREDENTIALS
```

## 8. Configure the startup command if needed

For a TypeScript backend:

```bash
az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --startup-file "npm run start"
```

The application package must already contain the built output or the Azure deployment process must run the build.

## 9. Deploy manually for the foundation

Build locally:

```bash
npm ci
npm run build
```

Create a deployment ZIP containing the backend production package. Do not blindly ZIP the entire monorepo unless its root production start command is designed for that.

A typical package should contain:

```text
dist/
package.json
package-lock.json
```

Deploy:

```bash
az webapp deploy \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --src-path backend-deploy.zip \
  --type zip
```

If you rely on Azure to install/build the application, set:

```bash
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

## 10. Enable and inspect logs

```bash
az webapp log config \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --application-logging filesystem \
  --level information \
  --web-server-logging filesystem
```

Stream logs:

```bash
az webapp log tail \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP"
```

## 11. Verify the health endpoint

```bash
curl -i "https://${BACKEND_APP}.azurewebsites.net/api/v1/health"
```

Record:

```text
Backend URL:
https://<app-name>.azurewebsites.net

Health URL:
https://<app-name>.azurewebsites.net/api/v1/health
```

Acceptance requires an actual HTTP `200`, not merely a successfully completed deployment.

## 12. Configure CORS deliberately

Do not use unrestricted CORS for the hosted environment unless clearly temporary and documented.

Prefer:

```ts
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
```

Azure setting:

```bash
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --settings \
    CORS_ALLOWED_ORIGINS="https://<frontend-name>.azurestaticapps.net"
```

Until the frontend URL exists, document that this value will be updated during Issue #17.

---

# Issue #17 - Frontend deployment

## 1. Create a separate branch

After Issue #15 is merged:

```bash
git switch main
git pull origin main
git switch -c infra/17-azure-frontend-deployment
```

## 2. Confirm environment-based API configuration

Example:

```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is not configured");
}

export { apiBaseUrl };
```

Add a safe example file:

```dotenv
# frontend/.env.example
VITE_API_BASE_URL=http://localhost:3000
```

Never put database credentials, service-role keys, OAuth client secrets, or private API keys in a `VITE_*` variable. Vite variables are included in client-side output and are visible to users.

## 3. Verify locally

```bash
npm ci
npm run check
npm run build
```

For a monorepo, use your existing workspace form:

```bash
npm run build --workspace=frontend
```

Preview the production output:

```bash
npm run preview --workspace=frontend
```

Check:

- application loads;
- no uncaught browser-console errors;
- route refreshes work;
- API base URL is correct;
- responsive layout still works.

## 4. Deployment approach

Azure Static Web Apps normally integrates directly with GitHub or Azure DevOps. Since your authoritative repository is on Gitea, do not create a misleading GitHub development history merely to deploy.

For Sprint 1, use one of these defensible approaches:

1. **Preferred initial approach:** Build through Gitea/manual CI and deploy the generated `dist` directory using the Azure Static Web Apps CLI or deployment token.
2. **Later CI/CD:** Store the deployment token as a protected Gitea Actions secret and automate the same command after checks pass.

This keeps Gitea as the source of truth and satisfies the issue’s allowance for initial manual deployment.

## 5. Install the Static Web Apps CLI

```bash
npm install --global @azure/static-web-apps-cli
```

Build with the backend URL:

PowerShell:

```powershell
$env:VITE_API_BASE_URL="https://<backend-name>.azurewebsites.net"
npm run build --workspace=frontend
```

Bash:

```bash
VITE_API_BASE_URL="https://<backend-name>.azurewebsites.net" \
npm run build --workspace=frontend
```

Vite’s `VITE_*` values are build-time values embedded into the final frontend bundle, so they must exist during the production build. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration?utm_source=chatgpt.com))

## 6. Create the Static Web App

This can be created in the Azure Portal:

- Resource type: **Static Web App**
- Plan: **Free**
- Environment: non-production/dev
- Region: nearest available appropriate region
- Deployment source: choose an option compatible with the intended manual/token deployment
- Do not add an Azure Functions API; your Express API is separate.

Generate or retrieve the Static Web Apps deployment token securely.

Do not paste the token into:

- issue comments;
- commits;
- screenshots;
- PR descriptions;
- `.env.example`;
- documentation.

## 7. Deploy the built frontend

```bash
swa deploy ./frontend/dist \
  --deployment-token "$SWA_CLI_DEPLOYMENT_TOKEN" \
  --env production
```

Adjust `./frontend/dist` to the actual build output.

## 8. Add SPA routing configuration

For React Router or any client-side routing, add:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.{css,js,png,jpg,jpeg,gif,svg,ico,webp}"]
  }
}
```

Place it where Azure Static Web Apps will copy it into the deployed output, commonly:

```text
frontend/public/staticwebapp.config.json
```

After building, verify that it appears in:

```text
frontend/dist/staticwebapp.config.json
```

## 9. Update backend CORS

Once the frontend URL exists:

```bash
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --settings \
    CORS_ALLOWED_ORIGINS="https://<frontend-name>.azurestaticapps.net"
```

Restart if necessary:

```bash
az webapp restart \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP"
```

## 10. Verify the hosted frontend

Check:

```text
https://<frontend-name>.azurestaticapps.net
```

Capture evidence of:

- successful `npm ci`;
- successful `npm run check`;
- successful production build;
- Azure deployment result;
- public HTTPS page;
- browser console with no blocking errors;
- frontend-to-backend request;
- backend health response;
- Azure resource overview without secrets.

---

# Required repository files

Recommended structure:

```text
docs/
├── adr/
│   ├── 0003-use-azure-app-service-for-backend.md
│   └── 0004-use-azure-static-web-apps-for-frontend.md
├── deployment/
│   ├── azure-backend.md
│   ├── azure-frontend.md
│   ├── rollback.md
│   └── environments.md
└── evidence/
    └── sprint-1/
        ├── issue-15-azure-backend/
        │   └── README.md
        └── issue-17-azure-frontend/
            └── README.md
```

Do not commit screenshots containing tokens, subscription IDs that your team considers sensitive, credentials, database strings, or portal secret values.

## Backend ADR decision

Use this decision:

> Deploy the non-production Express API to Azure App Service on Linux because it supports Node.js directly, provides managed HTTPS, runtime environment settings and accessible logs, and requires less operational complexity than container-based hosting for the current foundation.

## Frontend ADR decision

Use this decision:

> Deploy the Vite frontend to Azure Static Web Apps because it is designed for static web assets, provides managed HTTPS and a free plan, and keeps frontend hosting independent from the Express backend.

---

# Pull request sequence

## PR 1 - Issue #15

Suggested title:

```text
infra(backend): establish Azure App Service deployment
```

Commit example:

```bash
git add .
git commit -m "infra(backend): establish Azure deployment foundation" \
  -m "Add the App Service deployment configuration, ADR, environment guidance, logging instructions and rollback procedure for issue #15." \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"
```

Push:

```bash
git push -u origin infra/15-azure-backend-deployment
```

## PR 2 - Issue #17

Suggested title:

```text
infra(frontend): establish Azure Static Web Apps deployment
```

Commit example:

```bash
git add .
git commit -m "infra(frontend): establish Azure deployment foundation" \
  -m "Add Static Web Apps deployment configuration, environment handling, SPA routing and deployment documentation for issue #17." \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"
```

Push:

```bash
git push -u origin infra/17-azure-frontend-deployment
```

The AI-assisted commit trailer is consistent with the course policy, which requires code-generation assistance to be declared in the relevant commit and AI usage to be documented in the repository README. `ai_policy.pdf`

## Important brief risk

Using **Supabase as the database is allowed only as database infrastructure**. You must not use generated Supabase endpoints as your project API. All frontend application requests should pass through your hand-written Express HTTP API, because the brief prohibits generated endpoints such as Supabase or Firebase endpoints. `project_briefs (4).pdf`

## Completion checklist

- [ ] Backend branch and frontend branch are separate.
- [ ] Backend App Service ADR compares at least two options.
- [ ] Frontend Static Web Apps ADR records the decision.
- [ ] Express listens on `process.env.PORT`.
- [ ] `/api/v1/health` returns public HTTP 200.
- [ ] Application logs are accessible.
- [ ] `VITE_API_BASE_URL` is provided at build time.
- [ ] No secrets are included in any `VITE_*` variable.
- [ ] Hosted CORS allows the actual frontend origin.
- [ ] Both deployments have repeatable instructions.
- [ ] Rollback/redeployment procedure is documented.
- [ ] Build, check, URL, screenshot and log evidence is preserved.
- [ ] Each change is reviewed and merged through its own PR.
- [ ] AI use is declared in commits and documentation.

---

**Sources:**

- [Quickstart: Create a Node.js Web App - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs?utm_source=chatgpt.com)
- [Static Web Apps pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/static/?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:01:25 PM

k im doing this on the azure web page, give me the steps

our project nmame is Stat’sTheGame

## Response:
8/5/2026, 9:01:34 PM

> **Searching the web**
>
> [Quickstart: Create a Node.js Web App - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
> [Microsoft Azure: Cloud Computing Services](https://azure.microsoft.com/en-in)
>
> **Searched 2 websites**
>
> 
>
> Worked for 8s

## Recommended outcome

Create one Azure resource group for **Stat’sTheGame**, then create:

- **Backend:** Azure App Service
- **Frontend:** Azure Static Web App

Use **Stat’sTheGame** as the public project/display name, but Azure resource names cannot reliably use the curly apostrophe. Use simple lowercase names such as:

```text
Project display name: Stat’sTheGame
Resource group: rg-statsthegame-dev
Backend app: statsthegame-api-dev
Frontend app: statsthegame-web-dev
```

Azure app names must be globally unique, so you may need to add your group name or a short suffix:

```text
statsthegame-api-gpp-dev
statsthegame-web-gpp-dev
```

Start with the **backend**.

# Part 1: Create the backend App Service

## Step 1: Open App Services

1. Sign in to the Azure Portal.
2. In the top search bar, search for **App Services**.
3. Open **App Services**.
4. Select **Create**.
5. Select **Web App**.

Azure App Service supports Node.js and Express applications on Linux. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs?utm_source=chatgpt.com))

## Step 2: Complete the Basics tab

Enter the following:

### Project details

**Subscription**

Choose your Azure student subscription or the approved project subscription.

**Resource group**

Select **Create new** and enter:

```text
rg-statsthegame-dev
```

### Instance details

**Name**

Try:

```text
statsthegame-api-dev
```

If unavailable:

```text
statsthegame-api-gpp-dev
```

The final URL will resemble:

```text
https://statsthegame-api-gpp-dev.azurewebsites.net
```

**Publish**

```text
Code
```

Do not select Docker Container for this first deployment.

**Runtime stack**

Choose the same Node.js major version used by your repository.

Likely:

```text
Node 22 LTS
```

Check your root or backend `package.json` before choosing. Do not choose Node 24 merely because it is newest unless your project already supports it.

**Operating System**

```text
Linux
```

**Region**

Try:

```text
South Africa North
```

If the selected free plan is unavailable there, choose an available nearby region and document the reason.

## Step 3: Create the App Service plan

Under **Linux Plan**, select **Create new**.

Use:

```text
asp-statsthegame-dev
```

For **Pricing plan**, select:

```text
Free F1
```

The free tier is suitable for the initial health-endpoint foundation, although it has limited resources and is not appropriate for final production use. Microsoft’s Node.js quickstart uses an App Service Free-tier configuration. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs?utm_source=chatgpt.com))

If Azure does not show Free F1:

1. Select **Explore pricing plans**.
2. Look under **Dev/Test**.
3. Select **F1** where available.

Do not choose an expensive production tier for Sprint 1.

## Step 4: Deployment tab

Because your authoritative repository is on Wits Gitea:

```text
Continuous deployment: Disable
```

Do not connect GitHub unless your team has deliberately created an approved mirror and documented it.

Issue #15 allows the first deployment to be manual.

## Step 5: Networking tab

For now, leave:

```text
Public access: On
```

The health endpoint must be publicly reachable for your evidence.

Do not configure private endpoints for this Sprint 1 foundation.

## Step 6: Monitoring tab

If Azure asks about Application Insights:

```text
Enable Application Insights: No
```

This avoids unnecessary complexity and possible additional cost for the initial foundation.

You can use normal App Service application logging for Issue #15.

## Step 7: Tags

Add useful tags:

| Name | Value |
|---|---|
| `project` | `Stat’sTheGame` |
| `environment` | `development` |
| `course` | `COMS3011A` |
| `managed-by` | `git-push-pray` |

Tags are optional but provide useful infrastructure evidence.

## Step 8: Review and create

1. Select **Review + create**.
2. Check the pricing plan carefully.
3. Confirm it shows **Free F1**, or the low-cost plan your team approved.
4. Select **Create**.
5. Wait for deployment to finish.
6. Select **Go to resource**.

Take a screenshot of the successful resource creation, but ensure no subscription-sensitive information needs to be hidden.

# Part 2: Configure the backend

## Step 9: Set environment variables

Inside your new App Service:

1. Open **Settings**.
2. Select **Environment variables**.

Depending on the current Azure interface, this may appear as:

```text
Settings → Environment variables
```

or:

```text
Settings → Configuration → Application settings
```

Select **Add** and add:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `API_VERSION` | `v1` |

Do not add `PORT` manually. Azure App Service supplies the port, and your Express app must listen on `process.env.PORT`. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs?utm_source=chatgpt.com))

Your backend should contain logic equivalent to:

```ts
const port = Number(process.env.PORT ?? 3000);
```

Select:

```text
Apply
```

or:

```text
Save
```

Accept the restart prompt if Azure displays one.

App Service application settings are provided to the running application as environment variables. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings?utm_source=chatgpt.com))

## Step 10: Configure the startup command

Open:

```text
Settings → Configuration → General settings
```

Look for:

```text
Startup Command
```

The correct value depends on your backend package.

Likely one of:

```text
npm run start
```

or:

```text
node dist/server.js
```

Do not guess this. Check the backend `package.json`, for example:

```json
{
  "scripts": {
    "start": "node dist/server.js"
  }
}
```

Then use:

```text
npm run start
```

Save the setting.

## Step 11: Enable logs

Open:

```text
Monitoring → App Service logs
```

Configure:

```text
Application logging: File System
Level: Information
Web server logging: File System
Detailed error messages: On temporarily
Failed request tracing: On temporarily
```

Select **Save**.

Later, once deployment is stable, detailed errors should normally be disabled because they can expose implementation information.

To view logs, open:

```text
Monitoring → Log stream
```

# Part 3: Deploy the backend from the Azure webpage

The easiest portal-only method is ZIP deployment through the App Service deployment tools.

Before uploading anything, create the production deployment ZIP locally.

## Step 12: Prepare the backend ZIP locally

Your ZIP must contain the files needed to start the application.

Typical contents:

```text
package.json
package-lock.json
dist/
```

The ZIP should not contain an extra enclosing directory.

Correct:

```text
backend-deploy.zip
├── package.json
├── package-lock.json
└── dist/
```

Incorrect:

```text
backend-deploy.zip
└── backend/
    ├── package.json
    └── dist/
```

Run your production build before creating the ZIP:

```bash
npm ci
npm run check
npm run build
```

If this is a monorepo, the deployment package may need workspace files from the repository root. The exact package depends on your existing repository structure.

## Step 13: Open the App Service deployment interface

Inside the backend App Service, look for one of these options:

```text
Development Tools → Advanced Tools
```

or:

```text
Deployment → Deployment Center
```

For **Advanced Tools**:

1. Select **Go**.
2. The Kudu site opens.
3. Select **Tools**.
4. Select **Zip Push Deploy**.
5. Drag the deployment ZIP into the browser.

If **Zip Push Deploy** is not shown, use the Kudu deployment page at:

```text
https://<your-app-name>.scm.azurewebsites.net/ZipDeployUI
```

You must already be signed into Azure.

Wait until the deployment result reports success.

## Step 14: Inspect deployment logs

Return to the App Service portal.

Open:

```text
Deployment → Deployment Center → Logs
```

Also open:

```text
Monitoring → Log stream
```

Look for evidence that:

- dependencies were installed or found;
- the application started;
- the startup command succeeded;
- the server listened successfully;
- no missing-file or module errors occurred.

# Part 4: Verify the health endpoint

Open:

```text
https://<backend-name>.azurewebsites.net/api/v1/health
```

For example:

```text
https://statsthegame-api-gpp-dev.azurewebsites.net/api/v1/health
```

You need:

```text
HTTP 200
```

The browser may show JSON such as:

```json
{
  "status": "ok"
}
```

Capture:

1. the browser address bar;
2. the response;
3. the Azure App Service Overview page;
4. successful deployment logs;
5. the environment-variable names, without exposing secret values.

# Part 5: Create the frontend Static Web App

Only create this after the backend URL exists.

## Step 15: Find Static Web Apps

1. Return to the Azure Portal home page.
2. Search for **Static Web Apps**.
3. Open **Static Web Apps**.
4. Select **Create**.

Azure Static Web Apps is intended for static frontend applications and supports deployment of frameworks such as React and Vite. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-web-framework?utm_source=chatgpt.com))

## Step 16: Complete the Basics section

**Subscription**

Use the same subscription as the backend.

**Resource group**

Select:

```text
rg-statsthegame-dev
```

**Name**

Use:

```text
statsthegame-web-dev
```

or, if unavailable:

```text
statsthegame-web-gpp-dev
```

**Plan type**

```text
Free
```

**Region**

Choose the nearest available region.

## Step 17: Deployment details

Azure Static Web Apps commonly offers:

```text
GitHub
Azure DevOps
Other
```

Because your repository is on Gitea, choose:

```text
Other
```

Do not connect a personal GitHub repository merely to bypass this step unless the team has agreed to and documented a repository mirror.

The official portal quickstart primarily covers GitHub and Azure DevOps deployment, while the Static Web Apps CLI supports deployment using a deployment token. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/get-started-portal?utm_source=chatgpt.com))

## Step 18: Review and create

1. Select **Review + create**.
2. Confirm the plan is **Free**.
3. Select **Create**.
4. Wait for creation.
5. Select **Go to resource**.

# Part 6: Retrieve the frontend deployment token

Inside the Static Web App:

1. Open **Overview**.
2. Select **Manage deployment token**.

If it is not on Overview, check:

```text
Deployment → Manage deployment token
```

Copy the token temporarily.

Do not:

- post it in Gitea;
- commit it;
- include it in screenshots;
- place it in `.env.example`;
- send it in group messages.

Microsoft documents that the token is available from the Static Web App’s Overview page under **Manage deployment token**. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/static-web-apps-cli-deploy?utm_source=chatgpt.com))

Although you are creating the resource through the webpage, uploading the built Vite frontend will normally require the Static Web Apps CLI or a CI workflow. The Azure portal creates and configures the hosting resource, but it is not generally a drag-and-drop frontend file uploader.

# Names to use

Use these consistently:

```text
Public project name:
Stat’sTheGame

Resource group:
rg-statsthegame-dev

App Service plan:
asp-statsthegame-dev

Backend App Service:
statsthegame-api-gpp-dev

Frontend Static Web App:
statsthegame-web-gpp-dev

Environment:
development
```

## Important risks

- Do not use `Stat’sTheGame` directly as the Azure resource name; punctuation and uppercase characters can cause validation failures.
- Do not configure GitHub deployment when your source-of-truth repository is Gitea unless it is an intentionally documented mirror.
- Do not expose Supabase credentials in the frontend.
- Do not use Supabase-generated REST endpoints as your main project API. The project requires the team’s hand-written HTTP API. `project_briefs (4).pdf`
- Do not select an expensive App Service plan without checking the expected monthly cost.
- Do not upload the entire development repository blindly; the deployment ZIP must match the backend’s production start structure.

## Your immediate next action

Create the backend resource with:

```text
Resource group: rg-statsthegame-dev
Name: statsthegame-api-gpp-dev
Publish: Code
Runtime: repository’s Node LTS version
Operating system: Linux
Plan: Free F1
Continuous deployment: Disabled
```

---

**Sources:**

- [Quickstart: Create a Node.js Web App - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:03:53 PM

[Attachment: image.png]

## Response:
8/5/2026, 9:04:02 PM

You are on the correct page, but **do not create it yet**. The current **Basic B1** plan costs money.

Make these changes:

### 1. Runtime stack

Open **Runtime stack** and select:

```text
Node 22 LTS
```

Use Node 20 LTS instead only if your project’s `package.json` specifies Node 20.

### 2. Region

You currently have:

```text
Canada Central
```

Change it to:

```text
South Africa North
```

If Azure does not offer the free plan there, try:

```text
West Europe
UK South
North Europe
```

The backend does not need to be hosted in Canada.

### 3. Linux Plan

After changing the region, click:

```text
Create new
```

Use this plan name:

```text
asp-statsthegame-dev
```

Do not keep the automatically generated name unless Azure forces you to.

### 4. Pricing plan

Your screenshot currently shows:

```text
Basic B1 (1.75 GB memory, 1 vCPU)
```

**Do not use B1** unless your group has approved the monthly cost.

Click:

```text
Explore pricing plans
```

Look under **Dev/Test** and select:

```text
Free F1
```

The final pricing section should show something similar to:

```text
Free F1
```

If F1 is unavailable:

1. Try a different region.
2. Confirm you are using a Linux App Service plan.
3. Check whether your Azure student subscription restricts the free tier.

Do not proceed with B1 merely to finish the form.

### 5. Keep these current settings

These are correct:

```text
Name: statsthegame-api-dev
Publish: Code
Operating System: Linux
```

The green tick means the name is accepted.

The long hostname under the name field is normal. Azure now sometimes adds an internal uniqueness suffix. Your final public URL will be visible after creation.

### 6. Do not configure a database here

After fixing the runtime, region and pricing plan, click:

```text
Next: Database
```

On the Database page:

```text
Database: None
```

Do not create an Azure SQL or Azure PostgreSQL database. Your project is using Supabase PostgreSQL separately.

### 7. Deployment page

On the Deployment page use:

```text
Continuous deployment: Disable
```

Your source repository is on Wits Gitea, not GitHub.

### 8. Networking page

Use:

```text
Public access: Enabled
```

Leave private endpoints and virtual network integration disabled for now.

### 9. Monitoring page

For the first deployment:

```text
Application Insights: Disable
```

This keeps the foundation simpler and avoids accidental additional costs.

### 10. Final values before creation

Your form should approximately show:

```text
Name: statsthegame-api-dev
Publish: Code
Runtime stack: Node 22 LTS
Operating System: Linux
Region: South Africa North, or another region supporting F1
Linux Plan: asp-statsthegame-dev
Pricing plan: Free F1
```

**Immediate next step:** change the runtime stack, then click **Explore pricing plans** and find **Free F1**. Do not create the resource while it still says **Basic B1**.

## Prompt:
8/5/2026, 9:11:33 PM

[Attachment: image.png]

which one

## Response:
8/5/2026, 9:11:36 PM

Choose **Environment variables** (the first option with the `{x}` icon).

That's the new Azure interface for what used to be called **Configuration → Application settings**.

Once you're there:

1. Click **+ Add**
2. Add:

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `API_VERSION` | `v1` |

Then click **Apply** or **Save**.

**Do not add:**
- `PORT` (Azure sets this automatically)
- `DATABASE_URL` (later, when Supabase is configured)
- Any secrets or API keys yet

---

After you've saved those, send me a screenshot of the **Environment variables** page and I'll tell you exactly what to do next.

## Prompt:
8/5/2026, 9:12:49 PM

[Attachment: image.png]

## Response:
8/5/2026, 9:12:52 PM

Perfect—that page looks correct. ✅

You now have:

- ✅ `NODE_ENV=production`
- ✅ `API_VERSION=v1`

Those are all the environment variables you need for Sprint 1.

---

## Next step: Configure the Startup Command

On the left menu click:

> **Configuration**

(not Environment variables)

Then:

1. Click the **General settings** tab.
2. Look for **Startup Command**.

I need to know what your backend starts with before we set it.

### Can you send me a screenshot of the **Configuration → General settings** page?

Or tell me what your backend uses:

- Express + JavaScript
- Express + TypeScript
- NestJS
- something else

---

## After that we'll deploy the backend

The remaining steps are:

1. ✅ Environment variables (done)
2. Configure Startup Command
3. Upload/deploy your backend
4. Open:
   ```
   https://statsthegame-api-dev.azurewebsites.net/api/v1/health
   ```
5. Confirm it returns HTTP 200
6. Then we'll deploy the frontend.

We're about 70% finished with Issue #15.

## Prompt:
8/5/2026, 9:13:35 PM

Platform settings
SCM Basic Auth Publishing Credentials

FTP Basic Auth Publishing Credentials

WebJobs runtime

FTP state
HTTP version
HTTP 2.0 Proxy
SSH

Always on

Always on requires a basic or higher App Service plan
Session affinity

Session affinity proxy

HTTPS only

Minimum Inbound TLS Version
SCM Minimum Inbound TLS Version
Debugging
Remote debugging

Your selected runtime stack does not currently support remote debugging.Learn more
Incoming client certificates
Client certificate mode




Incoming client certificates requires a basic or higher App Service plan

## Response:
8/5/2026, 9:13:42 PM

> **Searching the web**
>
> [Configure an App Service App - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-common)
> [Microsoft Azure: Cloud Computing Services](https://azure.microsoft.com/en-in)
>
> **Searched 2 websites**
>
> 
>
> Worked for 4s

Those are the correct **General settings**. Use these values:

| Setting | Choose |
|---|---|
| **SCM Basic Auth Publishing Credentials** | **On temporarily** |
| **FTP Basic Auth Publishing Credentials** | **Off** |
| **WebJobs runtime** | Leave default |
| **FTP state** | **Disabled** |
| **HTTP version** | **2.0** |
| **HTTP 2.0 Proxy** | Leave default/off |
| **SSH** | Leave default |
| **Always on** | Unavailable on Free F1; leave off |
| **Session affinity** | **Off** |
| **Session affinity proxy** | Off |
| **HTTPS only** | **On** |
| **Minimum Inbound TLS Version** | **1.2** or higher |
| **SCM Minimum Inbound TLS Version** | **1.2** or higher |
| **Remote debugging** | **Off** |
| **Client certificate mode** | Leave unchanged |

Microsoft recommends disabling FTP/basic authentication where it is not needed. However, **SCM Basic Auth may be needed temporarily for ZIP deployment or deployment credentials**, so leave SCM on until the initial deployment succeeds, then disable it afterwards. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-basic-auth-disable?utm_source=chatgpt.com))

## Startup command

Scroll farther up or down on the same **Configuration** page and look for:

```text
Startup Command
```

For now, use:

```text
npm run start
```

But this is correct only if your backend `package.json` contains something like:

```json
{
  "scripts": {
    "start": "node dist/server.js"
  }
}
```

Azure supports configuring a custom Node startup command in this field. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs?utm_source=chatgpt.com))

Then press **Save** or **Apply**.

### Important

Do not enter:

```text
npm run build && npm run start
```

yet. The deployment package should ideally already be built, and repeatedly building during startup can cause slow starts or failures on the free plan.

Your immediate configuration should be:

```text
SCM Basic Auth: On temporarily
FTP Basic Auth: Off
FTP state: Disabled
HTTP version: 2.0
HTTPS only: On
Minimum TLS: 1.2+
Remote debugging: Off
Startup command: npm run start
```

---

**Sources:**

- [Disable Basic Authentication for Deployment - Azure](https://learn.microsoft.com/en-us/azure/app-service/configure-basic-auth-disable?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:15:33 PM

[Attachment: image.png]

## Response:
8/5/2026, 9:15:36 PM

You're on the **App Service Logs** page now, not the Configuration page. This is still something you need for Issue #15.

Set it up like this:

### Application logging
- ✅ **File System** (already selected)

### Quota (MB)
Leave it as:

```text
35
```

### Retention Period (Days)
Enter:

```text
7
```

Seven days is plenty for a development environment.

Then click **Save**.

---

### After saving

In the left menu, click:

**Monitoring → Log stream**

Leave that tab open. Once we deploy the backend, you'll see the application start and any errors appear there.

---

## Next we need to deploy the backend

Before we do that, I need to know one thing:

**Is your backend:**
- **TypeScript** (has a `dist/` folder after `npm run build`), or
- **JavaScript**?

Or even easier, send me your backend `package.json` (or just the `scripts` section), and I'll tell you the exact deployment method and startup command. That way we won't guess and risk the deployment failing.

## Prompt:
8/5/2026, 9:18:23 PM

> nd-deploy.zip
>     ├── package.json
>     ├── package-lock.json
>     └── dist/
> 
> Incorrect:
> 
>     backend-deploy.zip
>     └── backend/
>         ├── package.json
>         └── dist/
> 
> Run your production build before creating the ZIP:
> 
> Bash
> 
>     npm ci
>     npm run check
>     npm run build
> 
> If this is a monorepo, the deployment package may need workspace files from the repository root. The exact package depends on your existing repository structure.
> 
> Step 13: Open the App Service deployment interface
> --------------------------------------------------
> 
> Inside the backend App Service, look for one of these options:
> 
>     Development Tools → Advanced Tools
> 
> or:
> 
>     Deployment → Deployment Center
> 
> For **Advanced Tools**:
> 
> 1.  Select **Go**.
>     
> 2.  The Kudu site opens.
>     
> 3.  Select **Tools**.
>     
> 4.  Select **Zip Push Deploy**.
>     
> 5.  Drag the deployment ZIP into the browser.
>     
> 
> If **Zip Push Deploy** is not shown, use the Kudu deployment page at:
> 
>     https://<your-app-name>.scm.azurewebsites.net/ZipDeployUI

can we not just getit o loook fo rthese files instead ofupkloading xip please, thats how we did it last time, we never uploaded azip

## Response:
8/5/2026, 9:18:30 PM

> **Searching the web**
>
> [Configure continuous deployment - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-continuous-deployment)
> [Microsoft Azure: Cloud Computing Services](https://azure.microsoft.com/en-us)
> [Azure status](https://azure.status.microsoft/)
> [Microsoft Azure](https://en.wikipedia.org/wiki/Microsoft_Azure)
>
> **Searched 4 websites**
>
> 
>
> Worked for 6s

Yes. You do **not** need to upload a ZIP.

Because your code is already in Git, use Azure’s **Local Git deployment**. Despite the name, Azure is not reading the Wits Gitea repository directly. You push your existing local branch to an Azure deployment Git remote, and Azure finds/builds the files from that push. Microsoft documents this through **App Service → Deployment Center → Source: Local Git**. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-local-git?utm_source=chatgpt.com))

## In the Azure portal

Open your backend App Service:

```text
statsthegame-api-dev
```

Then:

1. In the left menu, expand **Deployment**.
2. Click **Deployment Center**.
3. Open the **Settings** tab.
4. For **Source**, choose:

```text
Local Git
```

5. Click **Save**.

Azure should then show a **Git Clone URI**, something similar to:

```text
https://statsthegame-api-dev.scm.azurewebsites.net/statsthegame-api-dev.git
```

Copy that URI.

## Configure deployment credentials

Still in **Deployment Center**, find:

```text
Local Git/FTPS credentials
```

Set a deployment username and password if Azure asks for them.

These are Azure deployment credentials, not:

- your Wits password;
- your Gitea password;
- your Azure account password;
- a Gitea PAT.

Do not commit or screenshot the password.

## On your computer

Open PowerShell or Git Bash in the project repository:

```bash
cd path/to/Sport-Analytics-Tool
```

Confirm you are on the correct branch:

```bash
git status
git branch --show-current
```

Add Azure as a second Git remote:

```bash
git remote add azure https://statsthegame-api-dev.scm.azurewebsites.net/statsthegame-api-dev.git
```

Use the exact URL Azure gives you.

Check the remotes:

```bash
git remote -v
```

You should now see:

```text
origin  https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool
azure   https://statsthegame-api-dev.scm.azurewebsites.net/...
```

Your normal Gitea remote remains `origin`. Azure is a separate deployment destination.

## Push to Azure

If your deployment code is currently on `main`:

```bash
git push azure main:master
```

Azure Local Git has historically used `master` as its deployment branch, even when your project uses `main`.

If Azure’s Deployment Center explicitly shows the deployment branch as `main`, use:

```bash
git push azure main
```

When prompted, enter the Azure deployment username and password.

Azure should then:

1. receive the repository;
2. inspect `package.json`;
3. install dependencies;
4. build/start the Node application;
5. publish it to the App Service.

## Important monorepo warning

Your repository contains separate frontend and backend applications. Azure will initially look at the repository root.

Therefore, this approach works automatically only if the root `package.json` has deployment-compatible scripts such as:

```json
{
  "scripts": {
    "build": "npm run build --workspace=backend",
    "start": "npm run start --workspace=backend"
  }
}
```

If the backend is inside:

```text
backend/
```

and the root has no suitable `start` script, Azure may fail with an error such as:

```text
Missing script: start
```

or start the wrong workspace.

Before pushing, run locally from the repository root:

```bash
npm ci
npm run build
npm run start
```

If these commands start the backend correctly, Azure has a much better chance of recognising the project properly.

## Watch the deployment

In Azure, open:

```text
Deployment Center → Logs
```

Then also open:

```text
Monitoring → Log stream
```

After deployment, test:

```text
https://statsthegame-api-dev.azurewebsites.net/api/v1/health
```

You need an HTTP `200` response.

## Best option for this project

Use Local Git for this first manual deployment, then replace it later with a **Gitea Actions deployment workflow**. That will satisfy the CI/CD requirement more strongly than repeatedly pushing manually.

### Immediate steps

```text
Azure App Service
→ Deployment
→ Deployment Center
→ Settings
→ Source: Local Git
→ Save
→ Copy Git Clone URI
```

Then send the Deployment Center screen or the clone URI with any username removed, and the exact local Git commands can be matched to it.

---

**Sources:**

- [Deploy From a Local Git Repository - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-local-git?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:26:44 PM

> Step 17: Deployment details
> ---------------------------
> 
> Azure Static Web Apps commonly offers:
> 
>     GitHub
>     Azure DevOps
>     Other
> 
> Because your repository is on Gitea, choose:
> 
>     Other
> 
> Do not connect a personal GitHub repository merely to bypass this step unless the team has agreed to and documented a repository mirr

Create Web App
Basics
Database
Deployment
Networking
Monitor + secure
Tags
Review + create
Continuous deployment settings
Set up continuous deployment to easily deploy code from your GitHub repository via GitHub Actions. Learn more
Continuous deployment
Disable
  	Enable
 
Configuring deployment with GitHub Actions during app creation isn't supported with your selections of operating system and App Service plan. If you want to keep these selections, you can configure deployment with GitHub Actions after the web app is created.
GitHub settings
Set up GitHub Actions to push content to your app whenever there are code changes made to your repository. Note: Your GitHub account must have write access to the selected repository in order to add a workflow file which manages deployments to your app.
GitHub account
DeanFeldman
Organization
Select organization
Repository
Select repository
Branch
Select branch
Workflow configuration
Click the button below to preview what the GitHub Actions workflow file will look like before setting up continuous deployment.
Complete the Basics tab and the form above to preview the GitHub Actions workflow file.
Authentication settings
Choose if you would like to allow basic authentication to deploy code to your app. Learn more
Basic authentication
Disable
  	Enable

## Response:
8/5/2026, 9:26:46 PM

This is the **App Service creation wizard**, not the deployment page after the app has been created.

For **Issue #15**, choose:

### Continuous deployment

✅ **Disable**

Do **not** connect GitHub here.

Reasons:

- Your source of truth is **Wits Gitea**, not GitHub.
- The issue explicitly allows a **manual deployment** for the initial Azure foundation.
- GitHub Actions are **not supported** with your current plan/OS selection anyway (Azure is already telling you that).

### Basic authentication

✅ **Enable**

This only enables deployment credentials (used for Local Git/ZIP deployment). It is **not** your application's authentication.

---

Then continue creating the App Service.

After the App Service exists, you'll go to:

```
App Service
→ Deployment Center
```

There you'll be able to choose **Local Git** or another deployment source.

---

### Don't worry about GitHub right now.

Your workflow should be:

1. ✅ Create the App Service.
2. ✅ Go to **Deployment Center**.
3. ✅ Configure **Local Git** (or another manual deployment method).
4. ✅ Deploy the backend.
5. Later in Sprint 1 or Sprint 2, automate deployment from **Gitea Actions** to Azure to satisfy the CI/CD requirement.

**Go ahead and click `Review + create` with:**

- Continuous deployment: **Disabled**
- Basic authentication: **Enabled**

Then create the App Service. Once it's finished, I'll walk you through the Deployment Center configuration.

## Prompt:
8/5/2026, 9:28:06 PM

> Step 18: Review and create
> --------------------------
> 
> 1.  Select **Review + create**.
>     
> 2.  Confirm the plan is **Free**.
>     
> 3.  Select **Create**.
>     
> 4.  Wait for creation.
>     
> 5.  Select **Go to resource**.

Create Web App
Basics
Database
Deployment
Networking
Monitor + secure
Tags
Review + create
Summary
Web App
by Microsoft
Details
Subscription
1d637eb6-257f-47bf-aeee-9cc0387ad705
Resource Group
rg-statsthegame-dev
Name
statsthegame-web-dev
Secure unique default hostname
Enabled
Publish
Code
Runtime stack
Node 22 LTS
App Service Plan
Name
ASP-UbuntuHealthgroup-9c64
Operating System
Linux
Region
South Africa North
SKU
Free
Memory
1 GB memory
Monitor + secure
Application Insights
Not enabled
Deployment
Basic authentication
Enabled
Continuous deployment
Not enabled / Set up after app creation
   Download a template for automation

## Response:
8/5/2026, 9:28:08 PM

That all looks good. ✅

The only thing I'd double-check is the **App Service Plan** name:

```
ASP-UbuntuHealthgroup-9c64
```

That looks like an automatically generated name rather than the `asp-statsthegame-dev` name we discussed, but **it's not a problem**. What matters is:

- ✅ **Region:** South Africa North
- ✅ **Operating System:** Linux
- ✅ **Runtime:** Node 22 LTS
- ✅ **SKU:** **Free**
- ✅ **Basic authentication:** Enabled
- ✅ **Continuous deployment:** Disabled

Those are the important settings.

## Go ahead and click **Create**.

Once Azure finishes:

1. Click **Go to resource**.
2. In the left menu, go to:

```
Deployment
→ Deployment Center
```

Take a screenshot of the **Deployment Center** page (or tell me what options you see under **Source**).

That will determine the best way to deploy your backend from your existing repository **without creating a ZIP**. We'll configure it from there.

## Prompt:
8/5/2026, 9:32:19 PM

> Part 6: Retrieve the frontend deployment token
> ==============================================
> 
> Inside the Static Web App:
> 
> 1.  Open **Overview**.
>     
> 2.  Select **Manage deployment token**.
>     
> 
> If it is not on Overview, check:
> 
>     Deployment → Manage deployment token
> 
> Copy the token temporarily.
> 
> Do not:
> 
> *   post it in Gitea;
>     
> *   commit it;
>     
> *   include it in screenshots;
>     
> *   place it in `.env.example`;
>     
> *   send it in group messages.
>     
> 
> Microsoft documents that the token is available from the Static Web App’s Overview page under **Manage deployment toke**

i cant find it

## Response:
8/5/2026, 9:32:21 PM

Can you clarify **which** one you can't find?

1. **Deployment Center** in the Azure App Service?
2. **Manage deployment token** in the Static Web App?
3. Something else?

From your previous screenshots, it looks like you're working with an **App Service** (backend), **not** a Static Web App (frontend).

### If you're looking for Deployment Center (backend)

On newer Azure Portal versions, it should be in the left-hand menu under:

```text
Deployment
    Deployment Center
```

If you don't see a **Deployment** section:

1. Use the **Search** box at the top of the left menu.
2. Type:

```text
Deployment Center
```

and see if it appears.

### If you're looking for "Manage deployment token"

That **does not exist on an App Service**. It only exists on an **Azure Static Web App**.

So if you're inside:

```text
statsthegame-api-dev
```

you will **not** find a deployment token. That's expected.

---

**Can you send me a screenshot of the entire left-hand menu of your Azure App Service (from "Overview" down to the bottom)?** That will let me tell you exactly where the deployment option is in your portal version.

## Prompt:
8/5/2026, 9:32:55 PM

wha do i do in hte deployment scenteer

## Response:
8/5/2026, 9:32:57 PM

Now that the App Service has been created, **Deployment Center** is where you tell Azure **how your code will get onto the server**.

Since you're using **Wits Gitea**, do **not** choose GitHub for now.

## Step 1

Open:

```text
Deployment Center
```

You should see a **Source** option.

### If you see these choices:

- GitHub
- Bitbucket
- Local Git
- External Git
- ZIP Deploy

Choose:

> **Local Git**

or, if **Local Git** isn't available,

> **External Git**

**Do not choose GitHub** unless your project is actually hosted on GitHub.

---

## Step 2

After selecting the source, Azure will usually generate a **Git Clone URL**, something like:

```text
https://statsthegame-api-dev.scm.azurewebsites.net/statsthegame-api-dev.git
```

That is what we'll push your backend to.

---

## If you only see GitHub

Microsoft has changed the Azure Portal a few times, and on the Free plan the Deployment Center sometimes only offers GitHub integration.

If that's what you're seeing, **don't worry**. Tell me that, or send a screenshot of the Deployment Center page. We'll use one of these instead:

- Azure CLI (`az webapp up` or `az webapp deploy`)
- Local Git (if available)
- VS Code Azure App Service extension

All of these are valid for the Sprint 1 manual deployment.

### Please send me a screenshot of the **Deployment Center** page.

I can tell you exactly which option to click based on what Azure is showing you.

## Prompt:
8/5/2026, 9:33:35 PM

no for the frontend

## Response:
8/5/2026, 9:33:46 PM

> **Choosing frontend deployment**
>
> I’m checking the current Azure options. Because this is an App Service Web App rather than a Static Web App, I’ll explain the simplest path and flag the better static-hosting alternative.
>
> **Chose a frontend deployment strategy**
>
> 
>
> **Searching the web**
>
> [Deploy a static web app with Azure Static Web Apps CLI](https://learn.microsoft.com/en-us/azure/static-web-apps/static-web-apps-cli-deploy)
> [Microsoft Azure: Serviços de computação em nuvem](https://azure.microsoft.com/pt-br)
> [Microsoft Azure](https://en.wikipedia.org/wiki/Microsoft_Azure)
>
> **Searched 3 websites**
>
> 
>
> Worked for 11s

For the **frontend**, you should not be in the App Service Deployment Center.

You created:

```text
statsthegame-web-dev
Type: Web App / App Service
Runtime: Node 22
```

That can host the frontend, but for a Vite frontend the cleaner choice is **Azure Static Web Apps**. Azure Static Web Apps is specifically designed for compiled static frontends such as Vite/React and has a Free plan. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-web-framework?utm_source=chatgpt.com))

## Recommended action

Do not configure Deployment Center on `statsthegame-web-dev` yet.

Create a separate **Static Web App** instead:

1. In the Azure top search bar, search:

```text
Static Web Apps
```

2. Open **Static Web Apps**.
3. Click **Create**.
4. Enter:

```text
Resource group: rg-statsthegame-dev
Name: statsthegame-web-dev
Plan type: Free
```

Azure may reject that name because the App Service already uses it. In that case use:

```text
statsthegame-frontend-dev
```

5. For **Deployment source**, choose:

```text
Other
```

Choose **Other** because the project repository is on Wits Gitea, not GitHub or Azure DevOps.

6. Click **Review + create**, then **Create**.

## After the Static Web App is created

Open it and go to:

```text
Overview
→ Manage deployment token
```

Copy the token and keep it private. Azure Static Web Apps uses this token for deployments that are not connected directly to GitHub or Azure DevOps. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/static-web-apps-cli-deploy?utm_source=chatgpt.com))

Do not:

- commit the token;
- paste it into Gitea;
- send it in screenshots;
- put it in a `VITE_*` variable.

## What to do with the Web App you already created

You have two reasonable choices:

### Best choice

Delete the frontend App Service because it is not needed:

```text
statsthegame-web-dev
```

Before deleting it, confirm it is the frontend resource and not the backend.

### Alternative

Keep it temporarily but rename its purpose in your documentation. You could later use it for another non-production backend environment, though that may create unnecessary confusion.

## Important distinction

Your resources should ideally be:

```text
Backend:
Azure App Service
statsthegame-api-dev

Frontend:
Azure Static Web App
statsthegame-frontend-dev
```

The Static Web App will not use the same Deployment Center interface as the App Service. Once it exists, the next step is to build the Vite application and deploy its `dist` folder using the Azure Static Web Apps CLI and deployment token.

---

**Sources:**

- [Deploy your web app to Azure Static Web Apps.](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-web-framework?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:34:58 PM

[Attachment: image.png]

## Response:
8/5/2026, 9:35:00 PM

Perfect. This is actually the screen we wanted. 👍

For your **frontend**, I recommend **Manual Deployment (Push)** instead of CI/CD for Sprint 1.

## Click this:

➡️ **Manual Deployment (Push)**

Then for **Source**, choose:

```text
Local Git
```

**Not GitHub.**

Since your repository is on **Wits Gitea**, Azure can't automatically build from it like it can with GitHub.

---

## After selecting Local Git

Azure will generate something like:

```
Git Clone URI
https://statsthegame-web-dev.scm.azurewebsites.net/statsthegame-web-dev.git
```

or

```
Git URL
```

Copy that URL.

---

## Then on your computer

You'll add Azure as another remote (your normal `origin` still points to Gitea):

```bash
git remote add azure-web https://statsthegame-web-dev.scm.azurewebsites.net/statsthegame-web-dev.git
```

Then later you'll deploy with:

```bash
git push azure-web main
```

(or `main:master` if Azure tells us to use `master`).

---

# One thing before we continue...

**Can you tell me one thing?**

Is your frontend:

```
frontend/
```

with Vite?

For example:

```
Sport-Analytics-Tool
│
├── frontend
│   ├── package.json
│   ├── vite.config.ts
│   └── src
│
└── backend
```

or is it in the repository root?

That changes one Azure setting, so I want to make sure we configure it correctly.

## Prompt:
8/5/2026, 9:35:16 PM

i want ci/cd

## Response:
8/5/2026, 9:35:27 PM

> **Searching the web**
>
> [Deploy to Azure App Service by using GitHub Actions](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions)
> [Microsoft Azure: Cloud Computing Services](https://azure.microsoft.com/en-ca)
> [Frequently Asked Questions](https://docs.gitea.com/usage/actions/faq/)
> [Microsoft Azure](https://en.wikipedia.org/wiki/Microsoft_Azure)
> [Azure status](https://azure.status.microsoft/)
>
> **Searched 5 websites**
>
> 
>
> Worked for 10s

Use **CI/CD**, but do not connect this Azure screen directly to the Wits Gitea repository-it does not support Gitea as a source here.

## Recommended choice

Create a **GitHub deployment mirror** of the Gitea repository, then select:

```text
Continuous Deployment (CI/CD)
Source: GitHub
```

Azure will generate a GitHub Actions workflow that builds and deploys whenever the selected GitHub branch changes. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?utm_source=chatgpt.com))

Your official development history should remain on Wits Gitea. GitHub should be documented as a deployment mirror only.

## On the screen shown

1. Keep **Continuous Deployment (CI/CD)** selected.
2. Under **Source**, select:

```text
GitHub
```

3. Under **Signed in as**, keep:

```text
DeanFeldman
```

4. For **Organization**, select your GitHub account or team organisation.
5. For **Repository**, select the GitHub mirror of:

```text
Sport-Analytics-Tool
```

6. For **Branch**, select:

```text
main
```

7. For the build provider, select:

```text
GitHub Actions
```

8. Preview the workflow before saving.
9. Click **Save**.

Azure will add a workflow file under:

```text
.github/workflows/
```

and commits pushed to the selected GitHub branch will trigger deployment. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?utm_source=chatgpt.com))

## Important: your repository is a monorepo

Because the frontend is under a subdirectory, the generated workflow will probably need editing.

It should build the frontend and deploy the Vite output, not the entire repository.

The important commands should resemble:

```yaml
- name: Install dependencies
  run: npm ci

- name: Check frontend
  run: npm run check --workspace=frontend

- name: Build frontend
  run: npm run build --workspace=frontend
  env:
    VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
```

The deployment package should be the frontend build output, typically:

```text
frontend/dist
```

Do not deploy the frontend source files directly.

## Add the frontend API URL

In GitHub:

```text
Repository
→ Settings
→ Secrets and variables
→ Actions
→ New repository secret
```

Add:

```text
Name: VITE_API_BASE_URL
Value: https://statsthegame-api-dev.azurewebsites.net
```

This value is safe to expose because it is the public backend address. Do not place any database password, Supabase service-role key, or OAuth client secret in a `VITE_*` variable.

## Keep Gitea and GitHub synchronized

Add GitHub as a deployment remote locally:

```bash
git remote add deployment https://github.com/DeanFeldman/Sport-Analytics-Tool.git
```

Check:

```bash
git remote -v
```

You should have:

```text
origin      Wits Gitea
deployment GitHub mirror
```

After a PR is merged into Gitea `main`:

```bash
git switch main
git pull origin main
git push deployment main
```

That GitHub push triggers the Azure deployment automatically.

## Better later-stage setup

Once your Gitea Actions runner is available, move the deployment workflow into Gitea Actions and deploy directly from Gitea. Gitea Actions is designed to be broadly compatible with GitHub Actions workflows. ([Gitea Documentation](https://docs.gitea.com/usage/actions/faq/?utm_source=chatgpt.com))

That would remove the manual mirror push and give this flow:

```text
Gitea main
→ tests
→ frontend build
→ Azure deployment
```

## Brief risk

Do not make GitHub appear to be the project’s primary repository if Gitea is the official one. Document:

> GitHub is used only as a deployment mirror because Azure Deployment Center does not offer direct Wits Gitea integration. All issues, pull requests, reviews and authoritative development history remain in Gitea.

Your immediate next step is to create or select the GitHub mirror, then choose **GitHub → repository → main → GitHub Actions → Save**.

---

**Sources:**

- [Deploy to Azure App Service by using GitHub Actions](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?utm_source=chatgpt.com)
- [Frequently Asked Questions](https://docs.gitea.com/usage/actions/faq/?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:38:20 PM

how do i know if its working?

## Response:
8/5/2026, 9:38:26 PM

> **Searching the web**
>
> [Azure App Service shows successful GitHub Action ...](https://learn.microsoft.com/en-us/answers/questions/2263185/azure-app-service-shows-successful-github-action-d)
> [Using workflow run logs](https://docs.github.com/actions/managing-workflow-runs/using-workflow-run-logs)
> [Azure DevOps](https://azure.microsoft.com/en-us/products/devops)
> [ACTION | English meaning - Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/action)
>
> **Searched 4 websites**
>
> 
>
> Worked for a few seconds

You know CI/CD is working only when **all three checks pass**:

## 1. GitHub Actions shows a successful run

Go to the GitHub mirror repository:

```text
GitHub repository
→ Actions
```

You should see a workflow run triggered by a push to `main`.

Open the latest run. Every step should have a green tick, especially:

```text
Checkout
Install dependencies
Build
Deploy to Azure Web App
```

GitHub lets you inspect each job and step in the workflow run logs. ([GitHub Docs](https://docs.github.com/actions/managing-workflow-runs/using-workflow-run-logs?utm_source=chatgpt.com))

If there is no run at all, push a small harmless change to the selected branch.

For example, update the frontend README and push it to the GitHub mirror:

```bash
git switch main
git pull origin main
git push deployment main
```

## 2. Azure Deployment Center shows success

In Azure, open:

```text
statsthegame-web-dev
→ Deployment Center
→ Logs
```

You should see the latest deployment and a successful status. Azure’s GitHub Actions integration displays information from the workflow run on the Deployment Center Logs tab. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-continuous-deployment?utm_source=chatgpt.com))

Check that the displayed:

- branch is `main`;
- commit matches the latest GitHub commit;
- deployment status is successful;
- deployment time matches your recent push.

## 3. The live website actually loads

Open the App Service:

```text
statsthegame-web-dev
→ Overview
→ Default domain
```

Or click **Browse** in Deployment Center.

The address will resemble:

```text
https://statsthegame-web-dev.azurewebsites.net
```

The frontend must:

- load the Vite interface;
- not show Azure’s default welcome page;
- not return a 404 or 500 error;
- have no major red errors in the browser console.

Open browser developer tools with `F12`, then check:

```text
Console
Network
```

Refresh the page. The main document, JavaScript and CSS files should normally return `200`.

## Definitive CI/CD test

Make a visible temporary change in the frontend, such as changing a heading to:

```text
Stat’sTheGame - Azure CI/CD Test
```

Then commit and push it to the GitHub deployment mirror:

```bash
git add .
git commit -m "test(deployment): verify frontend CI/CD" \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push deployment main
```

Then verify this sequence:

```text
Push to GitHub
→ GitHub Actions starts automatically
→ workflow becomes green
→ Azure Deployment Center records the deployment
→ refreshed public site shows the new heading
```

After confirming it works, revert the temporary heading through another normal commit.

## A green workflow is not enough

A deployment can show successful even when the incorrect files were deployed. For a Vite frontend, confirm that the workflow deploys the built output, normally:

```text
frontend/dist
```

and not merely the repository root.

The workflow should include something equivalent to:

```yaml
- name: Install dependencies
  run: npm ci

- name: Build frontend
  run: npm run build --workspace=frontend
  env:
    VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
```

Then the deploy action must package the resulting frontend build.

## Evidence to save

Capture these for Issue #17:

- GitHub Actions green workflow run;
- expanded build and deployment steps;
- Azure Deployment Center successful entry;
- public Azure URL;
- screenshot of the live frontend;
- latest commit hash shown in GitHub and Azure;
- browser console without blocking errors;
- a short note recording the test push and result.

### Working means:

```text
Automatic trigger: yes
Build passes: yes
Azure deployment passes: yes
Live page reflects latest commit: yes
```

If any one of those is missing, CI/CD is not fully verified.

---

**Sources:**

- [Using workflow run logs](https://docs.github.com/actions/managing-workflow-runs/using-workflow-run-logs?utm_source=chatgpt.com)
- [Configure continuous deployment - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-continuous-deployment?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:39:33 PM

[Attachment: image.png]

how do 9i know if my frontend and backend are set up to deploy with gitea ci/cd

## Response:
8/5/2026, 9:39:40 PM

> **Searching the web**
>
> [Overview | Gitea Documentation](https://docs.gitea.com/usage/actions/overview)
> [USAGE Definition & Meaning](https://www.merriam-webster.com/dictionary/usage)
> [USAGE in Traditional Chinese - Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english-chinese-traditional/usage)
> [Microsoft Azure: Cloud Computing Services](https://azure.microsoft.com/en-us)
> [Deploy by Using GitHub Actions - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions)
> [Azure/webapps-deploy: Enable GitHub developers to ...](https://github.com/Azure/webapps-deploy)
> [Use and Usage - Often Confused Words in English ...](https://www.youtube.com/watch?v=jgLbZz8GK48)
> [PHÂN BIỆT "USE" & "USAGE" TIẾNG ANH - Phân biệt từ](https://www.ieltstutor.me/blog/phan-biet-use-usage-tieng-anh)
> [Deploying Node.js to Azure App Service](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/nodejs-to-azure-app-service)
> [GitHub](https://en.wikipedia.org/wiki/GitHub)
> [GitHub – Apps on Google Play](https://play.google.com/store/apps/details?hl=en_NZ&id=com.github.android)
>
> **Searched 11 websites**
>
> 
>
> Worked for 4s

Right now, the screenshot proves only that the **frontend Azure Web App exists**. It is still showing Azure’s default “waiting for your content” page, so the frontend has **not been deployed successfully yet**.

To confirm that both frontend and backend are configured for **Gitea CI/CD**, check these four things for each application.

## 1. Confirm a Gitea Actions runner exists

In your Gitea repository, open:

```text
Actions
```

Then check whether workflows can actually run.

A Gitea Actions workflow requires an active `act_runner`; merely having workflow files is not enough. Gitea Actions is mostly compatible with GitHub Actions, but jobs must be picked up by a registered runner. ([Gitea Documentation](https://docs.gitea.com/usage/actions/overview?utm_source=chatgpt.com))

A working run should show:

```text
Queued → Running → Success
```

If every workflow remains permanently queued, your Gitea runner is not available or does not match the workflow’s `runs-on` label.

## 2. Check that deployment workflows exist

In the repository, look for files such as:

```text
.gitea/workflows/deploy-backend.yml
.gitea/workflows/deploy-frontend.yml
```

or possibly:

```text
.github/workflows/
```

Gitea supports GitHub Actions-style syntax, although `.gitea/workflows` is clearer for a Gitea-hosted project. ([Gitea Documentation](https://docs.gitea.com/usage/actions/faq?utm_source=chatgpt.com))

You need two independently testable pipelines.

### Backend workflow must do this

```text
checkout
→ npm ci
→ backend checks/tests
→ backend build
→ deploy to statsthegame-api-dev
```

### Frontend workflow must do this

```text
checkout
→ npm ci
→ frontend checks/tests
→ Vite build
→ deploy frontend/dist to statsthegame-web-dev
```

If there are no deployment workflow files, then Gitea CI/CD is not set up, regardless of what appears in Azure Deployment Center.

## 3. Confirm Azure credentials exist as Gitea secrets

For each Azure Web App, download its publish profile:

```text
Azure Web App
→ Overview
→ Download publish profile
```

Then create repository secrets in Gitea:

```text
Repository
→ Settings
→ Actions
→ Secrets
```

Recommended secret names:

```text
AZURE_BACKEND_PUBLISH_PROFILE
AZURE_FRONTEND_PUBLISH_PROFILE
```

The full publish-profile XML contents go into the matching secret. Do not commit the files.

Publish profiles are supported by the official `Azure/webapps-deploy` action, and basic authentication must be enabled when using this authentication approach. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?utm_source=chatgpt.com))

Also add:

```text
VITE_API_BASE_URL
```

with the public backend URL, for example:

```text
https://statsthegame-api-dev-<azure-suffix>.southafricanorth-01.azurewebsites.net
```

That is a public URL, not a secret credential, but storing it as an Actions secret or variable allows environment-specific builds.

## 4. Perform an actual deployment test

The most reliable test is a small visible commit.

For the frontend, change a heading to something temporary such as:

```text
Stat’sTheGame - CI/CD verified
```

Commit and push to the branch used by the workflow.

Then check this sequence:

```text
Gitea push
→ Gitea Actions starts automatically
→ all test/build steps pass
→ Azure deployment step passes
→ live Azure page changes
```

Until the Azure default page disappears, the frontend deployment is not complete.

For the backend, open:

```text
https://<backend-domain>/api/v1/health
```

It must return HTTP `200`.

## What the workflows should approximately contain

### Frontend

```yaml
name: Deploy frontend

on:
  push:
    branches:
      - main
    paths:
      - "frontend/**"
      - ".gitea/workflows/deploy-frontend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check frontend
        run: npm run check --workspace=frontend

      - name: Build frontend
        run: npm run build --workspace=frontend
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

      - name: Deploy frontend
        uses: Azure/webapps-deploy@v3
        with:
          app-name: statsthegame-web-dev
          publish-profile: ${{ secrets.AZURE_FRONTEND_PUBLISH_PROFILE }}
          package: frontend/dist
```

### Backend

```yaml
name: Deploy backend

on:
  push:
    branches:
      - main
    paths:
      - "backend/**"
      - ".gitea/workflows/deploy-backend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check backend
        run: npm run check --workspace=backend

      - name: Test backend
        run: npm test --workspace=backend

      - name: Build backend
        run: npm run build --workspace=backend

      - name: Deploy backend
        uses: Azure/webapps-deploy@v3
        with:
          app-name: statsthegame-api-dev
          publish-profile: ${{ secrets.AZURE_BACKEND_PUBLISH_PROFILE }}
          package: backend
```

The exact workspace names and package paths must match your repository. Do not paste these blindly without confirming your `package.json` scripts and directory names.

## Your present status

| Check | Status |
|---|---|
| Frontend Azure resource created | Yes |
| Frontend publicly reachable | Yes |
| Frontend application deployed | **No** |
| Gitea runner confirmed | Unknown |
| Frontend workflow confirmed | Unknown |
| Backend workflow confirmed | Unknown |
| Azure publish-profile secrets configured | Unknown |
| Backend health endpoint verified | Unknown |

## Next action

Open your Gitea repository’s **Actions** page. If there is no successful frontend deployment workflow, open the repository file tree and check whether `.gitea/workflows/deploy-frontend.yml` and `.gitea/workflows/deploy-backend.yml` exist.

---

**Sources:**

- [Overview | Gitea Documentation](https://docs.gitea.com/usage/actions/overview?utm_source=chatgpt.com)
- [Deploy by Using GitHub Actions - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:40:29 PM

> .gitea/workflows/deploy-backend.yml .gitea/workflows/deploy-frontend.yml

i odnt see these, how do i get these

## Response:
8/5/2026, 9:40:37 PM

> **Searching the web**
>
> [Quick Start | Gitea Documentation](https://docs.gitea.com/usage/actions/quickstart/)
> [Azure/webapps-deploy: Enable GitHub developers to ...](https://github.com/Azure/webapps-deploy)
>
> **Searched 2 websites**
>
> 
>
> Worked for 7s

Those files do not appear automatically-you need to create them in the repository.

## 1. Create the workflow folder locally

From the repository root:

### PowerShell

```powershell
mkdir .gitea\workflows -Force

New-Item .gitea\workflows\deploy-backend.yml -ItemType File
New-Item .gitea\workflows\deploy-frontend.yml -ItemType File
```

### Git Bash

```bash
mkdir -p .gitea/workflows
touch .gitea/workflows/deploy-backend.yml
touch .gitea/workflows/deploy-frontend.yml
```

Gitea looks for workflow files inside `.gitea/workflows/`, and repositories may also need Actions enabled under repository settings. ([Gitea Documentation](https://docs.gitea.com/usage/actions/quickstart/?utm_source=chatgpt.com))

Your structure will become:

```text
Sport-Analytics-Tool/
├── .gitea/
│   └── workflows/
│       ├── deploy-backend.yml
│       └── deploy-frontend.yml
├── frontend/
├── backend/
└── package.json
```

## 2. Add the frontend workflow

Paste this into:

```text
.gitea/workflows/deploy-frontend.yml
```

```yaml
name: Deploy frontend to Azure

on:
  push:
    branches:
      - main
    paths:
      - "frontend/**"
      - ".gitea/workflows/deploy-frontend.yml"

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: https://github.com/actions/checkout@v4

      - name: Set up Node.js
        uses: https://github.com/actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check frontend
        run: npm run check --workspace=frontend

      - name: Build frontend
        run: npm run build --workspace=frontend
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

      - name: Deploy frontend to Azure
        uses: https://github.com/Azure/webapps-deploy@v3
        with:
          app-name: statsthegame-web-dev
          publish-profile: ${{ secrets.AZURE_FRONTEND_PUBLISH_PROFILE }}
          package: frontend/dist
```

Gitea supports GitHub-compatible actions and also supports absolute action URLs, which is why the `uses:` entries above point directly to GitHub-hosted actions. ([Gitea Documentation](https://docs.gitea.com/usage/actions/comparison?utm_source=chatgpt.com))

## 3. Add the backend workflow

Paste this into:

```text
.gitea/workflows/deploy-backend.yml
```

```yaml
name: Deploy backend to Azure

on:
  push:
    branches:
      - main
    paths:
      - "backend/**"
      - ".gitea/workflows/deploy-backend.yml"

jobs:
  deploy-backend:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: https://github.com/actions/checkout@v4

      - name: Set up Node.js
        uses: https://github.com/actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check backend
        run: npm run check --workspace=backend

      - name: Test backend
        run: npm test --workspace=backend

      - name: Build backend
        run: npm run build --workspace=backend

      - name: Deploy backend to Azure
        uses: https://github.com/Azure/webapps-deploy@v3
        with:
          app-name: statsthegame-api-dev
          publish-profile: ${{ secrets.AZURE_BACKEND_PUBLISH_PROFILE }}
          package: backend
```

The Azure deployment action accepts the Azure Web App name, publish profile, and package path. ([GitHub](https://github.com/Azure/webapps-deploy?utm_source=chatgpt.com))

## 4. Check your actual folder names

Before committing, run:

```bash
ls
```

or in PowerShell:

```powershell
Get-ChildItem
```

Confirm the project folders are exactly:

```text
frontend
backend
```

Also check the root `package.json`:

```bash
npm run
```

The workflows assume these commands work:

```bash
npm ci
npm run check --workspace=frontend
npm run build --workspace=frontend
npm run check --workspace=backend
npm test --workspace=backend
npm run build --workspace=backend
```

Run them locally before pushing.

If any command fails locally, the workflow will also fail.

## 5. Enable Gitea Actions

In Gitea, go to:

```text
Repository
→ Settings
→ Actions
→ General
```

Enable:

```text
Enable Repository Actions
```

Then save.

A workflow file alone is insufficient if repository Actions are disabled. ([Gitea Documentation](https://docs.gitea.com/usage/actions/quickstart/?utm_source=chatgpt.com))

## 6. Add the Azure secrets

You need two Azure publish profiles.

### Frontend publish profile

In Azure:

```text
statsthegame-web-dev
→ Overview
→ Download publish profile
```

Open the downloaded file in a text editor and copy the full XML.

In Gitea:

```text
Repository
→ Settings
→ Actions
→ Secrets
→ Add secret
```

Create:

```text
Name:
AZURE_FRONTEND_PUBLISH_PROFILE

Value:
<entire frontend publish-profile XML>
```

### Backend publish profile

In Azure:

```text
statsthegame-api-dev
→ Overview
→ Download publish profile
```

Add another Gitea secret:

```text
Name:
AZURE_BACKEND_PUBLISH_PROFILE

Value:
<entire backend publish-profile XML>
```

Do not commit either publish-profile file.

### Backend URL

Add:

```text
Name:
VITE_API_BASE_URL

Value:
https://<your-backend-default-domain>
```

Use the exact URL from:

```text
statsthegame-api-dev
→ Overview
→ Default domain
```

## 7. Commit the workflows

Create a branch:

```bash
git switch main
git pull origin main
git switch -c ci/azure-deployment-workflows
```

Add and commit:

```bash
git add .gitea/workflows

git commit -m "ci: add Azure deployment workflows" \
  -m "Add separate Gitea Actions workflows for frontend and backend Azure deployments." \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"
```

Push:

```bash
git push -u origin ci/azure-deployment-workflows
```

Open a pull request, review it, then merge it into `main`.

## 8. Verify the workflows

After merging, open:

```text
Gitea
→ Actions
```

You should see:

```text
Deploy frontend to Azure
Deploy backend to Azure
```

The first run should progress through:

```text
Queued
→ Running
→ Success
```

After the frontend workflow succeeds, refresh:

```text
https://statsthegame-web-dev-<suffix>.southafricanorth-01.azurewebsites.net
```

The Azure placeholder page should be replaced by your Vite application.

The backend should respond at:

```text
https://<backend-domain>/api/v1/health
```

## Likely issue

Your repository may use workspace names such as:

```text
apps/frontend
apps/backend
```

rather than:

```text
frontend
backend
```

In that case, the paths and commands above must be adjusted before committing.

### Immediate checklist

- [ ] Create `.gitea/workflows`
- [ ] Add both YAML files
- [ ] Confirm workspace names and scripts
- [ ] Enable repository Actions
- [ ] Add both Azure publish-profile secrets
- [ ] Add `VITE_API_BASE_URL`
- [ ] Commit through a branch and PR
- [ ] Verify green Gitea Action runs
- [ ] Verify frontend replaces Azure placeholder
- [ ] Verify backend health endpoint returns `200`

---

**Sources:**

- [Quick Start | Gitea Documentation](https://docs.gitea.com/usage/actions/quickstart/?utm_source=chatgpt.com)
- [Azure/webapps-deploy: Enable GitHub developers to ...](https://github.com/Azure/webapps-deploy?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:43:33 PM

[Attachment: image.png]

i dont see this

## Response:
8/5/2026, 9:43:37 PM

It is visible in your screenshot.

At the very top toolbar, next to **Refresh**, there is:

```text
Download publish profile
```

Click that button.

## What happens next

Azure will download a file, usually with a name similar to:

```text
statsthegame-web-dev.PublishSettings
```

That file is XML and contains deployment credentials.

Then:

1. Open the downloaded file in VS Code or Notepad.
2. Select all the text.
3. Copy it.
4. In Gitea go to:

```text
Repository
→ Settings
→ Actions
→ Secrets
→ Add secret
```

5. Create:

```text
Name:
AZURE_FRONTEND_PUBLISH_PROFILE
```

6. Paste the complete XML as the value.
7. Save.

## Important

Do not:

- commit the `.PublishSettings` file;
- upload it to Gitea;
- paste it into a chat;
- include it in screenshots.

After adding the secret, delete the downloaded publish-profile file from your Downloads folder or store it somewhere secure.

Your screenshot also shows:

```text
Deployment provider: LocalGit
No deployments found
```

That means the Azure app exists, but no frontend deployment has happened yet. The Gitea workflow and publish-profile secret are what will let CI/CD perform the first deployment.

## Prompt:
8/5/2026, 9:46:07 PM

K whartodes my env files looki like for the frontend aand n=abckend

## Response:
8/5/2026, 9:46:14 PM

## Recommended setup

Use **separate environment files** for frontend and backend, commit only `.env.example`, and never commit real secrets.

```text
frontend/
├── .env.example
├── .env.local          # ignored
└── .env.production     # usually ignored or supplied by CI

backend/
├── .env.example
├── .env                # ignored
└── .env.test           # ignored
```

## Frontend environment file

For Vite, every variable that the browser needs must start with `VITE_`.

### `frontend/.env.example`

```dotenv
# Public URL of the hand-written Express API
VITE_API_BASE_URL=http://localhost:3000

# Public display configuration
VITE_APP_NAME=Stat’sTheGame
VITE_APP_ENV=development
```

### `frontend/.env.local`

```dotenv
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Stat’sTheGame
VITE_APP_ENV=development
```

### Azure production value

Your Gitea Actions secret or variable should contain:

```text
VITE_API_BASE_URL=https://<your-backend-azure-domain>
```

For example:

```dotenv
VITE_API_BASE_URL=https://statsthegame-api-dev-<azure-suffix>.southafricanorth-01.azurewebsites.net
```

The workflow supplies it during the Vite build:

```yaml
- name: Build frontend
  run: npm run build --workspace=frontend
  env:
    VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
```

### Never put these in the frontend

```dotenv
# NEVER expose these through VITE_ variables
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_CLIENT_SECRET=
AZURE_PUBLISH_PROFILE=
JWT_SECRET=
```

Anything prefixed with `VITE_` becomes visible in the built browser JavaScript.

---

## Backend environment file

The backend can contain private configuration because it runs on the server.

### `backend/.env.example`

```dotenv
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Frontend origin allowed by CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Database
DATABASE_URL=postgresql://username:password@hostname:5432/database

# Authentication provider
AUTH_ISSUER_URL=https://your-auth-provider.example.com
AUTH_CLIENT_ID=replace-me
AUTH_CLIENT_SECRET=replace-me

# External API integration
EXTERNAL_API_BASE_URL=https://api.example.com
EXTERNAL_API_KEY=replace-me

# Logging
LOG_LEVEL=info
```

### `backend/.env`

```dotenv
NODE_ENV=development
PORT=3000
API_VERSION=v1

CORS_ALLOWED_ORIGINS=http://localhost:5173

DATABASE_URL=your-real-local-database-url

AUTH_ISSUER_URL=your-real-auth-issuer
AUTH_CLIENT_ID=your-real-client-id
AUTH_CLIENT_SECRET=your-real-client-secret

EXTERNAL_API_BASE_URL=your-real-api-url
EXTERNAL_API_KEY=your-real-api-key

LOG_LEVEL=debug
```

Only include variables that your backend actually reads. Do not add fake configuration merely because it appears in this template.

## Azure backend environment variables

In Azure App Service, add these under:

```text
Settings
→ Environment variables
```

For the current deployment foundation:

```text
NODE_ENV=production
API_VERSION=v1
CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>
```

Do not add `PORT`; Azure supplies it automatically.

Later, add securely:

```text
DATABASE_URL
AUTH_ISSUER_URL
AUTH_CLIENT_ID
AUTH_CLIENT_SECRET
EXTERNAL_API_BASE_URL
EXTERNAL_API_KEY
LOG_LEVEL=info
```

## Recommended `.gitignore`

At the repository root:

```gitignore
# Environment files
.env
.env.*
!.env.example

frontend/.env
frontend/.env.*
!frontend/.env.example

backend/.env
backend/.env.*
!backend/.env.example

# Azure credentials
*.PublishSettings
*.publishsettings
publish-profile*
```

This keeps the examples committed while excluding actual secrets.

## Accessing the values

### Frontend with Vite

```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is not configured");
}

export { apiBaseUrl };
```

### Backend with Node/Express

```ts
const port = Number(process.env.PORT ?? 3000);
const nodeEnv = process.env.NODE_ENV ?? "development";
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];
```

For local development, load the backend `.env` using your existing environment library, commonly `dotenv`. Do not add another package if your project already has a configuration mechanism.

## Minimum files you should create now

### `frontend/.env.example`

```dotenv
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Stat’sTheGame
VITE_APP_ENV=development
```

### `backend/.env.example`

```dotenv
NODE_ENV=development
PORT=3000
API_VERSION=v1
CORS_ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=
AUTH_ISSUER_URL=
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=
EXTERNAL_API_BASE_URL=
EXTERNAL_API_KEY=
LOG_LEVEL=info
```

## Risks and brief compliance

- The frontend must call your **hand-written Express API**, not Supabase-generated endpoints.
- Supabase database credentials must remain backend-only.
- OAuth client secrets must remain backend-only.
- Azure publish profiles belong in Gitea Actions secrets, never in `.env`.
- `.env.example` must use placeholders rather than working credentials.
- Document every variable, whether it is public or secret, and where it is configured.

### Checklist

- [ ] Create `frontend/.env.example`
- [ ] Create `backend/.env.example`
- [ ] Add environment files to `.gitignore`
- [ ] Put only public values behind `VITE_`
- [ ] Add `VITE_API_BASE_URL` to Gitea Actions
- [ ] Add backend secrets to Azure App Service
- [ ] Do not add `PORT` manually in Azure
- [ ] Verify no real secrets are committed

## Prompt:
8/5/2026, 9:47:53 PM

k give me the env files for each palce

## Response:
8/5/2026, 9:47:58 PM

## Recommended setup

Create these files exactly, then replace the Azure URLs with the actual domains shown in each App Service’s **Overview** page.

# 1. Frontend local development

Create:

```text
frontend/.env.local
```

```dotenv
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Stat'sTheGame
VITE_APP_ENV=development
```

This file is only for running the frontend locally.

# 2. Frontend example file

Create and commit:

```text
frontend/.env.example
```

```dotenv
# Public URL of the hand-written backend API
VITE_API_BASE_URL=http://localhost:3000

# Public frontend configuration
VITE_APP_NAME=Stat'sTheGame
VITE_APP_ENV=development
```

Do not place secrets in this file.

# 3. Frontend production values in Gitea Actions

Do not create a committed production `.env` file.

In Gitea, go to:

```text
Repository
→ Settings
→ Actions
→ Secrets
```

Create:

```text
Name:
VITE_API_BASE_URL
```

Value:

```text
https://<your-backend-default-domain>
```

For example:

```text
https://statsthegame-api-dev-xxxxxxxx.southafricanorth-01.azurewebsites.net
```

Your frontend deployment workflow should use it like this:

```yaml
- name: Build frontend
  run: npm run build --workspace=frontend
  env:
    VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
    VITE_APP_NAME: Stat'sTheGame
    VITE_APP_ENV: production
```

Only `VITE_API_BASE_URL` needs to be a Gitea secret or variable. The app name and environment can be written directly into the workflow because they are not private.

# 4. Backend local development

Create:

```text
backend/.env
```

For the current foundation:

```dotenv
NODE_ENV=development
PORT=3000
API_VERSION=v1

CORS_ALLOWED_ORIGINS=http://localhost:5173

LOG_LEVEL=debug
```

Once the database is connected, add:

```dotenv
DATABASE_URL=postgresql://username:password@hostname:5432/database
```

Once authentication is integrated, add the exact variables required by the selected provider, for example:

```dotenv
AUTH_ISSUER_URL=
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=
```

Do not add fake values for services that are not implemented yet.

# 5. Backend example file

Create and commit:

```text
backend/.env.example
```

```dotenv
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Comma-separated frontend origins
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Logging
LOG_LEVEL=debug

# Database
DATABASE_URL=

# Authentication provider
AUTH_ISSUER_URL=
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=

# External API integration
EXTERNAL_API_BASE_URL=
EXTERNAL_API_KEY=
```

This file contains names and placeholders only.

# 6. Backend production values in Azure

Go to:

```text
statsthegame-api-dev
→ Settings
→ Environment variables
→ App settings
```

Add:

```text
NODE_ENV
production
```

```text
API_VERSION
v1
```

```text
CORS_ALLOWED_ORIGINS
https://<your-frontend-default-domain>
```

For example:

```text
https://statsthegame-web-dev-xxxxxxxx.southafricanorth-01.azurewebsites.net
```

Add:

```text
LOG_LEVEL
info
```

Do not add `PORT`. Azure supplies it.

Once the database is ready, add:

```text
DATABASE_URL
<real Supabase PostgreSQL connection string>
```

Once authentication is ready, add the real provider values:

```text
AUTH_ISSUER_URL
<provider issuer URL>
```

```text
AUTH_CLIENT_ID
<client ID>
```

```text
AUTH_CLIENT_SECRET
<secret>
```

Once the external API is chosen:

```text
EXTERNAL_API_BASE_URL
<external API base URL>
```

```text
EXTERNAL_API_KEY
<external API key>
```

# 7. Gitea deployment secrets

In:

```text
Repository
→ Settings
→ Actions
→ Secrets
```

Create these three secrets:

```text
AZURE_FRONTEND_PUBLISH_PROFILE
```

Value: the full XML from the frontend App Service publish-profile download.

```text
AZURE_BACKEND_PUBLISH_PROFILE
```

Value: the full XML from the backend App Service publish-profile download.

```text
VITE_API_BASE_URL
```

Value: the backend’s public Azure URL.

Publish profiles are deployment credentials. They do not belong in `.env` files.

# 8. Root `.gitignore`

Add:

```gitignore
# Environment files
.env
.env.*
!.env.example

frontend/.env
frontend/.env.*
!frontend/.env.example

backend/.env
backend/.env.*
!backend/.env.example

# Azure publishing credentials
*.PublishSettings
*.publishsettings
publish-profile*
```

# Final placement summary

| Place | Values |
|---|---|
| `frontend/.env.local` | Local public frontend values |
| `frontend/.env.example` | Safe documented placeholders |
| Gitea `VITE_API_BASE_URL` secret | Production backend public URL |
| `backend/.env` | Real local backend configuration |
| `backend/.env.example` | Backend placeholders |
| Azure backend environment variables | Production backend configuration and secrets |
| Gitea Azure publish-profile secrets | CI/CD deployment credentials |

## Create these now

```text
frontend/.env.local
frontend/.env.example
backend/.env
backend/.env.example
```

Then add the three Gitea Actions secrets and the four current Azure backend settings:

```text
NODE_ENV=production
API_VERSION=v1
CORS_ALLOWED_ORIGINS=<frontend Azure URL>
LOG_LEVEL=info
```

## Prompt:
8/5/2026, 9:50:55 PM

l now how doi get tit o t deploy, do i have to push?

## Response:
8/5/2026, 9:51:03 PM

> **Searching the web**
>
> [Quick Start | Gitea Documentation](https://docs.gitea.com/usage/actions/quickstart)
> [Deploy by Using GitHub Actions - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions)
> [Microsoft Azure: Cloud Computing Services](https://azure.microsoft.com/en-ca)
> [Microsoft Azure](https://en.wikipedia.org/wiki/Microsoft_Azure)
>
> **Searched 4 websites**
>
> 
>
> Worked for 6s

Yes-**once the workflows and secrets are configured, deployment is triggered by pushing code to the branch named in the workflow**, usually `main`.

## First deployment

Your workflow probably contains:

```yaml
on:
  push:
    branches:
      - main
```

That means it deploys only after the workflow reaches `main`.

Use your normal Git methodology:

```bash
git switch main
git pull origin main
git switch -c ci/azure-deployment-workflows
```

Add the workflow files and `.env.example` files, then:

```bash
git add .gitea/workflows frontend/.env.example backend/.env.example .gitignore

git commit -m "ci: add Azure deployment workflows" \
  -m "Configure separate Gitea Actions deployments for the frontend and backend." \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"

git push -u origin ci/azure-deployment-workflows
```

Then open a Pull Request in Gitea and merge it into `main`.

The merge into `main` should trigger the deployment workflow automatically.

Gitea Actions requires an available `act_runner`; a workflow file alone cannot execute jobs. ([Gitea Documentation](https://docs.gitea.com/usage/actions/quickstart?utm_source=chatgpt.com))

## After merging

Open:

```text
Gitea
→ Sport-Analytics-Tool
→ Actions
```

You should see:

```text
Deploy frontend to Azure
Deploy backend to Azure
```

The status should move through:

```text
Queued → Running → Success
```

If it remains on **Queued**, the Gitea runner is unavailable or does not support the workflow’s `runs-on` label.

## Important path-filter issue

Your workflows may contain:

```yaml
paths:
  - "frontend/**"
```

and:

```yaml
paths:
  - "backend/**"
```

In that case:

- changing only frontend files triggers only the frontend deployment;
- changing only backend files triggers only the backend deployment;
- changing only unrelated documentation may trigger neither.

To force the initial workflows to run, either edit the corresponding workflow file or make a harmless change inside each application directory.

For example:

```bash
echo "" >> frontend/README.md
echo "" >> backend/README.md
```

Then commit and push through a PR.

## Verify the frontend

After the frontend action succeeds, refresh:

```text
https://statsthegame-web-dev-<suffix>.southafricanorth-01.azurewebsites.net
```

The Azure placeholder page must disappear and your Vite application must appear.

The Azure deployment action should receive the App Service name, publish-profile secret, and built package path. Microsoft’s documented action is `azure/webapps-deploy@v3`. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?utm_source=chatgpt.com))

## Verify the backend

Open:

```text
https://<backend-default-domain>/api/v1/health
```

It must return HTTP `200`.

## Every later deployment

Once the pipeline works, the normal process is:

```text
feature branch
→ commit
→ push to Gitea
→ Pull Request
→ review
→ merge into main
→ Gitea Actions runs automatically
→ Azure deployment
```

You should **not** need to manually upload files or press a deployment button after every change.

## Before pushing, confirm

- [ ] `.gitea/workflows/deploy-frontend.yml` exists.
- [ ] `.gitea/workflows/deploy-backend.yml` exists.
- [ ] Gitea Actions is enabled.
- [ ] A Gitea runner is available.
- [ ] `AZURE_FRONTEND_PUBLISH_PROFILE` exists.
- [ ] `AZURE_BACKEND_PUBLISH_PROFILE` exists.
- [ ] `VITE_API_BASE_URL` exists.
- [ ] Workflow branch is `main`.
- [ ] Workflow paths match your actual folder names.

Your next action is to commit the workflow files on a branch, open a PR, and merge that PR into `main`.

---

**Sources:**

- [Quick Start | Gitea Documentation](https://docs.gitea.com/usage/actions/quickstart?utm_source=chatgpt.com)
- [Deploy by Using GitHub Actions - Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions?utm_source=chatgpt.com)

## Prompt:
8/5/2026, 9:52:29 PM

hep me update lal the docs

## Response:
8/5/2026, 9:52:32 PM

Absolutely. Since you've now provisioned the Azure resources, **Milestone 1 documentation should reflect what has actually been completed**. Don't claim anything that hasn't been verified (for example, don't say CI/CD is working unless you've successfully run a deployment).

Here's what I recommend updating.

---

# 1. `README.md`

Add a new section:

```md
## Deployment

The Sport Analytics Tool uses Microsoft Azure for hosting.

### Backend

- Platform: Azure App Service (Linux)
- Runtime: Node.js 22 LTS
- Environment: Development
- Deployment: Azure App Service
- Configuration: Environment variables managed through Azure App Service

### Frontend

- Platform: Azure App Service (Linux)
- Runtime: Node.js 22 LTS
- Environment: Development
- Deployment: Azure App Service
- Built using Vite.

### CI/CD

Deployment automation is configured using Gitea Actions.

The deployment workflow will:

1. Install dependencies
2. Run project checks
3. Build the application
4. Deploy to Azure App Service

Deployment credentials are stored securely using repository Action Secrets.

No deployment credentials are committed to source control.
```

---

# 2. `docs/deployment/azure-backend.md`

Document exactly what you created.

Example:

```md
# Azure Backend Deployment

## Hosting Platform

Azure App Service (Linux)

## Runtime

Node.js 22 LTS

## Resource

App Service

statsthegame-api-dev

## Environment

Development

## Environment Variables

| Variable | Description |
|-----------|-------------|
| NODE_ENV | production |
| API_VERSION | v1 |
| CORS_ALLOWED_ORIGINS | Frontend Azure URL |
| LOG_LEVEL | info |

Database credentials are configured through Azure App Service and are never committed.

## Logging

Application logging uses the Azure File System logger.

## Deployment

Deployments are performed automatically through Gitea Actions.

## Rollback

Azure supports redeploying any previous successful deployment by rerunning the workflow.
```

---

# 3. `docs/deployment/azure-frontend.md`

```md
# Azure Frontend Deployment

## Hosting Platform

Azure App Service (Linux)

## Runtime

Node.js 22 LTS

## Resource

statsthegame-web-dev

## Framework

React
Vite

## Environment Variables

| Variable | Description |
|-----------|-------------|
| VITE_API_BASE_URL | Backend Azure URL |
| VITE_APP_NAME | Stat'sTheGame |
| VITE_APP_ENV | production |

Only public configuration is exposed through VITE_ variables.

## Deployment

The frontend is deployed through Gitea Actions after successful builds.
```

---

# 4. ADR

Create

```
docs/adr/0003-azure-hosting.md
```

```md
# ADR 0003

## Title

Use Azure App Service for application hosting.

## Status

Accepted

## Context

The project requires deployment, CI/CD and public hosting.

Azure provides free student resources, managed HTTPS and native Node.js support.

## Decision

Backend

Azure App Service (Linux)

Frontend

Azure App Service (Linux)

## Alternatives

Azure Container Apps

Pros

- Containers
- More scalable

Cons

- More operational complexity

Azure Static Web Apps

Pros

- Optimised for static sites

Cons

- Separate deployment pipeline
- Additional hosting service

## Consequences

Azure App Service provides a simple deployment model for Sprint 1 while supporting future CI/CD automation.
```

---

# 5. Architecture

Update your architecture diagram.

```
Browser
      │
      ▼
Frontend
Azure App Service
      │
HTTPS
      ▼
Backend
Azure App Service
      │
      ▼
Supabase PostgreSQL
```

Also show

```
Gitea

↓

Gitea Actions

↓

Azure
```

---

# 6. Infrastructure documentation

Create

```
docs/infrastructure.md
```

```md
# Infrastructure

Frontend

Azure App Service

Backend

Azure App Service

Database

Supabase PostgreSQL

Authentication

OAuth Provider

Version Control

Gitea

CI/CD

Gitea Actions

Documentation

MkDocs

Monitoring

Azure Logs

Secrets

Azure App Service Environment Variables

Gitea Actions Secrets
```

---

# 7. Environment variables documentation

Create

```
docs/environment.md
```

```md
# Environment Variables

## Frontend

| Variable | Required | Secret |
|-----------|----------|---------|
| VITE_API_BASE_URL | Yes | No |
| VITE_APP_NAME | No | No |
| VITE_APP_ENV | No | No |

## Backend

| Variable | Required | Secret |
|-----------|----------|---------|
| NODE_ENV | Yes | No |
| API_VERSION | Yes | No |
| PORT | Azure | No |
| DATABASE_URL | Yes | Yes |
| CORS_ALLOWED_ORIGINS | Yes | No |
| AUTH_CLIENT_SECRET | Yes | Yes |
```

---

# 8. CI/CD documentation

Create

```
docs/ci-cd.md
```

```md
# Continuous Integration and Deployment

CI/CD is implemented using Gitea Actions.

Every deployment performs:

- Checkout
- npm ci
- npm run check
- npm test
- npm run build
- Deploy to Azure

Deployment credentials are stored as repository Action Secrets.

No credentials are stored in the repository.
```

---

# 9. AI usage log

Add today's work.

| Date | Tool | Purpose | Verification |
|------|------|----------|--------------|
| 2026-08-05 | ChatGPT Web (GPT-5.6 Thinking) | Azure deployment planning, environment configuration, CI/CD workflow guidance, deployment documentation | Reviewed and adapted by project team |

This aligns with the AI-use documentation requirement in the course policy. `ai_policy.pdf`

---

# 10. Sprint 1 evidence

Create:

```
docs/evidence/sprint1/deployment.md
```

```md
# Sprint 1 Deployment Evidence

Backend Azure App Service created

Frontend Azure App Service created

Azure environment variables configured

Azure application logging configured

Azure publish profiles generated

Deployment documentation completed

CI/CD workflow added

Evidence

- Azure screenshots
- Deployment logs
- Gitea Pull Request
- Workflow run
```

---

## One correction

Earlier we discussed deploying the frontend to **Azure Static Web Apps** as an option. Since you've already provisioned the frontend on **Azure App Service**, make sure **all of your documentation consistently says Azure App Service** unless you decide to migrate later. Consistency between the implementation and the documentation is more important for Milestone 1 than documenting an alternative you didn't end up using.

## Prompt:
8/5/2026, 10:00:31 PM

> d today's work.
> 
> | Date | Tool | Purpose | Verification |
> | --- | --- | --- | --- |
> | 2026-08-05 | ChatGPT Web (GPT-5.6 Thinking) | Azure deployment planning, environment configuration, CI/CD workflow guidance, deployment documentation | Reviewed and adapted by project team |
> 
> This aligns with the AI-use documentation requirement in the course policy

Date,Team member,Tool,Model,Purpose,Brief task,Output used,Verification or adaptation,Related evidence
2026-08-04,Dean Feldman,ChatGPT Web,GPT-5.6 Thinking,Planning; technical guidance; documentation; code assistance,"Restructure the existing repository while preserving its methodology documents","Initial monorepo scaffold; frontend and backend health applications; CI; documentation; evidence templates","Review, test, and adapt all generated files before merge; verification is pending at generation time","Gitea issue and Pull Request to be added by the team"

2026-08-05,Shayna Unterslak,ChatGPT Web,GPT-5.6 Thinking,Planning; documentation; review; Git and Gitea guidance,"Issue #7 governance and methodology portion of a continuous project session used from 2026-08-04 to 2026-08-05","Git Methodology; Project Methodology; Issue #7 description; ADR-001; issue templates; Pull Request template; AI register wording; repository workflow instructions","Reviewed, adapted and verified each item before use; no application code was generated or used for the Issue #7 governance portion","Unedited ChatGPT transcript retained for the project; Issue #7 and linked Pull Request"
2026-08-05,Shayna Unterslak,ChatGPT Web,GPT-5.6 Thinking,CI debugging; code and configuration assistance; documentation,"Issue #10: restore green CI and reproducible installation; diagnose dependency, formatting, lint, TypeScript compatibility and frontend build failures","Reproducible dependency setup; npm ci workflow; ESLint unused-argument rule; TypeScript 5.5.4 pin; optional AbortSignal fix; development documentation","Reviewed each proposed change; successfully ran npm ci and the complete npm run check pipeline; organised the work into atomic commits","Issue #10 and linked Pull Request; same unedited ChatGPT transcript retained for the project"

add tp tjis

## Response:
8/5/2026, 10:00:36 PM

Add the following row to your AI register:

```csv
2026-08-05,Dean Feldman,ChatGPT Web,GPT-5.6 Thinking,Planning; Azure infrastructure; CI/CD guidance; deployment documentation; environment configuration,"Planned and configured Azure App Service hosting for the frontend and backend; documented Azure deployment approach; generated environment variable templates; produced CI/CD workflow guidance for Gitea Actions; prepared deployment, infrastructure and environment documentation","Azure deployment plan; App Service configuration guidance; frontend and backend .env templates; CI/CD workflow templates; deployment documentation; ADR and infrastructure documentation","Reviewed and adapted all recommendations before implementation; Azure resources created manually; environment variables configured manually; documentation updated by the project team; deployment workflows to be validated through successful CI/CD runs","Azure

## Prompt:
8/5/2026, 10:01:50 PM

help pus

## Response:
8/5/2026, 10:01:52 PM

If you've finished the Azure setup, `.env.example` files, and documentation, here's a clean Git workflow.

## 1. Check what changed

```bash
git status
```

Review the files to make sure you didn't accidentally include:

- `.env`
- `.env.local`
- `.PublishSettings`
- downloaded Azure credentials

If you see any of those, **don't commit them**.

---

## 2. Create a branch (if you're not already on one)

```bash
git switch main
git pull origin main
git switch -c infra/azure-deployment-foundation
```

If you're already on a branch:

```bash
git branch --show-current
```

---

## 3. Stage everything

```bash
git add .
```

Or, if you want to be more selective:

```bash
git add \
  .gitea/workflows \
  docs \
  frontend/.env.example \
  backend/.env.example \
  README.md \
  .gitignore
```

---

## 4. Verify what you're committing

```bash
git status
```

or

```bash
git diff --cached
```

Double-check that no secrets are included.

---

## 5. Commit

```bash
git commit -m "infra(azure): establish deployment foundation" \
  -m "Configure Azure App Service hosting, deployment documentation, environment configuration and CI/CD foundation." \
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]"
```

---

## 6. Push

```bash
git push -u origin infra/azure-deployment-foundation
```

---

## 7. Open a Pull Request

Create a PR into `main`.

Suggested title:

```text
infra: establish Azure deployment foundation
```

Suggested description:

```md
## Summary

- Configure Azure App Service for frontend
- Configure Azure App Service for backend
- Add deployment documentation
- Add environment variable templates
- Add infrastructure documentation
- Add CI/CD deployment foundation
- Update AI register

## Closes

#15
#17

## Verification

- Azure resources created
- Environment variables configured
- Documentation updated
- No secrets committed
```

---

### Before pushing, run one last check

This should return **nothing**:

```bash
git status --ignored
```

Make sure you **don't** see files like:

```text
frontend/.env.local
backend/.env
*.PublishSettings
```

If you do, stop and remove them from the commit before pushing.

---

If you paste the output of:

```bash
git status
```

I can check that you're only committing the correct files before you push.

## Prompt:
8/5/2026, 10:07:49 PM

Logo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
7
Pull Requests
1
Actions
8
Packages
Projects
1
Releases
Wiki
Activity
Settings
Establish the Azure backend deployment foundation #15
Open
opened 7 hours ago by Shayna · 0 comments

Shayna commented 7 hours ago
Member
Description
Investigate the suitable Azure hosting options and deploy the existing Express backend foundation to a non-production Azure environment.

The deployed application must expose the current health endpoint and use environment-based configuration. This issue establishes the deployment path only and must not add sport-specific functionality.

Motivation
The project requires deployment and CI/CD processes. Establishing the backend deployment path early removes uncertainty around hosting, environment configuration, logs and public service availability.

A successful health-endpoint deployment proves that the current backend can be built and hosted before database, authentication and product-specific functionality are added.

Scope
Included
comparing suitable Azure hosting options;
selecting and motivating one Azure service;
creating a non-production Azure resource;
deploying the current Express backend;
configuring environment variables securely;
verifying the public health endpoint;
documenting logs, costs and repeatable deployment steps;
recording the deployment decision.
Excluded
deploying the frontend application;
deploying the MkDocs site;
configuring the final production domain;
implementing sport-specific endpoints;
requiring the Supabase or authentication foundations to be complete;
creating a full production environment.
Acceptance Criteria
At least two suitable Azure hosting options are briefly compared
One hosting option is selected and motivated in an ADR
Expected free-tier or cost limitations are documented
A non-production Azure resource is created
The backend production build succeeds
The backend is deployed successfully
The deployed /api/v1/health endpoint returns HTTP 200
The deployed service uses environment-based configuration
No Azure credentials or secrets are committed
Production or hosted CORS behaviour is considered and documented
Application logs can be accessed
The deployment can be repeated using documented steps
The public backend URL is recorded in the deployment documentation
A rollback or redeployment approach is documented
The future CI/CD automation step is documented
No sport-specific endpoint or feature is added
Dependencies
An Azure subscription or approved student Azure access is required.

A manual deployment may be used for the initial foundation if the Gitea Actions runner is not yet available. Automated deployment can be completed once CI infrastructure is working.

Evidence
Evidence must include:

the Azure hosting ADR;
the public health-endpoint result;
deployment logs or screenshots;
secure configuration evidence;
repeatable deployment instructions;
cost or free-tier notes;
confirmation that no secrets were committed;
the linked Pull Request.
AI Declaration
The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

 Shayna added this to the Sprint 1 milestone 7 hours ago
 Shayna added the 
type: infrastructure
area: infrastructure
 labels 7 hours ago
 Shayna added this to the Sport-Analytics-Tool-Proj project 7 hours ago
 Shayna moved this to Ready in  Sport-Analytics-Tool-Proj on 7 hours ago
 Dean self-assigned this 7 hours ago
 Dean moved this to In Progress in  Sport-Analytics-Tool-Proj on 7 hours ago

Write
Preview
Leave a comment
Drop files or click here to upload.
area: infrastructure
type: infrastructure
Sprint 1
Sport-Analytics-Tool-Proj

Dean
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Dependencies
No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#15
 
Powered by Gitea
Version: 1.24.7 Page:
105ms
Template:
24ms
Licenses
API

what can we tick here

the ci/cd isnt working on gitea for now so i cant fuly complete but for now lets do some ofit

## Response:
8/5/2026, 10:07:58 PM

## Recommended outcome

Tick only what you have actually completed and can evidence. Based on what you described, you can mark the infrastructure setup items, but not the deployment-success items yet.

The brief rewards documented setup and implementation foundations in Milestone 1, but you should not claim a working deployment or CI/CD run without evidence. `project_briefs (4).pdf`

## You can likely tick now

- [x] At least two suitable Azure hosting options are briefly compared  
  Tick this only if the comparison is already written in the ADR or deployment docs.

- [x] One hosting option is selected and motivated in an ADR  
  Tick if your ADR names Azure App Service and explains why it was chosen.

- [x] Expected free-tier or cost limitations are documented  
  Tick if you recorded Free F1 limitations and that it is non-production.

- [x] A non-production Azure resource is created  
  You created the Azure backend App Service.

- [x] The deployed service uses environment-based configuration  
  Tick this only as “configured” if `NODE_ENV` and `API_VERSION` are set in Azure and the code reads environment variables. Do not describe the service as successfully deployed yet.

- [x] No Azure credentials or secrets are committed  
  Tick after checking Git status/history and confirming publish profiles and `.env` files are ignored.

- [x] Production or hosted CORS behaviour is considered and documented  
  Tick if the docs explain the future frontend Azure origin and the `CORS_ALLOWED_ORIGINS` variable.

- [x] Application logs can be accessed  
  Tick if App Service logging is enabled and you can open **Log stream**, even if there is no successful application deployment yet.

- [x] The deployment can be repeated using documented steps  
  Tick only if the actual Azure portal and CI/manual steps are written clearly enough for another team member to follow.

- [x] A rollback or redeployment approach is documented  
  Tick if the docs explain rerunning the workflow, redeploying a known commit, or using Azure Deployment Center history.

- [x] The future CI/CD automation step is documented  
  This is definitely appropriate because the issue explicitly permits CI automation to be completed later when the Gitea runner works.

- [x] No sport-specific endpoint or feature is added  
  Tick if this work only involved infrastructure and health foundations.

## Do not tick yet

- [ ] The backend production build succeeds  
  Do not tick until `npm run build` succeeds locally or in CI and you preserve the output.

- [ ] The backend is deployed successfully  
  The Azure resource existing does not prove deployment.

- [ ] The deployed `/api/v1/health` endpoint returns HTTP 200  
  Do not tick until the public Azure URL returns `200`.

- [ ] The public backend URL is recorded in the deployment documentation  
  You may record the URL now, but the criterion is stronger when it points to a verified working endpoint. You can tick it once the URL is documented, while clearly marking deployment status as pending.

## Suggested progress comment for Issue #15

Paste this as a Gitea comment:

```md
## Progress update

The Azure backend hosting foundation has been partially completed.

### Completed

- Compared Azure App Service and Azure Container Apps
- Selected Azure App Service for the initial backend deployment
- Created the non-production Azure App Service resource
- Configured the Node.js 22 Linux runtime
- Selected the Free F1 pricing tier
- Configured environment-based settings:
  - `NODE_ENV=production`
  - `API_VERSION=v1`
- Enabled Azure application logging
- Documented hosted CORS considerations
- Documented the Azure deployment approach
- Documented cost and free-tier limitations
- Documented rollback and redeployment options
- Confirmed that no Azure credentials or secrets are committed
- Added planned Gitea Actions deployment workflow guidance
- No sport-specific functionality was added

### Pending

- Confirm the backend production build succeeds
- Complete a successful backend deployment
- Verify the public `/api/v1/health` endpoint returns HTTP 200
- Confirm the final public backend URL in the deployment documentation
- Validate automated deployment through Gitea Actions

### Current blocker

The Gitea Actions deployment workflow cannot yet be fully validated because the required Gitea Actions runner or deployment execution path is not currently working.

The issue explicitly permits an initial manual deployment while CI infrastructure is unavailable. A manual Azure deployment or a restored Gitea Actions runner will be used to complete the remaining acceptance criteria.

### Evidence currently available

- Azure App Service resource
- Azure configuration screenshots
- Environment-variable configuration
- Application logging configuration
- Azure hosting ADR
- Deployment documentation
- Cost and free-tier notes
- Secret-handling and `.gitignore` configuration
```

## Issue status

Keep the issue in:

```text
In Progress
```

Do not close it yet.

## Practical completion estimate

You are roughly at:

```text
10-12 of 16 acceptance criteria complete or partially complete
```

The three critical remaining items are:

```text
successful production build
successful Azure deployment
public health endpoint returns HTTP 200
```

Once those work, Issue #15 is effectively complete even if Gitea CI/CD remains documented as a follow-up, because the issue explicitly allows an initial manual deployment.

## Prompt:
8/5/2026, 10:08:49 PM

Logo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
7
Pull Requests
1
Actions
8
Packages
Projects
1
Releases
Wiki
Activity
Settings
Establish Azure frontend deployment foundation #17
Open
opened 6 hours ago by Shayna · 0 comments

Shayna commented 6 hours ago
Member
Description
Establish the initial Azure deployment foundation for the Sport Analytics Tool frontend.

The frontend should be deployed from the existing Vite application and made available through a public HTTPS URL. The deployment must use environment-specific configuration so that the frontend can later communicate with the deployed backend without exposing backend secrets or database credentials.

The selected Azure hosting service and deployment approach must be documented and motivated.

Motivation
An early frontend deployment provides the team with a stable environment for stakeholder demonstrations, integration testing and user testing.

Keeping frontend deployment separate from backend deployment also provides clearer ownership, evidence and troubleshooting. Although the same team member may work on both Azure issues, each deployment should have its own branch, Pull Request and documentation.

Acceptance Criteria
An appropriate Azure hosting service for the Vite frontend has been selected.
The selected service and the reason for choosing it have been documented.
The frontend installs successfully using npm ci.
The frontend production build completes successfully.
The frontend is deployed to a publicly accessible HTTPS URL.
The deployed application loads successfully without blocking browser-console errors.
The deployed frontend displays the existing application interface correctly.
VITE_API_BASE_URL can be configured for the deployed environment.
No backend secrets, database credentials or private API keys are exposed through frontend environment variables.
Frontend deployment instructions are added to the repository documentation.
The public deployment URL is recorded in the documentation or Pull Request.
npm run check passes before the Pull Request is opened.
The work is completed through a reviewed Pull Request linked to this issue.
Dependencies
The final frontend-to-backend connection depends on the Azure backend deployment issue providing a working backend URL.
Automated deployment may depend on a Gitea Actions runner becoming available.
This issue does not include database provisioning or backend hosting.
Evidence
Link or attach:

the Pull Request implementing the deployment;
the public Azure frontend URL;
a screenshot of the deployed frontend;
evidence of a successful production build;
the updated deployment documentation; and
any Azure configuration evidence that does not expose secrets.
AI Declaration
The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

 Shayna added this to the Sprint 1 milestone 6 hours ago
 Shayna added the 
type: infrastructure
 label 6 hours ago
 Dean was assigned by Shayna 6 hours ago
 Shayna added this to the Sport-Analytics-Tool-Proj project 6 hours ago
 Shayna added the 
area: frontend
 label 6 hours ago
 Shayna moved this to Ready in  Sport-Analytics-Tool-Proj on 6 hours ago
 Dean moved this to In Progress in  Sport-Analytics-Tool-Proj on 5 hours ago

Write
Preview
Leave a comment
Drop files or click here to upload.
area: frontend
type: infrastructure
Sprint 1
Sport-Analytics-Tool-Proj

Dean
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Dependencies
No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#17
 
Powered by Gitea
Version: 1.24.7 Page:
103ms
Template:
22ms
Licenses
API

## Response:
8/5/2026, 10:08:53 PM

## Recommended outcome

For Issue #17, you can tick the setup and documentation criteria that are genuinely complete, but you should leave deployment-success criteria unticked until the Azure placeholder page is replaced by the actual Vite app.

## You can likely tick now

- [x] **An appropriate Azure hosting service for the Vite frontend has been selected.**  
  You selected Azure App Service on Linux for the current implementation.

- [x] **The selected service and the reason for choosing it have been documented.**  
  Tick this only if your ADR or frontend deployment document explains why App Service was selected.

- [x] **`VITE_API_BASE_URL` can be configured for the deployed environment.**  
  Tick if:
  - `frontend/.env.example` documents it; and
  - the Gitea workflow passes it into the Vite build.

- [x] **No backend secrets, database credentials or private API keys are exposed through frontend environment variables.**  
  Tick after confirming that the frontend contains only public `VITE_*` values.

- [x] **Frontend deployment instructions are added to the repository documentation.**  
  Tick if the App Service setup, Gitea secrets, workflow and verification steps are written down.

- [x] **The public deployment URL is recorded in the documentation or Pull Request.**  
  You may tick this if the exact Azure URL is recorded, but label it as provisioned or pending successful deployment until the application is live.

## Tick only after running locally

- [ ] **The frontend installs successfully using `npm ci`.**
- [ ] **The frontend production build completes successfully.**
- [ ] **`npm run check` passes before the Pull Request is opened.**

You can complete these immediately on your computer:

```bash
npm ci
npm run check
npm run build
```

If this is a workspace monorepo, use the repository’s actual commands, for example:

```bash
npm run check --workspace=frontend
npm run build --workspace=frontend
```

Save the terminal output or screenshot as evidence.

## Do not tick yet

- [ ] **The frontend is deployed to a publicly accessible HTTPS URL.**  
  The Azure resource is public, but the actual frontend is not deployed while the Azure placeholder page is shown.

- [ ] **The deployed application loads successfully without blocking browser-console errors.**

- [ ] **The deployed frontend displays the existing application interface correctly.**

- [ ] **The work is completed through a reviewed Pull Request linked to this issue.**  
  Tick only once the PR has been reviewed and merged.

## Suggested Issue #17 progress comment

Paste this into Gitea:

```md
## Progress update

The Azure frontend deployment foundation has been partially completed.

### Completed

- Selected Azure App Service on Linux for the initial Vite frontend hosting environment
- Created the non-production Azure frontend App Service
- Configured the Node.js 22 LTS runtime
- Selected the Azure Free pricing tier
- Enabled HTTPS hosting
- Disabled direct GitHub continuous deployment because Gitea is the authoritative repository
- Documented the selected hosting service and deployment approach
- Added environment-specific frontend configuration using `VITE_API_BASE_URL`
- Confirmed that no backend secrets, database credentials or private API keys are exposed through `VITE_*` variables
- Added frontend deployment and secret-handling documentation
- Recorded the Azure frontend URL
- Prepared the Gitea Actions deployment workflow and required repository secrets

### Pending verification

- Run and record a successful `npm ci`
- Run and record a successful frontend production build
- Run and record a successful `npm run check`
- Complete the first Azure frontend deployment
- Confirm that the Azure placeholder page is replaced by the Stat’sTheGame frontend
- Confirm that the deployed frontend has no blocking browser-console errors
- Confirm the existing frontend interface renders correctly
- Validate the Gitea Actions deployment workflow
- Complete review and merge of the linked Pull Request

### Current blocker

The Gitea Actions deployment workflow cannot yet be fully executed because the required Gitea Actions runner or deployment execution path is not currently working.

The Azure frontend resource and deployment configuration are in place. A manual first deployment or restoration of the Gitea Actions runner is required to complete the remaining deployment acceptance criteria.

### Evidence currently available

- Azure frontend App Service resource
- Azure resource configuration screenshots
- Free-tier configuration
- Frontend environment-variable templates
- Gitea Actions workflow configuration
- Azure publish-profile secret configuration
- Frontend deployment documentation
- Public Azure URL
```

## Current status estimate

You are approximately at:

```text
6 of 13 acceptance criteria complete
3 can be completed locally now
4 require a successful deployment and PR
```

## Next actions

```bash
npm ci
npm run check
npm run build
```

Then preserve the output, commit the workflow and documentation through a branch, and keep Issue #17 in **In Progress** until the live page shows Stat’sTheGame rather than the Azure placeholder.

## Prompt:
8/5/2026, 10:10:57 PM

Configure separate Gitea Actions deployments for the frontend and backend.

Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]

## Purpose

Explain why this change is required.

## Changes

Summarise the changes included in this Pull Request.

-

## Testing and Verification

Explain how the change was tested or verified.

- [ ] Relevant local checks pass
- [ ] New or changed behaviour has appropriate tests where applicable
- [ ] Existing tests continue to pass
- [ ] Error and failure states were considered
- [ ] The changed files were reviewed by the author

## Known Limitations

List any remaining limitations.

If there are no known limitations, write:

**None.**

## Related Issue

Closes #

## Review Checklist

- [ ] All applicable issue acceptance criteria are met
- [ ] The Pull Request contains no unrelated changes
- [ ] Security implications were considered where relevant
- [ ] Accessibility and responsiveness were considered where relevant
- [ ] Documentation and evidence were updated
- [ ] No credentials, secrets or sensitive information were committed
- [ ] AI assistance was attributed where required
- [ ] All reviewer comments have been resolved

## Screenshots, API Examples or Other Evidence

Add relevant evidence.

If this section is not applicable, state why.

## AI Declaration

State the AI usage or non-usage declaration for this Pull Request description.

Example:

> The preceding Pull Request description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

Where no AI was used:

> The preceding Pull Request description was written without the assistance of AI.

make reference to the issues i was workignon aswell and helo me tick som e tfo the optins

## Response:
8/5/2026, 10:11:02 PM

Use this PR description. It references both **Issue #15** and **Issue #17**, but it does **not** claim the deployments are already working.

```md
Configure separate Gitea Actions deployments for the frontend and backend.

Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]

## Purpose

This change establishes the CI/CD deployment foundation for the Stat’sTheGame frontend and backend.

The project requires CI/CD for collaboration, testing, builds and deployment. Separate deployment workflows are required because the frontend and backend are deployed to different Azure App Service resources and have different build outputs, environment configuration and verification requirements.

This Pull Request supports:

- Issue #15: Establish the Azure backend deployment foundation
- Issue #17: Establish the Azure frontend deployment foundation

The workflows are intended to deploy automatically after changes are merged into `main`, once the Gitea Actions runner and Azure deployment credentials are working correctly.

## Changes

- Added a dedicated Gitea Actions workflow for the frontend deployment
- Added a dedicated Gitea Actions workflow for the backend deployment
- Configured the frontend workflow to:
  - install dependencies using `npm ci`
  - run frontend checks
  - build the Vite application
  - provide `VITE_API_BASE_URL` during the production build
  - deploy the frontend build output to the Azure frontend App Service
- Configured the backend workflow to:
  - install dependencies using `npm ci`
  - run backend checks and tests
  - build the Express backend
  - deploy the backend package to the Azure backend App Service
- Added or updated frontend and backend environment example files
- Updated `.gitignore` rules to exclude local environment files and Azure publish-profile files
- Added deployment, environment-variable and CI/CD documentation
- Recorded the Azure frontend and backend deployment approach
- Updated the project AI usage register

## Testing and Verification

The following checks were completed where available:

- [x] The changed files were reviewed by the author
- [x] The workflow files were reviewed for correct branch triggers, paths and secret names
- [x] Environment example files contain placeholders only
- [x] No Azure publish profiles, `.env` files or credentials were committed
- [x] Frontend environment variables were reviewed to ensure no backend secrets or database credentials are exposed
- [x] Error and failure states were considered and documented
- [ ] Relevant local checks pass
- [ ] New or changed behaviour has appropriate tests where applicable
- [ ] Existing tests continue to pass
- [ ] The Gitea Actions workflows complete successfully
- [ ] The frontend deploys successfully to Azure
- [ ] The backend deploys successfully to Azure
- [ ] The public backend `/api/v1/health` endpoint returns HTTP 200
- [ ] The deployed frontend displays the existing application interface correctly

The unchecked items remain pending because the Gitea Actions deployment runner or deployment execution path is not currently working.

## Known Limitations

- The Gitea Actions deployment workflows have not yet completed successfully.
- The frontend Azure App Service currently shows the default Azure placeholder page.
- The backend Azure deployment and public `/api/v1/health` response have not yet been verified.
- The final frontend-to-backend connection depends on the backend deployment URL becoming available.
- The workflows may require minor path or command adjustments if the repository workspace names differ from the paths currently configured.
- A manual first deployment may be required while the Gitea Actions runner is unavailable.

These limitations are documented in Issues #15 and #17 and do not close either issue yet.

## Related Issues

Supports #15  
Supports #17

This Pull Request does not close either issue because successful Azure deployments and public endpoint verification are still pending.

## Review Checklist

- [ ] All applicable issue acceptance criteria are met
- [x] The Pull Request contains no unrelated changes
- [x] Security implications were considered where relevant
- [x] Accessibility and responsiveness were considered where relevant
- [x] Documentation and evidence were updated
- [x] No credentials, secrets or sensitive information were committed
- [x] AI assistance was attributed where required
- [ ] All reviewer comments have been resolved

## Screenshots, API Examples or Other Evidence

Current evidence includes:

- Azure backend App Service resource configuration
- Azure frontend App Service resource configuration
- Azure Free-tier configuration
- Azure environment-variable configuration
- Azure application logging configuration
- Gitea Actions workflow files
- Frontend and backend environment example files
- Updated `.gitignore`
- Azure deployment documentation
- CI/CD documentation
- AI usage register entry

Pending evidence:

- Successful Gitea Actions frontend workflow run
- Successful Gitea Actions backend workflow run
- Successful Azure frontend deployment
- Successful Azure backend deployment
- Public frontend screenshot showing the Stat’sTheGame interface
- Public backend `/api/v1/health` response returning HTTP 200

## AI Declaration

> The preceding Pull Request description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].
```

## Boxes you can tick now

You can safely tick:

```md
- [x] The changed files were reviewed by the author
- [x] The workflow files were reviewed for correct branch triggers, paths and secret names
- [x] Environment example files contain placeholders only
- [x] No Azure publish profiles, `.env` files or credentials were committed
- [x] Frontend environment variables were reviewed to ensure no backend secrets or database credentials are exposed
- [x] Error and failure states were considered and documented
```

In the review checklist, you can likely tick:

```md
- [x] The Pull Request contains no unrelated changes
- [x] Security implications were considered where relevant
- [x] Accessibility and responsiveness were considered where relevant
- [x] Documentation and evidence were updated
- [x] No credentials, secrets or sensitive information were committed
- [x] AI assistance was attributed where required
```

Leave these unticked for now:

```md
- [ ] All applicable issue acceptance criteria are met
- [ ] Relevant local checks pass
- [ ] Existing tests continue to pass
- [ ] All reviewer comments have been resolved
```

Only tick the local checks and existing tests after you actually run:

```bash
npm ci
npm run check
npm test
npm run build
```

Also, use **Supports #15** and **Supports #17**, not `Closes #15` or `Closes #17`, because both deployment issues still have unfinished acceptance criteria.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)