import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export interface NavigationItem {
  label: string;
  to: string;
}

export function Breadcrumbs({ items }: { items: NavigationItem[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.to}-${item.label}`}>
            {index === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <NavLink to={item.to} end>
                {item.label}
              </NavLink>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LocalNavigation({ items, label }: { items: NavigationItem[]; label: string }) {
  return (
    <nav className="local-navigation" aria-label={label}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to.split('/').filter(Boolean).length <= 2}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AnchoredSection({ children, id }: { children: ReactNode; id: string }) {
  return (
    <div className="anchored-section" id={id}>
      {children}
    </div>
  );
}

export function SectionNavigation({ items, label }: { items: NavigationItem[]; label: string }) {
  return (
    <nav className="local-navigation" aria-label={label}>
      {items.map((item) => (
        <a key={item.to} href={item.to}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
