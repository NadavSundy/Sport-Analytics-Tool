import json, os, glob, random
from collections import Counter, defaultdict

files = sorted(glob.glob('data/cricsheet/matches/**/*.json', recursive=True))
random.seed(42)
sample = files  # all of them

info_keys = Counter()
meta_versions = Counter()
inn_keys = Counter()
over_keys = Counter()
dl_keys = Counter()
runs_keys = Counter()
extras_kinds = Counter()
wicket_keys = Counter()
dismissal_kinds = Counter()
match_types = Counter()
balls_per_over = Counter()
registry_present = 0
n = 0

for f in sample:
    try:
        d = json.load(open(f))
    except Exception:
        continue
    n += 1
    meta_versions[d.get('meta',{}).get('data_version')] += 1
    i = d.get('info',{})
    for k in i: info_keys[k] += 1
    match_types[i.get('match_type')] += 1
    balls_per_over[i.get('balls_per_over')] += 1
    if 'registry' in i: registry_present += 1
    for inn in d.get('innings',[]):
        for k in inn: inn_keys[k] += 1
        for ov in inn.get('overs',[]):
            for k in ov: over_keys[k] += 1
            for dl in ov.get('deliveries',[]):
                for k in dl: dl_keys[k] += 1
                for k in dl.get('runs',{}): runs_keys[k] += 1
                for k in dl.get('extras',{}): extras_kinds[k] += 1
                for w in dl.get('wickets',[]):
                    for k in w: wicket_keys[k] += 1
                    dismissal_kinds[w.get('kind')] += 1

print('FILES PARSED:', n)
print('\nMETA data_version:', dict(meta_versions))
print('\nMATCH TYPES:', dict(match_types))
print('\nBALLS PER OVER:', dict(balls_per_over))
print('REGISTRY PRESENT:', registry_present, '/', n)
print('\nINFO KEYS (count of matches containing):')
for k,v in info_keys.most_common(): print(f'  {k:28} {v:6}  {100*v/n:5.1f}%')
print('\nINNINGS KEYS:')
for k,v in inn_keys.most_common(): print(f'  {k:28} {v:8}')
print('\nOVER KEYS:')
for k,v in over_keys.most_common(): print(f'  {k:28} {v:8}')
print('\nDELIVERY KEYS:')
for k,v in dl_keys.most_common(): print(f'  {k:28} {v:9}')
print('\nRUNS KEYS:')
for k,v in runs_keys.most_common(): print(f'  {k:28} {v:9}')
print('\nEXTRAS KINDS:')
for k,v in extras_kinds.most_common(): print(f'  {k:28} {v:9}')
print('\nWICKET KEYS:')
for k,v in wicket_keys.most_common(): print(f'  {k:28} {v:9}')
print('\nDISMISSAL KINDS:')
for k,v in dismissal_kinds.most_common(): print(f'  {k:28} {v:9}')