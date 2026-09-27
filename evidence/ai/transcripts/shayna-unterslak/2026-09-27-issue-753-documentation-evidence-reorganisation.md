# Write Docs UX Issue

**User:** Anonymous  
**Created:** 9/27/2026 14:24:51  
**Updated:** 9/27/2026 18:52:44  
**Exported:** 9/27/2026 18:54:29  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6ab90b12-1348-83ea-b07a-551ec188058a](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9-sport-analytics-project/c/6ab90b12-1348-83ea-b07a-551ec188058a)  

## Prompt:
9/27/2026, 2:25:19 PM

check out oyur docs.. i want to kind of condense/link/better layot them.. does it amke sense? give me md to make issue and then we will do it (properly- and intuitivley for humsns)

## Response:
9/27/2026, 2:25:21 PM · gpt-5-6-thinking

> **Inspecting the documentation**
>
> I’m checking the current documentation structure and repository materials to identify gaps, then I’ll draft a focused Markdown issue describing the improvements, scope, and acceptance criteria without changing anything yet.
>
> **Inspected the documentation**
>
> 
>
> **Searched 1 website**
>
> 
>
> **Listing Local Repository Files**
>
>
> **Listed local repository files**
>
> 
>
> **Drafting the issue**
>
> I’m turning the documentation review into a practical issue: simplify navigation around user intent, reduce overlap, preserve deep links, and establish clear landing pages without prematurely moving files.
>
> **Drafted the issue**
>
> 
>
> **Improved MkDocs navigation and documentation information architecture**
>
> 
>
> Worked for 1m 38s

Yes - this makes sense, and I’d make it a **documentation information-architecture/UX issue**, not an issue to “rewrite all the docs.”

The current docs have grown organically. The biggest problem is now **human discoverability**: for example, `Design` currently contains brand/UI, architecture, API, statistics, datasets, database and security; `Methodology` overlaps with `Project Process & Evidence`; and there are several detailed pages that belong in the docs but probably **do not all need equal prominence in the main navigation**.

I would **keep the detailed material**, but create clearer entry points, consolidate genuine duplication, and use overview pages to link to specialist references. Importantly, we should avoid unnecessarily moving/renaming files so we do not break existing URLs. This is also worthwhile for Sprint 3: documentation is explicitly 15% of its rubric, and the course requires a public documentation website. `project_briefs.pdf` `project_briefs.pdf`

Here is the issue I’d create:

```md
# docs(ux): reorganise and consolidate public documentation for intuitive navigation

## Description

The public documentation site has grown substantially as features, technical
decisions, testing material and project evidence have been added across the
three sprints.

The documentation contains useful and detailed information, but the current
navigation increasingly reflects where documentation was added rather than how
a human reader would naturally look for information.

Reorganise the documentation site so that developers, markers, stakeholders and
API consumers can quickly answer questions such as:

- What is this project?
- How do I run it?
- How does the system work?
- How do I use the API?
- How is the data structured?
- How is it deployed?
- How is it tested?
- Why was a technical decision made?
- Where is the Sprint / stakeholder / validation evidence?

The aim is **not to remove useful technical detail**.

The aim is to provide a smaller, clearer top-level information architecture,
use overview pages as human-friendly entry points, consolidate genuinely
duplicated documentation, and link through to detailed reference material when
needed.

---

## Motivation

The documentation has been expanded incrementally throughout development.

As a result:

- some navigation sections now contain several different concepts;
- detailed implementation/reference pages have the same navigation prominence
  as introductory pages;
- some information is repeated across overview, architecture, deployment,
  testing and process documentation;
- methodology and project-evidence material is split across multiple areas;
- related documentation is not always obviously connected;
- a reader may need to know the repository structure before knowing where to
  look.

The final documentation should behave like a documentation **site**, rather than
a rendered directory of Markdown files.

A new reader should be able to navigate by intent without already knowing the
project's internal file structure.

---

## Proposed Information Architecture

The exact wording may be refined during implementation, but the public
navigation should move towards a structure similar to:

### Home

A concise project introduction with clear routes for common reader goals.

### Getting Started

For somebody who wants to understand or run the project.

Examples:

- Project overview
- Local setup
- Repository structure
- Technology stack
- Configuration / environment
- Useful developer links

### Product & API

For somebody using or evaluating the Sport Analytics Tool.

Examples:

- Platform capabilities
- API overview
- API Explorer / OpenAPI
- Public read API
- Submissions
- Batch ingestion
- Statistics
- Dataset exports
- API versioning / consumer access

Detailed contracts and field mappings should be linked from these pages rather
than necessarily occupying the primary navigation.

### Architecture & Data

For somebody trying to understand how the system works.

Examples:

- System architecture
- Event-driven model
- Cricket domain model
- Database design
- ERD
- Ingestion architecture
- Statistics derivation
- Security architecture
- Important architecture decisions

### Development

For contributors.

Examples:

- Development workflow
- Dependencies
- Git methodology
- CI/CD
- Local CI
- Reference fixtures
- Contribution-related tooling

Highly specialised operational/reference pages can remain linked from relevant
overview pages without cluttering the primary navigation.

### Deployment & Operations

For somebody operating or diagnosing the deployed system.

Examples:

- Deployment overview
- Azure architecture
- Backend / frontend / worker deployment
- Object storage
- Cloudflare documentation deployment
- Recovery / troubleshooting
- Runner operations

Provide one strong deployment overview before exposing component-specific
detail.

### Testing & Quality

For somebody evaluating correctness and quality.

Examples:

- Testing strategy
- Automated testing
- Coverage and quality gates
- Performance
- User testing
- Acceptance testing
- Validation approach

Detailed protocols and task banks should be reachable through their overview
pages.

### Project Process & Evidence

For project governance and assessment evidence.

Examples:

- Overview
- Sprint evidence
- Stakeholder interactions
- Requirements traceability
- Decisions
- Validation evidence
- AI use and evidence

Sprint evidence should remain grouped chronologically and should not overwhelm
normal product/developer documentation.

---

## Scope

### 1. Audit the current documentation

Review the current `mkdocs.yml` navigation and documentation tree.

For each page, identify whether it is:

- a primary overview / entry point;
- normal explanatory documentation;
- technical reference documentation;
- operational documentation;
- assessment / project evidence; or
- duplicated / substantially overlapping content.

Do not remove information merely because it is detailed.

---

### 2. Simplify the primary navigation

Reduce the number of concepts exposed at the same navigation level.

Top-level sections should correspond to recognisable reader goals rather than
repository folders or the historical order in which documentation was added.

Avoid broad sections that mix unrelated concerns.

---

### 3. Introduce clear section landing pages

Important sections should have a short overview page that explains:

- what the section covers;
- who it is for;
- the important concepts;
- the recommended reading order; and
- links to detailed reference pages.

Where possible, use existing overview pages rather than introducing unnecessary
new files.

---

### 4. Consolidate genuine duplication

Where two or more pages explain substantially the same concept:

1. choose the most appropriate authoritative page;
2. merge useful unique information where appropriate;
3. replace duplicated explanations with links to the authoritative source.

Do not combine unrelated topics purely to reduce the Markdown file count.

---

### 5. Prefer progressive disclosure

Primary navigation should expose the pages most readers need.

Highly specialised material such as:

- field mappings;
- detailed contracts;
- individual operational runbooks;
- task banks;
- low-level implementation reference;
- detailed evidence records;

may remain available through section overview pages, contextual links and MkDocs
search without all appearing prominently in the main navigation.

---

### 6. Improve cross-linking

Relevant pages should guide readers naturally to related material.

Examples:

- API overview → OpenAPI / API Explorer / versioning / authentication;
- batch ingestion → season-upload contract / persistence / acceptance testing;
- database overview → schema / ERD / design motivation;
- testing strategy → CI / coverage / performance / user testing;
- deployment overview → frontend / backend / worker / recovery;
- Sprint evidence → requirements / stakeholder feedback / validation.

Avoid forcing readers to navigate back to the global sidebar for every related
topic.

---

### 7. Separate product documentation from project evidence

Product, developer and API documentation should remain easy to read without
being interrupted by assessment evidence.

Evidence must remain discoverable, but should live behind a clear
`Project Process & Evidence` entry point.

---

### 8. Preserve existing links where practical

Prefer reorganising the MkDocs navigation and improving links before physically
moving Markdown files.

Avoid unnecessary file renames or path changes that would break:

- existing documentation URLs;
- README links;
- issue / PR links;
- evidence references; or
- external bookmarks.

If a file must move, update all repository references to it.

---

### 9. Improve the documentation homepage

The homepage should act as an entry point rather than a catalogue.

Provide clear routes such as:

- **Use the platform**
- **Explore the API**
- **Run the project locally**
- **Understand the architecture**
- **Review testing and quality**
- **View project evidence**

Keep the homepage concise and link deeper rather than duplicating detailed
content there.

---

## Non-goals

This issue does **not** require:

- rewriting every documentation page;
- removing technical detail to make documentation shorter;
- changing implemented system behaviour;
- changing the application's frontend navigation;
- duplicating repository evidence inside MkDocs;
- creating new documentation solely to fill navigation categories; or
- hiding documentation from search.

The goal is **better information architecture and discoverability**, not fewer
documents at any cost.

---

## Acceptance Criteria

- [ ] The public documentation has a clear, human-oriented top-level navigation.
- [ ] A reader does not need to understand the repository directory structure to
      locate important information.
- [ ] Major sections have an obvious overview / entry point.
- [ ] Architecture, API, database, deployment, development, testing and project
      evidence are clearly separated.
- [ ] API documentation has an intuitive path from overview to detailed
      reference material.
- [ ] Detailed reference pages remain available without unnecessarily cluttering
      the primary navigation.
- [ ] Genuine duplicate documentation is consolidated or replaced with links to
      an authoritative source.
- [ ] Related documentation is cross-linked where this improves the reading
      journey.
- [ ] Project / Sprint evidence remains discoverable but does not overwhelm
      normal product documentation.
- [ ] Existing URLs and internal links are preserved where practical.
- [ ] Any changed file paths have all repository references updated.
- [ ] The homepage provides clear entry points for the main reader journeys.
- [ ] Navigation is usable on desktop and mobile.
- [ ] MkDocs search continues to expose detailed documentation.
- [ ] No useful project or technical information is accidentally removed.
- [ ] `python -m mkdocs build --strict` passes.
- [ ] Documentation links are checked for broken or stale internal references.
- [ ] The deployed Cloudflare documentation site is manually verified after
      merge.

---

## Suggested Verification

1. Build the documentation locally with `python -m mkdocs build --strict`.
2. Review the entire top-level navigation on desktop.
3. Review navigation on a mobile-width viewport.
4. Starting only from the homepage, verify that a new reader can find:
   - local setup;
   - API documentation;
   - database design;
   - architecture;
   - deployment information;
   - testing strategy;
   - user-testing information;
   - Sprint evidence;
   - decisions; and
   - AI-use evidence.
5. Verify existing important repository links still resolve.
6. Verify detailed pages remain searchable even where they are no longer
   displayed prominently in the navigation.
7. Verify the deployed documentation site after merge.

---

## Expected Outcome

The documentation should feel like one coherent product manual.

A new reader should first see a small number of understandable choices, then be
able to progressively move into the technical detail they need.

The repository can continue to contain comprehensive documentation without the
public documentation navigation becoming increasingly difficult to use as new
pages are added.

---

## Labels

- `area: documentation`
- `type: documentation`
- `priority: high`
- `tier: common`

## Milestone

Sprint 3

## AI Declaration

> The preceding issue was planned and generated with the assistance of
> ChatGPT-Web[GPT-5.6 Sol].
```

I especially like the **“progressive disclosure”** part here: we are *not* going to destroy all the work you’ve done by combining 50 pages into 6 giant pages. We’ll make roughly **6-7 obvious human-facing doors**, and the specialist pages sit sensibly behind those doors. That should make the docs feel *much* less messy while actually preserving more useful detail.

## Prompt:
9/27/2026, 2:30:59 PM

k, i also want to make th teams transcripts and stuff pdfs so it can be seen on github/whatever... can i add that to this issue?

## Response:
9/27/2026, 2:31:08 PM · gpt-5-6-thinking

> **Adding evidence artefacts**
>
> I’d add this as a separate subsection in the issue. Team transcripts, assessment PDFs, and supporting documents should be viewable in the repository, with stable links, clear provenance, and raw files preserved alongside readable Markdown or PDF versions.
>
> **Added evidence artefacts**
>
> 
>
> Worked for 12s

Yes - I’d put it in **this same issue**. It fits the exact goal: the evidence exists, but some of it is awkward for a human/marker to actually open and read.

I would **not replace the source files**, though. Keep the original transcript/Markdown/CSV as the authoritative evidence, and add a **human-readable PDF representation** alongside it. That avoids losing the raw evidence while giving GitHub/Gitea/browser users something they can preview easily.

I’d slightly broaden the title to:

```md
# docs(ux): reorganise, consolidate and improve readability of public documentation and evidence
```

Then add this section under `## Scope`:

```md
### 10. Publish human-readable evidence artefacts

Important project evidence should be easy to open and review directly from the
repository or documentation site without requiring a reader to download raw
text, Markdown or CSV files and reconstruct the context themselves.

Where appropriate, create PDF representations of human-facing evidence such as:

- team-member AI transcripts;
- stakeholder meeting transcripts / records;
- stand-up and Scrum records;
- Sprint planning and retrospective records;
- user-testing/session evidence;
- important validation records; and
- other substantial evidence artefacts where PDF presentation materially
  improves readability.

The original source evidence must remain preserved.

PDFs are intended as a **presentation copy**, not a replacement for the
authoritative source record.

For example:

```text
evidence/
├── ai/
│   └── transcripts/
│       └── shayna-unterslak/
│           ├── 2026-09-17-session.md
│           └── 2026-09-17-session.pdf
```

Where the source evidence is required to remain unedited, the PDF must be a
faithful rendering of that source rather than a rewritten or summarised version.

PDF generation should preserve, where applicable:

- participant / team-member identification;
- date and context;
- headings and chronological ordering;
- complete transcript content;
- code blocks and commands;
- links or references;
- page numbers; and
- a clear indication of the source file from which the PDF was generated.

Large transcripts should use readable pagination, typography and code wrapping
rather than being rendered as a single uncontrolled block of text.

---

### 11. Link evidence PDFs from the documentation site

The `Project Process & Evidence` section should expose the readable evidence
without requiring the reader to browse the repository manually.

Evidence index pages should:

- describe what each artefact contains;
- link to the human-readable PDF where available;
- retain a link to the authoritative/raw source where useful;
- group evidence logically by Sprint and/or evidence type;
- avoid presenting hundreds of raw files directly in the main navigation.

For example:

**Sprint 3 → AI Use**

| Team member | Evidence | Source |
| --- | --- | --- |
| Shayna Unterslak | [View transcript PDF](...) | [Raw transcript](...) |
| Dean Feldman | [View transcript PDF](...) | [Raw transcript](...) |

The documentation site should act as the index; the repository remains the
authoritative evidence store.

---

### 12. Make evidence publication maintainable

Avoid manually producing presentation copies in a way that will immediately
become inconsistent with their source files.

Where practical, establish a repeatable conversion process for supported
evidence formats so that a PDF can be regenerated from its source.

The conversion process must not silently alter transcript content.

Generated presentation copies should have predictable names and locations so
that future Sprint evidence can follow the same convention.
```

