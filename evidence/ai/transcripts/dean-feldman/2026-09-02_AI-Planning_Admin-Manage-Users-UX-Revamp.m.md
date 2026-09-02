# Revamp Manage Users

**User:** Anonymous  
**Created:** 8/31/2026 21:33:38  
**Updated:** 8/31/2026 21:37:41  
**Exported:** 9/2/2026 14:04:45  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a95d6f4-7cb0-83ea-84bd-2765d6fa011e](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a95d6f4-7cb0-83ea-84bd-2765d6fa011e)  

## Prompt:
8/31/2026, 9:33:34 PM

help me make an issue to revamp the admin manage users page and add emails and make it more usalble and stuff (maybe encorporate three js)

## Response:
8/31/2026, 9:33:37 PM

**Recommended outcome:** make this a focused **admin UX revamp** issue rather than just “make it look better.” The page should become a proper user-management dashboard with email visibility, search/filtering, clearer roles and permissions, safer admin actions, responsive behaviour, and stronger accessibility.

I would **not make Three.js a requirement**. For an admin/data-management screen, it could add bundle size, performance cost, and accessibility complexity without improving the workflow. The project is explicitly marked on accessibility, aesthetics, UX, performance, responsiveness, and structure, so usability should win over visual novelty. `project_briefs (4).pdf` If someone has time, a very lightweight decorative visual can be an optional enhancement.

Here is a **full issue you can paste into Gitea**:

---

# Revamp Admin Manage Users Page

## Summary

The current **Admin → Manage Users** page should be redesigned to provide administrators with a clearer, more efficient and more usable interface for viewing and managing application users.

The existing page provides basic user-management functionality, but it should be improved to better support administrators as the number of registered users grows.

The revamped page should expose useful account information such as **user email addresses**, make roles and submitter approval state easier to understand, provide useful search/filter functionality, improve the presentation of administrative actions, and work well across desktop and mobile screen sizes.

This issue should primarily improve the **frontend user experience**, while adding or extending the hand-written backend API where necessary to securely provide the required user information.

---

## Motivation / Impact

Administrators are responsible for managing users, roles, submitter approvals and competition access.

As the platform grows, a basic list of users becomes increasingly difficult to use. Administrators should be able to quickly answer questions such as:

- Who is this account?
- What is their email address?
- What role do they currently have?
- Have they requested submitter access?
- Has their submitter request been approved?
- What competition scopes are assigned to them?
- Which users require administrative attention?
- How can I quickly locate a specific user?

Improving this workflow directly benefits the application's **user experience, responsiveness, accessibility and aesthetics**, which are explicit project assessment areas. `project_briefs (4).pdf`

---

## User Story

**As an administrator, I want a clear and searchable user-management interface, so that I can quickly understand and manage registered users, their roles and their permissions.**

---

# Proposed Changes

## 1. Display Useful User Information

Each user should display enough information for an administrator to reliably identify the account.

At minimum, display:

- Email address
- Current application role
  - Viewer
  - Submitter
  - Administrator
- Submitter approval state where relevant
  - Not requested
  - Pending
  - Approved
  - Rejected
- Competition scope information where relevant
- User/account identifier where useful for troubleshooting

Email should be treated as administrative information and must only be available through administrator-authorised functionality.

---

## 2. Improve User List Layout

Replace the current presentation with a cleaner administrative dashboard/table/card interface.

On larger screens, consider a table containing columns such as:

| User | Role | Submitter Status | Competition Scope | Actions |
| --- | --- | --- | --- | --- |
| user@example.com | Administrator | - | All | Manage |
| analyst@example.com | Submitter | Approved | Premier League | Manage |
| another@example.com | Viewer | Pending | - | Review |

The interface does **not** need to follow this exact layout if another implementation provides better usability.

Important information should be visible without requiring administrators to repeatedly open each account.

---

## 3. Add Search

Administrators should be able to search users.

Search should support at least:

- Email address

Where convenient, also allow searching by:

- User ID
- Role

Search should update the visible users without requiring a page reload.

---

## 4. Add Filtering

Provide useful filters such as:

### Role

- All
- Viewer
- Submitter
- Administrator

### Submitter status

- All
- Not requested
- Pending
- Approved
- Rejected

