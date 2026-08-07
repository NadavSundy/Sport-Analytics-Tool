"""Derive innings totals from the source file, for comparison with a published scorecard."""

import json

MATCH = "data/cricsheet/matches/indian-premier-league/729307.json"

data = json.load(open(MATCH))

for index, innings in enumerate(data["innings"]):
    runs = 0
    wickets = 0
    legal_balls = 0
    extras = {}

    for over in innings["overs"]:
        for delivery in over["deliveries"]:
            runs += delivery["runs"]["total"]
            wickets += len(delivery.get("wickets", []))
            delivery_extras = delivery.get("extras", {})
            for kind, value in delivery_extras.items():
                extras[kind] = extras.get(kind, 0) + value
            if "wides" not in delivery_extras and "noballs" not in delivery_extras:
                legal_balls += 1

    penalty = innings.get("penalty_runs", {})
    penalty_total = sum(penalty.values()) if penalty else 0

    print(f"innings {index}: {innings['team']}")
    print(f"  runs from deliveries : {runs}")
    print(f"  innings penalty runs : {penalty_total} {penalty}")
    print(f"  team total           : {runs + penalty_total}/{wickets}")
    print(f"  overs                : {legal_balls // 6}.{legal_balls % 6}")
    print(f"  extras               : {extras} = {sum(extras.values())}")
    print()