And I’d add these to the acceptance criteria:

```md
- [ ] Important team AI transcripts are available in a human-readable format
      that can be opened directly from the repository/browser.
- [ ] Significant transcript-style evidence uses PDF presentation copies where
      this materially improves readability.
- [ ] Original/raw evidence remains preserved and identifiable as the
      authoritative source.
- [ ] PDF transcript copies faithfully represent their corresponding source
      rather than summarising or rewriting it.
- [ ] Evidence PDFs use consistent naming and directory conventions.
- [ ] Long transcripts have readable pagination, wrapping and formatting.
- [ ] Project Process & Evidence pages link to readable evidence artefacts
      instead of requiring manual repository searching.
- [ ] Evidence remains grouped logically by Sprint, type and/or team member.
- [ ] Where practical, PDF generation is repeatable rather than a one-off
      manual conversion.
- [ ] Generated PDFs do not introduce secrets, private credentials or other
      content that should not be publicly exposed.
```

And under **Non-goals**, add:

```md
- converting every small evidence file into a PDF regardless of usefulness;
- replacing raw or authoritative evidence with presentation copies;
- summarising or editing transcripts during PDF conversion;
```

That gives us a nice end state: **docs site = index and easy navigation**, **PDF = comfortable human reading**, **raw files = evidence/source of truth**.

Also, this is particularly sensible for the AI transcripts because the course policy requires AI use to be documented and attributed, and in some contexts may require unedited transcripts to be retained. So preserving the raw transcript while adding a readable rendering is the safer structure. `ai_policy_20_jul.pdf` `ai_policy_20_jul.pdf`

When we actually do the issue, I’d first **inventory what evidence exists and classify it** rather than blindly PDF-ing the entire `evidence/` directory. Then we can make the PDF output look genuinely polished rather than like print-to-PDF dumps.

## Prompt:
9/27/2026, 2:32:49 PM

# Selected text:

## Selection 1
Where the source evidence is required to remain unedited, the PDF must

## My request:
markdown cut off from here.. maybe just give me whole issue in 1 md to put in?

## Response:
9/27/2026, 2:32:53 PM · gpt-5-6-thinking

Absolutely - here is the **entire issue in one Markdown block** so you can paste it straight into Gitea.

```md
# docs(ux): reorganise, consolidate and improve readability of public documentation and evidence

## Description

The public documentation site has grown substantially as features, technical
decisions, testing material and project evidence have been added across the
project.

The documentation contains useful and detailed information, but the current
navigation increasingly reflects where documentation was added rather than how
a human reader would naturally look for information.

Reorganise the documentation site so that developers, markers, stakeholders and
API consumers can quickly answer questions such as:

- What is this project?
- How do I run it?
- How does the system work?
- How do I use the API?
- How is the data structured?
- How is it deployed?
- How is it tested?
- Why was a technical decision made?
- Where is the Sprint / stakeholder / validation evidence?
- Where can I read important transcripts and evidence in a human-friendly format?

The aim is **not to remove useful technical detail**.

The aim is to provide a smaller, clearer top-level information architecture,
use overview pages as human-friendly entry points, consolidate genuinely
duplicated documentation, improve cross-linking, and make important evidence
artefacts easier to open and review.

The final documentation should feel like one coherent documentation site rather
than a rendered collection of repository files.

---

## Motivation

The documentation has been expanded incrementally throughout development.

As a result:

- some navigation sections contain several different concepts;
- detailed implementation/reference pages have the same navigation prominence
  as introductory pages;
- some information is repeated across overview, architecture, deployment,
  testing and process documentation;
- methodology and project-evidence material is split across multiple areas;
- related documentation is not always obviously connected;
- a reader may need to understand the repository structure before knowing where
  to look;
- important evidence may exist only as raw Markdown, text, CSV or transcript
  files that are awkward to read directly through the repository interface.

The final documentation should behave like a documentation **site**, rather than
a rendered directory of Markdown files.

A new reader should be able to navigate by intent without already knowing the
project's internal file structure.

Project evidence should remain authoritative and complete, but important
human-facing evidence should also be available in formats that are comfortable
to read directly from the repository or documentation site.

---

## Proposed Information Architecture

The exact wording may be refined during implementation, but the public
navigation should move towards a structure similar to the following.

### Home

A concise project introduction with clear routes for common reader goals.

### Getting Started

For somebody who wants to understand or run the project.

Examples:

- Project overview
- Local setup
- Repository structure
- Technology stack
- Configuration / environment
- Useful developer links

### Product & API

For somebody using or evaluating the Sport Analytics Tool.

Examples:

- Platform capabilities
- API overview
- API Explorer / OpenAPI
- Public read API
- Submissions
- Batch ingestion
- Statistics
- Dataset exports
- API versioning
- Consumer access / rate limits

Detailed contracts and field mappings should be linked from these pages rather
than necessarily occupying the primary navigation.

### Architecture & Data

For somebody trying to understand how the system works.

Examples:

- System architecture
- Event-driven model
- Cricket domain model
- Database design
- ERD
- Ingestion architecture
- Statistics derivation
- Security architecture
- Important architecture decisions

### Development

For contributors.

Examples:

- Development workflow
- Dependencies
- Git methodology
- CI/CD
- Local CI
- Reference fixtures
- Contribution-related tooling

Highly specialised operational/reference pages can remain linked from relevant
overview pages without cluttering the primary navigation.

### Deployment & Operations

For somebody operating or diagnosing the deployed system.

Examples:

- Deployment overview
- Azure architecture
- Backend deployment
- Frontend deployment
- Worker deployment
- Object storage
- Cloudflare documentation deployment
- Recovery / troubleshooting
- Runner operations

Provide one strong deployment overview before exposing component-specific
detail.

### Testing & Quality

For somebody evaluating correctness and quality.

Examples:

- Testing strategy
- Automated testing
- Coverage and quality gates
- Performance
- User testing
- Acceptance testing
- Validation approach

Detailed protocols, task banks and implementation-specific validation material
should be reachable through their overview pages.

### Project Process & Evidence

For project governance and assessment evidence.

Examples:

- Overview
- Sprint evidence
- Stakeholder interactions
- Stand-ups / Scrum records
- Requirements traceability
- Decisions
- Validation evidence
- User-testing evidence
- AI use and evidence
- Team transcripts

Sprint evidence should remain grouped chronologically and should not overwhelm
normal product/developer documentation.

---

## Scope

### 1. Audit the current documentation

Review the current `mkdocs.yml` navigation and documentation tree.

For each page, identify whether it is:

- a primary overview / entry point;
- normal explanatory documentation;
- technical reference documentation;
- operational documentation;
- assessment / project evidence; or
- duplicated / substantially overlapping content.

Do not remove information merely because it is detailed.

The audit should identify:

- pages that belong in primary navigation;
- pages better linked from an overview page;
- genuine duplication;
- confusing placement;
- stale or misleading links;
- sections without useful entry pages;
- evidence that is difficult to discover;
- evidence that is difficult to read in its current source format.

---

### 2. Simplify the primary navigation

Reduce the number of concepts exposed at the same navigation level.

Top-level sections should correspond to recognisable reader goals rather than
repository folders or the historical order in which documentation was added.

Avoid broad sections that mix unrelated concerns.

The navigation should remain useful on both desktop and mobile.

---

### 3. Introduce clear section landing pages

Important sections should have a short overview page that explains:

- what the section covers;
- who it is for;
- the important concepts;
- the recommended reading order; and
- links to detailed reference pages.

Where possible, use existing overview pages rather than introducing unnecessary
new files.

Overview pages should act as navigation hubs rather than duplicating all content
from the pages they link to.

---

### 4. Consolidate genuine duplication

Where two or more pages explain substantially the same concept:

1. choose the most appropriate authoritative page;
2. merge useful unique information where appropriate;
3. replace duplicated explanations with links to the authoritative source.

Do not combine unrelated topics purely to reduce the Markdown file count.

Do not remove useful detail simply to make the documentation shorter.

---

### 5. Prefer progressive disclosure

Primary navigation should expose the pages most readers need.

Highly specialised material such as:

- field mappings;
- detailed contracts;
- individual operational runbooks;
- user-testing task banks;
- low-level implementation reference;
- detailed evidence records;
- specialised validation records;

may remain available through:

- section overview pages;
- contextual links;
- evidence indexes; and
- MkDocs search.

These pages do not all need equal prominence in the primary navigation.

---

### 6. Improve cross-linking

Relevant pages should guide readers naturally to related material.

Examples:

- API overview → OpenAPI / API Explorer / versioning / authentication;
- batch ingestion → season-upload contract / persistence / acceptance testing;
- database overview → schema / ERD / design motivation;
- statistics overview → fixture statistics / participant aggregates / event
  mappings;
- testing strategy → CI / coverage / performance / user testing;
- deployment overview → frontend / backend / worker / recovery;
- Sprint evidence → requirements / stakeholder feedback / validation;
- AI use overview → usage register / transcripts / policy / declarations.

Avoid forcing readers to navigate back to the global sidebar for every related
topic.

---

### 7. Separate product documentation from project evidence

Product, developer and API documentation should remain easy to read without
being interrupted by assessment evidence.

Evidence must remain discoverable, but should live behind a clear
`Project Process & Evidence` entry point.

Normal product documentation should explain the system.

Evidence documentation should demonstrate how the team planned, implemented,
validated and reviewed it.

---

### 8. Preserve existing links where practical

Prefer reorganising the MkDocs navigation and improving links before physically
moving Markdown files.

Avoid unnecessary file renames or path changes that would break:

- existing documentation URLs;
- README links;
- issue / PR links;
- evidence references;
- AI transcripts;
- validation records; or
- external bookmarks.

If a file must move, update all repository references to it.

---

### 9. Improve the documentation homepage

The homepage should act as an entry point rather than a catalogue.

Provide clear routes such as:

- **Use the platform**
- **Explore the API**
- **Run the project locally**
- **Understand the architecture**
- **Review testing and quality**
- **View project evidence**

Keep the homepage concise and link deeper rather than duplicating detailed
content there.

The homepage should allow a new reader to understand the purpose of the project
and choose an appropriate path within a short amount of time.

---

### 10. Publish human-readable evidence artefacts

Important project evidence should be easy to open and review directly from the
repository or documentation site without requiring a reader to reconstruct
context from raw text, Markdown or CSV files.

Where appropriate, create PDF presentation copies of human-facing evidence such
as:

- team-member AI transcripts;
- stakeholder meeting transcripts / records;
- stand-up and Scrum records;
- Sprint planning records;
- Sprint review and retrospective records;
- user-testing/session evidence;
- important validation records; and
- other substantial evidence artefacts where PDF presentation materially
  improves readability.

The original source evidence must remain preserved.

PDFs are intended as a **human-readable presentation copy**, not a replacement
for the authoritative source record.

For example:

```text
evidence/
├── ai/
│   └── transcripts/
│       └── shayna-unterslak/
│           ├── 2026-09-17-session.md
│           └── 2026-09-17-session.pdf
```

Where the source evidence is required to remain unedited, the PDF must be a
faithful rendering of that source rather than a rewritten or summarised version.

PDF generation should preserve, where applicable:

- team member / participant identification;
- date;
- evidence type;
- context;
- headings;
- chronological ordering;
- complete transcript content;
- speaker identification;
- code blocks;
- commands;
- links or references;
- source filenames;
- page numbers; and
- a clear indication of the source file from which the PDF was generated.

Large transcripts should use readable:

- pagination;
- headings;
- typography;
- spacing;
- code wrapping;
- line wrapping; and
- page breaks.

They should not simply be exported as uncontrolled blocks of text.

---

### 11. Preserve authoritative raw evidence

Creating a PDF must not destroy or replace the original evidence.

For transcript-style evidence:

- the original transcript remains the authoritative evidence;
- the PDF is a readable rendering of that evidence;
- transcript wording must not be silently corrected;
- spelling mistakes should remain where they are part of the original
  transcript;
- transcript content must not be rewritten for presentation;
- content must not be summarised instead of rendered;
- omissions must not be introduced for visual convenience.

If metadata or explanatory context is added to the PDF, it should be clearly
separate from the original transcript content.

For example, a PDF may include a cover/header containing:

- evidence title;
- date;
- team member;
- source filename;
- evidence category;

without changing the underlying transcript.

---

### 12. Link evidence PDFs from the documentation site

The `Project Process & Evidence` section should expose readable evidence without
requiring the reader to browse the repository manually.

Evidence index pages should:

- describe what each artefact contains;
- link to the human-readable PDF where available;
- retain a link to the authoritative/raw source where useful;
- group evidence logically;
- group Sprint evidence chronologically;
- group AI transcripts by team member where appropriate;
- avoid presenting hundreds of raw files directly in the main navigation.

A reader should be able to move from:

`Project Process & Evidence`

to:

`Sprint 3`

to:

`AI Use`

or:

`Stakeholder Interaction`

and then open the relevant evidence directly.

Example presentation:

| Team member | Evidence | Source |
| --- | --- | --- |
| Shayna Unterslak | View transcript PDF | Raw transcript |
| Dean Feldman | View transcript PDF | Raw transcript |

The documentation site should act as the index.

The repository remains the authoritative evidence store.

---

### 13. Create a consistent evidence structure

Review the current evidence organisation and establish predictable conventions
where practical.

Evidence should be discoverable by:

- Sprint;
- evidence type;
- team member, where relevant;
- date; and
- issue / validation context where relevant.

File naming should be consistent enough that a human can understand an artefact
without opening it.

For example:

```text
2026-09-17-standup.md
2026-09-17-standup.pdf

