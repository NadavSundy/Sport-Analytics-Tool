import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultInputDirectory = 'testing/user-feedback/input';
const safeJsonFilename = /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/i;

async function findJsonFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : undefined;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      throw new Error('User-testing feedback source directory does not exist.');
    }
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJsonFiles(path)));
    } else if (entry.isFile() && safeJsonFilename.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

function normaliseJson(json) {
  try {
    return `${JSON.stringify(JSON.parse(json), null, 2)}\n`;
  } catch {
    throw new Error('A user-testing feedback file contains invalid JSON.');
  }
}

/**
 * Copies recursively discovered JSON files from a local OneDrive-synchronised directory into the
 * evidence pipeline input directory. Schema validation remains the ingestion module's responsibility.
 *
 * @param {string} sourceDirectory
 * @param {string} [destinationDirectory]
 */
export async function retrieveUserTestingFeedback(
  sourceDirectory,
  destinationDirectory = defaultInputDirectory,
) {
  const source = resolve(sourceDirectory);
  const destination = resolve(destinationDirectory);
  const sourceFiles = await findJsonFiles(source);

  await mkdir(destination, { recursive: true });
  const copiedNames = new Set();

  for (const sourceFile of sourceFiles) {
    const filename = basename(sourceFile);
    if (copiedNames.has(filename)) {
      throw new Error('User-testing feedback source contains duplicate JSON filenames.');
    }
    copiedNames.add(filename);
    await writeFile(
      resolve(destination, filename),
      normaliseJson(await readFile(sourceFile, 'utf8')),
      'utf8',
    );
  }

  return sourceFiles.length;
}

async function main() {
  const sourceDirectory = process.argv[2];
  if (!sourceDirectory) {
    throw new Error('Supply a local directory containing user-testing feedback JSON files.');
  }

  const count = await retrieveUserTestingFeedback(sourceDirectory);
  console.log(`Retrieved ${count} user-testing feedback JSON file(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`User-testing feedback retrieval failed: ${error.message}`);
    process.exitCode = 1;
  });
}
