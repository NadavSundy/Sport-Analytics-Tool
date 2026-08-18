# Export Gitea Kanban Board

**User:** Anonymous  
**Created:** 8/15/2026 13:44:19  
**Updated:** 8/15/2026 14:09:48  
**Exported:** 8/18/2026 12:24:01  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a805109-8b1c-83ea-a823-4f8e6f0bb7f7](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a805109-8b1c-83ea-a823-4f8e6f0bb7f7)  

## Prompt:
8/15/2026, 1:44:16 PM

hwo to rxport hgitea kanban project board

## Response:
8/15/2026, 1:44:19 PM

> **Searching the web**
>
> [Configuration Cheat Sheet](https://docs.gitea.com/administration/config-cheat-sheet/)
> [APIs](https://en.wikipedia.org/wiki/API)
> [American Petroleum Institute | API](https://www.api.org/)
> [Cari Freelancer Indonesia, Project Kerja Remote Dengan ...](https://projects.co.id/)
> [What is an API? (Application Programming Interface)](https://www.mulesoft.com/api/what-is-an-api)
> [What is an API? - Application Programming Interfaces ...](https://aws.amazon.com/what-is/api/)
> [API Catalogue](https://www.api.gov.uk/)
>
> **Exporting the board**
>
> I’m treating this as a Kanban export problem. I’ll provide a practical visual screenshot method plus a CSV approach that preserves column assignments, since standard board exports may be limited.
>
> **Exported the board**
>
> 
>
> **Searching Gitea project board export csv**
>
>
> **Searched 7 websites**
>
> 
>
> Worked for 35s

**Best option for your COMS3011A evidence: export the Gitea Kanban board as screenshots/PDF, and separately preserve the underlying issues.** Gitea does not currently appear to provide a normal built-in “Export Kanban board” feature; there has specifically been a Gitea feature request for importing/exporting Project/Kanban data, and the current documented API exposes issue and milestone endpoints but not Project-board export endpoints. ([GitHub](https://github.com/go-gitea/gitea/issues/20988?utm_source=chatgpt.com))

### Easiest way - visual board export

Open:

**Sport-Analytics-Tool → Projects → your project board**

Then in Chrome/Edge:

1. Set browser zoom to around **75-80%** so as many columns as possible are visible.
2. Press **F12**.
3. Press **Ctrl + Shift + P**.
4. Type:
   `Capture full size screenshot`
5. Select it.
6. Save the PNG somewhere like:

```text
evidence/project-management/
    kanban-board-2026-08-15.png
```

If the board has horizontal scrolling and the screenshot cuts columns off, take **one screenshot per section/column** as well.

For example:

```text
evidence/project-management/
├── kanban-board-2026-08-15.png
├── kanban-backlog-2026-08-15.png
├── kanban-in-progress-2026-08-15.png
├── kanban-review-2026-08-15.png
└── kanban-done-2026-08-15.png
```

### I would also preserve the actual issue data

Your board screenshot proves the **Kanban/project methodology**, while Gitea's issue history provides stronger evidence of who was assigned, when work was opened/closed, milestones, labels, etc. Gitea officially supports retrieving repository issues through its HTTP API. ([Gitea Documentation](https://docs.gitea.com/api/))

That matters for Milestone 1 because the rubric explicitly gives **5% for the Work Tracker**, with the Advanced level requiring that it **“Exists & Used”**, and another **10% for Project Methodology** with evidence of actually following the methodology. `project_briefs (4).pdf`

So for marking evidence, I would keep:

```text
Board screenshot
        +
Issues / assignments
        +
PRs linked to issues
        +
Milestones
        +
Sprint plans / retrospectives
```

**Don't worry about obtaining a perfect CSV export of the Kanban board itself.** For the SDP evidence, screenshots taken at meaningful points in each sprint are actually useful because they preserve the board's state at that time.

If you want, I can next give you the **exact command to export all 120+ Gitea issues into a CSV/JSON file** from your `Sport-Analytics-Tool` repository as additional evidence. ([Gitea Documentation](https://docs.gitea.com/development/api-usage?utm_source=chatgpt.com))

suggest_automation

---

**Sources:**

- [import and export of kanban data · Issue #20988 · go-gitea ...](https://github.com/go-gitea/gitea/issues/20988?utm_source=chatgpt.com)
- [Gitea API 1.27.2 | Gitea Documentation](https://docs.gitea.com/api/)

## Prompt:
8/15/2026, 1:47:14 PM

is there no way to eport it with commands

## Response:
8/15/2026, 1:47:19 PM

> **Searching the web**
>
> [USAGE Definition & Meaning](https://www.merriam-webster.com/dictionary/usage)
> [American Petroleum Institute | API](https://www.api.org/)
> [Customizing Gitea](https://docs.gitea.com/administration/customizing-gitea)
> [Project](https://en.wikipedia.org/wiki/Project)
> [Development](https://journals.biologists.com/dev)
> [USAGE | definition in the Cambridge English Dictionary](https://dictionary.cambridge.org/us/dictionary/english/usage)
> [Gitea](https://github.com/go-gitea/gitea)
> [What is an API? - Application Programming Interfaces ...](https://aws.amazon.com/what-is/api/)
> [Use and Usage - Often Confused Words in English ...](https://www.youtube.com/watch?v=jgLbZz8GK48)
> [The Best Open Source Self-Hosted Git Service](https://about.gitea.com/products/gitea/)
> [English vocabulary: use vs usage - grammaticus](https://grammaticus.blog/2025/01/29/use-vs-usage/)
> [gitea/gitea - Docker Image](https://hub.docker.com/r/gitea/gitea)
> [Difference between use & usage? : r/EnglishLearning](https://www.reddit.com/r/EnglishLearning/comments/qr7mlg/difference_between_use_usage/)
> [What is an API? (Application Programming Interface)](https://www.mulesoft.com/api/what-is-an-api)
>
> **Searched 14 websites**
>
> 
>
> Worked for 23s

**Yes - you can export a lot of the Gitea project evidence with commands.** The best approach is to use the **Gitea REST API** and save the results as JSON/CSV. The only catch is that whether the **actual Kanban column/card positions** can be exported depends on the Gitea version running on the Wits server.

Gitea officially exposes its Swagger/OpenAPI description at `/swagger.v1.json`, so we can check your exact server rather than guessing. ([Gitea Documentation](https://docs.gitea.com/development/api-usage))

Run this from WSL:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

curl -sS https://sdp.ms.wits.ac.za/api/v1/version | jq
```

Then check whether your Wits Gitea exposes project-board endpoints:

```bash
curl -sS https://sdp.ms.wits.ac.za/swagger.v1.json \
  | jq -r '.paths | keys[]' \
  | grep -Ei 'project|board|column'
```

### If that prints project endpoints

Send me the output. Then we can export the **actual Kanban board**, including its columns/cards, with `curl`.

### Regardless, you can export all your issues right now

Create an evidence folder:

```bash
mkdir -p evidence/project-management/exports
```

Create an API token in Gitea under **Settings → Applications → Generate New Token**. Gitea officially supports API tokens through `Authorization: token ...`. ([Gitea Documentation](https://docs.gitea.com/1.25/development/api-usage))

Then in WSL:

```bash
read -s GITEA_TOKEN
```

Paste the token and press Enter. It won't appear on screen.

Set these:

```bash
GITEA="https://sdp.ms.wits.ac.za"
OWNER="git-push-pray"
REPO="Sport-Analytics-Tool"
```

Export **all issues/PR issue records**:

```bash
curl -sS \
  -H "Authorization: token $GITEA_TOKEN" \
  "$GITEA/api/v1/repos/$OWNER/$REPO/issues?state=all&limit=100&page=1" \
  > evidence/project-management/exports/issues-page-1.json
```

Because Gitea API results are paginated, don't assume one request contains everything; the official API supports `page` and `limit`. ([Gitea Documentation](https://docs.gitea.com/development/api-usage))

For your 120+ issues, use this instead:

```bash
mkdir -p evidence/project-management/exports/issues

for page in {1..10}; do
  echo "Downloading issue page $page..."
  
  curl -sS \
    -H "Authorization: token $GITEA_TOKEN" \
    "$GITEA/api/v1/repos/$OWNER/$REPO/issues?state=all&limit=50&page=$page" \
    > "evidence/project-management/exports/issues/page-$page.json"

  COUNT=$(jq 'length' "evidence/project-management/exports/issues/page-$page.json")

  if [ "$COUNT" -eq 0 ]; then
    rm "evidence/project-management/exports/issues/page-$page.json"
    break
  fi
done
```

Then combine them:

```bash
jq -s 'add' evidence/project-management/exports/issues/page-*.json \
  > evidence/project-management/exports/issues-all.json
```

And make a nice CSV:

```bash
jq -r '
[
  "number",
  "title",
  "state",
  "created_at",
  "updated_at",
  "closed_at",
  "assignees",
  "labels",
  "milestone",
  "url"
],
(
  .[] |
  [
    .number,
    .title,
    .state,
    .created_at,
    .updated_at,
    (.closed_at // ""),
    ([.assignees[]?.login] | join("; ")),
    ([.labels[]?.name] | join("; ")),
    (.milestone.title // ""),
    .html_url
  ]
)
| @csv
' evidence/project-management/exports/issues-all.json \
> evidence/project-management/exports/issues-all.csv
```

You'll then have:

```text
evidence/project-management/exports/
├── issues-all.json
├── issues-all.csv
└── issues/
    ├── page-1.json
    ├── page-2.json
    └── ...
```

That is **much better evidence than screenshots alone** because it preserves issue numbers, state, assignees, labels, milestones and timestamps in machine-readable form. This directly supports your Milestone 1 **Work Tracker** and **Project Methodology** evidence, where Advanced requires that the tracker actually “Exists & Used” and that the methodology is evidenced in practice. `project_briefs (4).pdf`

### But first do this

Run only these two commands and paste me the output:

```bash
curl -sS https://sdp.ms.wits.ac.za/api/v1/version | jq
```

```bash
curl -sS https://sdp.ms.wits.ac.za/swagger.v1.json \
  | jq -r '.paths | keys[]' \
  | grep -Ei 'project|board|column'
```

**If Wits's Gitea exposes the project endpoints, I'll give you a command that exports the actual Kanban board itself instead of just the issues.** ([Gitea Documentation](https://docs.gitea.com/development/api-usage))

---

**Sources:**

- [API Usage | Gitea Documentation](https://docs.gitea.com/development/api-usage)

## Prompt:
8/15/2026, 1:49:05 PM

dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

curl -sS https://sdp.ms.wits.ac.za/api/v1/version | jq
{
  "version": "1.24.7"
}
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ curl -sS https://sdp.ms.wits.ac.za/swagger.v1.json \
  | jq -r '.paths | keys[]' \
  | grep -Ei 'project|board|column'
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ 


I just want it foor personal use, not documentation

## Response:
8/15/2026, 1:49:11 PM

> **Searching the web**
>
> [Gitea API (1.24.7)](https://docs.gitea.com/api/1.24/)
> [PROJECT Definition & Meaning](https://www.merriam-webster.com/dictionary/project)
> [gitea/routers/api/v1/api.go at main](https://github.com/go-gitea/gitea/blob/main/routers/api/v1/api.go)
> [Cari Freelancer Indonesia, Project Kerja Remote Dengan ...](https://projects.co.id/)
> [What is a router?](https://www.cloudflare.com/learning/network-layer/what-is-a-router/)
> [Project](https://en.wikipedia.org/wiki/Project)
> [Projects](https://opensource.google/projects)
> [GitHub - Apps on Google Play](https://play.google.com/store/apps/details?hl=en_US&id=com.github.android)
> [The cost of saying yes has changed](https://github.blog/engineering/the-cost-of-saying-yes-has-changed/)
> [Gitea Official Website](https://about.gitea.com/)
> [How to Use Project Boards: Tips and Examples for Success](https://www.breeze.pm/project-board-samples)
> [Project Boards](https://www.blaisdells.com/project-boards--1)
>
> **Searched 12 websites**
>
> 
>
> Worked for 5s

Yep - in that case **ignore the documentation/evidence stuff**.

Your command output confirms the important bit: your Wits server is running **Gitea 1.24.7**, and its Swagger spec exposes **no project/board/column REST endpoints**. That matches Gitea itself: repository project boards did not have a REST API in that version. ([Gitea Documentation](https://docs.gitea.com/api/1.24/?utm_source=chatgpt.com))

So unfortunately, there is **no clean command like**:

```bash
gitea project export
```

or:

```bash
curl .../api/v1/repos/.../projects
```

that will export the actual Kanban board with its column positions.

### But you can still export it for personal backup

The easiest command-based workaround is to download the **HTML page itself** while authenticated. Since project boards are rendered through Gitea's normal web routes rather than the API, you'd need your authenticated session cookie.

A simpler option is to use your browser:

1. Open the Kanban board.
2. Press `F12`.
3. Go to **Network**.
4. Reload the page.
5. Right-click the main project-board request.
6. Choose **Copy → Copy as cURL**.
7. Paste that command into WSL.
8. Add:

```bash
-o kanban-board.html
```

So you'll end up with something resembling:

```bash
curl 'https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/projects/1' \
  -H 'cookie: ...' \
  ... \
  -o kanban-board.html
```

Then:

```bash
ls -lh kanban-board.html
```

That gives you a **local copy of the board page**.

One warning: don't send me or commit the copied `curl` command because it may contain your **Gitea login/session cookie**.

### If what you actually want is the board data

There is another route we can try: inspect what requests the Kanban page makes internally and extract the cards/columns ourselves. It wouldn't be an official API, but for a **personal backup** that's perfectly reasonable.

Open your board → `F12` → **Network** → reload it, and send me a screenshot of the requests you see. I can tell you exactly which one to `curl`, if any.

---

**Sources:**

- [Gitea API (1.24.7)](https://docs.gitea.com/api/1.24/?utm_source=chatgpt.com)

## Prompt:
8/15/2026, 1:51:11 PM

can we export the issues??
Its the same info

## Response:
8/15/2026, 1:51:18 PM

> **Searching the web**
>
> [Gitea API (1.24.7)](https://docs.gitea.com/api/1.24/)
> [GET中文(繁體)翻譯：劍橋詞典](https://dictionary.cambridge.org/zht/%E8%A9%9E%E5%85%B8/%E8%8B%B1%E8%AA%9E-%E6%BC%A2%E8%AA%9E-%E7%B9%81%E9%AB%94/get)
> [What is an API? - Application Programming Interfaces ...](https://aws.amazon.com/what-is/api/)
> [APIs](https://en.wikipedia.org/wiki/API)
> [API Specification | DATA.GOV.HK](https://data.gov.hk/en/help/api-spec)
> [What is an API really? Need deeper explanation.](https://www.reddit.com/r/cybersecurity/comments/1elnz4j/what_is_an_api_really_need_deeper_explanation/)
> [What's an API?](https://support.apple.com/en-hk/guide/shortcuts-mac/apd2e30c9d45/mac)
> [OpenAPI Initiative – The OpenAPI Initiative provides an open ...](https://www.openapis.org/)
> [一字多義實用字「get」 - 空中美語部落格](https://blog.english4u.net/blog2.aspx?id=1121)
> [GET Definition & Meaning](https://www.merriam-webster.com/dictionary/get)
>
> **Searched 10 websites**
>
> 
>
> Worked for 6s

Yes. **If what you care about is the information on the board, exporting the issues is the easiest option.** You’ll get issue number, title, state, assignees, labels, milestone, dates, and URL. Gitea 1.24.7 exposes repository issues through its REST API. ([Gitea Documentation](https://docs.gitea.com/api/1.24/?utm_source=chatgpt.com))

The only thing you may **not** recover is the exact Kanban column/card position if that information exists only in the Project board.

From your repo folder, do this.

First create a Gitea API token under **Profile → Settings → Applications → Generate New Token**. Then in WSL:

```bash
read -s GITEA_TOKEN
```

Paste the token and press Enter.

Then:

```bash
GITEA="https://sdp.ms.wits.ac.za"
OWNER="git-push-pray"
REPO="Sport-Analytics-Tool"

mkdir -p gitea-export
```

### Export every issue to JSON

This loops through all pages automatically:

```bash
page=1

while true; do
  echo "Downloading page $page..."

  curl -sS \
    -H "Authorization: token $GITEA_TOKEN" \
    "$GITEA/api/v1/repos/$OWNER/$REPO/issues?state=all&limit=50&page=$page" \
    > "gitea-export/issues-$page.json"

  count=$(jq 'length' "gitea-export/issues-$page.json")

  if [ "$count" -eq 0 ]; then
    rm "gitea-export/issues-$page.json"
    break
  fi

  page=$((page + 1))
done
```

Combine them:

```bash
jq -s 'add' gitea-export/issues-*.json \
  > gitea-export/issues-all.json
```

Check how many you got:

```bash
jq 'length' gitea-export/issues-all.json
```

### Then make a readable CSV

```bash
jq -r '
[
  "number",
  "title",
  "state",
  "assignees",
  "labels",
  "milestone",
  "created_at",
  "updated_at",
  "closed_at",
  "url"
],
(
  .[] |
  [
    .number,
    .title,
    .state,
    ([.assignees[]?.login] | join("; ")),
    ([.labels[]?.name] | join("; ")),
    (.milestone.title // ""),
    .created_at,
    .updated_at,
    (.closed_at // ""),
    .html_url
  ]
)
| @csv
' gitea-export/issues-all.json \
> gitea-export/issues-all.csv
```

Then:

```bash
ls -lh gitea-export
```

You should have:

```text
gitea-export/
├── issues-1.json
├── issues-2.json
├── issues-3.json
├── ...
├── issues-all.json
└── issues-all.csv
```

You can open the CSV directly in Excel:

```bash
explorer.exe gitea-export/issues-all.csv
```

**I’d do this rather than fighting with the Kanban export.** For personal use, `issues-all.csv` is probably exactly what you want. Just don't commit or share your API token. ([Gitea Documentation](https://docs.gitea.com/development/api-usage/?utm_source=chatgpt.com))

---

**Sources:**

- [Gitea API (1.24.7)](https://docs.gitea.com/api/1.24/?utm_source=chatgpt.com)

## Prompt:
8/15/2026, 1:57:13 PM

{"message":"token does not have at least one of required scope(s), required=[read:issue], token scope=write:repository","url":"https://sdp.ms.wits.ac.za/api/swagger"}

## Response:
8/15/2026, 1:57:18 PM

> **Searching the web**
>
> [OAuth2 Provider](https://docs.gitea.com/1.24/development/oauth2-provider)
>
> **Searched 1 website**
>
> 
>
> Worked for 4s

That error tells us exactly what’s wrong: **the token you created has `write:repository`, but reading issues requires `read:issue`.** Gitea 1.24 uses scoped access tokens, and `read:issue` is the relevant permission for GET requests to issue endpoints. ([Gitea Documentation](https://docs.gitea.com/1.24/development/oauth2-provider?utm_source=chatgpt.com))

Create a new token in Gitea:

**Profile picture → Settings → Applications → Manage Access Tokens → Generate New Token**

Under **Select permissions**, give it:

```text
Issues: Read
```

You do **not** need repository write access just to export the issues. Gitea’s token UI allows you to choose permissions when creating the token. ([Gitea Documentation](https://docs.gitea.com/1.24/development/api-usage/?utm_source=chatgpt.com))

Then back in WSL, replace the variable:

```bash
unset GITEA_TOKEN
read -s GITEA_TOKEN
echo
```

Paste the **new token** and press Enter.

Test it first:

```bash
curl -sS \
  -H "Authorization: token $GITEA_TOKEN" \
  "https://sdp.ms.wits.ac.za/api/v1/repos/git-push-pray/Sport-Analytics-Tool/issues?state=all&limit=5" \
  | jq '.[].title'
```

If it works, you should get output like:

```text
"Some issue title"
"Another issue title"
...
```

Then we can export **all of them**.

One small correction to my previous instructions: because you only want this for personal use, I’d put it somewhere outside the repo rather than inside `evidence/`, e.g.:

```bash
mkdir -p ~/gitea-backups/sport-analytics
```

Once the test command works, tell me and I’ll give you **one copy-paste command that exports every issue into a nice CSV for Excel**, including issue number, title, status, assignee, labels and milestone.

---

**Sources:**

- [OAuth2 Provider](https://docs.gitea.com/1.24/development/oauth2-provider?utm_source=chatgpt.com)

## Prompt:
8/15/2026, 1:59:14 PM

so now i want it to clear the export folder and add the new exports, it must have all th einfo about the issue andthe ocntents of i t

## Response:
8/15/2026, 1:59:20 PM

> **Searching the web**
>
> [Gitea API (1.24.7)](https://docs.gitea.com/api/1.24/)
> [CREATE Definition & Meaning](https://www.merriam-webster.com/dictionary/create)
> [Create - Minecraft Mod](https://modrinth.com/mod/create/versions)
> [Creators-of-Create/Create: [NeoForge Mod] Building Tools ...](https://github.com/Creators-of-Create/Create)
> [CREATE | definition in the Cambridge English Dictionary](https://dictionary.cambridge.org/us/dictionary/english/create)
>
> **Designing export script**
>
> I’m planning a robust Bash exporter that validates configuration, recreates a destination safely, retrieves issue records, filters out pull requests, and saves detailed JSON, comments, timelines, attachments, reactions, dependencies, and readable Markdown.
>
> **Designed an export script**
>
> 
>
> **Searching the web**
>
>
> **Searched 5 websites**
>
> 
>
> Worked for 31s

Yes. **Use one script that first wipes `gitea-export/`, then re-downloads every issue and its full contents.** Since your Gitea 1.24.7 API supports issue bodies, metadata, comments, timelines, attachments, reactions, dependencies and blocking relationships, we can preserve much more than just the CSV. ([Gitea Documentation](https://docs.gitea.com/api/1.24/))

From the repo root, run this. It deliberately uses `type=issues` so pull requests are excluded. Gitea documents `state=all`, `type=issues`, `page`, and `limit` for the repository issue endpoint. ([Gitea Documentation](https://docs.gitea.com/api/1.24/operations/issue-list-issues/))

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

GITEA="https://sdp.ms.wits.ac.za"
OWNER="git-push-pray"
REPO="Sport-Analytics-Tool"
EXPORT_DIR="gitea-export"

# Make sure your token already exists in this shell.
if [ -z "${GITEA_TOKEN:-}" ]; then
  echo "Enter Gitea API token:"
  read -s GITEA_TOKEN
  echo
fi

# Safety checks.
command -v curl >/dev/null || { echo "curl is required"; exit 1; }
command -v jq >/dev/null || { echo "jq is required"; exit 1; }

# Completely clear the old export.
rm -rf -- "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR/issues"

api_get() {
  curl -fsS \
    -H "Authorization: token $GITEA_TOKEN" \
    -H "Accept: application/json" \
    "$GITEA/api/v1$1"
}

# Download every page of an API endpoint that returns a JSON array.
fetch_pages() {
  local path="$1"
  local output="$2"
  local separator="?"
  local page=1

  if [[ "$path" == *"?"* ]]; then
    separator="&"
  fi

  echo '[]' > "$output"

  while true; do
    data=$(api_get "${path}${separator}limit=50&page=${page}") || {
      echo "WARNING: failed to fetch $path page $page"
      return 1
    }

    count=$(jq 'if type == "array" then length else 0 end' <<< "$data")

    if [ "$count" -eq 0 ]; then
      break
    fi

    tmp=$(mktemp)
    printf '%s\n' "$data" > "$tmp"

    merged=$(mktemp)
    jq -s '.[0] + .[1]' "$output" "$tmp" > "$merged"

    mv "$merged" "$output"
    rm -f "$tmp"

    page=$((page + 1))
  done
}

echo "======================================"
echo "Downloading complete issue list..."
echo "======================================"

fetch_pages \
  "/repos/$OWNER/$REPO/issues?state=all&type=issues" \
  "$EXPORT_DIR/issues-all.json"

ISSUE_COUNT=$(jq 'length' "$EXPORT_DIR/issues-all.json")

echo
echo "Found $ISSUE_COUNT issues."
echo

# Export each individual issue.
jq -r '.[].number' "$EXPORT_DIR/issues-all.json" |
while read -r NUMBER; do
  echo "Exporting issue #$NUMBER..."

  DIR="$EXPORT_DIR/issues/$NUMBER"
  mkdir -p "$DIR"

  # Complete issue object:
  # title, body, creator, assignees, labels, milestone,
  # state, dates, URLs, attachments metadata, etc.
  api_get \
    "/repos/$OWNER/$REPO/issues/$NUMBER" \
    > "$DIR/issue.json"

  # Comments.
  fetch_pages \
    "/repos/$OWNER/$REPO/issues/$NUMBER/comments" \
    "$DIR/comments.json"

  # Full timeline:
  # comments plus events such as labels, assignments,
  # milestones, state changes, dependencies, etc.
  fetch_pages \
    "/repos/$OWNER/$REPO/issues/$NUMBER/timeline" \
    "$DIR/timeline.json"

  # Issue attachment metadata.
  api_get \
    "/repos/$OWNER/$REPO/issues/$NUMBER/assets" \
    > "$DIR/attachments.json" 2>/dev/null \
    || echo '[]' > "$DIR/attachments.json"

  # Reactions.
  fetch_pages \
    "/repos/$OWNER/$REPO/issues/$NUMBER/reactions" \
    "$DIR/reactions.json" 2>/dev/null \
    || echo '[]' > "$DIR/reactions.json"

  # Issues that block this issue.
  fetch_pages \
    "/repos/$OWNER/$REPO/issues/$NUMBER/dependencies" \
    "$DIR/dependencies.json" 2>/dev/null \
    || echo '[]' > "$DIR/dependencies.json"

  # Issues blocked by this issue.
  fetch_pages \
    "/repos/$OWNER/$REPO/issues/$NUMBER/blocks" \
    "$DIR/blocks.json" 2>/dev/null \
    || echo '[]' > "$DIR/blocks.json"

  # Produce a human-readable Markdown copy too.
  jq -r '
    "# Issue #\(.number): \(.title)

**State:** \(.state)
**Author:** \(.user.login // "")
**Created:** \(.created_at // "")
**Updated:** \(.updated_at // "")
**Closed:** \(.closed_at // "")
**Due:** \(.due_date // "")
**Milestone:** \(.milestone.title // "")
**Assignees:** \([.assignees[]?.login] | join(", "))
**Labels:** \([.labels[]?.name] | join(", "))
**URL:** \(.html_url // "")

## Description

\(.body // "")
"
  ' "$DIR/issue.json" > "$DIR/issue.md"

  {
    echo
    echo "## Comments"
    echo

    jq -r '
      .[] |
      "### \(.user.login // "unknown") - \(.created_at // "")

\(.body // "")

---"
    ' "$DIR/comments.json"
  } >> "$DIR/issue.md"

done

echo
echo "======================================"
echo "Creating CSV summary..."
echo "======================================"

jq -r '
[
  "number",
  "title",
  "state",
  "author",
  "assignees",
  "labels",
  "milestone",
  "created_at",
  "updated_at",
  "closed_at",
  "due_date",
  "comments",
  "body",
  "url"
],
(
  .[] |
  [
    .number,
    .title,
    .state,
    (.user.login // ""),
    ([.assignees[]?.login] | join("; ")),
    ([.labels[]?.name] | join("; ")),
    (.milestone.title // ""),
    (.created_at // ""),
    (.updated_at // ""),
    (.closed_at // ""),
    (.due_date // ""),
    (.comments // 0),
    (.body // ""),
    (.html_url // "")
  ]
)
| @csv
' "$EXPORT_DIR/issues-all.json" \
> "$EXPORT_DIR/issues-all.csv"

echo
echo "======================================"
echo "EXPORT COMPLETE"
echo "======================================"
echo
echo "Issues exported: $ISSUE_COUNT"
echo "Folder: $EXPORT_DIR"
echo
du -sh "$EXPORT_DIR"
```

The result will look roughly like:

```text
gitea-export/
├── issues-all.json
├── issues-all.csv
└── issues/
    ├── 1/
    │   ├── issue.json
    │   ├── issue.md
    │   ├── comments.json
    │   ├── timeline.json
    │   ├── attachments.json
    │   ├── reactions.json
    │   ├── dependencies.json
    │   └── blocks.json
    ├── 2/
    │   └── ...
    ├── 3/
    │   └── ...
    └── ...
```

The important files are `issue.json`, which contains the issue's title, full `body`, user, assignees, labels, milestone, state, timestamps and other metadata, and `issue.md`, which gives you a readable copy of the **entire description plus all comments**. Gitea explicitly exposes the issue `body` and the other main metadata in its issue representation. ([Gitea Documentation](https://docs.gitea.com/api/1.24/operations/issue-list-issues/))

The separate `timeline.json` is also worth keeping because Gitea exposes a dedicated endpoint for **comments and events**, so it preserves changes around the issue rather than only its current state. ([Gitea Documentation](https://docs.gitea.com/api/1.24/operations/issue-get-comments-and-timeline/)) Dependencies and blocking relationships are available through their own endpoints as well. ([Gitea Documentation](https://docs.gitea.com/api/1.24/operations/issue-list-issue-dependencies/))

One limitation: `attachments.json` stores the **attachment information and download URLs**; the script above does not yet download the attached image/PDF/file binaries themselves. Gitea exposes attachment endpoints separately. ([Gitea Documentation](https://docs.gitea.com/api/1.24/operations/issue-list-issue-attachments/))

After it finishes, quickly verify it with:

```bash
jq 'length' gitea-export/issues-all.json
```

and inspect one issue, for example:

```bash
cat gitea-export/issues/120/issue.md
```

or open the entire folder in Windows:

```bash
explorer.exe gitea-export
```

That should give you a pretty complete personal offline copy of every actual issue, including the contents and discussion.

---

**Sources:**

- [Gitea API 1.24.7 | Gitea Documentation](https://docs.gitea.com/api/1.24/)

## Prompt:
8/15/2026, 2:01:00 PM

ten will it give 1 file with all the issues

## Response:
8/15/2026, 2:01:03 PM

Yes. The script gives you **one combined file containing all issues**:

```text
gitea-export/issues-all.json
```

That file contains every issue with its main issue data, including the full issue body/description.

It also gives you:

```text
gitea-export/issues-all.csv
```

which is one spreadsheet-style file containing all issues.

The separate folders like:

```text
gitea-export/issues/120/
```

are just the detailed per-issue backups with comments, timeline, reactions, dependencies, etc.

If you want, I can simplify the script so it produces just:

```text
gitea-export/
├── all-issues.json
├── all-issues.csv
└── all-issues.md
```

where `all-issues.md` is one big readable file containing every issue description and all comments.

## Prompt:
8/15/2026, 2:01:45 PM

![51a2eaeb-f262-496e-8c75-afd69cc5e014.png](https://chatgpt.com/backend-api/estuary/content?id=file_0000000077a081f4bc0616f46ff4cef5&ts=496402&p=fs&cid=1&sig=5cc7973f21fd26eb593403fa4edd271eabfa10241e9ab0f5ebf6c649b480dfb8&v=0)

why hasnt t moved on

## Response:
8/15/2026, 2:01:55 PM

> **Searching the web**
>
> [Gitea API (1.24.7)](https://docs.gitea.com/api/1.24/)
> [USER Definition & Meaning](https://www.merriam-webster.com/dictionary/user)
> [users - Traduction française](https://www.linguee.fr/anglais-francais/traduction/users.html)
> [user - English-French Dictionary](https://www.wordreference.com/enfr/user)
> [USER | English meaning - Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/user)
> [User (computing)](https://en.wikipedia.org/wiki/User_%28computing%29)
>
> **Diagnosing the stalled export**
>
> I’m inferring the script is still waiting on a network request, likely because no timeout is configured. I’d stop it, inspect the issue directory and file timestamps, then retry endpoints with connection and overall time limits.
>
> **Diagnosed the stalled export**
>
> 
>
> **Searching the web**
>
>
> **Searched 6 websites**
>
> 
>
> Worked for 22s

It looks like the script is **stuck while processing issue #121**, not finished. The main reason is that my earlier script used `curl` **without any timeout**, so if one Gitea API request hangs, the whole export waits forever.

Gitea 1.24.7 does support the timeline endpoint and its pagination parameters, so that part is valid. ([Gitea Documentation](https://docs.gitea.com/api/1.24/operations/issue-get-comments-and-timeline/))

Do this first:

```bash
Ctrl+C
```

That will safely stop the export.

Then check how far issue `#121` got:

```bash
ls -lah gitea-export/issues/121
```

Paste me that output. It will tell us which request got stuck.

You can also test issue #121 directly:

```bash
curl -v \
  --connect-timeout 10 \
  --max-time 30 \
  -H "Authorization: token $GITEA_TOKEN" \
  "https://sdp.ms.wits.ac.za/api/v1/repos/git-push-pray/Sport-Analytics-Tool/issues/121"
```

If that returns quickly, test the likely next one:

```bash
curl -v \
  --connect-timeout 10 \
  --max-time 30 \
  -H "Authorization: token $GITEA_TOKEN" \
  "https://sdp.ms.wits.ac.za/api/v1/repos/git-push-pray/Sport-Analytics-Tool/issues/121/comments?limit=50&page=1"
```

Then:

```bash
curl -v \
  --connect-timeout 10 \
  --max-time 30 \
  -H "Authorization: token $GITEA_TOKEN" \
  "https://sdp.ms.wits.ac.za/api/v1/repos/git-push-pray/Sport-Analytics-Tool/issues/121/timeline?limit=50&page=1"
```

The Gitea documentation confirms `/issues/{index}/timeline` is a valid endpoint and supports both `page` and `limit`. ([Gitea Documentation](https://docs.gitea.com/api/1.24/operations/issue-get-comments-and-timeline/))

### We should fix the script before rerunning

Change the `api_get()` function from:

```bash
api_get() {
  curl -fsS \
    -H "Authorization: token $GITEA_TOKEN" \
    -H "Accept: application/json" \
    "$GITEA/api/v1$1"
}
```

to:

```bash
api_get() {
  curl -fsS \
    --connect-timeout 10 \
    --max-time 30 \
    --retry 2 \
    --retry-delay 2 \
    -H "Authorization: token $GITEA_TOKEN" \
    -H "Accept: application/json" \
    "$GITEA/api/v1$1"
}
```

That means a broken request can no longer freeze everything indefinitely.

Also, because you mainly want **all the issue information**, we can make this much simpler and faster. You probably don't need reactions, dependencies, blocks, etc. for every issue. We can export:

```text
all-issues.json
all-issues.csv
all-issues.md
```

with the complete issue descriptions **and every comment**, which is probably what you actually want.

Send me:

```bash
ls -lah gitea-export/issues/121
```

and I'll identify exactly where #121 got stuck and give you the corrected export script.

---

**Sources:**

- [List all comments and events on an issue | Gitea Documentation](https://docs.gitea.com/api/1.24/operations/issue-get-comments-and-timeline/)

## Prompt:
8/15/2026, 2:03:00 PM

===============================
Downloading complete issue list...
======================================

Found 68 issues.

Exporting issue #131...
Exporting issue #130...
Exporting issue #129...
Exporting issue #125...
Exporting issue #121...
^C

======================================
Creating CSV summary...
======================================

======================================
EXPORT COMPLETE
======================================

Issues exported: 68
Folder: gitea-export

996K    gitea-export
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$ ls -lah gitea-export/issues/121
total 96K
drwxrwxrwx 1 dean dean 4.0K Aug 15 14:00 .
drwxrwxrwx 1 dean dean 4.0K Aug 15 14:00 ..
-rwxrwxrwx 1 dean dean  85K Aug 15 14:00 comments.json
-rwxrwxrwx 1 dean dean 4.8K Aug 15 14:00 issue.json
dean@Leonard:/mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool$

## Response:
8/15/2026, 2:03:09 PM

> **Diagnosing the stalled fetch**
>
> I’m connecting the output to the script’s sequence: issue details and comments completed, then the timeline request likely hung. Because the loop runs in a pipeline, interrupting `curl` didn’t necessarily stop the parent script, so export continued partially.
>
> **Diagnosed the stalled fetch**
>
> 
>
> **Searching the web**
>
> [Gitea API (1.24.7)](https://docs.gitea.com/api/1.24/)
> [Releases · go-gitea/gitea](https://github.com/go-gitea/gitea/releases)
>
> **Fixing the export path**
>
> I’m treating the timeline request as the stall point. The main issue list is complete, but detailed exports stopped partway through. I’d remove timeline fetching, add request timeouts, rerun cleanly, and generate one combined Markdown file afterward.
>
> **Fixed the export path**
>
> 
>
> **Searching the web**
>
>
> **Searched 2 websites**
>
> 
>
> Worked for 22s

We can now pinpoint it: **issue #121 finished downloading `issue.json` and `comments.json`, then the script got stuck on the next step: the timeline export.** Your folder proves that because `timeline.json` was never created.

Also, when you pressed `Ctrl+C`, it interrupted that inner export loop, but the outer script continued to the CSV section, which is why it misleadingly printed `EXPORT COMPLETE`. So your current `issues-all.json` / CSV contain the 68 top-level issues, but the detailed per-issue export is incomplete.

For what you actually want, I’d remove the timeline/reactions/dependencies stuff entirely. Gitea 1.24.7 exposes issue comments separately, so downloading each issue plus all its comments is enough to preserve the issue title, body, metadata and discussion. ([Gitea Documentation](https://docs.gitea.com/api/1.24/))

Use this replacement. It **clears the export folder**, downloads all 68 issues again, fetches all comments, and produces one combined readable Markdown file plus JSON and CSV.

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool

GITEA="https://sdp.ms.wits.ac.za"
OWNER="git-push-pray"
REPO="Sport-Analytics-Tool"
EXPORT_DIR="gitea-export"

if [ -z "${GITEA_TOKEN:-}" ]; then
  echo "Enter Gitea API token:"
  read -s GITEA_TOKEN
  echo
fi

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR/issues"

api_get() {
  curl -fsS \
    --connect-timeout 10 \
    --max-time 30 \
    --retry 2 \
    --retry-delay 2 \
    -H "Authorization: token $GITEA_TOKEN" \
    -H "Accept: application/json" \
    "$GITEA/api/v1$1"
}

fetch_all_pages() {
  local path="$1"
  local output="$2"
  local separator="?"
  local page=1

  [[ "$path" == *"?"* ]] && separator="&"

  echo '[]' > "$output"

  while true; do
    data=$(api_get "${path}${separator}limit=50&page=${page}") || {
      echo "ERROR fetching: $path page $page"
      return 1
    }

    count=$(jq 'length' <<< "$data")

    [ "$count" -eq 0 ] && break

    tmp=$(mktemp)

    jq -s '.[0] + .[1]' \
      "$output" \
      <(printf '%s\n' "$data") \
      > "$tmp"

    mv "$tmp" "$output"

    # If fewer than 50 came back, this was the last page.
    [ "$count" -lt 50 ] && break

    page=$((page + 1))
  done
}

echo "======================================"
echo "Downloading all issues..."
echo "======================================"

fetch_all_pages \
  "/repos/$OWNER/$REPO/issues?state=all&type=issues" \
  "$EXPORT_DIR/issues-all.json"

ISSUE_COUNT=$(jq 'length' "$EXPORT_DIR/issues-all.json")

echo "Found $ISSUE_COUNT issues."
echo

# Start combined detailed JSON.
echo '[]' > "$EXPORT_DIR/all-issues-detailed.json"

# Start combined readable Markdown.
cat > "$EXPORT_DIR/all-issues.md" <<EOF
# Sport Analytics Tool - Gitea Issue Export

Exported issues: $ISSUE_COUNT

EOF

while read -r NUMBER; do
  echo "Exporting issue #$NUMBER..."

  DIR="$EXPORT_DIR/issues/$NUMBER"
  mkdir -p "$DIR"

  # Complete issue information.
  api_get \
    "/repos/$OWNER/$REPO/issues/$NUMBER" \
    > "$DIR/issue.json" || {
      echo "FAILED issue #$NUMBER"
      continue
    }

  # All comments.
  fetch_all_pages \
    "/repos/$OWNER/$REPO/issues/$NUMBER/comments" \
    "$DIR/comments.json" || {
      echo '[]' > "$DIR/comments.json"
    }

  # Create combined JSON object containing issue + comments.
  jq -n \
    --slurpfile issue "$DIR/issue.json" \
    --slurpfile comments "$DIR/comments.json" \
    '{
      issue: $issue[0],
      comments: $comments[0]
    }' > "$DIR/complete.json"

  tmp=$(mktemp)

  jq -s '.[0] + [.[1]]' \
    "$EXPORT_DIR/all-issues-detailed.json" \
    "$DIR/complete.json" \
    > "$tmp"

  mv "$tmp" "$EXPORT_DIR/all-issues-detailed.json"

  # Add issue to one big readable Markdown file.
  jq -r '
"
---

# Issue #\(.number): \(.title)

**State:** \(.state)
**Author:** \(.user.login // "")
**Created:** \(.created_at // "")
**Updated:** \(.updated_at // "")
**Closed:** \(.closed_at // "")
**Due date:** \(.due_date // "")
**Milestone:** \(.milestone.title // "")
**Assignees:** \([.assignees[]?.login] | join(", "))
**Labels:** \([.labels[]?.name] | join(", "))
**Comments:** \(.comments // 0)
**URL:** \(.html_url // "")

## Description

\(.body // "")
"
  ' "$DIR/issue.json" >> "$EXPORT_DIR/all-issues.md"

  COMMENT_COUNT=$(jq 'length' "$DIR/comments.json")

  if [ "$COMMENT_COUNT" -gt 0 ]; then
    echo >> "$EXPORT_DIR/all-issues.md"
    echo "## Comments" >> "$EXPORT_DIR/all-issues.md"
    echo >> "$EXPORT_DIR/all-issues.md"

    jq -r '
      .[] |
"
### \(.user.login // "unknown") - \(.created_at // "")

\(.body // "")
"
    ' "$DIR/comments.json" >> "$EXPORT_DIR/all-issues.md"
  fi

done < <(jq -r '.[].number' "$EXPORT_DIR/issues-all.json")

echo
echo "Creating CSV..."

jq -r '
[
  "number",
  "title",
  "state",
  "author",
  "assignees",
  "labels",
  "milestone",
  "created_at",
  "updated_at",
  "closed_at",
  "due_date",
  "comment_count",
  "body",
  "url"
],
(
  .[] |
  [
    .number,
    .title,
    .state,
    (.user.login // ""),
    ([.assignees[]?.login] | join("; ")),
    ([.labels[]?.name] | join("; ")),
    (.milestone.title // ""),
    (.created_at // ""),
    (.updated_at // ""),
    (.closed_at // ""),
    (.due_date // ""),
    (.comments // 0),
    (.body // ""),
    (.html_url // "")
  ]
)
| @csv
' "$EXPORT_DIR/issues-all.json" \
> "$EXPORT_DIR/issues-all.csv"

echo
echo "======================================"
echo "EXPORT FINISHED"
echo "======================================"
echo "Issues: $ISSUE_COUNT"
echo
ls -lh \
  "$EXPORT_DIR/all-issues.md" \
  "$EXPORT_DIR/all-issues-detailed.json" \
  "$EXPORT_DIR/issues-all.csv"
```

Your final folder will have the three useful combined files:

```text
gitea-export/
├── all-issues.md
├── all-issues-detailed.json
├── issues-all.csv
├── issues-all.json
└── issues/
    ├── 1/
    ├── 2/
    └── ...
```

### The one you probably want

Open:

```bash
code gitea-export/all-issues.md
```

That will be **one big readable file containing every issue, its full description, metadata, and every comment**.

Or open the folder:

```bash
explorer.exe gitea-export
```

And because we've removed the problematic timeline call, it should move cleanly from:

```text
Exporting issue #131...
Exporting issue #130...
...
Exporting issue #121...
Exporting issue #120...
Exporting issue #119...
```

instead of freezing at `#121`. Gitea 1.24.7 officially exposes both issue comments and timelines separately; we're simply skipping the timeline endpoint because you don't need it for this backup. ([Gitea Documentation](https://docs.gitea.com/api/1.24/))

---

**Sources:**

- [Gitea API 1.24.7 | Gitea Documentation](https://docs.gitea.com/api/1.24/)

## Prompt:
8/15/2026, 2:04:36 PM

can we make a readme and documentation and issue for this so everyone can us eit and their chats can use it if need

## Response:
8/15/2026, 2:04:44 PM

> **Preparing documentation drafts**
>
> I’m creating a reusable README section, a documentation page, and a Gitea issue template for exporting issues. I’ll include setup, safe token handling, usage, outputs, troubleshooting, and AI-assisted contribution notes.
>
> **Prepared documentation drafts**
>
> 
>
> **Drafting project artifacts**
>
> I’m preparing three reusable files: README guidance, detailed documentation, and a Gitea issue. I’m covering setup, token safety, generated Markdown/JSON outputs, chat usage, exclusions, acceptance criteria, and contribution attribution.
>
> **Drafted project artifacts**
>
> 
>
> Worked for 40s

## Prompt:
8/15/2026, 2:05:20 PM

can we make a readme and documentation and issue for this so everyone can us eit and their chats can use it if need

we would have to add the folder to gitignore but the isntructions should be there

## Response:
8/15/2026, 2:05:31 PM

**Recommended outcome:** commit the export script and its instructions, but **gitignore only the generated `gitea-export/` folder**. That gives every team member a reproducible tool without committing potentially large/private exports, and `all-issues.md` can be uploaded into a fresh ChatGPT/Claude conversation whenever someone needs current repository context.

This also supports your documented development methodology and tooling. Since these docs were created with AI assistance, they should include the COMS3011A AI declaration required for written documentation. `ai_policy.pdf`

Use this structure:

```text
Sport-Analytics-Tool/
├── scripts/
│   └── gitea-export/
│       ├── export-issues.sh       # COMMITTED
│       └── README.md              # COMMITTED
│
├── docs/
│   └── development/
│       └── gitea-issue-export.md  # COMMITTED
│
└── gitea-export/                  # GITIGNORED
    ├── all-issues.md
    ├── all-issues-detailed.json
    ├── issues-all.json
    ├── issues-all.csv
    └── issues/
```

Add this to the root `.gitignore`:

```gitignore
# Local Gitea issue exports
/gitea-export/
```

Do **not** ignore `scripts/gitea-export/`, because that contains the reusable tool and instructions.

### `scripts/gitea-export/README.md`

**document: **

# Gitea Issue Export Utility

This utility exports the issues from the Sport Analytics Tool Gitea repository into local files that are easier to search, archive, inspect, and provide as context to AI tools.

The export is intended for local development use. Generated exports are not committed to Git.

## Purpose

The Gitea project board is useful for day-to-day project management, but there is no convenient project-board export available on the Wits Gitea instance.

The issue tracker contains most of the information needed when reviewing project work, including:

- issue number;
- title;
- description;
- state;
- author;
- assignees;
- labels;
- milestone;
- creation, update and closing dates;
- comments; and
- links back to Gitea.

This script collects that information into reusable local files.

A particularly useful output is:

```text
gitea-export/all-issues.md
```

This file contains all exported issues and their comments in a single readable Markdown document. It can be searched locally or supplied to an AI assistant when a new conversation needs context about the project's current issues.

## Repository Structure

The export utility itself is committed:

```text
scripts/gitea-export/
├── export-issues.sh
└── README.md
```

Generated files are placed at:

```text
gitea-export/
```

The generated directory is excluded through `.gitignore`.

## Requirements

The script is intended to run from WSL, Linux, or another Bash-compatible environment.

Required commands:

```text
bash
curl
jq
git
```

Check that `curl` and `jq` are available:

```bash
curl --version
jq --version
```

## Gitea Access Token

A personal Gitea access token is required because the Sport Analytics Tool repository is not public.

Create a token in the Wits Gitea interface with permission to read issues.

The token requires:

```text
read:issue
```

Do not commit the token to the repository, place it in documentation, send it in chat messages, or include it in screenshots.

## Running the Export

From anywhere inside the Sport Analytics Tool repository, run:

```bash
bash scripts/gitea-export/export-issues.sh
```

If `GITEA_TOKEN` is not already defined, the script will ask for it:

```text
Enter a Gitea token with read:issue permission:
```

Paste the token and press Enter.

The token input is hidden.

Alternatively, define the token for the current shell first:

```bash
read -s GITEA_TOKEN
export GITEA_TOKEN
```

Then run:

```bash
bash scripts/gitea-export/export-issues.sh
```

## What Happens When the Script Runs

The script:

1. verifies that required tools are installed;
2. locates the repository root;
3. clears the previous local `gitea-export/` directory;
4. downloads all repository issues;
5. downloads the complete current contents of each issue;
6. downloads all comments for each issue;
7. creates individual issue backups;
8. creates combined JSON output;
9. creates a CSV summary; and
10. creates one combined Markdown document.

The old export is intentionally replaced each time so that the directory represents the latest exported state of Gitea.

## Generated Files

### `all-issues.md`

```text
gitea-export/all-issues.md
```

Human-readable combined export.

Contains each issue's:

- metadata;
- complete description; and
- comments.

This is usually the most convenient file for people and AI assistants.

### `all-issues-detailed.json`

```text
gitea-export/all-issues-detailed.json
```

Machine-readable combined issue and comment data.

Useful for scripts, analysis, filtering, or custom tooling.

### `issues-all.json`

```text
gitea-export/issues-all.json
```

The combined Gitea issue-list response.

### `issues-all.csv`

```text
gitea-export/issues-all.csv
```

Spreadsheet-friendly summary containing fields such as:

- issue number;
- title;
- state;
- author;
- assignees;
- labels;
- milestone;
- dates;
- description; and
- URL.

### Individual Issue Files

Each issue also receives its own directory:

```text
gitea-export/issues/<issue-number>/
```

For example:

```text
gitea-export/issues/120/
├── issue.json
├── comments.json
└── complete.json
```

This is useful when only one issue needs to be inspected or processed.

## Using the Export With AI Assistants

The combined Markdown export can be provided to a new ChatGPT, Claude, or other approved AI conversation when repository issue context is required.

The recommended file is:

```text
gitea-export/all-issues.md
```

Example use cases include:

- identifying available work;
- checking issue dependencies;
- understanding an issue before implementation;
- reviewing completed and outstanding work;
- identifying related issues;
- planning a sprint;
- checking ownership and milestones; and
- giving a fresh AI conversation current project-management context.

The export is a snapshot. It does not automatically update when Gitea changes.

Before using it for decisions that depend on the latest issue state, run the exporter again.

## Important Limitations

The export represents Gitea issues, not the complete Gitea Kanban board.

Information that exists only as project-board layout information may not appear in the issue export, such as an issue's exact manual position within a Kanban column.

The exporter also does not replace Git history, pull requests, code reviews, CI results, meeting records, or other project evidence.

## Security

The exported data may contain internal repository information.

Therefore:

- `gitea-export/` must remain gitignored;
- access tokens must never be committed;
- exported files should not be published publicly;
- exports should only be shared with appropriate team members and approved services; and
- users should regenerate rather than manually edit exports.

## Troubleshooting

### Token permission error

If Gitea reports:

```text
token does not have at least one of required scope(s), required=[read:issue]
```

create a new access token with issue read permission.

### Script appears stuck

API requests use connection and request timeouts so a single request should not wait indefinitely.

If the script must be stopped, use:

```text
Ctrl+C
```

Then rerun the exporter. The previous export will be cleared and rebuilt.

### Check the number of exported issues

Run:

```bash
jq 'length' gitea-export/issues-all.json
```

### Open the combined export

With VS Code:

```bash
code gitea-export/all-issues.md
```

With Windows Explorer from WSL:

```bash
explorer.exe gitea-export
```

## Configuration

The defaults are:

```text
Gitea:      https://sdp.ms.wits.ac.za
Owner:      git-push-pray
Repository: Sport-Analytics-Tool
```

The script may allow these to be overridden using environment variables:

```bash
GITEA_URL="..." \
GITEA_OWNER="..." \
GITEA_REPO="..." \
bash scripts/gitea-export/export-issues.sh
```

Normal team use should not require overriding these values.

## AI Declaration

The preceding document was generated and reviewed with the assistance of: ChatGPT-Web[GPT-5.6 Thinking].

The project team is responsible for reviewing and adapting these instructions before use.

### `docs/development/gitea-issue-export.md`

This one should explain **why it exists and how it fits into the team's workflow**, rather than duplicating the command reference.

**document: **

# Gitea Issue Export

## Overview

The Sport Analytics Tool repository includes a small utility for creating a local snapshot of the repository's Gitea issues.

The utility exists primarily to make issue information portable outside the Gitea web interface.

It is useful for:

- offline issue review;
- project and sprint planning;
- searching across issue descriptions;
- reviewing ownership and milestones;
- creating spreadsheet summaries; and
- providing current issue context to AI-assisted development sessions.

The exporter does not modify Gitea.

## Location

The reusable exporter is stored at:

```text
scripts/gitea-export/export-issues.sh
```

Usage instructions are available at:

```text
scripts/gitea-export/README.md
```

Generated data is placed in:

```text
gitea-export/
```

The generated directory is intentionally excluded from version control.

## Why the Generated Export Is Not Committed

Issue exports are transient snapshots of information that already exists in Gitea.

Committing the generated data would:

- duplicate information already maintained in Gitea;
- unnecessarily increase repository size;
- create frequent changes unrelated to product implementation;
- create stale copies of issue information; and
- potentially expose internal issue discussions in other contexts.

The repository therefore commits the exporter and its documentation, while ignoring the generated output.

The root `.gitignore` should include:

```gitignore
# Local Gitea issue exports
/gitea-export/
```

## Workflow

A team member who requires a current issue snapshot runs:

```bash
bash scripts/gitea-export/export-issues.sh
```

The export process requires a personal Gitea access token with:

```text
read:issue
```

The script then rebuilds the local export directory using the latest issue information available through the Gitea API.

## Outputs

The main outputs are:

```text
gitea-export/
├── all-issues.md
├── all-issues-detailed.json
├── issues-all.json
├── issues-all.csv
└── issues/
```

### Combined Markdown

`all-issues.md` is intended for human reading and AI context.

It includes all exported issues, their descriptions, metadata and comments in a single document.

### Combined Detailed JSON

`all-issues-detailed.json` preserves structured issue and comment information for programmatic use.

### CSV

`issues-all.csv` provides a compact tabular summary suitable for spreadsheet tools.

### Individual Issue Data

The `issues/` directory contains structured exports for individual issues.

## AI-Assisted Development Usage

A recurring problem when starting a new AI conversation is that the assistant does not automatically know the current state of the repository's Gitea issue tracker.

The export provides a controlled way to supply that information when appropriate.

Before starting work that depends heavily on the issue tracker:

1. generate a fresh export;
2. provide `all-issues.md` to the AI conversation;
3. identify the issue or task being worked on;
4. independently inspect relevant source code and repository documentation; and
5. verify any resulting implementation against Gitea and the project requirements.

The export should be treated as contextual information rather than an authority over the current repository state.

If issue information may have changed since the export was generated, Gitea should be checked directly or the export should be regenerated.

## Relationship to the Development Process

The exporter is a convenience tool. Gitea remains the team's source of truth for:

- issues;
- issue state;
- assignees;
- milestones;
- labels; and
- issue discussions.

Git remains the source of truth for code and version history.

Pull requests and CI remain the source of truth for review and automated verification.

The export does not replace any of these systems.

## Security Considerations

The export may contain internal project information.

Team members must:

- keep generated exports out of Git;
- never store Gitea access tokens in the script;
- never commit API tokens;
- avoid publishing generated exports;
- regenerate snapshots when current information is required; and
- consider what repository information is being provided before uploading an export to an external tool.

## Maintenance

If the repository name, organisation, Gitea host, authentication requirements, or API behaviour changes, the export script and documentation should be updated together.

Changes to the exporter should be reviewed like other repository tooling.

At minimum, a change should verify that:

- all issues can still be retrieved;
- pagination works;
- full issue descriptions are preserved;
- comments are preserved;
- previous exports are safely cleared;
- errors do not silently produce a seemingly complete export; and
- no authentication credentials are written to generated output.

## Limitations

The Gitea issue export is not a complete backup of the Gitea service.

It does not necessarily preserve:

- Kanban card ordering;
- board-specific column state;
- pull-request review information;
- Git commits;
- CI logs;
- repository settings; or
- other Gitea resources that are separate from issues.

Its purpose is specifically to make issue information reusable and portable.

## AI Declaration

The preceding document was generated and reviewed with the assistance of: ChatGPT-Web[GPT-5.6 Thinking].

The project team is responsible for reviewing and adapting the document before submission or publication.

### Gitea issue

I would create this **before committing the utility** so the implementation and PR can link back to a proper tracked task.

**document: **

# Add reusable Gitea issue export utility

## Description

Add a reusable repository utility that allows any team member to export the Sport Analytics Tool's Gitea issues into local Markdown, JSON and CSV files.

The main motivation is to make the project's issue information easier to search, review and reuse outside the Gitea web interface.

A combined Markdown export should also provide a convenient way to supply the current issue tracker context to a new AI-assisted development conversation when required.

Generated exports must remain local and must not be committed to the repository.

## Scope

### Included

- Add a reusable Bash issue-export script.
- Use the Wits Gitea REST API.
- Support the current `git-push-pray/Sport-Analytics-Tool` repository by default.
- Require a personal Gitea token with `read:issue` permission.
- Retrieve all issues using pagination.
- Retrieve the complete current issue description and metadata.
- Retrieve all comments for each issue.
- Generate one combined human-readable Markdown file.
- Generate structured combined JSON.
- Generate a CSV issue summary.
- Preserve individual issue JSON and comment data.
- Clear the previous generated export safely before creating a new snapshot.
- Add API request timeouts and useful failure messages.
- Add usage and troubleshooting documentation.
- Add development documentation explaining the tool and intended workflow.
- Add the generated `gitea-export/` directory to `.gitignore`.
- Document how the combined Markdown export may be used as context for AI-assisted development.

### Excluded

- Exporting the Gitea Kanban board layout or card ordering.
- Exporting Git history.
- Exporting pull-request reviews.
- Exporting CI logs.
- Committing generated issue exports.
- Storing or committing Gitea access tokens.
- Automatically uploading issue data to an AI service.
- Automatically modifying issues in Gitea.

## Proposed Structure

```text
scripts/
└── gitea-export/
    ├── export-issues.sh
    └── README.md

docs/
└── development/
    └── gitea-issue-export.md

gitea-export/        # generated and gitignored
```

## Generated Output

A successful run should produce approximately:

```text
gitea-export/
├── all-issues.md
├── all-issues-detailed.json
├── issues-all.json
├── issues-all.csv
└── issues/
    └── <issue-number>/
        ├── issue.json
        ├── comments.json
        └── complete.json
```

## Acceptance Criteria

- [ ] `scripts/gitea-export/export-issues.sh` is committed.
- [ ] The script can be run from inside the repository.
- [ ] The script does not contain a hard-coded access token.
- [ ] The user is prompted for a token when `GITEA_TOKEN` is not defined.
- [ ] A token with `read:issue` access can retrieve repository issues.
- [ ] The script correctly handles more than one page of issues.
- [ ] Open and closed issues are included.
- [ ] Pull requests are not unintentionally included as issues.
- [ ] Every successfully exported issue contains its full description.
- [ ] All available issue comments are exported.
- [ ] `all-issues.md` contains the exported issues and comments in one readable file.
- [ ] `all-issues-detailed.json` contains structured issue and comment data.
- [ ] `issues-all.csv` contains a useful issue summary.
- [ ] Individual issue data is preserved under `gitea-export/issues/`.
- [ ] Running the exporter again safely replaces the previous generated export.
- [ ] API requests use sensible timeouts so a failed request cannot hang indefinitely.
- [ ] Failed issue exports are clearly reported and are not silently presented as successful.
- [ ] `/gitea-export/` is present in the root `.gitignore`.
- [ ] Generated exports are not committed.
- [ ] `scripts/gitea-export/README.md` documents installation, token requirements, usage, outputs, security and troubleshooting.
- [ ] `docs/development/gitea-issue-export.md` documents the purpose and development workflow.
- [ ] Documentation explains that `all-issues.md` may be supplied to an AI development conversation when current issue context is required.
- [ ] Documentation states that the export is a snapshot and Gitea remains the source of truth.
- [ ] Documentation contains the required AI usage declaration.

## Security

The Gitea API token must only be supplied at runtime.

The implementation must not:

- print the token;
- write the token into generated files;
- store the token in source control; or
- recommend committing generated issue data.

Generated exports may contain internal project information and therefore remain gitignored.

## Testing

Verify the utility by:

1. running it with a valid `read:issue` token;
2. comparing the reported issue count with the repository;
3. inspecting several open and closed issues;
4. confirming descriptions are complete;
5. confirming comments are present;
6. checking an issue with multiple comments;
7. verifying CSV and JSON with `jq` or another parser;
8. rerunning the script and confirming the previous export is safely replaced;
9. testing the behaviour with an invalid or insufficiently scoped token; and
10. confirming `git status` does not show the generated export directory.

## Documentation

Document:

- prerequisites;
- token permissions;
- commands;
- generated files;
- security considerations;
- limitations;
- AI-context usage;
- troubleshooting; and
- maintenance expectations.

## Priority

Medium

## Dependencies

None beyond the existing Gitea issue tracker and local `curl`, `jq`, Bash and Git tooling.

## Owner

Unassigned

## Milestone

Milestone 1 / Sprint 1

## Evidence

Expected implementation evidence may include:

- linked commits;
- pull request;
- successful local export output;
- documentation;
- `.gitignore` change; and
- review of generated files.

Do not create or claim evidence until the implementation has actually been completed.

## AI Declaration

This issue was planned and drafted with the assistance of: ChatGPT-Web[GPT-5.6 Thinking].

The issue should be reviewed and adapted by the project team before use.

Then the implementation PR would ideally contain:

```text
scripts/gitea-export/export-issues.sh
scripts/gitea-export/README.md
docs/development/gitea-issue-export.md
.gitignore
```

and **not**:

```text
gitea-export/**
```

One thing I would add to the script before you commit it: a generated timestamp near the top of `all-issues.md`. That way, when somebody uploads it into a new chat, both the person and the AI immediately know **how stale the snapshot is**.

## Prompt:
8/15/2026, 2:09:06 PM

what shoud the gitignore need to add

## Response:
8/15/2026, 2:09:09 PM

Add just this to your root `.gitignore`:

```gitignore
# Local Gitea issue exports
/gitea-export/
```

That is enough.

It will ignore:

```text
gitea-export/all-issues.md
gitea-export/all-issues-detailed.json
gitea-export/issues-all.json
gitea-export/issues-all.csv
gitea-export/issues/...
```

but it will **not** ignore your committed tool here:

```text
scripts/gitea-export/
```

So your repo keeps:

```text
scripts/gitea-export/export-issues.sh
scripts/gitea-export/README.md
docs/development/gitea-issue-export.md
```

while the generated exports stay local.

After editing `.gitignore`, check:

```bash
git status
```

You should **not** see `gitea-export/` listed anymore.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)