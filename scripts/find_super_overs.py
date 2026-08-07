import json, sys
from pathlib import Path

DATA = Path("data")
matches = sorted(DATA.rglob("*.json"))
print(f"scanned root: {DATA.resolve()}")
print(f"files found: {len(matches)}")

hits = []
for p in matches:
    try:
        with p.open(encoding="utf-8") as f:
            d = json.load(f)
    except Exception as e:
        print(f"UNREADABLE {p.name}: {e}")
        continue
    if not isinstance(d, dict):
        print(f"NOT-A-MATCH {p.relative_to(DATA)}: top level is {type(d).__name__}, "
              f"len={len(d)}")
        continue
    innings = d.get("innings", [])
    if any(i.get("super_over") for i in innings):
        hits.append((p, d))

print(f"super-over matches: {len(hits)}")
for p, _ in hits[:10]:
    print("  ", p.name)

if not hits:
    sys.exit(0)

p, d = hits[0]
print(f"\n--- structure of {p.name} ---")
info = d.get("info", {})
print("match_type:", info.get("match_type"), "| team_type:", info.get("team_type"))
print("teams:", info.get("teams"))
print("outcome:", info.get("outcome"))
for idx, i in enumerate(d.get("innings", []), start=1):
    overs = i.get("overs", [])
    keys = sorted(k for k in i.keys() if k not in ("overs",))
    print(f"innings {idx}: team={i.get('team')!r} super_over={i.get('super_over')} "
          f"overs={len(overs)} deliveries={sum(len(o.get('deliveries', [])) for o in overs)} "
          f"other_keys={keys}")
    for o in overs:
        print(f"    over={o.get('over')!r} ({type(o.get('over')).__name__}) "
              f"deliveries={len(o.get('deliveries', []))}")