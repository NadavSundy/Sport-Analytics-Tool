import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { HeroSceneFallback } from './HeroSceneFallback';

interface HeroSceneProps {
  onReady: () => void;
  onUnavailable: () => void;
}

let cachedWebGLSupport: boolean | null = null;

function supportsWebGL(): boolean {
  if (cachedWebGLSupport !== null) {
    return cachedWebGLSupport;
  }

  if (typeof window.WebGLRenderingContext === 'undefined') {
    cachedWebGLSupport = false;
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cachedWebGLSupport = context !== null;
  } catch {
    cachedWebGLSupport = false;
  }

  return cachedWebGLSupport;
}

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(query.matches);
    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

export function HomeHero() {
  const reducedMotion = useReducedMotion();
  const [Scene, setScene] = useState<ComponentType<HeroSceneProps> | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const handleSceneUnavailable = useCallback(() => setSceneReady(false), []);

  useEffect(() => {
    if (reducedMotion || !supportsWebGL()) {
      setScene(null);
      setSceneReady(false);
      return undefined;
    }

    let cancelled = false;
    const loadScene = window.setTimeout(() => {
      void import('./HeroScene')
        .then(({ HeroScene }) => {
          if (!cancelled) {
            setScene(() => HeroScene);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setScene(null);
            setSceneReady(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(loadScene);
    };
  }, [reducedMotion]);

  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero__crease" aria-hidden="true" />
      <div className="content-boundary home-hero__layout">
        <div className="home-hero__content">
          <p className="eyebrow">T20 cricket analytics</p>
          <h1 id="home-title">The game, measured ball by ball.</h1>
          <p className="home-hero__summary">
            Explore T20 cricket through the deliveries behind every published statistic, from an
            individual event to its derived value and traceable source.
          </p>
          <div className="home-hero__actions" aria-label="Start exploring">
            <Link className="button button--primary" to="/fixtures">
              Browse fixtures
            </Link>
            <Link className="button button--secondary" to="/competitions">
              Explore competitions
            </Link>
          </div>
          <Link className="home-hero__player-link" to="/participants">
            Browse players <span aria-hidden="true">&#8594;</span>
          </Link>
        </div>

        <div
          className={`home-hero__visual${sceneReady ? ' home-hero__visual--enhanced' : ''}`}
          data-hero-enhancement={sceneReady ? 'three' : 'fallback'}
        >
          <HeroSceneFallback />
          {Scene && !reducedMotion ? (
            <Scene onReady={handleSceneReady} onUnavailable={handleSceneUnavailable} />
          ) : null}
          <div className="home-hero__visual-caption">
            <span>Illustrative delivery</span>
            <strong>Event &#8594; derived values</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
