# Split Backend Frontend!

**User:** Anonymous  
**Created:** 9/2/2026 10:35:00  
**Updated:** 9/2/2026 10:37:51  
**Exported:** 9/2/2026 14:05:54  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a97df8c-3a98-83ea-ae6c-72aa48dd755e](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a97df8c-3a98-83ea-ae6c-72aa48dd755e)  

## Prompt:
9/2/2026, 10:34:56 AM

this needs to be redone

it needs to be split for backend and frontend

[Attachment: Pasted markdown.md]

## Response:
9/2/2026, 10:34:58 AM

## Recommended outcome

Yes - **#342 should be split into two separate issues**. The current issue mixes a substantial frontend redesign with backend API/security work, which makes ownership, PR review, testing, and evidence less clear. The original issue explicitly contains both frontend UX requirements and backend/API authorization requirements. `Pasted markdown.md`

That split also better reflects the project requirement for a **non-monolithic frontend/backend** and a **team-designed hand-written HTTP API**. `project_briefs (4).pdf`

I would replace #342 with these two issues.

---

# Issue 1 - Backend

## `Extend Admin User Management API`

```md
# Extend Admin User Management API

## Summary

Extend the application's hand-written backend API to provide the account information and administrative operations required by the **Admin → Manage Users** interface.

The frontend redesign is being handled separately. This issue is responsible only for the **backend API, authorization, validation, security, testing and API documentation** needed to support that interface.

Administrators need to be able to securely retrieve enough information to identify and manage registered users, including email addresses, roles, submitter approval state and competition scopes.

All administrative user data must be obtained through the project's **hand-written HTTP API**. The frontend must not directly use authentication-provider administrative/generated endpoints.

---

## Motivation / Impact

The existing administration workflow manages user roles, submitter approval and competition access.

The redesigned frontend requires a reliable backend contract which allows administrators to answer questions such as:

- Who is this account?
- What is their email address?
- What application role do they have?
- What is their submitter approval state?
- Which competition scopes are assigned to them?
- Which administrative changes are currently valid?

Keeping these responsibilities in the backend ensures that authorization and validation are enforced server-side rather than relying on frontend visibility.

This supports the project's requirements for:

- a hand-written HTTP API;
- separate frontend and backend architecture;
- secure authentication and authorization;
- API testing;
- API documentation.

---

## User Story

**As an administrator, I want the backend API to securely expose the information and operations required to manage registered users, so that administrative functionality can be implemented without exposing privileged authentication-provider functionality to the browser.**

---

# Required Changes

## 1. Administrator User Listing

Provide or extend an administrator-only API endpoint that returns the information required by the Manage Users interface.

Conceptually:

```text
GET /api/v1/admin/users
```

The exact route should follow the project's existing API conventions.

Each returned user should expose only the information required by the application, such as:

```text
id
email
role
submitterApprovalState
competitionScopes
```

Use the project's existing response structure and naming conventions rather than introducing an unrelated API style.

---

## 2. Email Address Support

Administrators must be able to retrieve a user's email address through the backend API.

Email information must:

- only be returned through administrator-authorised functionality;
- never require the frontend to query authentication-provider administration endpoints directly;
- not expose authentication-provider metadata that the frontend does not require.

---

## 3. Role Information

Return the user's current application role.

Supported application roles currently include:

- `viewer`
- `submitter`
- `administrator`

The API should use the project's existing role representation.

---

## 4. Submitter Approval Information

Where relevant, return the current submitter approval state.

Existing states should remain consistent with the application, including:

- `not_requested`
- `pending`
- `approved`
- `rejected`

Do not introduce duplicate representations of the same state purely for this endpoint.

---

## 5. Competition Scope Information

Return the competition scopes assigned to each relevant account.

The response should contain enough information for the frontend to identify the assigned competitions without requiring unnecessary additional privileged requests.

Reuse the project's existing competition/scope models where possible.

---

## 6. Administrative Mutations

Review the existing API operations used for:

- changing user roles;
- approving submitter requests;
- rejecting submitter requests;
- assigning competition scopes;
- removing competition scopes.

If the required operations already exist, reuse them.

If functionality required by the redesigned Manage Users interface is missing, extend the existing hand-written API rather than introducing authentication-provider generated endpoints.

Do not unnecessarily replace working administration endpoints.

---

# Authorization Requirements

All administrative user-management endpoints must:

- require authentication;
- require the `administrator` role;
- reject unauthenticated requests;
- reject authenticated non-administrator users;
- perform authorization on the backend;
- never rely on frontend route hiding as authorization.

Ordinary `viewer` and `submitter` accounts must not be able to enumerate registered users or their email addresses.

---

# Validation Requirements

Administrative changes must be validated server-side.

The backend must reject invalid operations, including where applicable:

- unsupported application roles;
- invalid competition identifiers;
- invalid submitter approval transitions;
- malformed request data;
- operations that would place an account into an invalid state.

Existing project authorization and validation conventions should be reused.

---

# Security Requirements

The endpoint must never return:

- passwords;
- password hashes;
- authentication tokens;
- refresh tokens;
- API secrets;
- Supabase service/admin credentials;
- authentication-provider secrets;
- unnecessary provider-specific account metadata.

Only fields required by the administration interface should be exposed.

Privileged authentication-provider access must remain on the server.

---

# Error Handling

API operations should return appropriate HTTP errors for situations such as:

- unauthenticated request;
- insufficient permissions;
- invalid request data;
- user not found;
- competition not found;
- invalid role/scope operation;
- internal/provider failure.

Errors should follow the project's existing API error format.

Failures must not silently succeed.

---

# Automated Tests

Add or update backend/API tests covering the administrative user-management contract.

At minimum verify that:

- an administrator can retrieve the user list;
- returned users contain the expected safe fields;
- email addresses are available to administrators;
- application roles are returned correctly;
- submitter approval state is returned correctly;
- competition scope information is returned where applicable;
- unauthenticated users cannot retrieve the list;
- viewers cannot retrieve the list;
- submitters cannot retrieve the list;
- sensitive authentication information is not returned;
- invalid role changes are rejected;
- invalid scope changes are rejected;
- valid existing administrative operations continue to work;
- appropriate errors are returned when backend/provider operations fail.

Existing tests must continue to pass.

---

# API Documentation

Update the public API/backend documentation if the contract changes.

Document:

- endpoint path;
- HTTP method;
- authentication requirements;
- administrator authorization requirement;
- request parameters/body where applicable;
- response schema;
- possible errors;
- any relevant examples.

Do not document or expose secrets.

---

# Out of Scope

This issue must not:

- redesign the Admin Manage Users frontend;
- add frontend search or filtering;
- add frontend visual styling;
- replace the authentication provider;
- implement custom authentication;
- expose Supabase/admin credentials to the frontend;
- allow ordinary users to enumerate registered accounts;
- refactor unrelated backend architecture;
- replace working user-management endpoints without a justified reason.

---

# Acceptance Criteria

- [ ] Administrator user information is available through the project's hand-written HTTP API.
- [ ] Administrators can retrieve each user's email address.
- [ ] The response includes the user's application role.
- [ ] Relevant submitter approval state is available.
- [ ] Relevant competition scopes are available.
- [ ] The endpoint requires authentication.
- [ ] Administrator authorization is enforced by the backend.
- [ ] Viewers cannot retrieve the administrative user list.
- [ ] Submitters cannot retrieve the administrative user list.
- [ ] Sensitive authentication information is never returned.
- [ ] Privilege/scope modifications are validated server-side.
- [ ] Existing administrative functionality continues to work.
- [ ] Appropriate HTTP errors are returned for invalid/unauthorised requests.
- [ ] Automated API tests cover the main authorization and data-return behaviour.
- [ ] Existing tests continue to pass.
- [ ] API documentation is updated where the contract changed.
- [ ] CI passes.

---

# Definition of Done

This issue is complete when the backend exposes the information required by the Manage Users frontend through the project's hand-written API, administrator authorization is enforced server-side, security-sensitive information remains private, automated API tests pass, documentation reflects the implemented API contract, and the change has passed the normal PR/code-review/CI workflow.

## AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

### Suggested labels

`area: backend`  
`type: feature`  
`enhancement`  
`priority: high`

**Milestone:** Sprint 2

---

# Issue 2 - Frontend

## `Revamp Admin Manage Users Page`

```md
# Revamp Admin Manage Users Page

