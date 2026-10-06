# Final Submission Reference

This page provides a concise verification-oriented index for the final release of Stat'sTheGame.

It does not replace the normal product, architecture, testing or deployment documentation. Those
sections remain the primary explanation of the system. This page brings together the final
release-specific evidence and verification material that is most useful when reviewing the completed
project.

## Final review path

| Review area                                 | Primary reference                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Product capabilities and public API         | [Product & API](product-and-api.md)                                                              |
| Architecture, database and security         | [Architecture, Data & Security](architecture-and-data.md)                                        |
| Final database implementation state         | [Final Database Audit](database/final-audit.md)                                                  |
| Final API implementation state              | [Final API Audit](api/final-audit.md)                                                            |
| Automated testing, coverage and performance | [Testing & Quality](testing/index.md)                                                            |
| Final technical verification procedures     | [Final System Verification Bank](testing/final-system-verification.md)                           |
| Deployment and CI/CD                        | [Deployment & CI/CD](deployment/overview.md)                                                     |
| Project and Git methodology                 | [Methodology](process/methodology-overview.md)                                                   |
| Formal user-testing outcomes                | [User Testing Overview](testing/user-testing-overview.md)                                        |
| Requirements and rubric traceability        | [Final Requirements and Rubric Traceability](planning/final-requirements-rubric-traceability.md) |
| Project records and retained evidence       | [Project Records & Evidence](process/index.md)                                                   |

## Verification principle

Final-release claims should be based on retained implementation, test, deployment or user-facing
evidence rather than on issue or Pull Request state alone.

Where a final check has not yet been completed, the relevant page should record that state explicitly
instead of presenting an intended or historical result as current verification.

The detailed verification bank is intentionally retained as a complete execution reference. This page
is the shorter entry point for reviewers who need to understand where the relevant evidence is located.

## Known limitations and final-release checks

The authoritative final status of partial, non-implemented and out-of-scope capabilities is maintained
in the [Final Requirements and Rubric Traceability](planning/final-requirements-rubric-traceability.md).

Before the release is tagged for submission, the team should also confirm:

- the released commit SHA;
- the deployed frontend, backend and worker revisions;
- the final required CI and smoke-test result;
- the final disposition of unresolved user-testing findings;
- any remaining known technical or product limitations; and
- that the documentation accurately reflects the released implementation.

These checks are release verification activities. They should not be marked complete until the
corresponding evidence has been observed or retained.

## Detailed and historical material

Long-form architecture records, original planning material, operational recovery notes, testing
procedures and other supporting records remain available through
[Reference & Historical Records](process/reference-and-history.md).

This preserves the full development record without requiring those pages to occupy the primary
product-documentation path.

## AI Declaration

The final-submission documentation index and review structure were planned and drafted with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
