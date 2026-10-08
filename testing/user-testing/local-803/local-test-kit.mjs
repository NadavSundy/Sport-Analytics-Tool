// AI-assisted preparation: Codex (GPT-6). No participant outcomes are generated.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import dotenv from 'dotenv';

const kit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(kit, '../../..');
const require = createRequire(import.meta.url);
const runtime = path.join(kit, 'runtime');
const url = 'postgresql://local803:local803@127.0.0.1:55483/sport_analytics_803';
const competitionName = 'LOCAL ONLY - Sprint 4 Disposable Cup';
const teams = ['S4 Local Lions', 'S4 Local Eagles'];
const command = process.argv[2] ?? 'start';
const client = new pg.Client({ connectionString: url });

if (command === 'accounts' || command === 'grant') {
  await client.connect();
  const marker = await client.query('SELECT name FROM competition WHERE name = $1', [
    competitionName,
  ]);
  if (!marker.rowCount) throw new Error('This is not the initialized local-803 database.');
  if (command === 'accounts') {
    console.table(
      (
        await client.query(
          'SELECT app_user_id, display_name, application_role FROM app_user ORDER BY app_user_id',
        )
      ).rows,
    );
  } else {
    const [id, role] = process.argv.slice(3);
    if (!/^\d+$/.test(id ?? '') || !['submitter', 'admin'].includes(role))
      throw new Error('Use grant <local account ID> submitter|admin');
    await client.query('BEGIN');
    const updated = await client.query(
      "UPDATE app_user SET application_role=$2, submitter_approval_state='approved' WHERE app_user_id=$1 RETURNING app_user_id",
      [id, role],
    );
    if (!updated.rowCount) throw new Error('Account not found: sign in to the local app first.');
    await client.query(
      'INSERT INTO submitter_competition_scope (app_user_id, competition_id) SELECT $1, competition_id FROM competition WHERE name=$2 ON CONFLICT DO NOTHING',
      [id, competitionName],
    );
    await client.query('COMMIT');
    console.log(`Local account ${id} assigned ${role}; scope is the disposable competition.`);
  }
  await client.end();
} else if (command === 'reset') {
  // The URL and database name are fixed to this disposable loopback cluster.
  const postgres = new EmbeddedPostgres({
    databaseDir: path.join(runtime, 'postgres'),
    user: 'local803',
    password: 'local803',
    port: 55483,
    persistent: true,
    onLog: () => {},
    onError: console.error,
  });
  await postgres.start();
  try {
    await client.connect();
    const marker = await client.query('SELECT name FROM competition WHERE name=$1', [
      competitionName,
    ]);
    if (!marker.rowCount)
      throw new Error('Refusing reset: disposable competition marker is absent.');
    await client.end();
    await postgres.dropDatabase('sport_analytics_803');
    console.log(
      'Only sport_analytics_803 was reset. Run start to recreate fixtures and regrant local roles.',
    );
  } finally {
    await postgres.stop();
  }
} else if (command === 'start') {
  await fs.mkdir(runtime, { recursive: true });
  const postgres = new EmbeddedPostgres({
    databaseDir: path.join(runtime, 'postgres'),
    user: 'local803',
    password: 'local803',
    port: 55483,
    persistent: true,
    onLog: () => {},
    onError: (message) => console.error(message),
  });
  const children = [];
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill();
    await postgres.stop();
    process.exit(0);
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    if (!(await fs.stat(path.join(runtime, 'postgres', 'PG_VERSION')).catch(() => null)))
      await postgres.initialise();
    await postgres.start();
    const admin = postgres.getPgClient();
    await admin.connect();
    if (
      !(await admin.query("SELECT 1 FROM pg_database WHERE datname='sport_analytics_803'")).rowCount
    )
      await postgres.createDatabase('sport_analytics_803');
    await admin.end();
    await new Promise((resolve, reject) => {
      const migration = spawn(
        process.execPath,
        [
          require.resolve('node-pg-migrate/bin/node-pg-migrate'),
          'up',
          '--database-url-var',
          'DATABASE_URL_TEST',
          '--migrations-dir',
          path.join(root, 'database/migrations'),
          '--ignore-pattern',
          'README.md',
          '--no-verbose',
        ],
        { cwd: root, env: { ...process.env, DATABASE_URL_TEST: url }, stdio: 'inherit' },
      );
      migration.on('error', reject);
      migration.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`Migration failed (${code})`)),
      );
    });
    await client.connect();
    await client.query('BEGIN');
    const competitionId = (
      await client.query(
        'INSERT INTO competition(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING competition_id',
        [competitionName],
      )
    ).rows[0].competition_id;
    const teamIds = [];
    for (const name of teams)
      teamIds.push(
        (
          await client.query(
            'INSERT INTO team(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING team_id',
            [name],
          )
        ).rows[0].team_id,
      );
    const people = [];
    for (const [i, name] of [
      'S4 Local Striker',
      'S4 Local Non-striker',
      'S4 Local Bowler',
      'S4 Local Fielder',
    ].entries()) {
      const id = (
        await client.query(
          'INSERT INTO person(source_ref,display_name) VALUES($1,$2) ON CONFLICT(source_ref) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING person_id',
          [`local803:person:${i}`, name],
        )
      ).rows[0].person_id;
      await client.query(
        'INSERT INTO person_alias(person_id,name) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [id, name],
      );
      people.push(id);
    }
    const fixtureIds = [];
    for (const [index, date] of ['2026-10-07', '2026-10-08'].entries()) {
      const fixtureId = (
        await client.query(
          `INSERT INTO fixture(source_ref,competition_id,season,match_type,team_type,gender,balls_per_over,scheduled_overs,start_date,end_date,outcome,source_version,source_revision)
        VALUES($1,$2,'2026','T20','club','male',6,20,$3,$3,'no result','local803',1)
        ON CONFLICT(source_ref) DO UPDATE SET source_ref=EXCLUDED.source_ref RETURNING fixture_id`,
          [`local803:fixture:${index}`, competitionId, date],
        )
      ).rows[0].fixture_id;
      fixtureIds.push(fixtureId);
      for (const [i, teamId] of teamIds.entries())
        await client.query(
          'INSERT INTO fixture_team(fixture_id,team_id,ordinal) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [fixtureId, teamId, i + 1],
        );
      for (const [i, personId] of people.entries())
        await client.query(
          'INSERT INTO fixture_squad(fixture_id,person_id,team_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [fixtureId, personId, teamIds[i < 2 ? 0 : 1]],
        );
      await client.query(
        'INSERT INTO innings(fixture_id,ordinal,batting_team_id) VALUES($1,0,$2) ON CONFLICT DO NOTHING',
        [fixtureId, teamIds[0]],
      );
    }
    await client.query('COMMIT');
    const source = JSON.parse(
      await fs.readFile(
        path.join(root, 'apps/frontend/public/season-upload-template.json'),
        'utf8',
      ),
    );
    function packageFor(index) {
      let data = structuredClone(source);
      data.packageId = `local803:package:${index}`;
      data.competition = { context: { name: competitionName } };
      data.fixtures[0].context.date = index === 0 ? '2026-10-07' : '2026-10-08';
      let text = JSON.stringify(data);
      for (const [from, to] of [
        ['Home team', teams[0]],
        ['Away team', teams[1]],
        ['Striker', 'S4 Local Striker'],
        ['Non-striker', 'S4 Local Non-striker'],
        ['Bowler', 'S4 Local Bowler'],
        ['Fielder', 'S4 Local Fielder'],
      ])
        text = text.replaceAll(`"${from}"`, `"${to}"`);
      data = JSON.parse(text);
      for (const [i, event] of data.fixtures[0].innings[0].events.entries())
        event.eventId = `local803:delivery:fixture-${index}-ball-${i + 1}`;
      data.fixtures[0].innings[0].events[0].runs = { offBat: 4, extras: 0, total: 4 };
      return data;
    }
    const valid = packageFor(0),
      corrected = packageFor(1),
      invalid = structuredClone(corrected);
    invalid.contractVersion = '803-invalid';
    const { seasonUploadPackageSchema } = require(
      path.join(root, 'packages/contracts/dist/index.js'),
    );
    for (const [name, data] of [
      ['01-valid.json', valid],
      ['02-invalid.json', invalid],
      ['03-corrected.json', corrected],
    ]) {
      const parsed = seasonUploadPackageSchema.safeParse(data);
      if (name !== '02-invalid.json' && !parsed.success)
        throw new Error(JSON.stringify(parsed.error.issues));
      if (
        name === '02-invalid.json' &&
        (parsed.success ||
          parsed.error.issues.length !== 1 ||
          parsed.error.issues[0].path.join('.') !== 'contractVersion')
      )
        throw new Error('Invalid package must have exactly one contractVersion error.');
      await fs.writeFile(path.join(kit, name), JSON.stringify(data, null, 2) + '\n');
    }
    const state = {
      competitionId,
      competitionName,
      fixtureIds,
      teams,
      people,
      databaseHost: '127.0.0.1',
      databasePort: 55483,
      dates: ['2026-10-07', '2026-10-08'],
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(kit, 'fixture-details.json'),
      JSON.stringify(state, null, 2) + '\n',
    );
    console.log('LOCAL FIXTURES READY:', JSON.stringify(state));
    await client.end();
    if (!process.argv.includes('--database-only')) {
      const backend = dotenv.parse(await fs.readFile(path.join(root, 'apps/backend/.env')));
      const frontend = dotenv.parse(await fs.readFile(path.join(root, 'apps/frontend/.env')));
      const common = {
        ...process.env,
        ...backend,
        DATABASE_URL: url,
        DATABASE_URL_TEST: url,
        DATABASE_SSL_MODE: 'disable',
        NODE_ENV: 'development',
        DEPLOYMENT_ENVIRONMENT: 'local',
        OBJECT_STORAGE_PROVIDER: 'filesystem',
        OBJECT_STORAGE_FILESYSTEM_ROOT: path.join(runtime, 'objects'),
      };
      const tsx = require.resolve('tsx/cli');
      children.push(
        spawn(process.execPath, [tsx, 'src/index.ts'], {
          cwd: path.join(root, 'apps/backend'),
          env: { ...common, PORT: '3083', CORS_ORIGINS: 'http://localhost:5183' },
          stdio: 'inherit',
        }),
      );
      children.push(
        spawn(process.execPath, [tsx, 'src/index.ts'], {
          cwd: path.join(root, 'apps/worker'),
          env: { ...common, WORKER_PORT: '3084', WORKER_TRANSPORT_PROVIDER: 'database' },
          stdio: 'inherit',
        }),
      );
      children.push(
        spawn(
          process.execPath,
          [
            path.join(root, 'node_modules/vite/bin/vite.js'),
            '--host',
            '127.0.0.1',
            '--port',
            '5183',
            '--strictPort',
          ],
          {
            cwd: path.join(root, 'apps/frontend'),
            env: { ...process.env, ...frontend, VITE_API_BASE_URL: 'http://localhost:3083/api/v1' },
            stdio: 'inherit',
          },
        ),
      );
      for (const child of children)
        child.on('exit', (code) => {
          if (!stopping)
            console.error(`App exited (${code}); stop the kit and check its error above.`);
        });
      console.log('Open http://localhost:5183; Ctrl+C stops this isolated kit.');
    }
    setInterval(() => {}, 60000);
  } catch (error) {
    await client.end().catch(() => {});
    for (const child of children) child.kill();
    await postgres.stop().catch(() => {});
    throw error;
  }
} else
  throw new Error(
    'Commands: start [--database-only], accounts, grant <ID> submitter|admin, reset (stop the kit first)',
  );
