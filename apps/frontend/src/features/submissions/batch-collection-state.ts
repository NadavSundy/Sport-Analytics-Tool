import { useSyncExternalStore } from 'react';

// Batch lists use local request state rather than a shared query-client cache.
// A successful upload must therefore notify every mounted collection to refetch.
let revision = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return revision;
}

export function invalidateBatchCollections() {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function useBatchCollectionsRevision() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
