import { useEffect, useState } from 'react';
import { getHealth, type HealthResponse } from './api/client';

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getHealth(controller.signal)
      .then((result) => setHealth(result))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        setError('The API is not currently reachable. Start the backend and refresh this page.');
      });

    return () => controller.abort();
  }, []);

  return (
    <main id="main-content" className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">COMS3011A · Git Push Pray</p>
        <h1 id="page-title">Sport Analytics Tool</h1>
        <p>
          A foundation for validated event submissions, traceable derived statistics, datasets, and
          a public hand-written HTTP API.
        </p>
      </section>

      <section className="status-card" aria-labelledby="api-status-heading" aria-live="polite">
        <h2 id="api-status-heading">API status</h2>
        {health ? (
          <p>
            Connected to <strong>{health.service}</strong>.
          </p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          <p>Checking the backend connection…</p>
        )}
      </section>
    </main>
  );
}

export default App;
