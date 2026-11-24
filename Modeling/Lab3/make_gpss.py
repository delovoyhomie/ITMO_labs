"""Тексты моделей GPSS World. Никаких расчётных результатов здесь нет."""
from pathlib import Path
import json
import numpy as np
from model import ROOT, trace_parameters, closed_exact

DEST=ROOT/'gpss'


def duration(mean,law,stream):
    if law=='M':return f'(Exponential({stream},0,{mean:.12g}))'
    if law=='E2':return f'(Exponential({stream},0,{mean/2:.12g}) + Exponential({stream+1},0,{mean/2:.12g}))'
    if law=='D':return f'{mean:.12g}'
    raise ValueError(law)


def service_block(mean,law,j):
    stream={1:3,2:5,3:6}[j]
    if law!='H2':return [f'        ADVANCE {duration(mean,law,stream)}']
    q=(1+np.sqrt(3/5))/2
    return [f'        TRANSFER {q:.12g},SLOW{j},FAST{j}',
            f'FAST{j}   ADVANCE {duration(mean/(2*q),"M",stream)}',
            f'        TRANSFER ,FIN{j}',
            f'SLOW{j}   ADVANCE {duration(mean/(2*(1-q)),"M",stream+1)}',
            f'FIN{j}    BUFFER']


def smo_source(name,a,b,arrival='M',service=('M','M','E2'),buffers=(2,1,0),servers=(1,1,1),n=200000,warmup=10000):
    x,ax,cv,q,t1,t2=trace_parameters()
    lines=[f'* UIR3, variant 16/6/6. {name}',
           '* K is the number of servers; E is WAITING capacity.',
           '* Local routing 0.30 / 0.45 / 0.25; no rerouting after rejection.',
           '        INITIAL X$TI,1',
           'TW      TABLE P2,0,1,300','TU      TABLE P3,0,1,300']
    lines += [f'NODE{j+1}   STORAGE {k}' for j,k in enumerate(servers)]
    if arrival=='T':
        lines += ['TRACE16 FUNCTION X$TI,D300']
        lines += [f'{i+1},{v:.12g}' + ('/' if i<299 else '') for i,v in enumerate(x*a/ax)]
    lines+=['        GENERATE ,,,1']
    if arrival=='A':
        lines += [f'SOURCE  TRANSFER {q:.12g},ASLOW,AFAST',
                  f'AFAST   ADVANCE {duration(t1*a/ax,"M",1)}',
                  '        TRANSFER ,EMIT',f'ASLOW   ADVANCE {duration(t2*a/ax,"M",2)}']
    else:
        lines += [f'SOURCE  ADVANCE '+('FN$TRACE16' if arrival=='T' else duration(a,arrival,1))]
    lines += ['EMIT    SPLIT 1,ARRIVE','        SAVEVALUE TI+,1','        TEST LE X$TI,300,REWIND',
              '        TRANSFER ,SOURCE','REWIND  SAVEVALUE TI,1','        TRANSFER ,SOURCE',
              'ARRIVE  SAVEVALUE ARRIVED+,1','        ASSIGN 1,AC1',
              '        TRANSFER .30,ROUTE23,IN1',
              'ROUTE23 TRANSFER 0.642857142857,IN3,IN2']
    for j in range(1,4):
        lines += [f'IN{j}     TEST L (S$NODE{j}+Q$BUF{j}),{servers[j-1]+buffers[j-1]},LOSS',
                  f'        QUEUE BUF{j}',f'        ENTER NODE{j}',f'        DEPART BUF{j}',
                  '        ASSIGN 2,(AC1-P1)', '        TABULATE TW']
        lines += service_block(b,service[j-1],j)
        lines += [f'        LEAVE NODE{j}','        ASSIGN 3,(AC1-P1)',
                  '        TABULATE TU',
                  '        SAVEVALUE DONE+,1','        TERMINATE 1']
    lines += ['LOSS    SAVEVALUE LOST+,1','        TERMINATE 1',
              '* RESET preserves the current state.',
              '        RMULT 601,602,603,604,605,606,607']
    if warmup: lines += [f'        START {warmup},NP','        RESET']
    lines += ['        INITIAL X$LOST,0',
              '        INITIAL X$ARRIVED,0','        INITIAL X$DONE,0',
              f'        START {n}','        EXIT 1']
    return '\n'.join(lines)+'\n'


def network_source(name,pop=None,lam=None,law='M',arrival='M',servers=(1,4,1),means=(1.,15.,10.),cycles=None):
    cycles=(30000 if pop else 40000) if cycles is None else cycles
    warmup=10000 if pop else 20000
    lines=[f'* UIR3 network M1. Variant A/B = 6/6. {name}',
           '* Probabilities after node 1: exit/renew .2, node 2 .3, node 3 .5.',
           '* Nodes 2 and 3 always return to node 1. FIFO; infinite queues.',
           'NETWAIT TABLE P11,0,10,1000','NETTIME TABLE P14,0,10,1000']
    lines += [f'NODE{j+1}   STORAGE {k}' for j,k in enumerate(servers)]
    lines += [f'TWAIT{j}  TABLE P13,0,5,1000' for j in range(1,4)]
    lines += [f'TSTAY{j}  TABLE P15,0,5,1000' for j in range(1,4)]
    if pop:
        lines += [f'        GENERATE ,,,{pop}', '        TRANSFER ,CYCLE']
    else:
        lines += ['        GENERATE '+duration(1/lam,arrival,1)]
    lines += ['CYCLE   ASSIGN 10,AC1','        ASSIGN 11,0','        TRANSFER ,IN1']
    for j in range(1,4):
        lines += [f'IN{j}     ASSIGN 12,AC1',f'        QUEUE BUF{j}',f'        ENTER NODE{j}',
                  f'        DEPART BUF{j}','        ASSIGN 13,(AC1-P12)',
                  '        ASSIGN 11+,P13']
        lines += service_block(means[j-1],law if j==3 else 'M',j)
        lines += [f'        LEAVE NODE{j}','        ASSIGN 15,(AC1-P12)',
                  f'        TABULATE TWAIT{j}',f'        TABULATE TSTAY{j}']
        if j==1:
            lines += ['        TRANSFER .2,BRANCH,CLOSEC',
                      'BRANCH  TRANSFER .375,IN3,IN2']
        else:
            lines += ['        TRANSFER ,IN1']
    lines += ['CLOSEC  ASSIGN 14,(AC1-P10)','        TABULATE NETWAIT','        TABULATE NETTIME',
              '        SAVEVALUE CYCLES+,1']
    if pop:
        # Termination of a copy decrements the counter while preserving M originals.
        lines += ['        SPLIT 1,TICK','        TRANSFER ,CYCLE','TICK    TERMINATE 1']
    else:
        lines += ['        TERMINATE 1']
    lines += ['        RMULT 661,662,663,664,665,666,667',
              f'        START {warmup},NP','        RESET','        INITIAL X$CYCLES,0',
              f'        START {cycles}','        EXIT 1']
    return '\n'.join(lines)+'\n'


