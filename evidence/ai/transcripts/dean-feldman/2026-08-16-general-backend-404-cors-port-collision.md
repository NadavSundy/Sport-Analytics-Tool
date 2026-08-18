# Backend 404 CORS Fix

**User:** Anonymous  
**Created:** 8/16/2026 14:16:47  
**Updated:** 8/16/2026 14:33:32  
**Exported:** 8/18/2026 12:24:56  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a81aa26-4d44-83ea-abd2-d47c2715bf36](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a81aa26-4d44-83ea-abd2-d47c2715bf36)  

## Prompt:
8/16/2026, 2:16:46 PM

![10620097-2088-438f-90ef-ecd512cd4708.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000cdc481f4840a0c640c5cc4be&ts=496402&p=fs&cid=1&sig=6d8974edd60d80d9d819d5698308c58edfa04f2f1d3e64b113235884b28d1ed5&v=0)

all.js:11 Env key MODE not found, but marked as optional; proceeding
Ci @ all.js:11
(anonymous) @ all.js:20
(anonymous) @ all.js:1
(anonymous) @ all.js:20
(anonymous) @ all.js:1
(anonymous) @ all.js:20
(anonymous) @ all.js:1
(anonymous) @ all.js:20
(anonymous) @ all.js:1
(anonymous) @ all.js:20
(anonymous) @ all.js:165
chunk-SQIELOP7.js?v=722cf687:21551 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
competitions:1 Access to fetch at 'http://localhost:3000/api/v1/competitions' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
public-read.ts:57  GET http://localhost:3000/api/v1/competitions net::ERR_FAILED 404 (Not Found)
(anonymous) @ public-read.ts:57
(anonymous) @ public-read.ts:80
(anonymous) @ BrowseCollection.tsx:106
(anonymous) @ usePublicData.ts:23
commitHookEffectListMount @ chunk-SQIELOP7.js?v=722cf687:16915
invokePassiveEffectMountInDEV @ chunk-SQIELOP7.js?v=722cf687:18324
invokeEffectsInDev @ chunk-SQIELOP7.js?v=722cf687:19701
commitDoubleInvokeEffectsInDEV @ chunk-SQIELOP7.js?v=722cf687:19686
flushPassiveEffectsImpl @ chunk-SQIELOP7.js?v=722cf687:19503
flushPassiveEffects @ chunk-SQIELOP7.js?v=722cf687:19447
(anonymous) @ chunk-SQIELOP7.js?v=722cf687:19328
workLoop @ chunk-SQIELOP7.js?v=722cf687:197
flushWork @ chunk-SQIELOP7.js?v=722cf687:176
performWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:384
postMessage
schedulePerformWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:407
performWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:387
postMessage
schedulePerformWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:407
requestHostCallback @ chunk-SQIELOP7.js?v=722cf687:418
unstable_scheduleCallback @ chunk-SQIELOP7.js?v=722cf687:330
scheduleCallback$1 @ chunk-SQIELOP7.js?v=722cf687:19826
ensureRootIsScheduled @ chunk-SQIELOP7.js?v=722cf687:18652
scheduleUpdateOnFiber @ chunk-SQIELOP7.js?v=722cf687:18562
updateContainer @ chunk-SQIELOP7.js?v=722cf687:20776
ReactDOMHydrationRoot.render.ReactDOMRoot.render @ chunk-SQIELOP7.js?v=722cf687:21116
(anonymous) @ main.tsx:15
all.js:20 [AssignmentCache] no LMS adapter active — skipping fetch {lmsState: null}
(anonymous) @ all.js:20
SV @ all.js:20
(anonymous) @ all.js:20
AV @ all.js:20
TV @ all.js:20
zX @ all.js:20
Y_t @ all.js:20
(anonymous) @ all.js:165
setTimeout
main @ all.js:165
await in main
(anonymous) @ all.js:165
(anonymous) @ all.js:165
(anonymous) @ all.js:165
competitions?limit=50:1 Access to fetch at 'http://localhost:3000/api/v1/competitions?limit=50' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
public-read.ts:57  GET http://localhost:3000/api/v1/competitions?limit=50 net::ERR_FAILED 404 (Not Found)
(anonymous) @ public-read.ts:57
(anonymous) @ public-read.ts:80
(anonymous) @ BrowseCollection.tsx:106
(anonymous) @ usePublicData.ts:23
commitHookEffectListMount @ chunk-SQIELOP7.js?v=722cf687:16915
commitPassiveMountOnFiber @ chunk-SQIELOP7.js?v=722cf687:18156
commitPassiveMountEffects_complete @ chunk-SQIELOP7.js?v=722cf687:18129
commitPassiveMountEffects_begin @ chunk-SQIELOP7.js?v=722cf687:18119
commitPassiveMountEffects @ chunk-SQIELOP7.js?v=722cf687:18109
flushPassiveEffectsImpl @ chunk-SQIELOP7.js?v=722cf687:19490
flushPassiveEffects @ chunk-SQIELOP7.js?v=722cf687:19447
(anonymous) @ chunk-SQIELOP7.js?v=722cf687:19328
workLoop @ chunk-SQIELOP7.js?v=722cf687:197
flushWork @ chunk-SQIELOP7.js?v=722cf687:176
performWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:384
postMessage
schedulePerformWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:407
performWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:387
postMessage
schedulePerformWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:407
performWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:387
postMessage
schedulePerformWorkUntilDeadline @ chunk-SQIELOP7.js?v=722cf687:407
requestHostCallback @ chunk-SQIELOP7.js?v=722cf687:418
unstable_scheduleCallback @ chunk-SQIELOP7.js?v=722cf687:330
scheduleCallback$1 @ chunk-SQIELOP7.js?v=722cf687:19826
ensureRootIsScheduled @ chunk-SQIELOP7.js?v=722cf687:18652
scheduleUpdateOnFiber @ chunk-SQIELOP7.js?v=722cf687:18562
dispatchSetState @ chunk-SQIELOP7.js?v=722cf687:12403
(anonymous) @ react-router-dom.js?v=722cf687:10878
startTransition @ chunk-CN7HREE2.js?v=722cf687:1643
(anonymous) @ react-router-dom.js?v=722cf687:10878
push @ react-router-dom.js?v=722cf687:761
(anonymous) @ react-router-dom.js?v=722cf687:6397
(anonymous) @ react-router-dom.js?v=722cf687:11324
applyFilters @ BrowseCollection.tsx:55
callCallback2 @ chunk-SQIELOP7.js?v=722cf687:3674
invokeGuardedCallbackDev @ chunk-SQIELOP7.js?v=722cf687:3699
invokeGuardedCallback @ chunk-SQIELOP7.js?v=722cf687:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-SQIELOP7.js?v=722cf687:3736
executeDispatch @ chunk-SQIELOP7.js?v=722cf687:7014
processDispatchQueueItemsInOrder @ chunk-SQIELOP7.js?v=722cf687:7034
processDispatchQueue @ chunk-SQIELOP7.js?v=722cf687:7043
dispatchEventsForPlugins @ chunk-SQIELOP7.js?v=722cf687:7051
(anonymous) @ chunk-SQIELOP7.js?v=722cf687:7174
batchedUpdates$1 @ chunk-SQIELOP7.js?v=722cf687:18913
batchedUpdates @ chunk-SQIELOP7.js?v=722cf687:3579
dispatchEventForPluginEventSystem @ chunk-SQIELOP7.js?v=722cf687:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-SQIELOP7.js?v=722cf687:5478
dispatchEvent @ chunk-SQIELOP7.js?v=722cf687:5472
dispatchDiscreteEvent @ chunk-SQIELOP7.js?v=722cf687:5449

