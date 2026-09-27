# Issue #608 API deprecation lifecycle transcript summary

## Scope

Codex[GPT-5] inspected the live Gitea issue and dependencies, the existing API
versioning/deprecation policy, OpenAPI contract, backend response path, recent
merged PR #755, and the repository AI-evidence convention.

The live tracker showed #608 assigned to GabeRaz. #598 was open and initially
blocked implementation; the user explicitly authorized proceeding despite that
gate. #612 remains an open deployed user-feedback closure gate and does not
block technical implementation or automated testing.

## Work performed

The existing public fixture-event JSON export was selected because its existing
consumer-key equivalent is a real route with the same response model. Focused
contract tests were added first for the deprecated response, successor Link,
unaffected v1 health response, OpenAPI metadata, and invalid replacement
configuration. The pre-implementation run failed because the lifecycle module
did not exist; the isolated worktree also required the repository lockfile
installation.

The implemented middleware validates static deprecation mappings and emits RFC
9745 `Deprecation: ?1` plus an RFC 8288 `successor-version` Link. The Link
substitutes path parameters and preserves the request query string. No Sunset
date was added because none has been approved. The OpenAPI operation, single
authoritative policy, consumer example, and gap analysis were updated.

## Verification status

The focused lifecycle contract test passed 4/4 after implementation. Remaining
repository checks and their exact outcomes are recorded in the final evidence
commit. No manual or deployed testing was performed in this work.

## Safety review

This summary contains no credentials, tokens, cookies, personal information,
or internal service values.