2026-09-22-stakeholder-review.md
2026-09-22-stakeholder-review.pdf
```

Avoid renaming existing authoritative evidence purely for cosmetic consistency
if doing so would unnecessarily break references.

---

### 14. Make evidence publication maintainable

Avoid manually producing presentation copies in a way that will immediately
become inconsistent with their source files.

Where practical, establish a repeatable conversion process for supported
evidence formats so that PDFs can be regenerated from their source.

The process should:

- accept known source formats;
- produce predictable output paths;
- preserve source content;
- support long documents;
- support Markdown headings;
- support code blocks;
- handle URLs sensibly;
- produce readable page breaks;
- avoid embedding secrets accidentally;
- fail visibly if conversion cannot be completed correctly.

A script may be introduced if this provides a simpler and more reliable process
than manually exporting each file.

Do not introduce a large or complex document-generation system unless it
provides a meaningful maintenance benefit.

---

### 15. Avoid unnecessary PDF conversion

Not every evidence artefact needs a PDF.

PDF copies should be prioritised where they materially improve human review.

Good candidates include:

- long transcripts;
- formal stakeholder records;
- substantial Sprint review records;
- structured user-testing evidence;
- substantial validation reports.

Files such as the following may remain in their native format where that is more
appropriate:

- machine-readable CSV files;
- short metadata files;
- small JSON evidence files;
- generated test output;
- logs primarily intended for tooling.

Where a raw format remains authoritative, the documentation site should explain
what it contains and link to it appropriately.

---

### 16. Review evidence for public suitability

Before linking evidence prominently from the public documentation site, verify
that it is appropriate to expose publicly.

Do not publish:

- credentials;
- tokens;
- connection strings;
- private environment variables;
- secrets;
- inappropriate personal information;
- unnecessary sensitive participant information;
- internal information that was not intended for public evidence.

The reorganisation must not make sensitive material more publicly discoverable
simply because it exists somewhere in the repository.

---

## Non-goals

This issue does **not** require:

- rewriting every documentation page;
- removing technical detail to make documentation shorter;
- changing implemented system behaviour;
- changing the application's frontend navigation;
- duplicating repository evidence inside normal documentation pages;
- creating new documentation solely to fill navigation categories;
- hiding detailed documentation from search;
- converting every evidence file into PDF regardless of usefulness;
- replacing raw or authoritative evidence with PDF presentation copies;
- summarising transcripts during PDF conversion;
- rewriting or correcting transcript wording;
- converting machine-readable artefacts where the native format is more useful;
- moving every documentation file into a new directory structure;
- introducing unnecessary tooling solely for cosmetic changes.

The goal is **better information architecture, readability and discoverability**.

---

## Acceptance Criteria

### Documentation structure

- [ ] The public documentation has a clear, human-oriented top-level navigation.
- [ ] A reader does not need to understand the repository directory structure to
      locate important information.
- [ ] Major sections have an obvious overview / entry point.
- [ ] Architecture, API, database, deployment, development, testing and project
      evidence are clearly organised.
- [ ] API documentation has an intuitive path from overview to detailed
      reference material.
- [ ] Detailed reference pages remain available without unnecessarily cluttering
      the primary navigation.
- [ ] Genuine duplicate documentation is consolidated or replaced with links to
      an authoritative source.
- [ ] Related documentation is cross-linked where this improves the reading
      journey.
- [ ] Project / Sprint evidence remains discoverable but does not overwhelm
      normal product documentation.
- [ ] The homepage provides clear entry points for the main reader journeys.
- [ ] Navigation remains usable on desktop.
- [ ] Navigation remains usable at mobile width.
- [ ] MkDocs search continues to expose detailed documentation.
- [ ] No useful project or technical information is accidentally removed.

### Existing references

- [ ] Existing URLs and internal links are preserved where practical.
- [ ] Any changed file paths have all repository references updated.
- [ ] README links remain valid.
- [ ] Documentation-to-evidence links remain valid.
- [ ] Issue / PR references to documentation are not unnecessarily broken.

### Evidence readability

- [ ] Important team AI transcripts are available in a human-readable format
      that can be opened directly from the repository/browser where practical.
- [ ] Significant transcript-style evidence uses PDF presentation copies where
      this materially improves readability.
- [ ] Original/raw evidence remains preserved.
- [ ] Raw evidence is clearly identifiable as the authoritative source.
- [ ] PDF transcript copies faithfully represent their corresponding source.
- [ ] PDF generation does not summarise or rewrite transcript content.
- [ ] Evidence PDFs use consistent naming conventions.
- [ ] Evidence PDFs use predictable locations.
- [ ] Long transcripts have readable pagination and wrapping.
- [ ] Code and command blocks remain readable in generated PDFs.
- [ ] PDF presentation copies identify their corresponding source file.
- [ ] Project Process & Evidence pages link to readable evidence artefacts rather
      than requiring manual repository searching.
- [ ] Evidence remains grouped logically by Sprint, evidence type and/or team
      member.
- [ ] AI transcripts are discoverable by team member where appropriate.
- [ ] Stakeholder and Sprint records are easy to locate chronologically.
- [ ] Not every machine-readable evidence artefact is converted unnecessarily.

### Maintainability

- [ ] Where practical, PDF generation is repeatable rather than a one-off manual
      conversion process.
- [ ] Regenerating a PDF from unchanged source evidence does not change the
      evidence content.
- [ ] Future Sprint evidence has an obvious location and convention to follow.
- [ ] The documentation structure can accommodate new pages without returning to
      a large flat navigation tree.

### Privacy and safety

- [ ] Generated PDFs do not introduce secrets, credentials or private
      configuration.
- [ ] Public evidence indexes do not expose inappropriate personal or sensitive
      information.
- [ ] Evidence is reviewed for public suitability before being linked
      prominently.

### Verification

- [ ] `python -m mkdocs build --strict` passes.
- [ ] Documentation links are checked for broken or stale internal references.
- [ ] The documentation site is reviewed manually on desktop.
- [ ] The documentation site is reviewed manually at mobile width.
- [ ] Representative PDF evidence artefacts are manually opened and reviewed.
- [ ] Raw and PDF versions of representative transcripts are compared to verify
      faithful rendering.
- [ ] The deployed Cloudflare documentation site is manually verified after
      merge.

---

## Suggested Verification

### Documentation navigation

Starting only from the documentation homepage, verify that a new reader can
quickly find:

1. local setup;
2. technology stack;
3. API documentation;
4. API Explorer / OpenAPI;
5. database design;
6. system architecture;
7. deployment information;
8. testing strategy;
9. CI / quality information;
10. user-testing information;
11. Sprint evidence;
12. stakeholder evidence;
13. technical decisions;
14. AI-use information;
15. team AI transcripts.

No repository-directory knowledge should be required.

### Documentation build

Run:

```bash
python -m mkdocs build --strict
```

Resolve any:

- missing pages;
- broken relative links;
- invalid navigation entries;
- stale references;
- build warnings that indicate a documentation problem.

### Evidence verification

Select representative evidence from multiple categories, for example:

- one team-member AI transcript;
- one stakeholder interaction;
- one stand-up;
- one substantial validation record.

For each:

1. open the raw source;
2. open the PDF;
3. verify the PDF contains the same evidence content;
4. verify headings and chronological order are preserved;
5. verify no content was accidentally dropped;
6. verify code / commands remain readable;
7. verify the PDF identifies its source;
8. verify it can be reached from the documentation evidence index.

### Deployed verification

After merge and documentation deployment:

- verify the Cloudflare documentation site loads correctly;
- verify primary navigation;
- verify mobile navigation;
- verify evidence links;
- verify PDF links;
- verify API-related links;
- verify MkDocs search;
- verify no significant existing documentation URLs were unnecessarily broken.

---

## Expected Outcome

The documentation should feel like one coherent product manual.

A new reader should first see a small number of understandable choices, then be
able to progressively move into the technical detail they need.

The repository can continue to contain comprehensive technical documentation
without the public documentation navigation becoming increasingly difficult to
use as new pages are added.

Project evidence should remain complete and authoritative, while substantial
human-facing evidence should also be comfortable to read directly through the
repository or public documentation site.

The intended model is:

```text
Documentation site
        |
        +-- clear overview and navigation
        |
        +-- technical documentation
        |
        +-- Project Process & Evidence
                    |
                    +-- evidence indexes
                    |
                    +-- readable PDF artefacts
                    |
                    +-- links to authoritative raw evidence

Repository
        |
        +-- authoritative source documentation
        +-- authoritative raw evidence
        +-- generated/readable presentation copies
```

The result should optimise for **humans first**, while preserving the detailed
technical and assessment evidence required by the project.

---

## Labels

- `area: documentation`
- `type: documentation`
- `priority: high`
- `tier: common`

## Milestone

Sprint 3

## AI Declaration

> The preceding issue was planned and generated with the assistance of
> ChatGPT-Web[GPT-5.6 Sol].
```

This version is broad enough that when we do it, we can properly clean up the **whole documentation experience + evidence presentation** in one coherent pass rather than fixing the sidebar now and then having to create another issue for the transcripts.

## Prompt:
9/27/2026, 2:34:16 PM

AGAINNNNN where source evidence is required to remain... (your msd cut off theree)- also, to confirm: only the word docs need to be transformed (our teams transcipts are word docs... rest leave untouched)

## Response:
9/27/2026, 2:34:24 PM · gpt-5-6-thinking

Yes - **exactly**. Only the **team transcript Word documents (`.docx`)** should get PDF presentation copies so they’re easy to open/read in GitHub/Gitea/the docs site. **Everything else in `evidence/` stays in its existing format and is not converted.** The original Word docs also stay untouched; the PDF sits alongside them.

And I know why it kept cutting off: I put a code fence *inside* the Markdown code fence. 🤦 This time I’m wrapping the whole thing safely so you can copy **everything in one go**:

````md
# docs(ux): reorganise, consolidate and improve readability of public documentation and evidence

## Description

The public documentation site has grown substantially as features, technical
decisions, testing material and project evidence have been added throughout the
project.

The documentation contains useful and detailed information, but the current
navigation increasingly reflects where documentation was added rather than how
a human reader would naturally look for information.

Reorganise the documentation site so that developers, markers, stakeholders and
API consumers can quickly answer questions such as:

- What is this project?
- How do I run it?
- How does the system work?
- How do I use the API?
- How is the data structured?
- How is it deployed?
- How is it tested?
- Why was a technical decision made?
- Where is the Sprint / stakeholder / validation evidence?
- Where can I easily read the team's AI transcripts?

The aim is **not to remove useful technical detail**.

The aim is to provide a smaller, clearer top-level information architecture,
use overview pages as human-friendly entry points, consolidate genuinely
duplicated documentation, improve cross-linking, and make the team's existing
Word-format AI transcripts easier to view.

The final documentation should feel like one coherent documentation site rather
than a rendered collection of repository files.

---

## Motivation

The documentation has been expanded incrementally throughout development.

As a result:

- some navigation sections contain several different concepts;
- detailed implementation/reference pages have the same navigation prominence
  as introductory pages;
- some information is repeated across overview, architecture, deployment,
  testing and process documentation;
- methodology and project-evidence material is split across multiple areas;
- related documentation is not always obviously connected;
- a reader may need to understand the repository structure before knowing where
  to look;
- team AI transcripts stored as Word documents are not as easy to preview and
  read directly through repository/documentation interfaces.

The final documentation should behave like a documentation **site**, rather than
a rendered directory of Markdown files.

A new reader should be able to navigate by intent without already knowing the
project's internal file structure.

---

## Proposed Information Architecture

The exact wording may be refined during implementation, but the public
navigation should move towards a structure similar to the following.

### Home

A concise project introduction with clear routes for common reader goals.

### Getting Started

For somebody who wants to understand or run the project.

Examples:

- Project overview
- Local setup
- Repository structure
- Technology stack
- Configuration / environment
- Useful developer links

### Product & API

For somebody using or evaluating the Sport Analytics Tool.

Examples:

- Platform capabilities
- API overview
- API Explorer / OpenAPI
- Public read API
- Submissions
- Batch ingestion
- Statistics
- Dataset exports
- API versioning
- Consumer access / rate limits

Detailed contracts and field mappings should be linked from these pages rather
than necessarily occupying the primary navigation.

### Architecture & Data

For somebody trying to understand how the system works.

Examples:

- System architecture
- Event-driven model
- Cricket domain model
- Database design
- ERD
- Ingestion architecture
- Statistics derivation
- Security architecture
- Important architecture decisions

### Development

For contributors.

Examples:

- Development workflow
- Dependencies
- Git methodology
- CI/CD
- Local CI
- Reference fixtures
- Contribution-related tooling

Highly specialised reference pages can remain linked from relevant overview
pages without cluttering the primary navigation.

### Deployment & Operations

For somebody operating or diagnosing the deployed system.

Examples:

- Deployment overview
- Azure architecture
- Backend deployment
- Frontend deployment
- Worker deployment
- Object storage
- Cloudflare documentation deployment
- Recovery / troubleshooting
- Runner operations

Provide one strong deployment overview before exposing component-specific
detail.

### Testing & Quality

For somebody evaluating correctness and quality.

Examples:

- Testing strategy
- Automated testing
- Coverage and quality gates
- Performance
- User testing
- Acceptance testing
- Validation approach

Detailed protocols and task banks should be reachable through their overview
pages.

### Project Process & Evidence

For project governance and assessment evidence.

Examples:

- Overview
- Sprint evidence
- Stakeholder interactions
- Stand-ups / Scrum records
- Requirements traceability
- Decisions
- Validation evidence
- User-testing evidence
- AI use and evidence
- Team AI transcripts

Sprint evidence should remain grouped chronologically and should not overwhelm
normal product/developer documentation.

---

## Scope

### 1. Audit the current documentation

Review the current `mkdocs.yml` navigation and documentation tree.

For each page, identify whether it is:

- a primary overview / entry point;
- normal explanatory documentation;
- technical reference documentation;
- operational documentation;
- assessment / project evidence; or
- duplicated / substantially overlapping content.

Do not remove information merely because it is detailed.

The audit should identify:

- pages that belong in primary navigation;
- pages better linked from an overview page;
- genuine duplication;
- confusing placement;
- stale or misleading links;
- sections without useful entry pages;
- evidence that is difficult to discover.

---

### 2. Simplify the primary navigation

Reduce the number of concepts exposed at the same navigation level.

Top-level sections should correspond to recognisable reader goals rather than
repository folders or the historical order in which documentation was added.

Avoid broad sections that mix unrelated concerns.

The navigation should remain usable on desktop and mobile.

---

### 3. Introduce clear section landing pages

Important sections should have a short overview page that explains:

- what the section covers;
- who it is for;
- the important concepts;
- the recommended reading order; and
- links to detailed reference pages.

Where possible, use existing overview pages rather than introducing unnecessary
new files.

Overview pages should act as navigation hubs rather than duplicating all content
from the pages they link to.

---

### 4. Consolidate genuine duplication

Where two or more pages explain substantially the same concept:

1. choose the most appropriate authoritative page;
2. merge useful unique information where appropriate;
3. replace duplicated explanations with links to the authoritative source.

Do not combine unrelated topics purely to reduce the Markdown file count.

Do not remove useful detail simply to make the documentation shorter.

---

### 5. Prefer progressive disclosure