## Response:
8/16/2026, 2:16:47 PM

> **Diagnosing the API failure**
>
> I’m narrowing this to backend configuration or route registration. I’ll verify the exact CORS variable, correct the frontend API URL, restart both services, and confirm whether the endpoint uses a different path prefix.
>
> **Diagnosed the API failure**
>
> 
>
> Worked for 15s

## Recommended outcome

**Fix the backend `404` first, then CORS if it still remains.** The important errors are:

```text
GET http://localhost:3000/api/v1/competitions 404 (Not Found)
GET http://localhost:3000/api/v1/competitions?limit=50 404 (Not Found)
```

The CORS message is likely a **secondary symptom**: the server is returning a `404` response without an `Access-Control-Allow-Origin` header, so the browser reports both.

The `MODE` warning, React DevTools message, and `[AssignmentCache] no LMS adapter active` are unrelated.

### 1. Test the backend without the browser

From the repository root, run:

```bash
curl -i http://localhost:3000/api/v1/competitions
```

There are two possible outcomes.

**If you get `404 Not Found`:** the problem is definitely backend routing / the wrong process / a stale backend, not frontend CORS.

**If you get `200 OK` with JSON:** the route exists and we then fix CORS.

---

### 2. Check what is actually running on port 3000

Run:

```bash
lsof -i :3000
```

