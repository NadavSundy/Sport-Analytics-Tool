import { Link } from 'react-router-dom';

export function HomeCallToAction() {
  return (
    <section className="home-cta" aria-labelledby="home-cta-title">
      <div className="content-boundary home-cta__layout">
        <div>
          <p className="eyebrow">First ball to final figure</p>
          <h2 id="home-cta-title">Follow the game from the first ball.</h2>
        </div>
        <Link className="button button--primary" to="/fixtures">
          Browse fixtures
        </Link>
      </div>
    </section>
  );
}
