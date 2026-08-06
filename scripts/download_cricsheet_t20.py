#!/usr/bin/env python3
"""
Download Cricsheet's complete JSON archive and retain only matches in scope:

- T20
- IT20
- Men's and women's matches
- Domestic, franchise, club, official international, and non-official
  international T20 matches
- The Hundred is excluded by default because it is a 100-ball competition

The script uses only Python's standard library.

Examples:
    python scripts/download_cricsheet_t20.py
    python scripts/download_cricsheet_t20.py --refresh
    python scripts/download_cricsheet_t20.py --output data/cricsheet
    python scripts/download_cricsheet_t20.py --include-hundred
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import unicodedata
import urllib.error
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

SOURCE_URL = "https://cricsheet.org/downloads/all_json.zip"
USER_AGENT = "Sport-Analytics-Tool/1.0 (student project; Cricsheet importer)"
SCOPED_MATCH_TYPES = {"T20", "IT20"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Download all Cricsheet JSON data and extract only scoped T20/IT20 matches."
        )
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/cricsheet"),
        help="Output directory (default: data/cricsheet)",
    )
    parser.add_argument(
        "--archive",
        type=Path,
        default=None,
        help=(
            "Path used for the downloaded ZIP. "
            "Defaults to <output>/downloads/all_json.zip"
        ),
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Download the ZIP again even when a cached copy already exists.",
    )
    parser.add_argument(
        "--include-hundred",
        action="store_true",
        help="Include The Hundred despite it being a 100-ball competition.",
    )
    return parser.parse_args()


def human_size(byte_count: int) -> str:
    value = float(byte_count)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.1f} {unit}"
        value /= 1024
    return f"{value:.1f} GB"


def slugify(value: str) -> str:
    normalised = unicodedata.normalize("NFKD", value)
    ascii_value = normalised.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or "unknown-competition"


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/zip,application/octet-stream;q=0.9,*/*;q=0.8",
        },
    )

    temp_path: Path | None = None
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            expected_size = int(response.headers.get("Content-Length", "0"))
            print(
                f"Downloading {url}"
                + (
                    f" ({human_size(expected_size)})"
                    if expected_size > 0
                    else ""
                )
            )

            with tempfile.NamedTemporaryFile(
                mode="wb",
                delete=False,
                dir=destination.parent,
                prefix=f"{destination.name}.",
                suffix=".part",
            ) as temp_file:
                temp_path = Path(temp_file.name)
                downloaded = 0

                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break

                    temp_file.write(chunk)
                    downloaded += len(chunk)

                    if expected_size > 0:
                        percentage = downloaded * 100 / expected_size
                        print(
                            f"\rDownloaded {human_size(downloaded)} "
                            f"({percentage:5.1f}%)",
                            end="",
                            flush=True,
                        )
                    else:
                        print(
                            f"\rDownloaded {human_size(downloaded)}",
                            end="",
                            flush=True,
                        )

        print()

        if expected_size > 0 and downloaded != expected_size:
            raise RuntimeError(
                f"Incomplete download: expected {expected_size} bytes, "
                f"received {downloaded} bytes."
            )

        if not zipfile.is_zipfile(temp_path):
            raise RuntimeError("Downloaded file is not a valid ZIP archive.")

        os.replace(temp_path, destination)
        temp_path = None
        print(f"Saved archive to {destination}")

    except urllib.error.HTTPError as error:
        raise RuntimeError(
            f"Cricsheet returned HTTP {error.code} for {url}."
        ) from error
    except urllib.error.URLError as error:
        raise RuntimeError(
            f"Could not connect to Cricsheet: {error.reason}"
        ) from error
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


def competition_name(match: dict[str, Any]) -> str:
    info = match.get("info", {})
    event = info.get("event")

    if isinstance(event, dict):
        name = event.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()

    match_type = str(info.get("match_type", "")).upper()
    team_type = str(info.get("team_type", "")).lower()

    if match_type == "IT20":
        return "T20 Internationals"
    if team_type == "international":
        return "Other International T20s"
    return "Unspecified T20 Competition"


def is_the_hundred(event_name: str) -> bool:
    folded = event_name.casefold()
    return "the hundred" in folded


def json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)
        .encode("utf-8")
        + b"\n"
    )


def replace_directory(staged: Path, destination: Path) -> None:
    if destination.exists():
        shutil.rmtree(destination)
    os.replace(staged, destination)


def extract_scoped_matches(
    archive_path: Path,
    output_dir: Path,
    include_hundred: bool,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    stage_root = output_dir / ".staging"
    stage_matches = stage_root / "matches"

    if stage_root.exists():
        shutil.rmtree(stage_root)
    stage_matches.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, Any]] = []
    competition_counts: Counter[str] = Counter()
    gender_counts: Counter[str] = Counter()
    match_type_counts: Counter[str] = Counter()

    invalid_json = 0
    non_match_json = 0
    out_of_scope = 0
    excluded_hundred = 0
    duplicate_output_paths = 0
    seen_output_paths: set[str] = set()

    try:
        with zipfile.ZipFile(archive_path) as archive:
            json_members = [
                member
                for member in archive.infolist()
                if not member.is_dir()
                and member.filename.lower().endswith(".json")
            ]

            print(f"Inspecting {len(json_members):,} JSON files...")

            for index, member in enumerate(json_members, start=1):
                try:
                    raw = archive.read(member)
                    match = json.loads(raw)
                except (KeyError, UnicodeDecodeError, json.JSONDecodeError):
                    invalid_json += 1
                    continue

                if not isinstance(match, dict):
                    non_match_json += 1
                    continue

                info = match.get("info")
                innings = match.get("innings")
                if not isinstance(info, dict) or not isinstance(innings, list):
                    non_match_json += 1
                    continue

                match_type = str(info.get("match_type", "")).upper()
                if match_type not in SCOPED_MATCH_TYPES:
                    out_of_scope += 1
                    continue

                event_name = competition_name(match)
                if not include_hundred and is_the_hundred(event_name):
                    excluded_hundred += 1
                    continue

                source_match_id = Path(member.filename).stem
                competition_slug = slugify(event_name)
                relative_path = (
                    Path("matches")
                    / competition_slug
                    / f"{source_match_id}.json"
                )
                relative_path_text = relative_path.as_posix()

                if relative_path_text in seen_output_paths:
                    duplicate_output_paths += 1
                    continue
                seen_output_paths.add(relative_path_text)

                destination = stage_root / relative_path
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(raw)

                meta = match.get("meta", {})
                if not isinstance(meta, dict):
                    meta = {}

                gender = str(info.get("gender", "unknown"))
                team_type = str(info.get("team_type", "unknown"))
                teams = info.get("teams", [])
                dates = info.get("dates", [])
                season = info.get("season")

                checksum = hashlib.sha256(raw).hexdigest()

                manifest.append(
                    {
                        "source": "Cricsheet",
                        "source_url": SOURCE_URL,
                        "source_member": member.filename,
                        "source_match_id": source_match_id,
                        "source_revision": meta.get("revision"),
                        "source_created": meta.get("created"),
                        "data_version": meta.get("data_version"),
                        "match_type": match_type,
                        "team_type": team_type,
                        "gender": gender,
                        "competition": event_name,
                        "season": season,
                        "dates": dates,
                        "teams": teams,
                        "sha256": checksum,
                        "file": relative_path_text,
                    }
                )

                competition_counts[event_name] += 1
                gender_counts[gender] += 1
                match_type_counts[match_type] += 1

                if index % 1000 == 0:
                    print(
                        f"Processed {index:,}/{len(json_members):,}; "
                        f"selected {len(manifest):,}"
                    )

        manifest.sort(
            key=lambda item: (
                item["competition"],
                str(item.get("season", "")),
                item["source_match_id"],
            )
        )

        summary = {
            "source": "Cricsheet",
            "source_url": SOURCE_URL,
            "scope": {
                "match_types": sorted(SCOPED_MATCH_TYPES),
                "genders": "all",
                "include_hundred": include_hundred,
            },
            "selected_matches": len(manifest),
            "counts_by_match_type": dict(sorted(match_type_counts.items())),
            "counts_by_gender": dict(sorted(gender_counts.items())),
            "counts_by_competition": dict(
                sorted(
                    competition_counts.items(),
                    key=lambda item: (-item[1], item[0]),
                )
            ),
            "skipped": {
                "out_of_scope_match_type": out_of_scope,
                "the_hundred": excluded_hundred,
                "invalid_json": invalid_json,
                "non_match_json": non_match_json,
                "duplicate_output_paths": duplicate_output_paths,
            },
        }

        (stage_root / "manifest.json").write_bytes(json_bytes(manifest))
        (stage_root / "summary.json").write_bytes(json_bytes(summary))

        output_dir.mkdir(parents=True, exist_ok=True)
        replace_directory(stage_matches, output_dir / "matches")
        shutil.copy2(stage_root / "manifest.json", output_dir / "manifest.json")
        shutil.copy2(stage_root / "summary.json", output_dir / "summary.json")

        return manifest, summary
    finally:
        if stage_root.exists():
            shutil.rmtree(stage_root)


def main() -> int:
    args = parse_args()
    output_dir: Path = args.output.resolve()
    archive_path = (
        args.archive.resolve()
        if args.archive is not None
        else output_dir / "downloads" / "all_json.zip"
    )

    try:
        if args.refresh or not archive_path.exists():
            download_file(SOURCE_URL, archive_path)
        else:
            print(f"Using cached archive: {archive_path}")
            if not zipfile.is_zipfile(archive_path):
                raise RuntimeError(
                    f"Cached archive is invalid: {archive_path}. "
                    "Run again with --refresh."
                )

        manifest, summary = extract_scoped_matches(
            archive_path=archive_path,
            output_dir=output_dir,
            include_hundred=args.include_hundred,
        )

        print()
        print("Cricsheet T20 download complete")
        print(f"Selected matches: {len(manifest):,}")
        print(f"Competitions/groups: {len(summary['counts_by_competition']):,}")
        print(f"Match files: {output_dir / 'matches'}")
        print(f"Manifest: {output_dir / 'manifest.json'}")
        print(f"Summary: {output_dir / 'summary.json'}")
        return 0

    except (OSError, RuntimeError, zipfile.BadZipFile) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