Where useful, administrators may also filter by competition scope.

---

## 5. Improve Administrative Actions

Administrative actions should be easy to find while avoiding accidental changes.

Examples include:

- Change role
- Approve submitter access
- Reject submitter access
- Assign competition scopes
- Remove competition scopes
- View/manage user details

Actions that modify permissions or access should clearly communicate what will happen.

Destructive or security-sensitive changes should require confirmation where appropriate.

---

## 6. Add User Detail / Management View

Instead of placing every possible control directly into the table, selecting **Manage** should open either:

- a modal,
- a side panel / drawer, or
- a dedicated user details view.

The view should clearly group information such as:

### Account

- Email
- User ID

### Access

- Current role
- Submitter approval state

### Competition permissions

- Assigned competition scopes

### Administrative actions

- Update role
- Approve/reject submitter request
- Modify competition scopes

This should keep the main user list readable while still exposing advanced functionality.

---

## 7. Improve Visual Hierarchy

Use the application's existing visual design system to make account states immediately understandable.

For example:

- Viewer → role badge
- Submitter → role badge
- Administrator → prominent administrator badge
- Pending → status badge
- Approved → status badge
- Rejected → status badge

Do **not** rely on colour alone to communicate meaning.

Text labels/icons should also describe the state.

---

## 8. Responsive Design

The page must remain usable on smaller screens.

On narrow/mobile layouts:

- Avoid a horizontally unusable table.
- Collapse less important information appropriately.
- Consider switching rows into stacked user cards.
- Keep primary administrative actions accessible.
- Ensure filters/search remain usable.

The project brief explicitly requires modern responsive and accessible behaviour. `project_briefs (4).pdf`

---

## 9. Accessibility

The redesigned interface should:

- support keyboard navigation;
- use semantic buttons and form controls;
- provide accessible labels;
- have visible keyboard focus states;
- maintain sufficient contrast;
- avoid communicating status using colour alone;
- ensure modals/drawers manage keyboard focus correctly;
- provide meaningful accessible names for administrative actions.

---

# Backend / API Requirements

If email addresses or other required account information are not currently available through the application's backend API, extend the **existing hand-written HTTP API** rather than querying authentication-provider generated endpoints directly from the frontend.

The project brief requires the team to design and implement its own HTTP API and specifically prohibits relying on generated API endpoints such as Supabase-generated endpoints as the application's API. `project_briefs (4).pdf`

Any endpoint returning user-management information must:

- require authentication;
- require the `administrator` role;
- return only the user information required by the administration interface;
- avoid exposing authentication credentials, tokens, password information or provider secrets;
- validate requested role/scope changes on the server;
- return appropriate error responses.

Example conceptual endpoint:

```text
GET /api/v1/admin/users
```

Possible response information:

```text
id
email
role
submitterApprovalState
competitionScopes
```

The exact API design should follow the project's existing conventions.

---

# Security Requirements

The implementation must ensure that:

- only administrators can access the user-management data;
- ordinary viewers and submitters cannot retrieve the complete user/email list;
- frontend hiding alone is **not** considered authorization;
- authorization is enforced by the backend;
- privilege changes are validated server-side;
- administrator accounts cannot accidentally be left in an invalid role/state;
- sensitive authentication-provider information is never sent to the browser.

---

# Loading / Empty / Error States

The page should provide appropriate UI for:

### Loading

Show a loading state while the user list is being retrieved.

### No users

Display a meaningful empty state.

### No search results

For example:

> No users match the current search or filters.

### API failure

Display a useful error message rather than silently failing.

Where appropriate, provide a retry action.

---

# Optional Enhancements

These are **not required for this issue** unless they can be implemented without delaying the core functionality.

### Dashboard statistics

Small summary cards could show:

- Total users
- Administrators
- Approved submitters
- Pending submitter requests

### Sorting

Allow sorting by:

- Email
- Role
- Approval state

### Pagination

If the number of accounts becomes large, support pagination rather than retrieving/rendering the entire user database.

### Three.js / Visual Enhancement

A small Three.js visual may be explored as a decorative enhancement **only if**:

