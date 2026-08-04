# Sport Analytics Tool

The Sport Analytics Tool is an event-driven platform for validated sports data, traceable derived statistics, public datasets, and a versioned hand-written HTTP API.

## Documentation status

This site currently documents the project foundation and intended boundaries. Pages must be updated as decisions and implementations are approved. A page describing a planned component is not evidence that the component has been implemented.

## Start here

- [Architecture overview](architecture/overview.md)
- [Repository structure](architecture/repository-structure.md)
- [Local setup](development/setup.md)
- [Git methodology](git-methodology.md)
- [Project methodology](project_methodology.md)
- [Testing strategy](development/testing.md)
- [AI usage](ai/usage.md)

## Core project boundary

The React frontend communicates with the Node.js backend through HTTP. The backend owns validation, authorisation, business rules, database access, external API calls, and published API behaviour. Shared contracts support consistency but do not replace backend validation.
