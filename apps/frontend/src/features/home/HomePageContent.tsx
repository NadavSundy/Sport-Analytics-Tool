import { AskQuestionPrompt } from '../natural-language-query/AskQuestionPrompt';
import { ApiFeature } from './ApiFeature';
import { BrandPrinciples } from './BrandPrinciples';
import { EventDerivationStory } from './EventDerivationStory';
import { ExploreGateway } from './ExploreGateway';
import { HomeCallToAction } from './HomeCallToAction';

export function HomePageContent() {
  return (
    <>
      <AskQuestionPrompt />
      <BrandPrinciples />
      <EventDerivationStory />
      <ExploreGateway />
      <ApiFeature />
      <HomeCallToAction />
    </>
  );
}
