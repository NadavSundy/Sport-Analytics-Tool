# Public assets

Place static, cache-safe assets here. Prefer imported assets under `src/` when bundling and content hashing are useful. Every image must have an accessibility purpose and an appropriate text alternative where rendered.

The home hero uses WebP delivery copies of
`images/cricket-match-john-oswald-unsplash.jpg`: 640-pixel and 1280-pixel variants
in a responsive `picture` element. Both retain the same John Oswald / Unsplash credit.
The original JPEG is retained as the fallback. The HTML preload and React source
must use the same `srcset` and `sizes` so browsers request only one variant.
