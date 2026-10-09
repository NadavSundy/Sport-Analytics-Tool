// Issue #879: keep the README, Getting Started guides, documentation site and technology stack
// accurate against the repository they describe. Each test encodes one acceptance criterion so a
// later change that makes the onboarding documentation stale fails the normal test gate.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(read(path));

const PUBLIC_DOCS_URL = 'https://sports-analytics-tool.pages.dev';

const WORKSPACES = [
  'apps/frontend',
  'apps/backend',
  'apps/worker',
  'packages/contracts',
  'packages/batch-processing',
  'packages/object-storage',
];

const ONBOARDING_DOCS = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/README.md',
  'docs/index.md',
  'docs/getting-started.md',
  'docs/development/setup.md',
  'docs/development/technology-stack.md',
  'docs/environment.md',
  'docs/architecture/repository-structure.md',
  ...WORKSPACES.map((workspace) => `${workspace}/README.md`),
  'database/README.md',
  'tests/README.md',
  'infra/README.md',
  'scripts/README.md',
  'evidence/README.md',
];

// Blank fenced code but keep its line breaks so reported line numbers match the file.
const withoutFencedCode = (markdown) =>
  markdown.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ''));

/** Top-level MkDocs navigation sections with the page each one opens on. */
function navigationSections() {
  const lines = read('mkdocs.yml').split('\n');
  const start = lines.indexOf('nav:');
  const sections = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\S/.test(line)) break;
    const section = /^ {2}- ([^:]+):\s*(\S+)?\s*$/.exec(line);
    if (!section) continue;
    let page = section[2];
    if (!page) {
      const child = lines.slice(index + 1).find((next) => /^ {6}- [^:]+:\s*\S+\.md\s*$/.test(next));
      page = /:\s*(\S+\.md)/.exec(child)[1];
    }
    sections.push({ title: section[1].trim(), page });
  }
  return sections;
}

/** Relative Markdown links outside fenced code, resolved against the linking file. */
function relativeLinks(file) {
  return [...withoutFencedCode(read(file)).matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)]
    .filter(([, , target]) => !/^(https?:|mailto:|#)/.test(target))
    .map(([, text, target]) => ({
      text,
      target,
      resolved: normalize(join(dirname(file), target.split('#')[0])),
    }));
}

const trackedFiles = () =>
  execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);

const readmeOverview = () => read('README.md').split('## Repository structure')[0];

const repositoryStructureBlock = () => {
  const section = read('README.md').split('## Repository structure')[1];
  return /```text\n([\s\S]*?)```/.exec(section)[1];
};

test('README links the public documentation site before the repository detail', () => {
  const overview = readmeOverview();
  assert.match(
    overview,
    new RegExp(`\\]\\(${PUBLIC_DOCS_URL.replace(/\./g, '\\.')}/?\\)`),
    'the public documentation site home page is not linked in the README overview',
  );
});

test('MkDocs records the public documentation URL as its canonical site URL', () => {
  assert.match(read('mkdocs.yml'), new RegExp(`^site_url: ${PUBLIC_DOCS_URL}/$`, 'm'));
});

test('README overview reflects the shipped final product and keeps future work explicit', () => {
  const overview = readmeOverview();
  assert.match(overview, /natural-language/i, 'shipped natural-language querying is not mentioned');
  assert.match(overview, /asynchronous worker/i, 'the separately deployed worker is not mentioned');
  // The final requirements traceability relies on the README recording this as future work.
  assert.match(overview, /analyst-defined statistics[^.]*future work/i);
});

test('README repository structure lists every tracked top-level directory and workspace', () => {
  const block = repositoryStructureBlock();
  const topLevelDirectories = [
    ...new Set(
      trackedFiles()
        .filter((file) => file.includes('/'))
        .map((file) => file.split('/')[0])
        .filter((directory) => !directory.startsWith('.')),
    ),
  ];

  for (const directory of topLevelDirectories) {
    assert.match(
      block,
      new RegExp(`^${directory}[/\\s]`, 'm'),
      `${directory} is missing from the tree`,
    );
  }
  for (const workspace of WORKSPACES) {
    assert.match(
      block,
      new RegExp(`^${workspace}\\s`, 'm'),
      `${workspace} is missing from the tree`,
    );
  }
});

test('README repository structure entries are aligned into one description column', () => {
  const columns = repositoryStructureBlock()
    .split('\n')
    .filter(Boolean)
    .map((line) => /^\S+\s+/.exec(line)[0].length);
  assert.equal(new Set(columns).size, 1, 'README tree descriptions start in different columns');
});

