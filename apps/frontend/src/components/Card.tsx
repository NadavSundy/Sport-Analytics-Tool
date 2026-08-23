import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  heading?: ReactNode;
}

export function Card({ children, className, heading, ...props }: CardProps) {
  return (
    <section {...props} className={['ui-card', className].filter(Boolean).join(' ')}>
      {heading ? <h2 className="ui-card__heading">{heading}</h2> : null}
      {children}
    </section>
  );
}
