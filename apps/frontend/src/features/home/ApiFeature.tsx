const endpoints = [
  { path: '/api/v1/fixtures', label: 'Published fixtures' },
  { path: '/api/v1/fixtures/{fixtureId}/events', label: 'Ordered delivery events' },
  { path: '/api/v1/fixtures/{fixtureId}/statistics', label: 'Derived fixture statistics' },
];

export function ApiFeature() {
  return (
    <section className="api-feature" aria-labelledby="api-title">
      <div className="content-boundary api-feature__layout">
        <header className="home-section-heading">
          <p className="eyebrow">The platform beneath the page</p>
          <h2 id="api-title">The API is part of the product.</h2>
          <p>
            The same handwritten public API connects fixtures, ordered events and derived
            statistics. That keeps the record usable in the interface and understandable outside it.
          </p>
        </header>
        <ol className="api-feature__paths" aria-label="Existing public API paths">
          {endpoints.map((endpoint, index) => (
            <li key={endpoint.path}>
              <span aria-hidden="true">0{index + 1}</span>
              <code>{endpoint.path}</code>
              <strong>{endpoint.label}</strong>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
