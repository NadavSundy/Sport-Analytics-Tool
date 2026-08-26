# Sprint 1 Retrospective Message

**User:** Anonymous  
**Created:** 8/25/2026 11:56:43  
**Updated:** 8/25/2026 12:06:44  
**Exported:** 8/26/2026 21:15:37  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a8d66d5-8534-83ea-b416-e718ac75d511](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a8d66d5-8534-83ea-b416-e718ac75d511)  

## Prompt:
8/25/2026, 11:56:38 AM

uhm guys, i think we were meant to do retrospective b4 we get marked. apparently our methodology doesnt need it to be ameeeting, can everyone wuickl send a whatsapp with
one thing that worked well;
one thing that was difficult;
one thing we should improve in Sprint 2.

## Response:
8/25/2026, 11:56:41 AM

Yes - do an **asynchronous Sprint 1 retrospective now**. The brief requires evidence that your project methodology is actually being used, but it does **not** state that the retrospective has to be a formal meeting. For Milestone 1, “Project Methodology” is worth 10%, with the Advanced level requiring a *used methodology with evidence* and motivation. 

I’d send this to the group:

> Uhm guys, I think we were meant to do a Sprint 1 retrospective before we get marked 😭  
>
> Apparently it doesn’t need to be an actual meeting, so can everyone quickly reply here with:
>
> - **One thing that worked well during Sprint 1**
> - **One thing that was difficult / didn’t work well**
> - **One thing we should improve or change for Sprint 2**
>
> Just a sentence or two for each is fine. I’ll put everyone’s responses together as evidence for our methodology.

Then **don’t leave it only in WhatsApp**. Once everyone replies, put the responses into something like:

`docs/project-management/retrospectives/sprint-1-retrospective.md`

Include the date, participants who responded, the three categories, and most importantly a small **Sprint 2 Actions** section such as “Improve task sizing”, “Review PRs earlier”, etc. Only record actions that genuinely come from the team’s responses.

That gives you much stronger evidence that you are **actively following the methodology**, which becomes another 10% criterion in Milestone 2. `project_briefs (4).pdf`

**Before marking:** get everyone’s responses → save screenshots/export if appropriate → create the retrospective `.md` → commit it → link it from your methodology/project-management docs.

## Prompt:
8/25/2026, 11:57:38 AM

make a retro for me

## Response:
8/25/2026, 11:57:44 AM

> **Drafting personal retro**
>
> I’m treating this as a concise first-person retrospective. I’ll cover what worked, what was difficult, and concrete improvements for the next sprint without inventing unverified team feedback or results.
>
> **Drafted personal retro**
>
> 
>
> Worked for 7s

Here’s a **personal Sprint 1 retrospective** you can send to the group. I’ve kept it based on work you actually encountered rather than inventing team feedback.

**chat_message: **

**Sprint 1 Retro - Dean**

**What worked well:**  
I think our use of Git, issues and PRs worked well overall. We managed to get a lot of the foundations in place early, including the frontend/backend structure, authentication and authorisation work, database setup, API work, testing and deployment foundations.

**What was difficult:**  
The biggest difficulty for me was getting all the different environments and services to work consistently together. We had quite a few issues with local ports, CORS, Supabase configuration, environment variables and Azure deployment, which took longer to debug than expected.

**What we should improve in Sprint 2:**  
We should make our environment and deployment configuration more consistent and document it better so we don’t repeatedly lose time debugging setup problems. I also think we should test integration and deployment earlier when completing features, rather than only finding those problems after the implementation is mostly finished.

That last point is especially useful for Sprint 2 because the rubric starts heavily rewarding **core features, automated testing, externally available API functionality, stakeholder reviews, user feedback, and active methodology use**. `project_briefs (4).pdf`

## Prompt:
8/25/2026, 11:58:50 AM

**Sprint 1 Retro – Dean**

