/**
 * Measure round-trip latency to the database, to distinguish connection setup
 * from per-query cost.
 */

import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(new URL('../certs/supabase-ca.crt', import.meta.url), 'utf8'),
  },
});

async function main(): Promise<void> {
  const connectStart = Date.now();
  await client.connect();
  console.log(`connect: ${Date.now() - connectStart} ms`);

  const samples: number[] = [];
  for (let i = 0; i < 20; i += 1) {
    const start = Date.now();
    await client.query('SELECT 1');
    samples.push(Date.now() - start);
  }

  samples.sort((a, b) => a - b);
  const total = samples.reduce((a, b) => a + b, 0);
  console.log(`queries: ${samples.length}`);
  console.log(`  min    : ${samples[0]} ms`);
  console.log(`  median : ${samples[Math.floor(samples.length / 2)]} ms`);
  console.log(`  max    : ${samples[samples.length - 1]} ms`);
  console.log(`  mean   : ${(total / samples.length).toFixed(1)} ms`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end();
  });
