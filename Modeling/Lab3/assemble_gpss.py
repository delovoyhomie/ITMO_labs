"""Строит таблицы исследования только из разобранных стандартных отчётов GPSS."""
from pathlib import Path
import json,re,argparse
import numpy as np
import pandas as pd
from model import ROOT, confidence, trace_parameters
from markov_reference import solve,SYSTEMS
from methodical_tables import summarize,change_percent,stability_table

METRICS=['through','pi','rho','l','m','w','u','sw','su','cvw','cvu','time']


def aggregate(runs):
    result={}
    for k in METRICS:
        v=np.array([r.get(k,np.nan) for r in runs],float)
        if not np.isfinite(v).any():result[k]=result[k+'_ci']=np.nan;continue
        v=v[np.isfinite(v)]
        result[k],result[k+'_ci']=confidence(v) if len(v)>1 else (float(v[0]),np.nan)
    for j in range(len(runs[0]['nodes'])):
        for k in runs[0]['nodes'][j]:
            v=np.array([r['nodes'][j][k] for r in runs],float)
            if np.isfinite(v).all():result[f'{k}{j+1}'],result[f'{k}{j+1}_ci']=confidence(v)
    result['reps']=len(runs)
    # GPSS печатает большинство средних с тремя знаками после запятой.
    for key,delta in [('w',.0005),('u',.0005),('sw',.0005),('su',.0005),('rho',.0005),('l',.0015)]:
        result[key+'_ci']+=delta
    result['m_ci']+=0 if np.std([r['m'] for r in runs])==0 else .003
    return result