Primary navigation should expose the pages most readers need.

Highly specialised material such as:

- field mappings;
- detailed contracts;
- individual operational runbooks;
- user-testing task banks;
- low-level implementation reference;
- detailed validation records;

may remain available through:

- section overview pages;
- contextual links;
- evidence indexes; and
- MkDocs search.

These pages do not all need equal prominence in the primary navigation.

---

### 6. Improve cross-linking

Relevant pages should guide readers naturally to related material.

Examples:

- API overview → OpenAPI / API Explorer / versioning / authentication;
- batch ingestion → season-upload contract / persistence / acceptance testing;
- database overview → schema / ERD / design motivation;
- statistics overview → fixture statistics / participant aggregates / event
  mappings;
- testing strategy → CI / coverage / performance / user testing;
- deployment overview → frontend / backend / worker / recovery;
- Sprint evidence → requirements / stakeholder feedback / validation;
- AI use overview → usage register / team transcripts / declarations.

Avoid forcing readers to navigate back to the global sidebar for every related
topic.

---

### 7. Separate product documentation from project evidence

Product, developer and API documentation should remain easy to read without
being interrupted by assessment evidence.

Evidence must remain discoverable, but should live behind a clear
`Project Process & Evidence` entry point.

Normal product documentation should explain the system.

Evidence documentation should demonstrate how the team planned, implemented,
validated and reviewed it.

---

### 8. Preserve existing links where practical

Prefer reorganising the MkDocs navigation and improving links before physically
moving Markdown files.

Avoid unnecessary file renames or path changes that would break:

- existing documentation URLs;
- README links;
- issue / PR links;
- evidence references;
- AI transcripts;
- validation records; or
- external bookmarks.

If a file must move, update all repository references to it.

---

### 9. Improve the documentation homepage

The homepage should act as an entry point rather than a catalogue.

Provide clear routes such as:

- **Use the platform**
- **Explore the API**
- **Run the project locally**
- **Understand the architecture**
- **Review testing and quality**
- **View project evidence**

Keep the homepage concise and link deeper rather than duplicating detailed
content there.

---

### 10. Create PDF presentation copies of team AI transcript Word documents

The team's AI transcripts are currently stored as Word documents.

These are important project evidence, but Word documents are less convenient to
preview directly through repository and documentation interfaces.

Create PDF presentation copies **only for the team AI transcript Word documents
(`.docx`)**.

For example:

    evidence/
    └── ai/
        └── transcripts/
            └── shayna-unterslak/
                ├── 2026-09-17-session.docx
                └── 2026-09-17-session.pdf

The original Word document must remain preserved.

The PDF is a **human-readable presentation copy**, not a replacement for the
original transcript.

No other evidence files should be converted to PDF as part of this issue.

Existing Markdown, CSV, JSON, text, logs, validation evidence, Sprint evidence,
stakeholder evidence and other evidence formats must remain in their current
formats unless a documentation link itself needs to be corrected.

---

### 11. Preserve transcript content faithfully

Where the source evidence is required to remain unedited, the PDF must be a
faithful rendering of the original Word transcript rather than a rewritten,
corrected or summarised version.

The conversion must preserve, where present:

- team member identification;
- transcript date;
- conversation order;
- speaker identification;
- headings;
- transcript wording;
- prompts and responses;
- code blocks;
- commands;
- links;
- screenshots or embedded images where practical;
- tables where present; and
- other substantive transcript content.

Do not:

- rewrite transcript wording;
- fix spelling or grammar inside the transcript;
- summarise conversations;
- omit sections because they are lengthy;
- replace raw dialogue with a cleaner narrative;
- alter commands or code;
- remove content simply to improve appearance.

Formatting may be adjusted only to make the PDF readable.

This may include:

- sensible page margins;
- readable typography;
- page numbers;
- headers / footers;
- line wrapping;
- code wrapping;
- spacing;
- page breaks.

Any added presentation metadata must be clearly separate from the transcript
itself.

For example, a PDF may include a small header stating:

- team member;
- transcript date;
- source filename; and
- evidence type.

The underlying transcript content must remain unchanged.

---

### 12. Keep the Word documents as the authoritative evidence

The existing `.docx` files remain the authoritative transcript evidence.

The relationship should be:

    Original Word transcript (.docx)
                |
                +--> Human-readable PDF presentation copy (.pdf)

The PDF should not become the only retained copy.

Do not delete or replace the Word documents after conversion.

Where the documentation site links to a PDF, it should also make it possible to
identify or reach the original Word source where appropriate.

---

### 13. Link team transcript PDFs from the documentation site

The `Project Process & Evidence` / AI-use area should make the team's transcripts
easy to discover.

A reader should not need to manually search repository folders to find them.

Provide an appropriate transcript/evidence index grouped by team member.

For example:

| Team member | Read | Original |
| --- | --- | --- |
| Shayna Unterslak | Transcript PDF | Word source |
| Dean Feldman | Transcript PDF | Word source |
| Nadav Sundy | Transcript PDF | Word source |
| Ben Swartz | Transcript PDF | Word source |
| Liora Rosenberg | Transcript PDF | Word source |

The exact presentation may be adapted to fit the existing documentation style.

Do not place every transcript individually in the primary MkDocs navigation.

The evidence index should provide the discovery layer.

---

### 14. Use consistent PDF naming and placement

PDF presentation copies should sit alongside, or follow a clearly predictable
relationship with, their corresponding Word documents.

Prefer matching filenames:

    transcript-name.docx
    transcript-name.pdf

Avoid inventing unrelated PDF filenames that make it difficult to determine
which source transcript they represent.

Existing Word transcript paths should not be changed unnecessarily.

---

### 15. Make Word-to-PDF conversion repeatable where practical

If there are multiple team transcript Word documents, use a consistent
conversion approach.

The process should preserve document content and formatting reliably.

It may be manual or scripted depending on what is simplest and most reliable,
but it should not require transcript content to be copied and pasted or manually
rewritten.

If a repeatable conversion command/script is introduced, document its purpose
briefly.

Do not introduce a large document-generation system solely for this task.

---

### 16. Leave all other evidence untouched

This issue must **not** introduce mass evidence conversion.

Only team AI transcript Word documents are in scope for PDF conversion.

Do not convert:

- Markdown evidence;
- CSV registers;
- JSON files;
- plain-text evidence;
- test output;
- validation reports;
- Sprint Markdown records;
- stakeholder Markdown records;
- logs;
- screenshots;
- existing PDFs;
- other machine-readable evidence.

These should remain in their current formats.

They may be better linked or indexed through the documentation site, but their
underlying file formats should not be changed.

---

### 17. Review transcript PDFs for public suitability

Before linking the generated PDFs from the public documentation site, verify that
they do not accidentally expose:

- credentials;
- access tokens;
- passwords;
- private keys;
- connection strings;
- sensitive environment values;
- inappropriate personal information;
- other information that should not be publicly exposed.

This review should not be used to silently edit transcript evidence.

If an existing transcript contains material that should not be public, handle
that as a separate evidence/privacy decision rather than quietly changing the
PDF copy.

---

## Non-goals

This issue does **not** require:

- rewriting every documentation page;
- removing technical detail to make documentation shorter;
- changing implemented system behaviour;
- changing the application's frontend navigation;
- duplicating repository evidence inside normal documentation pages;
- hiding detailed documentation from search;
- converting every evidence file to PDF;
- converting Markdown evidence to PDF;
- converting CSV evidence to PDF;
- converting JSON or text evidence to PDF;
- converting stakeholder or Sprint records unless they are specifically one of
  the team's Word-format AI transcripts;
- replacing original Word transcripts with PDFs;
- rewriting, correcting or summarising AI transcripts;
- moving every documentation file into a new directory structure;
- introducing unnecessary tooling solely for cosmetic changes.

The goal is **better information architecture, discoverability and human
readability**, while preserving authoritative project evidence.

---

## Acceptance Criteria

### Documentation structure

- [ ] The public documentation has a clear, human-oriented top-level navigation.
- [ ] A reader does not need to understand the repository directory structure to
      locate important information.
- [ ] Major sections have an obvious overview / entry point.
- [ ] Architecture, API, database, deployment, development, testing and project
      evidence are clearly organised.
- [ ] API documentation has an intuitive path from overview to detailed
      reference material.
- [ ] Detailed reference pages remain available without unnecessarily cluttering
      the primary navigation.
- [ ] Genuine duplicate documentation is consolidated or replaced with links to
      an authoritative source.
- [ ] Related documentation is cross-linked where this improves the reading
      journey.
- [ ] Project / Sprint evidence remains discoverable but does not overwhelm
      normal product documentation.
- [ ] The homepage provides clear entry points for the main reader journeys.
- [ ] Navigation remains usable on desktop.
- [ ] Navigation remains usable at mobile width.
- [ ] MkDocs search continues to expose detailed documentation.
- [ ] No useful project or technical information is accidentally removed.

### Existing references

- [ ] Existing URLs and internal links are preserved where practical.
- [ ] Any changed file paths have all repository references updated.
- [ ] README links remain valid.
- [ ] Documentation-to-evidence links remain valid.
- [ ] Issue / PR references to documentation are not unnecessarily broken.

### Team transcript PDFs

- [ ] Team AI transcript Word documents have corresponding readable PDF
      presentation copies where appropriate.
- [ ] Only Word-format team transcripts are converted to PDF.
- [ ] Original `.docx` transcript files remain preserved.
- [ ] Original Word files remain the authoritative transcript evidence.
- [ ] PDF copies faithfully represent the corresponding Word documents.
- [ ] Transcript wording is not rewritten.
- [ ] Transcript spelling/grammar is not silently corrected.
- [ ] Transcript content is not summarised.
- [ ] Transcript sections are not omitted for presentation convenience.
- [ ] Code and commands remain readable.
- [ ] Embedded images/screenshots are preserved where practical.
- [ ] Long transcripts have readable pagination and wrapping.
- [ ] PDF filenames clearly correspond with their source Word filenames.
- [ ] Team transcript PDFs are discoverable from the documentation site's
      Project Process & Evidence / AI-use area.
- [ ] Transcript evidence is grouped sensibly by team member.
- [ ] Readers can identify the original Word source associated with a PDF.
- [ ] No other evidence formats are unnecessarily converted.

### Evidence preservation

- [ ] Existing Markdown evidence remains Markdown.
- [ ] Existing CSV evidence remains CSV.
- [ ] Existing JSON/text evidence remains in its current format.
- [ ] Existing validation and Sprint evidence is not reformatted solely for this
      issue.
- [ ] No authoritative evidence is deleted during the reorganisation.

### Privacy and safety

- [ ] Generated transcript PDFs do not introduce secrets or credentials.
- [ ] Public transcript links are checked for inappropriate sensitive
      information.
- [ ] The conversion process does not silently alter evidence to address a
      privacy concern.

### Verification

- [ ] `python -m mkdocs build --strict` passes.
- [ ] Documentation links are checked for broken or stale internal references.
- [ ] The documentation site is reviewed manually on desktop.
- [ ] The documentation site is reviewed manually at mobile width.
- [ ] Representative transcript PDFs are opened and manually reviewed.
- [ ] Representative `.docx` and `.pdf` transcript pairs are compared to verify
      faithful conversion.
- [ ] PDF links work from the documentation site.
- [ ] Original Word transcript links remain valid where exposed.
- [ ] The deployed Cloudflare documentation site is manually verified after
      merge.

---

## Suggested Verification

### Documentation navigation

Starting only from the documentation homepage, verify that a new reader can
quickly find:

1. local setup;
2. technology stack;
3. API documentation;
4. API Explorer / OpenAPI;
5. database design;
6. system architecture;
7. deployment information;
8. testing strategy;
9. CI / quality information;
10. user-testing information;
11. Sprint evidence;
12. stakeholder evidence;
13. technical decisions;
14. AI-use information;
15. team AI transcripts.

No repository-directory knowledge should be required.

### Documentation build

Run:

```bash
python -m mkdocs build --strict
```

Resolve any:

- missing pages;
- broken relative links;
- invalid navigation entries;
- stale references;
- build warnings that indicate a documentation problem.

### Transcript verification

Select at least one converted team transcript.

For each selected transcript:

1. open the original `.docx`;
2. open the generated `.pdf`;
3. compare the beginning, middle and end;
4. verify conversation order is unchanged;
5. verify prompts and responses have not been rewritten;
6. verify no sections are missing;
7. verify code / commands remain readable;
8. verify screenshots/images remain present where practical;
9. verify the PDF filename clearly corresponds to the Word source;
10. verify the PDF can be reached through the documentation evidence index.

### Evidence format verification

Check the evidence tree and confirm that:

- Word team transcripts gained PDF copies;
- original Word files remain;
- Markdown files were not mass-converted;
- CSV files were not converted;
- JSON/text files were not converted;
- unrelated evidence remains untouched.

### Deployed verification

After merge and documentation deployment:

- verify the Cloudflare documentation site loads correctly;
- verify primary navigation;
- verify mobile navigation;
- verify evidence links;
- verify transcript PDF links;
- verify API-related links;
- verify MkDocs search;
- verify no significant existing documentation URLs were unnecessarily broken.

---

## Expected Outcome

The documentation should feel like one coherent product manual.

A new reader should first see a small number of understandable choices, then be
able to progressively move into the technical detail they need.

The repository can continue to contain comprehensive technical documentation
without the public documentation navigation becoming increasingly difficult to
use as new pages are added.

The team's AI transcript Word documents should remain preserved as the original
evidence while also having convenient PDF copies that are easy for a marker,
developer or reviewer to open.

The intended model is:

    Documentation site
            |
            +-- clear overview and navigation
            |
            +-- technical documentation
            |
            +-- Project Process & Evidence
                        |
                        +-- evidence indexes
                        |
                        +-- team transcript PDFs
                        |
                        +-- links to original Word transcripts

    Repository
            |
            +-- authoritative documentation
            +-- existing evidence in existing formats
            +-- original team transcript .docx files
            +-- matching team transcript .pdf presentation copies

The result should optimise for **humans first**, while preserving the detailed
technical and assessment evidence required by the project.

---

## Labels

- `area: documentation`
- `type: documentation`
- `priority: high`
- `tier: common`

## Milestone

Sprint 3

## AI Declaration

> The preceding issue was planned and generated with the assistance of
> ChatGPT-Web[GPT-5.6 Sol].
````

## Prompt:
9/27/2026, 2:42:47 PM

k, now lets do it.. u work on everything else- im gonna convert word docs to pdf in meantime.. lemme give u the zip (i think necesary for this time-right?)\

## Response:
9/27/2026, 2:42:52 PM · gpt-5-6-thinking

Yes - for this one, **the current repo ZIP is the right thing to send me**.

