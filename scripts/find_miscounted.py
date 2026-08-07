import json
from pathlib import Path

DATA = Path("data/cricsheet/matches")
hits = []

for p in sorted(DATA.rglob("*.json")):
    try:
        with p.open(encoding="utf-8") as f:
            d = json.load(f)
    except Exception as e:
        print(f"UNREADABLE {p.name}: {e}")
        continue
    if not isinstance(d, dict):
        continue
    if any(i.get("miscounted_overs") for i in d.get("innings", [])):
        hits.append((p, d))

print(f"miscounted-over matches: {len(hits)}")

for p, d in hits[:5]:
    print(f"\n--- {p.name} ---")
    for idx, i in enumerate(d.get("innings", [])):
        mc = i.get("miscounted_overs")
        if not mc:
            continue
        print(f"innings ordinal {idx}: team={i.get('team')!r}")
        print(f"  miscounted_overs raw: {json.dumps(mc)}")
        for key, detail in mc.items():
            balls = detail.get("balls") if isinstance(detail, dict) else detail
            print(f"  key={key!r} ({type(key).__name__}) "
                  f"balls={balls!r} ({type(balls).__name__})")
            for o in i.get("overs", []):
                if str(o.get("over")) == str(key):
                    print(f"    over field {o.get('over')!r} -> "
                          f"{len(o.get('deliveries', []))} deliveries")
            for o in i.get("overs", []):
                if str(o.get("over")) == str(int(key) - 1):
                    print(f"    over field {int(key)-1} -> "
                          f"{len(o.get('deliveries', []))} deliveries")