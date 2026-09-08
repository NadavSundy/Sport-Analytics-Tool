import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ingestFeedbackDirectory } from './user-feedback-ingestion.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultOutputDirectory = resolve(repositoryRoot, 'docs/user-testing/evidence/generated');

function markdownText(value) {
  return String(value).replaceAll('\r\n', '\n').replaceAll('\n', '<br>');
}

function traceabilityValue(value) {
  return value ? `\`${value}\`` : 'Not recorded';
}

export function renderUserTestingEvidence(response) {
  return `# Sprint 2 User Testing Evidence

## Tested Workflow

- **Participant ID:** ${response.participant}
- **Workflow:** ${markdownText(response.workflow)}

## Tasks Attempted

${markdownText(response.tasksAttempted)}

## Completion Status

${markdownText(response.completionStatus)}

## Observations

${markdownText(response.observations)}

## Participant Comments

No separately captured participant comments were included in the anonymised Power Automate response.

## Positive Findings

${markdownText(response.positiveFindings)}

## Usability Problems

${markdownText(response.problems)}

## Severity Classification

${response.severity}

## Suggested Improvements

${markdownText(response.suggestions)}

## Traceability

- **Gitea issue:** ${traceabilityValue(response.traceability.giteaIssue)}
- **Implementation commit:** ${traceabilityValue(response.traceability.implementationCommit)}
- **Retesting evidence:** ${traceabilityValue(response.traceability.retestingEvidence)}
`;
}

function outputFilename(response, index) {
  return `${response.participant}-${String(index + 1).padStart(3, '0')}.md`;
}

export async function generateUserTestingEvidence(
  inputDirectory,
  outputDirectory = defaultOutputDirectory,
) {
  const responses = await ingestFeedbackDirectory(inputDirectory);
  await mkdir(outputDirectory, { recursive: true });

  return Promise.all(
    responses.map(async (response, index) => {
      const outputPath = resolve(outputDirectory, outputFilename(response, index));
      await writeFile(outputPath, renderUserTestingEvidence(response), 'utf8');
      return outputPath;
    }),
  );
}

async function main() {
  const inputDirectory = process.argv[2];
  const outputDirectory = process.argv[3] ? resolve(process.argv[3]) : defaultOutputDirectory;

  if (!inputDirectory) {
    throw new Error(
      'Supply the local OneDrive-synchronised response directory; no OneDrive credentials are read.',
    );
  }

  const outputPaths = await generateUserTestingEvidence(resolve(inputDirectory), outputDirectory);
  console.log(
    `Generated ${outputPaths.length} user-testing evidence file(s) in ${outputDirectory}.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`User-testing evidence generation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