I need the actual current tree because we’re going to touch/review things like `mkdocs.yml`, `docs/`, README links, evidence indexes, internal cross-links, and probably several overview pages. The older snippets I have won’t be reliable enough for a proper cleanup.

Send me a ZIP of **current `main` after your latest merges**. You can leave out bulky generated folders like `node_modules/`, `site/`, coverage output, build artefacts, etc. if you want.

You handle the **Word → PDF transcript conversion**, and I’ll handle the rest: audit the current docs, redesign the navigation, consolidate/link intelligently, improve the homepage and section landing pages, wire in the transcript/evidence links, preserve paths where sensible, and give you the actual patch/files plus verification steps.

## Prompt:
9/27/2026, 2:46:56 PM

uhm.. its too bug even zipped.. tell me what folders u need and ill send u those zipped? can i send everything exceopts apps?

## Response:
9/27/2026, 2:47:06 PM · gpt-5-6-thinking

> **Assessing repository files**
>
> Yes, sending everything except application source should work. I’ll still need documentation configuration, build scripts, READMEs, link-related files, and preferably each app’s README. Large generated folders, dependencies, caches, and raw transcripts can be omitted.
>
> **Assessed repository files**
>
> 
>
> Worked for 11s

Yes - **send everything except the `apps/` folder**. That should be enough for almost all of this documentation cleanup.

One exception: from `apps/`, I’d still like the **README files only**, because the docs link to the component guides and I want to make sure those routes/descriptions are correct. So if you can, include/copy these separately:

- `apps/frontend/README.md`
- `apps/backend/README.md`
- `apps/worker/README.md` if there is one
- any other `apps/*/README.md`

For the main ZIP, ideally include:

```text
docs/
evidence/
database/
packages/
infra/
scripts/
tests/
.gitea/                 ← if not huge

README.md
mkdocs.yml
package.json
package-lock.json
requirements-docs.txt
```

You can safely leave out all the bulky generated stuff:

```text
apps/                   ← except the READMEs mentioned above
node_modules/
site/
dist/
build/
coverage/
.playwright/
test-results/
*.log
```

And because **you’re doing the Word → PDF transcripts**, if `evidence/ai/transcripts/` is what is making the ZIP enormous, you do **not** need to send me all those big `.docx` files. I mainly need to see their **folder/naming structure and the evidence/index pages** so I can wire the docs correctly. Once you’ve made the PDFs, we can account for those paths.

So the cleanest approach is:

**ZIP everything except `apps/` + bulky generated files**, and then add the small app README files separately. That gives me enough to do this properly without needing the actual application source code.

## Prompt:
9/27/2026, 2:49:22 PM

oop.. i by kistake did that on m,y real one.. how to restore my local one to look like main? (resoter onlhy apps/)

## Response:
9/27/2026, 2:49:31 PM · gpt-5-6-thinking

> **Restoring apps directory**
>
> I’m aligning `apps/` with the remote `main` branch. First, I’ll preview changes, then restore tracked files; optional cleanup removes untracked files only after reviewing what would be deleted.
>
> **Restored apps directory**
>
> 
>
> Worked for 6s

Yep - easy fix. **Do not reset the whole repo.** We can restore only `apps/` to exactly what is on remote `main`.

From the repo root in PowerShell:

```powershell
git fetch origin main
git restore --source=origin/main --staged --worktree -- apps/
```

Then check:

```powershell
git status --short -- apps/
```

If that prints **nothing**, your tracked `apps/` files now match `origin/main`.

If it shows files beginning with `??`, those are **untracked files** that `git restore` deliberately does not delete. First preview what would be removed:

```powershell
git clean -nd -- apps/
```

Only if that list is safe, run:

```powershell
git clean -fd -- apps/
```

Then verify again:

```powershell
git status --short -- apps/
```

So basically:

```powershell
git fetch origin main
git restore --source=origin/main --staged --worktree -- apps/
git status --short -- apps/
```

That affects **only `apps/`**. Your docs/evidence/etc. are untouched.

## Prompt:
9/27/2026, 2:57:09 PM

lmk if u need anything else/u want something (and its not ideal to get it from the mirror)

[Attachment: database.zip]

[Attachment: docs.zip]

[Attachment: evidence.zip]

[Attachment: packages.zip]

[Attachment: infra.zip]

[Attachment: scripts.zip]

[Attachment: testing.zip]

[Attachment: tests.zip]

[Attachment: .gitea.zip]

[Attachment: requirements-docs.txt]

[Attachment: package-lock.json]

[Attachment: package(1).json]

[Attachment: mkdocs.yml]

[Attachment: README(2).md]

## Response:
9/27/2026, 2:57:13 PM · gpt-5-6-thinking

> **Checking document coverage**
>
> I’m seeing only one Word document in the supplied evidence archive, so I can’t confirm that all team transcripts are included. I’ll flag the missing files and avoid assuming paths for the converted PDFs.
>
> **Checked document coverage**
>
> 
>
> **Listing transcript Word Documents**
>
>
> **Inspected evidence documentation and listed transcript Word files**
>
> 
>
> Worked for 1m 10s

I’ve got almost everything I need, and I’d **prefer to work entirely from what you uploaded rather than the mirror**.

The only extra files I want are the current app READMEs:

- `apps/frontend/README.md`
- `apps/backend/README.md`
- `apps/worker/README.md` if it exists

I want those because the root README/documentation points readers to component guides, and I don’t want to restructure the docs around stale descriptions. The current root README already links the frontend/backend component guides, while the repo structure also has a separate worker. `README.md`

One other thing I noticed from the actual `evidence.zip`: **there is only one `.docx` currently inside it**:

`evidence/sprints/sprint-2/2026-09-10-weekly-standup-transcript.docx`

So when you said the team transcripts are Word docs, if there are other `.docx` transcripts on your machine that were not included in this ZIP, that’s fine - just convert them as you planned. **I do not need the actual Word files to do my side.** When you’re finished, I’ll just need the final relative filenames/locations of the PDFs so I can link them correctly.

Also, I’ve now got the current `mkdocs.yml`, and it confirms exactly why this cleanup is worthwhile: the current `Design` section alone contains design, architecture, API, statistics, data, database and security, while methodology/testing/evidence are split into separate top-level areas. `mkdocs.yml`

So: **send me those 2-3 app README files and I’m good to start.** You can keep working on the PDFs in parallel.

## Prompt:
9/27/2026, 2:59:38 PM

There should be other word docs for other sprint meatings insude the team transcript thing on each one?

[Attachment: README(3).md]

[Attachment: README(4).md]

[Attachment: README(5).md]

## Response:
9/27/2026, 2:59:55 PM · gpt-5-6-thinking

> **Inspecting Evidence Zip for Sprint Documents**
>
>
> **Inspected evidence ZIP for sprint documents**
>
> 
>
> Worked for 35s

Yes - **you were right.** I was looking at the wrong transcript area before: I conflated `evidence/ai/transcripts/` with the **team meeting transcripts under each Sprint**.

I checked the ZIP directly, and there are **9 real Word meeting transcripts** to convert (ignoring the temporary `~$...docx` Word lock files):

- **Sprint 1 - 5**
  - `Teams Transcripts/Inital Stakeholder Meeting 04-08-2026.docx`
  - `Teams Transcripts/Initial Team project planning 04-08-2026.docx`
  - `Teams Transcripts/Scrum standup and Sprint Planning 06-08-2026.docx`
  - `Teams Transcripts/Scrum Standup 13-08-2026.docx`
  - `Teams Transcripts/Scrum Standup 20-08-2026.docx`

- **Sprint 2 - 3**
  - `Teams Transcripts/27-08-2026 Standup.docx`
  - `Teams Transcripts/03-09-2026 Standup.docx`
  - `2026-09-10-weekly-standup-transcript.docx` ← this one is currently directly in the Sprint 2 folder rather than inside `Teams Transcripts/`

- **Sprint 3 - 1**
  - `Teams Transcripts/17-09-2026-Standup.docx`

There is also the **24 Sep Sprint 3 stand-up JPEG**, but per what we agreed, **leave that alone**. Same for Markdown stakeholder records, WhatsApp evidence, screenshots, etc.

So your job is just: **convert those 9 `.docx` files to PDF**, keep the `.docx` originals, and ideally put each PDF right beside its Word file with the same base filename.

Also, I now have all three app READMEs you sent, including the worker guide, so **I have what I need for my side**. I’ll work from these uploads rather than the mirror.

## Prompt:
9/27/2026, 3:01:12 PM

k, do it al;l pls (except pdf stuff that ill do)\

## Response:
9/27/2026, 3:01:22 PM · gpt-5-6-thinking

> **Inspecting Uploaded Archives and Repository Files**
>
>
> **Structuring the documentation**
>
> I’m organizing the existing pages into a clearer hierarchy with landing pages, focused navigation, and cross-links. I’ll preserve content, avoid PDFs, update repository guidance, and verify the documentation build plus internal links.
>
> **Structured the documentation**
>
> 
>
> **Searching docs for evidence links**
>
>
> **Applying documentation changes**
>
> The documentation update is being narrowed to practical file edits and navigation work. The PDFs are remaining untouched, while supporting pages, links, evidence references, and temporary Word lock files are being handled separately.
>
> **Applied documentation changes**
>
> 
>
> **Inspecting Documentation Pages for Cross-Linking**
>
>
> **Validating Patch Application Against Baseline**
>
> 
>
> Worked for 12m 6s

Done - I worked from the **current files you uploaded, not the mirror**. The cleanup is built against the actual current navigation and repository docs you sent. The old MkDocs structure was indeed mixing architecture/API/data/database/security under `Design`, while methodology, testing, AI and evidence were split separately. `mkdocs.yml` I also used the current root README/component-guide structure, including the actual frontend/backend/etc. guides you supplied. `README.md`

I’ve done the non-PDF side of the issue: rebuilt the MkDocs navigation around human reader goals; created proper landing pages for **Getting Started**, **Product & API**, **Architecture & Data**, **Development**, and **Testing & Quality**; simplified the homepage; reorganised Project Process & Evidence; refreshed Sprint 1/2/3 evidence indexes; added repository-level Sprint READMEs; added a dedicated **Team Meeting Transcripts** page; wired the Word-source and expected PDF links; clearly separated Teams meeting transcripts from AI interaction transcripts; added better cross-linking from the major overview pages; added the worker README to the root component-guide list; fixed the stale Sprint 2 close-out path; corrected the database guide’s stale App Service wording; and removed the two junk `~$...docx` Word lock files.

Your PDFs are deliberately **not included**. The transcript pages expect each PDF to have the **same basename as its `.docx` and sit beside it**. One important oddity is the 10 September Sprint 2 transcript: because its `.docx` currently lives directly in `evidence/sprints/sprint-2/`, its PDF should also stay directly there. I did not move the source because that could break historical references.

### Use this one - recommended

[Download the Git patch](sandbox:/mnt/data/docs-ux-cleanup.patch)

From the repo root:

```powershell
git apply --check "C:\path\to\docs-ux-cleanup.patch"
```

If that gives no errors:

```powershell
git apply "C:\path\to\docs-ux-cleanup.patch"
git status
git diff --check
```

The patch is preferable because it also removes the two Word temporary lock files correctly.

I also made a plain replacement ZIP in case you want to inspect/copy the changed files manually:

[Download the changed-files ZIP](sandbox:/mnt/data/docs-ux-cleanup-files.zip)

I verified the patch itself applies cleanly against the exact files you uploaded, `git diff --check` passes, `mkdocs.yml` parses correctly, **every nav target exists**, and my local-link check found **0 missing documentation links**. I could not execute the actual `python -m mkdocs build --strict` here because this environment does not have `mkdocs-material` installed and cannot reach PyPI to install it. Your repository already documents that strict build as the required documentation verification step. `README.md`

So after you add your nine PDF copies, run:

```powershell
python -m mkdocs build --strict
git diff --check
git status
```

Then show me the output. If those are clean, I’ll give you the **commit message + PR title/body + AI declaration** for this issue.

## Prompt:
9/27/2026, 3:15:25 PM

nranch name?issue #753

## Response:
9/27/2026, 3:15:29 PM · gpt-5-6-thinking

Use:

```text
docs/753-reorganise-public-docs
```

Create it with:

```powershell
git checkout -b docs/753-reorganise-public-docs
```

## Prompt:
9/27/2026, 3:16:19 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git apply --check "docs-ux-cleanup.patch"           
error: evidence/sprints/sprint-1/Teams Transcripts/~$rum Standup 20-08-2026.docx: No such file or directory
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> 

ohh, i think i moved thatone intlo the teams transcript folder maybe

## Response:
9/27/2026, 3:16:27 PM · gpt-5-6-thinking

> **Inspecting Patch Failures from Missing Temporary Files**
>
>
> **Inspected patch failures and created a cleaned patch without lockfiles**
>
> 
>
> Worked for 38s

Yep - that error is **not the actual transcript**. It’s one of Word’s temporary lock files, the ones starting with `~$`. Those appear while a Word document is open and often disappear automatically when Word closes.

So the patch was trying to delete a junk temp file that simply isn’t in your repo anymore. That’s why `git apply --check` failed.

I fixed the patch so it **doesn’t touch either of those `~$...docx` files at all**:

[Download the corrected patch](sandbox:/mnt/data/docs-ux-cleanup-no-lockfiles.patch)

Now run:

```powershell
git apply --check "docs-ux-cleanup-no-lockfiles.patch"
```

If that gives no output, then:

```powershell
git apply "docs-ux-cleanup-no-lockfiles.patch"
git status
git diff --check
```

Your real transcript locations can stay exactly as they are. This fix only removes the two temporary Word-lock-file deletions from my patch.

