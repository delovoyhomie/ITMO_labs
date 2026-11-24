"""Подготовка проектов GPSS с независимыми повторениями и полными отчётами.

Требуется заголовок проекта, сохранённого проверенной версией GPSS World Core.
Этот скрипт готовит проекты; факт выполнения подтверждается отдельно файлами
.gpr и протоколами, а не самим наличием .gps.
"""
from pathlib import Path
import json, re
from model import ROOT, trace_parameters
from make_gpss import smo_source, service_block
from methodical_tables import GRID, LOADS

DEST=ROOT/'gpss-native'


def project(text):
    prefix=(DEST/'model-header.bin').read_bytes()
    escaped=text.replace('\\','\\\\').replace('{','\\{').replace('}','\\}')
    rtf=r'{\rtf1\ansi\deff0{\fonttbl{\f0\fmodern Courier New;}}\f0\fs20 '+escaped.replace('\n','\\par\r\n')+'}\r\n'
    return prefix+rtf.encode('ascii')+b'\0'


def repeated(text, reps, checkpoints=None):
    split=text.index('        RMULT ')
    body=text[:split]
    tail=text[split:]
    base=661 if 'NETWAIT TABLE' in text else 601
    for rep in range(reps):
        if rep: body+='        CLEAR\n'
        seeds=','.join(str(base+1000*rep+i) for i in range(7))
        if checkpoints is None:
            control=re.sub(r'        RMULT [^\n]*\n','        RMULT '+seeds+'\n',tail)
            control=control.replace('        EXIT 1\n','')
            if 'X$TI' in text:
                control='        INITIAL X$TI,1\n'+control
            body+=control
        else:
            body+='        RMULT '+seeds+'\n'
            body+='        INITIAL X$TI,1\n        INITIAL X$LOST,0\n        INITIAL X$ARRIVED,0\n        INITIAL X$DONE,0\n'
            previous=0
            for n in checkpoints:
                body+=f'        START {n-previous}\n'
                previous=n
    return body+'        EXIT 1\n'


def mg1(law):
    lines=['* Independent M/G/1 validation. a=8, b=4; infinite waiting room.',
           'SERV    STORAGE 1','TW      TABLE P2,0,1,1000','TU      TABLE P3,0,1,1000',
           '        GENERATE (Exponential(1,0,8))','        ASSIGN 1,AC1',
           '        QUEUE BUF','        ENTER SERV','        DEPART BUF',
           '        ASSIGN 2,(AC1-P1)','        TABULATE TW']
    lines+=service_block(4.,law,1)
    lines+=['        LEAVE SERV','        ASSIGN 3,(AC1-P1)','        TABULATE TU',
            '        TERMINATE 1','        RMULT 601,602,603,604,605,606,607',
            '        START 10000,NP','        RESET','        START 200000','        EXIT 1']
    return '\n'.join(lines)+'\n'


def main():
    (DEST/'single').mkdir(parents=True,exist_ok=True)
    (DEST/'series').mkdir(exist_ok=True)
    (DEST/'pilots').mkdir(exist_ok=True)
    records=[]
    sources={p.stem:p.read_text() for p in (ROOT/'gpss').glob('*.txt')}
    for name,text in sources.items():
        (DEST/'single'/(name+'.gps')).write_bytes(project(text))
        if name.startswith('transient_'):continue
        reps=12 if name=='smo_baseline' else 8
        code=repeated(text,reps)
        key='g_'+name
        (DEST/'series'/(key+'.gps')).write_bytes(project(code))
        (DEST/'series'/(key+'.txt')).write_text(code)
        records.append(dict(name=key,canonical=name,repetitions=reps,reports=reps,kind='stationary'))
    _,a,*_=trace_parameters()
    for way in ['b','a']:
        for flow in ['M','T','A']:
            for load in LOADS:
                a0=a if way=='b' else .45*5/load
                b0=load*a/.45 if way=='b' else 5.
                key=f'g_path_{way}_{flow}_{int(load*100)}'
                text=smo_source(key,a0,b0,arrival=flow,n=100000,warmup=0)
                code=repeated(text,12,GRID)
                (DEST/'series'/(key+'.gps')).write_bytes(project(code))
                (DEST/'series'/(key+'.txt')).write_text(code)
                records.append(dict(name=key,kind='transient',way=way,arrival=flow,y=load,a=a0,b=b0,
                                    repetitions=12,checkpoints=list(GRID),reports=12*len(GRID)))
    for law in ['M','E2','H2']:
        key='g_mg1_'+law;code=repeated(mg1(law),12)
        (DEST/'series'/(key+'.gps')).write_bytes(project(code))
        (DEST/'series'/(key+'.txt')).write_text(code)
        records.append(dict(name=key,kind='validation',law=law,repetitions=12,reports=12))
    for load in [.5,.9]:
        key=f'g_smo_E100000_{int(load*100)}'
        text=smo_source(key,a,load*a/.45,buffers=(100000,)*3,n=60000)
        code=repeated(text,8)
        (DEST/'series'/(key+'.gps')).write_bytes(project(code))
        (DEST/'series'/(key+'.txt')).write_text(code)
        records.append(dict(name=key,canonical=key[2:],kind='stationary',repetitions=8,reports=8))
    for key,text,points in [
        ('pilot_repeat_smo',sources['smo_baseline'].replace('START 10000,NP','START 100,NP').replace('START 200000','START 1000'),None),
        ('pilot_repeat_network',sources['closed_H2_M3'].replace('START 10000,NP','START 100,NP').replace('START 30000','START 1000'),None),
        ('pilot_trace',sources['smo_T_50'].replace('START 10000,NP','START 100,NP').replace('START 60000','START 1000'),None),
        ('pilot_path',sources['transient_b_A_90_N100000'],[10,20,50])]:
        (DEST/'pilots'/(key+'.gps')).write_bytes(project(repeated(text,2,points)))
    (DEST/'plan.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
    print('Native series:',len(records),'projects;',sum(r['reports'] for r in records),'expected standard reports')


if __name__=='__main__':main()
