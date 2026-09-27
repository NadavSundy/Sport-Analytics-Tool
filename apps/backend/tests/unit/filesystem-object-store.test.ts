import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { afterEach, describe, expect, test } from 'vitest';

import { FilesystemObjectStore } from '../../src/modules/object-storage/filesystem-object-store';

const temporaryRoots: string[] = [];

async function createStore() {
  const root = await mkdtemp(path.join(tmpdir(), 'sport-object-storage-'));
  temporaryRoots.push(root);
  return { root, store: new FilesystemObjectStore(root) };
}

async function content(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('filesystem object store', () => {
  test('streams an exact-byte write/read round trip without exposing a URL', async () => {
    const { store } = await createStore();
    const expected = Buffer.concat([
      Buffer.from('{"events":['),
      Buffer.from([0, 1, 2, 127, 128, 255]),
      Buffer.from(']}'),
    ]);

    const stored = await store.write(
      'dataset-releases/exact.json',
      Readable.from([expected.subarray(0, 5), expected.subarray(5, 13), expected.subarray(13)]),
    );
    const actual = await content(await store.read('dataset-releases/exact.json'));

    expect(stored).toEqual({ versionId: null });
    expect(actual).toEqual(expected);
    expect(createHash('sha256').update(actual).digest('hex')).toBe(
      createHash('sha256').update(expected).digest('hex'),
    );
  });

  test('deletes stored objects and treats deletion of a missing key as complete', async () => {
    const { store } = await createStore();
    await store.write('dataset-releases/delete.json', Readable.from('content'));

    await store.delete('dataset-releases/delete.json');
    await store.delete('dataset-releases/delete.json');

    await expect(store.read('dataset-releases/delete.json')).rejects.toThrow(
      'The filesystem object is unavailable.',
    );
  });

  test('cleans temporary bytes when a streamed write is interrupted', async () => {
    const { root, store } = await createStore();
    const interrupted = new Readable({
      read() {
        this.push(Buffer.alloc(64 * 1024, 1));
        this.destroy(new Error('source interrupted'));
      },
    });

    await expect(store.write('dataset-releases/interrupted.json', interrupted)).rejects.toThrow(
      'The filesystem object write failed.',
    );

    const entries = await readdir(root, { recursive: true });
    expect(entries.filter((entry) => entry.endsWith('.json') || entry.endsWith('.tmp'))).toEqual(
      [],
    );
  });

  test('rejects traversal, absolute paths, backslashes and invalid path segments', async () => {
    const { root, store } = await createStore();
    const invalidKeys = [
      '../outside.json',
      'dataset-releases/../../outside.json',
      path.resolve(root, '..', 'outside.json'),
      'dataset-releases\\outside.json',
      'dataset-releases//outside.json',
      'dataset-releases/:outside.json',
    ];

    for (const key of invalidKeys) {
      await expect(store.write(key, Readable.from('unsafe'))).rejects.toThrow(
        'The object storage key is invalid.',
      );
    }

    expect(await readdir(root)).toEqual([]);
  });

  test('does not replace an already published object', async () => {
    const { store } = await createStore();
    await store.write('dataset-releases/immutable.json', Readable.from('first'));

    await expect(
      store.write('dataset-releases/immutable.json', Readable.from('second')),
    ).rejects.toThrow('The filesystem object write failed.');

    expect(await content(await store.read('dataset-releases/immutable.json'))).toEqual(
      Buffer.from('first'),
    );
  });
});
