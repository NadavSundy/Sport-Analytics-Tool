#!/usr/bin/env python3
"""Create and deploy the prepared backend artifact to Azure App Service.

This script is shared by automatic validated-main deployment and the manual
recovery workflow so the Azure ZIP/Kudu behaviour cannot drift between them.
"""

from pathlib import Path
import sys
import zipfile

source = Path(".deployment/backend")
target = Path(".deployment/backend.zip")

if not source.is_dir():
    print(
        f"Backend deployment directory does not exist: {source}",
        file=sys.stderr,
    )
    sys.exit(1)

files = [path for path in source.rglob("*") if path.is_file()]

if not files:
    print(
        "Backend deployment directory contains no files.",
        file=sys.stderr,
    )
    sys.exit(1)

if target.exists():
    target.unlink()

with zipfile.ZipFile(
    target,
    "w",
    compression=zipfile.ZIP_DEFLATED,
) as archive:
    for path in files:
        archive.write(
            path,
            path.relative_to(source),
        )

print(
    f"Created {target} containing {len(files)} files "
    f"({target.stat().st_size} bytes)."
)

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

profile_xml = os.environ.get(
    "AZURE_BACKEND_PUBLISH_PROFILE",
    "",
).strip()

if not profile_xml:
    print(
        "Azure backend publish profile is empty.",
        file=sys.stderr,
    )
    sys.exit(1)

try:
    root = ET.fromstring(profile_xml)
except ET.ParseError as exc:
    print(
        f"Invalid Azure publish profile XML: {exc}",
        file=sys.stderr,
    )
    sys.exit(1)

profiles = root.findall(".//publishProfile")

profile = next(
    (
        candidate
        for candidate in profiles
        if candidate.attrib.get("publishMethod") == "ZipDeploy"
    ),
    None,
)

if profile is None:
    profile = next(
        (
            candidate
            for candidate in profiles
            if candidate.attrib.get("publishMethod") == "MSDeploy"
        ),
        None,
    )

if profile is None:
    print(
        "No ZipDeploy or MSDeploy profile was found "
        "in the Azure publish profile.",
        file=sys.stderr,
    )
    sys.exit(1)

username = profile.attrib.get("userName", "").strip()
password = profile.attrib.get("userPWD", "")
publish_url = profile.attrib.get("publishUrl", "").strip()

if not username or not password or not publish_url:
    print(
        "Azure publish profile is missing the deployment "
        "URL or deployment credentials.",
        file=sys.stderr,
    )
    sys.exit(1)

# Some Azure publishing credentials may include a site prefix.
# Kudu ZIP deployment expects the application-scope "$site" portion.
if "\\" in username:
    username = username.split("\\")[-1]

publish_url = publish_url.removeprefix("https://")
publish_url = publish_url.removeprefix("http://")

host = publish_url.split("/", 1)[0]
host = host.split(":", 1)[0]

if not host:
    print(
        "Could not determine the Azure SCM hostname.",
        file=sys.stderr,
    )
    sys.exit(1)

zip_path = Path(".deployment/backend.zip")

if not zip_path.is_file():
    print(
        f"Deployment ZIP does not exist: {zip_path}",
        file=sys.stderr,
    )
    sys.exit(1)

credentials = base64.b64encode(
    f"{username}:{password}".encode("utf-8")
).decode("ascii")

auth_header = f"Basic {credentials}"

def redact(value):
    if not isinstance(value, str):
        return value

    return (
        value
        .replace(password, "***")
        .replace(credentials, "***")
        .replace(auth_header, "***")
    )

def request_json(url):
    request = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Authorization": auth_header,
            "Accept": "application/json",
            "User-Agent": "Sport-Analytics-Gitea-Actions",
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=60,
    ) as response:
        body = response.read().decode(
            "utf-8",
            errors="replace",
        )

    return json.loads(body)

deployment_url = (
    f"https://{host}/api/zipdeploy?isAsync=true"
)