If `lsof` isn't available:

```bash
ss -ltnp | grep ':3000'
```

We need to make sure port `3000` is actually your Sport Analytics backend rather than some old Node process.

If you're unsure, kill the existing backend and restart it cleanly.

From the repo root:

```bash
npm run dev --workspace=@sport-analytics/backend
```

Keep that terminal open.

Then in another terminal:

```bash
curl -i http://localhost:3000/api/v1/competitions
```

---

### 3. Check whether the competitions route actually exists

Run:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  "competitions" apps/backend/src
```

Then:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  -E "app\.use|router\.use" apps/backend/src
```

We're looking for something equivalent to:

```ts
router.get('/competitions', ...)
```

and somewhere higher up:

```ts
app.use('/api/v1', router)
```

If the route exists in the source but `curl` still returns `404`, that strongly suggests you're running the wrong/stale backend process or the route module isn't mounted.

---

### 4. Check the actual CORS environment-variable name

Run:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  "CORS" apps/backend/src apps/backend/.env apps/backend/.env.example
```

Your development backend needs to permit:

```text
http://localhost:5173
```

So whichever environment key the source code actually reads should contain that origin.

For example, **only if the grep confirms the variable is named `CORS_ORIGINS`**, you'd want:

```env
CORS_ORIGINS=http://localhost:5173
```

Don't blindly add `CORS_ALLOWED_ORIGINS` or another name-the important thing is that `.env` matches what `apps/backend/src/config/env.ts` actually reads.

Then **restart the backend**. Environment changes won't affect an already-running Node process.

---

### 5. Verify CORS directly

Once `/competitions` stops returning `404`, run:

```bash
curl -i \
  -H "Origin: http://localhost:5173" \
  http://localhost:3000/api/v1/competitions
```

You want the response headers to contain something like:

```text
Access-Control-Allow-Origin: http://localhost:5173
```

If that header is present, backend CORS is working.

---

### 6. Verify frontend API configuration

Run:

```bash
cat apps/frontend/.env
```

and:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  "VITE_API_BASE_URL" apps/frontend
```

For local development it should ultimately resolve to:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Then restart Vite:

```bash
npm run dev --workspace=@sport-analytics/frontend
```

Vite environment variables are read when it starts, so changing `.env` without restarting isn't enough.

---

## What I think is most likely

Given this exact console output, I'd investigate in this order:

1. **Wrong/stale server running on port 3000**
2. **`/api/v1/competitions` route isn't mounted**
3. **Backend wasn't restarted after recent code changes**
4. **CORS configuration doesn't include `http://localhost:5173`**
5. **Frontend API base URL and backend route prefix don't agree**

The fact that both:

```text
/api/v1/competitions
```

and

```text
/api/v1/competitions?limit=50
```

return `404` means the `limit` parameter is **not** the problem.

This matters for the project beyond local development: the official brief specifically requires a hand-written HTTP API, and the Milestone 2 rubric gives **15% to the API**, with the Advanced level requiring it to be externally available and documented. `project_briefs (4).pdf` The Sport Analytics brief also treats the API as a core product rather than an accessory to the frontend. `sport_analytics (1).pdf`

### Do this now

Run these three commands and send me the output:

```bash
curl -i http://localhost:3000/api/v1/competitions
```

