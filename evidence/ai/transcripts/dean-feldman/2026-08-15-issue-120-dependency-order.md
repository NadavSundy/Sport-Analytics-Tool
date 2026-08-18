# Dependency Order for #120

**User:** Anonymous  
**Created:** 8/15/2026 13:31:25  
**Updated:** 8/15/2026 14:08:02  
**Exported:** 8/18/2026 12:23:45  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a804e06-1cdc-83ea-ad70-c752dd6288c3](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a804e06-1cdc-83ea-ad70-c752dd6288c3)  

## Prompt:
8/15/2026, 1:31:21 PM

[Issues](https://sdp.ms.wits.ac.za/issues)[Pull Requests](https://sdp.ms.wits.ac.za/pulls)[Milestones](https://sdp.ms.wits.ac.za/milestones)[Explore](https://sdp.ms.wits.ac.za/explore/repos)

[**git-push-pray**](https://sdp.ms.wits.ac.za/git-push-pray)**/**[**Sport-Analytics-Tool**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool)

**Internal**

[Code](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/)[**Issues29**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues)[Pull Requests](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[Actions](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[**1**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[Packages](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/packages)[Projects](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[**1**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[Releases](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/releases)[Wiki](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/wiki)[Activity](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/activity)[Settings](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/settings)

# Implement the submitter access request workflow #120

**Open**

opened 3 days ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [3 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120#issue-299)

**Member**

## Description

Implement the workflow that allows an authenticated user who is not currently an approved submitter to request permission to submit cricket event data.

The request must be persisted and its current state exposed so that the user can see whether their request is pending, approved, rejected or revoked.

Administrator review, approval and scope assignment are handled separately by [#45](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/45).

## Motivation

The client requires the following login flow:

```
user signs in
        ↓
application checks submitter status
        ↓
not approved
        ↓
user requests submitter access
        ↓
request becomes pending
        ↓
administrator reviews request through #45
        ↓
approved user gains access to submission functionality

```

## Implementation Tracking

This feature has been split into smaller implementation issues so that the work can be reviewed and merged independently.

- [#129](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/129) — Persist submitter access requests and implement request endpoint
- [#130](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/130) — Expose submitter/request status through the current-user API
- [#131](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/131) — Build submitter access request and status UI

## Integration

This workflow integrates with:

- [#43](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43) — Application account, role, approved-submitter and scope database schema
- [#44](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/44) — Account synchronisation, profile API and role-based authorisation
- [#45](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/45) — Administrator submitter approval and scope management
- [#53](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/53) — Approved-submitter event upload and validation-results interface

## Feature Acceptance Criteria

[#120](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120) can be closed once:

- an authenticated non-approved user can request submitter access;
- the request is persisted;
- duplicate active requests are prevented;
- the current request/submitter status is available to the frontend;
- the frontend shows the correct request, pending and approved states;
- status survives refresh/new authenticated sessions;
- the request can be consumed by the administrator workflow in [#45](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/45);
- relevant automated tests and API/contracts documentation are complete.

## Out of Scope

- Administrator approval/rejection/revocation/scope assignment — [#45](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/45)
- Cricket event submission and validation — [#49](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/49), [#50](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/50), [ Implement approved-submitter event submission with provenance and scope enforcement (#51)](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/51)
- Completed submission/upload interface — [#53](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/53)
- Authentication provider and login implementation

## Expected Outcome

A signed-in ordinary user can request permission to become a submitter and clearly see that their request is awaiting administrator approval.

The request is persisted and becomes available to the administrator approval workflow under [#45](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/45).

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**area: database**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=32)

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=42)

[**tier: common**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=44)

[**type: feature**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=46)

 labels 3 days ago

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sprint 1** milestone 3 days ago

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sport-Analytics-Tool-Proj** project 3 days ago

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/129)[2 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120#event-3415)

[**Persist submitter access requests and implement request endpoint**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/129)[ #129](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/129)

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/130)[2 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120#event-3424)

[**Expose submitter access status through current-user API**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/130)[ #130](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/130)

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/131)[2 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120#event-3430)

[**Build submitter access request and status UI**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/131)[ #131](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/131)

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**area: backend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=116)

 label 2 days ago

 [**Dean**](https://sdp.ms.wits.ac.za/Dean) self-assigned this 2 days ago

 [**Dean**](https://sdp.ms.wits.ac.za/Dean) moved this to Ready in  [Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2) on 2 days ago

**Write**Preview

Drop files or click here to upload.

[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=42)

[**area: backend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=116)

[**area: database**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=32)

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**tier: common**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=44)

[**type: feature**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=46)

[Sprint 1](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/1)

[Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)

[Dean](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120#)

**1 Participants**

**Notifications**

**Due Date**

No due date set.

**Dependencies**

No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#120

 

[Powered by Gitea](https://about.gitea.com/)Version: 1.24.7 Page:**116ms**Template:**30ms**

[Licenses](https://sdp.ms.wits.ac.za/assets/licenses.txt)[API](https://sdp.ms.wits.ac.za/api/swagger)

is this blocked by anything

## Response:
8/15/2026, 1:31:24 PM

> **Assessing dependencies**
>
> I’m treating #120 as an umbrella issue rather than a standalone implementation. Its immediate work depends on #129–#131, while #129 relies on #43/#44. End-to-end approval also depends on #45; #53 appears downstream, not blocking initial request UI.
>
> **Assessed dependencies**
>
> 
>
> **Searching the web**
>
>
> **Clarifying blocking status**
>
> I’m distinguishing explicit metadata from implementation dependencies: #120 has no formal blockers set, but it should wait on #43/#44, then #129–#131. #45 is needed for complete approval flows; #53 and #49–#51 are downstream, not immediate blockers.
>
> **Clarified blocking status**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 20s

**You are not hard-blocked from starting #120**, but the parent issue has a clear dependency chain. The Gitea page you pasted actually says **“Dependencies: No dependencies set,”** so nothing is formally marked as blocking it. I also tried to verify the live issues, but the internal Wits Gitea pages aren't accessible from my web connection. ([Invalid URL]())

### Practical dependency order

```text
#43 Database/account/submitter schema
            ↓
#44 Account sync + current-user API + authorisation
            ↓
#129 Persist request + POST request endpoint
            ↓
#130 Expose request/submitter status in current-user API
            ↓
#131 Request/status frontend UI
            ↓
        #120 complete
```

There is also **#45 Administrator approval + scope management**, but I would classify that slightly differently:

```text
User requests access
      #129
        ↓
Request = pending
      #130/#131
        ↓
Admin approves/rejects
       #45
        ↓
User = approved
      #130/#131
```

So:

- **#43 is a prerequisite** if the required account/submitter database structures aren't merged yet.
- **#44 is a prerequisite** because #129/#130 need an authenticated application user and the current-user infrastructure.
- **#129 should come before #130**, because #130 needs persisted request state to expose.
- **#130 should come before, or be developed alongside, #131**, because the frontend needs an API response telling it `none/pending/approved/rejected/revoked`.
- **#45 does NOT block you from implementing request creation or the pending UI.** However, it effectively blocks proving the complete `pending → approved/rejected` end-to-end workflow and therefore may prevent closing every acceptance criterion on parent #120.
- **#53, #49, #50 and #51 are downstream**, not blockers for this issue.

The project-specific brief explicitly requires that **only approved submitters can submit**, that each submitter operates within a defined competition scope, and that provenance is retained. `sport_analytics (1).pdf` So this workflow is directly supporting a **Basic-tier project requirement**, not just an optional account feature. The general brief also requires established authentication rather than custom auth and a hand-written HTTP API. `project_briefs (4).pdf`

### What I would do now

Check just these two things:

```bash
git checkout main
git pull
git log --oneline --all --grep="#43"
git log --oneline --all --grep="#44"
```

Or check Gitea and see whether **#43 and #44 are closed/merged**.

**If both are merged: you are unblocked. Start with #129, not the umbrella #120.**

Then work in this order:

**#129 → #130 → #131**, with #45 integrating afterward.

One thing I would change in Gitea: add explicit dependency relationships to the child issues if your Gitea version supports them. Right now the parent saying **“No dependencies set”** makes the actual implementation order much less obvious than it should be for your methodology/evidence.

**Bottom line:** 🟢 If #43 and #44 are merged, start #129 now. 🟡 #45 only blocks completing the full approval cycle, not your current work.

---

**Sources:**

- [Internal Error]()

## Prompt:
8/15/2026, 1:33:54 PM

dean\@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ git checkout main

git pull

git log --oneline --all --grep="#43"

git log --oneline --all --grep="#44"

Already on 'main'

Your branch is up to date with 'origin/main'.

Already up to date.

dd49a7d docs(ai): update Dean AI evidence

b4065af Merge pull request 'Implement account synchronisation, profile API and role-based authorisation (#44)' (#123) from feat/44-account-authorisation into main

8445ea2 (origin/feat/44-account-authorisation, feat/44-account-authorisation) docs(evidence): link issue 44 pull request

da1b29f feat(api): add account authorisation

dean\@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ 

43 isnt done yet

[Issues](https://sdp.ms.wits.ac.za/issues)[Pull Requests](https://sdp.ms.wits.ac.za/pulls)[Milestones](https://sdp.ms.wits.ac.za/milestones)[Explore](https://sdp.ms.wits.ac.za/explore/repos)

[**git-push-pray**](https://sdp.ms.wits.ac.za/git-push-pray)**/**[**Sport-Analytics-Tool**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool)

**Internal**

[Code](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/)[**Issues29**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues)[Pull Requests](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls)[Actions](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[**1**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/actions)[Packages](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/packages)[Projects](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[**1**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects)[Releases](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/releases)[Wiki](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/wiki)[Activity](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/activity)[Settings](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/settings)

# Implement the application account, role, approved-submitter and scope database schema #43

**Open**

opened last week by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 3 comments

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [last week](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43#issue-100)

**Member**

## Description

Implement the database schema required to connect Supabase-authenticated users to application accounts and control who may submit event data.

The schema must support application roles, approved-submitter status and a defined submission scope. Public users must be able to view published sport data without an application account or sign-in.

## Motivation

Authentication identifies a user, but the application must separately decide whether that user is an administrator or an approved submitter and what competition data they may manage.

## Scope

### Included

- Application account linked to a stable Supabase Auth user identifier.
- Role representation for normal users, approved submitters and administrators.
- Submitter approval status.
- Submission scope linked to the selected competition model.
- Created and updated timestamps.
- Foreign keys, constraints and indexes.
- Migration and rollback support.

### Excluded

- Frontend authentication pages.
- Supabase configuration.
- Administrator approval screens.
- Event submission endpoints.

## Acceptance Criteria

- A migration creates the account, role, approval and scope structures.
- A Supabase Auth identity can map to one application account.
- Submitter approval can be granted and revoked.
- A submitter can be restricted to a defined competition scope.
- Invalid or duplicate records are prevented by database constraints.
- Public read access does not require an application account.
- Migration and schema tests pass.
- Database documentation is updated.
- The implementation is reviewed through a Pull Request.

## Dependencies

- Existing Supabase authentication foundation.
- Confirmed sport and competition scope.
- Existing database migration tooling.

## Testing and Verification

Test successful creation, duplicate prevention, approval changes, scope assignment and invalid foreign-key cases.

## Documentation and Evidence

Provide the migration, schema tests, updated database documentation and linked Pull Request.

## Security, Accessibility and Responsiveness

### Security

Do not store passwords or Supabase credentials. Use least-privilege roles and database constraints.

### Accessibility

Not directly applicable to this database issue.

### Responsiveness

Not directly applicable to this database issue.

## AI Declaration

> The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sprint 1** milestone last week

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added the 

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=42)

[**area: database**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=32)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

 labels last week

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) added this to the **Sport-Analytics-Tool-Proj** project last week

[**GabeRaz**](https://sdp.ms.wits.ac.za/GabeRaz) commented [last week](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43#issuecomment-1617)

**Member**

Updated the issue to replace the outdated Firebase Auth references with Supabase Auth, which is the authentication provider currently used by the project.

[**BenSwartz**](https://sdp.ms.wits.ac.za/BenSwartz) commented [last week](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43#issuecomment-1707)

**Member**

Partly implemented by [#27](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/27). `app_user` keys on `(auth_provider, auth_subject)` with an `application_role` column.

Outstanding: approved-submitter status, submission scope linked to the competition model, and the associated constraints.

AI Declaration: The preceding comment was generated with the assistance of Claude-Web[Claude Opus 5].

[**BenSwartz**](https://sdp.ms.wits.ac.za/BenSwartz) commented [5 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43#issuecomment-2021)

**Member**

Partly implemented by [#27](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/27). `app_user` keys on `(auth_provider, auth_subject)`
with an `application_role` column, so an authentication identity maps to one
application account independently of the provider.

Outstanding: approved-submitter status, submission scope linked to the
competition model, and the constraints enforcing both.

The scope model is undecided and should be settled before this is implemented.
Whether a scope is a competition, a season, or a set of fixtures determines the
schema here and constrains [#44](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/44), [#45](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/45) and [#51](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/51), none of which can be completed
without it.

AI Declaration: The preceding comment was generated with the assistance of Claude-Web[Claude Opus 5].

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120)[3 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43#event-2535)

[**Implement the submitter access request workflow**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120)[ #120](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/120)

 [**GabeRaz**](https://sdp.ms.wits.ac.za/GabeRaz) self-assigned this 3 days ago

 [**Shayna**](https://sdp.ms.wits.ac.za/Shayna) [referenced this issue ](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/129)[2 days ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43#event-3417)

[**Persist submitter access requests and implement request endpoint**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/129)[ #129](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/129)

**Write**Preview

Drop files or click here to upload.

[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=42)

[**area: database**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=32)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[Sprint 1](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/1)

[Sport-Analytics-Tool-Proj](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/2)

[GabeRaz](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/43#)

**3 Participants**

**Notifications**

**Due Date**

No due date set.

**Dependencies**

No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#43

 

[Powered by Gitea](https://about.gitea.com/)Version: 1.24.7 Page:**121ms**Template:**32ms**

[Licenses](https://sdp.ms.wits.ac.za/assets/licenses.txt)[API](https://sdp.ms.wits.ac.za/api/swagger)

## Response:
8/15/2026, 1:34:05 PM

**#43 being open does not necessarily block you from starting #129, but it does block safely completing the whole #120 workflow unless the required submitter/scope schema has already landed indirectly through #44.**

There is an important inconsistency here:

- #43 says the outstanding work is **approved-submitter status + submission scope + constraints**.
- Ben explicitly wrote that #44, #45 and #51 could not be completed without that scope decision.
- Yet **#44 has now been merged into `main`**.
- So either:
  1. #44 introduced some/all of the missing schema itself,
  2. the scope decision was made elsewhere and #43 was never updated, or
  3. #44 was implemented using assumptions that still need reconciliation with #43.

We should check the code rather than treating the open/closed issue state as truth.

### Run this first

From repository root:

```bash
grep -Rni \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git \
  -E "approved_submitter|approved.*submitter|submission_scope|submitter_scope|competition_scope|application_role" \
  apps packages database migrations . 2>/dev/null | head -200
```

Then:

```bash
find . \
  -type f \
  \( -iname "*.sql" -o -iname "*migration*" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  | sort
```

And specifically inspect what #44 changed:

```bash
git show --stat da1b29f
```

followed by:

```bash
git show --name-only --format="" da1b29f
```

Send me those outputs and we can determine exactly whether #43 is a **real code blocker or just an outdated Gitea issue**.

### What you can probably do meanwhile

I would **not work on #43**, because Gabe is assigned to it. That avoids duplicate work and protects your team's Git methodology/contribution evidence.

Your #120 work is split nicely enough that some of it can proceed independently:

```text
#43
Canonical approved-submitter + scope model
  │
  ├───────────────┐
  ↓               ↓
#129             #45
request          admin approval/scope
persistence
  ↓
#130
current-user status
  ↓
#131
frontend states
```

For **#129**, the access request itself probably does **not need a competition scope**. The issue says that scope assignment happens later under #45. A request can therefore conceptually be:

```text
submitter_access_request
------------------------
id
app_user_id
status
created_at
updated_at
reviewed_at
...
```

rather than:

```text
request
+ competition scope
```

That distinction matters. An ordinary user is asking:

> "May I become a submitter?"

They are not necessarily deciding:

> "Give me authority over Competition X."

The administrator assigns the actual allowed scope under #45.

So **#129 may be implementable before #43**, provided it only references the existing `app_user` table and doesn't duplicate the eventual approval/scope model.

### Where #43 definitely matters

You cannot confidently call **#120 fully complete** until the canonical approved-submitter representation exists.

The parent acceptance criteria include:

- frontend displays the **approved state**;
- request can be consumed by administrator workflow #45;
- user ultimately gains submission functionality.

And your Sport Analytics brief explicitly requires that only **approved submitters** can submit, each within a **defined part of the competition**. `sport_analytics (1).pdf`

So the scope model isn't optional architectural polish; it supports a Basic-tier requirement.

### My recommendation

**Do not wait doing nothing for #43.**

Check what #44 actually put into `main`. If #44 already contains the approval/scope schema, #43 may simply need Gabe to finish tests/docs and close it.

If it doesn't, you can still likely take **#129** as long as you keep the request persistence independent from the unresolved competition-scope design.

The thing I would **not** do is invent your own competition scope schema inside #129. That would collide with Gabe's #43 and create exactly the integration problem his issue is supposed to resolve.

**Next action:** run those three commands and paste the output here. I'll tell you **green = start #129**, **yellow = start only part of #129**, or **red = genuinely blocked**.

## Prompt:
8/15/2026, 1:37:47 PM

[Attachment: Pasted text.txt]

## Response:
8/15/2026, 1:37:49 PM

> **Assessed account authorization migration and submitter approval implementation coverage**
>
> 
>
> Worked for 22s

**🟢 Start #129 now. #43 is not blocking the request endpoint anymore - but #43 itself needs to be reconciled because #44 has already implemented most of its outstanding database work.**

Your output changes the picture significantly.

The migration introduced by #44 contains the exact structures #43 said were still outstanding:

- `submitter_approval_state`
- a constraint on the allowed approval states
- `submitter_competition_scope`
- foreign keys to `app_user` and `competition`
- a composite primary key preventing duplicate user/competition grants
- rollback logic
- server-owned submitter scope semantics. `Pasted text.txt`

And your current `main` is actually using those structures. The repository has `requireApprovedSubmitter()`, the account repository reads `submitter_competition_scope`, submissions enforce the scope, and tests cover approved/in-scope and approved/out-of-scope users. `Pasted text.txt`

So the situation is effectively:

```text
#27
app_user + application_role
        ↓
#44
submitter_approval_state
submitter_competition_scope
account synchronisation
authorisation middleware
current-user profile
        ↓
#129   ← YOU CAN START HERE
request persistence + request endpoint
        ↓
#130
current-user request status
        ↓
#131
frontend
```

### There is one important problem to fix

The #44 migration currently permits:

```text
not_requested
pending
approved
rejected
```

The actual migration confirms those four states. `Pasted text (2).txt`

But **#120 explicitly requires**:

```text
pending
approved
rejected
revoked
```

So `revoked` currently does **not** exist.

That doesn't stop #129. An initial request only needs to transition:

```text
not_requested → pending
```

But it **will matter later** for #45/#130/#120. Don't quietly turn `rejected` into `revoked`; those mean different things:

```text
rejected = administrator never approved the request

revoked = administrator previously approved access
          and later removed that approval
```

For auditability and understandable UI behaviour, those should remain distinguishable.

### What happened to #43?

It looks like **#44 accidentally/necessarily implemented much of #43**.

Commit `da1b29f` added the account-authorisation migration along with the repository, authorisation middleware, tests, API docs, database docs and security docs. `Pasted text.txt`

That's not necessarily bad. Dependencies often shift during implementation. But your Gitea evidence should reflect reality rather than leaving #43 looking completely unfinished.

Since **Gabe owns #43**, don't modify or close it yourself without coordinating. Tell him something like:

> #44 has already introduced `submitter_approval_state` and `submitter_competition_scope`, including the competition FKs/PK and authorisation usage. It looks like most of #43's outstanding schema was implemented as part of #44. We should check #43's remaining schema-test/acceptance criteria and the missing `revoked` state, then either complete/close #43 or document what remains.

### For your work: take #129

You can create your branch now:

```bash
git checkout main
git pull
git checkout -b feat/129-submitter-access-request
```

Before writing anything, inspect what #44 already gives you:

```bash
sed -n '1,220p' database/migrations/20260812120000000_account-authorisation.sql

sed -n '1,220p' apps/backend/src/modules/accounts/account.ts

sed -n '1,260p' apps/backend/src/modules/accounts/account.repository.ts

sed -n '1,220p' apps/backend/src/routes/auth.routes.ts
```

### How I would implement #129

**Do not create another submitter-request table unless the issue specifically requires request history.**

You already have:

```text
app_user.submitter_approval_state
```

with:

```text
not_requested
pending
approved
rejected
```

For the Basic workflow, the cleanest implementation may simply be an authenticated handwritten endpoint such as:

```http
POST /api/v1/me/submitter-access-request
Authorization: Bearer ...
```

which performs approximately:

```text
not_requested → pending    allowed
pending       → pending    reject duplicate / conflict
approved      → pending    reject
rejected      → ?          needs policy decision
revoked       → ?          needs policy decision later
```

The critical thing is that the state change happens **server-side**. The client must never be allowed to send:

```json
{
  "approvalState": "approved"
}
```

and have that become authoritative.

That matches your existing security design where approval and scope are explicitly server-owned. `Pasted text.txt`

### One thing to clarify before coding the rejected case

#120 says duplicate **active** requests are prevented. That wording suggests that someone whose request was rejected might be permitted to request again.

So don't decide this accidentally:

```text
rejected → pending
```

versus:

```text
rejected → cannot request again
```

That should either come from #129's acceptance criteria/client decision or be recorded as an explicit design decision.

---

## Verdict

**#129:** 🟢 **UNBLOCKED - start it.**

**#130:** 🟢/🟡 Can largely be implemented after #129, but the final status model needs the `revoked` question resolved.

**#131:** 🟡 Depends on the API contract from #130.

**#120 overall:** 🟡 Cannot cleanly close until `revoked` and the #45 integration are handled.

**#43:** 🟡 Mostly appears to have been implemented by #44, but Gabe should reconcile its remaining acceptance criteria and close/update it rather than you duplicating the work.

This is also the right direction for the brief: approved users must be restricted to a defined competition scope, and your existing competition-scoped model directly supports that Basic requirement. `sport_analytics (1).pdf`

**Next: create `feat/129-submitter-access-request` and send me the four `sed` outputs above. Then we can design #129 around the code that actually exists instead of duplicating anything.**

## Prompt:
8/15/2026, 2:06:40 PM

what is the next task that is open too be done

[Attachment: Sport-Analytics-Tool-main (7).zip]

[Attachment: Pasted markdown.md]

## Response:
8/15/2026, 2:06:43 PM

> **Finding the next task**
>
> I’m checking the current open backlog, prioritizing unassigned work that isn’t blocked, and comparing it with Dean’s existing assignments. I’ll recommend the clearest next task rather than simply choosing the highest-numbered issue.
>
> **Found the next task**
>
> 
>
> **Assigned Dean issue #67 for public ordered-event read APIs implementation**
>
> 
>
> **Inspecting Zip for Event Read APIs**
>
>
> **Inspected ZIP event APIs, routes, and submission contracts**
>
> 
>
> **Prioritizing the backlog**
>
> I’m comparing open issues with the uploaded code so I don’t recommend stale work. The clearest next task is #67, public event read APIs: it’s unassigned, high priority, Sprint 1, and the required event data already exists.
>
> **Recommended the next unassigned development task**
>
> 
>
> Worked for 59s

## Recommended next task: **#67 - Implement public ordered-event read APIs with filtering and pagination**

This is the best **open, unassigned, genuinely ready Sprint 1 task** for you to claim next. `Pasted markdown.md`

### Why #67 is the one

It is:

- **Open**
- **Unassigned**
- **Sprint 1**
- **Priority: high**
- **Tier: Basic**
- Core to the actual Sport Analytics brief
- Not waiting on unfinished frontend work
- Needed to complete the API/event/statistics vertical slice

Its dependencies are effectively satisfied:

```text
#61 Ordered-event/submission schema       ✅ closed
#58 Shared API contracts/pagination       ✅ closed
#51 Accepted event submission             ✅ closed
#52 Statistics API                        ✅ closed
                     ↓
                   #67
             Public event API
```

I also checked the repository ZIP you just uploaded. The current public-read router has routes for fixtures, competitors and participants, and #52 added statistics routes, **but there is currently no public ordered-event read route**. So #67 is not merely an outdated open issue - there is real implementation missing.

The missing piece is basically:

```http
GET /api/v1/fixtures/{fixtureId}/events
```

with:

- anonymous access;
- deterministic event ordering;
- filtering;
- pagination;
- stable IDs;
- no private submitter/account fields;
- API tests;
- OpenAPI documentation.

That directly supports the project-specific requirement that API consumers must be able to read **fixtures, events and derived statistics**, filter them, and paginate large results. `sport_analytics (1).pdf`

---

### What I would prioritise after #67

**1. #67 - Public ordered-event API** ← **claim this now**

Then:

**2. #54 - Public statistics frontend**

#54 depends on the statistics API (#52 ✅), public browsing (#48 ✅), and public event-reading capability (#67). So completing #67 unlocks it cleanly.

**3. #68 - Basic vertical-slice automated tests**

Very valuable for the Milestone 2 automated-testing rubric, but it makes more sense once #53 and the remaining Basic user journey are finished.

**4. #66 - Account deletion**

This is extremely important because account deletion is a **compulsory course requirement**, not optional. The general brief explicitly requires signup, signin, password reset and **account deletion**. `project_briefs (4).pdf` However, #66 has the extra complication of deciding how to preserve submission/event provenance after account deletion, so it is slightly riskier than #67.

**5. #70 / #71 - Sprint 1 documentation and close-out**

These absolutely need doing before the August 25 milestone, but they make most sense when the implementation state is closer to frozen.

---

### I would NOT claim these yet

**#49 and #50:** the issue tracker looks stale relative to the code. Your current repository already contains a substantial executable Zod delivery submission schema, event-indexed validation errors, constraints, submission API tests, etc. Before somebody implements these from scratch, the team should check whether they should instead be updated/closed based on work done under #51.

**#43:** Gabe owns it, and #44 already implemented much of its outstanding schema.

**#129/#130:** Shayna owns them.

**#131:** already assigned to you, but blocked by #129 → #130.

**#53:** Nadav owns it.

**#65/#86:** Gabe owns them.

---

## So claim **#67**

I would put your name on:

> **#67 - Implement public ordered-event read APIs with filtering and pagination**

Then:

```bash
git checkout main
git pull
git checkout -b feat/67-public-events-api
```

This is a particularly good task for you because it connects directly to the **#51 submission work and #52 statistics work already in the repository**, giving you a coherent API vertical slice rather than jumping to something unrelated.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)