import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Migrations must run on the deployed database, not only on the local one.
 *
 * Issue #843: the issue #815 migration defaulted a column to
 * `gen_random_bytes(32)`. The local embedded PostgreSQL installs pgcrypto into
 * `public`, so it resolved unqualified and every test passed. The deployed
 * Supabase database keeps pgcrypto in the `extensions` schema, which is not on
 * the migration search path, so the statement failed with
 * `function gen_random_bytes(integer) does not exist` (SQLSTATE 42883), the
 * migration rolled back, and every backend deploy was blocked.
 *
 * Schema-qualifying the call would fix the deployed database and break the local
 * one. The portable answer is to use core functions, so this asserts that no
 * migration depends on an extension at all. It is a static check on purpose: it
 * needs no database, so it costs nothing to run, and it covers every future
 * migration rather than the one line that failed.
 */

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const migrationsDirectory = path.join(repositoryRoot, 'database', 'migrations');

/**
 * Functions provided by an extension rather than by core PostgreSQL. Each one
 * resolves locally and fails on the deployed database.
 *
 * `encode`, `decode`, `md5`, `sha256`, `gen_random_uuid` and `uuid_send` are
 * deliberately absent: those are core, and they are what a migration should use.
 */
const EXTENSION_FUNCTIONS = {
  pgcrypto: [
    'gen_random_bytes',
    'gen_salt',
    'digest',
    'hmac',
    'crypt',
    'encrypt',
    'decrypt',
    'encrypt_iv',
    'decrypt_iv',
    'armor',
    'dearmor',
    'pgp_sym_encrypt',
    'pgp_sym_decrypt',
    'pgp_pub_encrypt',
    'pgp_pub_decrypt',
    'pgp_key_id',
  ],
  'uuid-ossp': [
    'uuid_generate_v1',
    'uuid_generate_v1mc',
    'uuid_generate_v3',
    'uuid_generate_v4',
    'uuid_generate_v5',
  ],
};

/**
 * Removes what is not executable SQL, so a function named in prose cannot fail
 * the check and a function hidden in prose cannot pass it.
 *
 * `CREATE EXTENSION` is removed rather than flagged: declaring an extension is
 * portable, and the baseline legitimately does it. Calling one of its functions
 * is what is not.
 */
function executableSql(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/CREATE\s+EXTENSION[^;]*;/gi, ' ')
    .replace(/'(?:[^']|'')*'/g, "''");
}

test('database migrations call no extension-provided function', async () => {
  const entries = (await readdir(migrationsDirectory)).filter((entry) => entry.endsWith('.sql'));
  assert.ok(entries.length > 0, 'expected migrations to check');

  const findings = [];

  for (const entry of entries.sort()) {
    const sql = await readFile(path.join(migrationsDirectory, entry), 'utf8');
    const statements = executableSql(sql);

    for (const [extension, functions] of Object.entries(EXTENSION_FUNCTIONS)) {
      for (const name of functions) {
        // The call shape, so `pgcrypto` in prose and a column named `digest` are
        // both left alone.
        const call = new RegExp(String.raw`\b${name}\s*\(`, 'i');
        if (!call.test(statements)) continue;

        const line = statements.split('\n').findIndex((text) => call.test(text)) + 1;
        findings.push(`${entry}:${line} calls ${name}() from ${extension}`);
      }
    }
  }

  assert.deepEqual(
    findings,
    [],
    `Migrations must not call extension functions, because the deployed database keeps them in a schema that is not on the migration search path (issue #843). Use core PostgreSQL instead: gen_random_uuid() for randomness, uuid_send(gen_random_uuid()) for random bytes, and hash in Node rather than in SQL.\n${findings.join('\n')}`,
  );
});

test('the natural-language query salt default uses core functions only', async () => {
  const migration = await readFile(
    path.join(migrationsDirectory, '20261001120000000_natural-language-query-limits.sql'),
    'utf8',
  );

  // Named explicitly because this is the statement issue #843 was raised for.
  assert.match(
    migration,
    /salt\s+bytea NOT NULL DEFAULT uuid_send\(gen_random_uuid\(\)\) \|\| uuid_send\(gen_random_uuid\(\)\)/,
  );
  // The call, not the name: the migration explains in a comment why
  // gen_random_bytes is not used, and that comment should stay.
  assert.doesNotMatch(migration, /gen_random_bytes\s*\(/);
});
