// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Issue #933: the Administration page showed garbled characters where an
// ellipsis belonged. The source file held the ellipsis as its UTF-8 bytes
// decoded as Windows-1252, which renders as a-circumflex, euro sign and broken
// bar. Nothing failed because the text was still valid UTF-8, so this test reads
// every frontend source file and rejects the sequences that this kind of double
// encoding leaves behind.
//
// The patterns are written as escapes so this file does not match itself.
const mojibake = [
  // U+2018-U+201D quotes, U+2013/U+2014 dashes, U+2022 bullet, U+2026 ellipsis
  /\u00e2\u20ac/u,
  // Latin-1 letters with diacritics, e.g. an e-acute becomes A-tilde + copyright
  /\u00c3[\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013-\u2122]/u,
  // Non-breaking space, degree, middle dot and similar Latin-1 symbols
  /\u00c2[\u0080-\u00bf]/u,
  // The replacement character left when invalid bytes were decoded
  /\ufffd/u,
];

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceDirectory = join(frontendRoot, 'src');
const sourcePaths = [
  join(frontendRoot, 'index.html'),
  ...(readdirSync(sourceDirectory, { recursive: true }) as string[])
    .filter((path) => /\.(tsx?|css|html|json)$/.test(path))
    .map((path) => join(sourceDirectory, path)),
];

function findMojibake(text: string): string[] {
  return text
    .split('\n')
    .flatMap((line, index) =>
      mojibake.some((pattern) => pattern.test(line)) ? [`${index + 1}: ${line.trim()}`] : [],
    );
}

describe('frontend text encoding', () => {
  it('detects the double-encoded ellipsis reported in issue #933', () => {
    expect(findMojibake('Checking administrator access\u00e2\u20ac\u00a6')).toHaveLength(1);
    expect(findMojibake('Checking administrator access\u2026')).toEqual([]);
    expect(findMojibake('caf\u00c3\u00a9 \u00c2\u00a0 \ufffd')).toHaveLength(1);
    expect(findMojibake('caf\u00e9 \u00a0 Gr\u00fcn \u2014 \u201cquoted\u201d')).toEqual([]);
  });

  it('scans a meaningful number of source files', () => {
    expect(sourcePaths.length).toBeGreaterThan(50);
  });

  it('finds no mojibake in index.html or any file under src', () => {
    const offending = sourcePaths.flatMap((path) =>
      findMojibake(readFileSync(path, 'utf8')).map(
        (finding) => `${relative(frontendRoot, path)}:${finding}`,
      ),
    );
    expect(offending).toEqual([]);
  });
});
