import { Component, type ReactNode } from 'react';

export function SectionError({
  description,
  reason,
  retry,
  retryLabel,
  title,
}: {
  description: string;
  reason?: string | undefined;
  retry(): void;
  retryLabel: string;
  title: string;
}) {
  return (
    <div className="state-message state-message--error" role="alert">
      <h3>{title}</h3>
      <p>{description}</p>
      {reason ? <p>{reason}</p> : null}
      <button
        aria-label={retryLabel}
        className="button button--secondary"
        onClick={retry}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * The application mounts no error boundary, so an exception raised while a
 * published section is being displayed would otherwise unmount the whole page
 * and leave the reader a blank screen with no error and no retry. This boundary
 * keeps such a failure inside its section and gives it the same actionable error
 * state as a failed request. Introduced for the match statistics section under
 * #430 and shared with the player page sections under #476.
 */
export class SectionBoundary extends Component<
  { children: ReactNode; onRetry(): void; renderError(retry: () => void): ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  private retry = () => {
    this.setState({ failed: false });
    this.props.onRetry();
  };

  override render() {
    if (this.state.failed) {
      return this.props.renderError(this.retry);
    }

    return this.props.children;
  }
}