**What worked well:**
I think our use of Git, issues and PRs worked well overall. We managed to get a lot of the foundations in place early, including the frontend/backend structure, authentication and authorisation work, database setup, API work, testing and deployment foundations.

**What was difficult:**
The biggest difficulty for me was getting all the different environments and services to work consistently together. We had quite a few issues with local ports, CORS, Supabase configuration, environment variables and Azure deployment, which took longer to debug than expected. CI/CD 

**What we should improve in Sprint 2:**
We should make our environment and deployment configuration more consistent and document it better so we don’t repeatedly lose time debugging setup problems. I also think we should test integration and deployment earlier when completing features, rather than only finding those problems after the implementation is mostly finished.

make it very detailed 
here is the repo so you can analyse

[Attachment: Sport-Analytics-Tool-main (8).zip]

## Response:
8/25/2026, 11:58:53 AM

> **Inspecting repository archive contents**
>
>
> **Structuring the retrospective**
>
> I’m grounding this in Sprint 1 evidence through August 24, focusing on delivery, CI/CD complexity, local setup friction, and actionable improvements without overstating individual issues.
>
> **Structured the retrospective**
>
> 
>
> **Inspected repository documentation, workflows, evidence, tests, migrations, and contributions**
>
> 
>
> Worked for 1m 3s

I analysed the repository and expanded this around things there is actual evidence for: the Scrumban/Gitea process, Sprint 1 planning, authentication/authorisation, event-derived statistics, database work, automated tests, Azure deployment, CI/CD, Supabase configuration, WSL/local-port problems, documentation, and deployment smoke checks. I’d use this version because it is detailed **without inventing achievements or problems**.

**chat_message: **

**Sprint 1 Retro - Dean**

**What worked well:**

I think one of the strongest parts of Sprint 1 was the way we used Git, Gitea issues, branches and PRs to organise and track a large amount of work. We had a documented Git methodology and project methodology rather than just working informally, and most meaningful pieces of work were connected to issues with acceptance criteria, branches, PRs, testing and supporting documentation. This made it much easier to understand what was being worked on, what was blocked, what depended on something else, and what still needed to be completed before the milestone.

I also think we did well at establishing a fairly strong technical foundation early instead of building everything into one application and trying to separate it later. We ended Sprint 1 with a clearly separated React frontend and Express backend, shared API contracts, a PostgreSQL database, Supabase authentication, a handwritten HTTP API, external API integration, documentation infrastructure and Azure deployment infrastructure. The repository structure is also quite organised, with separate areas for the frontend, backend, database, contracts, infrastructure, documentation, automated tests and project evidence.

A major positive for me was how much of the Basic vertical slice started working together. We worked through authentication and application-level authorisation, including the viewer, submitter and admin roles, submitter-access requests and administrator management. We also established the submission and event-data foundations, public read APIs and event-derived fixture statistics. This was important because event-derived statistics are one of the central requirements of our actual Sport Analytics project rather than just a supporting feature.

Testing also improved a lot during the sprint. We did not only rely on manually clicking through the application. By the end of Sprint 1 the repository contained backend unit tests, API tests, database integration tests, frontend component tests, end-to-end Playwright tests, accessibility checks, contract tests and deployment smoke-check tests. We also developed a much stronger central quality gate through commands such as linting, formatting checks, type-checking, OpenAPI validation, builds and automated tests. That gives us a much better foundation for Sprint 2 because new features can be checked against existing behaviour instead of us constantly discovering regressions manually.

I also think our documentation and evidence collection improved significantly as the sprint progressed. We now have documentation covering areas such as architecture, API design, database design, authentication and security, deployment, setup, testing, technology choices, Git methodology and project methodology. We also kept stakeholder meeting notes, stand-ups, architecture decisions, validation evidence and AI-use records. This gives us much better traceability between what we planned, what we implemented and how we verified it.

---

**What was difficult:**

