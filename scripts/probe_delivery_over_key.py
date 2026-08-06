"""Confirm the delivery-level `over` key never disagrees with its parent over."""

import glob
import json

total = 0
disagree = 0
files = set()

for path in sorted(glob.glob("data/cricsheet/matches/**/*.json", recursive=True)):
    match = json.load(open(path))
    for innings in match["innings"]:
        for over in innings["overs"]:
            for delivery in over["deliveries"]:
                if "over" not in delivery:
                    continue
                total += 1
                files.add(path)
                if delivery["over"] != over["over"]:
                    disagree += 1
                    print(f"MISMATCH {path}: {delivery['over']} vs {over['over']}")

print(f"deliveries carrying an over key: {total}")
print(f"disagreements with parent over: {disagree}")
print(f"files affected: {len(files)}")