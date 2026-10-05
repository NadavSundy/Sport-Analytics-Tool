// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Issue #800: success and warning messages lost their colour accent because the
// tokens they referenced were never declared, and an undefined custom property
// silently falls back to the inherited text colour. Every colour token a
// stylesheet consumes must therefore be declared, and declared for both themes.

// Read from disk: Vitest replaces CSS module imports (including ?raw) with empty strings.
const sourceDirectory = fileURLToPath(new URL('.', import.meta.url));
const stylesheetPaths = (readdirSync(sourceDirectory, { recursive: true }) as string[]).filter(
  (path) => path.endsWith('.css'),
);
const allCss = stylesheetPaths
  .map((path) => readFileSync(join(sourceDirectory, path), 'utf8'))
  .join('\n');

function declaredTokens(css: string): Set<string> {
  return new Set([...css.matchAll(/(--colour-[a-z0-9-]+)\s*:/g)].map(([, token]) => token!));
}

function themeBlock(selector: RegExp): string {
  return [...allCss.matchAll(new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`, 'g'))]
    .map((match) => match[1])
    .join('\n');
}

describe('colour tokens', () => {
  it('reads the application stylesheets', () => {
    expect(stylesheetPaths).toContain('styles.css');
    expect(allCss.length).toBeGreaterThan(10_000);
  });

  it('declares every colour token the stylesheets consume without a fallback', () => {
    const declared = declaredTokens(allCss);
    const consumed = [...allCss.matchAll(/var\((--colour-[a-z0-9-]+)\s*\)/g)].map(
      ([, token]) => token!,
    );

    expect([...new Set(consumed)].filter((token) => !declared.has(token)).sort()).toEqual([]);
  });

  it('gives the night theme its own value for every status colour', () => {
    const night = declaredTokens(themeBlock(/:root\[data-theme='night'\]/));

    for (const token of [
      '--colour-success',
      '--colour-success-soft',
      '--colour-warning',
      '--colour-warning-soft',
      '--colour-error',
      '--colour-error-soft',
    ]) {
      expect(night, token).toContain(token);
    }
  });
});
