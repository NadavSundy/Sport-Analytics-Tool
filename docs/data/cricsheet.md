# Cricsheet T20 data

## Purpose

Cricsheet provides the event-level JSON match data used as the initial historical source for the Sport Analytics Tool.

The repository includes a repeatable downloader that retrieves Cricsheet's complete JSON archive and retains matches classified as `T20` or `IT20`.

Men's and women's matches are included. The Hundred is excluded by default because it is a 100-ball competition rather than a T20 competition.

## Requirements

- Python 3
- Internet access for the initial download or a refresh

The downloader uses only the Python standard library.

## Download the data

From the repository root:

```powershell
py scripts/download_cricsheet_t20.py
```

On the first run, the script downloads Cricsheet's complete JSON archive. On later runs, it reuses the locally cached archive.

To download the current archive again:

```powershell
py scripts/download_cricsheet_t20.py --refresh
```

To display all available options:

```powershell
py scripts/download_cricsheet_t20.py --help
```

## Generated files

The script creates:

```text
data/cricsheet/
├── downloads/
│   └── all_json.zip
├── matches/
│   └── <competition>/
│       └── <match-id>.json
├── manifest.json
└── summary.json
```

`manifest.json` records provenance and identifying information for every selected match, including its Cricsheet match ID, revision, schema version, competition, match type, checksum and local path.

`summary.json` records match counts by competition, gender and match type, together with counts of skipped files.

## Repository policy

The downloaded archive, extracted matches and generated metadata are local generated data and must not be committed to Git.

The downloader and its documentation are committed so that every team member can reproduce the same acquisition process.

The full download must not run during normal CI because it is large and depends on an external service.

## Current scope

The downloader retains:

- `T20` matches;
- `IT20` matches;
- men's matches;
- women's matches;
- domestic and franchise competitions;
- international competitions and series.

The Hundred is excluded unless the explicit `--include-hundred` option is used.

Cricsheet coverage is not complete for every historical T20 competition. Availability in this dataset must not be presented as complete worldwide coverage.

## Current downloaded dataset

The current full download selected:

- 13,953 matches in total;
- 13,633 matches classified as `T20`;
- 320 matches classified as `IT20`;
- 10,532 men's matches;
- 3,421 women's matches.

The downloader excluded 359 matches from The Hundred and reported no invalid JSON files or duplicate output paths during this run.

These counts describe the dataset at the time of the download and will change when Cricsheet adds or corrects match data.

## Refresh and correction handling

Cricsheet may publish corrected versions of match data. The generated manifest stores each file's revision and SHA-256 checksum so that future import logic can identify changed source files.

Refreshing the files does not itself import anything into PostgreSQL. Database ingestion will be implemented separately.

## Validation

To confirm that the downloader only retained scoped matches, inspect:

```text
data/cricsheet/summary.json
```

The expected scope is:

```json
{
  "match_types": ["IT20", "T20"],
  "genders": "all",
  "include_hundred": false
}
```

The generated data should remain absent from `git status` because the bulk archive, extracted matches, manifest and summary are ignored through `.gitignore`.

## AI Declaration
The preceding issue was planned and generated with the assistance of
ChatGPT-Web[GPT-5.6 Thinking].