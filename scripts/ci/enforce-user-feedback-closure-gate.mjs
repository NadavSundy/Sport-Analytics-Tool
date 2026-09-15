#!/usr/bin/env node

import fs from 'node:fs/promises';
import process from 'node:process';

const USER_FEEDBACK_LABEL = 'gate: user-feedback';
const COMMENT_MARKER = '<!-- user-feedback-closure-guard -->';

export function collectIssueLikeObjects(value, seen = new Set()) {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectIssueLikeObjects(item, seen));
  }

  if (typeof value !== 'object') return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const number = value.number ?? value.index;
  if (number != null && Number.isFinite(Number(number))) {
    return [value];
  }

  const wrappers = ['dependencies', 'data', 'items', 'issues', 'blocked_by', 'blocks'];
  return wrappers.flatMap((key) => collectIssueLikeObjects(value[key], seen));
}

function hasLabel(issue, labelName) {
  return Array.isArray(issue?.labels)
    && issue.labels.some((label) => String(label?.name ?? '').toLowerCase() === labelName.toLowerCase());
}

export function findOpenUserFeedbackGates(dependencies) {
  return dependencies.filter((issue) => {
    const state = String(issue?.state ?? '').toLowerCase();
    return state === 'open' && hasLabel(issue, USER_FEEDBACK_LABEL);
  });
}

export function makeReopenComment(issueNumber, gates) {
  const gateLines = gates
    .map((gate) => {
      const n = gate.number ?? gate.index;
      const title = gate.title ? ` - ${gate.title}` : '';
      return `- #${n}${title}`;
    })
    .join('\n');

  return `${COMMENT_MARKER}\n` +
    `**Closure blocked: required user feedback has not finished.**\n\n` +
    `Issue #${issueNumber} was automatically reopened because the following required user-feedback gate ` +
    `(\`${USER_FEEDBACK_LABEL}\`) is still open:\n\n${gateLines}\n\n` +
    `Complete the linked feature-level user-testing gate, record findings, resolve or formally ` +
    `disposition actionable findings, and retest accepted S1/S2 fixes before closing this issue again.\n\n` +
    `_This is enforced automatically by the Sprint 3 user-feedback closure guard._`;
}

async function apiRequest({ apiUrl, token, method = 'GET', path, body }) {
  const url = `${apiUrl.replace(/\/$/, '')}${path}`;
  const headers = {
    Accept: 'application/json',
    Authorization: `token ${token}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!response.ok) {
    const detail = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`${method} ${url} failed (${response.status}): ${detail}`);
  }

  return payload;
}

async function hydrateDependency({ apiUrl, token, owner, repo, dependency }) {
  const number = Number(dependency?.number ?? dependency?.index);
  if (!Number.isFinite(number)) return null;

  const hasState = typeof dependency?.state === 'string';
  const hasLabels = Array.isArray(dependency?.labels);
  if (hasState && hasLabels) return { ...dependency, number };

  const full = await apiRequest({
    apiUrl,
    token,
    path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
  });
  return { ...full, number };
}

export async function enforceClosedIssue({ event, apiUrl, token, repository }) {
  if (String(event?.action ?? '').toLowerCase() !== 'closed') {
    return { action: 'ignored', reason: 'event is not an issue close' };
  }

  const issueNumber = Number(event?.number ?? event?.issue?.number);
  if (!Number.isFinite(issueNumber)) {
    throw new Error('Could not determine the closed issue number from the Gitea event payload.');
  }

  const fullName = repository || event?.repository?.full_name;
  const parts = String(fullName ?? '').split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Could not determine repository owner/name from '${fullName ?? ''}'.`);
  }
  const [owner, repo] = parts;

  const rawDependencies = await apiRequest({
    apiUrl,
    token,
    path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/dependencies`,
  });

  const dependencyStubs = collectIssueLikeObjects(rawDependencies);
  const dependencies = (await Promise.all(
    dependencyStubs.map((dependency) => hydrateDependency({
      apiUrl, token, owner, repo, dependency,
    })),
  )).filter(Boolean);

  const openGates = findOpenUserFeedbackGates(dependencies);
  if (openGates.length === 0) {
    console.log(`Issue #${issueNumber}: no open ${USER_FEEDBACK_LABEL} dependency. Closure allowed.`);
    return { action: 'allowed', issueNumber, openGates: [] };
  }

  console.log(
    `Issue #${issueNumber}: closure blocked by open user-feedback gate(s): ` +
    openGates.map((gate) => `#${gate.number ?? gate.index}`).join(', '),
  );

  await apiRequest({
    apiUrl,
    token,
    method: 'PATCH',
    path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
    body: { state: 'open' },
  });

  await apiRequest({
    apiUrl,
    token,
    method: 'POST',
    path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
    body: { body: makeReopenComment(issueNumber, openGates) },
  });

  return { action: 'reopened', issueNumber, openGates };
}

async function main() {
  const eventPath = process.argv[2] || process.env.GITEA_EVENT_PATH;
  const apiUrl = process.env.GITEA_API_URL;
  const token = process.env.GITEA_TOKEN;
  const repository = process.env.GITEA_REPOSITORY;

  for (const [name, value] of Object.entries({
    GITEA_EVENT_PATH: eventPath,
    GITEA_API_URL: apiUrl,
    GITEA_TOKEN: token,
  })) {
    if (!value) throw new Error(`${name} is required.`);
  }

  const event = JSON.parse(await fs.readFile(eventPath, 'utf8'));
  const result = await enforceClosedIssue({ event, apiUrl, token, repository });
  console.log(`Closure guard result: ${result.action}.`);
}

const isDirectExecution = process.argv[1]
  && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(`User-feedback closure guard failed: ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