test('README documentation paths link every top-level documentation-site section', () => {
  const paths = read('README.md').split('Documentation paths:')[1].split('\n\n')[1];
  const links = relativeLinks('README.md').filter(({ text }) => paths.includes(`[${text}]`));
  for (const { title, page } of navigationSections().filter(({ title }) => title !== 'Home')) {
    assert.ok(
      links.some(({ resolved }) => resolved === normalize(`docs/${page}`)),
      `README documentation paths do not link the "${title}" section`,
    );
  }
});

test('links to documentation-site sections use the live navigation labels', () => {
  const sections = navigationSections();
  for (const file of ['README.md', 'docs/index.md', 'docs/getting-started.md']) {
    for (const { text, resolved } of relativeLinks(file)) {
      if (!resolved.startsWith('docs/')) continue;
      const page = resolved.slice('docs/'.length);
      const section = sections.find((candidate) => candidate.page === page);
      if (!section || section.title === 'Home') continue;
      assert.equal(text, section.title, `${file} labels the "${section.title}" section "${text}"`);
    }
  }
});

test('the documentation README describes the live top-level navigation', () => {
  const architecture = read('docs/README.md')
    .split('## Information architecture')[1]
    .split('\n## ')[0];
  for (const { title } of navigationSections().filter(({ title }) => title !== 'Home')) {
    assert.ok(
      architecture.includes(title),
      `docs/README.md does not describe the "${title}" section`,
    );
  }
});

test('relative links in the onboarding documentation resolve', () => {
  for (const file of ONBOARDING_DOCS) {
    for (const { target, resolved } of relativeLinks(file)) {
      assert.ok(existsSync(resolved), `${file} links to missing ${target}`);
    }
  }
});

test('npm commands in the onboarding documentation exist in the package they run in', () => {
  const scriptsByPackage = new Map([[undefined, readJson('package.json').scripts]]);
  for (const workspace of WORKSPACES) {
    const manifest = readJson(`${workspace}/package.json`);
    scriptsByPackage.set(manifest.name, manifest.scripts ?? {});
  }

  for (const file of ONBOARDING_DOCS) {
    for (const line of read(file).split('\n')) {
      for (const [, script] of line.matchAll(/\bnpm(?:\.cmd)? run ([a-z0-9:_-]+)/gi)) {
        const workspace = /--workspace[= ](\S+)/.exec(line)?.[1];
        const scripts = scriptsByPackage.get(workspace);
        assert.ok(scripts, `${file} names unknown workspace ${workspace}`);
        assert.ok(scripts[script], `${file} documents missing script "npm run ${script}"`);
      }
    }
  }
});

test('every committed environment example variable is documented', () => {
  const documentation = read('docs/environment.md') + read('docs/deployment/azure-worker.md');
  for (const app of ['frontend', 'backend', 'worker']) {
    for (const [, name] of read(`apps/${app}/.env.example`).matchAll(
      /^#?\s?([A-Z][A-Z0-9_]+)=/gm,
    )) {
      assert.match(documentation, new RegExp(`\\b${name}\\b`), `${app} ${name} is undocumented`);
    }
  }
});

test('the quick start and canonical setup guide run every application they configure', () => {
  for (const file of ['README.md', 'docs/development/setup.md']) {
    const guide = read(file);
    for (const app of ['backend', 'frontend', 'worker']) {
      assert.ok(guide.includes(`npm run dev:${app}`), `${file} does not start the ${app}`);
      assert.ok(
        guide.includes(`Copy-Item apps/${app}/.env.example apps/${app}/.env`) &&
          guide.includes(`cp apps/${app}/.env.example apps/${app}/.env`),
        `${file} does not create the ${app} environment file on every shell`,
      );
    }
  }
});

test('the quick start does not require Azure resources for the local worker', () => {
  const quickStart = read('README.md').split('### 3. Run the applications')[1].split('\n### ')[0];
  assert.doesNotMatch(quickStart, /Service Bus, Blob and Azure/);
  assert.match(quickStart, /WORKER_TRANSPORT_PROVIDER=database/);
});

test('the setup guide indexes a getting-started README for every workspace', () => {
  const setup = read('docs/development/setup.md');
  for (const workspace of WORKSPACES) {
    assert.ok(
      setup.includes(`| \`${workspace}/\``),
      `setup guide component table omits ${workspace}`,
    );
  }
});

