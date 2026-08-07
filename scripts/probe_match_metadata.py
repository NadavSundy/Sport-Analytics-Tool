"""Investigate the supersubs and bowl_out fields."""

import glob
import json

for name in ("supersubs", "bowl_out"):
    print(f"=== {name} ===")
    shown = 0
    for path in sorted(glob.glob("data/cricsheet/matches/**/*.json", recursive=True)):
        info = json.load(open(path))["info"]
        if name not in info:
            continue
        if shown < 3:
            print(f"{path}")
            print(f"  {json.dumps(info[name])[:400]}")
            shown += 1
    print()