```bash
lsof -i :3000 || ss -ltnp | grep ':3000'
```

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  "competitions" apps/backend/src
```

From those three outputs we should be able to pinpoint the exact fault rather than changing CORS settings blindly.

## Prompt:
8/16/2026, 2:20:06 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ curl -i http://localhost:3000/api/v1/competitions
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
Refresh: 1; url=/
Set-Cookie: i_like_gitea=6e725fddee86d061; Path=/; HttpOnly; SameSite=Lax
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Date: Sun, 16 Aug 2026 12:19:09 GMT
Content-Length: 46

Not Found. <a href="/">Go to default page</a>.dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ lsof -i :3000
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ npm run dev --workspace=@sport-analytics/backend

> @sport-analytics/backend@0.1.0 dev
> tsx watch src/index.ts

node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

Error: 
You installed esbuild for another platform than the one you're currently using.
This won't work because esbuild is written with native code and needs to
install a platform-specific binary executable.

Specifically the "@esbuild/win32-x64" package is present but this platform
needs the "@esbuild/linux-x64" package instead. People often get into this
situation by installing esbuild on Windows or macOS and copying "node_modules"
into a Docker image that runs Linux, or by copying "node_modules" between
Windows and WSL environments.

If you are installing with npm, you can try not copying the "node_modules"
directory when you copy the files over, and running "npm ci" or "npm install"
on the destination platform after the copy. Or you could consider using yarn
instead of npm which has built-in support for installing a package on multiple
platforms simultaneously.

If you are installing with yarn, you can try listing both this platform and the
other platform in your ".yarnrc.yml" file using the "supportedArchitectures"
feature: https://yarnpkg.com/configuration/yarnrc/#supportedArchitectures
Keep in mind that this means multiple copies of esbuild will be present.

Another alternative is to use the "esbuild-wasm" package instead, which works
the same way on all platforms. But it comes with a heavy performance cost and
can sometimes be 10x slower than the "esbuild" package, so you may also not
want to do that.

    at generateBinPath (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/esbuild/lib/main.js:2029:17)
    at esbuildCommandAndArgs (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/esbuild/lib/main.js:2110:33)
    at ensureServiceIsRunning (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/esbuild/lib/main.js:2267:25)
    at startSyncServiceWorker (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/esbuild/lib/main.js:2474:19)
    at Object.<anonymous> (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/esbuild/lib/main.js:2515:3)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module._load (node:internal/modules/cjs/loader:1396:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19) {
  name: 'TransformError'
}

Node.js v24.18.0
^C
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  "competitions" apps/backend/src
apps/backend/src/middleware/require-authorization.ts:57:export function hasCompetitionScope(account: ApplicationAccount, competitionId: string): boolean {
apps/backend/src/middleware/require-authorization.ts:61:export function requireCompetitionScope(
apps/backend/src/middleware/require-authorization.ts:73:      if (!hasCompetitionScope(account, competitionId)) {
apps/backend/src/modules/competitions/competition.repository.ts:22:export async function listCompetitions(
apps/backend/src/modules/public-read/public-read.controller.ts:83:    listCompetitions: wrapPublicHandler(async (request, response) => {
apps/backend/src/modules/public-read/public-read.controller.ts:90:      response.status(200).json(await service.listCompetitions(query));
apps/backend/src/modules/public-read/public-read.routes.ts:10:  router.get('/competitions', controller.listCompetitions);
apps/backend/src/modules/public-read/public-read.routes.ts:12:  router.get('/competitions/:competitionId', controller.getCompetition);
apps/backend/src/modules/public-read/public-read.service.ts:17:  listCompetitions as listCompetitionRecords,
apps/backend/src/modules/public-read/public-read.service.ts:18:} from '../competitions/competition.repository';
apps/backend/src/modules/public-read/public-read.service.ts:65:  listCompetitions(query: CompetitionListQuery): Promise<{
apps/backend/src/modules/public-read/public-read.service.ts:200:    async listCompetitions(query) {
apps/backend/src/modules/submissions/submission.service.ts:3:import { hasCompetitionScope } from '../../middleware/require-authorization';
apps/backend/src/modules/submissions/submission.service.ts:28:      if (!fixture.competitionId || !hasCompetitionScope(account, fixture.competitionId)) {
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  -E "app\.use|router\.use" apps/backend/src
apps/backend/src/app.ts:64:  app.use(helmet());
apps/backend/src/app.ts:65:  app.use(
apps/backend/src/app.ts:71:  app.use(express.json({ limit: '1mb' }));
apps/backend/src/app.ts:72:  app.use(
apps/backend/src/app.ts:78:  app.use('/api/v1/health', healthRouter);
apps/backend/src/app.ts:79:  app.use('/api/v1/auth', createAuthRouter(verifyAccessToken, synchronizeAccount));
apps/backend/src/app.ts:80:  app.use('/api/v1', createFixtureStatisticsRouter(fixtureStatisticsService));
apps/backend/src/app.ts:81:  app.use(
apps/backend/src/app.ts:85:  app.use(
apps/backend/src/app.ts:89:  app.use('/api/v1', createPublicReadRouter(publicReadService));
apps/backend/src/app.ts:91:  app.use(notFoundHandler);
apps/backend/src/app.ts:92:  app.use(errorHandler);
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  "CORS" apps/backend/src apps/backend/.env apps/backend/.env.example
apps/backend/src/app.ts:1:import cors from 'cors';
apps/backend/src/app.ts:57:  const allowedOrigins = environment.CORS_ORIGINS.split(',')
apps/backend/src/app.ts:66:    cors({
apps/backend/src/config/env.ts:6:  CORS_ORIGINS: z.string().default('http://localhost:5173'),
apps/backend/.env:3:CORS_ORIGINS=http://localhost:5173
apps/backend/.env.example:3:CORS_ORIGINS=http://localhost:5173
apps/backend/.env.example:14:CORS_ALLOWED_ORIGINS=http://localhost:5173
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ curl -i \
  -H "Origin: http://localhost:5173" \
  http://localhost:3000/api/v1/competitions
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
Refresh: 1; url=/
Set-Cookie: i_like_gitea=a751a45ff764f3af; Path=/; HttpOnly; SameSite=Lax
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Date: Sun, 16 Aug 2026 12:19:58 GMT
Content-Length: 46

Not Found. <a href="/">Go to default page</a>.dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
8/16/2026, 2:20:13 PM

> **Diagnosing the port issue**
>
> I’m seeing two likely problems: port 3000 is already serving a separate application, and dependencies were installed for the wrong platform. I’d reinstall packages inside WSL, then start the project there consistently.
>
> **Diagnosed the port issue**
>
> 
>
> Worked for 13s

## Recommended outcome

We found the actual problem: **your frontend is not talking to your backend at all.**

`localhost:3000` is currently returning a **Gitea server response**:

```text
Set-Cookie: i_like_gitea=...
Not Found. <a href="/">Go to default page</a>
```

At the same time, your real backend **cannot start** because `node_modules` contains the Windows build of `esbuild`, while you're running Node inside WSL/Linux.

So **do not change CORS yet**. Your CORS configuration is already correct:

```text
CORS_ORIGINS=http://localhost:5173
```

and your route is correctly registered:

```text
router.get('/competitions', ...)
app.use('/api/v1', createPublicReadRouter(...))
```

### Step 1 — Fix the Windows/WSL dependency mismatch

You're currently here:

```bash
/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
```

Stay inside **WSL** and run from the repository root:

```bash
rm -rf node_modules
rm -rf apps/backend/node_modules
rm -rf apps/frontend/node_modules
rm -rf packages/*/node_modules
```

Then reinstall using Linux/WSL:

```bash
npm ci
```

**Do not delete `package-lock.json`.** There is no reason to regenerate the lockfile for this.

This may take a few minutes because the repository is under `/mnt/c`.

---

### Step 2 — Confirm Linux esbuild was installed

After `npm ci` finishes:

```bash
npm ls @esbuild/linux-x64
```

You should see an installed Linux package rather than just:

```text
@esbuild/win32-x64
```

You can also run:

```bash
node -e "require('esbuild'); console.log('esbuild OK')"
```

Expected:

```text
esbuild OK
```

---

### Step 3 — Start only the backend

Now:

```bash
npm run dev --workspace=@sport-analytics/backend
```

Do **not** press Ctrl+C.

You should get the backend startup output rather than the `TransformError`.

If it starts successfully, leave that terminal open.

---

## There may be a second problem: something on Windows is using port 3000

Because:

```bash
lsof -i :3000
```

showed nothing inside Linux, but:

```bash
curl http://localhost:3000
```

reached Gitea, there's a very good chance **a Windows process is listening on port 3000** and WSL is reaching it through localhost interoperability.

If your backend starts normally anyway, that's fine. Skip ahead to Step 5.

If you instead get something like:

```text
EADDRINUSE
address already in use :::3000
```

then run this **from WSL**:

```bash
cmd.exe /c "netstat -ano | findstr :3000"
```

You'll likely see something like:

```text
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
```

The last number is the Windows PID.

Then identify it:

```bash
powershell.exe -NoProfile -Command "Get-Process -Id 12345"
```

Replace `12345` with the PID you actually receive.

**Don't kill it yet.** Send me the process name first if you're unsure what it is.

---

### Step 4 — Don't run npm installs from both Windows and WSL

This is why you hit both the earlier Rollup issue and now this esbuild issue.

Your repository sits on the Windows filesystem:

```text
C:\Users\deanf\Downloads\Sport-Analytics-Tool
```

while you're running it through:

```text
/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
```

The same `node_modules` therefore gets shared.

Windows npm installs:

```text
@esbuild/win32-x64
@rollup/rollup-win32-x64-msvc
```

WSL needs:

```text
@esbuild/linux-x64
@rollup/rollup-linux-x64-gnu
```

### For this project, pick WSL

I'd recommend that from now on you do all of these inside WSL:

```bash
npm ci
npm install
npm run dev
npm test
npm run build
```

Avoid running `npm install` from PowerShell against this same checkout afterward, otherwise you can recreate the problem.

---

### Step 5 — Test the real backend

Once the backend terminal says it has started, open another WSL terminal and run:

```bash
curl -i http://localhost:3000/api/v1/health
```

Then:

```bash
curl -i http://localhost:3000/api/v1/competitions
```

The critical difference is that you should **no longer** see:

```text
Set-Cookie: i_like_gitea
```

For competitions, ideally you'll get:

```text
HTTP/1.1 200 OK
```

with JSON.

Even an application-generated database error would actually be progress because it proves you're hitting **your Express backend** rather than Gitea.

---

### Step 6 — Test CORS only after that

Then:

```bash
curl -i \
  -H "Origin: http://localhost:5173" \
  http://localhost:3000/api/v1/competitions
```

You should see:

```text
Access-Control-Allow-Origin: http://localhost:5173
```

Your existing code/config already strongly suggests this will work.

---

### One small repo issue we found

You have both of these in `apps/backend/.env.example`:

```text
CORS_ORIGINS=http://localhost:5173
```

and:

```text
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

but your code only reads:

```ts
environment.CORS_ORIGINS
```

So `CORS_ALLOWED_ORIGINS` appears to be stale documentation/configuration and should probably be removed later. It isn't causing today's error, but leaving contradictory environment-variable names around is exactly the sort of setup/documentation problem worth cleaning before Milestone 1.

## Do this now

Run only these first:

```bash
rm -rf node_modules
rm -rf apps/backend/node_modules
rm -rf apps/frontend/node_modules
rm -rf packages/*/node_modules

