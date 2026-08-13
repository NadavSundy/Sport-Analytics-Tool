# Fix Supabase Database URL

**User:** Anonymous  
**Created:** 8/10/2026 12:05:05  
**Updated:** 8/10/2026 12:10:12  
**Exported:** 8/13/2026 17:06:22  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a79a249-4800-83ea-92b5-e98ba23f42eb](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a79a249-4800-83ea-92b5-e98ba23f42eb)  

## Prompt:
8/10/2026, 12:05:05 PM

[Attachment: 7900d500-917d-451f-a251-7ecccb228088.png]

how to fix

## Response:
8/10/2026, 12:05:05 PM

> **Searching the web**
>
> [Database](https://en.wikipedia.org/wiki/Database)
> [Connect to your database | Supabase Docs](https://supabase.com/docs/guides/database/connecting-to-postgres)
> [What is a Database? - Types, Uses, How it Works & ...](https://www.nutanix.com/info/database/what-is-database)
> [What is a database and how is it used? | Usage, tips and guide](https://pigment.se/en/lexicon/database)
> [What Is a Database?](https://azure.microsoft.com/en-us/resources/cloud-computing-dictionary/what-are-databases)
> [What is a Database? | IBM](https://www.ibm.com/think/topics/database)
> [What is a Database? A Guide to Understanding Databases](https://www.mongodb.com/resources/basics/databases/databases)
> [The Types of Databases (with Examples)](https://www.matillion.com/blog/the-types-of-databases-with-examples)
> [What is a Database?](https://medium.com/%40mailforwork.ansh1/what-is-a-database-623a217e1628)
>
> **Connecting Supabase correctly**
>
> I’m focusing on the backend’s expected session-pooler connection. The team should copy the exact URI from Supabase’s Connect panel, place it in the backend’s `.env` as `DATABASE_URL`, keep credentials private, restart the server, and verify the connection.
>
> **Connected Supabase correctly**
>
> 
>
> **Searching the web**
>
>
> **Clarifying deployment steps**
>
> I’m distinguishing local and Azure configuration: update the backend’s local `.env` for development, and set the same `DATABASE_URL` in Azure’s backend environment settings for deployment. Then restart the backend and verify database-backed features.
>
> **Searching the web**
>
>
> **Searched 9 websites**
>
> 
>
> Worked for 44s

The fix is to make the **backend’s `DATABASE_URL` point to your shared Supabase PostgreSQL database instead of localhost**. Do **not** connect the frontend directly to Supabase PostgreSQL.

Your teammate’s diagnosis in the screenshot makes sense: the backend can run perfectly while database-backed pages show nothing if it is still trying something like `localhost:5432`.

### 1. Get the correct Supabase connection string

Someone with access to the team’s Supabase project should open:

**Supabase Dashboard → your project → Connect**

Choose the **Shared Pooler / Session mode** connection. Supabase currently recommends using the pooler when IPv4 compatibility is needed, and the session pooler normally uses port **5432**. ([Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres?utm_source=chatgpt.com))

It should look approximately like:

```text
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

**Do not manually guess the hostname/project ref. Copy the exact URI from Supabase.**

Replace the password placeholder with the team's actual **database password**.

### 2. Put it in the backend environment

Wherever your backend currently has:

```env
DATABASE_URL=postgresql://...
```

replace the local value, for example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/sport_analytics
```

with:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
```

Don't put this into anything frontend-exposed such as:

```env
VITE_DATABASE_URL=
REACT_APP_DATABASE_URL=
```

and **do not commit the real connection string to Git**.

### 3. If you are testing the deployed Azure backend, change it in Azure too

Changing your local `.env` only fixes the backend running on your computer.

For the deployed backend go to:

**Azure Portal → App Services → your backend → Settings → Environment variables → App settings**

Find or create:

```text
DATABASE_URL
```

and set its value to the Supabase session-pooler URI.

Save the change. Azure exposes App Settings as environment variables to your application and restarts the App Service when they are changed. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/configure-common?utm_source=chatgpt.com))

So you essentially want:

```text
Azure backend
     │
     │ DATABASE_URL
     ▼
Supabase Shared Pooler
     │
     ▼
PostgreSQL
```

rather than:

```text
Azure backend
     │
     ▼
localhost:5432   ❌
```

`localhost` from inside Azure means **the Azure server itself**, not Dean's computer and not Supabase.

### 4. Restart locally

If you're running locally, stop the backend and restart it so it reloads `.env`:

```powershell
Ctrl+C
npm run dev
```

Or whatever backend dev command your repo uses.

Then watch the terminal for errors such as:

```text
password authentication failed
getaddrinfo ENOTFOUND
connection refused
relation "..." does not exist
certificate error
```

Those errors tell us what the remaining issue is.

### 5. One important possibility: the connection works but Supabase has no schema/data

Getting the connection working does **not automatically create your tables**.

After the backend successfully connects, your team's database migrations need to have been applied to Supabase. Otherwise you'll typically get errors such as:

```text
relation "fixtures" does not exist
```

or the application may simply have no data to display.

So the flow should be:

```text
Get Supabase URL
        ↓
Set DATABASE_URL
        ↓
Test connection
        ↓
Run migrations against Supabase
        ↓
Seed/import test or cricket data
        ↓
Backend queries DB
        ↓
Frontend gets data through your HTTP API
```

That last architecture point matters for your SDP brief. Using Supabase **as hosted PostgreSQL is fine**, but you should not use Supabase's automatically generated REST endpoints as your project's API. The brief explicitly requires your team to design and implement the HTTP API yourselves and lists generated Firebase/Supabase endpoints as something you may not use. `project_briefs (4).pdf` Your Sport Analytics brief also treats the API as a core product of the platform. `sport_analytics (1).pdf`

### What I would do right now

Ask whoever owns the Supabase project to send you the **Shared Pooler → Session mode URI** securely. Don't post the real password/string in the group chat or send it to me.

Then set:

```env
DATABASE_URL="<the copied Supabase session-pooler URI>"
```

in **both** the local backend environment and the Azure backend's environment variables.

After that, restart the backend.

If you send me **the error from the backend terminal after restarting** - with the password/connection string redacted - I can tell you the exact next command or change.

---

**Sources:**

- [Connect to your database | Supabase Docs](https://supabase.com/docs/guides/database/connecting-to-postgres?utm_source=chatgpt.com)
- [Configure an App Service App - Azure](https://learn.microsoft.com/en-us/azure/app-service/configure-common?utm_source=chatgpt.com)

## Prompt:
8/10/2026, 12:07:45 PM

Skip to content
SupabaseBack to organization home
[2434490@students.wits.ac.za](mailto:2434490@students.wits.ac.za)'s Org
Free
sport-analytics-dev
main
Production
Connect
Feedback
Search...
Ctrl K
Help
Advisor Center
SQL Editor
AI Assistant
DeanFeldman
Advisors
sport-analytics-dev
[https://dbujjthhdfddghbxqjek.supabase.co](https://dbujjthhdfddghbxqjek.supabase.co)
Copyproject URL and API keys
Status
Healthy
Compute
nano
GitHub
No repository connected
Recent branch
No branches
Last migration
No migrations
Last backup
No backups

Get connected
Framework
Use a client library
Server
Build APIs
Direct
Connection string
ORM
Third-party library
MCP
Connect your agent
API Keys
Manage project keys
142
Total Requests
20.4%
Success Rate
Last 60 minutes
Postgres
124
Warnings
0
Errors
110
Aug 10, 11:08am
Aug 10, 12:06pm
Storage
13
Warnings
0
Errors
0
Aug 10, 11:08am
Aug 10, 12:06pm
Auth
3
Warnings
3
Errors
0
Aug 10, 11:08am
Aug 10, 12:06pm
Realtime
2
Warnings
0
Errors
0
Aug 10, 11:08am
Aug 10, 12:06pm
Edge Functions
0
Warnings
0
Errors
0
Aug 10, 11:08am
Aug 10, 12:06pm
Advisor found no issues
Ask Assistant
No security or performance issues found
Reports
Add block
Build a custom report
Keep track of your most important metrics
Add your first block
sport-analytics-dev | [2434490@students.wits.ac.za](mailto:2434490@students.wits.ac.za)'s Org | Supabase

idk where to dind

## Response:
8/10/2026, 12:07:48 PM

> **Searching the web**
>
> [How do I update connection pool settings in my dashboard?](https://supabase.com/docs/guides/troubleshooting/how-do-i-update-connection-pool-settings-in-my-dashboard-wAxTJ_)
> [Google Dashboard](https://myaccount.google.com/intro/dashboard)
> [Database](https://en.wikipedia.org/wiki/Database)
> [CONNECTION Definition & Meaning](https://www.merriam-webster.com/dictionary/connection)
> [What is a Database? | IBM](https://www.ibm.com/think/topics/database)
> [Connections Word Game - Apps on Google Play](https://play.google.com/store/apps/details?hl=en&id=com.wordsearch.connections)
> [What Is a Database?](https://azure.microsoft.com/en-us/resources/cloud-computing-dictionary/what-are-databases)
> [CONNECTION | English meaning - Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/connection)
> [What is a Database? A Guide to Understanding Databases](https://www.mongodb.com/resources/basics/databases/databases)
> [What the hell *is* a database anyway? : r/compsci](https://www.reddit.com/r/compsci/comments/1mchfjm/what_the_hell_is_a_database_anyway/)
> [CONNECTION definition and meaning | Collins English ...](https://www.collinsdictionary.com/dictionary/english/connection)
> [What Is a Database?](https://www.coursera.org/articles/what-is-database)
> [Connection](https://www.linkedin.com/company/connection-it)
>
> **Searched 13 websites**
>
> 
>
> Worked for 4s

You’re already on the right page. At the top of the Supabase dashboard you pasted, click **`Connect`** - it’s beside **Production** near the top.

Then do this:

1. Click **Connect**.
2. In the popup, find **Connection string**.
3. Look for **Session pooler** / **Shared Pooler**.
4. Select **Session mode** if it gives you a choice.
5. Copy the URI that uses **port `5432`**.

Supabase’s current docs confirm that the **Session Pooler** string is available through the project’s **Connect** panel and that session mode uses port `5432`. ([Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres?utm_source=chatgpt.com))

It should look roughly like:

```text
postgresql://postgres.dbujjthhdfddghbxqjek:[YOUR-PASSWORD]@aws-0-SOME-REGION.pooler.supabase.com:5432/postgres
```

Your project reference appears to be:

```text
dbujjthhdfddghbxqjek
```

but **copy the actual string Supabase gives you rather than constructing it manually**.

### When it asks for the password

That `[YOUR-PASSWORD]` is the **database password that was chosen when the Supabase project was created**. It is **not** your Wits password, API key, anon key, or Supabase login password.

If nobody knows it, Supabase says it can be reset from the project's **Database Settings**. ([Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/laravel?utm_source=chatgpt.com))

### Very important

Don't send me or WhatsApp the finished connection string containing the real password.

You can send me something redacted like:

```text
postgresql://postgres.dbujjthhdfddghbxqjek:*****@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

and I can check whether you've selected the correct one.

Also, don't choose the thing you're currently seeing as:

```text
https://dbujjthhdfddghbxqjek.supabase.co
```

That's your **Supabase project URL**, not the PostgreSQL `DATABASE_URL` your backend needs.

**Next action:** click **Connect** at the top and send me a screenshot of the popup. Don't reveal the password; I'll point out exactly which connection string to copy.

---

**Sources:**

- [Connect to your database | Supabase Docs](https://supabase.com/docs/guides/database/connecting-to-postgres?utm_source=chatgpt.com)



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)