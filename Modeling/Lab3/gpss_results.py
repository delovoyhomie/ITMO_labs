"""Чтение стандартных отчётов GPSS; числа не подставляются из Python-модели."""
from pathlib import Path
import json,re,subprocess,zipfile
import numpy as np
from model import ROOT

NUMBER=r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][-+]?\d+)?'


def parse_report(text):
    lines=text.splitlines()
    match=re.search(r'START TIME\s+END TIME[^\n]*\n\s*('+NUMBER+r')\s+('+NUMBER+r')',text)
    if not match:raise ValueError('Нет заголовка стандартного отчёта GPSS')
    start,end=map(float,match.groups());period=end-start
    queues={};storages={};tables={};values={};blocks=[]
    section=None;current=None
    for line in lines:
        if line.startswith('QUEUE '):section='queue';continue
        if line.startswith('STORAGE '):section='storage';continue
        if line.startswith('TABLE '):section='table';continue
        if line.startswith('SAVEVALUE '):section='value';continue
        if line.startswith('FEC XN'):section=None;continue
        block=re.match(r'^\s*(?:([A-Z][A-Z0-9_]*)\s+)?(\d+)\s+([A-Z]+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$',line)
        if block:
            label,loc,op,entries,live,retry=block.groups()
            blocks.append(dict(label=label,loc=int(loc),op=op,entries=int(entries),live=int(live)))
        if not line.strip():continue
        parts=line.split()
        if section=='queue' and len(parts)==9 and re.fullmatch(r'[A-Z][A-Z0-9_]*',parts[0]):
            v=list(map(float,parts[1:]));queues[parts[0]]=dict(maximum=int(v[0]),current=int(v[1]),entries=int(v[2]),zero=int(v[3]),l=v[4],w=v[5])
        elif section=='storage' and len(parts)==11 and re.fullmatch(r'[A-Z][A-Z0-9_]*',parts[0]):
            v=list(map(float,parts[1:]));storages[parts[0]]=dict(capacity=int(v[0]),entries=int(v[4]),busy=v[6],rho=v[7])
        elif section=='value' and len(parts)==3 and re.fullmatch(r'[A-Z][A-Z0-9_]*',parts[0]):
            values[parts[0]]=float(parts[2])
        elif section=='table':
            head=re.match(r'^\s*([A-Z][A-Z0-9_]*)\s+('+NUMBER+r')\s+('+NUMBER+r')\s+\d+\s*$',line)
            if head:
                current=head[1];tables[current]=dict(mean=float(head[2]),sd=float(head[3]),bins=[])
                continue
            freq=re.match(r'^\s*(_|'+NUMBER+r')\s+-\s+(_|'+NUMBER+r')\s+(\d+)\s+('+NUMBER+r')\s*$',line)
            if freq and current:
                lo,hi,count,_=freq.groups()
                tables[current]['bins'].append([None if lo=='_' else float(lo),None if hi=='_' else float(hi),int(count)])
    for t in tables.values():t['n']=sum(row[2] for row in t['bins'])
    net='NETTIME' in tables
    tw=tables['NETWAIT' if net else 'TW'];tu=tables['NETTIME' if net else 'TU']
    completed=int(values.get('CYCLES',values.get('DONE',tu['n'])))
    lost=int(values.get('LOST',0));n=completed+lost
    l=sum(q['l'] for q in queues.values());busy=sum(s['busy'] for s in storages.values())
    out=dict(time=period,completed=completed,lost=lost,n=n,arrived=int(values.get('ARRIVED',n)),
             through=completed/period,pi=lost/n if n else 0.,l=l,m=l+busy,
             rho=busy/sum(s['capacity'] for s in storages.values()),
             w=tw['mean'],u=tu['mean'],sw=tw['sd'],su=tu['sd'],
             cvw=tw['sd']/tw['mean'] if tw['mean'] else np.nan,
             cvu=tu['sd']/tu['mean'] if tu['mean'] else np.nan,
             nw=tw['n'],nu=tu['n'],tables=tables,queues=queues,storages=storages,
             live=sum(b['live'] for b in blocks),nodes=[])
    for j,(name,s) in enumerate(storages.items(),1):
        number=int(re.search(r'\d+$',name)[0]) if re.search(r'\d+$',name) else 1
        q=queues.get('BUF'+str(number),queues.get('BUF',{}))
        wj=tables.get('TWAIT'+str(number),{}).get('mean',q.get('w',np.nan))
        uj=tables.get('TSTAY'+str(number),{}).get('mean',np.nan)
        node=dict(rho=s['rho'],l=q.get('l',0.),m=q.get('l',0.)+s['busy'],through=s['entries']/period,w=wj,u=uj)
        out['nodes'].append((number,node))
    out['nodes']=[node for _,node in sorted(out['nodes'])]
    return out


def unpack_case(archive,record,destination):
    """Выбирается последняя симуляция; старые неудачные попытки не смешиваются."""
    name=record['name'];directory=Path(destination)/name;directory.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        candidates=[]
        for path in z.namelist():
            m=re.fullmatch(re.escape(name)+r'\.(\d+)\.(\d+)\.gpr',Path(path).name)
            if m:candidates.append((int(m[1]),int(m[2]),path))
        if not candidates:raise ValueError(name+': стандартные отчёты не созданы')
        version=max(v for v,i,p in candidates)
        selected=sorted((i,p) for v,i,p in candidates if v==version)
        if len(selected)!=record['reports']:
            raise ValueError(f'{name}: отчётов {len(selected)}, ожидалось {record["reports"]}')
        rtfs=[]
        for index,path in selected:
            raw=z.read(path);offset=raw.index(b'{\\rtf')
            target=directory/Path(path).name;target.write_bytes(raw)
            rtf=target.with_suffix('.rtf');rtf.write_bytes(raw[offset:].rstrip(b'\0'));rtfs.append(rtf)
        model=next((p for p in z.namelist() if Path(p).name==name+'.gps'),None)
        if model:(directory/(name+'.gps')).write_bytes(z.read(model))
    subprocess.run(['textutil','-convert','txt',*[str(p) for p in rtfs]],check=True,capture_output=True)
    rows=[]
    for (index,_),rtf in zip(selected,rtfs):
        row=parse_report(rtf.with_suffix('.txt').read_text())
        row.update(report_number=index,model=name)
        if record['kind']=='transient':
            pos=(index-1)%len(record['checkpoints'])
            row.update(replication=(index-1)//len(record['checkpoints'])+1,N=record['checkpoints'][pos])
            assert row['n']==row['N'],(name,index,row['n'],row['N'])
        else:row['replication']=index
        if record.get('canonical','').startswith('closed_'):
            source=(ROOT/'gpss-native'/'series'/(name+'.txt')).read_text()
            m=re.search(r'GENERATE ,,,(\d+)',source)
            if m:
                population=int(m[1]);assert row['live']==population,(name,row['live'],population)
                row['m']=population
        rows.append(row)
    (directory/'parsed.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
    return rows


def read_case(directory,name):
    return json.loads((Path(directory)/name/'parsed.json').read_text())
