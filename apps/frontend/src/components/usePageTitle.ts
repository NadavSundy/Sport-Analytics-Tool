import { useEffect } from 'react';

const SITE_NAME = "Stat'sTheGame";

/**
 * Names the browser tab after the page's own heading, so tabs, history and
 * screen-reader page announcements identify each route (WCAG 2.2 SC 2.4.2).
 * Pass null from a component that only sometimes owns the page.
 */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title !== null) document.title = `${title} | ${SITE_NAME}`;
  }, [title]);
}
