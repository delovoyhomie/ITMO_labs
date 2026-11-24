"""Проверяет полноту стандартных отчётов GPSS и собирает проверяемый архив."""
from pathlib import Path
import argparse, hashlib, json, zipfile
import numpy as np
import pandas as pd
from model import ROOT


def main(parsed):
    plan=json.loads((ROOT/'gpss-native'/'plan.json').read_text())
    proofs=[];raw=[]
    for rec in plan:
        folder=Path(parsed)/rec['name']
        runs=json.loads((folder/'parsed.json').read_text())
        assert len(runs)==rec['reports'],rec['name']
        native=list(folder.glob('*.gpr'))
        assert len(native)==rec['reports'],(rec['name'],len(native))
        for r in runs:
            assert r['n']>0 and r['time']>0
            assert abs(r['completed']+r['lost']-r['n'])==0
            for k in ['through','pi','rho','l','m','w','u']:
                assert np.isfinite(r[k]),(rec['name'],k)
            if rec['kind']=='transient':
                assert r['n']==r['N']
                assert r['arrived']==r['n']+r['live']-1,(rec['name'],r['report_number'])
            if rec.get('canonical','').startswith('closed_'):
                assert r['m']==r['live'],rec['name']
        for path in sorted(folder.iterdir()):
            if path.suffix not in ['.gpr','.txt','.json','.gps']:continue
            proofs.append(path)
        raw.append(dict(name=rec['name'],reports=len(runs),kind=rec['kind']))
    dest=ROOT/'gpss-reports.zip'
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for path in proofs:z.write(path,arcname=str(Path(path.parent.name)/path.name))
    manifest=dict(engine='GPSS World Core',projects=len(plan),reports=sum(r['reports'] for r in plan),
        archive=dest.name,archive_sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
        models=[dict(**r,source_sha256=hashlib.sha256((ROOT/'gpss-native'/'series'/(r['name']+'.txt')).read_bytes()).hexdigest()) for r in raw])
    (ROOT/'gpss-native'/'execution-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in manifest.items() if k!='models'},indent=2))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('parsed');main(p.parse_args().parsed)
