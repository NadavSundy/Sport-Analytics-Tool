# Security Policy

## Reporting security issues

Do not publish credentials, access tokens, private keys, vulnerable production URLs, or exploitable security details in public Gitea issues. Report security-sensitive findings directly to the team and lecturer/client through an agreed private channel, then create a sanitised tracking issue if required.

## Repository rules

- Never commit `.env` files or production secrets.
- Commit only `.env.example` files containing safe placeholder values.
- Use an established authentication provider or library; do not implement authentication primitives from scratch.
- Validate input at every HTTP boundary.
- Authorise each protected operation on the backend.
- Apply least privilege to database and deployment credentials.
- Keep frontend data access behind the hand-written backend API.
- Log security-relevant failures without logging passwords, tokens, or unnecessary personal data.
- Review dependencies and deployment configuration before each milestone.

The detailed security design will evolve in [`docs/security/overview.md`](docs/security/overview.md).