The biggest difficulty for me was getting all of the different environments, services and deployment components to behave consistently together. Individually, the frontend, backend, database, authentication provider and Azure deployment were manageable, but integrating all of them exposed a lot of configuration problems that were sometimes difficult to diagnose because the visible browser error was not necessarily the real underlying problem.

A good example was local frontend/backend communication. We spent time investigating what initially looked like CORS or backend routing problems, but one of the actual causes was that Gitea was already listening on port `3000`. Requests that we thought were reaching the Sport Analytics backend were therefore sometimes reaching Gitea instead. That produced confusing 404 responses and CORS symptoms and made debugging authentication and API requests harder than it needed to be. Once we inspected the processes and actual HTTP responses, the problem became much clearer, but it showed that our local environment assumptions were not sufficiently standardised.

Supabase configuration was another source of difficulty. We had to keep the frontend authentication configuration, backend token verification, Supabase project URLs, publishable keys, redirect URLs, CORS configuration and deployed Azure environment variables aligned. Small differences between local and deployed configuration could cause authentication to succeed in one environment but fail in another. We also had to correct assumptions around Supabase keys and ensure that sensitive or elevated credentials were not unnecessarily required by the backend.

WSL and dependency differences also cost time. There were problems with platform-specific optional dependencies such as Rollup/esbuild when working between Windows and WSL. These were not really application-code bugs, but they still prevented the frontend or development environment from starting and therefore interrupted implementation and verification work.

The database testing environment was another challenge. A lot of our backend behaviour depends on PostgreSQL, so simple mocked unit tests were not enough for many important workflows. We had to get migrations, test resets, seed data and database integration tests running reproducibly. There were points where the expected local PostgreSQL instance or Docker environment was unavailable, which meant a change could pass the normal non-database checks while database verification was still blocked. We eventually improved this with more reproducible PostgreSQL test tooling, but it took a significant amount of debugging during the sprint.

**CI/CD was probably the most difficult technical/process area for me.** Getting CI/CD working properly was much more complicated than simply adding a workflow file. Because the repository is a monorepo, the workflows had to correctly install root dependencies, understand the frontend, backend and shared-contract workspaces, build shared contracts before dependent applications, run the correct tests, and avoid assumptions from the repository's earlier structure.

The main CI workflow also had to create a PostgreSQL test service, reset and migrate the database, seed it, run the repository quality checks, execute database integration tests, install Playwright, run browser/accessibility tests and produce coverage. A failure at any one of those layers could prevent the entire pipeline from passing, so diagnosing CI failures sometimes required determining whether the problem came from our application, database state, dependencies, environment configuration or the CI environment itself.

Deployment added another layer of difficulty. The frontend and backend required separate Azure deployment workflows. The workflows needed correct path triggers, workspace-specific lint/typecheck/test/build commands, secure Gitea secrets and environment variables, and appropriate deployment artifacts. The backend was particularly sensitive because the deployed artifact had to contain its runtime dependencies and shared contracts correctly rather than only working from the development monorepo.

We also found that a workflow reporting a successful deployment was not enough evidence that the application actually worked. We therefore had to add deployed smoke checks. For the backend, that includes checking the health endpoint and then making a database-backed API request; for the frontend, it includes confirming that the deployed site returns the expected application content. This was an important improvement, but it came after we had already spent substantial time diagnosing deployment failures manually.

Another difficulty was the amount of dependency management between issues. For example, account roles and account synchronisation affected submitter-access requests; submitter approval affected authorised submissions; the event schema and database model affected submissions; and event persistence affected statistics and public APIs. Sometimes work appeared ready based on an individual issue but was still dependent on another feature or migration being merged. Merge conflicts also became more common as several people changed shared files such as documentation, contracts, tests and evidence registers.

Overall, a lot of Sprint 1 difficulty came not from implementing one isolated algorithm, but from **integration**: making the frontend, backend, authentication, database, shared contracts, tests, CI and Azure deployment all agree with each other.

---

**What we should improve in Sprint 2:**