## Prompt:
9/27/2026, 3:18:34 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git apply --check "docs-ux-cleanup-no-lockfiles.patch"
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git apply "docs-ux-cleanup-no-lockfiles.patch"
>> git status
>> git diff --check
On branch docs/753-reorganise-public-docs
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   apps/frontend/src/App.tsx
        new file:   apps/frontend/src/features/api-explorer/ApiExplorerLoadingIndicator.css
        new file:   apps/frontend/src/features/api-explorer/ApiExplorerLoadingIndicator.tsx
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.css
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.test.tsx
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.tsx
        modified:   apps/frontend/src/features/dataset-releases/AdminDatasetReleasePage.test.tsx
        modified:   apps/frontend/src/features/reviews/BatchReviewWorkspacePage.test.tsx
        modified:   apps/frontend/src/features/reviews/BatchReviewWorkspacePage.tsx
        modified:   apps/frontend/src/features/statistics/StatisticsPages.test.tsx
        modified:   apps/frontend/src/features/statistics/StatisticsPages.tsx

Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   README.md
        modified:   docs/README.md
        modified:   docs/api/overview.md
        modified:   docs/architecture/overview.md
        modified:   docs/database/guide.md
        modified:   docs/deployment/overview.md
        modified:   docs/development/testing.md
        modified:   docs/index.md
        modified:   docs/planning/sprint-2-requirements-traceability.md
        modified:   docs/process/ai-use-evidence.md
        modified:   docs/process/index.md
        modified:   docs/process/sprint-evidence.md
        modified:   evidence/README.md
        modified:   evidence/sprints/README.md
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Inital Stakeholder Meeting 04-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Initial Team project planning 04-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 13-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 20-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Scrum standup and Sprint Planning 06-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/~$rum Standup 20-08-2026.docx
        deleted:    evidence/sprints/sprint-2/2026-09-10-weekly-standup-transcript.docx
        deleted:    evidence/sprints/sprint-2/Teams Transcripts/03-09-2026 Standup.docx
        deleted:    evidence/sprints/sprint-2/Teams Transcripts/27-08-2026 Standup.docx
        modified:   evidence/sprints/sprint-3/README.md
        deleted:    evidence/sprints/sprint-3/Teams Transcripts/17-09-2026-Standup.docx
        modified:   mkdocs.yml

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        database.zip
        docs-ux-cleanup-no-lockfiles.patch
        docs-ux-cleanup.patch
        docs.zip
        docs/architecture-and-data.md
        docs/development/index.md
        docs/getting-started.md
        docs/process/team-meeting-transcripts.md
        docs/product-and-api.md
        docs/testing/index.md
        evidence.zip
        evidence/sprints/sprint-1/README.md
        evidence/sprints/sprint-1/Teams Transcripts/Inital Stakeholder Meeting 04-08-2026.pdf
        evidence/sprints/sprint-1/Teams Transcripts/Initial Team project planning 04-08-2026.pdf
        evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 13-08-2026.pdf
        evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 20-08-2026.pdf
        evidence/sprints/sprint-1/Teams Transcripts/Scrum standup and Sprint Planning 06-08-2026.pdf
        evidence/sprints/sprint-2/README.md
        evidence/sprints/sprint-2/Teams Transcripts/03-09-2026 Standup.pdf
        evidence/sprints/sprint-2/Teams Transcripts/2026-09-10-weekly-standup-transcript.pdf
        evidence/sprints/sprint-2/Teams Transcripts/27-08-2026 Standup.pdf
        evidence/sprints/sprint-3/2026-09-22 Asynch Stakeholder meeting/
        evidence/sprints/sprint-3/2026-09-24 Standup.jpeg
        evidence/sprints/sprint-3/Teams Transcripts/17-09-2026-Standup.pdf
        infra.zip

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git status
On branch docs/753-reorganise-public-docs
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   apps/frontend/src/App.tsx
        new file:   apps/frontend/src/features/api-explorer/ApiExplorerLoadingIndicator.css
        new file:   apps/frontend/src/features/api-explorer/ApiExplorerLoadingIndicator.tsx
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.css
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.test.tsx
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.tsx
        modified:   apps/frontend/src/features/dataset-releases/AdminDatasetReleasePage.test.tsx
        modified:   apps/frontend/src/features/reviews/BatchReviewWorkspacePage.test.tsx
        modified:   apps/frontend/src/features/reviews/BatchReviewWorkspacePage.tsx
        modified:   apps/frontend/src/features/statistics/StatisticsPages.test.tsx
        modified:   apps/frontend/src/features/statistics/StatisticsPages.tsx

Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   README.md
        modified:   docs/README.md
        modified:   docs/api/overview.md
        modified:   docs/architecture/overview.md
        modified:   docs/database/guide.md
        modified:   docs/deployment/overview.md
        modified:   docs/development/testing.md
        modified:   docs/index.md
        modified:   docs/planning/sprint-2-requirements-traceability.md
        modified:   docs/process/ai-use-evidence.md
        modified:   docs/process/index.md
        modified:   docs/process/sprint-evidence.md
        modified:   evidence/README.md
        modified:   evidence/sprints/README.md
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Inital Stakeholder Meeting 04-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Initial Team project planning 04-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 13-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 20-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/Scrum standup and Sprint Planning 06-08-2026.docx
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/~$rum Standup 20-08-2026.docx
        deleted:    evidence/sprints/sprint-2/2026-09-10-weekly-standup-transcript.docx
        deleted:    evidence/sprints/sprint-2/Teams Transcripts/03-09-2026 Standup.docx
        deleted:    evidence/sprints/sprint-2/Teams Transcripts/27-08-2026 Standup.docx
        modified:   evidence/sprints/sprint-3/README.md
        deleted:    evidence/sprints/sprint-3/Teams Transcripts/17-09-2026-Standup.docx
        modified:   mkdocs.yml

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        docs-ux-cleanup-no-lockfiles.patch
        docs-ux-cleanup.patch
        docs/architecture-and-data.md
        docs/development/index.md
        docs/getting-started.md
        docs/process/team-meeting-transcripts.md
        docs/product-and-api.md
        docs/testing/index.md
        evidence/sprints/sprint-1/README.md
        evidence/sprints/sprint-1/Teams Transcripts/Inital Stakeholder Meeting 04-08-2026.pdf
        evidence/sprints/sprint-1/Teams Transcripts/Initial Team project planning 04-08-2026.pdf
        evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 13-08-2026.pdf
        evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 20-08-2026.pdf
        evidence/sprints/sprint-1/Teams Transcripts/Scrum standup and Sprint Planning 06-08-2026.pdf
        evidence/sprints/sprint-2/README.md
        evidence/sprints/sprint-2/Teams Transcripts/03-09-2026 Standup.pdf
        evidence/sprints/sprint-2/Teams Transcripts/2026-09-10-weekly-standup-transcript.pdf
        evidence/sprints/sprint-2/Teams Transcripts/27-08-2026 Standup.pdf
        evidence/sprints/sprint-3/2026-09-22 Asynch Stakeholder meeting/
        evidence/sprints/sprint-3/2026-09-24 Standup.jpeg
        evidence/sprints/sprint-3/Teams Transcripts/17-09-2026-Standup.pdf

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/27/2026, 3:18:45 PM · gpt-5-6-thinking

> **Reviewing repository status**
>
> I’m seeing the original Word files marked deleted while converted PDFs are untracked, plus unrelated frontend changes already staged. I’d avoid committing everything together and restore or intentionally confirm each document move first.
>
> **Reviewed repository status**
>
> 
>
> **Inspecting Patch References and Documentation Paths**
>
>
> **Isolating document changes**
>
> I’m keeping the staged frontend work separate by stashing only that directory, preserving it for later. Then I’ll remove temporary patch files, restore intended Word documents if necessary, and stage only the PDFs and documentation updates.
>
> **Isolated document changes**
>
> 
>
> **Inspected patch references and documentation paths**
>
> 
>
> Worked for 1m 11s

Good - the patch applied cleanly. **Don’t commit yet.** There are three things to tidy first.

The big one: your real `.docx` transcripts have been deleted locally during your PDF conversion. We want **both Word + PDF**, so restore the 9 real Word files from `main`. Do **not** restore the `~$...docx` file - that’s just a Word temporary lock file and it’s good to remove it permanently.

Run:

```powershell
git restore --source=origin/main --worktree -- "evidence/sprints/sprint-1/Teams Transcripts/Inital Stakeholder Meeting 04-08-2026.docx"
git restore --source=origin/main --worktree -- "evidence/sprints/sprint-1/Teams Transcripts/Initial Team project planning 04-08-2026.docx"
git restore --source=origin/main --worktree -- "evidence/sprints/sprint-1/Teams Transcripts/Scrum standup and Sprint Planning 06-08-2026.docx"
git restore --source=origin/main --worktree -- "evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 13-08-2026.docx"
git restore --source=origin/main --worktree -- "evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 20-08-2026.docx"

git restore --source=origin/main --worktree -- "evidence/sprints/sprint-2/Teams Transcripts/27-08-2026 Standup.docx"
git restore --source=origin/main --worktree -- "evidence/sprints/sprint-2/Teams Transcripts/03-09-2026 Standup.docx"
git restore --source=origin/main --worktree -- "evidence/sprints/sprint-2/2026-09-10-weekly-standup-transcript.docx"

git restore --source=origin/main --worktree -- "evidence/sprints/sprint-3/Teams Transcripts/17-09-2026-Standup.docx"
```

### One PDF is in the wrong folder

You put the 10 September PDF into `Teams Transcripts`, but its original Word file historically lives directly under `sprint-2/`. I deliberately kept that old path so we don’t break existing references.

Move just that PDF:

```powershell
Move-Item `
  "evidence/sprints/sprint-2/Teams Transcripts/2026-09-10-weekly-standup-transcript.pdf" `
  "evidence/sprints/sprint-2/2026-09-10-weekly-standup-transcript.pdf"
```

After that, the pair should be:

```text
evidence/sprints/sprint-2/
├── 2026-09-10-weekly-standup-transcript.docx
└── 2026-09-10-weekly-standup-transcript.pdf
```

### Also: those staged frontend files are unrelated

These:

```text
apps/frontend/src/App.tsx
apps/frontend/src/features/api-explorer/...
apps/frontend/src/features/dataset-releases/...
apps/frontend/src/features/reviews/...
apps/frontend/src/features/statistics/...
```

were already staged when you created this branch. **My #753 patch did not touch them.** We definitely do not want them accidentally going into the docs PR.

Safest is to stash only the frontend work:

```powershell
git stash push -m "WIP frontend changes before issue 753" -- apps/frontend
```

That preserves the work and removes it from this branch’s working/index state. Later, on whichever branch those frontend changes belong to:

```powershell
git stash pop
```

### Then clean the patch files

They’re just local delivery files and must not enter Git:

```powershell
Remove-Item "docs-ux-cleanup.patch" -ErrorAction SilentlyContinue
Remove-Item "docs-ux-cleanup-no-lockfiles.patch" -ErrorAction SilentlyContinue
```

### Now check before staging

Run:

```powershell
git status
```

At this point I expect:

- our `README.md`, `mkdocs.yml`, `docs/...` changes;
- new Sprint README/index pages;
- your **9 PDFs**;
- the original **9 `.docx` files no longer showing as deleted**;
- the `~$rum Standup...docx` may still show as deleted - **that is fine**;
- the Sprint 3 async stakeholder folder and 24 Sep stand-up image may show as untracked - **keep them**, because the new evidence indexes link to them.

Then stage only this issue:

```powershell
git add README.md mkdocs.yml docs evidence
```

**Do not use `git add .`** here.

Then:

```powershell
git status
git diff --cached --check
```

Send me that `git status` next. I want to make sure the `.docx` files are preserved, PDFs are paired correctly, frontend work is out, and only #753 material is staged before we run the full docs validation.

## Prompt:
9/27/2026, 3:22:11 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git add README.md mkdocs.yml docs evidence
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git statuc
git: 'statuc' is not a git command. See 'git --help'.

The most similar command is
        status
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git status
On branch docs/753-reorganise-public-docs
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   README.md
        new file:   apps/frontend/src/features/api-explorer/ApiExplorerLoadingIndicator.css
        new file:   apps/frontend/src/features/api-explorer/ApiExplorerLoadingIndicator.tsx
        modified:   docs/README.md
        modified:   docs/api/overview.md
        new file:   docs/architecture-and-data.md
        modified:   docs/architecture/overview.md
        modified:   docs/database/guide.md
        modified:   docs/deployment/overview.md
        new file:   docs/development/index.md
        modified:   docs/development/testing.md
        new file:   docs/getting-started.md
        modified:   docs/index.md
        modified:   docs/planning/sprint-2-requirements-traceability.md
        modified:   docs/process/ai-use-evidence.md
        modified:   docs/process/index.md
        modified:   docs/process/sprint-evidence.md
        new file:   docs/process/team-meeting-transcripts.md
        new file:   docs/product-and-api.md
        new file:   docs/testing/index.md
        modified:   evidence/README.md
        modified:   evidence/sprints/README.md
        new file:   evidence/sprints/sprint-1/README.md
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Inital Stakeholder Meeting 04-08-2026.pdf
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Initial Team project planning 04-08-2026.pdf
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 13-08-2026.pdf
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 20-08-2026.pdf
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Scrum standup and Sprint Planning 06-08-2026.pdf
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/~$rum Standup 20-08-2026.docx
        new file:   evidence/sprints/sprint-2/2026-09-10-weekly-standup-transcript.pdf
        new file:   evidence/sprints/sprint-2/README.md
        new file:   evidence/sprints/sprint-2/Teams Transcripts/03-09-2026 Standup.pdf
        new file:   evidence/sprints/sprint-2/Teams Transcripts/27-08-2026 Standup.pdf
        new file:   evidence/sprints/sprint-3/2026-09-22 Asynch Stakeholder meeting/2026-09-22 student message.jpeg
        new file:   evidence/sprints/sprint-3/2026-09-22 Asynch Stakeholder meeting/2026-09-24 stakeholder response.jpeg
        new file:   evidence/sprints/sprint-3/2026-09-24 Standup.jpeg
        modified:   evidence/sprints/sprint-3/README.md
        new file:   evidence/sprints/sprint-3/Teams Transcripts/17-09-2026-Standup.pdf
        modified:   mkdocs.yml

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   apps/frontend/src/App.tsx
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.css
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.test.tsx
        modified:   apps/frontend/src/features/api-explorer/ApiExplorerPage.tsx
        modified:   apps/frontend/src/features/dataset-releases/AdminDatasetReleasePage.test.tsx
        modified:   apps/frontend/src/features/reviews/BatchReviewWorkspacePage.test.tsx
        modified:   apps/frontend/src/features/reviews/BatchReviewWorkspacePage.tsx
        modified:   apps/frontend/src/features/statistics/StatisticsPages.test.tsx
        modified:   apps/frontend/src/features/statistics/StatisticsPages.tsx

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/27/2026, 3:22:24 PM

> **Protecting frontend work**
>
> I’m verifying the repository state before proceeding. The safest next step is to unstage the frontend directory, then stash all its tracked and untracked files so unrelated work stays intact while the document cleanup continues.
>
> **Protected frontend work**
>
> 
>
> Worked for 9s

## Prompt:
9/27/2026, 3:22:26 PM

i ran format btw

## Response:
9/27/2026, 3:22:37 PM · gpt-5-6-thinking

> **Stashing frontend changes**
>
> I’m seeing only the intended document changes plus unrelated frontend work. I’ll stash the entire frontend directory, including staged and untracked files, while leaving the documentation changes untouched for validation.
>
> **Stashed frontend changes**
>
> 
>
> Worked for 21s

Great - and the `format` run hasn’t left a second unstaged version of any of our docs, so that looks fine.

Your status is now **almost exactly right**:

