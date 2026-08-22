import type { ReactNode } from 'react';

export interface PageLayoutProps {
  children: ReactNode;
  description?: ReactNode;
  heading: ReactNode;
}

export function PageLayout({ children, description, heading }: PageLayoutProps) {
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
