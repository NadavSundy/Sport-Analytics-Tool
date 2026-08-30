const principles = [
  {
    number: '01',
    name: 'Explosive',
    copy: 'T20 unfolds delivery by delivery. The interface keeps that event-level pace visible without getting in the way of the record.',
  },
  {
    number: '02',
    name: 'Exact',
    copy: 'Runs, balls, wickets and rates are derived from accepted fields and explicit cricket rules—not entered as disconnected totals.',
  },
  {
    number: '03',
    name: 'Traceable',
    copy: 'Published fixture statistics retain a calculation path back to the accepted events that contributed to them.',
  },
];

export function BrandPrinciples() {
  return (
    <section className="home-principles" aria-labelledby="principles-title">
      <div className="content-boundary">
        <header className="home-section-heading home-section-heading--split">
          <p className="eyebrow">How the record moves</p>
          <div>
            <h2 id="principles-title">Explosive. Exact. Traceable.</h2>
            <p>Broadcast energy, analytical discipline, and a source behind every figure.</p>
          </div>
        </header>
        <ol className="home-principles__list">
          {principles.map((principle) => (
            <li key={principle.name}>
              <span className="home-principles__number" aria-hidden="true">
                {principle.number}
              </span>
              <h3>{principle.name}</h3>
              <p>{principle.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