## Summary

Redesign the **Admin → Manage Users** page to provide administrators with a clearer, faster, responsive and accessible interface for viewing and managing registered users.

This issue covers the **frontend implementation only**.

The backend API required to securely expose administrator user information is handled by a separate backend issue.

The redesigned interface should expose important account information at a glance, provide search and filtering, improve the presentation of administrative actions, and remain usable across desktop, tablet and mobile layouts.

---

## Motivation / Impact

Administrators are responsible for managing:

- registered users;
- application roles;
- submitter approvals;
- competition access.

As the number of users increases, administrators should not need to repeatedly open individual accounts simply to determine who a user is or what permissions they currently have.

The interface should allow an administrator to quickly answer:

- Who is this account?
- What is their email address?
- What role do they have?
- What is their submitter approval state?
- Which competition scopes do they have?
- Which users require attention?
- How can I locate a specific account quickly?

This directly supports assessed areas including:

- user experience;
- accessibility;
- responsiveness;
- aesthetics;
- application structure;
- automated UI testing.

---

## User Story

**As an administrator, I want a clear and searchable user-management interface, so that I can quickly understand and manage registered users, their roles and their permissions.**

---

# Required Changes

## 1. Display Useful User Information

The main Manage Users interface should make important account information visible without requiring administrators to open every user individually.

