import json, glob
from collections import Counter, defaultdict

files = sorted(glob.glob('data/cricsheet/matches/**/*.json', recursive=True))
collide = 0
total_ov = 0
max_dl = 0
max_ex = None
super_over_files = []
repl_examples = []
review_examples = []
miscount_examples = []
penalty_examples = []
nonboundary_examples = []
missing_examples = Counter()
absent_examples = []
name_to_ids = defaultdict(set)
id_to_names = defaultdict(set)
multi_fielder = 0
fielder_dicts = Counter()

for f in files:
    try: d=json.load(open(f))
    except: continue
    i=d['info']
    for nm,pid in i.get('registry',{}).get('people',{}).items():
        name_to_ids[nm].add(pid); id_to_names[pid].add(nm)
    if 'missing' in i:
        missing_examples[json.dumps(i['missing'])[:120]] += 1
    for ii,inn in enumerate(d['innings']):
        if 'super_over' in inn: super_over_files.append(f)
        if 'miscounted_overs' in inn and len(miscount_examples)<2:
            miscount_examples.append((f,inn['miscounted_overs']))
        if 'penalty_runs' in inn and len(penalty_examples)<3:
            penalty_examples.append((f,inn['penalty_runs']))
        if 'absent_hurt' in inn and len(absent_examples)<2:
            absent_examples.append((f,inn['absent_hurt']))
        for ov in inn['overs']:
            total_ov += 1
            seen=Counter(dl.get('actual_delivery') for dl in ov['deliveries'])
            if any(v>1 for v in seen.values()): collide += 1
            if len(ov['deliveries'])>max_dl:
                max_dl=len(ov['deliveries']); max_ex=(f,ii,ov['over'])
            for dl in ov['deliveries']:
                if 'replacements' in dl and len(repl_examples)<3:
                    repl_examples.append((f,dl['replacements']))
                if 'review' in dl and len(review_examples)<3:
                    review_examples.append((f,dl['review']))
                if dl['runs'].get('non_boundary') and len(nonboundary_examples)<3:
                    nonboundary_examples.append((f,dl['runs'],dl.get('extras')))
                for w in dl.get('wickets',[]):
                    fs=w.get('fielders',[])
                    if len(fs)>1: multi_fielder+=1
                    for fd in fs: fielder_dicts[tuple(sorted(fd.keys()))]+=1

print('OVERS TOTAL:', total_ov)
print('OVERS WHERE actual_delivery COLLIDES:', collide, f'({100*collide/total_ov:.1f}%)')
print('LONGEST OVER:', max_dl, 'deliveries at', max_ex)
print('\nSUPER OVER innings count:', len(super_over_files), 'in', len(set(super_over_files)), 'files')
print('\nNAMES MAPPING TO >1 ID:', sum(1 for k,v in name_to_ids.items() if len(v)>1))
print('IDS MAPPING TO >1 NAME:', sum(1 for k,v in id_to_names.items() if len(v)>1))
print('EXAMPLES id->names:', [ (k,sorted(v)) for k,v in id_to_names.items() if len(v)>1 ][:5])
print('EXAMPLES name->ids:', [ (k,sorted(v)) for k,v in name_to_ids.items() if len(v)>1 ][:5])
print('TOTAL DISTINCT IDS:', len(id_to_names), 'DISTINCT NAMES:', len(name_to_ids))
print('\nFIELDER OBJECT SHAPES:', dict(fielder_dicts))
print('MULTI-FIELDER DISMISSALS:', multi_fielder)
print('\nREPLACEMENTS:', json.dumps(repl_examples, indent=1)[:900])
print('\nREVIEW:', json.dumps(review_examples, indent=1)[:600])
print('\nMISCOUNTED:', miscount_examples)
print('\nPENALTY:', penalty_examples)
print('\nABSENT HURT:', absent_examples)
print('\nNON_BOUNDARY:', nonboundary_examples)
print('\nMISSING (top):', missing_examples.most_common(5))