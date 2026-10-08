// Issue #894: keep the final design documentation aligned with the implemented product and keep
// superseded design artefacts preserved, labelled and separate from the final design.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const legacyDirectory = 'evidence/design/legacy-wireframes';
const legacyWireframes = [
  'home-desktop.svg',
  'home-mobile.svg',
  'fixtures-desktop.svg',
  'fixtures-mobile.svg',
  'fixture-detail-desktop.svg',
  'fixture-detail-mobile.svg',
  'signin-desktop.svg',
  'signin-mobile.svg',
  'submission-desktop.svg',
  'submission-mobile.svg',
  'admin-users-desktop.svg',
  'admin-users-mobile.svg',
];

test('superseded wireframes are preserved in the historical evidence location', () => {
  for (const file of legacyWireframes) {
    assert.ok(existsSync(`${legacyDirectory}/${file}`), `missing archived ${file}`);
  }
});

test('superseded wireframes no longer sit beside the final design assets', () => {
  for (const file of legacyWireframes) {
    assert.ok(
      !existsSync(`docs/design/assets/wireframes/${file}`),
      `${file} is still published as a current design asset`,
    );
  }
});

test('every archived wireframe is visibly labelled historical and superseded', () => {
  for (const file of legacyWireframes) {
    const svg = read(`${legacyDirectory}/${file}`);
    assert.match(svg, /HISTORICAL/, `${file} lacks a historical label`);
    assert.match(svg, /SUPERSEDED/, `${file} lacks a superseded label`);
    assert.match(svg, /#894/, `${file} does not point to the archiving issue`);
  }
});

test('legacy archive README records purpose, phase and final status for every artefact', () => {
  const readme = read(`${legacyDirectory}/README.md`);

  assert.match(readme, /historical/i);
  assert.match(readme, /not the final product design/i);
  assert.match(
    readme,
    /\|\s*Artefact\s*\|\s*Original purpose\s*\|\s*Approximate phase\s*\|\s*Final status\s*\|/,
  );
  for (const file of legacyWireframes) {
    assert.ok(readme.includes(file), `README does not record ${file}`);
  }
  // The original authoring commit and issue keep the archive traceable to its source.
  assert.match(readme, /88c7b5ee/);
  assert.match(readme, /#56\b/);
  assert.match(readme, /Superseded/);
  // The README must point a reader to the current design, not leave them in the archive.
  assert.match(readme, /docs\/design\/information-architecture-and-wireframes\.md/);
});

test('the evidence index exposes the design archive', () => {
  assert.match(read('evidence/README.md'), /design\/legacy-wireframes/);
});

test('archive contains only the documented artefacts and its README', () => {
  const files = readdirSync(legacyDirectory).sort();
  assert.deepEqual(files, [...legacyWireframes, 'README.md'].sort());
});

// ---------------------------------------------------------------------------------------------
// Final information architecture must match the implemented routes, navigation and role areas.
// These assertions read the frontend source, so the document fails as soon as it drifts.
// ---------------------------------------------------------------------------------------------

const iaPath = 'docs/design/information-architecture-and-wireframes.md';
const finalWireframeDirectory = 'docs/design/assets/final-wireframes';
const app = read('apps/frontend/src/App.tsx');
const shell = read('apps/frontend/src/components/PublicShell.tsx');
const authPages = read('apps/frontend/src/features/auth/AuthPages.tsx');
const administration = read('apps/frontend/src/features/admin/AdministrationPage.tsx');
const browsePages = read('apps/frontend/src/pages/PublicBrowsePages.tsx');

const normaliseRoute = (route) => route.replace(/:[A-Za-z]+/g, ':param').replace(/(.)\/$/, '$1');
// A concrete documented path such as /account/overview satisfies the pattern /account/:section.
const matchesRoute = (pattern, route) =>
  new RegExp(`^${normaliseRoute(pattern).replaceAll(':param', '[^/]+')}$`).test(route);
const implementedRoutes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map(([, route]) => route)
  .filter((route) => route !== '*');

// The final design is everything above the design-evolution section; history lives below it.
const finalDesign = () => read(iaPath).split(/^## \d*\.?\s*Design evolution/m)[0];

test('the final IA documents every implemented frontend route', () => {
  const documented = new Set(
    [...read(iaPath).matchAll(/(\/[a-z][a-z0-9-]*(?:\/[a-z:][A-Za-z0-9:-]*)*)/g)].map(([route]) =>
      normaliseRoute(route),
    ),
  );
  documented.add('/');
  assert.ok(implementedRoutes.length > 30, 'route extraction failed');
  for (const route of implementedRoutes) {
    assert.ok(documented.has(normaliseRoute(route)), `route ${route} is not documented`);
  }
});

test('the final site map documents no route that the application does not implement', () => {
  const implemented = new Set(implementedRoutes.map(normaliseRoute));
  const siteMap = finalDesign().match(/```mermaid\n([\s\S]*?)```/);
  assert.ok(siteMap, 'site map diagram missing');
  const mapped = [...siteMap[1].matchAll(/"(\/[^"\s—]*|\*)/g)].map(([, route]) =>
    normaliseRoute(route),
  );
  assert.ok(mapped.length > 30, 'site map extraction failed');
  for (const route of mapped) {
    assert.ok(
      implemented.has(route) ||
        route === '*' ||
        implementedRoutes.some((pattern) => matchesRoute(pattern, route)),
      `site map shows unimplemented ${route}`,
    );
  }
});

test('the final IA uses the implemented header, role menu and administration labels', () => {
  const design = finalDesign();
  const shellLabels = [...shell.matchAll(/label: '([^']+)'/g)].map(([, label]) => label);
  for (const label of [
    ...shellLabels,
    'Explore Data',
    'Pinned',
    'Downloads',
    'API',
    'Manage Submission',
    'Administration',
    'Manage account',
    'Sign in',
  ]) {
    assert.ok(design.includes(label), `navigation label "${label}" is missing`);
  }
  for (const [, heading] of administration.matchAll(/<h2>([^<]+)<\/h2>/g)) {
    const label = heading.replace('&amp;', '&');
    if (label === 'Administrator access required') continue;
    assert.ok(design.includes(label), `administration area "${label}" is missing`);
  }
});

test('the final IA uses the implemented account and fixture section names', () => {
  const design = finalDesign();
  const accountNavigation = authPages.match(/label="Account sections"[\s\S]*?\]\}/);
  assert.ok(accountNavigation, 'account navigation extraction failed');
  for (const [, label] of accountNavigation[0].matchAll(/label: '([^']+)'/g)) {
    assert.ok(design.includes(label), `account section "${label}" is missing`);
  }
  const fixtureNavigation = browsePages.match(/label="Fixture sections"[\s\S]*?\]\}/);
  assert.ok(fixtureNavigation, 'fixture navigation extraction failed');
  for (const [, label] of fixtureNavigation[0].matchAll(/label: '([^']+)'/g)) {
    assert.ok(design.includes(label), `fixture section "${label}" is missing`);
  }
});