def main():
    DEST.mkdir(exist_ok=True)
    old_manifest=DEST/'manifest.json'
    previous=json.loads(old_manifest.read_text())['models'] if old_manifest.exists() else []
    _,a,*_=trace_parameters()
    models={}
    models['smo_baseline']=smo_source('baseline',1.25,5.)
    for flow in ['M','T','A']:
        for load in [.5,.75,.95,.99]:
            name=f'smo_{flow}_{int(load*100)}'
            models[name]=smo_source(name,a,load*a/.45,arrival=flow,n=60000)
    for law in ['M','E2','H2']:
        for load in [.5,.75,.95,.99]:
            name=f'smo_service_{law}_{int(load*100)}'
            models[name]=smo_source(name,a,load*a/.45,service=(law,)*3,n=60000)
        for m in ([1,2,3,4,5,6,7,8,12,20,30] if law=='M' else [1,2,3,4,6,8,12,20]):
            name=f'closed_{law}_M{m}'
            models[name]=network_source(name,pop=m,law=law)
        for rho in [.8,.85,.9,.95]:
            name=f'open_{law}_{int(rho*100)}'
            models[name]=network_source(name,lam=rho*.04,law=law)
        import pandas as pd
        matched=pd.read_csv(ROOT/'results'/'open.csv')
        lam=float(matched[(matched.law==law)&(matched.comparison=='matched')].lambda_.iloc[0])
        native_closed=ROOT/'results'/'gpss'/'closed.csv'
        if native_closed.exists():
            measured=pd.read_csv(native_closed)
            point=measured[(measured.law==law)&(measured.M==3)]
            if len(point):lam=float(point.through.iloc[0])
        for flow in ['M','D']:
            name=f'open_matched_{law}_{flow}'
            models[name]=network_source(name,lam=lam,arrival=flow,law=law)
    for change,k,b in [('faster',(1,4,1),(1.,15.,5.)),('parallel',(1,4,2),(1.,15.,10.))]:
        name='closed_'+change
        models[name]=network_source(name,pop=6,servers=k,means=b,cycles=40000)
    for e in [0,1,2,4,8,16,32,64,128,256]:
        for y in [.5,.9]:
            name=f'smo_E{e}_{int(y*100)}'
            models[name]=smo_source(name,a,y*a/.45,buffers=(e,)*3,n=60000)
    threshold_files=[ROOT/'results'/'buffer_threshold.json', ROOT/'results'/'gpss'/'buffer_threshold.json']
    refinements=[item for file in threshold_files if file.exists() for item in json.loads(file.read_text())]
    for item in refinements:
        for e in [item['E_star_observed']-1,item['E_star_observed']]:
            name=f'smo_E{e}_{int(item["y"]*100)}'
            models[name]=smo_source(name,a,item['y']*a/.45,buffers=(e,)*3,n=60000)
    for row in pd.read_csv(ROOT/'results'/'actual_load.csv').itertuples():
        name=f'actual_load_{row.arrival}_{int(row.target_rho_M*100)}'
        models[name]=smo_source(name,row.a,row.b,arrival=row.arrival,n=200000)
    from methodical_tables import GRID, LOADS
    for way in ['b','a']:
        for flow in ['M','T','A']:
            for y in LOADS:
                a0=a if way=='b' else .45*5/y
                b0=y*a/.45 if way=='b' else 5.
                for n in GRID:
                    name=f'transient_{way}_{flow}_{int(y*100)}_N{n}'
                    models[name]=smo_source(name,a0,b0,arrival=flow,n=n,warmup=0)
    for k in [1,2,3]:
        for y in [.5,.75,.95,.99]:
            for fixed in [True,False]:
                name=f'smo_K{k}_{int(y*100)}_'+('fixed' if fixed else 'same_load')
                models[name]=smo_source(name,a,y*a/.45*(1 if fixed else k),servers=(k,)*3,n=60000)
    for name,text in models.items():
        (DEST/(name+'.txt')).write_text(text,encoding='ascii')
    for obsolete in set(previous)-set(models):
        (DEST/(obsolete+'.txt')).unlink(missing_ok=True)
    (DEST/'manifest.json').write_text(json.dumps({'models':list(models),'encoding':'ASCII','execution_verified':False,
        'usage':'Создать новый Model в GPSS World, вставить текст .txt, Create Simulation. Команды START включены.'},ensure_ascii=False,indent=2))
    print(len(models),'GPSS models')


if __name__=='__main__':main()
