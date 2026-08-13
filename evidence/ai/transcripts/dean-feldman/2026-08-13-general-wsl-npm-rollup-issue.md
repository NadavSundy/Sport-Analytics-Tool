# WSL npm Rollup Issue

**User:** Anonymous  
**Created:** 8/13/2026 16:51:49  
**Updated:** 8/13/2026 17:00:50  
**Exported:** 8/13/2026 17:09:08  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a7dda01-5018-83ea-a0b9-c42c11716893](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a7dda01-5018-83ea-a0b9-c42c11716893)  

## Prompt:
8/13/2026, 4:51:45 PM

PS C:\Users\deanf\Downloads\Sport-Analytics-Tool> wsl 
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cd apps/frontend/ 
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ npm run dev 
 
> @sport-analytics/frontend@0.1.0 dev 
> vite 
 
/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:121 
                throw new Error( 
                      ^ 
 
Error: Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory. 
    at requireWithFriendlyError (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:121:9) 
    at Object.<anonymous> (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:130:76) 
    at Module._compile (node:internal/modules/cjs/loader:1871:14) 
    at Object..js (node:internal/modules/cjs/loader:2002:10) 
    at Module.load (node:internal/modules/cjs/loader:1594:32) 
    at Module._load (node:internal/modules/cjs/loader:1396:12) 
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19) 
    at loadCJSModuleWithModuleLoad (node:internal/modules/esm/translators:372:15) 
    at ModuleWrap.<anonymous> (node:internal/modules/esm/translators:244:9) 
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25) { 
  [cause]: Error: Cannot find module '@rollup/rollup-linux-x64-gnu' 
  Require stack: 
  - /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js 
      at Module._resolveFilename (node:internal/modules/cjs/loader:1517:15) 
      at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27) 
      at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1095:10) 
      at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1122:12) 
      at Module._load (node:internal/modules/cjs/loader:1294:5) 
      at wrapModuleLoad (node:internal/modules/cjs/loader:255:19) 
      at Module.require (node:internal/modules/cjs/loader:1617:12) 
      at require (node:internal/modules/helpers:153:16) 
      at requireWithFriendlyError (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:103:10) 
      at Object.<anonymous> (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:130:76) { 
    code: 'MODULE_NOT_FOUND', 
    requireStack: [ 
      '/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js' 
    ] 
  } 
} 
 
Node.js v24.18.0 
npm error Lifecycle script `dev` failed with error: 
npm error code 1 
npm error path /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend 
npm error workspace @sport-analytics/frontend@0.1.0 
npm error location /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend 
npm error command failed 
npm error command sh -c vite 
npm notice 
npm notice New major version of npm available! 11.16.0 -> 12.0.2 
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.0.2 
npm notice To update run: npm install -g npm@12.0.2 
npm notice 
dean@Leonard:/mnt/c/Users/deanf/PS C:\Users\deanf\Downloads\Sport-Analytics-Tool> wsl
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cd apps/frontend/
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend$ npm run dev

> @sport-analytics/frontend@0.1.0 dev
> vite

/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:121
                throw new Error(
                      ^

Error: Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.
    at requireWithFriendlyError (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:121:9)
    at Object.<anonymous> (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:130:76)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module._load (node:internal/modules/cjs/loader:1396:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at loadCJSModuleWithModuleLoad (node:internal/modules/esm/translators:372:15)
    at ModuleWrap.<anonymous> (node:internal/modules/esm/translators:244:9)
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25) {
  [cause]: Error: Cannot find module '@rollup/rollup-linux-x64-gnu'
  Require stack:
  - /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js
      at Module._resolveFilename (node:internal/modules/cjs/loader:1517:15)
      at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27)
      at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1095:10)
      at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1122:12)
      at Module._load (node:internal/modules/cjs/loader:1294:5)
      at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
      at Module.require (node:internal/modules/cjs/loader:1617:12)
      at require (node:internal/modules/helpers:153:16)
      at requireWithFriendlyError (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:103:10)
      at Object.<anonymous> (/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js:130:76) {
    code: 'MODULE_NOT_FOUND',
    requireStack: [
      '/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/node_modules/rollup/dist/native.js'
    ]
  }
}

Node.js v24.18.0
npm error Lifecycle script `dev` failed with error:
npm error code 1
npm error path /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend
npm error workspace @sport-analytics/frontend@0.1.0
npm error location /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool/apps/frontend
npm error command failed
npm error command sh -c vite
npm notice
npm notice New major version of npm available! 11.16.0 -> 12.0.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.0.2
npm notice To update run: npm install -g npm@12.0.2
npm notice
dean@Leonard:/mnt/c/Users/deanf/

## Response:
8/13/2026, 4:51:48 PM

