# Create A Release

**User:** Anonymous  
**Created:** 8/24/2026 17:15:46  
**Updated:** 8/24/2026 17:16:19  
**Exported:** 8/26/2026 21:15:27  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a8c601d-5330-83ea-87ed-d7257fa414db](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a8c601d-5330-83ea-87ed-d7257fa414db)  

## Prompt:
8/24/2026, 5:15:44 PM

how to make a release

## Response:
8/24/2026, 5:15:45 PM

> **Creating a release**
>
> I’m outlining the standard Gitea workflow: verify the committed project on `main`, create and push a version tag, then publish a release from that tag in the repository interface.
>
> **Created a release**
>
> 
>
> Worked for 15s

**Recommended outcome:** create a tagged **Milestone 1 pre-release from `main`**, e.g. `v0.1.0-m1`. This gives you a permanent snapshot of exactly what existed at the milestone and is useful project evidence.

From the root of your repository:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

git switch main
git pull origin main

git status
```

Make sure `git status` says your working tree is clean. Then, ideally run your normal verification first:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use whatever subset actually exists in your repo-don't invent scripts just for the release.

### 1. Create the release tag

For Milestone 1, I would use:

```bash
git tag -a v0.1.0-m1 -m "Milestone 1 release"
```

Check it:

```bash
git show v0.1.0-m1
```

Then push the tag:

```bash
git push origin v0.1.0-m1
```

### 2. Create the Release in Gitea

Go to your repository:

**Sport-Analytics-Tool → Releases → New Release**

Then set:

- **Tag:** `v0.1.0-m1`
- **Target:** `main`
- **Release title:** `Milestone 1 - Foundations`
- **Draft:** No
- **Pre-release:** Yes

Because this is not the finished market-ready product, marking it as a pre-release is appropriate. The official brief describes Milestone 1 as project setup, removing major blockers, and establishing direction, whereas the final submission is where the project should fully work and work well. `project_briefs (4).pdf`

### 3. Put useful evidence in the release notes

Something along these lines is enough:

```markdown
# Milestone 1 - Foundations

Release snapshot for COMS3011A Milestone 1.

## Included

- Frontend and backend project structure
- Database foundations
- Authentication foundations
- Hand-written HTTP API foundations
- Public documentation
- CI/CD configuration
- Git and project methodology documentation
- Architecture and database design
- Initial automated testing
- Initial Sport Analytics event-data implementation
- Azure deployment foundations

## Verification

- Main branch used as release source
- Automated test suite executed
- Lint/type checking executed
- Build verified
- Deployment status checked

## Known Issues

See the repository issue tracker for outstanding work planned for Milestone 2.

## Source

Tag: `v0.1.0-m1`
Branch: `main`
```

Don't claim any verification item unless you actually ran it.

### 4. Record the exact release commit

Run:

```bash
git rev-parse v0.1.0-m1
```

Save that SHA in your milestone evidence. You can also check:

```bash
git log -1 --oneline v0.1.0-m1
```

That gives you defensible evidence that **the marker can reproduce the exact repository state you submitted**.

### 5. Important project point

A release is **excellent evidence**, but it does **not replace deployment**. Your brief separately requires CI/CD, a public documentation website, a separate frontend/backend, a hand-written HTTP API, authentication, external integration, etc. `project_briefs (4).pdf`

Also, your Sport Analytics brief specifically moves toward **versioned dataset releases with schemas and checksums** at Intermediate tier. That's a different concept from a **Git/Gitea software release**, so don't confuse the two in your documentation. `sport_analytics (1).pdf`

**For tomorrow's Milestone 1 release, I'd use `v0.1.0-m1`, create it from the latest tested `main`, publish it as a pre-release, and preserve the tag + commit SHA as evidence.**



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)