At minimum display:

- email address;
- application role;
- submitter approval state where relevant;
- competition scope information where relevant.

The user/account identifier may also be displayed where useful for troubleshooting.

Roles include:

- Viewer
- Submitter
- Administrator

Submitter states include:

- Not requested
- Pending
- Approved
- Rejected

The frontend must retrieve this information through the project's hand-written backend API.

---

## 2. Redesign the User List

Replace the current presentation with a cleaner administrative interface.

On larger screens, a table is appropriate.

A possible structure is:

| User | Role | Submitter Status | Competition Scope | Actions |
|------|------|------------------|-------------------|---------|
| user@example.com | Administrator | - | All | Manage |
| analyst@example.com | Submitter | Approved | Premier League | Manage |
| another@example.com | Viewer | Pending | - | Review |

This is illustrative only.

Use whichever layout integrates best with the application's existing visual design system.

Important information should be easy to scan.

---

## 3. User Search

Provide a search control that allows administrators to search by:

- email address.

Search should update the displayed results without reloading the page.

Where easy to support with the available data, search may additionally match:

- user ID;
- role.

Email search is compulsory for this issue.

---

## 4. Role Filtering

Provide a role filter containing:

- All
- Viewer
- Submitter
- Administrator

Changing the filter should update the currently displayed users without reloading the page.

Search and filters should work together.

---

## 5. Submitter Status Filtering

Provide a submitter approval-state filter containing:

- All
- Not requested
- Pending
- Approved
- Rejected

Search, role filtering and submitter-state filtering should compose correctly.

For example, searching for an email while filtering to `Pending` should only show matching pending accounts.

---

## 6. Administrative Actions

Existing administrative functionality must remain accessible.

This may include:

- changing roles;
- approving submitter access;
- rejecting submitter access;
- assigning competition scopes;
- removing competition scopes;
- viewing/managing user details.

Actions should be clearly labelled.

Security-sensitive or destructive actions should require confirmation where appropriate.

The frontend must not assume that hiding a button provides authorization. Backend authorization remains authoritative.

---

## 7. User Management View

Avoid putting every control directly into the main user table.

Selecting **Manage** should open an appropriate detailed management interface such as:

- modal;
- side panel/drawer;
- dedicated details view.

The exact design should follow the application's existing UI conventions.

The view should group information logically.

### Account

- Email
- User ID where useful

### Access

- Current role
- Submitter approval state

### Competition Permissions

- Assigned competition scopes

### Administrative Actions

- Update role
- Approve/reject submitter request
- Modify competition scopes

---

## 8. Visual Hierarchy

Use the application's existing design system to make states easy to identify.

Examples:

- Viewer → labelled role badge
- Submitter → labelled role badge
- Administrator → clearly labelled administrator badge
- Pending → labelled status
- Approved → labelled status
- Rejected → labelled status

Do not communicate meaning through colour alone.

Every visual state must also contain understandable text and/or accessible icon labelling.

---

# Responsive Design

The Manage Users page must remain usable across:

- desktop;
- tablet;
- mobile.

On narrow screens:

- do not require excessive horizontal scrolling;
- consider converting table rows into stacked user cards;
- preserve access to primary administrative actions;
- ensure search controls remain usable;
- ensure filter controls remain usable;
- avoid clipped account information;
- maintain usable touch targets.

Responsive behaviour should follow the rest of the application's design system where practical.

---

# Accessibility

The page must:

- support keyboard navigation;
- use semantic buttons;
- use correctly labelled form controls;
- provide visible keyboard focus states;
- maintain appropriate text/background contrast;
- not communicate status using colour alone;
- provide meaningful accessible names for administrative actions.

If a modal or drawer is used, it must appropriately manage keyboard focus, including:

- moving focus into the opened interface;
- preventing unusable keyboard navigation behind the modal where applicable;
- supporting keyboard dismissal where appropriate;
- returning focus to the triggering control when closed.

---

# Loading State

Display an appropriate loading state while users are being retrieved.

The interface must not appear broken or empty while the request is pending.

---

# Empty State

If no registered users are returned, display a meaningful empty state.

---

# No Search/Filter Results

