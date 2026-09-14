import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiFeature } from './ApiFeature';
import { BrandPrinciples } from './BrandPrinciples';
import { EventDerivationStory } from './EventDerivationStory';
import { ExploreGateway } from './ExploreGateway';
import { HomeCallToAction } from './HomeCallToAction';
import { HomeHero } from './HomeHero';

export function HomePage() {
  const { hash } = useLocation();

  useEffect(() => {
    document.title = "Stat'sTheGame | T20 cricket analytics";
  }, []);

  // Client-side navigation does not scroll to a fragment, so a link such as the
  // footer's /#api would otherwise open this page at the top.
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    }
  }, [hash]);

  return (
    <div className="home-page">
      <HomeHero />
      <BrandPrinciples />
      <EventDerivationStory />
      <ExploreGateway />
      <ApiFeature />
      <HomeCallToAction />
    </div>
  );
}
