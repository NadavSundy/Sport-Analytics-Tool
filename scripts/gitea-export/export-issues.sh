#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd -P)"
readonly OUTPUT_DIR="${REPO_ROOT}/gitea-export"

GITEA_API_URL="${GITEA_API_URL:-https://sdp.ms.wits.ac.za/api/v1}"
GITEA_OWNER="${GITEA_OWNER:-git-push-pray}"
GITEA_REPO="${GITEA_REPO:-Sport-Analytics-Tool}"
GITEA_CONNECT_TIMEOUT="${GITEA_CONNECT_TIMEOUT:-10}"
GITEA_MAX_TIME="${GITEA_MAX_TIME:-60}"
readonly PAGE_SIZE=50

STAGING_DIR=""

usage() {
  cat <<'EOF'
Export all issues and comments from a Gitea repository.

Usage:
  bash scripts/gitea-export/export-issues.sh [options]

Options:
  --api-url URL   Gitea API root (default: https://sdp.ms.wits.ac.za/api/v1)
  --owner OWNER   Repository owner (default: git-push-pray)
  --repo REPO     Repository name (default: Sport-Analytics-Tool)
  -h, --help      Show this help

Environment:
  GITEA_TOKEN             Personal access token with read:issue permission
  GITEA_API_URL           Alternative to --api-url
  GITEA_OWNER             Alternative to --owner
  GITEA_REPO              Alternative to --repo
  GITEA_CONNECT_TIMEOUT   Connection timeout in seconds (default: 10)
  GITEA_MAX_TIME          Maximum time per API request in seconds (default: 60)

If GITEA_TOKEN is unset, the script prompts for it without echoing the value.
The completed snapshot is written to the repository's gitignored gitea-export/
directory. Existing output is replaced only after the new snapshot succeeds.
EOF
}

log() {
  printf '%s\n' "$*" >&2
}

die() {
  log "Error: $*"
  exit 1
}

cleanup() {
  local exit_status=$?

  GITEA_TOKEN=""
  if [[ -n "${STAGING_DIR}" && -d "${STAGING_DIR}" ]]; then
    case "${STAGING_DIR}" in
      "${REPO_ROOT}"/.gitea-export.tmp.*)
        rm -rf -- "${STAGING_DIR}"
        ;;
      *)
        log "Warning: refused to remove unexpected staging path: ${STAGING_DIR}"
        ;;
    esac
  fi

  return "${exit_status}"
}

trap cleanup EXIT

