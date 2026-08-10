import { Route, Routes } from 'react-router-dom';
import { PublicShell } from './components/PublicShell';
import {
  CompetitionDetailPage,
  CompetitionsPage,
  CompetitorDetailPage,
  CompetitorsPage,
  FixtureDetailPage,
  FixturesPage,
  NotFoundPage,
  ParticipantDetailPage,
  ParticipantsPage,
  SeasonDetailPage,
  SeasonsPage,
} from './pages/PublicBrowsePages';
import { useEffect } from 'react';
import { AccountPage, AuthenticationPage } from './features/auth/AuthPages';

function HeroLogo() {
  return (
    <div className="hero__brand-art" aria-hidden="true">
      <img
        className="hero__logo brand-asset--day"
        src="/brand/statsthegame-mark-light.svg"
        alt=""
      />
      <img
        className="hero__logo brand-asset--night"
        src="/brand/statsthegame-mark-dark.svg"
        alt=""
      />
    </div>
  );
}

function LandingPage() {
  useEffect(() => {
    document.title = "Stat'sTheGame";
  }, []);

  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <HeroLogo />
        <div className="hero__content">
          <p className="eyebrow">Public T20 cricket record</p>
          <h1 id="page-title">Stat&rsquo;sTheGame</h1>
          <p className="hero__tagline">The game, measured ball by ball.</p>
          <p className="hero__summary">
            An event-driven home for published cricket records, designed to keep every result
            connected to the deliveries behind it.
          </p>
        </div>
      </section>

      <section className="principles" aria-labelledby="principles-title">
        <div className="content-boundary">
          <div className="section-heading">
            <p className="eyebrow">Our standard</p>
            <h2 id="principles-title">Explosive. Exact. Traceable.</h2>
          </div>

          <div className="principles__grid">
            <article>
              <p className="principle-number" aria-hidden="true">
                01
              </p>
              <h3>Event-led</h3>
              <p>Published figures begin with accepted, event-level cricket data.</p>
            </article>
            <article>
              <p className="principle-number" aria-hidden="true">
                02
              </p>
              <h3>Public by design</h3>
              <p>Published cricket records are available without an account.</p>
            </article>
            <article>
              <p className="principle-number" aria-hidden="true">
                03
              </p>
              <h3>Built for evidence</h3>
              <p>Every published result is designed to remain connected to its source.</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}

export function PublicApp() {
  return (
    <PublicShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/competitions" element={<CompetitionsPage />} />
        <Route path="/competitions/:competitionId" element={<CompetitionDetailPage />} />

        <Route path="/seasons" element={<SeasonsPage />} />
        <Route path="/seasons/:seasonId" element={<SeasonDetailPage />} />

        <Route path="/fixtures" element={<FixturesPage />} />
        <Route path="/fixtures/:fixtureId" element={<FixtureDetailPage />} />

        <Route path="/competitors" element={<CompetitorsPage />} />
        <Route path="/competitors/:competitorId" element={<CompetitorDetailPage />} />

        <Route path="/participants" element={<ParticipantsPage />} />
        <Route path="/participants/:participantId" element={<ParticipantDetailPage />} />

        <Route path="/create-account" element={<AuthenticationPage mode="create-account" />} />
        <Route path="/sign-in" element={<AuthenticationPage mode="sign-in" />} />
        <Route path="/account" element={<AccountPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </PublicShell>
  );
}

function App() {
  return <PublicApp />;
}

export default App;