payload = zip_path.read_bytes()

request = urllib.request.Request(
    deployment_url,
    data=payload,
    method="POST",
    headers={
        "Authorization": auth_header,
        "Content-Type": "application/zip",
        "Content-Length": str(len(payload)),
        "User-Agent": "Sport-Analytics-Gitea-Actions",
    },
)

print(
    f"Uploading {len(payload)} byte backend artifact "
    "to Azure App Service..."
)

try:
    with urllib.request.urlopen(
        request,
        timeout=180,
    ) as response:
        status = response.status
        location = response.headers.get("Location")

        print(
            f"Azure ZIP upload HTTP status: {status}"
        )

        if status not in (200, 202):
            print(
                "Azure did not accept the ZIP deployment.",
                file=sys.stderr,
            )
            sys.exit(1)

        if not location:
            print(
                "Azure accepted the deployment but did not "
                "return a deployment status URL.",
                file=sys.stderr,
            )
            sys.exit(1)

        status_url = urllib.parse.urljoin(
            deployment_url,
            location,
        )

except urllib.error.HTTPError as exc:
    body = exc.read().decode(
        "utf-8",
        errors="replace",
    )

    print(
        f"Azure ZIP upload failed with HTTP {exc.code}.",
        file=sys.stderr,
    )

    if body:
        print(redact(body[:8000]), file=sys.stderr)

    sys.exit(1)

except urllib.error.URLError as exc:
    print(
        f"Azure ZIP upload connection failed: {exc.reason}",
        file=sys.stderr,
    )
    sys.exit(1)

print("Azure accepted the ZIP. Waiting for deployment...")

deployment = None

for attempt in range(1, 61):
    try:
        deployment = request_json(status_url)
    except Exception as exc:
        print(
            f"Deployment status check {attempt} failed: {exc}"
        )
        time.sleep(10)
        continue

    status = deployment.get("status")
    complete = deployment.get("complete")
    progress = deployment.get("progress") or ""
    status_text = deployment.get("status_text") or ""

    print(
        f"Deployment status check {attempt}: "
        f"status={status}, complete={complete}"
    )

    if progress:
        print(f"Progress: {redact(progress)}")

    if status_text:
        print(f"Status text: {redact(status_text)}")

    if status == 4:
        print("Azure backend deployment completed successfully.")
        sys.exit(0)

    if status == 3:
        break

    if complete and status != 4:
        break

    time.sleep(10)

if deployment is None:
    print(
        "Unable to retrieve Azure deployment status.",
        file=sys.stderr,
    )
    sys.exit(1)

print(
    "Azure backend deployment failed.",
    file=sys.stderr,
)

message = deployment.get("message")
if message:
    print(
        f"Deployment message: {redact(str(message))}",
        file=sys.stderr,
    )

log_url = deployment.get("log_url")

if log_url:
    try:
        logs = request_json(log_url)

        print(
            "----- Azure Kudu deployment log -----",
            file=sys.stderr,
        )

        for entry in logs:
            log_message = redact(
                str(entry.get("message", ""))
            )

            if log_message:
                print(
                    log_message,
                    file=sys.stderr,
                )

            details_url = entry.get("details_url")

            if details_url:
                try:
                    details = request_json(details_url)

                    if isinstance(details, list):
                        for detail in details:
                            detail_message = redact(
                                str(
                                    detail.get(
                                        "message",
                                        ""
                                    )
                                )
                            )

                            if detail_message:
                                print(
                                    f"  {detail_message}",
                                    file=sys.stderr,
                                )

                except Exception as exc:
                    print(
                        "Could not retrieve deployment "
                        f"log details: {exc}",
                        file=sys.stderr,
                    )

        print(
            "--------------------------------------",
            file=sys.stderr,
        )

    except Exception as exc:
        print(
            f"Could not retrieve Azure deployment logs: {exc}",
            file=sys.stderr,
        )

sys.exit(1)