while (($# > 0)); do
  case "$1" in
    --api-url)
      (($# >= 2)) || die "--api-url requires a value."
      GITEA_API_URL="$2"
      shift 2
      ;;
    --owner)
      (($# >= 2)) || die "--owner requires a value."
      GITEA_OWNER="$2"
      shift 2
      ;;
    --repo)
      (($# >= 2)) || die "--repo requires a value."
      GITEA_REPO="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument '$1'. Run with --help for usage."
      ;;
  esac
done

GITEA_API_URL="${GITEA_API_URL%/}"

for command_name in curl git jq mktemp; do
  command -v "${command_name}" >/dev/null 2>&1 ||
    die "required command '${command_name}' was not found on PATH."
done

[[ "$(git -C "${REPO_ROOT}" rev-parse --is-inside-work-tree 2>/dev/null)" == "true" ]] ||
  die "the exporter must remain inside a Git working tree."

[[ "${GITEA_API_URL}" =~ ^https?://[^[:space:]]+$ ]] ||
  die "GITEA_API_URL must be an HTTP or HTTPS URL."
if [[ "${GITEA_API_URL}" == http://* ]] &&
  [[ ! "${GITEA_API_URL}" =~ ^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/|$) ]]; then
  die "GITEA_API_URL must use HTTPS unless it targets the local machine."
fi
[[ "${GITEA_OWNER}" =~ ^[A-Za-z0-9._-]+$ ]] ||
  die "repository owner contains unsupported characters: '${GITEA_OWNER}'."
[[ "${GITEA_REPO}" =~ ^[A-Za-z0-9._-]+$ ]] ||
  die "repository name contains unsupported characters: '${GITEA_REPO}'."
[[ "${GITEA_CONNECT_TIMEOUT}" =~ ^[1-9][0-9]*$ ]] ||
  die "GITEA_CONNECT_TIMEOUT must be a positive whole number."
[[ "${GITEA_MAX_TIME}" =~ ^[1-9][0-9]*$ ]] ||
  die "GITEA_MAX_TIME must be a positive whole number."

if [[ -z "${GITEA_TOKEN:-}" ]]; then
  [[ -t 0 ]] ||
    die "GITEA_TOKEN is unset and no interactive terminal is available for a secure prompt."
  printf 'Gitea token (requires read:issue permission): ' >&2
  IFS= read -r -s GITEA_TOKEN || die "could not read a Gitea token from the terminal."
  printf '\n' >&2
fi

[[ -n "${GITEA_TOKEN}" ]] || die "a non-empty Gitea token is required."
[[ "${GITEA_TOKEN}" != *$'\r'* && "${GITEA_TOKEN}" != *$'\n'* ]] ||
  die "GITEA_TOKEN must not contain a line break."

api_error_message() {
  local response_file="$1"

  if [[ -s "${response_file}" ]] && jq -e . "${response_file}" >/dev/null 2>&1; then
    jq -r '.message // .error // empty' "${response_file}" 2>/dev/null || true
  fi
}

api_get() {
  local url="$1"
  local destination="$2"
  local description="$3"
  local curl_error_file="${STAGING_DIR}/.curl-error"
  local http_status=""
  local curl_status=0
  local server_message=""

  : >"${curl_error_file}"
  if http_status="$(
    printf 'Authorization: token %s\n' "${GITEA_TOKEN}" | \
      curl \
        --silent \
        --show-error \
        --connect-timeout "${GITEA_CONNECT_TIMEOUT}" \
        --max-time "${GITEA_MAX_TIME}" \
        --retry 2 \
        --retry-delay 1 \
        --retry-connrefused \
        --header "Accept: application/json" \
        --header @- \
        --output "${destination}" \
        --write-out '%{http_code}' \
        "${url}" \
        2>"${curl_error_file}"
  )"; then
    :
  else
    curl_status=$?
    if [[ -s "${curl_error_file}" ]]; then
      log "curl reported: $(<"${curl_error_file}")"
    fi
    die "request failed while ${description} (curl exit ${curl_status}, HTTP ${http_status:-000})."
  fi

  if [[ ! "${http_status}" =~ ^2[0-9][0-9]$ ]]; then
    server_message="$(api_error_message "${destination}")"
    case "${http_status}" in
      401)
        die "authentication failed while ${description} (HTTP 401). Check GITEA_TOKEN."
        ;;
      403)
        die "access was denied while ${description} (HTTP 403). Confirm the token has read:issue permission."
        ;;
      404)
        die "the repository or endpoint was not found while ${description} (HTTP 404). Check the API URL, owner and repository."
        ;;
      *)
        if [[ -n "${server_message}" ]]; then
          die "Gitea returned HTTP ${http_status} while ${description}: ${server_message}"
        fi
        die "Gitea returned HTTP ${http_status} while ${description}."
        ;;
    esac
  fi

  jq -e . "${destination}" >/dev/null 2>&1 ||
    die "Gitea returned invalid JSON while ${description}."
}

fetch_paginated_array() {
  local endpoint="$1"
  local destination="$2"
  local description="$3"
  local separator='?'
  local page=1
  local item_count=0
  local page_file=""
  local merged_file=""

  [[ "${endpoint}" == *\?* ]] && separator='&'
  printf '[]\n' >"${destination}"

  while :; do
    page_file="$(mktemp "${STAGING_DIR}/.page.XXXXXX")"
    api_get \
      "${GITEA_API_URL}${endpoint}${separator}limit=${PAGE_SIZE}&page=${page}" \
      "${page_file}" \
      "${description}, page ${page}"

    jq -e 'type == "array"' "${page_file}" >/dev/null ||
      die "expected an array while ${description}, page ${page}."
    item_count="$(jq 'length' "${page_file}")"
    item_count="${item_count%$'\r'}"
    merged_file="$(mktemp "${STAGING_DIR}/.merged.XXXXXX")"
    jq -s '.[0] + .[1]' "${destination}" "${page_file}" >"${merged_file}" ||
      die "could not merge page ${page} while ${description}."
    mv -- "${merged_file}" "${destination}"
    rm -f -- "${page_file}"

    ((item_count < PAGE_SIZE)) && break
    ((page += 1))
  done
}

write_markdown_issue() {
  local complete_file="$1"
  local markdown_file="$2"

  jq -r '
    def username($user):
      if $user == null then
        "unknown"
      elif (($user.full_name // "") | length) > 0 then
        $user.full_name
      elif (($user.login // "") | length) > 0 then
        $user.login
      else
        "unknown"
      end;
    def text_or($value; $fallback):
      if $value == null or $value == "" then $fallback else $value end;
    def joined_or($values; $fallback):
      if ($values | length) == 0 then $fallback else ($values | join(", ")) end;

    .issue as $issue |
    .comments as $comments |
    "## #\($issue.number): \($issue.title)\n\n" +
    "- **State:** \($issue.state)\n" +
    "- **Author:** \(username($issue.user))\n" +
    "- **Assignees:** \(joined_or([
      (
        if (($issue.assignees // []) | length) > 0 then
          $issue.assignees[]
        elif $issue.assignee != null then
          $issue.assignee
        else
          empty
        end
      )
      | username(.)
    ]; "None"))\n" +
    
    "- **Labels:** \(joined_or([($issue.labels // [])[] | .name]; "None"))\n" +
    "- **Milestone:** \(if $issue.milestone == null then "None" else $issue.milestone.title end)\n" +
    "- **Created:** \($issue.created_at // "Unknown")\n" +
    "- **Updated:** \($issue.updated_at // "Unknown")\n" +
    "- **Closed:** \($issue.closed_at // "Not closed")\n" +
    "- **URL:** \($issue.html_url // $issue.url // "Unavailable")\n\n" +
    "### Description\n\n" +
    text_or($issue.body; "_No description provided._") + "\n\n" +
    "### Comments (\($comments | length))\n\n" +
    (if ($comments | length) == 0 then
      "_No comments._"
    else
      ($comments | to_entries | map(
        "#### Comment \(.key + 1) — \(username(.value.user))\n\n" +
        "- **Created:** \(.value.created_at // "Unknown")\n" +
        "- **Updated:** \(.value.updated_at // "Unknown")\n" +
        "- **URL:** \(.value.html_url // "Unavailable")\n\n" +
        text_or(.value.body; "_Empty comment._")
      ) | join("\n\n"))
    end) +
    "\n\n---\n"
  ' "${complete_file}" >>"${markdown_file}" ||
    die "could not render Markdown for $(basename -- "$(dirname -- "${complete_file}")")."
}

STAGING_DIR="$(mktemp -d "${REPO_ROOT}/.gitea-export.tmp.XXXXXX")"
mkdir -p -- "${STAGING_DIR}/issues"

readonly EXPORT_TIMESTAMP="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
readonly REPOSITORY_PATH="${GITEA_OWNER}/${GITEA_REPO}"
readonly ISSUES_ENDPOINT="/repos/${GITEA_OWNER}/${GITEA_REPO}/issues"
readonly CHECKOUT_COMMIT="$(git -C "${REPO_ROOT}" rev-parse HEAD)"
readonly CHECKOUT_BRANCH="$(
  git -C "${REPO_ROOT}" symbolic-ref --quiet --short HEAD 2>/dev/null || printf 'detached HEAD'
)"

if [[ -n "$(git -C "${REPO_ROOT}" status --porcelain --untracked-files=normal)" ]]; then
  readonly WORKING_TREE_DIRTY=true
else
  readonly WORKING_TREE_DIRTY=false
fi

git -C "${REPO_ROOT}" ls-files | jq -Rn '[inputs]' >"${STAGING_DIR}/repository-files.json" ||
  die "could not create the tracked repository file index."
jq -r '.[]' "${STAGING_DIR}/repository-files.json" >"${STAGING_DIR}/repository-files.txt" ||
  die "could not render the tracked repository file index."
TRACKED_FILE_COUNT="$(jq 'length' "${STAGING_DIR}/repository-files.json")"
TRACKED_FILE_COUNT="${TRACKED_FILE_COUNT%$'\r'}"
readonly TRACKED_FILE_COUNT

log "Fetching all issues for ${REPOSITORY_PATH}..."
fetch_paginated_array \
  "${ISSUES_ENDPOINT}?state=all&type=issues" \
  "${STAGING_DIR}/.listed-issues.json" \
  "listing repository issues"

jq '
  [
    .[]
    | select((.pull_request? // null) == null)
  ]
  | sort_by(.number)
' "${STAGING_DIR}/.listed-issues.json" >"${STAGING_DIR}/.issues-to-export.json" ||
  die "could not filter the repository issue list."

jq -e '
  type == "array"
  and all(.[]; (.number | type == "number") and (.number | floor == .))
  and ((map(.number) | length) == (map(.number) | unique | length))
' "${STAGING_DIR}/.issues-to-export.json" >/dev/null ||
  die "the issue list contained a missing, invalid or duplicate issue number."

ISSUE_NUMBERS=()
while IFS= read -r issue_number; do
  issue_number="${issue_number%$'\r'}"
  ISSUE_NUMBERS+=("${issue_number}")
done < <(jq -r '.[].number' "${STAGING_DIR}/.issues-to-export.json")
readonly ISSUE_COUNT="${#ISSUE_NUMBERS[@]}"

printf '# Gitea issue export\n\n' >"${STAGING_DIR}/all-issues.md"
{
  printf -- '- **Repository:** `%s`\n' "${REPOSITORY_PATH}"
  printf -- '- **Exported at:** `%s`\n' "${EXPORT_TIMESTAMP}"
  printf -- '- **Issue count:** %s\n' "${ISSUE_COUNT}"
  printf -- '- **Source of truth:** Gitea; this file is a point-in-time snapshot.\n\n'
  printf 'Generated locally by `scripts/gitea-export/export-issues.sh`. '
  printf 'The export may contain internal project information and must not be committed.\n\n'
  printf -- '---\n\n'
} >>"${STAGING_DIR}/all-issues.md"

COMPLETE_FILES=()
for issue_number in "${ISSUE_NUMBERS[@]}"; do
  issue_dir="${STAGING_DIR}/issues/${issue_number}"
  mkdir -p -- "${issue_dir}"
  log "Exporting issue #${issue_number}..."

  api_get \
    "${GITEA_API_URL}${ISSUES_ENDPOINT}/${issue_number}" \
    "${issue_dir}/issue.json" \
    "fetching issue #${issue_number}"

  jq -e --argjson expected_number "${issue_number}" '
    type == "object"
    and .number == $expected_number
    and ((.pull_request? // null) == null)
  ' "${issue_dir}/issue.json" >/dev/null ||
    die "issue #${issue_number} returned an unexpected or pull-request payload."

  fetch_paginated_array \
    "${ISSUES_ENDPOINT}/${issue_number}/comments" \
    "${issue_dir}/comments.json" \
    "fetching comments for issue #${issue_number}"

  jq -n \
    --arg exported_at "${EXPORT_TIMESTAMP}" \
    --slurpfile issue "${issue_dir}/issue.json" \
    --slurpfile comments "${issue_dir}/comments.json" \
    '{exported_at: $exported_at, issue: $issue[0], comments: $comments[0]}' \
    >"${issue_dir}/complete.json" ||
    die "could not build the combined record for issue #${issue_number}."

  COMPLETE_FILES+=("${issue_dir}/complete.json")
  write_markdown_issue "${issue_dir}/complete.json" "${STAGING_DIR}/all-issues.md"
done

if ((ISSUE_COUNT == 0)); then
  printf '[]\n' >"${STAGING_DIR}/issues-all.json"
  printf '[]\n' >"${STAGING_DIR}/.detailed-issues.json"
  printf '_No issues were returned by Gitea._\n' >>"${STAGING_DIR}/all-issues.md"
else
  jq -s '[.[].issue]' "${COMPLETE_FILES[@]}" >"${STAGING_DIR}/issues-all.json" ||
    die "could not build issues-all.json."
  jq -s '.' "${COMPLETE_FILES[@]}" >"${STAGING_DIR}/.detailed-issues.json" ||
    die "could not combine detailed issue records."
fi

jq -n \
  --arg schema_version "1" \
  --arg exported_at "${EXPORT_TIMESTAMP}" \
  --arg api_url "${GITEA_API_URL}" \
  --arg repository "${REPOSITORY_PATH}" \
  --argjson issue_count "${ISSUE_COUNT}" \
  --slurpfile issues "${STAGING_DIR}/.detailed-issues.json" \
  '{
    schema_version: ($schema_version | tonumber),
    exported_at: $exported_at,
    source: {api_url: $api_url, repository: $repository},
    issue_count: $issue_count,
    issues: $issues[0]
  }' >"${STAGING_DIR}/all-issues-detailed.json" ||
  die "could not build all-issues-detailed.json."

jq -n \
  --arg schema_version "1" \
  --arg exported_at "${EXPORT_TIMESTAMP}" \
  --arg api_url "${GITEA_API_URL}" \
  --arg repository "${REPOSITORY_PATH}" \
  --arg branch "${CHECKOUT_BRANCH}" \
  --arg commit "${CHECKOUT_COMMIT}" \
  --argjson working_tree_dirty "${WORKING_TREE_DIRTY}" \
  --argjson tracked_file_count "${TRACKED_FILE_COUNT}" \
  --slurpfile tracked_files "${STAGING_DIR}/repository-files.json" \
  --slurpfile issue_export "${STAGING_DIR}/all-issues-detailed.json" \
  '{
    schema_version: ($schema_version | tonumber),
    exported_at: $exported_at,
    repository: {
      name: $repository,
      api_url: $api_url,
      checkout: {
        branch: $branch,
        commit: $commit,
        working_tree_dirty: $working_tree_dirty
      },
      tracked_file_count: $tracked_file_count,
      tracked_files: $tracked_files[0]
    },
    issue_tracker: $issue_export[0]
  }' >"${STAGING_DIR}/ai-project-context.json" ||
  die "could not build ai-project-context.json."

jq -r '
  [
    "number",
    "state",
    "title",
    "author",
    "assignees",
    "labels",
    "milestone",
    "created_at",
    "updated_at",
    "closed_at",
    "comment_count",
    "url"
  ],
  (
    .issues[] as $record
    | $record.issue as $issue
    | [
        $issue.number,
        $issue.state,
        $issue.title,
        ($issue.user.login // ""),
        ([($issue.assignees // [])[].login] | join("; ")),
        ([($issue.labels // [])[].name] | join("; ")),
        ($issue.milestone.title // ""),
        ($issue.created_at // ""),
        ($issue.updated_at // ""),
        ($issue.closed_at // ""),
        ($record.comments | length),
        ($issue.html_url // $issue.url // "")
      ]
  )
  | @csv
' "${STAGING_DIR}/all-issues-detailed.json" >"${STAGING_DIR}/issues-all.csv" ||
  die "could not build issues-all.csv."

{
  printf '# AI project context\n\n'
  printf -- '- **Repository:** `%s`\n' "${REPOSITORY_PATH}"
  printf -- '- **Generated at:** `%s`\n' "${EXPORT_TIMESTAMP}"
  printf -- '- **Checkout branch:** `%s`\n' "${CHECKOUT_BRANCH}"
  printf -- '- **Checkout commit:** `%s`\n' "${CHECKOUT_COMMIT}"
  printf -- '- **Working tree had changes:** `%s`\n' "${WORKING_TREE_DIRTY}"
  printf -- '- **Tracked files:** %s\n\n' "${TRACKED_FILE_COUNT}"
  printf 'This local file is an entry point for coding assistants operating inside this checkout. '
  printf 'Read the tracked source and documentation directly from the repository; they are not '
  printf 'duplicated here. The file index below helps locate them. The embedded Gitea issue export '
  printf 'adds tracker information that is not otherwise present in a Git clone.\n\n'
  printf 'The snapshot may be stale and the working tree may differ from the recorded commit. '
  printf 'Inspect the live checkout before editing, and treat Gitea as the source of truth for '
  printf 'issues. No Gitea credential is contained in this file.\n\n'
  printf '## Recommended starting points\n\n'
  printf -- '- `README.md`\n'
  printf -- '- `CONTRIBUTING.md`\n'
  printf -- '- `docs/index.md`\n'
  printf -- '- `docs/development/setup.md`\n'
  printf -- '- `docs/architecture/repository-structure.md`\n\n'
  printf '## Tracked repository files\n\n'
  printf '```text\n'
  while IFS= read -r tracked_file; do
    tracked_file="${tracked_file%$'\r'}"
    printf '%s\n' "${tracked_file}"
  done <"${STAGING_DIR}/repository-files.txt"
  printf '```\n\n'
  printf '## Embedded Gitea issue snapshot\n\n'
  while IFS= read -r markdown_line || [[ -n "${markdown_line}" ]]; do
    printf '%s\n' "${markdown_line}"
  done <"${STAGING_DIR}/all-issues.md"
} >"${STAGING_DIR}/ai-project-context.md" ||
  die "could not build ai-project-context.md."

for json_file in \
  "${STAGING_DIR}/issues-all.json" \
  "${STAGING_DIR}/all-issues-detailed.json" \
  "${STAGING_DIR}/ai-project-context.json" \
  "${STAGING_DIR}/repository-files.json" \
  "${STAGING_DIR}"/issues/*/*.json; do
  [[ -e "${json_file}" ]] || continue
  jq -e . "${json_file}" >/dev/null || die "generated invalid JSON: ${json_file}"
done

rm -f -- \
  "${STAGING_DIR}/.curl-error" \
  "${STAGING_DIR}/.listed-issues.json" \
  "${STAGING_DIR}/.issues-to-export.json" \
  "${STAGING_DIR}/.detailed-issues.json"

if [[ -e "${OUTPUT_DIR}" || -L "${OUTPUT_DIR}" ]]; then
  case "${OUTPUT_DIR}" in
    "${REPO_ROOT}/gitea-export")
      rm -rf -- "${OUTPUT_DIR}"
      ;;
    *)
      die "refused to replace unexpected output path: ${OUTPUT_DIR}"
      ;;
  esac
fi

mv -- "${STAGING_DIR}" "${OUTPUT_DIR}"
STAGING_DIR=""

log "Export complete: ${ISSUE_COUNT} issue(s) written to ${OUTPUT_DIR}"