npm ci
```

then:

```bash
node -e "require('esbuild'); console.log('esbuild OK')"
```

then:

```bash
npm run dev --workspace=@sport-analytics/backend
```

**Send me the output from that last command.** If it produces `EADDRINUSE`, we'll deal with the Gitea process on port 3000 next.

## Prompt:
8/16/2026, 2:29:45 PM

![fdd529bf-6418-4633-a11e-4587f44282b9.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000fecc81f48c5837cd8c973700&ts=496402&p=fs&cid=1&sig=8720163840c5f6216a2e98f99372a2e91dcf75f23a78eda625d5cc1264e7da87&v=0)

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/backend$ npm run dev

> @sport-analytics/backend@0.1.0 dev
> tsx watch src/index.ts

node:events:487
      throw er; // Unhandled 'error' event
      ^

Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:2009:16)
    at listenInCluster (node:net:2066:12)
    at Server.listen (node:net:2171:7)
    at app.listen (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/express/lib/application.js:635:24)
    at <anonymous> (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/backend/src/index.ts:10:20)
    at Object.<anonymous> (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/backend/src/index.ts:59:2)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object.transformer (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/tsx/dist/register-BcxQ17Jo.cjs:9:3339)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module._load (node:internal/modules/cjs/loader:1396:12)
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:2045:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  code: 'EADDRINUSE',
  errno: -98,
  syscall: 'listen',
  address: '::',
  port: 3000
}

Node.js v24.18.0

## Response:
8/16/2026, 2:29:52 PM

> **Finding the conflicting service**
>
> I’m narrowing the issue to port 3000: the existing service is Gitea, while the backend is trying to use that same port. I’d identify its process, then stop it or reconfigure the backend to another port.
>
> **Found the conflicting service**
>
> 
>
> Worked for 6s

## Recommended outcome

You have now fixed the `esbuild` problem. The remaining problem is clear:

> **Port 3000 is already occupied by another application — and that application appears to be Gitea.**

That is why:

```text
npm run dev
```

fails with:

```text
EADDRINUSE: address already in use :::3000
```

and why the browser keeps getting:

```text
404 Not Found
No Access-Control-Allow-Origin
```

The frontend is still reaching the application occupying port 3000, **not your Sport Analytics backend**.

### 1. Find exactly what owns port 3000

From WSL, run:

```bash
ss -ltnp | grep ':3000'
```

Then also:

```bash
sudo lsof -nP -iTCP:3000 -sTCP:LISTEN
```

If those don't identify it, check the Windows side:

```bash
cmd.exe /c "netstat -ano | findstr :3000"
```

You should get something similar to:

```text
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
```

The final number is the PID.

---

### 2. Identify that PID

Suppose it says PID `12345`.

Run:

```bash
powershell.exe -NoProfile -Command "Get-Process -Id 12345 | Format-List Id,ProcessName,Path"
```

Replace `12345` with your actual PID.

**Send me that output before killing anything.**

There could be something intentional running there, and we don't want to blindly terminate it.

---

## Also check Docker

Because Gitea commonly runs on port `3000`, check whether you've got a Gitea container running:

```bash
docker ps
```

Or more clearly:

```bash
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}"
```

Look for something containing:

```text
3000->3000
```

If you see a Gitea container mapped to port 3000, we've found it.

---

## Why the browser error currently looks like CORS

Your browser says:

```text
Access to fetch at 'http://localhost:3000/api/v1/competitions'
has been blocked by CORS policy
```

But this is misleading in this situation.

Your frontend does:

```text
localhost:5173
        |
        v
