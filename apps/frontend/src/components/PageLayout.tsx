import type { ReactNode } from 'react';
import { usePageTitle } from './usePageTitle';

export interface PageLayoutProps {
  children: ReactNode;
  description?: ReactNode;
  /** Also names the browser tab, so it is plain text. */
  heading: string;
}

export function PageLayout({ children, description, heading }: PageLayoutProps) {
  usePageTitle(heading);
  return (
    <div className="ui-page-layout content-boundary">
      <header className="ui-page-layout__header">
        <h1>{heading}</h1>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
