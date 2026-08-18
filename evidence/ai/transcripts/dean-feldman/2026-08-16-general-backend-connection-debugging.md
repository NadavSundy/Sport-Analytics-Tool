# Backend connection issue

**User:** Anonymous  
**Created:** 8/16/2026 20:12:49  
**Updated:** 8/16/2026 20:13:35  
**Exported:** 8/18/2026 12:26:03  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a81fd9d-cc88-83ea-860e-755744a28852](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a81fd9d-cc88-83ea-860e-755744a28852)  

## Prompt:
8/16/2026, 8:12:50 PM

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
chunk-SQIELOP7.js?v=722cf687:21551 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
public-read.ts:57  GET http://localhost:3001/api/v1/competitions net::ERR_CONNECTION_REFUSED
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

## Response:
8/16/2026, 8:12:49 PM

## Recommended outcome

Your **frontend is running**, but it cannot connect to the backend.

The important error is:

```text
GET http://localhost:3001/api/v1/competitions
net::ERR_CONNECTION_REFUSED
```

This is **not a CORS problem**. `ERR_CONNECTION_REFUSED` means there is currently **nothing accepting connections on port `3001`**, or your backend is running on a different port.

The other messages:

```text
Env key MODE not found...
[AssignmentCache] no LMS adapter active...
Download the React DevTools...
```

are not causing this problem.

### 1. Check whether anything is running on port 3001

In WSL:

```bash
ss -ltnp | grep ':3001'
```

Then:

```bash
curl -i http://localhost:3001/api/v1/competitions
```

If you get:

```text
curl: (7) Failed to connect to localhost port 3001
```

your backend is not running.

### 2. Start the backend

From the project root, try:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
npm run dev --workspace=@sport-analytics/backend
```

Keep that terminal open.

You should see something indicating that the API is listening, ideally on:

```text
http://localhost:3001
```

Then, in a **second terminal**, run the frontend:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
npm run dev --workspace=@sport-analytics/frontend
```

### 3. If the backend immediately crashes

That is probably the actual underlying problem.

Copy the **entire backend terminal output** after running:

```bash
npm run dev --workspace=@sport-analytics/backend
```

and send it to me.

Common causes in your project would be missing/incorrect values in:

```text
apps/backend/.env
```

particularly things such as:

```env
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
CORS_ORIGINS=http://localhost:5173
```

Do **not** post the actual secret values here.

### 4. Confirm frontend configuration

Check:

```bash
cat apps/frontend/.env
```

You should have something equivalent to:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Then check what the backend itself expects:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  -E "PORT|3001" \
  apps/backend/src apps/backend/.env apps/backend/.env.example
```

If the backend is actually configured for a different port, then the frontend URL needs to match it.

### What the error means in plain English

Your frontend executes:

```text
public-read.ts:57
    ↓
GET /api/v1/competitions
    ↓
http://localhost:3001
    ↓
nothing is listening there
    ↓
ERR_CONNECTION_REFUSED
```

So **don't change CORS code yet**. First establish that the API itself works:

```bash
curl -i http://localhost:3001/api/v1/competitions
```

For the project, this matters directly because the Sport Analytics brief requires the API to expose fixture/event/statistical data as a core product, and later rubric marks specifically depend on API availability and deployment. `sport_analytics (1).pdf` `project_briefs (4).pdf`

**Next action:** run this and send me exactly what it prints:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
npm run dev --workspace=@sport-analytics/backend
```



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)