# Sport Analytics Tool (Stat'sTheGame)

Stat'sTheGame is an event-driven **T20 cricket analytics platform**. It accepts validated cricket
events, derives statistics from the accepted event record, and exposes the published data through a
versioned handwritten HTTP API.

## Choose a path

| I want to…                                                      | Start here                                        |
| --------------------------------------------------------------- | ------------------------------------------------- |
| Run the project locally                                         | [Getting Started](getting-started.md)             |
| Use or understand the public API                                | [Product & API](product-and-api.md)               |
| Understand the architecture, database or security model         | [Architecture & Data](architecture-and-data.md)   |
| Contribute code or documentation                                | [Development](development/index.md)               |
| Understand hosting, recovery or deployment                      | [Deployment & Operations](deployment/overview.md) |
| Review automated testing, coverage, performance or user testing | [Testing & Quality](testing/index.md)             |
| Review Sprint, stakeholder, decision or AI-use evidence         | [Project Process & Evidence](process/index.md)    |

## What is implemented

The current platform includes scoped authenticated submission, staged batch ingestion and review,
public competition/season/fixture/event/team/player reads, event-derived fixture and participant
statistics, JSON/CSV exports, versioned dataset releases, consumer API controls, and the runtime
weather integration. The detailed implemented route surface is maintained in the
[API overview](api/overview.md), while later-tier and planned areas remain identified there rather
than being presented as completed features.

## Core project boundary

The React frontend uses the handwritten Express backend for application-domain data. The backend owns
validation, authorisation, business rules, database access, external API calls and published API
behaviour. Shared contracts support consistency but do not replace backend validation. Generated
Supabase data endpoints are not used as the application API.

For the component-level view, read [Architecture & Data](architecture-and-data.md). For a clean local
checkout, start with [Getting Started](getting-started.md).

## Documentation and evidence

The public MkDocs site explains the product and engineering decisions. Version-controlled evidence
under `evidence/` demonstrates planning, stakeholder interaction, testing, decisions and AI use.
Evidence is linked from the documentation rather than copied into normal pages so the retained source
remains authoritative.

Start with [Project Process & Evidence](process/index.md) when reviewing assessment evidence.

## AI Declaration

The documentation homepage and human-oriented reader paths were reorganised with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