> **Fixing WSL dependencies**
>
> I’m identifying a cross-platform install issue: Windows-created dependencies are being reused inside WSL, but Linux’s optional Rollup package is missing. I’ll recommend reinstalling dependencies within WSL while preserving the lockfile initially.
>
> **Fixed WSL dependencies**
>
> 
>
> **Troubleshot Git push failure in Docker container**
>
> 
>
> **Searching the web**
>
> [[BUG] Platform-specific optional dependencies not being included in `package-lock.json` when reinstalling with `node_modules` present · Issue #4828 · npm/cli · GitHub](https://github.com/npm/cli/issues/4828)
>
> **Aligning the environment**
>
> I’m treating this as a reproducibility issue rather than an application bug. I’ll separate the immediate reinstall from a follow-up check of Node-version alignment and CI documentation so local and deployed builds behave consistently.
>
> **Aligned the environment**
>
> 
>
> **Searched 1 website**
>
> 
>
> Worked for 1m 12s

**Recommended outcome:** rebuild `node_modules` inside WSL. Your current dependencies are almost certainly contaminated by a Windows install, so Vite/Rollup is looking for the Linux native Rollup package but your shared `node_modules` does not contain it.

The key error is:

```text
Cannot find module @rollup/rollup-linux-x64-gnu
```

This is a known npm optional-dependency problem, especially when a lockfile/install has been produced on one platform and then reused on another. ([GitHub](https://github.com/npm/cli/issues/4828?utm_source=chatgpt.com))

### 1. Go back to the repository root

You are currently in `apps/frontend`. Run:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
```

First confirm what Rollup packages you currently have:

```bash
ls node_modules/@rollup 2>/dev/null || true
```

If you see something like:

```text
rollup-win32-x64-msvc
```

but not:

```text
rollup-linux-x64-gnu
```

that confirms the Windows/WSL mismatch.

### 2. Do the safe fix first

Do **not delete `package-lock.json` yet**.

From the repo root:

```bash
rm -rf node_modules

find apps packages \
  -type d -name node_modules \
  -prune -exec rm -rf {} + 2>/dev/null || true
```

Then reinstall entirely from WSL:

```bash
npm install --include=optional
```

Now confirm Linux Rollup exists:

```bash
ls node_modules/@rollup
```

You should now see:

```text
rollup-linux-x64-gnu
```

Then start the frontend:

```bash
npm run dev --workspace=@sport-analytics/frontend
```

or:

```bash
cd apps/frontend
npm run dev
```

### 3. If it still gives the exact same Rollup error

Then your **`package-lock.json` itself is probably missing the Linux optional dependency**.

Check:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

grep -n "rollup-linux-x64-gnu" package-lock.json | head
```

If nothing is returned, do the full reset npm/Rollup is recommending. The underlying npm issue specifically describes deleting both `node_modules` and the lockfile before reinstalling as the clean recovery when platform-specific optional dependencies have been omitted. ([GitHub](https://github.com/npm/cli/issues/4828?utm_source=chatgpt.com))

First protect the current lockfile:

```bash
cp package-lock.json /tmp/package-lock.before-rollup-fix.json
```

Then:

```bash
rm -rf node_modules
rm package-lock.json

npm install
```

Check:

```bash
grep -n "rollup-linux-x64-gnu" package-lock.json | head
ls node_modules/@rollup
```

Then:

```bash
npm run dev --workspace=@sport-analytics/frontend
```

### 4. Before committing anything

Because deleting and regenerating `package-lock.json` can change dependency resolution, check the diff:

```bash
git status
git diff --stat
git diff -- package-lock.json
```

**Do not automatically commit a giant regenerated lockfile.** If it has hundreds/thousands of unrelated dependency changes, show me the output first.

Also check your Node configuration:

```bash
node -v
npm -v

grep -n '"engines"' package.json
cat .nvmrc 2>/dev/null || true
```

You're currently running:

```text
Node.js v24.18.0
```

We should make sure that matches the version your project and CI/deployment are supposed to use rather than creating another local-vs-production difference.

### Important going forward

Don't run `npm install` once from **Windows PowerShell** and then reuse that exact `node_modules` from **WSL**. Packages such as Rollup, esbuild and SWC have OS-specific native dependencies, which makes a shared Windows/Linux `node_modules` unreliable. The npm issue documents exactly this class of platform-specific optional dependency failure. ([GitHub](https://github.com/npm/cli/issues/4828?utm_source=chatgpt.com))

For this project, pick one development environment-I'd use **WSL consistently**-and perform `npm install`, builds, tests and dev-server commands there.

This also supports the project's requirements for reliable setup documentation and CI/CD; the official brief explicitly requires CI/CD and gives marks for getting-started/dev guides. `project_briefs (4).pdf`

**Do this now:**

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

rm -rf node_modules

find apps packages \
  -type d -name node_modules \
  -prune -exec rm -rf {} + 2>/dev/null || true

npm install --include=optional

ls node_modules/@rollup

npm run dev --workspace=@sport-analytics/frontend
```

Send me the output starting from `npm install --include=optional` if it fails; **don't delete the lockfile until we see whether this first fix works.**

---

**Sources:**

- [[BUG] Platform-specific optional dependencies not being included in `package-lock.json` when reinstalling with `node_modules` present · Issue #4828 · npm/cli · GitHub](https://github.com/npm/cli/issues/4828?utm_source=chatgpt.com)



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)