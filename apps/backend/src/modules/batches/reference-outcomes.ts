import type { BatchReferenceEntityType } from '@sport-analytics/contracts';

/**
 * Parsed shape of a single reference-resolution outcome as it is persisted on
 * `batch_item.resolved_references`. The raw JSONB can nest these outcomes
 * arbitrarily deeply (one per striker/non-striker/bowler/fielder/etc.), so
 * callers should always go through `storedOutcomes` rather than reading the
 * JSON shape directly.
 */
interface StoredReferenceCandidate {
  canonicalId: string;
  label: string;
  outOfScope?: boolean;
}

export interface StoredReferenceOutcome {
  referencePath: string;
  entityType: BatchReferenceEntityType;
  state: 'resolved' | 'ambiguous' | 'unresolved' | 'invalid';
  submittedReference: unknown;
  candidates: StoredReferenceCandidate[];
  reason: string | null;
}

/**
 * Walks the (arbitrarily nested) `resolved_references` JSON blob for a batch
 * item and returns every embedded reference-resolution outcome it contains,
 * regardless of where in the structure it is nested.
 */
export function storedOutcomes(value: unknown): StoredReferenceOutcome[] {
  const results: StoredReferenceOutcome[] = [];
  function visit(candidate: unknown) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
    const record = candidate as Record<string, unknown>;
    if (
      typeof record.referencePath === 'string' &&
      ['competition', 'team', 'fixture', 'innings', 'participant'].includes(
        String(record.entityType),
      ) &&
      ['resolved', 'ambiguous', 'unresolved', 'invalid'].includes(String(record.state)) &&
      Array.isArray(record.candidates)
    ) {
      const candidates = record.candidates.flatMap((entry): StoredReferenceCandidate[] => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const item = entry as Record<string, unknown>;
        return typeof item.canonicalId === 'string' && typeof item.label === 'string'
          ? [
              {
                canonicalId: item.canonicalId,
                label: item.label,
                ...(item.outOfScope === true ? { outOfScope: true } : {}),
              },
            ]
          : [];
      });
      results.push({
        referencePath: record.referencePath,
        entityType: record.entityType as BatchReferenceEntityType,
        state: record.state as StoredReferenceOutcome['state'],
        submittedReference: record.submittedReference,
        candidates,
        reason: typeof record.reason === 'string' ? record.reason : null,
      });
      return;
    }
    for (const nested of Object.values(record)) visit(nested);
  }
  visit(value);
  return results;
}
