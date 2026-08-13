# Choose Azure Database

**User:** Anonymous  
**Created:** 8/11/2026 14:44:36  
**Updated:** 8/11/2026 19:27:20  
**Exported:** 8/13/2026 17:07:36  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a7b1924-c420-83ea-b5c3-ace8a36005b1](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a7b1924-c420-83ea-b5c3-ace8a36005b1)  

## Prompt:
8/11/2026, 2:44:32 PM

we need a bigger DB, whch microsfot AZURE one will do and is free

## Response:
8/11/2026, 2:44:36 PM

> **Searching the web**
>
> [Azure Database for PostgreSQL](https://azure.microsoft.com/en-us/products/postgresql)
> [Compute Options - Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute)
> [Microsoft Azure: Azure for Students Supplementary Notes](https://depaul.service-now.com/sp?id=kb_article_view&sysparm_article=KB0013202)
> [Microsoft Azure](https://en.wikipedia.org/wiki/Microsoft_Azure)
>
> **Choosing Azure storage**
>
> I’m matching the PostgreSQL-based backend with Azure Database for PostgreSQL Flexible Server, using the smallest burstable tier and 32 GB storage. It’s the closest drop-in option; free access is time-limited, not permanent.
>
> **Chose Azure storage**
>
> 
>
> **Searched 4 websites**
>
> 
>
> Worked for 24s

## Recommended outcome: use **Azure Database for PostgreSQL - Flexible Server**

For your Sport Analytics Tool, this is the Azure database I would choose. It matches your existing PostgreSQL architecture, so you **do not need to redesign the database or rewrite the backend around Azure SQL/Cosmos DB**.

Microsoft currently includes this PostgreSQL configuration in its Azure free offer:

- **Azure Database for PostgreSQL - Flexible Server**
- **Burstable B1ms**
- **750 compute hours/month** - enough for one instance running continuously
- **32 GB database storage**
- **32 GB backup storage**
- **Free for 12 months** for eligible new Azure/free-account customers. ([Microsoft Azure](https://azure.microsoft.com/en-us/products/postgresql?utm_source=chatgpt.com))

That's a sensible size for the project, particularly since your project brief expects a system capable of handling hundreds of fixtures with hundreds of events, eventually supporting large-scale event-derived analytics. `sport_analytics (1).pdf`

### Since you're a student

You should use **Azure for Students** rather than a normal pay-as-you-go account if you're eligible. Microsoft currently provides students with **US$100 Azure credit**, no credit card required, plus eligible free-service allowances. ([Microsoft Azure](https://azure.microsoft.com/en-us/free/students?utm_source=chatgpt.com))

So I'd set it up roughly like this:

**Azure Portal → Create a resource → Azure Database for PostgreSQL flexible server**

Then choose:

```text
Service:
Azure Database for PostgreSQL Flexible Server

Workload:
Development

Compute tier:
Burstable

Compute size:
Standard_B1ms

Storage:
32 GiB

High Availability:
Disabled

Authentication:
PostgreSQL authentication

Database:
sport_analytics
```

Don't enable things such as high availability or larger compute instances yet, because they can move you outside the free allowance.

### Why I would NOT choose the other Azure databases

**Azure SQL Database:** technically capable, but you're already using PostgreSQL, so moving to SQL Server would mean changing database drivers, SQL, migrations, tests and potentially schema behaviour for no meaningful project benefit.

**Azure Cosmos DB:** Microsoft offers an always-free allowance for Cosmos DB, but it's a different database model. Migrating your relational event model to Cosmos would create substantial unnecessary work and risk.

**PostgreSQL Flexible Server is the cleanest option.** Your backend can continue using a normal PostgreSQL connection string:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/sport_analytics?sslmode=require
```

Your architecture remains:

```text
React frontend
       │
       ▼
Handwritten HTTP API
       │
       ▼
Azure PostgreSQL Flexible Server
       │
       ├── competitions
       ├── fixtures
       ├── submissions
       ├── innings
       ├── overs
       ├── deliveries/events
       ├── players
       └── derived statistics
```

That also keeps you aligned with the compulsory requirement that **your backend must expose your handwritten HTTP API rather than exposing generated database endpoints**. The project brief explicitly prohibits relying on generated endpoints such as Supabase/Firebase APIs. `project_briefs (4).pdf`

### One important catch

The PostgreSQL free allocation is **not permanently free**. Microsoft describes the B1ms/32 GB PostgreSQL allowance as a **12-month** free service. ([Microsoft Azure](https://azure.microsoft.com/en-us/products/postgresql?utm_source=chatgpt.com))

That's not really a problem for COMS3011A: your project submission is **11 October 2026**, so it comfortably covers the semester if you create it now. `project_briefs (4).pdf`

Also, the service itself can scale far beyond 32 GB later if necessary; Microsoft documents much larger storage configurations for PostgreSQL Flexible Server. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-optimal-performance?utm_source=chatgpt.com))

**So: create `Azure Database for PostgreSQL Flexible Server → Burstable B1ms → 32 GB`.** That's the Azure option I'd use for the team.

If you show me your **Azure Create PostgreSQL screen**, I can tell you **exactly which options to select so that you don't accidentally create something chargeable**.

---

**Sources:**

- [Azure Database for PostgreSQL](https://azure.microsoft.com/en-us/products/postgresql?utm_source=chatgpt.com)
- [Plan Azure Database for PostgreSQL flexible server ...](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-optimal-performance?utm_source=chatgpt.com)

## Prompt:
8/11/2026, 2:48:42 PM

> Recommended outcome: use **Azure Database for PostgreSQL – Flexible Server**
> ----------------------------------------------------------------------------

it wants to charge 600 ollars

## Response:
8/11/2026, 2:48:53 PM

> **Searching the web**
>
> [Azure for Students](https://azure.microsoft.com/en-us/free/students)
> [Create an Azure Database for PostgreSQL flexible server](https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/quickstart-create-server)
> [Pricing your products or services](https://www.comcom.govt.nz/business/dealing-with-typical-situations/selling-goods-and-services/pricing-your-products-or-services/)
> [How to price your products and services](https://www.anz.co.nz/business/bizhub/running-your-business/pricing-products-and-services/price-your-products-and-services/)
> [Microsoft Azure](https://en.wikipedia.org/wiki/Microsoft_Azure)
>
> **Searched 5 websites**
>
> 
>
> Worked for 27s

Don’t create it yet. The **~$600 estimate does not automatically mean Azure will charge you $600**, but we should verify the exact configuration before you proceed.

Microsoft explicitly says that when creating PostgreSQL Flexible Server on a free/student account, the portal can **still display an estimated monthly cost even when the free allowance applies**. ([Microsoft Learn](https://learn.microsoft.com/en-us/answers/questions/2086253/how-to-create-postgresql-when-i-have-student-dev-p?utm_source=chatgpt.com))

For **Azure for Students**, the currently listed free PostgreSQL allowance is:

- **Burstable B1ms**
- **750 hours/month**
- **32 GB storage**
- **32 GB backup storage**
- for **12 months**. ([Microsoft Azure](https://azure.microsoft.com/en-us/free/students))

So your creation settings need to be **exactly around this level**:

```text
Subscription: Azure for Students
Workload type: Development
Compute tier: Burstable
Compute size: Standard_B1ms
vCores: 1
RAM: 2 GiB
Storage: 32 GiB
High availability: Disabled
Backup redundancy: Local
```

The Microsoft creation guide confirms that **Development** selects Burstable SKUs and that high availability is optional; enabling extra capacity can increase the estimated price. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/quickstart-create-server))

### The important part

Please check the top of your Azure screen where it says **Subscription**.

It must say something like:

> **Azure for Students**

If it says **Pay-As-You-Go**, **Microsoft Azure Plan**, or something else, then I would **not create the database** until we work out why.

Also check the compute size. If you've accidentally selected something such as:

```text
General Purpose
Standard_D2ds_v5
Standard_D4ds_v5
B4ms
B8ms
B12ms
```

then that can absolutely produce a very large estimate. Azure's normal pricing rises dramatically with larger instances. ([Microsoft Azure](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/?utm_source=chatgpt.com))

### Send me a screenshot

Send me a screenshot of the Azure page showing:

**Subscription + Region + Compute tier/size + Storage + the $600 estimate**

and I'll tell you **exactly what to change** before you click **Create**. Don't put in any card details or confirm anything yet.

---

**Sources:**

- [how to create postgresql when I have student dev pack sub.](https://learn.microsoft.com/en-us/answers/questions/2086253/how-to-create-postgresql-when-i-have-student-dev-p?utm_source=chatgpt.com)
- [Azure for Students | Microsoft Azure](https://azure.microsoft.com/en-us/free/students)

## Prompt:
8/11/2026, 2:53:25 PM

i there not another Azure DB? veen if we migrate to SQL

## Response:
8/11/2026, 2:53:36 PM

> **Searching the web**
>
> [Deploy Azure SQL Database for free](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql)
> [Azure SQL Database](https://azure.microsoft.com/en-us/products/azure-sql/database)
> [Pricing: ¿en qué consiste la teoría económica de la fijación ...](https://www.esan.edu.pe/conexion-esan/pricing-en-que-consiste-la-teoria-economica-de-la-fijacion-de-precios)
> [Pricing](https://en.wikipedia.org/wiki/Pricing)
> [What is Pricing?](https://dealhub.io/glossary/pricing/)
> [Pricing Methods: A Complete Guide](https://www.esade.edu/beyond/en/pricing-methods/)
> [Pricing. Estrategia de precios. Qué es y cómo crearla](https://bloo.media/blog/pricing-estrategia-de-precios/)
> [Pricing: técnicas para fijar precios y maximizar beneficios](https://cobee.io/blog/pricing/)
>
> **Evaluating database migration**
>
> I’m comparing Azure SQL’s larger free allowance with the migration effort from PostgreSQL. It offers substantially more storage, but PostgreSQL-specific types, queries, migrations, and drivers may require meaningful backend changes and could introduce monthly usage limits.
>
> **Evaluated database migration**
>
> 
>
> **Searched 8 websites**
>
> 
>
> Worked for 26s

**Yes - if you are willing to migrate away from PostgreSQL, I would seriously consider Azure SQL Database.** For this project, it has a much better free offering than the PostgreSQL option you just saw.

As of August 2026, Microsoft offers an **Azure SQL Database free tier** with **32 GB of database storage**, **32 GB of backup storage**, and **100,000 vCore-seconds of serverless compute every month**. More importantly, Microsoft says this offer is available **for the lifetime of the subscription**, not just the first 12 months. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql))

### Why this is interesting for your project

You can configure it so that when the free monthly compute allowance runs out, Azure **pauses the database instead of charging you**. Microsoft explicitly supports the option:

> `Auto-pause the database until next month`

If you select that, you don't get surprise database charges from exceeding the free SQL allowance. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql))

So the setup I'd investigate is:

```text
Azure SQL Database
    ↓
Free Database Offer

Storage:
32 GB data

Backup:
32 GB

Compute:
100,000 vCore-seconds / month

Pricing:
$0 while within allowance

When free limit reached:
AUTO-PAUSE UNTIL NEXT MONTH
```

Microsoft says the Azure portal should actually show **Estimated Cost/Month: $0** when the free offer has been applied correctly. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql))

## The catch: we'd have to migrate from PostgreSQL

This isn't just changing `DATABASE_URL`.

Your backend currently uses PostgreSQL, so moving to Azure SQL means changing the database layer approximately like this:

```text
CURRENT

Node backend
   │
   ├── pg
   │
   ▼
PostgreSQL
   │
   ▼
Supabase / PostgreSQL

PROPOSED

Node backend
   │
   ├── mssql-compatible driver
   │
   ▼
Azure SQL Database
   │
   ▼
Microsoft SQL Server engine
```

Your **frontend should largely not care**. It talks to your handwritten HTTP backend API, not directly to the database. That separation is actually exactly what your project brief wants: a non-monolithic frontend/backend with a team-designed HTTP API. `project_briefs (4).pdf`

The work is mainly in the backend/database:

- replace the PostgreSQL `pg` driver
- change `DATABASE_URL` / connection configuration
- convert migrations from PostgreSQL SQL to SQL Server/T-SQL
- check PostgreSQL-specific types
- check PostgreSQL-specific queries
- update database test infrastructure
- migrate/seed the existing data
- update CI secrets
- update Azure backend configuration
- update database documentation
- rerun API/database tests

### There could be SQL differences

For example, these kinds of PostgreSQL features need attention:

```sql
-- PostgreSQL
TIMESTAMPTZ
JSONB
SERIAL
RETURNING *
ON CONFLICT
ILIKE
uuid_generate_v4()
```

Azure SQL has equivalents or alternative approaches, but they aren't always syntax-compatible.

So **we should not blindly convert it**.

---

# But I think 32 GB is probably enough

For a university sports analytics system built around structured cricket event data, **32 GB is a lot of relational data**.

Your database should contain things such as:

```text
players
teams
competitions
seasons
fixtures
submissions
innings
overs
deliveries
wickets
derived_statistics
users/roles metadata
```

Large uploaded source datasets should ideally **not be stored as giant blobs inside the SQL database** anyway. If you later need to retain original uploads, dataset releases, CSV/JSON exports, etc., those should usually go into:

```text
Azure Blob Storage
```

with the SQL database storing metadata such as:

```text
dataset_release
--------------------------------
id
filename
blob_path
checksum
schema_version
created_at
fixture_id
submission_id
```

That's also a better architecture for the project-specific requirement that datasets eventually become reproducible releases with schemas and checksums. `sport_analytics (1).pdf`

---

## One important problem with the SQL free tier

The **100,000 vCore-seconds are not equivalent to a server being on continuously for a month**.

At one vCore:

```text
100,000 seconds
÷ 60
÷ 60

≈ 27.8 hours
```

However, Azure SQL Serverless **auto-pauses when inactive**, so you're consuming compute when it is active rather than paying for a continuously provisioned VM. Microsoft specifically warns that leaving database tools/connections open can prevent auto-pause and consume the free allowance. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql))

For development, demos, CI, and moderate student-project traffic, that may be perfectly workable.

For a public API under constant traffic, we'd have to monitor it.

---

# Options I would rank

| Option | Free capacity | Migration | Recommendation |
|---|---:|---:|---|
| **Azure SQL Database Free** | **32 GB** | Medium | ⭐ **Best Azure free option** |
| Azure PostgreSQL Flexible | 32 GB | Almost none | Good **if your free offer actually applies** |
| Azure Cosmos DB Free | 25 GB | Very large | ❌ Wrong fit |
| Paid Azure PostgreSQL | Depends | None | ❌ Don't pay ~$600 |
| Current PostgreSQL/Supabase | Current limit | None | Fine temporarily |

Azure Cosmos DB does have a lifetime free tier of **25 GB + 1,000 RU/s**, but I would **not** move this project there. It's a document/distributed database rather than a normal relational SQL database, and your event model, fixtures, players, submissions and derived statistics fit relational modelling extremely well. ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier?utm_source=chatgpt.com))

## What I'd do

**Before paying anything, try Azure SQL Database Free.**

Go to:

**Azure Portal → Azure SQL → SQL databases → Create**

and look specifically for:

> **Start free**

or

> **Free offer applied!**

Microsoft says the free-offer creation page should show:

> **Estimated Cost/Month: $0** ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql))

And choose:

```text
Free database offer:       ON
Service tier:              General Purpose / Serverless
Storage:                   ≤ 32 GB

Behavior at free limit:
AUTO-PAUSE DATABASE UNTIL NEXT MONTH
```

**Do not choose `Continue using database for additional charges`.**

### My recommendation for the team

If Azure SQL shows **$0**, I'd first spend **30-60 minutes auditing your current PostgreSQL migrations and queries** before making the migration decision.

If they're mostly ordinary SQL, switching now could be worthwhile.

If you've already made extensive use of PostgreSQL-specific functionality, **don't create several days of unnecessary migration work just to change databases** - we'll find another PostgreSQL hosting solution instead.

If you send me a screenshot of **Azure SQL → Create SQL Database**, I can walk you through the $0 setup exactly.

---

**Sources:**

- [Try Azure SQL Database for Free - Azure SQL Database | Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql)

## Prompt:
8/11/2026, 6:55:33 PM

what abot this [Skip to content](https://www.oracle.com/africa/database/free/#maincontent)

- [Accessibility Policy](https://www.oracle.com/corporate/accessibility/)

Menu

-
-
-
-
-
-
-
-
-

Navigation menu closed

1. [AI Database](https://www.oracle.com/africa/database/)

# Oracle AI Database Free

Want to get hands-on with Oracle AI Database 26ai—absolutely free? Here's your chance to explore the powerful database trusted by top businesses worldwide for their most critical workloads. Oracle AI Database 26ai Free lets you use up to 2 CPUs, 2 GB of RAM, and 12 GB of storage for your data—all wrapped up in a simple, ready-to-go package. Just download, install, and start building your next big project today.

- [**Overview**](https://www.oracle.com/africa/database/free/)
- [**Get started**](https://www.oracle.com/africa/database/free/get-started/)
- [**FAQ**](https://www.oracle.com/africa/database/free/faq/)

[**Lead the Change: Innovate with AI Built Into Your Database. Everywhere.**](https://go.oracle.com/LP=152065?src1=\:ow\:o:s\:po:::DBFree\&intcmp=WWMK251124P00001\:ow\:o:s\:po:::DBFree)

Discover how to deliver enterprise-grade AI securely, cost-effectively, and at scale by bringing AI to where your data lives.

## Try Oracle AI Database for free

Whether you're a developer, data scientist, DBA, educator—or just someone who loves data—Oracle AI Database 26ai is your perfect starting point. It's got everything baked right in: support for all the modern data types, AI-powered Vector Search, broad LLM support, analytics, and the newest development techniques. Check out Oracle’s [free use terms and conditions](https://www.oracle.com/africa/downloads/licenses/oracle-free-license.html) and get started for free today.

#### Autonomous AI Database

Experience the latest features of Oracle AI Database 26ai with Always Free Autonomous AI Database and Autonomous AI Database Free Container Image. Test drive new features and develop new applications while taking advantage of additional Always Free OCI services, such as OCI Object Storage, OCI Block Volume, and more.

[Try Autonomous AI Database for free](https://www.oracle.com/africa/autonomous-database/free-trial/)

#### Oracle AI Database Free for Mac

Mac developers using Arm-based or Intel-based computers can build apps locally with the latest capabilities in Oracle AI Database 26ai using a Docker image.

[Read more about the Mac version and get started for free](https://blogs.oracle.com/database/post/announcing-oracle-database-23ai-free-container-images-for-armbased-apple-macbook-computers)

#### Oracle AI Database Free for Windows

Develop with Oracle AI Database 26ai for Windows x64. Download from the link below.

[Download for Windows](https://www.oracle.com/africa/database/free/get-started/#windows)

#### Oracle AI Database Free for Linux

Develop with Oracle AI Database 26ai on Oracle Linux 8 or 9, or Oracle Enterprise Linux 8 or 9.

[Download the Linux install file](https://www.oracle.com/africa/database/free/get-started/#linux8)

[Get the Linux-based container image](https://container-registry.oracle.com/ords/ocr/ba/database/free)

#### Exadata Database Service

Try, develop, or test new workloads for free with Autonomous AI Database on existing Dedicated Exadata Cloud platforms on OCI, Azure, Google Cloud, or AWS.

[Read more and get started for free](https://blogs.oracle.com/database/post/introducing-autonomous-database-for-developers)

#### Exadata Cloud\@Customer

Develop for free using Autonomous AI Database or Exadata Database Service with no-additional-cost developer licenses on existing Exadata Cloud\@Customer platforms.

[Read more and get started for free](https://docs.public.content.oci.oraclecloud.com/en-us/iaas/exadata/doc/ecc-whats-new-in-exadata-cloud-at-customer-gen2.html#GUID-739E5BD6-118E-4152-A000-1C6FC40D2111)

#### Oracle AI Database Free for Arm

Develop with Oracle AI Database 26ai on Oracle Linux 8 on an Arm-based platform.

[Download for Arm](https://www.oracle.com/africa/database/free/get-started/#linux8-for-arm)

#### freesql.com

Work with their language of choice (Python, Java, etc.) and use freesql.com as a free sandbox to develop SQL as needed without the need to launch a GUI.

[Start coding now](https://freesql.com/landing/)

> “Today, developers building AI-powered applications are driving technology decisions like never before. Empowering them with frictionless tools is critical to fueling the next wave of innovative, user-centric apps. Oracle AI Database 26ai Free breaks down access barriers, putting advanced AI—which will include in-database AI agents—directly in developers’ hands and enable them to shape the future on their own terms. This move reinforces Oracle’s commitment to the developer community.”
>
> **Steven DickensCEO and Principal Analyst, HyperFRAME Research**

[**Oracle AI Database 26ai Powers the AI for Data Revolution**](https://www.oracle.com/africa/news/announcement/ai-world-database-26ai-powers-the-ai-for-data-revolution-2025-10-14/)

Oracle has architected AI into the core of Oracle AI Database 26ai, furthering Oracle’s commitment to helping customers securely bring AI to all their data, everywhere.

## See what top industry analysts are saying about Oracle AI Database 26ai

[See all analyst quotes](https://blogs.oracle.com/database/post/oracle-database-23ai-industry-analyst-reactions)

###

“As the saying goes ‘there is no AI without data.’ And, Oracle databases hold the world’s most valuable data that is now critical for organizations to adopt AI into their business processes. The latest release, Oracle AI Database 26ai, incorporates AI into the core of data management, making it easier for customers to do much more than RAG with AI Vector Search. This new release unifies search across traditional internal data, including real-time operational data, graph, JSON, and AI vectors; enables customers to build, deploy, and manage custom AI agents; and team up agents to work on tasks. Oracle is turning its converged database into an AI powerhouse that even non-Oracle users should consider.”

**Carl Olofson**
Principal Analyst, DBMSGuru LLC

###

“Oracle has cemented its leadership as the database for mission-critical workloads—which are even more critical in the AI era, as agents need transactions to run successfully and they move to create even more transactions than possible with their human counterparts. With Oracle AI Database 26ai, Oracle enables its customers to successfully move into the AI era, leveraging their existing investments in software, skills and know-how. For Oracle customers it’s not ‘bring the data to AI,’ but it’s ‘AI comes to the data’—and with that, organizations can leverage their existing investments and software assets.”

**Holger Mueller**
Vice President and Principal Analyst, Constellation Research 

###

“Imagine creating your own agent or even a team of agents to perform tasks. With Oracle AI Database 26ai, customers can do just that using the company's Oracle Select AI Agent, which provides a framework to build, deploy, and manage custom AI Agents. Developers define agents declaratively using PL/SQL or Python. An agent team could, for example, be used to automate finding solutions to database issues using DB logs. They could fetch logs, analyze the issue, and find a solution using RAG. This agent team could then write a report and post it on Slack. This is just one of the many uses for built-in AI. Oracle Database Engineering’s creativity is truly on display with Oracle AI Database 26ai, separating Oracle from many of its principal competitors in providing customers with a competitive edge.”

**Bradley Shimmin**
Vice President & Practice Lead, Data Intelligence, Analytics & Infrastructure, The Futurum Group

###

“With most enterprises storing different data types in different data siloes, the promise of an enterprise-grade AI solution that brings all of a company’s data together to take full advantage of AI remains an ongoing challenge. What’s needed is a true AI database, one that combines the ability to support all data types in a unified architecture—and bring it together with the rapid advances of AI—such as agentic AI, unified vector search, leading LLMs, MCP Server, NL-to-SQL and more. With its latest release, Oracle has done just that, by introducing an AI database that enables organizations to combine all of their private business data with public data and agentic frameworks to rapidly advance their business forward with AI. The enterprise database for the era of AI has a new name—and it’s Oracle AI Database.”

**Ron Westfall**
VP, Practice Lead, Networking and Infrastructure, HyperFRAME Research

## What’s included in Oracle AI Database 26ai Free?

 

#### AI Vector Search

Develop apps with AI Vector Search, leverage vector data types, indexes, and SQL operators in Oracle AI Database to store and query semantic content from diverse unstructured data, while supporting Retrieval Augmented Generation (RAG) for generating responses to natural language queries.

#### JSON Relational Duality

Build apps in either relational or JSON paradigms with a single source of truth and benefit from the strengths of both—relational and document models. Data is stored once but can be accessed, written, and modified with either approach.

#### JavaScript stored procedures

Create high performance, data-driven apps by writing JavaScript stored procedures (powered by GraalVM) and importing existing JavaScript libraries into the database. Minimize round trips to the database by executing business logic directly in the data tier.

#### JSON Schemas

Use industry-standard JSON Schemas to ensure only valid data is inserted into a JSON column.

#### Property Graphs

Find and analyze relationships, predict trends, and discover lightning-fast insights using database-native property graphs views. Use new SQL-standard property graph queries to run graph analytics on top of relational and JSON data.

#### Data use case domains

Annotate common data model attributes for tables, columns, views, indexes, and more, providing a central, lightweight, declarative facility to interpret, register, and exchange usage properties for AI and across apps.

#### Schema annotations

Bring domain knowledge closer to AI and your data by describing the intended use of data centrally and ensuring data is handled consistently across applications.

#### Resources

- Up to 12 GB of user data
- Up to 2 GB of database RAM
- Up to 2 CPU threads

-

## Why use Oracle AI Database Free?

Looking for the right database for your next development project? Learn more about Oracle AI Database using Oracle AI Database Free.

-

###### [Developers](https://www.oracle.com/africa/database/free/#8-0-panel)

1.

###### [DBAs](https://www.oracle.com/africa/database/free/#8-1-panel)

1.

###### [Data scientists](https://www.oracle.com/africa/database/free/#8-2-panel)

1.

###### [Educators](https://www.oracle.com/africa/database/free/#8-3-panel)

1.

###### [ISVs](https://www.oracle.com/africa/database/free/#8-4-panel)

1.

###### [Everyone](https://www.oracle.com/africa/database/free/#8-5-panel)

## Oracle AI Database 26ai resources

- **Documentation**
  - [New Features Guide](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/)
  - [Installation Guide for Linux](https://docs.oracle.com/en/database/oracle/oracle-database/26/xeinl/index.html)
  - [Licensing Information](https://docs.oracle.com/en/database/oracle/oracle-database/26/dblic/index.html)
  - [Documentation Home](https://docs.oracle.com/en/database/oracle/oracle-database/26/index.html)
- **Related products**
  - [Oracle AI Database Software Downloads](https://www.oracle.com/africa/database/technologies/oracle-database-software-downloads.html)
  - [Oracle Database XE](https://www.oracle.com/africa/database/technologies/xe-downloads.html)

* [© 2026 Oracle](https://www.oracle.com/africa/legal/copyright/)
* [Terms of Use and Privacy](https://www.oracle.com/africa/legal/privacy/)
* Cookie Preferences
* [Ad Choices](https://www.oracle.com/africa/legal/privacy/privacy-policy/#adchoices)
* [Careers](https://www.oracle.com/africa/corporate/careers/)
* [Subscribe to emails](https://go.oracle.com/subscribe/?l_code=en\&src1=OW\:O:FO)
* [Integrity Helpline](https://secure.ethicspoint.com/domain/media/en/gui/31053/index.html)
* [Contact Us](https://www.oracle.com/africa/corporate/contact/)

- [Facebook](https://www.facebook.com/Oracle/ "Oracle on Facebook")
- [X](https://x.com/oracle)
- [LinkedIn](https://www.linkedin.com/company/oracle/)
- [YouTube](https://www.youtube.com/oracle/)

**Chat now**

Call Sales

[**+271 13 194 566**](tel:27113194566)

Complete list of [local country numbers](https://www.oracle.com/africa/corporate/contact/global.html)

## Response:
8/11/2026, 6:55:44 PM

> **Searching the web**
>
> [Always Free Autonomous AI Database](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html)
> [Bon Jovi - Always (Official Music Video)](https://www.youtube.com/watch?v=9BMwcO6_hyA)
> [Online OCI Services](https://ociservices.gov.in/)
> [Oracle India | Cloud Applications and Cloud Platform](https://www.oracle.com/in/)
> [Google Cloud: AI and Cloud Computing Services](https://cloud.google.com/)
> [AUTONOMOUS Definition & Meaning](https://www.merriam-webster.com/dictionary/autonomous)
> [ALWAYS definition and meaning | Collins English Dictionary](https://www.collinsdictionary.com/dictionary/english/always)
> [Oracle Corporation](https://en.wikipedia.org/wiki/Oracle_Corporation)
> [Oracle](https://www.linkedin.com/company/oracle)
> [What is Oracle?](https://www.ibm.com/think/topics/oracle)
>
> **Assessing migration options**
>
> I’m comparing Oracle’s larger free allowance with the effort of moving from PostgreSQL. Oracle offers more storage, but SQL differences around JSON, UUIDs, timestamps, upserts, generated IDs, and queries could make migration substantial.
>
> **Assessed migration options**
>
> 
>
> **Searching the web**
>
>
> **Searched 10 websites**
>
> 
>
> Worked for 52s

**Yes, Oracle could be a good option - but the page you pasted contains two different “free database” products, and only one of them is useful for your deployed project.**

The **12 GB “Oracle AI Database 26ai Free”** at the top of that page is primarily software you **download and run yourself**. Oracle describes it as up to 2 CPUs, 2 GB RAM and 12 GB of user data. ([Oracle](https://www.oracle.com/database/free/?utm_source=chatgpt.com)) That means it does **not** by itself give you a free publicly hosted database.

What you want to look at is **OCI Always Free Autonomous AI Database**.

### Oracle's actual free hosted database

Oracle currently documents the **Always Free Autonomous AI Database** as:

| Resource | Always Free |
|---|---:|
| Database storage | **20 GB** |
| Database engine | Oracle Database |
| Cloud hosted | ✅ |
| Expiry | **No fixed expiry** |
| Simultaneous DB sessions | **30 max** |
| Number allowed | **Up to 2 databases** |
| Cost while Always Free | **$0** |

Oracle explicitly states that the CPU and storage are included and that **you aren't billed for an Always Free instance unless you upgrade it to a paid Autonomous Database**. ([Oracle Documentation](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/autonomous-always-free.html?utm_source=chatgpt.com))

So that is quite attractive for this project.

## But it's still not PostgreSQL

We would be doing:

```text
CURRENT

Node/TypeScript Backend
        │
        │ pg
        ▼
PostgreSQL
        │
        ▼
Supabase PostgreSQL
```

versus:

```text
PROPOSED

Node/TypeScript Backend
        │
        │ Oracle driver
        ▼
Oracle Autonomous AI Database
        │
        ▼
20 GB Always Free
```

Your frontend doesn't need to change significantly because it should continue talking only to your **handwritten backend HTTP API**:

```text
React
   │
   │ HTTP
   ▼
Our Backend API
   │
   │ SQL
   ▼
Oracle
```

That's important because the project requires the API to be designed and implemented by your team rather than relying on generated database endpoints. `project_briefs (4).pdf`

### PostgreSQL → Oracle migration difficulty

I would rate it **moderate**, possibly somewhat harder than PostgreSQL → Azure SQL.

We would need to review/change things like:

```text
pg Node package                 → Oracle Node driver

PostgreSQL connection string   → Oracle connection configuration

SERIAL / IDENTITY              → Oracle identity columns

TIMESTAMPTZ                    → Oracle timestamp equivalent

JSONB                          → Oracle JSON support

ON CONFLICT                    → MERGE / other Oracle approach

RETURNING                      → Oracle-compatible syntax

ILIKE                          → alternative

PostgreSQL migrations          → Oracle SQL migrations
```

Plus:

- migration/reset/seed scripts
- database tests
- CI environment
- deployment secrets
- documentation
- existing production/development data

So **don't migrate simply because the word “free” looks attractive**.

---

# Is 20 GB enough?

For your project, **very probably**.

Your brief expects event-level data, derived statistics, large datasets and hundreds of fixtures containing hundreds of events. `sport_analytics (1).pdf` A properly normalized relational sports database can fit a very substantial amount of this kind of structured data into 20 GB.

And uploaded source files/exports don't all need to live inside SQL.

A better architecture is:

```text
                  ┌─────────────────────────┐
                  │ Oracle Autonomous DB    │
                  │                         │
                  │ Fixtures                │
                  │ Players                 │
                  │ Deliveries / Events     │
Backend ─────────►│ Submissions             │
                  │ Statistics              │
                  │ Dataset metadata        │
                  └─────────────────────────┘
                             │
                             │ references
                             ▼
                  ┌─────────────────────────┐
                  │ Object Storage          │
                  │                         │
                  │ Uploaded JSON           │
                  │ CSV exports             │
                  │ Dataset releases        │
                  │ Large generated files   │
                  └─────────────────────────┘
```

Oracle also currently provides **20 GB of Always Free Object Storage**, which could potentially cover that second part. ([Oracle Documentation](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm?utm_source=chatgpt.com))

So you're not limited to:

> "The whole project gets 20 GB."

It's more like:

> **20 GB relational database + separate object/file storage.**

---

## There is one significant downside

Oracle's Always Free Autonomous Database has reduced backup functionality.

Oracle says Always Free databases **do not support manual backups or point-in-time restore**; those capabilities require upgrading to a paid instance. ([Oracle Documentation](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/autonomous-always-free.html?utm_source=chatgpt.com))

For your project, I'd therefore want our own export/backup procedure as part of deployment.

For example:

```text
Production Oracle DB
        │
        │ scheduled export
        ▼
database export
        │
        ▼
secure backup storage
```

That also gives you nice evidence for the database/deployment/documentation marks.

There's another lifecycle rule: an Always Free database that remains stopped/inactive for **90 cumulative days may be reclaimed and permanently deleted**. ([Oracle Documentation](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/autonomous-always-free.html?utm_source=chatgpt.com)) That's not a major concern during an active semester, but it should be documented.

---

# There's actually an even more interesting Oracle option

If the main reason we're moving is:

> **"We need much more database space for $0."**

then instead of migrating PostgreSQL → Oracle SQL, we could potentially use **Oracle's free compute infrastructure and keep PostgreSQL**.

OCI's Always Free resources currently include **200 GB total block-volume storage**. For example, Oracle documents an arrangement of a ~50 GB boot disk plus up to a **150 GB attached block volume** while remaining within the 200 GB storage allocation. ([Oracle Documentation](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm?utm_source=chatgpt.com))

We could therefore potentially do:

```text
Frontend
     │
     ▼
Azure Backend
     │
     ▼
OCI Free VM
┌─────────────────────────────┐
│ PostgreSQL                  │
│                             │
│ Existing schema             │
│ Existing migrations         │
│ Existing queries            │
│ Existing pg driver          │
│                             │
│ ~150 GB data volume         │
└─────────────────────────────┘
```

### That could give us far more space without changing database engines.

But there's a trade-off:

**Managed Oracle Autonomous DB**

```text
+ Oracle manages database
+ patches/hosting handled
+ $0 Always Free
+ simple infrastructure

- 20 GB
- migrate PostgreSQL → Oracle
- reduced free backup functionality
```

**PostgreSQL on OCI Free VM**

```text
+ Keep PostgreSQL
+ Keep existing queries
+ Keep pg
+ Keep existing migrations mostly unchanged
+ potentially much more storage
+ $0 within Always Free allowances

- WE manage PostgreSQL
- WE manage security
- WE manage updates
- WE configure backups
- WE configure firewall
- WE monitor disk
- more DevOps responsibility
```

For a semester project, that second option is potentially very good technically, **but it creates more infrastructure responsibility and therefore more things that can break**.

---

# My ranking now

Given where your project already is:

| Choice | Storage | $0? | Migration effort | Ops effort | My rating |
|---|---:|---|---|---|---|
| **OCI VM + PostgreSQL** | **Potentially ~150 GB data volume** | ✅* | **Low** | High | ⭐⭐⭐⭐⭐ |
| **Oracle Autonomous Always Free** | **20 GB** | ✅ | Medium/High | Low | ⭐⭐⭐⭐ |
| **Azure SQL Free** | **32 GB** | ✅ allowance | Medium | Low | ⭐⭐⭐⭐ |
| Azure PostgreSQL | 32 GB | Free eligibility dependent | None | Low | ⭐⭐⭐ |
| Oracle 26ai Free download | 12 GB | ✅ software | None as hosting | High | ❌ not what we need |

\*provided every OCI resource we provision stays specifically inside the **Always Free** allocations.

### What I would do for our project

If **20 GB is enough**, I'd choose **Oracle Autonomous Always Free** over paying hundreds of dollars for Azure PostgreSQL.

But if the reason we're leaving Supabase is specifically that we expect to need **50-100+ GB**, then I would investigate **running PostgreSQL on an OCI Always Free VM** before changing database engines. That lets us keep almost all the database/backend work we've already done while potentially giving us dramatically more storage.

And importantly, **none of these violate the brief**. The brief does not require Azure, PostgreSQL, Supabase, Oracle, or any particular DB provider. What matters is that our frontend/backend remain separate, our HTTP API is handwritten, the database is appropriately designed/deployed/documented, and we don't substitute generated Oracle/Supabase endpoints for our own API. `project_briefs (4).pdf`

**Next action:** tell me approximately **how much storage you think we need - 10 GB, 20 GB, 50 GB, 100 GB, 200 GB?** If we're trying to store the full cricket history we discussed, I can work out a much more realistic database-size requirement before we migrate anything.

---

**Sources:**

- [Oracle AI Database Free](https://www.oracle.com/database/free/?utm_source=chatgpt.com)
- [Always Free Autonomous AI Database](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/autonomous-always-free.html?utm_source=chatgpt.com)

## Prompt:
8/11/2026, 6:57:11 PM

what diff does it make if its not postgre

## Response:
8/11/2026, 6:57:34 PM

> **Explaining database differences**
>
> I’m focusing on the practical impact: PostgreSQL isn’t just hosting. The project currently depends on PostgreSQL drivers, migrations, connection URLs, and possibly SQL-specific features, so switching engines requires adaptation and testing.
>
> **Explained database differences**
>
> 
>
> **Assessed database migration impacts beyond PostgreSQL**
>
> 
>
> Worked for 22s

**Recommended outcome: stay on PostgreSQL if we can find a sufficiently large free PostgreSQL host.** Changing away from PostgreSQL does **not** ruin the project, but it creates migration work that gives us almost no extra marks.

The important distinction is:

> **Supabase/Azure/Oracle = where the database is hosted**  
> **PostgreSQL/SQL Server/Oracle Database = what database engine it is**

### If we move PostgreSQL → another PostgreSQL host

For example:

```text
Supabase PostgreSQL
        ↓
another hosted PostgreSQL
```

Almost nothing in the application's design changes.

We mostly change:

```env
DATABASE_URL=postgresql://...
```

Then migrate the data and configure networking/secrets.

Your existing code can continue using:

```ts
import { Client } from 'pg';
```

Your migrations can continue using `node-pg-migrate`, and your PostgreSQL database tests remain useful. Your current repository is already specifically built around these PostgreSQL tools. `ChatGPT-Testing Foundation Setup.md`

So:

```text
Frontend       SAME
API            SAME
Auth           SAME
Database schema MOSTLY SAME
SQL queries    SAME
Tests          SAME
Migrations     SAME
```

That's ideal.

---

## If we change PostgreSQL → Azure SQL

Then the frontend still doesn't care:

```text
React
  ↓ HTTP
Express API
  ↓
Azure SQL
```

But the backend's database code changes.

For example, today you might have:

```ts
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
```

With Microsoft SQL Server you'd use a SQL Server-compatible driver instead.

SQL parameters change too.

PostgreSQL:

```sql
SELECT *
FROM players
WHERE id = $1;
```

SQL Server commonly uses named parameters through its driver:

```sql
SELECT *
FROM players
WHERE id = @id;
```

And some database features have different syntax.

For example:

```text
PostgreSQL             SQL Server
---------------------------------------------
JSONB                  JSON stored/queried differently
ILIKE                  different case-insensitive approach
SERIAL                  IDENTITY
RETURNING               OUTPUT
ON CONFLICT             different upsert approach
TIMESTAMPTZ             datetimeoffset
Postgres arrays         different modelling
```

Not everything needs changing, but **every migration and SQL query has to be checked**.

---

## Oracle is the same problem, probably more so

Moving:

```text
PostgreSQL
    ↓
Oracle Database
```

means changing:

```text
pg
↓
Oracle Node driver
```

plus:

```text
node-pg-migrate
↓
another migration strategy
```

and converting PostgreSQL SQL into Oracle SQL where necessary.

Your testing infrastructure is also explicitly PostgreSQL-specific right now. For example, your test tooling currently checks that database URLs are PostgreSQL URLs and rejects non-PostgreSQL databases. `Pasted text.txt`

Your reset/migration scripts also use:

```ts
import { Client } from 'pg';
```

and:

```text
node-pg-migrate
```

so those would need rewriting too. `ChatGPT-Testing Foundation Setup.md`

---

# What does **not** change?

This is the good news.

Changing database engine should **not** require rebuilding:

```text
React frontend
Authentication UI
Navigation
API routes themselves
API contracts
Accessibility
Responsive design
Most frontend tests
Supabase Auth
```

For example:

```text
GET /api/v1/players/123
```

can remain:

```json
{
  "id": "123",
  "name": "Player Name"
}
```

regardless of whether internally the backend gets that data from:

```text
PostgreSQL
Azure SQL
Oracle
```

That's exactly one of the advantages of having your **handwritten API between the frontend and database**.

---

# Supabase Auth can also stay

This part is easy to confuse.

You currently use Supabase for two different things:

```text
Supabase
├── PostgreSQL database
└── Authentication
```

We could move **only the database**:

```text
Supabase
└── Authentication ✅ keep

Azure / Oracle / other provider
└── Application database
```

So users could still:

```text
Login
   ↓
Supabase Auth
   ↓
JWT
   ↓
Our Express API
   ↓
New Database
```

There's no requirement that authentication and the application database come from the same provider.

---

# For our repository specifically

Because we've already invested in PostgreSQL infrastructure, the difference is larger than it would have been on day one.

We currently have things built around PostgreSQL:

```text
pg
node-pg-migrate
PostgreSQL migrations
PostgreSQL test DB
DATABASE_URL_TEST
PostgreSQL transaction tests
PostgreSQL database safety checks
PostgreSQL schema documentation
```

For example, your testing work already includes a safety test that explicitly verifies **non-PostgreSQL URLs are rejected**. `Pasted text.txt`

So changing database engines means throwing away/reworking some useful work.

### Rough comparison

| Move | Amount of change |
|---|---|
| Supabase PostgreSQL → another PostgreSQL | 🟢 **Small** |
| PostgreSQL → Azure SQL | 🟡 **Moderate** |
| PostgreSQL → Oracle Database | 🟠 **Moderate-large** |
| PostgreSQL → NoSQL/Cosmos | 🔴 **Major redesign** |

---

## Why I prefer finding another PostgreSQL host

If we can get something like:

```text
50-200 GB PostgreSQL
        +
$0 or student credits
```

then we get:

**new hosting + more space without changing the application architecture.**

That's much better than spending project time rewriting migrations and tests just because one provider happens to offer a different free database engine.

And database technology itself isn't where the major project marks come from. You need a well-designed, deployed and documented database, while the high-value requirements include your API, features, testing and external integration. The database doesn't need to be Oracle or Microsoft SQL to score well.

### So my order of preference now is:

1. **Find a larger free PostgreSQL service** ← best
2. **Host PostgreSQL ourselves on free cloud compute** ← possible, more maintenance
3. **Azure SQL free tier** ← migrate only if necessary
4. **Oracle Autonomous Database** ← migrate only if it gives us a substantial advantage

**If we can find a free 50 GB+ PostgreSQL database, I would take that over Oracle/Azure SQL immediately.**

## Prompt:
8/11/2026, 6:58:51 PM

does the oracle one work for our cases even if we have to move stuff around

## Response:
8/11/2026, 6:59:01 PM

> **Searching the web**
>
> [Always Free Autonomous AI Database](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html)
> [Download Node.js](https://nodejs.org/en/download/current)
> [OFFICIAL | English meaning - Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/official)
> [Node - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Node)
> [Autonomous AI Database Free Trial](https://www.oracle.com/autonomous-database/free-trial/)
> [Node-RED: Low-code programming for event-driven applications](https://nodered.org/)
> [Node.js - Wikipedia](https://en.wikipedia.org/wiki/Node.js)
>
> **Assessing Oracle fit**
>
> Yes—if the user means Oracle’s hosted Always Free Autonomous AI Database, it fits the brief: relational transactions, JSON support, indexing, and Node.js connectivity. I’d replace PostgreSQL-specific queries, migrations, pooling, and bulk-load code; the downloadable package alone isn’t hosted.
>
> **Assessed Oracle fit**
>
> 
>
> **Searched 7 websites**
>
> 
>
> Worked for 30s

**Yes - if you mean the hosted OCI “Always Free Autonomous AI Database”, it can support the Sport Analytics Tool even if we have to migrate the PostgreSQL-specific parts.** I would consider it technically suitable for the project. The main question is whether the migration effort is worth the **20 GB free limit**.

Your project fundamentally needs a relational database capable of storing fixtures, ordered events, submissions, competitors, derived statistics, correction history and traceability. The brief does **not** require PostgreSQL specifically; it requires the platform to derive statistics from event data and support large-scale analysis through your own API. `sport_analytics (1).pdf` Oracle Autonomous Database can handle that relational workload.

### What works

For your use case, Oracle supports the pieces we actually need:

| Our requirement | Oracle Autonomous DB |
|---|---|
| Relational tables | ✅ |
| Foreign keys / constraints | ✅ |
| Transactions | ✅ |
| Indexes | ✅ |
| Complex SQL queries | ✅ |
| Aggregations/statistics | ✅ |
| JSON event fields | ✅ |
| Node.js backend | ✅ |
| Bulk inserts/imports | ✅ |
| Pagination queries | ✅ |
| Connection pooling | ✅ |
| Secure TLS connections | ✅ |

Oracle's official Node driver supports normal SQL execution, prepared/bind parameters, transaction management and bulk execution; Autonomous DB can also be connected to directly from Node.js over TLS. ([Oracle Documentation](https://docs.oracle.com/es-ww/iaas/autonomous-database-serverless/doc/connecting-nodejs-tls.html)) Oracle also supports relational and JSON data together, which is useful if some cricket event metadata is semi-structured. ([Oracle Documentation](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/adbsb-develop.html?utm_source=chatgpt.com))

So an architecture such as this is completely viable:

```text
React frontend
      │
      │ HTTPS
      ▼
Our Express/Node API
      │
      │ node-oracledb
      ▼
Oracle Autonomous AI Database
      │
      ├── competitions
      ├── teams
      ├── players
      ├── fixtures
      ├── submissions
      ├── innings
      ├── events/deliveries
      ├── wickets
      ├── statistics
      ├── statistic_definitions
      └── correction/audit history
```

And Supabase can continue handling **authentication** independently:

```text
Supabase Auth
     │
     │ JWT
     ▼
Our Express API
     │
     ▼
Oracle DB
```

That remains compliant with the brief because your own backend remains the API exposed to consumers. The compulsory requirement is that you design and implement the HTTP API and do not rely on generated database endpoints. `project_briefs (4).pdf`

## The one thing we must NOT do

Oracle includes Oracle REST Data Services, which can automatically expose database functionality over HTTP. ([Oracle Documentation](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/ords-intro.html?utm_source=chatgpt.com))

**Do not use that as the project's API.**

That would be dangerously close to exactly what the brief prohibits with generated endpoints. Keep:

```text
Consumer
   ↓
OUR /api/v1/... Express endpoints
   ↓
Oracle DB
```

not:

```text
Consumer
   ↓
Oracle-generated REST endpoints     ❌
   ↓
Oracle DB
```

---

# What we'd have to change

This is the expensive part.

Right now:

```text
Express
   ↓
pg
   ↓
PostgreSQL
```

would become:

```text
Express
   ↓
node-oracledb
   ↓
Oracle
```

### 1. Database driver

Instead of something like:

```ts
import { Pool } from 'pg';
```

we'd use Oracle's Node.js driver.

We would still use a connection pool. Your services/controllers/API design don't need to fundamentally change.

### 2. SQL syntax

Most ordinary SQL concepts stay the same:

```sql
SELECT
INSERT
UPDATE
DELETE
JOIN
GROUP BY
ORDER BY
COUNT
SUM
AVG
FOREIGN KEY
UNIQUE
CHECK
```

The painful parts are PostgreSQL-specific features.

For example:

| PostgreSQL | Oracle equivalent/change |
|---|---|
| `JSONB` | Oracle `JSON` |
| `$1`, `$2` parameters | `:id`, `:name` binds |
| `TIMESTAMPTZ` | `TIMESTAMP WITH TIME ZONE` |
| `ILIKE` | case-insensitive expression/collation |
| `ON CONFLICT` | commonly `MERGE` |
| `RETURNING *` | Oracle `RETURNING ... INTO` pattern |
| PostgreSQL arrays | child table or JSON |
| `node-pg-migrate` migrations | Oracle-compatible migrations |
| `pg` | `oracledb` |

Oracle's driver supports binds, transactions, DML returning, bulk operations and query result handling, so none of these are capability blockers; they're migration work. ([Oracle Documentation](https://docs.oracle.com/pls/topic/lookup?ctx=en%2Fcloud%2Fpaas%2Fautonomous-database%2Fserverless%2Fadbsb&id=json-soda-nodejs-api&source=%3Aso%3Atw%3Aor%3Aawr%3Aodv%3A%3A))

---

# Can it handle the Advanced-tier stuff?

Mostly **yes**.

Your advanced brief expects things such as:

**Event corrections and recomputation:** ✅  
Normal transactions, relationships and dependency tracking can support this.

**Historical statistics:** ✅  
We implement temporal/versioned records ourselves.

**Custom statistic definitions:** ✅  
Store definitions/versioning in Oracle and run the evaluation logic in our backend/worker.

**Batch ingestion:** ✅  
Oracle's Node driver supports bulk statement execution. ([Oracle Documentation](https://docs.oracle.com/pls/topic/lookup?ctx=en%2Fcloud%2Fpaas%2Fautonomous-database%2Fserverless%2Fadbsb&id=json-soda-nodejs-api&source=%3Aso%3Atw%3Aor%3Aawr%3Aodv%3A%3A))

**Live/out-of-order event feeds:** ✅  
This is primarily application/pipeline design, not something PostgreSQL uniquely enables.

**Large aggregate queries:** ✅  
Oracle is extremely capable at relational analytics.

**Dataset releases/checksums:** ✅  
Store release metadata in Oracle and actual large export files in object storage.

So moving to Oracle does **not** prevent us from going for Advanced.

---

# Where the free Oracle offering becomes questionable

This is the part I'd care about.

Oracle currently gives an Always Free Autonomous database:

- **20 GB storage**
- maximum **30 simultaneous database sessions**
- up to **2 Always Free DBs**
- no cloud credits consumed by an Always Free instance
- fixed resources that cannot be scaled while staying on that tier. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html))

The **30 sessions is not 30 website users**.

With proper connection pooling:

```text
100 website users
       │
       ▼
Express backend
       │
       │ pool: maybe 5-10 connections
       ▼
Oracle
```

So that limit is probably perfectly reasonable for a university project.

And Oracle's separate HTTP interface has a much lower ~3-6 simultaneous-user limit, but that restriction applies to Oracle's HTTP tools such as APEX/ORDS. Since **our Node backend should connect directly to the DB**, that is not the same as limiting our website to 3-6 users. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html))

---

## The bigger limitation is 20 GB

That's the one I'd investigate **before migrating**.

The service gives **20 GB per Always Free database**. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html))

If our actual cricket database ends up:

```text
5 GB        ✅ excellent
10 GB       ✅ fine
15 GB       ✅ workable
18-20 GB    ⚠️ uncomfortable
30 GB       ❌ not enough
50 GB       ❌ definitely not enough
```

then migrating to Oracle wouldn't solve the problem we're trying to solve.

And I would **not plan to split one logical production database across the two free 20 GB databases** just to manufacture 40 GB. That's unnecessary architectural complexity and will make joins, migrations, transactions and maintenance worse.

---

# Another limitation: backups

Always Free has a fairly important restriction: Oracle says it does **not support manual long-term backups to OCI Object Storage or point-in-time restore**. Those backup/restore features require moving to a paid instance. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html))

We could still implement our own export strategy, but I'd document this as a project risk:

```text
Oracle DB
   │
   ├── regular logical export
   │
   ▼
secure backup storage
```

That's more work than the current managed PostgreSQL setup.

---

# The critical distinction with the page you pasted

There are actually two things being advertised.

### Oracle AI Database 26ai Free - 12 GB

The one saying:

> 2 CPUs / 2 GB RAM / 12 GB storage

is the database **software/container that you run yourself**.

That isn't automatically a hosted production database.

### OCI Always Free Autonomous AI Database - 20 GB

This is the one we'd want:

```text
Oracle Cloud Infrastructure
        │
        ▼
Always Free Autonomous AI Database
        │
        └── 20 GB
```

Oracle's current documentation confirms that Always Free instances include CPU/storage and **aren't billed unless upgraded to a paid Autonomous database**. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html))

---

# So would I approve Oracle for our architecture?

### Technically: **YES.**

There is nothing in our Sport Analytics Tool that fundamentally requires PostgreSQL.

I'd rate the choices:

| | PostgreSQL host | Oracle Autonomous |
|---|---:|---:|
| Fits our relational model | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Event data | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Statistics/aggregations | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Node backend | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Advanced features possible | ✅ | ✅ |
| Current code compatibility | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Migration required | None/minimal | **Yes** |
| Free storage | provider-dependent | **20 GB** |
| Managed DB | ✅ usually | ✅ |
| Project-brief compliant | ✅ | ✅ |
| Risk right now | Low | Medium |

### What I would do before making the decision

**Do not migrate anything yet.**

The deciding question isn't really:

> "Will Oracle work?"

It **will**.

The question is:

> **"Will our complete cricket dataset fit comfortably inside 20 GB?"**

Because if our DB will be **8 GB**, Oracle becomes a very reasonable option and we can accept the migration work.

If it's going to be **35 GB**, Oracle Always Free doesn't solve our problem at all.

**Next step:** I would calculate the expected size of your **full Cricsheet/event dataset + indexes + derived statistics + correction history**, based on the dataset/schema you've already designed. Then we'll know whether Oracle's 20 GB is actually enough rather than guessing.

---

**Sources:**

- [Conexión a Node.js y Otros Idiomas de Creación de Scripts sin una cartera](https://docs.oracle.com/es-ww/iaas/autonomous-database-serverless/doc/connecting-nodejs-tls.html)

## Prompt:
8/11/2026, 7:00:58 PM

20 GB is enough

## Response:
8/11/2026, 7:01:06 PM

> **Searching the web**
>
> [OCI Global - Powering a cleaner future sooner](https://oci-global.com/nl/)
> [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
> [Google Cloud: AI and Cloud Computing Services](https://cloud.google.com/)
> [Online OCI Services](https://ociservices.gov.in/)
> [Apply for OCI Services](https://services.vfsglobal.com/aus/en/ind/apply-oci-services)
> [Oracle Corporation](https://en.wikipedia.org/wiki/Oracle_Corporation)
> [Important Notice for OCI or PIO Card Holders](https://www.indembkathmandu.gov.in/important-notice-for-ocipio-card-holders)
> [Oracle Cloud Free Tier | Oracle United Kingdom](https://www.oracle.com/uk/cloud/free/)
> [Open Container Initiative](https://opencontainers.org/)
> [Getting Started with Oracle Cloud Free Tier](https://blogs.oracle.com/apex/getting-started-with-oracle-cloud-free-tier-always-free-services-including-oracle-autonomous-database)
> [OCI Card](https://www.indianembassynetherlands.gov.in/page/oci-card/)
>
> **Recommending a migration path**
>
> Oracle’s free tier appears sufficient, but I’d protect the schedule: migrate early in Sprint 1 only if the team can validate connectivity, backups, security, and deployment quickly. Otherwise, deliver the MVP locally, then migrate before production deployment.
>
> **Recommended a migration path**
>
> 
>
> **Searching the web**
>
>
> **Searched 11 websites**
>
> 
>
> Worked for 19s

**Then yes - I think Oracle Always Free Autonomous AI Database is a viable choice for the project, and I would prefer it over paying hundreds of dollars for Azure PostgreSQL.**

I checked Oracle’s current documentation rather than relying on the older page. As of June 2026, Oracle still documents **Always Free Autonomous AI Database** with **20 GB storage per database**, up to **30 simultaneous DB sessions**, and up to **2 Always Free databases per tenancy**. Oracle also states that an Always Free instance does not incur database charges unless you deliberately upgrade it to a paid instance. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html?utm_source=chatgpt.com))

For our application, choose the **Transaction Processing** workload, not Lakehouse, JSON, or APEX. Oracle describes Transaction Processing as designed to run transactional, analytical, and batch workloads together, which maps very well to event ingestion + API requests + statistic calculation. ([Oracle Documentation](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/autonomous-database-billing-overview.html?utm_source=chatgpt.com))

### The resulting architecture

```text
React frontend
      │
      │ HTTPS
      ▼
Node / Express Backend
      │
      │ node-oracledb
      ▼
Oracle Autonomous AI Database
      │
      ├── competitions
      ├── seasons
      ├── teams
      ├── players
      ├── fixtures
      ├── submissions
      ├── innings
      ├── deliveries/events
      ├── wickets
      ├── statistics
      └── audit/correction history

Supabase
   └── Authentication only
```

That is fully compatible with the brief. Your API remains **your own handwritten HTTP API**, and Oracle is only the persistence layer behind it. That's important because the brief explicitly requires your team to design and implement the API rather than exposing generated Firebase/Supabase-style endpoints. `project_briefs (4).pdf`

## I would migrate now rather than later

Because we've established that **20 GB is sufficient**, the biggest objection to Oracle disappears.

There is still migration work, but it is manageable:

1. Create an **OCI Always Free Autonomous AI Database → Transaction Processing** instance.
2. Add Oracle's official Node driver to the backend.
3. Introduce a clean database/persistence module so controllers don't contain Oracle-specific code.
4. Convert the PostgreSQL migrations to Oracle-compatible migrations.
5. Convert PostgreSQL-specific SQL (`$1`, `JSONB`, `ON CONFLICT`, `RETURNING`, etc.).
6. Rewrite the PostgreSQL test-database tooling for Oracle.
7. Import the existing dataset.
8. Run API/database correctness tests against both systems and compare results.
9. Point the deployed backend at Oracle.
10. Only retire the old PostgreSQL database **after verification**.

I would **not** try a destructive one-shot migration.

Use:

```text
PostgreSQL                         Oracle
    │                                │
    │ source of truth                │ new DB
    │                                │
    └──────── migration ────────────►│
                                     │
                         validation ─┤
                                     │
                              API ───►│

Then cut over.
```

That protects you if some PostgreSQL-specific query behaves differently.

### One architectural improvement I'd make during the migration

Right now we should avoid code such as:

```ts
// controller
const result = await db.query(`
   SELECT ...
`);
```

scattered throughout controllers.

Instead:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Oracle
```

For example:

```ts
fixtureRepository.findById(id);
eventRepository.findByFixture(fixtureId);
statisticsRepository.getBattingStats(playerId);
```

Then Oracle-specific SQL is confined to the repository/data layer.

That makes this migration easier and also improves your **structure/architecture** evidence for the final rubric, where database structure, API architecture, API design and application structure are explicitly assessed. `project_briefs (4).pdf`

## Two Oracle limitations we need to actively handle

The first is **backups**. Oracle's current Always Free documentation says that Always Free databases don't support manual/long-term OCI backups or point-in-time restore. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html?utm_source=chatgpt.com))

So we should implement our own documented logical export procedure. That's not a blocker, but it belongs in:

```text
docs/
└── database/
    ├── deployment.md
    ├── backup-and-recovery.md
    ├── migrations.md
    └── schema.md
```

The second is inactivity. Oracle says an Always Free database can automatically stop after **7 days of inactivity**, and one that remains stopped/inactive for **90 cumulative days may be reclaimed**. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html?utm_source=chatgpt.com))

During the semester that should be easy to avoid, but document it as an operational risk.

## Don't use Oracle's generated REST interface

Oracle's Always Free service also exposes APEX/ORDS tools, and those have a much tighter HTTP user limit. ([Oracle Documentation](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html?utm_source=chatgpt.com))

We're not interested in those.

Our path stays:

```text
✅ GOOD

Browser
   ↓
Our Express API
   ↓
Oracle DB
```

not:

```text
❌ DON'T DO THIS

Browser
   ↓
Oracle generated REST / ORDS
   ↓
Oracle DB
```

Aside from being unnecessary, the latter risks conflicting with the hand-written API requirement.

### Recommendation

I'd now treat the database decision as:

**Oracle Autonomous AI Database Always Free, Transaction Processing workload, 20 GB.**

Keep **Supabase only for authentication**, migrate the relational PostgreSQL data/schema to Oracle, and continue hosting your frontend/backend wherever you already planned.

The project brief specifically expects event-derived statistics, traceable submissions, large-scale analysis and an API that consumers can query. Oracle is capable of supporting all of those; none of them depend on PostgreSQL specifically. `sport_analytics (1).pdf`

**Next action:** create the Oracle account/database, but **don't change any backend code yet**. Once you get to the “Create Autonomous AI Database” page, send me a screenshot and I'll tell you exactly which settings to pick to ensure we're creating the **Always Free 20 GB Transaction Processing instance**, not a paid one.

---

**Sources:**

- [Always Free Autonomous AI Database](https://docs.oracle.com/iaas/autonomous-database-shared/doc/autonomous-always-free.html?utm_source=chatgpt.com)

## Prompt:
8/11/2026, 7:12:24 PM

Blue Ocean DBBlue Ocean DB

## Response:
8/11/2026, 7:12:34 PM

> **Searching "Blue Ocean DB" database free tier PostgreSQL**
>
> [Free PostgreSQL® Database, No Credit Card](https://aiven.io/free-postgresql-database)
> [DigitalOcean: AI-Native Cloud](https://www.digitalocean.com/)
> [Cloud Databases on AWS](https://aws.amazon.com/products/databases/)
> [Top PostgreSQL Database Free Tiers in 2026](https://www.koyeb.com/blog/top-postgresql-database-free-tiers-in-2026)
> [OceanBase - Unified Distributed Database for the AI Era](https://en.oceanbase.com/)
> [Run Postgres For Free: Top 3 Options](https://dev.to/hackmamba/run-postgres-for-free-top-3-options-2pk6)
> [Google Cloud databases](https://cloud.google.com/products/databases)
> [Best PostgreSQL provider : r/nextjs](https://www.reddit.com/r/nextjs/comments/1d9mfg0/best_postgresql_provider/)
> [Serverless PostgreSQL, Free Hosted Postgres Database](https://layerbase.com/db/postgresql)
> [Top 5 Hosted SQL Database Services With Free Tier ...](https://medium.com/%40subham59036/top-5-hosted-sql-database-services-with-free-tier-amenities-you-can-only-dream-of-as-a-developer-bd8b24038492)
> [Blue Ocean - Smart Cloud Insights](https://marketplace.microsoft.com/en-us/product/dexmach.blueocean_prd?tab=overview)
> [Neon — Postgres backends for apps and agents](https://neon.com/)
> [What Is a Cloud Database?](https://www.oracle.com/database/what-is-a-cloud-database/)
> [Free Postgres Databases · The Fly Blog](https://fly.io/blog/free-postgres/)
> [22 Top Cloud Database Vendors - CDInsights](https://www.clouddatainsights.com/22-top-cloud-database-vendors/)
>
> **Searched 15 websites**
>
> 
>
> Worked for 13s

If you mean **OceanBase** rather than “Blue Ocean DB”, I would **not choose it over Oracle for this project**.

OceanBase itself is a capable relational/distributed database and can handle transactional + analytical workloads. Its cloud product can also migrate data from PostgreSQL, so technically it could support your event data and statistics workload. ([OceanBase](https://en.oceanbase.com/?utm_source=chatgpt.com))

The problem is the **free hosting**. I could not verify an ongoing 20 GB-style “always free” managed OceanBase Cloud database. Their current documentation describes OceanBase Cloud as **pay-as-you-go**, with compute, storage, backups and some other services billed separately; the free offering I found is either the **open-source Community Edition that you host yourself** or limited-period trials. ([OceanBase](https://en.oceanbase.com/docs/common-oceanbase-cloud-10000000000924007?utm_source=chatgpt.com))

So for us:

| Option | Managed | Enough for project | Free long-term | Migration |
|---|---|---|---|---|
| **Oracle Autonomous Always Free** | ✅ | ✅ 20 GB is enough | ✅ | PostgreSQL → Oracle |
| **OceanBase Cloud** | ✅ | ✅ | ❌ I can't verify an Always Free DB | PostgreSQL → OceanBase |
| OceanBase Community Edition | ❌ self-hosted | ✅ | ✅ software | PostgreSQL → OceanBase |
| Another managed PostgreSQL | ✅ | ✅ if ≥20 GB | Depends | Minimal |

And OceanBase Community Edition is primarily **MySQL-compatible**, rather than PostgreSQL-compatible, so we'd still have to modify our `pg`-based backend, migrations, tests and PostgreSQL-specific SQL. ([OceanBase](https://en.oceanbase.com/docs/common-oceanbase-database-10000000001970958?utm_source=chatgpt.com))

For the COMS3011A project, that means **Oracle still makes more sense if you've confirmed 20 GB is enough**: both involve database-engine migration work, but Oracle gives us the managed Always Free database we actually need.

Also, whichever database we choose, we must keep:

```text
Frontend
    ↓
OUR handwritten HTTP API
    ↓
Database
```

rather than exposing automatically generated database endpoints, because the brief explicitly requires your team to design and implement the API. `project_briefs (4).pdf`

If by **“Blue Ocean DB”** you meant a different service with that exact name, send me its link or screenshot - I couldn't find a credible database provider by that exact name, and I don't want to evaluate the wrong product.

---

**Sources:**

- [OceanBase - Unified Distributed Database for the AI Era](https://en.oceanbase.com/?utm_source=chatgpt.com)



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)