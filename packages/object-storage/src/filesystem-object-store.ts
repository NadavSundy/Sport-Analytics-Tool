import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { link, mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { ObjectStorageError, type ObjectStore } from './object-store';

const STORAGE_KEY_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

/** Development-only object storage that atomically publishes streamed files below one root. */
export class FilesystemObjectStore implements ObjectStore {
  private readonly root: string;

  constructor(root: string) {
    if (!root.trim()) throw new ObjectStorageError('Filesystem object storage root is required.');
    this.root = path.resolve(root);
  }

  async write(storageKey: string, source: Readable) {
    const target = this.resolveStorageKey(storageKey);
    const parent = path.dirname(target);
    const temporary = path.join(parent, `.${path.basename(target)}.${randomUUID()}.tmp`);
    let published = false;
    try {
      await mkdir(parent, { recursive: true });
      await pipeline(source, createWriteStream(temporary, { flags: 'wx' }));
      await link(temporary, target);
      published = true;
      await unlink(temporary);
      return { versionId: null };
    } catch (error) {
      source.destroy();
      await unlink(temporary).catch(() => undefined);
      if (published) await unlink(target).catch(() => undefined);
      if (error instanceof ObjectStorageError) throw error;
      throw new ObjectStorageError('The filesystem object write failed.');
    }
  }

  async read(storageKey: string) {
    try {
      return (await open(this.resolveStorageKey(storageKey), 'r')).createReadStream();
    } catch {
      throw new ObjectStorageError('The filesystem object is unavailable.');
    }
  }

  async delete(storageKey: string) {
    try {
      await unlink(this.resolveStorageKey(storageKey));
    } catch (error) {
      if (isMissingFile(error)) return;
      throw new ObjectStorageError('The filesystem object could not be deleted.');
    }
  }

  private resolveStorageKey(storageKey: string): string {
    if (
      !storageKey ||
      storageKey.includes('\\') ||
      path.isAbsolute(storageKey) ||
      path.win32.isAbsolute(storageKey)
    ) {
      throw new ObjectStorageError('The object storage key is invalid.');
    }
    const segments = storageKey.split('/');
    if (
      segments.some(
        (segment) => segment === '.' || segment === '..' || !STORAGE_KEY_SEGMENT.test(segment),
      )
    ) {
      throw new ObjectStorageError('The object storage key is invalid.');
    }
    const target = path.resolve(this.root, ...segments);
    const relative = path.relative(this.root, target);
    if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new ObjectStorageError('The object storage key is invalid.');
    }
    return target;
  }
}