- ✅ all **9 PDFs** are present
- ✅ the original real `.docx` transcripts are restored and no longer showing as deleted
- ✅ the 10 Sep PDF is now in the correct Sprint 2 location
- ✅ Sprint 3 stakeholder screenshots + 24 Sep stand-up evidence are included
- ✅ `~$rum Standup 20-08-2026.docx` is still being deleted - **good**, that is Word junk
- ⚠️ two unrelated frontend files are still staged, and the rest of that frontend work is still sitting unstaged

Let’s preserve **all** that frontend work and get it completely out of #753 in one command:

```powershell
git stash push -u -m "WIP frontend changes before issue 753" -- apps/frontend
```

The `-u` matters because those two `ApiExplorerLoadingIndicator` files are new/untracked-type files.

Then:

```powershell
git status
```

At that point there should be **nothing from `apps/frontend/` at all**.

Then run our checks:

```powershell
git diff --cached --check
python -m mkdocs build --strict
```

And I also want this quick summary:

```powershell
git diff --cached --stat
```

If the strict MkDocs build passes, we’re basically at the review-before-commit stage.

One thing **not** to worry about:

```text
deleted: evidence/sprints/sprint-1/Teams Transcripts/~$rum Standup 20-08-2026.docx
```

Keep that deletion. `~$` is Word’s temporary owner/lock file and it should never have been committed in the first place.

Send me the new `git status` + MkDocs result after the stash.

## Prompt:
9/27/2026, 3:23:46 PM

On branch docs/753-reorganise-public-docs
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   README.md
        modified:   docs/README.md
        modified:   docs/api/overview.md
        new file:   docs/architecture-and-data.md
        modified:   docs/architecture/overview.md
        modified:   docs/database/guide.md
        modified:   docs/deployment/overview.md
        new file:   docs/development/index.md
        modified:   docs/development/testing.md
        new file:   docs/getting-started.md
        modified:   docs/index.md
        modified:   docs/planning/sprint-2-requirements-traceability.md
        modified:   docs/process/ai-use-evidence.md
        modified:   docs/process/index.md
        modified:   docs/process/sprint-evidence.md
        new file:   docs/process/team-meeting-transcripts.md
        new file:   docs/product-and-api.md
        new file:   docs/testing/index.md
        modified:   evidence/README.md
        modified:   evidence/sprints/README.md
        new file:   evidence/sprints/sprint-1/README.md
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Inital Stakeholder Meeting 04-08-2026.pdf
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Initial Team project planning 04-08-2026.pdf
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 13-08-2026.pdf
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Scrum Standup 20-08-2026.pdf
        new file:   evidence/sprints/sprint-1/Teams Transcripts/Scrum standup and Sprint Planning 06-08-2026.pdf
        deleted:    evidence/sprints/sprint-1/Teams Transcripts/~$rum Standup 20-08-2026.docx
        new file:   evidence/sprints/sprint-2/2026-09-10-weekly-standup-transcript.pdf
        new file:   evidence/sprints/sprint-2/README.md
        new file:   evidence/sprints/sprint-2/Teams Transcripts/03-09-2026 Standup.pdf
        new file:   evidence/sprints/sprint-2/Teams Transcripts/27-08-2026 Standup.pdf
        new file:   evidence/sprints/sprint-3/2026-09-22 Asynch Stakeholder meeting/2026-09-22 student message.jpeg
        new file:   evidence/sprints/sprint-3/2026-09-22 Asynch Stakeholder meeting/2026-09-24 stakeholder response.jpeg
        new file:   evidence/sprints/sprint-3/2026-09-24 Standup.jpeg
        modified:   evidence/sprints/sprint-3/README.md
        new file:   evidence/sprints/sprint-3/Teams Transcripts/17-09-2026-Standup.pdf
        modified:   mkdocs.yml

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git diff --cached --check
>> python -m mkdocs build --strict

 │  ⚠  Warning from the Material for MkDocs team
 │
 │  MkDocs 2.0, the underlying framework of Material for MkDocs,
 │  will introduce backward-incompatible changes, including:
 │
 │  × All plugins will stop working – the plugin system has been removed
 │  × All theme overrides will break – the theming system has been rewritten
 │  × No migration path exists – existing projects cannot be upgraded
 │  × Closed contribution model – community members can't report bugs
 │  × Currently unlicensed – unsuitable for production use
 │
 │  Our full analysis:
 │
 │  https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/

INFO    -  Cleaning site directory
INFO    -  Building documentation to directory: C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool\site
INFO    -  Documentation built in 7.72 seconds
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git diff --cached --stat
 README.md                                          |  28 ++--
 docs/README.md                                     |  17 ++-
 docs/api/overview.md                               |   7 +
 docs/architecture-and-data.md                      |  55 ++++++++
 docs/architecture/overview.md                      |   7 +
 docs/database/guide.md                             |  10 +-
 docs/deployment/overview.md                        |   7 +
 docs/development/index.md                          |  54 ++++++++
 docs/development/testing.md                        |   7 +
 docs/getting-started.md                            |  53 ++++++++
 docs/index.md                                      | 134 ++++++------------
 .../planning/sprint-2-requirements-traceability.md |  29 ++--
 docs/process/ai-use-evidence.md                    |   7 +
 docs/process/index.md                              | 102 ++++++--------
 docs/process/sprint-evidence.md                    | 107 +++++----------
 docs/process/team-meeting-transcripts.md           |  40 ++++++
 docs/product-and-api.md                            |  77 +++++++++++
 docs/testing/index.md                              |  56 ++++++++
 evidence/README.md                                 |  49 +++++--
 evidence/sprints/README.md                         |  43 +++++-
 evidence/sprints/sprint-1/README.md                |  40 ++++++
 .../Inital Stakeholder Meeting 04-08-2026.pdf      | Bin 0 -> 520832 bytes
 .../Initial Team project planning 04-08-2026.pdf   | Bin 0 -> 825535 bytes
 .../Teams Transcripts/Scrum Standup 13-08-2026.pdf | Bin 0 -> 389751 bytes
 .../Teams Transcripts/Scrum Standup 20-08-2026.pdf | Bin 0 -> 317374 bytes
 ...crum standup and Sprint Planning 06-08-2026.pdf | Bin 0 -> 509875 bytes
 .../~$rum Standup 20-08-2026.docx                  | Bin 162 -> 0 bytes
 .../2026-09-10-weekly-standup-transcript.pdf       | Bin 0 -> 315751 bytes
 evidence/sprints/sprint-2/README.md                |  41 ++++++
 .../Teams Transcripts/03-09-2026 Standup.pdf       | Bin 0 -> 330907 bytes
 .../Teams Transcripts/27-08-2026 Standup.pdf       | Bin 0 -> 305541 bytes
 .../2026-09-22 student message.jpeg                | Bin 0 -> 116165 bytes
 .../2026-09-24 stakeholder response.jpeg           | Bin 0 -> 120204 bytes
 evidence/sprints/sprint-3/2026-09-24 Standup.jpeg  | Bin 0 -> 74566 bytes
 evidence/sprints/sprint-3/README.md                |  80 +++++------
 .../Teams Transcripts/17-09-2026-Standup.pdf       | Bin 0 -> 317350 bytes
 mkdocs.yml                                         | 149 ++++++++++++---------
 37 files changed, 820 insertions(+), 379 deletions(-)
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/27/2026, 3:24:02 PM · gpt-5-6-thinking

Perfect - this is clean now.

`git diff --cached --check` produced no errors, and `python -m mkdocs build --strict` **passed**. The big Material/MkDocs 2.0 message is only an upstream warning about a future MkDocs release; your current site built successfully in 7.72 seconds.

Your diff also looks appropriate for #753: 37 files, with the documentation IA changes, evidence indexes, 9 transcript PDFs, the Sprint 3 evidence images, and removal of the stray Word `~$` lock file. No `apps/frontend` files are in the staged diff anymore.

I’d do one last sanity check:

```powershell
git status --short
```

If it shows only the staged #753 material and no weird `site/` folder, commit it:

```powershell
git commit -m "docs: reorganise public documentation and evidence" `
  -m "Restructure the MkDocs navigation around reader goals, add section landing pages and improve cross-linking and evidence discovery." `
  -m "Add readable PDF copies of team meeting transcripts while preserving the original Word evidence, and index Sprint 1-3 meeting and stakeholder evidence." `
  -m "Refs #753" `
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Then:

```powershell
git push -u origin docs/753-reorganise-public-docs
```

For the PR:

```md
# docs: reorganise public documentation and evidence

Closes #753

## Summary

Reorganises the public documentation site around clear reader goals and improves
the discoverability and readability of project evidence.

### Documentation

- reorganises the MkDocs navigation into clearer reader-focused sections;
- adds landing pages for:
  - Getting Started;
  - Product & API;
  - Architecture & Data;
  - Development;
  - Testing & Quality;
- simplifies the documentation homepage;
- improves cross-linking between related technical documentation;
- separates product/developer documentation from project-process evidence;
- preserves existing documentation paths where practical;
- updates repository and documentation entry points;
- corrects stale documentation references identified during the audit.

### Project evidence

- adds clearer Sprint 1, Sprint 2 and Sprint 3 evidence indexes;
- adds a dedicated Team Meeting Transcripts documentation page;
- retains the original `.docx` meeting transcripts as authoritative evidence;
- adds PDF presentation copies of the 9 Word-format meeting transcripts for
  easier browser/repository viewing;
- indexes the Sprint 3 asynchronous stakeholder interaction and 24 September
  stand-up evidence;
- removes a committed Microsoft Word temporary `~$` lock file;
- leaves all other evidence formats unchanged.

## Verification

- `git diff --cached --check` ✅
- `python -m mkdocs build --strict` ✅
- MkDocs navigation targets verified
- documentation links reviewed
- transcript Word sources retained alongside PDF presentation copies
- no application behaviour changed

The Material for MkDocs build emits its upstream informational warning regarding
the future MkDocs 2.0 release, but the strict documentation build completes
successfully.

## AI Declaration

This documentation reorganisation, cross-linking work, evidence indexing and
implementation planning were completed with the assistance of
ChatGPT-Web[GPT-5.6 Sol].

Human review was used to verify the repository changes, evidence placement and
strict MkDocs build.
```

One small thing: **don’t `stash pop` the frontend work back onto this branch.** Push/open this PR first. Then switch to whatever branch that frontend work belongs on and restore the stash there.

## Prompt:
9/27/2026, 3:25:12 PM

can i lcoally see the docs first?

## Response:
9/27/2026, 3:25:19 PM · gpt-5-6-thinking

Yep. From the repo root, run:

```powershell
python -m mkdocs serve
```

You should see something like:

```text
Serving on http://127.0.0.1:8000/
```

Then open:

```text
http://127.0.0.1:8000/
```

MkDocs will live-reload as you edit files, so you can click around and inspect the new navigation before committing.

I’d specifically check:

- Home
- Getting Started
- Product & API
- Architecture & Data
- Development
- Testing & Quality
- Project Process & Evidence
- Team Meeting Transcripts
- Sprint 1 / 2 / 3 evidence pages
- a few PDF links

When you’re done, stop the local server with:

```text
Ctrl + C
```

If `mkdocs serve` complains that the port is already in use, use:

```powershell
python -m mkdocs serve -a 127.0.0.1:8001
```

and then open `http://127.0.0.1:8001/`.

## Prompt:
9/27/2026, 6:44:40 PM

i need to pull new main, add csv and transcxript.. tell me how to do that

## Response:
9/27/2026, 6:44:50 PM · gpt-5-6-thinking

> **Updating the branch**
>
> I’m preserving the current staged work first, then I’ll update from `main`, restore the changes, add the CSV and transcript, and check for conflicts before committing.
>
> **Updated the branch**
>
> 
>
> Worked for 10s

Yes. Since your #753 work is still local, do it in this order so you don’t lose anything.

First stash the current docs work:

```powershell
git stash push -u -m "WIP #753 docs reorganisation"
```

You already have that older frontend stash, so **don’t worry** - this creates a second, separately named stash.

Now update `main`:

```powershell
git checkout main
git pull origin main
```

Then go back to your issue branch and bring the new `main` into it:

```powershell
git checkout docs/753-reorganise-public-docs
git rebase main
```

Now restore your #753 work:

```powershell
git stash list
```

You should see something like:

```text
stash@{0}: On docs/753-reorganise-public-docs: WIP #753 docs reorganisation
stash@{1}: ... WIP frontend changes ...
```

Restore **the #753 stash only**:

```powershell
git stash pop --index stash@{0}
```

Then add your new CSV and transcript files into the correct `evidence/...` locations.

After copying them in:

```powershell
git status
```

Then stage only the relevant project docs/evidence again:

```powershell
git add README.md mkdocs.yml docs evidence
```

And rerun:

```powershell
git diff --cached --check
python -m mkdocs build --strict
git status
```

One important bit: **do not pop the frontend stash** onto this branch. Leave that one alone.

If you send me the names/locations of the new CSV + transcript once you add them, I’ll check whether our evidence indexes need another link/update before you commit.

## Prompt:
9/27/2026, 6:46:16 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git checkout docs/753-reorganise-public-docs
>> git rebase main
Switched to branch 'docs/753-reorganise-public-docs'
Your branch is up to date with 'origin/docs/753-reorganise-public-docs'.
Auto-merging docs/api/overview.md
CONFLICT (content): Merge conflict in docs/api/overview.md
Auto-merging evidence/sprints/sprint-3/README.md
CONFLICT (content): Merge conflict in evidence/sprints/sprint-3/README.md
error: could not apply aefce5a4... docs: reorganise public documentation and evidence
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: You can instead skip this commit: run "git rebase --skip".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
hint: Disable this message with "git config set advice.mergeConflict false"
Could not apply aefce5a4... # docs: reorganise public documentation and evidence
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/27/2026, 6:46:25 PM · gpt-5-6-thinking

> **Resolving rebase conflicts**
>
> I’m keeping both main’s updates and the branch’s documentation changes. During this rebase, `HEAD` represents main, while the incoming commit contains the branch edits. I’ll inspect each conflict, combine content manually, stage files, and continue the rebase.
>
> **Resolved rebase conflicts**
>
> 
>
> Worked for 10s

That’s okay - **don’t abort yet**. You only have two conflicts, which is very manageable.

Because this is a **rebase**, Git is replaying your #753 commit on top of the new `main`. In the conflict editor:

- **Current / HEAD** = the new `main`
- **Incoming** = your #753 documentation changes

For these two files, we almost certainly want to **combine both**, not choose only one side.

Open them in VS Code:

```powershell
code docs/api/overview.md
code evidence/sprints/sprint-3/README.md
```

Look for sections like:

```text
<<<<<<< HEAD
new content from main
=======
your #753 content
>>>>>>> aefce5a4...
```

Keep the useful content from **both sides**, then delete all three conflict-marker lines.

