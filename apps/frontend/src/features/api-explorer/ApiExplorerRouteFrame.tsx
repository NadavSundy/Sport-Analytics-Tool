import type { ReactNode } from 'react';
import { PageLayout } from '../../components/PageLayout';

const API_EXPLORER_HEADING = 'API Explorer';
const API_EXPLORER_DESCRIPTION =
  'Explore the authoritative Sport Analytics OpenAPI contract and try implemented endpoints directly from the browser.';

export function ApiExplorerRouteFrame({ children }: { children: ReactNode }) {
  return (
    <PageLayout heading={API_EXPLORER_HEADING} description={API_EXPLORER_DESCRIPTION}>
      {children}
    </PageLayout>
  );
}
