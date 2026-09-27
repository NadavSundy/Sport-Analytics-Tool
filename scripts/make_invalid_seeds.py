"""Produce invalid submission examples by introducing one defect into a valid match."""
import json
from pathlib import Path

SOURCE = Path("database/seeds/matches/729307.json")
OUT = Path("database/seeds/invalid")
OUT.mkdir(parents=True, exist_ok=True)

def load():
    with SOURCE.open(encoding="utf-8") as f:
        return json.load(f)

def write(name, data, note):
    path = OUT / name
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"{name}: {note}")

# 1. A name that is absent from the registry.
d = load()
first = d["innings"][0]["overs"][0]["deliveries"][0]
first["batter"] = "AN Unregistered"
write("unregistered-name.json", d,
      "batter renamed to a person absent from info.registry.people")

# 2. runs.total inconsistent with its parts.
d = load()
first = d["innings"][0]["overs"][0]["deliveries"][0]
first["runs"] = {"batter": 4, "extras": 0, "total": 6}
write("inconsistent-runs.json", d,
      "runs.total set to 6 where batter + extras is 4")

# 3. Striker and non-striker are the same person.
d = load()
first = d["innings"][0]["overs"][0]["deliveries"][0]
first["non_striker"] = first["batter"]
write("striker-equals-non-striker.json", d,
      "non_striker set equal to batter")
# 4. A negative extras count.
d = load()
first = d["innings"][0]["overs"][0]["deliveries"][0]
first["extras"] = {"wides": -1}
write("negative-extra.json", d,
      "extras.wides set to -1 on the first delivery")
