export function HeroSceneFallback() {
  return (
    <svg
      className="hero-scene-fallback"
      viewBox="0 0 720 640"
      aria-hidden="true"
      focusable="false"
      data-testid="hero-scene-fallback"
    >
      <g className="hero-scene-fallback__pitch">
        <path d="M244 86 506 86 612 558 108 558Z" />
        <path className="hero-scene-fallback__crease" d="M183 416h364M154 482h422" />
        <path className="hero-scene-fallback__crease" d="M244 110h262M232 150h286" />
        <path className="hero-scene-fallback__stumps" d="M337 443v54m28-54v54m28-54v54" />
      </g>
      <path
        className="hero-scene-fallback__trail"
        d="M372 121C296 190 303 282 382 349c38 33 55 62 35 96"
      />
      <circle className="hero-scene-fallback__ball" cx="417" cy="445" r="15" />
      <circle className="hero-scene-fallback__marker" cx="417" cy="445" r="29" />
      <path className="hero-scene-fallback__connection" d="M446 445h76v-95h64" />
      <g className="hero-scene-fallback__derived">
        <rect x="586" y="302" width="82" height="25" />
        <rect x="586" y="342" width="52" height="25" />
        <rect x="586" y="382" width="68" height="25" />
      </g>
    </svg>
  );
}