localhost:3000/api/v1/competitions
        |
        X
      Gitea
```

Gitea responds:

```text
404 Not Found
```

and doesn't add:

```text
Access-Control-Allow-Origin: http://localhost:5173
```

so Chrome additionally reports a CORS failure.

What we actually need is:

```text
localhost:5173
        |
        v
localhost:3000/api/v1/competitions
        |
        v
Sport Analytics Express backend
        |
        v
200 JSON
```

Your Sport Analytics backend CORS configuration already appears correct:

```env
CORS_ORIGINS=http://localhost:5173
```

So **don't edit CORS right now**.

---

## Two possible solutions

Once we know what's using `3000`, we'll choose one.

### Option A — Free port 3000

This is preferable if the other process is something stale or accidental.

Then:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/backend

npm run dev
```

Your backend should start normally.

Then test:

```bash
curl -i http://localhost:3000/api/v1/health
```

and:

```bash
curl -i http://localhost:3000/api/v1/competitions
```

---

### Option B — Move your backend to port 3001

If port 3000 belongs to something you actually need, we can run the Sport Analytics API on `3001`.

Before doing that, let's verify how your backend port is configured:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  -E "PORT|3000" \
  apps/backend/src apps/backend/.env apps/backend/.env.example
```

We'll probably end up with something like:

```env
PORT=3001
```

and frontend:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Then both backend **and frontend need restarting**.

But don't make that change yet; first let's identify what's holding `3000`.

## Run these now

```bash
ss -ltnp | grep ':3000'
```

```bash
cmd.exe /c "netstat -ano | findstr :3000"
```

```bash
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}"
```

Send me those three outputs. We are now very close — **the backend dependencies are fixed; port 3000 is the blocker.**

## Prompt:
8/16/2026, 2:31:15 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ ss -ltnp | grep ':3000'
LISTEN 0      4096                *:3000            *:*                                         
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ sudo lsof -nP -iTCP:3000 -sTCP:LISTEN
[sudo] password for dean: 
COMMAND PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
gitea   287 root    4u  IPv6   3033      0t0  TCP *:3000 (LISTEN)
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ exit
logout
PS C:\Users\deanf\Downloads\Sport-Analytics-Too> cmd.exe /c "netstat -ano | findstr :3000"^C
PS C:\Users\deanf\Downloads\Sport-Analytics-Too> cmd.exe /c "netstat -ano | findstr :3000"
  TCP    [::1]:3000             [::]:0                 LISTENING       24484
  TCP    [::1]:3000             [::1]:31797            ESTABLISHED     24484
  TCP    [::1]:3000             [::1]:61292            ESTABLISHED     24484
  TCP    [::1]:31797            [::1]:3000             ESTABLISHED     22924
  TCP    [::1]:61292            [::1]:3000             ESTABLISHED     22924
PS C:\Users\deanf\Downloads\Sport-

## Response:
8/16/2026, 2:31:19 PM

## Recommended outcome

We have confirmed the cause: **a local Gitea process inside WSL is occupying port 3000**.

```text
COMMAND PID USER
gitea   287 root
TCP *:3000 (LISTEN)
```

That is exactly why your frontend is getting Gitea's `404` page instead of your Sport Analytics API.

The Windows PID you see is most likely part of WSL's localhost forwarding, so **don't kill the Windows process**. Deal with the actual WSL Gitea service instead.

### 1. Check how Gitea is running

Go back into WSL:

```bash
wsl
```

Then:

```bash
sudo systemctl status gitea
```

If that shows a Gitea service, and you do **not** intentionally need a local Gitea server, stop it:

```bash
sudo systemctl stop gitea
```

Then confirm port 3000 is free:

```bash
sudo lsof -nP -iTCP:3000 -sTCP:LISTEN
```

You want **no output**.

If `systemctl` says the service does not exist, try:

```bash
sudo service gitea stop
```

and check again:

```bash
ss -ltnp | grep ':3000'
```

---

### 2. Prevent Gitea from taking port 3000 again

Only do this if you genuinely don't use this local Gitea installation:

```bash
sudo systemctl disable gitea
```

That prevents it from automatically starting when WSL boots.

This does **not** affect the university's remote Gitea at:

```text
sdp.ms.wits.ac.za
```

It only affects the Gitea installation running locally inside your WSL instance.

---

### 3. Start your actual backend

Once port 3000 is free:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/backend

npm run dev
```