test('the final IA does not present planned or superseded design as implemented', () => {
  const design = finalDesign();
  for (const stale of [/\bSquads\b/, /\bTimeline\b/, /Open questions/i]) {
    assert.doesNotMatch(design, stale, `final design still contains ${stale}`);
  }
  assert.doesNotMatch(design, /assets\/wireframes\//, 'final design embeds archived wireframes');
  assert.doesNotMatch(design, /should not begin until this document has been\s+reviewed/i);
  assert.match(design, /no separate reviewer role/i);
});

test('the final IA covers every major role-specific and API-facing area', () => {
  const design = finalDesign();
  for (const area of [
    /Public visitor/,
    /Signed-in viewer/,
    /Approved submitter/,
    /Administrator/,
    /API consumer/,
    /API Explorer/,
    /Ask a stats question/,
    /Compare players/,
    /back[- ]catalogue/i,
    /season/i,
    /Review/,
    /Dataset releases?/,
    /responsive|mobile/i,
  ]) {
    assert.match(design, area);
  }
});

const finalWireframes = [
  'final-home-desktop.svg',
  'final-fixture-statistics-desktop.svg',
  'final-player-comparison-desktop.svg',
  'final-api-explorer-desktop.svg',
  'final-account-desktop.svg',
  'final-submission-desktop.svg',
  'final-review-workspace-desktop.svg',
  'final-administration-desktop.svg',
  'final-navigation-mobile.svg',
  'final-fixture-statistics-mobile.svg',
];

test('final wireframes exist, are accessible images and are embedded in the final IA', () => {
  const design = finalDesign();
  for (const file of finalWireframes) {
    const path = `${finalWireframeDirectory}/${file}`;
    assert.ok(existsSync(path), `missing final wireframe ${file}`);
    const svg = read(path);
    assert.match(svg, /<svg[^>]*role="img"/, `${file} lacks role="img"`);
    assert.match(svg, /<title[^>]*>[^<]+<\/title>/, `${file} lacks a title`);
    assert.doesNotMatch(svg, /HISTORICAL|SUPERSEDED/, `${file} is labelled historical`);
    assert.ok(
      design.includes(`](assets/final-wireframes/${file})`),
      `${file} is not embedded in the final IA`,
    );
  }
  for (const [, file] of design.matchAll(/\]\(assets\/final-wireframes\/([^)]+)\)/g)) {
    assert.ok(finalWireframes.includes(file), `unexpected embedded wireframe ${file}`);
  }
});

