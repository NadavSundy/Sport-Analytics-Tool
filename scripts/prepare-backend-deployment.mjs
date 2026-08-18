import { spawnSync } from 'node:child_process';
import { access, cp, lstat, mkdir, rm, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deploymentRoot = path.join(repositoryRoot, '.deployment');
const artifactRoot = path.join(deploymentRoot, 'backend');

const artifactFiles = [
  'package.json',
  'package-lock.json',
  'apps/backend/package.json',
  'apps/backend/certs',
  'apps/backend/dist',
  'packages/contracts/package.json',
  'packages/contracts/dist',
];

async function requireBuildOutput(relativePath) {
  try {
    await access(path.join(repositoryRoot, relativePath));
  } catch {
    throw new Error(`Required build output is missing: ${relativePath}`);
  }
}

async function copyArtifactFile(relativePath) {
  const source = path.join(repositoryRoot, relativePath);
  const destination = path.join(artifactRoot, relativePath);

  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}

async function replaceWorkspaceLinkWithDirectory(workspaceName, sourceRelativePath) {
  const workspacePath = path.join(artifactRoot, 'node_modules', '@sport-analytics', workspaceName);

  try {
    await unlink(workspacePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  if (sourceRelativePath) {
    await cp(path.join(artifactRoot, sourceRelativePath), workspacePath, {
      recursive: true,
      dereference: true,
    });
  }
}

await requireBuildOutput('apps/backend/dist/index.js');
await requireBuildOutput('packages/contracts/dist/index.js');

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });

for (const relativePath of artifactFiles) {
  await copyArtifactFile(relativePath);
}

const installArguments = [
  'ci',
  '--omit=dev',
  '--ignore-scripts',
  '--workspace=@sport-analytics/backend',
  '--workspace=@sport-analytics/contracts',
];
const npmCommand = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const npmArguments =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm.cmd', ...installArguments]
    : installArguments;
const install = spawnSync(npmCommand, npmArguments, {
  cwd: artifactRoot,
  env: process.env,
  stdio: 'inherit',
});

if (install.error) {
  throw install.error;
}

if (install.status !== 0) {
  throw new Error(`Production dependency installation failed with exit code ${install.status}.`);
}

await replaceWorkspaceLinkWithDirectory('contracts', 'packages/contracts');
await replaceWorkspaceLinkWithDirectory('backend');

const installedContracts = path.join(artifactRoot, 'node_modules', '@sport-analytics', 'contracts');
const installedContractsStats = await lstat(installedContracts);

if (!installedContractsStats.isDirectory() || installedContractsStats.isSymbolicLink()) {
  throw new Error('The deployment artifact does not contain a physical contracts package.');
}

await access(path.join(installedContracts, 'dist', 'index.js'));
await access(path.join(artifactRoot, 'apps', 'backend', 'certs', 'supabase-ca.crt'));
console.log(
  `Backend deployment artifact prepared at ${path.relative(repositoryRoot, artifactRoot)}.`,
);
