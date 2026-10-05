import { expect } from 'vitest';

/**
 * Heading levels a screen-reader user meets in document order, e.g. [1, 2, 3, 2].
 * Visually hidden headings count: they are part of the navigable outline.
 */
export function headingLevels(root: ParentNode = document): number[] {
  return [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) =>
    Number(heading.tagName.slice(1)),
  );
}

/** Asserts that no heading descends more than one level below the one before it. */
export function expectNoSkippedHeadingLevels(root: ParentNode = document): void {
  const levels = headingLevels(root);
  const skips = levels.flatMap((level, index) =>
    index > 0 && level - levels[index - 1] > 1 ? [`h${levels[index - 1]} -> h${level}`] : [],
  );

  expect(skips, `heading outline ${levels.map((level) => `h${level}`).join(', ')}`).toEqual([]);
}
