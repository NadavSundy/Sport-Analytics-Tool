# Event Data Submission Process

**User:** Anonymous  
**Created:** 8/6/2026 9:26:12  
**Updated:** 8/6/2026 9:33:46  
**Exported:** 8/7/2026 12:53:25  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a743711-27c0-83ea-89f3-6d4cc76f5b6c](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a743711-27c0-83ea-89f3-6d4cc76f5b6c)  

## Prompt:
8/6/2026, 9:26:08 AM

Event data reaches the platform by submission. Only approved submitters should be able to submit, and 
each should submit within a defined part of the competition, so it is always clear who supplied a given 
event. A submission, uploaded as a file or sent to the platform directly, should be checked against the 
platform’s event schema before it is accepted, and a rejection should tell the submitter what was wrong 
with it rather than failing quietly. Every published statistic should be traceable back to the events and 
the submission behind it.

what does thi smean

## Response:
8/6/2026, 9:26:10 AM

This paragraph is describing **how event data gets into your system** and how you ensure the data is trustworthy. It's one of the core requirements of the Sport Analytics Tool. `sport_analytics (1).pdf`

Here's what each sentence means in practical terms:

| Requirement | What it means | Example |
|-------------|---------------|---------|
| **Only approved submitters should be able to submit** | Not everyone can upload match data. Only authorized users (e.g. official statisticians, referees, league admins) can. | Only the official scorer for the Sharks vs Bulls match can upload events. |
| **Each should submit within a defined part of the competition** | Every submitter is responsible for specific matches, divisions, tournaments or teams. This makes it obvious who entered the data. | John submits Premier League matches, Sarah submits Under-21 matches. |
| **It is always clear who supplied a given event** | Every event must record who submitted it. This is data provenance (audit trail). | Goal #14567 was submitted by User 23 in Submission #812. |
| **Submission uploaded as a file or sent directly** | Support either uploading a file (JSON/CSV/XML) or sending data via an API. | Upload `match123.json` OR POST `/api/submissions`. |
| **Checked against the platform's event schema** | Validate the data before saving it. The file/API payload must match your expected format. | Ensure every football goal has `minute`, `playerId`, `teamId`, `eventType`. |
| **Rejection should tell the submitter what was wrong** | Return meaningful validation errors instead of just "Upload Failed". | `"Line 45: playerId does not exist"` or `"Missing field: minute"`. |
| **Every published statistic should be traceable** | Any statistic shown in the system must be linked back to the exact events that produced it and the submission they came from. | "Player X has 12 goals" → click it → see the 12 Goal events → see the submission that contained them. |

---

## Example workflow

```text
Official Statistician
        │
        ▼
Login
        │
        ▼
Upload match_events.json
        │
        ▼
Validate Schema
        │
   ┌────┴─────┐
   │          │
Valid      Invalid
   │          │
   ▼          ▼
Save Events  Return errors
   │
   ▼
Recalculate statistics
   │
   ▼
Store link:
Statistic
   ↑
Events
   ↑
Submission
   ↑
Submitter
```

---

## What this means for your database

You'll probably end up with something like:

```
User
 ├── id
 ├── role
 └── approved

Competition
 └── id

SubmitterAssignment
 ├── userId
 ├── competitionId
 └── permissions

Submission
 ├── id
 ├── uploadedBy
 ├── uploadedAt
 ├── status
 └── fileName

Event
 ├── id
 ├── submissionId
 ├── fixtureId
 ├── eventType
 ├── timestamp
 └── data

Statistic
 ├── playerId
 ├── value
 └── derivedFromEvents
```

Notice that **Statistics are not entered manually**. They are calculated from the `Event` records, and every event knows which `Submission` created it. This is exactly what the brief is asking for. `sport_analytics (1).pdf`

---

## For your project (recommended implementation)

Since you're aiming for the Advanced tier, I would implement the submission pipeline like this:

