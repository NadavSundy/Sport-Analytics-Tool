import { Readable } from 'node:stream';

import type { ContainerClient } from '@azure/storage-blob';
import { describe, expect, test, vi } from 'vitest';

import { AzureBlobObjectStore } from '../../src/modules/object-storage/azure-blob-object-store';

describe('Azure Blob object-store adapter', () => {
  test('streams to a non-overwriting private container client and returns the version', async () => {
    const getProperties = vi.fn().mockResolvedValue({});
    const uploadStream = vi.fn().mockResolvedValue({ versionId: 'version-2' });
    const getBlockBlobClient = vi.fn().mockReturnValue({ uploadStream });
    const adapter = new AzureBlobObjectStore({
      getProperties,
      getBlockBlobClient,
    } as unknown as ContainerClient);
    const source = Readable.from('payload');

    await expect(adapter.write('generated-key', source)).resolves.toEqual({
      versionId: 'version-2',
    });
    expect(getBlockBlobClient).toHaveBeenCalledWith('generated-key');
    expect(getProperties).toHaveBeenCalledOnce();
    expect(uploadStream).toHaveBeenCalledWith(source, 4 * 1024 * 1024, 4, {
      conditions: { ifNoneMatch: '*' },
    });
  });

  test('returns only a backend stream and performs idempotent snapshot-aware deletion', async () => {
    const getProperties = vi.fn().mockResolvedValue({});
    const body = Readable.from('private payload');
    const download = vi.fn().mockResolvedValue({ readableStreamBody: body });
    const deleteIfExists = vi.fn().mockResolvedValue({ succeeded: true });
    const getBlockBlobClient = vi.fn().mockReturnValue({ download, deleteIfExists });
    const adapter = new AzureBlobObjectStore({
      getProperties,
      getBlockBlobClient,
    } as unknown as ContainerClient);

    await expect(adapter.read('generated-key')).resolves.toBe(body);
    await expect(adapter.delete('generated-key')).resolves.toBeUndefined();
    expect(deleteIfExists).toHaveBeenCalledWith({ deleteSnapshots: 'include' });
    expect(getProperties).toHaveBeenCalledOnce();
  });

  test('refuses to use a container configured for public access', async () => {
    const getBlockBlobClient = vi.fn();
    const adapter = new AzureBlobObjectStore({
      getProperties: vi.fn().mockResolvedValue({ blobPublicAccess: 'container' }),
      getBlockBlobClient,
    } as unknown as ContainerClient);

    await expect(adapter.write('generated-key', Readable.from('payload'))).rejects.toThrow(
      'permits public access',
    );
    expect(getBlockBlobClient).not.toHaveBeenCalled();
  });
});