test('final wireframe labels match implemented navigation rather than legacy names', () => {
  const navigation = read(`${finalWireframeDirectory}/final-navigation-mobile.svg`);
  for (const label of [
    'Fixtures',
    'Competitions',
    'Seasons',
    'Teams',
    'Players',
    'Downloads',
    'API',
  ]) {
    assert.ok(navigation.includes(`>${label}<`), `mobile navigation wireframe lacks ${label}`);
  }
  const statistics = read(`${finalWireframeDirectory}/final-fixture-statistics-desktop.svg`);
  for (const label of ['Overview', 'Statistics', 'Players']) {
    assert.ok(statistics.includes(`>${label}<`), `fixture wireframe lacks ${label}`);
  }
  for (const file of finalWireframes) {
    const svg = read(`${finalWireframeDirectory}/${file}`);
    assert.doesNotMatch(
      svg,
      />(Squads|Timeline|Competitors|Participants)</,
      `${file} uses a legacy label`,
    );
  }
});

// ---------------------------------------------------------------------------------------------
// Design evolution: concise, traceable, linked to evidence and honest about retests.
// ---------------------------------------------------------------------------------------------

const evolutionSection = () => {
  const match = read(iaPath).match(
    /^## 8\. Design evolution and traceability\n([\s\S]*?)(?=^## )/m,
  );
  assert.ok(match, 'missing "## 8. Design evolution and traceability" section');
  return match[1];
};