The main improvement I think we should make in Sprint 2 is to treat **integration and deployment readiness as part of completing a feature, rather than something that happens near the end of the sprint**.

For Sprint 1, we sometimes reached a point where a feature worked in its immediate development environment, but problems only appeared later when it interacted with another workspace, the real database, authentication, CI or Azure. That meant we spent quite a lot of time near the end of the sprint doing integration and deployment debugging when we were also trying to prepare for the milestone.

For Sprint 2, I think we should make our environments much more predictable. We should have one clearly documented source of truth for the frontend URL/port, backend URL/port, database configuration, Supabase configuration and deployed URLs. `.env.example` files and setup documentation should remain synchronised with the actual application, and when configuration changes, the documentation should be updated in the same PR instead of later. This should reduce situations where two developers are running slightly different local configurations without realising it.

I also think every substantial feature should be tested through the full relevant path before it is considered done. For example, an authenticated feature should not only pass a service-level unit test; we should also confirm the API authentication/authorisation path and, where appropriate, the frontend flow. Database-dependent features should have database integration coverage. User-facing features should be checked for responsive behaviour and accessibility. Anything affecting deployment should be verified in the deployed development environment using automated smoke checks where possible.

Our Definition of Done already includes implementation, tests, CI, review and documentation. In Sprint 2 we should apply that more strictly and make deployment/integration verification explicit when it is relevant. Ideally, before a PR is merged, the developer should be able to answer:

- Does the feature meet its acceptance criteria?
- Do the relevant unit/API/database/frontend tests pass?
- Does the repository quality gate pass?
- Has another team member reviewed it?
- Have documentation and API contracts been updated where needed?
- Have security, error handling, responsiveness and accessibility been considered?
- Does it still work when integrated with the real frontend/backend/database/authentication boundary?
- If it affects the deployed application, has the deployment and smoke check passed?

I also think we should try to keep PRs smaller and integrate them earlier. Several Sprint 1 tasks touched common files and created conflicts or complicated dependency chains. Smaller PRs that are merged sooner should reduce the amount of time spent resolving conflicts and make failures easier to trace back to a particular change.

Finally, when we discover a recurring environment or deployment problem, we should try to fix the underlying process rather than only solving it on one person's machine. If we solve a port conflict, dependency problem, database setup issue or Azure packaging issue, the solution should become a script, automated check, `.env.example` change or documented setup step where possible. That way the debugging effort improves the project for everyone instead of needing to be repeated.

So my main Sprint 2 improvement would be: **shift integration, CI and deployment verification earlier into normal feature development, and make our environment configuration more standardised and reproducible.** That should reduce late-sprint debugging, make our Definition of Done more meaningful, and leave us more time in Sprint 2 for the actual core features, external API functionality, automated testing and stakeholder/user feedback rather than repeatedly fixing setup and deployment issues.

This also fits your documented methodology particularly well: your repository explicitly says the Sprint close-out should cover **what worked well, what caused difficulty, and one improvement for the next sprint**, and that the agreed improvement should then be reviewed during the following sprint. So I’d make the bolded final sentence your **official Sprint 2 improvement/action**, rather than recording ten unrelated retrospective actions. `project_briefs (4).pdf`

## Prompt:
8/25/2026, 12:06:35 PM

shorter

## Response:
8/25/2026, 12:06:38 PM

**chat_message: **

**Sprint 1 Retro – Dean**

**What worked well:**  
Our use of Git, issues and PRs worked well. We also established a strong foundation with the frontend/backend structure, authentication and authorisation, database, API, testing and deployment.

**What was difficult:**  
Getting the different environments and services working together was difficult. We had issues with ports, CORS, Supabase configuration, environment variables, Azure deployment and CI/CD, which took significant time to debug.

**What we should improve in Sprint 2:**  
We should standardise and better document our environment and deployment configuration. We should also test integration, CI/CD and deployment earlier so problems are found during development rather than near the end of the sprint.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)