You should now **not** get:

```text
EADDRINUSE
```

Leave this terminal running.

---

### 4. Test the backend in another terminal

Open a second WSL terminal:

```bash
curl -i http://localhost:3000/api/v1/health
```

Then:

```bash
curl -i http://localhost:3000/api/v1/competitions
```

For `/competitions`, we want something like:

```text
HTTP/1.1 200 OK
Content-Type: application/json
```

Most importantly, you should **not** see:

```text
Set-Cookie: i_like_gitea
```

anymore.

---

### 5. Test CORS

Then:

```bash
curl -i \
  -H "Origin: http://localhost:5173" \
  http://localhost:3000/api/v1/competitions
```

Look for:

```text
Access-Control-Allow-Origin: http://localhost:5173
```

Your existing backend config already says:

```env
CORS_ORIGINS=http://localhost:5173
```

so I expect this part to work once requests actually reach Express.

---

### 6. Refresh the frontend

Once the backend is running, refresh:

```text
http://localhost:5173
```

The current browser errors:

```text
404 (Not Found)
blocked by CORS policy
```

should disappear if the API responds successfully.

### Your situation was essentially this

```text
Before

React :5173
    │
    ▼
localhost:3000
    │
    ▼
Local Gitea ❌
    │
    └── 404

After

React :5173
    │
    ▼
localhost:3000
    │
    ▼
Sport Analytics Express API ✅
    │
    ▼
PostgreSQL / application services
```

