import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumbs,
  SectionNavigation,
  type NavigationItem,
} from '../../components/NavigationPrimitives';

interface DetailLayoutProps {
  backLabel: string;
  backTo: string;
  children: ReactNode;
  eyebrow: string;
  title: string;
  breadcrumbs?: NavigationItem[];
  sections?: NavigationItem[];
}

export function DetailLayout({
  backLabel,
  backTo,
  breadcrumbs,
  children,
  eyebrow,
  sections,
  title,
}: DetailLayoutProps) {
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
      </header>
      {sections ? <SectionNavigation items={sections} label={`${title} sections`} /> : null}
      {children}
    </article>
  );
}

export function DetailLoading({ label }: { label: string }) {
  return (
    <div className="state-message state-message--detail" role="status">
      <h1>Loading {label}</h1>
      <p>The published record is being requested from the Sport Analytics API.</p>
    </div>
  );
}

export function DetailError({
  error,
  label,
  reload,
}: {
  error: Error;
  label: string;
  reload(): void;
}) {
  return (
    <div className="state-message state-message--detail state-message--error" role="alert">
      <h1>{label} could not be loaded</h1>
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
