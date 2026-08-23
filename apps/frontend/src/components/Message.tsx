import type { ReactNode } from 'react';

export type MessageVariant = 'info' | 'success' | 'warning' | 'error';

export interface MessageProps {
  children: ReactNode;
  heading?: string;
  variant?: MessageVariant;
}

export function Message({ children, heading, variant = 'info' }: MessageProps) {
  const isError = variant === 'error';

  return (
    <section className={`ui-message ui-message--${variant}`} role={isError ? 'alert' : 'status'}>
      {heading ? <h2 className="ui-message__heading">{heading}</h2> : null}
      <div>{children}</div>
    </section>
  );
}
