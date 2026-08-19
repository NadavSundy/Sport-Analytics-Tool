# Issue #175 — Cricsheet Corpus Import Verification

## Scope

This record verifies the bulk import of the locally generated Cricsheet T20/IT20 corpus into the configured Supabase-hosted PostgreSQL development database.

The merged importer was taken from `main` at merge commit `b255641` (Pull Request #188).

No database credentials, connection strings, or authentication material are included in this evidence.

## Corpus Version

The repository documentation records an earlier corpus of 13,953 matches. The existing generated corpus used for this import contained 14,011 scoped match files: 58 more than that earlier snapshot.

Its generated summary reported:

```text
selected matches       : 14011
match types            : IT20, T20
include The Hundred    : false
invalid JSON           : 0
duplicate output paths : 0
manifest entries       : 14011
match files            : 14011
```

A fresh downloader run by Gabriel Raz downloaded the 138.4 MB Cricsheet archive and inspected 22,682 JSON files. Its final replacement step failed before completion:

```text
Error: [WinError 5] Access is denied:
data/cricsheet/.staging/matches -> data/cricsheet/matches
```

Because the staged directory did not replace the existing match directory, the failed refresh is not treated as proof of the current archive's final selected-match count. The subsequent dry run definitively establishes that the imported input was the existing 14,011-file corpus.

This verification therefore covers that 14,011-match local corpus rather than reproducing the older 13,953-match snapshot or claiming that the interrupted refresh completed.

## Preflight Verification

The configured database connection was checked without recording its URL:

```text
Database connection check passed.
  database        : postgres
  user            : postgres
  server version  : 17.6
  prepared stmts  : supported
  elapsed         : 1240 ms
```

Gabriel Raz ran the importer dry run. It read every JSON file and wrote nothing:

```text
Found 14011 JSON files under data/cricsheet/matches
Checking which are match files. This reads every file and takes a minute.

Dry run: 14011 match file(s) would be imported. Nothing was written.
```

## Import Result

Gabriel Raz ran the resumable corpus importer over the full directory:

```text
Import complete.

  files considered  : 14011
  imported          : 13937
  already present   : 74
  rejected          : 0
  deliveries added  : 3190709
  elapsed           : 15h 12m
```

The final progress line reported an average rate of `0.26/s`. The accounting reconciles exactly:

```text
13937 imported + 74 already present + 0 rejected = 14011 files considered
```

The 74 already-present fixtures demonstrate the resumable, idempotent path: they were detected rather than duplicated.

## Final Database Totals

```text
  competitions  :       741  (+733)
  seasons       :        44  (+37)
  teams         :       371  (+347)
  participants  :     13481  (+12963)
  fixtures      :     14011  (+13937)
  innings       :     28021  (+27871)
  deliveries    :   3207109  (+3190709)
  wickets       :    174360  (+173356)
  submissions   :     14225  (+14011)
```

## Verification Summary

| Verification                    |         Result |
| ------------------------------- | -------------: |
| Current corpus files discovered |         14,011 |
| Match files accepted by dry run |         14,011 |
| Dry-run database writes         |              0 |
| Newly imported fixtures         |         13,937 |
| Already-present fixtures        |             74 |
| Rejected files                  |              0 |
| Deliveries added                |      3,190,709 |
| Final fixture total             |         14,011 |
| Final delivery total            |      3,207,109 |
| Elapsed import time             |        15h 12m |
| Average completion rate         | 0.26 matches/s |
| Import result                   |           PASS |

## Operational Note

Restoring the laptop's AC standby and hibernate timeouts to 30 minutes was attempted after completion, but the privileged command was not authorized by Windows during this session. The timeout restoration must be confirmed separately and is not claimed as completed here.

## AI Declaration

This sanitized verification record was prepared with the assistance of Codex[GPT-5]. The downloader attempt, authoritative dry run, and real import were executed by Gabriel Raz, who supplied their terminal outputs for recording. Codex separately checked the configured database connection and reconciled the supplied counts without recording credentials.
