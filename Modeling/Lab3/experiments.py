"""Воспроизводимая программа исследований. python experiments.py"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

from model import (ROOT, smo, network, closed_exact, open_exact, confidence,
                   trace_parameters, VISITS, MEANS, SERVERS)
from markov_reference import solve, SYSTEMS

OUT = ROOT / 'results'
OUT.mkdir(exist_ok=True)
KEYS = ['through','pi','rho','l','m','w','u','sw','su','cvw','cvu']


def aggregate(runs):
    result = {}
    for k in KEYS:
        if k in runs[0]:
            result[k], result[k+'_ci'] = confidence([r[k] for r in runs])
    for j in range(len(runs[0]['nodes'])):
        for k in runs[0]['nodes'][j]:
            result[f'{k}{j+1}'], result[f'{k}{j+1}_ci'] = confidence([r['nodes'][j][k] for r in runs])
    result['reps'] = len(runs)
    return result


def write(name,rows):
    pd.DataFrame(rows).to_csv(OUT / (name+'.csv'),index=False)
    print(name,len(rows),flush=True)


def run_all():
    x,a,cv,q,t1,t2 = trace_parameters()
    metadata = dict(a=a,cv=cv,q=q,t1=t1,t2=t2,
                    seed_rule='160600 + номер повторения; сеть 66000 + номер повторения',
                    part1_load='y_max = max(alpha_j) b / a',
                    observations=60000,repetitions=8,warmup=10000)
    (OUT/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
    ref = solve(SYSTEMS[1])
    baseline = [smo(n=200000,seed=160600+r,a=1.25) for r in range(12)]
    agg = aggregate(baseline)
    rows=[]
    for key in ['through','pi','w','u','l','m']:
        exact=float(ref[-1][key]); sim=agg[key]
        rows.append(dict(metric=key,markov=exact,simulation=sim,ci=agg[key+'_ci'],
                         error_percent=abs(sim-exact)/abs(exact)*100))
    write('baseline',rows)
    write('baseline_replications',[{k:v for k,v in r.items() if k not in ['nodes','max_waiting']} for r in baseline])
    rows=[]
    for kind in ['M','T','A']:
        for load in [.5,.75,.95,.99]:
            b=load*a/.45
            runs=[smo(n=60000,b=b,arrival=kind,seed=160600+r) for r in range(8)]
            rows.append(dict(arrival=kind,y=load,a=a,b=b,**aggregate(runs)))
    write('arrival',rows)
    from scipy.optimize import brentq
    def actual_rho_M(b):
        busy=[]
        for alpha,cap in zip([.30,.45,.25],[3,2,1]):
            y=alpha*b/a
            p=y**np.arange(cap+1);p/=p.sum();busy.append(1-p[0])
        return np.mean(busy)
    rows=[]
    for target in [.5,.75,.95,.99]:
        b=brentq(lambda b:actual_rho_M(b)-target,.001,1e6)
        for flow in ['M','T','A']:
            runs=[smo(n=200000,b=b,arrival=flow,seed=160600+r) for r in range(8)]
            rows.append(dict(target_rho_M=target,arrival=flow,a=a,b=b,**aggregate(runs)))
    write('actual_load',rows)
    rows=[]
    for kind in ['M','E2','H2']:
        for load in [.5,.75,.95,.99]:
            runs=[smo(n=60000,b=load*a/.45,service=(kind,)*3,seed=160600+r) for r in range(8)]
            rows.append(dict(service=kind,y=load,**aggregate(runs)))
    write('service',rows)
    rows=[]
    for load in [.5,.9]:
        for e in [0,1,2,4,8,16,32,64,128,256]:
            runs=[smo(n=60000,b=load*a/.45,buffers=(e,)*3,seed=160600+r) for r in range(8)]
            rows.append(dict(y=load,E=e,lost_total=sum(r['lost'] for r in runs),
                             arrivals_total=8*60000,**aggregate(runs)))
    write('buffer',rows)
    thresholds=[]
    for load in [.5,.9]:
        runs=[smo(n=60000,b=load*a/.45,buffers=(100000,)*3,seed=160600+r) for r in range(8)]
        e=max(max(r['max_waiting']) for r in runs)
        checks=[]
        for cap in [e-1,e]:
            check=[smo(n=60000,b=load*a/.45,buffers=(cap,)*3,seed=160600+r) for r in range(8)]
            checks.append(dict(E=cap,lost=sum(r['lost'] for r in check)))
        thresholds.append(dict(y=load,E_star_observed=e,checks=checks,trials=480000))
    (OUT/'buffer_threshold.json').write_text(json.dumps(thresholds,ensure_ascii=False,indent=2))
    rows=[]
    for k in [1,2,3]:
        for load in [.5,.75,.95,.99]:
            for fixed in [True,False]:
                b=load*a/.45*(1 if fixed else k)
                runs=[smo(n=60000,b=b,servers=(k,)*3,seed=160600+r) for r in range(8)]
                rows.append(dict(K_per_node=k,y=load,fixed_input=fixed,b=b,**aggregate(runs)))
    write('servers',rows)
    rows=[]
    for kind in ['M','T','A']:
        for load in [.5,.9]:
            for n in [10,20,50,100,200,300,600,1000,3000,10000,30000,100000]:
                runs=[smo(n=n,warmup=0,b=load*a/.45,arrival=kind,seed=160600+r) for r in range(12)]
                rows.append(dict(arrival=kind,y=load,N=n,**aggregate(runs)))
    write('transient',rows)
    # Предел буфера проверяется независимой одноканальной моделью M/G/1.
    rows=[]
    for law,cv2 in [('M',1.),('E2',.5),('H2',4.)]:
        a0=8.;b0=4.;rho=b0/a0
        w0=rho*b0*(1+cv2)/(2*(1-rho))
        runs=[smo(n=200000,a=a0,b=b0,routing=(1.,),servers=(1,),buffers=(100000,),
                  service=(law,),seed=160600+r) for r in range(12)]
        rows.append(dict(law=law,exact_w=w0,exact_u=w0+b0,**aggregate(runs)))
    write('mg1_validation',rows)
    closed=[]
    for pop in range(1,31):
        exact=closed_exact(pop)
        closed.append(dict(M=pop,**{k:exact[k] for k in ['through','w','u','l','m']}))
    write('closed_exact',closed)
    # M* — приращение <1%, при всех дальнейших M до 30 оно также <1%.
    gains=np.diff([r['through'] for r in closed])/np.array([r['through'] for r in closed[:-1]])
    critical=next(m for m in range(2,30) if np.all(gains[m-2:]<.01))
    metadata.update(Mstar=critical,capacity=float(np.min(np.asarray(SERVERS)/(VISITS*np.asarray(MEANS)))))
    (OUT/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
    rows=[]
    for law in ['M','E2','H2']:
        for pop in sorted(set([1,2,3,4,6,8,12,20,critical])):
            runs=[network(population=pop,law=law,cycles=30000,seed=66000+r) for r in range(8)]
            rows.append(dict(law=law,M=pop,**aggregate(runs)))
    write('closed',rows)
    rows=[]
    for change,k,b in [('base',SERVERS,MEANS),('faster',(1,4,1),(1.,15.,5.)),('parallel',(1,4,2),MEANS)]:
        runs=[network(population=critical,servers=k,means=b,cycles=40000,seed=66000+r) for r in range(8)]
        rows.append(dict(change=change,M=critical,**aggregate(runs)))
    write('bottleneck',rows)
    rows=[]
    for law in ['M','E2','H2']:
        # Сравнение открытой и закрытой сетей при M=3: точка имеет
        # запас устойчивости. M* изучается отдельно в серии насыщения.
        lam=next(r['through'] for r in pd.read_csv(OUT/'closed.csv').to_dict('records') if r['law']==law and r['M']==3)
        if law=='M':
            lam=closed_exact(3)['through']
        for arrival in ['M','D']:
            runs=[network(lam=lam,law=law,arrival=arrival,cycles=40000,warmup=20000,seed=66000+r) for r in range(8)]
            rows.append(dict(law=law,arrival=arrival,lambda_=lam,comparison='matched',**aggregate(runs)))
        for rho in [.8,.85,.9,.95]:
            lam=rho*metadata['capacity']
            runs=[network(lam=lam,law=law,cycles=40000,warmup=20000,seed=66000+r) for r in range(8)]
            rows.append(dict(law=law,arrival='M',lambda_=lam,comparison='sweep',target_rho=rho,**aggregate(runs)))
    write('open',rows)
    samples=smo(n=60000,b=.95*a/.45,arrival='A',return_samples=True)
    net=network(lam=.9*metadata['capacity'],law='H2',cycles=50000,return_samples=True)
    np.savez_compressed(OUT/'histograms.npz',smo_w=samples['samples_w'],smo_u=samples['samples_u'],
                        network_w=net['samples_w'],network_u=net['samples_u'])
    print('M*',critical,'Xmax',metadata['capacity'],flush=True)


if __name__=='__main__':
    run_all()