If users exist but none match the active search/filter combination, display a message such as:

> No users match the current search or filters.

Provide an obvious way to clear/reset filters where appropriate.

---

# API Error State

If the administrative user request fails:

- display a useful error message;
- do not silently fail;
- provide a retry action where appropriate.

Administrative mutation failures should also provide clear feedback to the administrator.

---

# Automated Frontend Tests

Add or update automated UI/component tests covering the main Manage Users behaviour.

At minimum verify that:

- administrator user data is rendered;
- email addresses are displayed;
- roles are displayed correctly;
- submitter status is displayed correctly;
- competition scope information is visible/accessible;
- searching by email filters users correctly;
- role filtering works;
- submitter-state filtering works;
- combined search/filter behaviour works;
- loading state renders;
- API error state renders;
- empty user state renders;
- no-results state renders;
- Manage opens the expected management interface;
- relevant administrative actions invoke the expected existing workflow.

Where practical, include accessibility-focused assertions for the new interactive controls.

Existing tests must continue to pass.

---

# Backend Boundary

This frontend must consume the project's hand-written HTTP API.

It must not:

- query Supabase/authentication-provider administrative endpoints directly;
- contain service/admin credentials;
- implement authorization solely through frontend route hiding;
- duplicate server-side permission validation.

The frontend may hide or disable inappropriate controls for UX purposes, but backend authorization remains authoritative.

---

# Optional Enhancements

These should only be implemented if the compulsory functionality is complete and stable.

## Dashboard Statistics

Optional summary cards:

- Total users
- Administrators
- Approved submitters
- Pending requests

## Sorting

Optional sorting by:

- Email
- Role
- Approval state

## Pagination

Pagination may be added if required by the amount of user data or supported by the backend API.

Do not delay the required search/filter/responsive functionality merely to introduce pagination.

## Three.js

A small Three.js visual may be explored only as a decorative enhancement.

It must:

- not interfere with administration workflows;
- not be required for page functionality;
- not significantly increase initial page loading time;
- respect `prefers-reduced-motion`;
- remain accessible;
- gracefully fail without affecting user management.

Three.js must not replace conventional UI such as tables, forms, filters or navigation.

---

# Out of Scope

This issue must not:

- implement or redesign the backend API;
- replace the authentication provider;
- implement custom authentication;
- redesign unrelated administrator pages;
- introduce a new general-purpose animation architecture;
- access privileged Supabase/admin endpoints directly from the frontend;
- expose credentials or authentication secrets;
- refactor unrelated frontend architecture.

Any backend deficiency discovered while implementing this issue should be reported against the corresponding backend issue rather than worked around insecurely in the frontend.

---

# Acceptance Criteria

- [ ] The Manage Users page has been substantially redesigned.
- [ ] Administrators can see user email addresses supplied by the backend API.
- [ ] Application roles are clearly displayed.
- [ ] Relevant submitter approval states are clearly displayed.
- [ ] Competition scope information is visible or accessible.
- [ ] Administrators can search users by email.
- [ ] Administrators can filter users by role.
- [ ] Administrators can filter users by submitter approval state.
- [ ] Search and filters work together.
- [ ] Existing user-management actions remain accessible

## Prompt:
9/2/2026, 10:36:11 AM

2 md files

## Response:
9/2/2026, 10:36:21 AM

> **Creating split issues**
>
> I’m separating the original request into two implementation-ready Markdown files: one for the admin frontend experience and one for backend APIs, authorization, validation, and tests.
>
> **Created split issues**
>
> 
>
> Worked for 7s

Recommended outcome: replace the combined #342 with **two independently assignable issues**-one frontend and one backend. The existing issue currently mixes UI redesign with API/security work, so splitting it gives cleaner ownership, PRs, testing, and evidence. `Pasted markdown.md` This also fits the brief’s requirement for a separate frontend/backend and a hand-written HTTP API. `project_briefs (4).pdf`

- [Frontend - Revamp Admin Manage Users Page](sandbox:/mnt/data/admin-manage-users-frontend-issue.md)
- [Backend - Admin User Management API](sandbox:/mnt/data/admin-manage-users-backend-issue.md)

The **frontend issue** contains the redesign, search/filtering, responsive layout, accessibility, management drawer/modal, UI states, and frontend tests.

The **backend issue** contains the admin users API, email retrieval, server-side authorization, role/approval/scope validation, security, API tests, deployment configuration, and API documentation.

Both include acceptance criteria, suggested tests, labels, dependencies, Definition of Done, and the required AI declaration. The split also protects the Milestone 2 marks for both **Core Features/UX** and the separately weighted **API + automated testing** areas. `project_briefs (4).pdf`



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)