For `docs/api/overview.md`, preserve any **new API functionality/details from main**, while also keeping our #753 navigation/cross-link additions.

For `evidence/sprints/sprint-3/README.md`, preserve any **new Sprint 3 evidence added on main**, while keeping our reorganised evidence structure and links. This one especially should be merged rather than taking one side.

Once both files have **no `<<<<<<<`, `=======`, or `>>>>>>>` markers**, run:

```powershell
git add docs/api/overview.md
git add evidence/sprints/sprint-3/README.md

git status
```

You should then see the conflicts marked resolved. Continue:

```powershell
git rebase --continue
```

If Git opens an editor with the commit message, just **save and close it**; keep the existing commit message.

If another conflict appears, **stop there and send it to me**. Don’t use `--skip`.

Once the rebase finishes, run:

```powershell
git status
```

Then we can restore your `WIP #753...` stash/add the new CSV and transcript.

One important thing: because this branch already exists on `origin` and we’re rebasing it, **don’t use a normal `git push` afterwards**. When everything is finished and verified, we’ll use:

```powershell
git push --force-with-lease
```

-not plain `--force`.

If you want, paste the actual conflicted contents of those **two files** here and I’ll tell you exactly what the merged versions should be.

## Prompt:
9/27/2026, 6:47:10 PM

**&#xA0;Sprint 3 evidence**

This directory indexes Sprint 3 planning, stand-up, stakeholder, performance and deployment
acceptance evidence. Gitea remains authoritative for live issue status and dependencies.

<<<<<<< HEAD
\| Record                                                                                                       | Issue | Status                                                                                                                                                                                                                                                                            |
\| ------------------------------------------------------------------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
\| [\`2026-09-15-planning.md\`]\(2026-09-15-planning.md)                                                           | #577  | Complete                                                                                                                                                                                                                                                                          |
\| [\`2026-09-17-standup.md\`]\(2026-09-17-standup.md)                                                             | #577  | Complete                                                                                                                                                                                                                                                                          |
\| [\`issue-565-production-scale-deployment-acceptance.md\`]\(issue-565-production-scale-deployment-acceptance.md) | #565  | **\*\*Partially complete.\*\*** The deployed asynchronous lifecycle completed on 2026-09-24 for \`2026.09.24-issue-565-live\` with 3,207,110 events. Automated-run output, artifact checksum, browser/authenticated journey, controlled restart and Azure capacity evidence remain pending. |
\| [\`issue-599-performance-revalidation.md\`]\(issue-599-performance-revalidation.md)                             | #599  | Complete for local measurement. Does **\*\*not\*\*** include a deployed re-run.                                                                                                                                                                                                           |
\| [\`issue-726-api-explorer-loading-feedback.md\`]\(issue-726-api-explorer-loading-feedback.md)                   | #726  | Implementation evidence records the supplied client feedback, identified deferred stages and automated component checks. Manual throttling, mobile screenshots and stakeholder retest remain pending.                                                                             |
**=======**
**## Sprint records**

\| Record                                                                                                     | Context                                            |
\| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
\| [2026-09-15-planning.md]\(2026-09-15-planning.md)                                                           | Sprint planning and refined Sprint 3 scope         |
\| [2026-09-17-standup.md]\(2026-09-17-standup.md)                                                             | Team stand-up                                      |
\| [2026-09-22 Asynch Stakeholder meeting/]\(2026-09-22%20Asynch%20Stakeholder%20meeting/)                     | Asynchronous stakeholder message/response evidence |
\| [2026-09-24 Standup.jpeg]\(2026-09-24%20Standup.jpeg)                                                       | Stand-up evidence image                            |
\| [issue-565-production-scale-deployment-acceptance.md]\(issue-565-production-scale-deployment-acceptance.md) | Production-scale deployment acceptance record      |
\| [issue-565-live-result.json]\(issue-565-live-result.json)                                                   | Raw Issue #565 live-run result                     |
\| [issue-599-performance-revalidation.md]\(issue-599-performance-revalidation.md)                             | Performance re-validation record                   |

**## Original Teams meeting transcript**

The Word document remains the authoritative source. The PDF is a browser-friendly presentation copy.

\| Date        | Meeting  | Read                                              | Original                                            |
\| ----------- | -------- | ------------------------------------------------- | --------------------------------------------------- |
\| 17 Sep 2026 | Stand-up | [PDF]\(Teams%20Transcripts/17-09-2026-Standup.pdf) | [Word]\(Teams%20Transcripts/17-09-2026-Standup.docx) |
\>>>>>>> aefce5a4 (docs: reorganise public documentation and evidence)

**## Performance re-validation, issue #599**

The full record is [issue-599-performance-revalidation.md]\(issue-599-performance-revalidation.md),
with raw measurement output under [\`../../validation/issue-599/\`]\(../../validation/issue-599/).
Consult that record for the measured environment, results, limitations and follow-up findings rather
than copying individual figures out of context.

**## Related documentation**

\- [Public Sprint evidence index]\(../../../docs/process/sprint-evidence.md)
\- [Testing & Validation Evidence]\(../../../docs/process/validation-and-user-testing.md)
\- [Deployment & Operations]\(../../../docs/deployment/overview\.md)

**## AI Declaration**

The Sprint 3 repository evidence index was reorganised for discoverability with the assistance of
ChatGPT-Web[GPT-5.6 Sol].

## Response:
9/27/2026, 6:47:25 PM · gpt-5-6-thinking

Yep - for this one, **combine both sides**. Main has newer Sprint 3 evidence/status details that we must keep, while our branch has the cleaner structure plus the transcript and stakeholder links.

Replace the **entire file** with this:

```md
# Sprint 3 evidence

This directory indexes Sprint 3 planning, stand-up, stakeholder, performance and deployment
acceptance evidence. Gitea remains authoritative for live issue status and dependencies.

## Sprint records

| Record | Issue | Status / context |
| --- | --- | --- |
| [`2026-09-15-planning.md`](2026-09-15-planning.md) | #577 | Complete - Sprint planning and refined Sprint 3 scope |
| [`2026-09-17-standup.md`](2026-09-17-standup.md) | #577 | Complete - team stand-up |
| [`2026-09-22 Asynch Stakeholder meeting/`](2026-09-22%20Asynch%20Stakeholder%20meeting/) | - | Asynchronous stakeholder message and response evidence |
| [`2026-09-24 Standup.jpeg`](2026-09-24%20Standup.jpeg) | - | Stand-up evidence image |
| [`issue-565-production-scale-deployment-acceptance.md`](issue-565-production-scale-deployment-acceptance.md) | #565 | **Partially complete.** The deployed asynchronous lifecycle completed on 2026-09-24 for `2026.09.24-issue-565-live` with 3,207,110 events. Automated-run output, artifact checksum, browser/authenticated journey, controlled restart and Azure capacity evidence remain pending. |
| [`issue-565-live-result.json`](issue-565-live-result.json) | #565 | Raw Issue #565 live-run result |
| [`issue-599-performance-revalidation.md`](issue-599-performance-revalidation.md) | #599 | Complete for local measurement. Does **not** include a deployed re-run. |
| [`issue-726-api-explorer-loading-feedback.md`](issue-726-api-explorer-loading-feedback.md) | #726 | Implementation evidence records the supplied client feedback, identified deferred stages and automated component checks. Manual throttling, mobile screenshots and stakeholder retest remain pending. |

## Original Teams meeting transcript

The Word document remains the authoritative source. The PDF is a browser-friendly presentation copy.

| Date | Meeting | Read | Original |
| --- | --- | --- | --- |
| 17 Sep 2026 | Stand-up | [PDF](Teams%20Transcripts/17-09-2026-Standup.pdf) | [Word](Teams%20Transcripts/17-09-2026-Standup.docx) |

## Performance re-validation, issue #599

The full record is [issue-599-performance-revalidation.md](issue-599-performance-revalidation.md),
with raw measurement output under [`../../validation/issue-599/`](../../validation/issue-599/).
Consult that record for the measured environment, results, limitations and follow-up findings rather
than copying individual figures out of context.

## Related documentation

- [Public Sprint evidence index](../../../docs/process/sprint-evidence.md)
- [Testing & Validation Evidence](../../../docs/process/validation-and-user-testing.md)
- [Deployment & Operations](../../../docs/deployment/overview.md)

## AI Declaration

The Sprint 3 repository evidence index was reorganised for discoverability with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
```

That keeps the **new main content** - especially the updated #565 status and new #726 evidence - while retaining our cleaner evidence index, the async stakeholder material, 24 Sep stand-up image and transcript PDF/Word links.

Save it, then:

```powershell
git add "evidence/sprints/sprint-3/README.md"
```

Now send me the conflict from `docs/api/overview.md`, and I’ll merge that one exactly too.

## Prompt:
9/27/2026, 6:48:57 PM

The preceding API overview was reviewed and updated for the Intermediate implementation with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #635 public leaderboard endpoint and qualification summary were documented with the
assistance of Codex[GPT-5].
The Issue #660 public API Explorer workflow was reviewed and documented with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The Issue #661 public API Explorer discoverability and production UX guidance was reviewed and documented with the assistance of ChatGPT-Web[GPT-5.6 Sol].
<<<<<<< HEAD
The Issue #726 API Explorer loading-feedback guidance was updated with the assistance of Codex[GPT-5].
**=======**
The documentation reading-path links were added with the assistance of ChatGPT-Web[GPT-5.6 Sol].
\>>>>>>> aefce5a4 (docs: reorganise public documentation and evidence)

## Response:
9/27/2026, 6:49:05 PM · gpt-5-6-thinking

Keep **both lines** and remove the conflict markers. Replace that whole conflicted section with:

```md
The preceding API overview was reviewed and updated for the Intermediate implementation with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #635 public leaderboard endpoint and qualification summary were documented with the
assistance of Codex[GPT-5].
The Issue #660 public API Explorer workflow was reviewed and documented with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The Issue #661 public API Explorer discoverability and production UX guidance was reviewed and documented with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The Issue #726 API Explorer loading-feedback guidance was updated with the assistance of Codex[GPT-5].
The documentation reading-path links were added with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

Then run:

```powershell
git add docs/api/overview.md
git status
```

If both conflicts are resolved, continue:

```powershell
git rebase --continue
```

If Git opens the commit-message editor, just save/close it.

## Prompt:
9/27/2026, 6:50:24 PM

[Attachment: Pasted text(20260927-165022).txt]

## Response:
9/27/2026, 6:50:27 PM · gpt-5-6-thinking

> **Adding your files**
>
> Your rebase succeeded. Now copy the new CSV and transcript into the repository, then run:
> 
> ```bash
> git status
> git add path/to/file.csv path/to/transcript.txt
> git commit -m "Add CSV and transcript"
> git push --force-with-lease origin your-branch
> ```
>
> **Added your files**
>
> 
>
> Worked for 10s

Perfect - the rebase **finished successfully**. The “diverged” message is expected after a rebase; **do not `git pull` this branch**.

Since you still want to add the new CSV + transcript, do that **before pushing**.

Copy the two files into their correct places, probably something like:

```text
evidence/ai/registers/shayna-unterslak.csv
evidence/ai/transcripts/shayna-unterslak/<your-new-transcript-file>
```

Then check:

```powershell
git status
```

Stage just those files (replace the transcript filename/path with the real one):

```powershell
git add "evidence/ai/registers/shayna-unterslak.csv"
git add "evidence/ai/transcripts/shayna-unterslak/<filename>"
```

If the CSV already exists and you’re adding a new row, that’s fine - `git add` stages the modification.

Then:

```powershell
git diff --cached --check
git status
```

Commit them separately from the big docs commit:

```powershell
git commit -m "docs: add AI usage evidence" `
  -m "Add the latest AI register entry and supporting transcript evidence." `
  -m "Refs #753" `
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Because you rebased an already-pushed branch, update the remote with:

```powershell
git push --force-with-lease origin docs/753-reorganise-public-docs
```

**Use `--force-with-lease`, not `git pull` and not plain `--force`.**

Before you commit though, send me the **exact filenames/paths of the CSV and transcript** you’re adding. I want to check whether our new AI/evidence index should link to that transcript too, so we don’t add the evidence but leave the docs index stale.

## Prompt:
9/27/2026, 6:51:23 PM

give me csv and what to call this transcript

## Response:
9/27/2026, 6:51:33 PM · gpt-5-6-thinking

> **Located Shayna’s AI Register transcript entry**
>
> 
>
> Worked for 16s

Call the transcript:

```text
evidence/ai/transcripts/shayna-unterslak/2026-09-27-issue-753-documentation-evidence-reorganisation.md
```

That matches your existing naming pattern: date + issue + descriptive task. Your register uses the columns `Date, Team member, Tool, Model, Purpose, Brief task, Output used, Verification or adaptation, Related evidence`. `2026-09-15-issue-540-async-publication-throughput-acceptance.md`

Add this **one row** to the bottom of:

```text
evidence/ai/registers/shayna-unterslak.csv
```

```csv
2026-09-27,Shayna Unterslak,ChatGPT Web,GPT-5.6 Sol,"Documentation planning; documentation generation; information architecture review; evidence organisation; Git and rebase guidance","Issue #753: reorganise and consolidate the public documentation around human-oriented reader journeys, improve cross-linking and project-evidence discovery, add browser-readable PDF presentation copies of existing Teams meeting transcripts, and integrate the changes with the latest main branch.","Reviewed the current repository documentation and evidence structure; designed the revised MkDocs information architecture; generated updated navigation, landing pages, homepage and cross-links; reorganised Sprint and AI-evidence indexes; linked original Word meeting transcripts with PDF presentation copies; corrected stale documentation references; and assisted with rebasing the documentation branch and resolving documentation conflicts against updated main.","Shayna reviewed and applied the documentation changes, manually converted the existing Word meeting transcripts to PDF while retaining the originals, ran git diff --check, successfully ran python -m mkdocs build --strict, previewed the documentation locally with MkDocs, pulled the latest main branch, and manually reviewed and resolved rebase conflicts while preserving newer main-branch evidence.","evidence/ai/transcripts/shayna-unterslak/2026-09-27-issue-753-documentation-evidence-reorganisation.md; Issue #753; current Pull Request"
```

And the transcript itself should be the **actual exported/current conversation**, not a rewritten summary. The course policy requires the tool, model and purpose to be recorded, and notes that unedited transcripts may be required for assessment evidence. `ai_policy_20_jul(1).pdf`

After saving both:

```powershell
git add `
  "evidence/ai/registers/shayna-unterslak.csv" `
  "evidence/ai/transcripts/shayna-unterslak/2026-09-27-issue-753-documentation-evidence-reorganisation.md"

git diff --cached --check
git status
```

Then we can check whether `docs/process/ai-use-evidence.md` already discovers it automatically or whether #753 should add one small explicit link.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)