Run this now:

```bash
sudo systemctl stop gitea
sudo lsof -nP -iTCP:3000 -sTCP:LISTEN
```

If the second command returns nothing, start:

```bash
npm run dev --workspace=@sport-analytics/backend
```

Then send me **the backend startup output plus the result of**:

```bash
curl -i http://localhost:3000/api/v1/competitions
```

## Prompt:
8/16/2026, 2:32:50 PM

would restarting my pc solve the problem?

## Response:
8/16/2026, 2:32:50 PM

It might temporarily, but **probably not permanently**.

Your local WSL Gitea service is listening on port `3000`. If Gitea is configured to start automatically when WSL/systemd starts, then after a PC restart it will likely come back and occupy port `3000` again.

The proper fix is:

```bash
sudo systemctl stop gitea
```

Then, if you do not need that local Gitea instance:

```bash
sudo systemctl disable gitea
```

After that, verify:

```bash
sudo lsof -nP -iTCP:3000 -sTCP:LISTEN
```

If it prints nothing, start your backend:

```bash
npm run dev --workspace=@sport-analytics/backend
```

So: **restart = maybe a temporary reset; stopping/disabling local Gitea = actual fix.**

## Prompt:
8/16/2026, 2:33:26 PM

what is the actual problm, giveme words

## Response:
8/16/2026, 2:33:27 PM

The actual problem is:

**A local Gitea server is already using port `3000`, which is the same port your Sport Analytics backend is trying to use.**

Because of that:

- your backend cannot start and gives `EADDRINUSE`
- the frontend sends API requests to `localhost:3000`
- those requests go to **Gitea instead of your backend**
- Gitea does not have `/api/v1/competitions`, so it returns `404`
- the browser then also reports a CORS error because that Gitea response does not allow requests from `localhost:5173`

So the core issue is **a port conflict: Gitea is occupying port 3000 and blocking the backend.**



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)