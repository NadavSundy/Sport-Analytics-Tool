import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumbs,
  SectionNavigation,
  type NavigationItem,
} from '../../components/NavigationPrimitives';
import { usePageTitle } from '../../components/usePageTitle';

interface DetailLayoutProps {
  backLabel: string;
  backTo: string;
  children: ReactNode;
  eyebrow: string;
  title: string;
  breadcrumbs?: NavigationItem[];
  headerAction?: ReactNode;
  sections?: NavigationItem[];
}

export function DetailLayout({
  backLabel,
  backTo,
  breadcrumbs,
  children,
  headerAction,
  eyebrow,
  sections,
  title,
}: DetailLayoutProps) {
  usePageTitle(title);
  return (
    <article className="detail-page content-boundary">
      <Breadcrumbs
        items={
          breadcrumbs ?? [
            { label: backLabel.charAt(0).toUpperCase() + backLabel.slice(1), to: backTo },
            { label: title, to: '#' },
          ]
        }
      />
      <Link className="back-link" to={backTo}>
        Back to {backLabel}
      </Link>
      <header className="page-heading page-heading--detail">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {headerAction ? <div className="page-heading__action">{headerAction}</div> : null}
      </header>
      {sections ? <SectionNavigation items={sections} label={`${title} sections`} /> : null}
      {children}
    </article>
  );
}

/**
 * Level 1 (the default) stands in for a whole page and names the browser tab.
 * Level 2 sits beneath a page's own h1 and leaves its title alone.
 */
type StateHeadingLevel = 1 | 2;

export function DetailLoading({ label, level = 1 }: { label: string; level?: StateHeadingLevel }) {
  const Heading = `h${level}` as const;
  usePageTitle(level === 1 ? `Loading ${label}` : null);
  return (
    <div className="state-message state-message--detail" role="status">
      <Heading>Loading {label}</Heading>
      <p>The published record is being requested from the Sport Analytics API.</p>
    </div>
  );
}

export function DetailError({
  error,
  label,
  level = 1,
  reload,
}: {
  error: Error;
  label: string;
  level?: StateHeadingLevel;
  reload(): void;
}) {
  const Heading = `h${level}` as const;
  usePageTitle(level === 1 ? `${label} could not be loaded` : null);
  return (
    <div className="state-message state-message--detail state-message--error" role="alert">
      <Heading>{label} could not be loaded</Heading>
      <p>{error.message}</p>
      <button className="button button--secondary" onClick={reload} type="button">
        Try again
      </button>
    </div>
  );
}

export function RecordFacts({ children }: { children: ReactNode }) {
  return <dl className="record-facts">{children}</dl>;
}

export function RecordFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function RelatedLinks({ children }: { children: ReactNode }) {
  return (
    <nav aria-labelledby="related-records-heading" className="related-records">
      <h2 id="related-records-heading">Related records</h2>
      <div>{children}</div>
    </nav>
  );
}
