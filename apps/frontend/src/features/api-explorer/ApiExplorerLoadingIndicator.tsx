import './ApiExplorerLoadingIndicator.css';

export function ApiExplorerLoadingIndicator({ label }: { label: string }) {
  return (
    <span
      className="api-explorer-loading-indicator"
      role="progressbar"
      aria-label={label}
      aria-valuetext={label}
    >
      <span className="api-explorer-loading-indicator__spinner" aria-hidden="true" />
    </span>
  );
}
