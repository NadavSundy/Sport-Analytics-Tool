import { useEffect, useState } from 'react';

export type HeaderLayout = 'full' | 'compact' | 'menu';

/**
 * Widths at which the header gives up space. "compact" shrinks the theme control
 * to its switch; "menu" moves navigation into the menu panel. Workspace links
 * (Manage Submission, Administration) add about 400px, so they move both points.
 * Measured with issue #800's header audit; keep in rem so text size moves them.
 */
export const headerLayoutQueries = {
  public: { menu: '(max-width: 56.25rem)', compact: '(max-width: 68rem)' },
  workspace: { menu: '(max-width: 69.9375rem)', compact: '(max-width: 79.9375rem)' },
} as const;

function currentLayout(hasWorkspaceLinks: boolean): HeaderLayout {
  if (typeof window.matchMedia !== 'function') return 'full';
  const queries = headerLayoutQueries[hasWorkspaceLinks ? 'workspace' : 'public'];
  if (window.matchMedia(queries.menu).matches) return 'menu';
  if (window.matchMedia(queries.compact).matches) return 'compact';
  return 'full';
}

export function useHeaderLayout(hasWorkspaceLinks: boolean): HeaderLayout {
  const [layout, setLayout] = useState(() => currentLayout(hasWorkspaceLinks));

  useEffect(() => {
    const update = () => setLayout(currentLayout(hasWorkspaceLinks));
    update();
    if (typeof window.matchMedia !== 'function') return;
    const queries = Object.values(headerLayoutQueries[hasWorkspaceLinks ? 'workspace' : 'public']);
    const lists = queries.map((query) => window.matchMedia(query));
    lists.forEach((list) => list.addEventListener('change', update));
    return () => lists.forEach((list) => list.removeEventListener('change', update));
  }, [hasWorkspaceLinks]);

  return layout;
}