test('design evolution compares early design with the final implementation per area', () => {
  const section = evolutionSection();
  assert.match(
    section,
    /\|\s*Area\s*\|\s*Early design \(Sprint 1\)\s*\|\s*Final implementation\s*\|\s*Driver and evidence\s*\|/,
  );
  for (const area of [
    'Navigation',
    'Authentication and roles',
    'Submission',
    'Batch and back-catalogue ingestion',
    'Review and administration',
    'Statistics and analytics',
    'API Explorer',
    'Responsive and accessibility',
  ]) {
    const row = section.split('\n').find((line) => line.startsWith(`| ${area}`));
    assert.ok(row, `evolution table lacks a ${area} row`);
    assert.match(row, /#\d+/, `${area} row has no issue reference`);
  }
});

test('design evolution links stakeholder, user-testing and decision evidence', () => {
  const section = evolutionSection();
  assert.match(section, /user-testing-sprint-2-summary\.md/);
  assert.match(section, /user-testing-sprint-3-summary\.md/);
  assert.match(section, /user-testing-sprint-4-summary\.md/);
  assert.match(section, /stakeholder-and-user-feedback-review\.md/);
  assert.match(section, /ADR-007-public-information-architecture\.md/);
  assert.match(section, /evidence\/design\/legacy-wireframes\/README\.md/);
  for (const finding of ['#499', '#713', '#714', '#716', '#743']) {
    assert.ok(section.includes(finding), `feedback-driven change ${finding} is not traced`);
  }
});

test('design evolution does not claim retests or fixes the evidence does not record', () => {
  const section = evolutionSection();
  assert.match(section, /P15/);
  assert.match(section, /not (?:yet )?(?:established|retested)|no (?:human|participant) retest/i);
});

test('design evolution stays concise', () => {
  const lines = evolutionSection().trim().split('\n');
  assert.ok(lines.length <= 45, `design evolution is ${lines.length} lines; keep it under 45`);
});

test('the IA keeps attribution for the design-evolution work', () => {
  const declaration = read(iaPath).split(/^## AI Declaration/m)[1];
  assert.ok(declaration, 'AI declaration missing');
  for (const issue of [
    '#56',
    '#266',
    '#314',
    '#361',
    '#435',
    '#437',
    '#458',
    '#499',
    '#539',
    '#571',
    '#581',
    '#775',
    '#776',
    '#783',
    '#894',
  ]) {
    assert.ok(declaration.includes(issue), `AI declaration lost ${issue}`);
  }
  assert.match(declaration, /#894[\s\S]*design-evolution/);
});

// ---------------------------------------------------------------------------------------------
// Component baseline and brand guidelines describe the final implementation, not a plan.
// ---------------------------------------------------------------------------------------------

const exportedComponents = (directory) =>
  readdirSync(directory)
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
    .flatMap((file) =>
      [...read(`${directory}/${file}`).matchAll(/^export (?:function|const) ([A-Z]\w+)/gm)].map(
        ([, name]) => name,
      ),
    );

test('component baseline documents every shared component the final UI uses', () => {
  const baseline = read('docs/design/frontend-component-baseline.md');
  const shared = [
    ...exportedComponents('apps/frontend/src/components'),
    ...exportedComponents('apps/frontend/src/features/browse'),
  ];
  assert.ok(shared.length > 15, 'component extraction failed');
  for (const component of shared) {
    assert.ok(baseline.includes(`\`${component}\``), `baseline does not document ${component}`);
  }
});

test('component baseline is presented as the final convention set', () => {
  const baseline = read('docs/design/frontend-component-baseline.md');
  assert.doesNotMatch(baseline, /without prescribing a permanent page design/);
  assert.match(baseline, /final/i);
  assert.match(baseline, /information-architecture-and-wireframes\.md/);
  assert.match(baseline, /#894/);
});

test('brand guidelines record which guidance the final product implements', () => {
  const brand = read('docs/design/brand-guidelines.md');
  const status = brand.match(/^## Implementation status at Milestone 4\n([\s\S]*?)(?=^## )/m);
  assert.ok(status, 'missing "## Implementation status at Milestone 4" section');
  const rows = status[1];
  assert.match(rows, /\|\s*Guidance\s*\|\s*Final status\s*\|\s*Where implemented or why not\s*\|/);
  for (const [guidance, state] of [
    ['Themes', /Implemented/],
    ['Typography', /Implemented/],
    ['Navigation', /top navigation/i],
    ['Signature animations', /Not implemented/],
    ['Cricket data visualisation', /Not implemented|Partly implemented/],
    ['Third-party sign-in button', /Exception/],
  ]) {
    const row = rows.split('\n').find((line) => line.startsWith(`| ${guidance}`));
    assert.ok(row, `implementation status lacks ${guidance}`);
    assert.match(row, state, `${guidance} status is wrong`);
  }
  assert.match(rows, /information-architecture-and-wireframes\.md/);
  assert.match(rows, /frontend-component-baseline\.md/);
});

// ---------------------------------------------------------------------------------------------
// Documentation navigation separates the final design from historical reference material.
// ---------------------------------------------------------------------------------------------

test('MkDocs exposes the final design in the product section, not under history', () => {
  const nav = read('mkdocs.yml');
  const product = nav.match(/^  - Product & API:\n([\s\S]*?)(?=^  - )/m);
  assert.ok(product, 'Product & API nav section missing');
  assert.match(
    product[1],
    /Final Design & Wireframes: design\/information-architecture-and-wireframes\.md/,
  );
  const history = nav.match(/^      - Historical & Reference:\n([\s\S]*?)(?=^  - )/m);
  assert.ok(history, 'Historical & Reference nav section missing');
  assert.doesNotMatch(history[1], /information-architecture-and-wireframes\.md/);
  assert.equal(
    nav.match(/information-architecture-and-wireframes\.md/g).length,
    1,
    'the final design page should appear once in the navigation',
  );
});

test('the product overview points readers to the final design', () => {
  assert.match(
    read('docs/product-and-api.md'),
    /\]\(design\/information-architecture-and-wireframes\.md\)/,
  );
});

test('the historical reference index separates final design from the legacy archive', () => {
  const reference = read('docs/process/reference-and-history.md');
  const design = reference.match(/^## Design and UX reference\n([\s\S]*?)(?=^## )/m);
  assert.ok(design, 'design reference section missing');
  assert.match(design[1], /evidence\/design\/legacy-wireframes\/README\.md/);
  assert.match(design[1], /historical|superseded/i);
  assert.match(design[1], /final design/i);
});
