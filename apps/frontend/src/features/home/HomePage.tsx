import { lazy, Suspense, useEffect } from 'react';
import { HomeHero } from './HomeHero';

const HomePageContent = lazy(async () => {
  const module = await import('./HomePageContent');
  return { default: module.HomePageContent };
});

export function HomePage() {
  useEffect(() => {
    document.title = "Stat'sTheGame | T20 cricket analytics";
  }, []);

  return (
    <div className="home-page">
      <HomeHero />
      <Suspense fallback={null}>
        <HomePageContent />
      </Suspense>
    </div>
  );
}
