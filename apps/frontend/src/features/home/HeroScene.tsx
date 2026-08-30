import { useEffect, useRef } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';

interface HeroSceneProps {
  onReady: () => void;
  onUnavailable: () => void;
}

const DELIVERY_DURATION = 1_850;
const REST_DURATION = 1_600;

function semanticColour(styles: CSSStyleDeclaration, name: string, fallback: string): Color {
  return new Color(styles.getPropertyValue(name).trim() || fallback);
}

export function HeroScene({ onReady, onUnavailable }: HeroSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const sceneCanvas = canvas;
    let disposed = false;
    let contextLost = false;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(6.3, 7.4, 9.4);
    camera.lookAt(0, 0.1, -0.35);

    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    const rememberGeometry = <T extends BufferGeometry>(geometry: T): T => {
      geometries.add(geometry);
      return geometry;
    };
    const rememberMaterial = <T extends Material>(material: T): T => {
      materials.add(material);
      return material;
    };

    const pitchMaterial = rememberMaterial(new MeshBasicMaterial());
    const pitch = new Mesh(rememberGeometry(new BoxGeometry(4.35, 0.12, 8.9)), pitchMaterial);
    scene.add(pitch);

    const creaseGeometry = rememberGeometry(
      new BufferGeometry().setFromPoints([
        new Vector3(-2.2, 0.08, -3.45),
        new Vector3(2.2, 0.08, -3.45),
        new Vector3(-2.2, 0.08, -2.85),
        new Vector3(2.2, 0.08, -2.85),
        new Vector3(-2.2, 0.08, 3.45),
        new Vector3(2.2, 0.08, 3.45),
        new Vector3(-2.2, 0.08, 2.85),
        new Vector3(2.2, 0.08, 2.85),
      ]),
    );
    const creaseMaterial = rememberMaterial(new LineBasicMaterial());
    scene.add(new LineSegments(creaseGeometry, creaseMaterial));

    const stumpGeometry = rememberGeometry(new CylinderGeometry(0.035, 0.035, 0.68, 8));
    const stumpMaterial = rememberMaterial(new MeshBasicMaterial());
    for (const z of [-3.16, 3.16]) {
      for (const x of [-0.28, 0, 0.28]) {
        const stump = new Mesh(stumpGeometry, stumpMaterial);
        stump.position.set(x, 0.4, z);
        scene.add(stump);
      }
    }

    const deliveryCurve = new CatmullRomCurve3([
      new Vector3(-0.5, 1.65, 3.75),
      new Vector3(-0.35, 1.22, 1.8),
      new Vector3(0.1, 0.55, -0.25),
      new Vector3(0.32, 0.3, -2.15),
    ]);
    const trailMaterial = rememberMaterial(
      new MeshBasicMaterial({ transparent: true, opacity: 0.55 }),
    );
    const trail = new Mesh(
      rememberGeometry(new TubeGeometry(deliveryCurve, 42, 0.035, 6, false)),
      trailMaterial,
    );
    scene.add(trail);

    const ballMaterial = rememberMaterial(new MeshBasicMaterial());
    const ball = new Mesh(rememberGeometry(new SphereGeometry(0.17, 16, 12)), ballMaterial);
    scene.add(ball);

    const markerMaterial = rememberMaterial(new MeshBasicMaterial({ transparent: true }));
    const marker = new Mesh(
      rememberGeometry(new TorusGeometry(0.34, 0.035, 8, 32)),
      markerMaterial,
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.set(0.32, 0.09, -2.15);
    scene.add(marker);

    const connectionMaterial = rememberMaterial(new LineBasicMaterial({ transparent: true }));
    const connection = new LineSegments(
      rememberGeometry(
        new BufferGeometry().setFromPoints([
          new Vector3(0.65, 0.16, -2.15),
          new Vector3(2.6, 0.16, -2.15),
          new Vector3(2.6, 0.16, -2.15),
          new Vector3(2.6, 0.16, 0.65),
        ]),
      ),
      connectionMaterial,
    );
    scene.add(connection);

    const derivedGeometry = rememberGeometry(new BoxGeometry(0.34, 0.42, 0.9));
    const derivedMaterial = rememberMaterial(new MeshBasicMaterial());
    const derivedHighlightMaterial = rememberMaterial(new MeshBasicMaterial());
    const derivedBars = [-0.35, 0.65, 1.65].map((z, index) => {
      const bar = new Mesh(
        derivedGeometry,
        index === 0 ? derivedHighlightMaterial : derivedMaterial,
      );
      bar.position.set(2.6, 0.28, z);
      scene.add(bar);
      return bar;
    });

    const applyTheme = () => {
      if (disposed || contextLost) {
        return;
      }

      const styles = window.getComputedStyle(document.documentElement);
      pitchMaterial.color.copy(semanticColour(styles, '--colour-surface-raised', '#eee9dc'));
      creaseMaterial.color.copy(semanticColour(styles, '--colour-text', '#102026'));
      stumpMaterial.color.copy(semanticColour(styles, '--colour-text', '#102026'));
      ballMaterial.color.copy(semanticColour(styles, '--colour-primary', '#5d7e00'));
      trailMaterial.color.copy(semanticColour(styles, '--colour-primary', '#5d7e00'));
      markerMaterial.color.copy(semanticColour(styles, '--colour-brand', '#e95a24'));
      markerMaterial.opacity = 0.9;
      connectionMaterial.color.copy(semanticColour(styles, '--colour-data-accent', '#007f9e'));
      connectionMaterial.opacity = 0.72;
      derivedMaterial.color.copy(semanticColour(styles, '--colour-data-accent', '#007f9e'));
      derivedHighlightMaterial.color.copy(semanticColour(styles, '--colour-brand', '#e95a24'));
      canvas.dataset.sceneTheme = document.documentElement.dataset.theme ?? 'day';
      renderer.render(scene, camera);
    };

    const setProgress = (progress: number) => {
      const ballProgress = Math.min(progress / 0.72, 1);
      const easedBallProgress = 1 - Math.pow(1 - ballProgress, 3);
      ball.position.copy(deliveryCurve.getPointAt(easedBallProgress));
      ball.rotation.x = progress * Math.PI * 3;
      ball.rotation.z = progress * Math.PI * 2;

      const derivedProgress = Math.max(0, Math.min((progress - 0.65) / 0.35, 1));
      derivedBars.forEach((bar, index) => {
        const delayedProgress = Math.max(0.08, Math.min(derivedProgress * 1.35 - index * 0.12, 1));
        bar.scale.y = delayedProgress;
      });
      trailMaterial.opacity = 0.28 + ballProgress * 0.32;
    };

    let frameId: number | null = null;
    let replayTimer: number | null = null;
    let sequenceStart = 0;
    let isIntersecting = true;
    let isHidden = document.hidden;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;

    const cancelAnimation = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      if (replayTimer !== null) {
        window.clearTimeout(replayTimer);
        replayTimer = null;
      }
    };

    const canAnimate = () =>
      !disposed && !contextLost && isIntersecting && !isHidden && !reducedMotion;

    const renderStaticState = () => {
      if (disposed || contextLost) {
        return;
      }

      canvas.dataset.animationState = 'paused';
      setProgress(1);
      renderer.render(scene, camera);
    };

    const runSequence = (now: number) => {
      if (disposed) {
        frameId = null;
        return;
      }

      if (!canAnimate()) {
        cancelAnimation();
        renderStaticState();
        return;
      }

      const progress = Math.max(0, Math.min((now - sequenceStart) / DELIVERY_DURATION, 1));
      setProgress(progress);
      renderer.render(scene, camera);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(runSequence);
      } else {
        frameId = null;
        canvas.dataset.animationState = 'idle';
        replayTimer = window.setTimeout(startSequence, REST_DURATION);
      }
    };

    function startSequence() {
      cancelAnimation();
      if (disposed) {
        return;
      }

      if (!canAnimate()) {
        renderStaticState();
        return;
      }
      sequenceStart = window.performance.now();
      sceneCanvas.dataset.animationState = 'running';
      setProgress(0);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(runSequence);
    }

    const syncAnimation = () => {
      cancelAnimation();
      if (disposed) {
        return;
      }

      if (canAnimate()) {
        startSequence();
      } else {
        renderStaticState();
      }
    };

    const resize = () => {
      if (disposed || contextLost) {
        return;
      }

      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (resizeObserver) {
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    const intersectionObserver =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            ([entry]) => {
              if (disposed) {
                return;
              }

              isIntersecting = entry?.isIntersecting ?? false;
              syncAnimation();
            },
            { rootMargin: '80px 0px', threshold: 0.05 },
          )
        : null;
    intersectionObserver?.observe(canvas);

    const handleVisibility = () => {
      if (disposed) {
        return;
      }

      isHidden = document.hidden;
      syncAnimation();
    };
    const handleReducedMotion = () => {
      if (disposed) {
        return;
      }

      reducedMotion = reducedMotionQuery.matches;
      syncAnimation();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    reducedMotionQuery.addEventListener('change', handleReducedMotion);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (disposed) {
        return;
      }

      contextLost = true;
      cancelAnimation();
      canvas.dataset.animationState = 'context-lost';
      canvas.dataset.contextState = 'lost';
      onUnavailable();
    };
    const handleContextRestored = () => {
      if (disposed) {
        return;
      }

      contextLost = false;
      canvas.dataset.contextState = 'ready';
      resize();
      applyTheme();
      syncAnimation();
      onReady();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const themeObserver = new MutationObserver(() => {
      if (!disposed) {
        applyTheme();
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    resize();
    applyTheme();
    syncAnimation();
    canvas.dataset.contextState = 'ready';
    onReady();

    return () => {
      if (disposed) {
        return;
      }

      disposed = true;
      cancelAnimation();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', resize);
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      reducedMotionQuery.removeEventListener('change', handleReducedMotion);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      canvas.dataset.animationState = 'disposed';
      renderer.dispose();
    };
  }, [onReady, onUnavailable]);

  return <canvas className="hero-scene" ref={canvasRef} aria-hidden="true" />;
}