- it does not interfere with administrative workflows;
- it does not significantly increase initial loading time;
- it respects `prefers-reduced-motion`;
- it does not reduce accessibility;
- the page remains fully usable if the visual fails to load;
- it does not become a required dependency for the actual user-management functionality.

Three.js should **not** replace conventional UI elements such as tables, forms, filters or navigation.

---

# Acceptance Criteria

- [ ] The Manage Users page has been visually redesigned and is significantly easier to scan and use.
- [ ] Administrators can see each user's email address.
- [ ] Administrators can see each user's application role.
- [ ] Relevant submitter approval status is clearly displayed.
- [ ] Relevant competition scopes are visible or accessible from the user-management interface.
- [ ] Administrators can search users by email.
- [ ] Administrators can filter users by role.
- [ ] Administrators can filter users by submitter approval state where applicable.
- [ ] Existing user-management functionality remains available.
- [ ] Administrative actions are clearly presented and appropriately confirmed.
- [ ] User-management data is retrieved through the project's hand-written backend API.
- [ ] Backend endpoints enforce administrator authorization.
- [ ] Non-administrators cannot retrieve the administrative user list.
- [ ] Authentication secrets, tokens and password information are never exposed.
- [ ] Loading, empty, no-results and error states are handled.
- [ ] The page works on desktop, tablet and mobile layouts.
- [ ] The page can be operated using a keyboard.
- [ ] Status information is not communicated through colour alone.
- [ ] Automated tests cover the main admin user-management behaviour.
- [ ] Existing tests continue to pass.
- [ ] Relevant API/documentation is updated if the backend contract changes.
- [ ] CI passes.

---

# Suggested Automated Tests

## Frontend

Verify that:

- administrator user data is rendered;
- email addresses are displayed;
- role badges/statuses are displayed correctly;
- search filters users correctly;
- role filtering works;
- submitter-state filtering works;
- loading state renders;
- API error state renders;
- empty results are handled;
- administrative actions invoke the expected workflow.

## Backend / API

Verify that:

- administrators can retrieve the user list;
- viewers receive an authorization error;
- submitters receive an authorization error;
- returned users contain the expected safe fields;
- sensitive authentication information is not returned;
- invalid role/scope changes are rejected;
- valid administrative updates continue to work.

---

# Out of Scope

This issue should **not**:

- replace the authentication provider;
- implement custom authentication;
- redesign unrelated admin pages;
- introduce a new general-purpose animation framework;
- expose Supabase/admin credentials to the frontend;
- allow non-administrators to enumerate registered users;
- refactor unrelated backend architecture.

---

## Definition of Done

This issue is complete when the redesigned page is functional, responsive and accessible; administrator authorization is enforced server-side; automated tests pass; CI passes; the change has been reviewed through the normal Git/PR workflow; and any changed API behaviour is documented.

---

### Suggested issue title

**`Revamp Admin Manage Users page and improve user management UX`**

I’d put this at **High priority for Sprint 2**, because it strengthens a real core workflow and gives you good evidence for **Core Features, Automated Testing, UX, Accessibility, Responsiveness and Bug/Work Tracker usage** rather than spending the effort on Three.js alone. The Sport Analytics brief specifically expects approved-user management around submitted statistics, so a strong admin workflow is well aligned with the product. `sport_analytics (1).pdf`

**One change I strongly recommend:** keep the Three.js part under **Optional Enhancements**, exactly as above. That stops Codex/team members from burning half the issue creating a spinning 3D football while the actual admin table is still painful to use.

## Prompt:
8/31/2026, 9:34:58 PM

make an md

## Response:
8/31/2026, 9:35:03 PM

Done: [Download the Markdown issue](sandbox:/mnt/data/revamp-admin-manage-users.md)

## Prompt:
8/31/2026, 9:36:14 PM

give me the tags

## Response:
8/31/2026, 9:36:22 PM

For this issue, I’d use:

`enhancement`, `frontend`, `admin`, `ux`, `accessibility`, `responsive`, `testing`, `security`, `sprint-2`, `high-priority`

If you want a tighter set, use just:

`enhancement`, `frontend`, `admin`, `ux`, `sprint-2`, `high-priority`

I would **not** add `three.js` unless you actually decide to implement it, since it’s only an optional enhancement in the issue.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)