def main(parsed,partial=False):
    dest=ROOT/'results'/'gpss';dest.mkdir(exist_ok=True)
    records=json.loads((ROOT/'gpss-native'/'plan.json').read_text())
    allruns={};available=[]
    for rec in records:
        file=Path(parsed)/rec['name']/'parsed.json'
        if not file.exists():
            if partial:continue
            raise FileNotFoundError(file)
        allruns[rec['name']]=json.loads(file.read_text());available.append(rec)
    def get(key):return allruns.get('g_'+key)
    def write(name,rows):
        pd.DataFrame(rows).to_csv(dest/(name+'.csv'),index=False)
        print(name,len(rows),flush=True)
    ref=solve(SYSTEMS[1])[-1]
    if get('smo_baseline'):
        a=aggregate(get('smo_baseline'))
        write('baseline',[dict(metric=k,markov=float(ref[k]),simulation=a[k],ci=a[k+'_ci'],
                               error_percent=abs(a[k]/ref[k]-1)*100) for k in ['through','pi','w','u','l','m']])
        write('baseline_replications',[{k:r[k] for k in METRICS} for r in get('smo_baseline')])
    selectors={
        'arrival':(['arrival','y','a','b'],lambda r:f'smo_{r.arrival}_{round(r.y*100)}'),
        'actual_load':(['target_rho_M','arrival','a','b'],lambda r:f'actual_load_{r.arrival}_{round(r.target_rho_M*100)}'),
        'service':(['service','y'],lambda r:f'smo_service_{r.service}_{round(r.y*100)}'),
        'buffer':(['y','E'],lambda r:f'smo_E{r.E}_{round(r.y*100)}'),
        'servers':(['K_per_node','y','fixed_input','b'],lambda r:f'smo_K{r.K_per_node}_{round(r.y*100)}_'+('fixed' if r.fixed_input else 'same_load')),
        'closed':(['law','M'],lambda r:f'closed_{r.law}_M{r.M}'),
        'bottleneck':(['change','M'],lambda r:{'base':'closed_M_M6','faster':'closed_faster','parallel':'closed_parallel'}[r.change]),
        'open':(['law','arrival','lambda_','comparison','target_rho'],lambda r:f'open_matched_{r.law}_{r.arrival}' if r.comparison=='matched' else f'open_{r.law}_{round(r.target_rho*100)}')}
    for file,(params,key) in selectors.items():
        template=pd.read_csv(ROOT/'results'/(file+'.csv'));rows=[]
        if file=='closed':
            template=pd.concat([template,pd.DataFrame([{'law':'M','M':m} for m in [5,7,30]])],ignore_index=True).drop_duplicates(['law','M'])
        if file=='buffer':
            refinements=[{'y':r['y'],'E':r['E']} for r in records if r['kind']=='buffer_refinement']
            template=pd.concat([template,pd.DataFrame(refinements)],ignore_index=True).drop_duplicates(['y','E'])
        for row in template.itertuples():
            name=key(row);runs=get(name)
            if runs is None:continue
            inputs={k:getattr(row,k) for k in params}
            if file=='open':
                text=(ROOT/'gpss-native'/'series'/('g_'+name+'.txt')).read_text()
                m=re.search(r'GENERATE \(Exponential\(1,0,('+r'[-+0-9.eE]+'+r')\)\)',text)
                if m:inputs['lambda_']=1/float(m[1])
                else:
                    m=re.search(r'^\s*GENERATE\s+([-+0-9.eE]+)\s*$',text,re.M)
                    inputs['lambda_']=1/float(m[1])
            values=aggregate(runs)
            if file=='buffer':values.update(lost_total=sum(r['lost'] for r in runs),
                arrivals_total=sum(r['arrived'] for r in runs),outcomes_total=sum(r['n'] for r in runs))
            rows.append(dict(**inputs,**values))
        if rows:write(file,rows)
    rows=[]
    for law,exact in [('M',4.),('E2',3.),('H2',10.)]:
        runs=get('mg1_'+law)
        if runs:rows.append(dict(law=law,exact_w=exact,exact_u=exact+4,**aggregate(runs)))
    if rows:write('mg1_validation',rows)
    raw=[];forms=[]
    for rec in available:
        if rec['kind']!='transient':continue
        for r in allruns[rec['name']]:
            raw.append(dict(way=rec['way'],arrival=rec['arrival'],y=rec['y'],a=rec['a'],b=rec['b'],replication=r['replication'],
                N=r['N'],arrived=r['arrived'],lost=r['lost'],time=r['time'],area_q=r['l']*r['time'],
                area_c=3*r['rho']*r['time'],nw=r['nw'],nu=r['nu'],
                w=r['nw']*r['w'],w2=(r['nw']-1)*r['sw']**2+r['nw']*r['w']**2,
                u=r['nu']*r['u'],u2=(r['nu']-1)*r['su']**2+r['nu']*r['u']**2))
    if raw:
        frame=pd.DataFrame(raw)
        for (way,flow,load),v in frame.groupby(['way','arrival','y']):
            previous_pi=previous_w=None
            for n,g in v.groupby('N',sort=True):
                row=summarize(g.to_dict('records'))
                row.update(way=way,arrival=flow,y=load,a=g.a.iloc[0],b=g.b.iloc[0])
                row['w_ci']+=.0005;row['u_ci']+=.0005
                row['P_percent']=change_percent(row['pi'],previous_pi)
                row['O_percent']=change_percent(row['w'],previous_w)
                row['D_percent']=row['w_ci']/row['w']*100 if row['w'] else np.nan
                previous_pi,previous_w=row['pi'],row['w'];forms.append(row)
        write('form2_replications',raw);write('form2',forms)
        stability_table(pd.DataFrame(forms)).to_csv(dest/'transient_stability.csv',index=False)
    protocols=[]
    for kind in ['closed','open']:
        for law in ['M','E2','H2']:
            runs=get(f'closed_{law}_M3' if kind=='closed' else f'open_matched_{law}_M')
            if runs:
                for r in runs:protocols.append(dict(kind=kind,law=law,replication=r['replication'],cycles=r['n'],duration=r['time'],through=r['through'],w=r['w'],u=r['u']))
    if protocols:write('network_protocols',protocols)
    histogram={}
    for prefix,key in [('smo','smo_A_95'),('network','open_H2_90')]:
        runs=get(key)
        if not runs:continue
        for suffix,table in [('w','TW' if prefix=='smo' else 'NETWAIT'),('u','TU' if prefix=='smo' else 'NETTIME')]:
            pooled={};count=sum(r['tables'][table]['n'] for r in runs)
            total=sum(r['tables'][table]['n']*r['tables'][table]['mean'] for r in runs)
            ss=sum((r['tables'][table]['n']-1)*r['tables'][table]['sd']**2+r['tables'][table]['n']*r['tables'][table]['mean']**2 for r in runs)
            for r in runs:
                for lo,hi,freq in r['tables'][table]['bins']:pooled[lo,hi]=pooled.get((lo,hi),0)+freq
            mean=total/count;sd=np.sqrt(max(0,(ss-total**2/count)/(count-1)))
            bins=[[lo,hi,freq] for (lo,hi),freq in sorted(pooled.items(),key=lambda p:float('-inf') if p[0][0] is None else p[0][0])]
            zero=sum(freq for lo,hi,freq in bins if hi==0)
            pzero=zero/count
            positive_mean=mean/(1-pzero) if pzero<1 else np.nan
            positive_cv=np.sqrt(max(0,(1-pzero)*(ss/count)/mean**2-1)) if mean and pzero<1 else np.nan
            histogram[prefix+'_'+suffix]=dict(n=count,mean=mean,sd=sd,cv=sd/mean if mean else None,bins=bins,
                p_zero=pzero,mean_positive=positive_mean,cv_positive=positive_cv)
    (dest/'histograms.json').write_text(json.dumps(histogram,ensure_ascii=False,indent=2))
    meta=json.loads((ROOT/'results'/'metadata.json').read_text())
    meta.update(engine='GPSS World Core',seed_rule='601+r*1000+i; сеть 661+r*1000+i, r=0,...,R-1, i=0,...,6',
                observations_definition='Завершения обслуживания + отказы; у сетей — завершённые циклы',
                native_projects=len(available),native_reports=sum(len(allruns[r['name']]) for r in available),
                native_complete=(not partial and len(available)==len(records) and (dest/'buffer_threshold.json').exists()),
                expected_native_reports=sum(r['reports'] for r in records),
                report_rounding=.001,rounding_allowance_in_CI=True)
    (dest/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
    # Точный сетевой контроль не является результатом имитации.
    pd.read_csv(ROOT/'results'/'closed_exact.csv').to_csv(dest/'closed_exact.csv',index=False)
    print('Native parsed:',len(available),'of',len(records),'projects')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('parsed');parser.add_argument('--partial',action='store_true')
    args=parser.parse_args();main(args.parsed,args.partial)
