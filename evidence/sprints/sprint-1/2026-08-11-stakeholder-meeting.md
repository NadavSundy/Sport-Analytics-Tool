# Stakeholder Meeting

**Date:** 11 August 2026
**Attendees:** Git Push Pray team, Terence Nkoua Mackyta
**Purpose:** Demonstrate current Sprint 1 progress, discuss the database limitation and agree on the next priorities for submitter access, data and statistics.
**Record created:** 13 August 2026 (retrospective summary)

## Progress Demonstrated

The team demonstrated the current frontend implementation to Terence.

The demonstration included the application's frontend interface and working login capabilities using the Supabase authentication foundation.

The team also demonstrated the sporting data currently available through the application.

Only a limited amount of data could be demonstrated because the storage available on the current Supabase free plan was too small for the full intended T20 cricket dataset.

## Requirements Discussed

The team discussed the Supabase storage limitation and the need to establish a database solution capable of supporting substantially more event-level T20 cricket data.

The required user and submitter-access flow was also discussed.

The agreed intended flow is:

1. A user visits the application and may browse public data.
2. A user can log in or sign up.
3. The application determines whether the authenticated user is an approved submitter.
4. An approved submitter is given access to the submission interface.
5. An authenticated user who is not yet an approved submitter can request submitter access.
6. An administrator can review the request and approve the user.
7. Once approved, the user gains access to the submission interface.

Submission access therefore depends on application-level approval and must not be granted merely because a user has successfully authenticated.

The team also discussed beginning implementation of event-derived statistics if the database limitation can be resolved and sufficient event data becomes available.

## Feedback Received

Terence reviewed the frontend and login functionality that had been implemented since the initial stakeholder meeting.

The next priorities identified through the discussion were:

- resolve the database capacity problem;
- obtain and store sufficient T20 cricket event data;
- complete the approved-submitter access flow;
- allow non-approved authenticated users to request submitter access;
- allow administrators to approve those requests;
- expose the submission interface only to approved submitters; and
- begin implementing statistics once the required database and data foundations are available.

## Decisions

- The existing Supabase free-plan capacity is insufficient for the full intended dataset.
- The team must investigate and resolve the database capacity limitation.
- Authentication and permission to submit are separate concerns.
- Successfully logging in does not automatically make a user an approved submitter.
- Approved submitters will be able to access the event-submission interface.
- Authenticated users who are not approved submitters will be able to request submitter access.
- Administrators will be able to review and approve submitter-access requests.
- Submission permissions must be controlled by the application's role and approval data.
- Event-derived statistics should be progressed once sufficient database capacity and event data are available.

## Actions

- Investigate the Supabase storage limitation and determine whether the current database host remains suitable.
- Continue building the database and loading the required T20 cricket data.
- Implement the application account, role and approved-submitter model.
- Implement the submitter-access request workflow.
- Implement administrator approval of submitter requests.
- Display the submission interface only to approved submitters.
- Continue development of the event-submission functionality.
- Begin fixture and competitor statistics once sufficient event data is available.
- Keep the relevant Gitea issues and Project board statuses updated.

## Related Gitea Issues

- #13 — Establish the Supabase PostgreSQL foundation
- #28 — Add Cricsheet T20 dataset downloader
- #43 — Implement the application account, role, approved-submitter and scope database schema
- #44 — Implement account synchronisation, profile API and role-based authorisation
- #45 — Build administrator submitter approval and scope management
- #52 — Implement event-derived fixture statistics and the public statistics API
- #53 — Build the approved-submitter event upload and validation-results interface
- #54 — Build public fixture and competitor statistics pages
- #62 — Implement the backend database repository and transaction foundation
- #102 — Integrate Supabase authentication with sign-in, create-account and account UI
- #105 — Database round-trip latency is 185 ms and constrains API response times
- #117 — Replace separate authentication actions with one Login or Sign up entry
- #120 — Submitter access request workflow
- #125 — Add missing Sprint 1 stakeholder meeting and standup records

## AI Declaration

> The preceding document was generated and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
