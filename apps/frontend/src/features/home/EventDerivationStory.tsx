export function EventDerivationStory() {
  return (
    <section className="derivation-story" aria-labelledby="derivation-title">
      <div className="content-boundary derivation-story__layout">
        <header className="home-section-heading derivation-story__heading">
          <p className="eyebrow">One delivery, measured</p>
          <h2 id="derivation-title">See the event inside the statistic.</h2>
          <p>
            This explanatory example uses fields and calculations supported by Stat&rsquo;sTheGame.
            It is not a live match or a physical ball path.
          </p>
        </header>

        <div className="derivation-flow" aria-label="Illustrative delivery-to-statistic example">
          <article className="derivation-flow__event">
            <p className="derivation-flow__step">Accepted delivery event</p>
            <h3>Delivery 7.3</h3>
            <dl>
              <div>
                <dt>Runs off bat</dt>
                <dd>4</dd>
              </div>
              <div>
                <dt>Extras</dt>
                <dd>0</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>4</dd>
              </div>
            </dl>
            <code>runs.offBat = 4</code>
          </article>

          <div className="derivation-flow__transition" aria-hidden="true">
            <span />
            <strong>derive</strong>
          </div>

          <article className="derivation-flow__statistics">
            <p className="derivation-flow__step">Derived contribution</p>
            <h3>Three values move</h3>
            <ul>
              <li>
                <span>Batter runs scored</span>
                <strong>+4</strong>
              </li>
              <li>
                <span>Innings delivery runs</span>
                <strong>+4</strong>
              </li>
              <li>
                <span>Bowler runs conceded</span>
                <strong>+4</strong>
              </li>
            </ul>
          </article>

          <div className="derivation-flow__source">
            <span className="derivation-flow__source-mark" aria-hidden="true" />
            <div>
              <p className="derivation-flow__step">Traceable source</p>
              <strong>Accepted event retained</strong>
              <p>The calculation trace identifies which deliveries contributed to a result.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
