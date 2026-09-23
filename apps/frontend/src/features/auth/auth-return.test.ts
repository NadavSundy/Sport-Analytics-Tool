import { describe, expect, it } from 'vitest';
import { safeInternalReturnPath, signInPathFor } from './auth-return';

describe('authentication return paths', () => {
  it('retains internal paths with query strings and fragments', () => {
    expect(safeInternalReturnPath('/submissions/batches/ABC?view=issues#results')).toBe(
      '/submissions/batches/ABC?view=issues#results',
    );
    expect(signInPathFor('/reviews/batches/ABC')).toBe(
      '/sign-in?returnTo=%2Freviews%2Fbatches%2FABC',
    );
  });

  it.each([
    'https://attacker.example/path',
    '//attacker.example/path',
    '/\\attacker.example/path',
    'javascript:alert(1)',
  ])('rejects unsafe return destination %s', (value) => {
    expect(safeInternalReturnPath(value)).toBeNull();
  });
});
