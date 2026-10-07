# Public assets

Place static, cache-safe assets here. Prefer imported assets under `src/` when bundling and content hashing are useful. Every image must have an accessibility purpose and an appropriate text alternative where rendered.

The home hero uses WebP delivery copies of
`images/cricket-match-john-oswald-unsplash.jpg`: the full 1800-pixel image and a
960-pixel mobile variant. Both retain the same John Oswald / Unsplash credit.
The original JPEG is retained as the source. The HTML preload and React image
must use the same `srcset` and `sizes` so browsers request only one variant.