test('the setup guide documents the repository quality and local-CI tooling', () => {
  const setup = read('docs/development/setup.md');
  for (const command of [
    'npm run hygiene',
    'npm run check',
    'npm run ci:local',
    'npm run hooks:install',
  ]) {
    assert.ok(setup.includes(command), `setup guide does not document ${command}`);
  }
  assert.ok(setup.includes('](local-ci.md)'), 'setup guide does not link the Local CI reference');
});

test('the technology stack records every direct dependency with its declared range', () => {
  const stack = read('docs/development/technology-stack.md');
  const section = (heading) => stack.split(`\n## ${heading}\n`)[1].split('\n## ')[0];
  const runtimeSections = {
    'apps/frontend': 'Frontend',
    'apps/backend': 'Backend API',
    'apps/worker': 'Asynchronous worker',
    'packages/contracts': 'Shared contracts',
    'packages/batch-processing': 'Shared server packages',
    'packages/object-storage': 'Shared server packages',
  };
  // Display names used in the tables for packages whose npm name is not written verbatim.
  const aliases = {
    'react-dom': 'React DOM',
    'react-router-dom': 'React Router DOM',
    'swagger-ui-react': 'Swagger UI React',
    three: 'Three.js',
    'pino-http': 'Pino HTTP',
    '@testing-library/react': 'React Testing Library',
    '@redocly/cli': 'Redocly CLI',
  };
  const recorded = (text, name, range) =>
    text
      .split('\n')
      .some(
        (line) =>
          (line.toLowerCase().includes(name.toLowerCase()) ||
            (aliases[name] && line.includes(aliases[name])) ||
            (name.startsWith('@fontsource/') && line.includes('Fontsource'))) &&
          line.includes(range),
      );

  for (const workspace of ['.', ...WORKSPACES]) {
    const manifest = readJson(`${workspace}/package.json`);
    for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
      const text = section(runtimeSections[workspace]);
      assert.ok(
        recorded(text, name, range),
        `${workspace} runtime ${name} ${range} is not recorded`,
      );
    }
    for (const [name, range] of Object.entries(manifest.devDependencies ?? {})) {
      assert.ok(recorded(stack, name, range), `${workspace} dev ${name} ${range} is not recorded`);
    }
  }
});

test('Markdown tables in the onboarding documentation have a consistent column count', () => {
  const cells = (row) => row.replace(/\\\|/g, '').split('|').length;
  for (const file of ONBOARDING_DOCS) {
    const lines = withoutFencedCode(read(file)).split('\n');
    for (let index = 1; index < lines.length; index += 1) {
      if (!/^\|\s*:?-{3,}/.test(lines[index])) continue;
      const expected = cells(lines[index - 1]);
      for (let row = index + 1; row < lines.length && lines[row].startsWith('|'); row += 1) {
        assert.equal(
          cells(lines[row]),
          expected,
          `${file} table row ${row + 1} has a broken column`,
        );
      }
    }
  }
});

test('the repository root contains no accidental empty files', () => {
  for (const entry of readdirSync('.')) {
    if (statSync(entry).isFile()) {
      assert.ok(statSync(entry).size > 0, `${entry} is an empty root file`);
    }
  }
});

test('stale root setup material is removed or clearly marked historical', () => {
  assert.ok(!existsSync('FILE_TREE.txt'), 'the August file-tree snapshot is still published');
  const guide = read('MIGRATION_GUIDE.md').split('\n').slice(0, 8).join('\n');
  assert.match(guide, /historical/i, 'MIGRATION_GUIDE.md is not marked historical');
  assert.ok(guide.includes('](README.md'), 'MIGRATION_GUIDE.md does not point to current setup');
});

test('repository scripts do not target the retired App Service backend host', () => {
  assert.doesNotMatch(read('package.json'), /azurewebsites\.net/);
});

test('required AI attribution is retained in the reviewed documentation', () => {
  const readme = read('README.md');
  assert.match(readme, /^## AI usage$/m);
  assert.ok(
    readme.includes('](evidence/ai/registers/)'),
    'README no longer links the AI registers',
  );
  assert.ok(readme.includes('ChatGPT-Web[GPT-5.6 Sol]'));
  for (const file of [
    'docs/README.md',
    'docs/index.md',
    'docs/getting-started.md',
    'docs/development/setup.md',
    'docs/development/technology-stack.md',
    'docs/environment.md',
    'docs/architecture/repository-structure.md',
  ]) {
    assert.match(read(file), /^## AI Declaration$/m, `${file} lost its AI declaration`);
  }
});
