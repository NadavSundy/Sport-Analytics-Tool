import { useEffect } from 'react';
import { ApiFeature } from './ApiFeature';
import { BrandPrinciples } from './BrandPrinciples';
import { EventDerivationStory } from './EventDerivationStory';
import { ExploreGateway } from './ExploreGateway';
import { HomeCallToAction } from './HomeCallToAction';
import { HomeHero } from './HomeHero';

export function HomePage() {
  useEffect(() => {
    document.title = "Stat'sTheGame | T20 cricket analytics";
  }, []);

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
