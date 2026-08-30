import { Link } from 'react-router-dom';

const journeys = [
  {
    number: '01',
    title: 'Fixtures',
    description: 'Open published matches, innings totals, player figures and calculation traces.',
    to: '/fixtures',
    action: 'Browse fixtures',
  },
  {
    number: '02',
    title: 'Competitions',
    description: 'Move from a competition into its seasons, teams and published fixtures.',
    to: '/competitions',
    action: 'Explore competitions',
  },
  {
    number: '03',
    title: 'Players',
    description:
      'Follow a player through named matches with available batting and bowling figures.',
    to: '/participants',
    action: 'Browse players',
  },
];

export function ExploreGateway() {
  return (
    <section className="explore-gateway" aria-labelledby="explore-title">
      <div className="content-boundary">
        <header className="home-section-heading home-section-heading--split">
          <p className="eyebrow">Enter the public record</p>
          <div>
            <h2 id="explore-title">Start with the cricket.</h2>
            <p>No account is required to browse published public records.</p>
          </div>
        </header>
        <ol className="explore-gateway__list">
          {journeys.map((journey) => (
            <li key={journey.title}>
              <span aria-hidden="true">{journey.number}</span>
              <div>
                <h3>{journey.title}</h3>
                <p>{journey.description}</p>
              </div>
              <Link to={journey.to}>
                {journey.action} <span aria-hidden="true">&#8594;</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="explore-gateway__teams">
          Looking for a side? <Link to="/competitors">Browse teams</Link>.
        </p>
      </div>
    </section>
  );
}
