# Issue #648 — Coverage orchestration and hosted stability

## Request

Restructure repository-wide coverage so it does not block quality/deployment, runs as a late evidence stage, and reduce timing-sensitive frontend coverage failures observed on the hosted Gitea runner.

## Assistance provided

ChatGPT-Web[GPT-5.6 Sol] reviewed the existing Issue #578 coverage architecture and prepared a test-first change covering late job ordering, non-blocking hosted coverage status capture, badge-publication safety, rejection of both coverage-only worker limits and retry masking after neither stabilised the frontend failures, production-source coverage routing, local-CI ordering, documentation and validation evidence.

## Human verification required

The student must review the generated diff, run the focused CI regression tests, strict documentation and whitespace checks, then verify hosted job ordering and frontend coverage repeatability before closing Issue #648.