1. **Authenticated approved submitter logs in** (OAuth/auth provider).
2. **Submitter uploads a JSON file** (or sends JSON to the API).
3. **Backend validates the JSON** against a JSON Schema (e.g. using Ajv if you're using Node.js).
4. **If validation fails**, return a detailed list of errors.
5. **If validation passes**, create a `Submission` record.
6. **Store all events** linked to that submission.
7. **Recompute derived statistics** from the new events.
8. **Allow users to drill down** from any statistic to the underlying events and the submission that produced them.

This design satisfies every requirement in that paragraph while giving you a strong foundation for the Intermediate and Advanced features later in the brief.

## Prompt:
8/6/2026, 9:29:44 AM

The API is the platform’s product rather than an accessory to a web interface. Another platform should 
be able to read fixtures, events, and derived statistics through it, narrow a request to the slice it cares 
about, and page through results too large to return at once. Identifiers should be stable, so that a 
consumer holding a reference from last season can still resolve it. An analyst should also be able to 
export a filtered slice of the data as a file for use elsewhere.

what does this mean

## Response:
8/6/2026, 9:29:45 AM

This paragraph is saying that **your backend API is the main product**, not your website. The website is just one client of the API. Other developers should be able to build their own apps using your API. `sport_analytics (1).pdf`

Let's break it down.

---

## 1. "The API is the platform's product rather than an accessory to a web interface."

### What most websites do

```text
User
   │
Website
   │
Database
```

The API exists only so the website can work.

### What your project should do

```text
                Mobile App
                    │
Research Tool ───── API ───── Website
                    │
         Third-party App
                    │
                Database
```

The **API is the centre of everything**.

Your React frontend should call your API.

A mobile app could also call it.

Someone doing sports research could call it.

Someone could build another analytics website using your API.

---

## 2. "Another platform should be able to read fixtures, events, and derived statistics through it"

Your API should expose data like:

### Fixtures

```
GET /api/v1/fixtures
```

Returns

```json
[
  {
    "id": 125,
    "homeTeam": "Bulls",
    "awayTeam": "Sharks",
    "date": "2026-08-01"
  }
]
```

---

### Events

```
GET /api/v1/fixtures/125/events
```

Returns

```json
[
  {
    "minute": 12,
    "type": "TRY",
    "player": "John Smith"
  },
  {
    "minute": 24,
    "type": "PENALTY",
    "player": "Mike Jones"
  }
]
```

---

### Derived statistics

Notice these are **calculated**, not stored manually.

```
GET /api/v1/players/54/statistics
```

Returns

```json
{
  "tries": 12,
  "points": 65,
  "tackles": 103
}
```

---

## 3. "Narrow a request to the slice it cares about"

Nobody wants **all** the data.

They should be able to filter it.

Examples:

```
GET /players?team=Sharks
```

Only Sharks players.

---

```
GET /fixtures?season=2026
```

Only 2026 fixtures.

---

```
GET /events?playerId=23
```

Only events involving player 23.

---

```
GET /statistics?competition=CurrieCup
```

Only Currie Cup statistics.

This is called **filtering**.

---

## 4. "Page through results too large to return at once"

Imagine you have

- 5000 matches
- 2 million events

Don't send everything.

Instead:

```
GET /events?page=1&limit=100
```

Returns

Events 1-100.

Then

```
GET /events?page=2&limit=100
```

Returns

Events 101-200.

This is called **pagination**.

Every professional API does this.

---

## 5. "Identifiers should be stable"

Suppose someone saved

```
Player ID = 54
```

last year.

Next year

```
GET /players/54
```

should still return that same player.

Never do things like

```
Player 54
↓

Delete

↓

Create a new Player 54
```

IDs should never change because external systems may rely on them.

A good choice is

- UUIDs
- Auto-increment IDs that are never reused

---

## 6. "An analyst should also be able to export a filtered slice of the data"

Someone might want data for research.

For example:

```
GET /exports/events?season=2026&team=Bulls
```

Your API generates

```
bulls-events-2026.csv
```

or

```
bulls-events-2026.json
```

Now they can import it into

- Python
- Excel
- R
- MATLAB
- Tableau
- Power BI

---

# What your API should probably look like

```text
GET /api/v1/fixtures

GET /api/v1/fixtures/{id}

GET /api/v1/fixtures/{id}/events

GET /api/v1/events

GET /api/v1/events/{id}

GET /api/v1/players

GET /api/v1/players/{id}

GET /api/v1/players/{id}/statistics

GET /api/v1/teams

GET /api/v1/statistics

GET /api/v1/exports
```

Every endpoint should support filtering where it makes sense, for example:

```
GET /events?fixtureId=20

GET /events?playerId=34

GET /fixtures?season=2026

GET /statistics?team=Sharks

GET /players?position=FlyHalf
```

---

# Why this is important for marks

This requirement is one of the highest-weighted parts of the project. The brief explicitly states that **the API is the platform's product**, not just something that supports the web interface. It also expects:
- A well-designed HTTP API.
- Filtering so consumers can request only the data they need.
- Pagination for large datasets.
- Stable identifiers that remain valid over time.
- Exporting filtered datasets for analysis. `sport_analytics (1).pdf`

If you design the API first and build your React frontend to consume it (rather than letting the frontend dictate the backend), you'll be following the intent of the brief and setting yourselves up well for the API-related rubric marks.

## Prompt:
8/6/2026, 9:31:38 AM

what does this mean

## Response:
8/6/2026, 9:31:41 AM

In simple terms, your lecturer is saying:

> **"Don't build a website with an API. Build an API that happens to have a website."** `sport_analytics (1).pdf`

Imagine your platform is for football.

Instead of thinking:

```text
Website
   │
API (just for the website)
   │
Database
```

Think:

```text
             Website
                │
Mobile App ─── API ─── Research Tool
                │
        Another Sports Website
                │
            Database
```

The **API is the product**. Anyone should be able to use it-not just your own frontend.

### Example

Suppose ESPN wanted to display your league's statistics.

They shouldn't need your website.

They should simply call your API:

```
GET /api/v1/players/123/statistics
```

and receive:

```json
{
  "player": "John Smith",
  "goals": 12,
  "assists": 7
}
```

Likewise, if a university researcher wanted all matches from the 2026 season, they could call:

```
GET /api/v1/fixtures?season=2026
```

or export them as a CSV.

---

### Here's what each sentence means

#### "Another platform should be able to read fixtures, events, and derived statistics through it."

Other software should be able to get data from your API.

Examples:

- Mobile app
- Another website
- Python analysis script
- Research software
- Excel

---

#### "Narrow a request to the slice it cares about."

Don't force users to download everything.

Allow filters like:

```
GET /events?fixtureId=45
```

or

```
GET /players?team=Bulls
```

---

#### "Page through results too large to return at once."

If you have 2 million events, don't return all 2 million.

Instead:

```
GET /events?page=1&limit=100
```

returns the first 100.

Then:

```
GET /events?page=2&limit=100
```

returns the next 100.

---

#### "Identifiers should be stable."

If a player has ID `123`, then next year:

```
GET /players/123
```

should still refer to that same player.

Don't change IDs every season.

---

#### "Export a filtered slice of the data."

Someone might want:

> "Give me all Sharks matches from 2026 as a CSV."

Your API should support something like:

```
GET /exports/events?team=Sharks&season=2026
```

which downloads:

```
sharks-2026.csv
```

---

## What your lecturer is really testing

They want to know that you're building a **real-world analytics platform**, not just a CRUD website.

A normal student project looks like this:

- Website ✅
- Database ✅
- API only exists because React needs it ❌

They want this instead:

- Well-designed API ✅
- Website uses the API ✅
- Other developers can also use the API ✅
- Data can be queried and exported independently of the website ✅

That's why the brief says **"The API is the platform's product rather than an accessory to a web interface."** The API should be useful even if your React frontend didn't exist. `sport_analytics (1).pdf`

## Prompt:
8/6/2026, 9:33:11 AM

i dont understadn how this should work

does our curr structure work

## Response:
8/6/2026, 9:33:17 AM

> **Searching the web**
>
>
> **Searching the web**
>
> 
>
> Worked for 5s

**Your overall structure can work**-provided the frontend and backend are truly separate, and the “middle layer” is not a second backend that duplicates responsibilities.

The brief requires a **non-monolithic frontend and backend** and a **hand-written HTTP API**. `project_briefs (4).pdf`

## How it should work

```text
React frontend
      |
      | HTTP requests
      v
Your Node/Express API
      |
      | database queries
      v
Supabase PostgreSQL
```

The important part is:

> The React frontend should never directly read or write your sports data in Supabase.

Instead, it should call your API:

```http
GET /api/v1/fixtures
GET /api/v1/events?fixtureId=123
GET /api/v1/players/45/statistics
```

Your backend receives the request, validates it, queries PostgreSQL, calculates or retrieves the statistic, and returns JSON.

The same API can then be used by:

```text
Your React website
Python analysis scripts
Mobile applications
Other sports websites
External researchers
```

That is what the brief means by saying the API is the product.

## Does your current folder structure work?

Based on the structure we previously planned, something like this is correct:

```text
Sport-Analytics-Tool/
├── frontend/
├── backend/
├── docs/
├── database/
├── tests/
├── scripts/
└── .gitea/
```

### `frontend/`

Contains only the user interface:

```text
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── features/
│   └── services/
└── package.json
```

The frontend service files call your backend:

```ts
fetch(`${API_URL}/api/v1/fixtures`);
```

They should not contain direct PostgreSQL queries.

### `backend/`

Contains your hand-written API and business logic:

```text
backend/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── validation/
│   └── middleware/
└── package.json
```

For example:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Database
```

A request might flow like this:

```text
GET /api/v1/players/123/statistics
        ↓
playerStatisticsController
        ↓
statisticsService
        ↓
eventRepository
        ↓
PostgreSQL
        ↓
Calculated statistics returned as JSON
```

### `database/`

Contains database documentation and migrations:

```text
database/
├── migrations/
├── seeds/
├── schema/
└── README.md
```

### `docs/`

Contains documentation source files for your public documentation site:

```text
docs/
├── architecture/
├── api/
├── database/
├── deployment/
├── methodology/
├── security/
└── testing/
```

## What about the “middle layer”?

You probably **do not need a separate middle-layer application**.

Your backend already is the middle layer:

```text
Frontend → Backend API → Database
```

Inside the backend, you can create internal layers:

```text
Routes → Controllers → Services → Repositories
```

That gives you separation without deploying three different applications.

A structure like this would be unnecessary:

```text
Frontend → Middle layer → Backend → Database
```

It adds deployment complexity, more network failures, duplicated validation, and extra testing without helping the requirements.

## The crucial check

Your structure works only if this is true:

```text
Frontend
   ↓ HTTP
Backend API
   ↓ SQL/database client
Database
```

It does **not** satisfy the intended design if it works like this:

```text
Frontend ──────────────→ Supabase database
    └────→ Backend API sometimes
```

That would make the API optional rather than the platform’s main product.

Using Supabase as hosted PostgreSQL is reasonable. However, using Supabase-generated REST endpoints for your sports data would violate the requirement that the team design and implement its own API. The brief specifically warns against generated endpoints such as Supabase and Firebase. `project_briefs (4).pdf`

You may still use an established authentication provider, because the brief requires you not to build authentication from scratch. `project_briefs (4).pdf`

## Recommended final architecture

```text
┌──────────────────────────┐
│ React Frontend           │
│ Azure Static Web Apps    │
└────────────┬─────────────┘
             │ HTTPS/JSON
             ▼
┌──────────────────────────┐
│ Node.js/Express Backend  │
│ Hand-written /api/v1     │
│ Azure App Service        │
├──────────────────────────┤
│ Authentication checks    │
│ Input validation         │
│ Submission processing    │
│ Statistics derivation    │
│ Filtering and pagination │
│ Export generation        │
└────────────┬─────────────┘
             │ TLS/SQL
             ▼
┌──────────────────────────┐
│ Supabase PostgreSQL      │
│ Database hosting only    │
└──────────────────────────┘
```

## Next check

Your current structure is suitable if:

- [ ] `frontend` and `backend` have separate entry points and package files.
- [ ] The frontend accesses sports data only through the backend API.
- [ ] The backend owns validation, permissions and statistics calculations.
- [ ] Supabase-generated data endpoints are not used.
- [ ] The API supports fixtures, events, statistics, filtering and pagination.
- [ ] The frontend is simply one consumer of that API.
- [ ] The backend can be deployed and used without the frontend.

I could not inspect the live Gitea repository because the supplied repository address returned a 404 from this environment, so this assessment is based on the project structure we previously planned rather than a fresh inspection of the repository.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)