"""Графики строятся только по сохранённым экспериментальным данным."""
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from model import ROOT, closed_exact, open_exact
from results_source import current_results

RESULTS,NATIVE=current_results()
FIGS=ROOT/'report-source'/'figures'
NAMES={'M':'Простейший','T':'Трасса','A':r'Аппроксимация $H_2$','E2':r'Эрланг $E_2$','H2':r'Гиперэксп. $H_2$'}
LAWS={'M':r'Экспоненциальный $M$','E2':r'Эрланг $E_2$','H2':r'Гиперэксп. $H_2$'}
STYLES=[dict(color='black',marker='o',ls='-'),dict(color='.35',marker='s',ls='--'),
        dict(color='.60',marker='^',ls='-.')]
plt.rcParams.update({'font.family':'DejaVu Serif','font.size':10,'axes.grid':True,
                     'grid.alpha':.25,'legend.fontsize':9,'savefig.bbox':'tight'})


def save(fig,name):
    FIGS.mkdir(exist_ok=True)
    fig.tight_layout()
    fig.savefig(FIGS/(name+'.pdf'))
    fig.savefig(FIGS/(name+'.png'),dpi=160)
    plt.close(fig)


def make_figures():
    for file,group,x,keys,labels in [
        ('arrival','arrival','y',['w','pi'],['Среднее ожидание w, с','Вероятность потери π']),
        ('service','service','y',['w','u'],['Среднее ожидание w, с','Среднее пребывание u, с']),
        ('buffer','y','E',['w','pi'],['Среднее ожидание w, с','Вероятность потери π'])]:
        df=pd.read_csv(RESULTS/(file+'.csv'));fig,axs=plt.subplots(1,2,figsize=(10,3.45))
        for style,(name,d) in zip(STYLES,df.groupby(group,sort=False)):
            d=d.sort_values(x)
            for ax,key,label in zip(axs,keys,labels):
                names=LAWS if file=='service' else NAMES
                ax.errorbar(d[x],d[key],yerr=d[key+'_ci'],label=names.get(name,f'y = {name}'),capsize=2,**style)
                ax.set_ylabel(label);ax.set_xlabel('Нагрузка '+r'$y_{max}$' if x=='y' else 'Ёмкость накопителя E')
                ax.legend(); ax.set_ylim(bottom=0)
                if x=='E':ax.set_xscale('symlog',linthresh=1)
        save(fig,file)
    df=pd.read_csv(RESULTS/'actual_load.csv');fig,axs=plt.subplots(1,2,figsize=(10,3.6))
    for style,(flow,d) in zip(STYLES,df.groupby('arrival',sort=False)):
        for ax,key,label in zip(axs,['rho','w'],['Измеренная загрузка приборов','Ожидание w, с']):
            ax.errorbar(d.target_rho_M,d[key],yerr=d[key+'_ci'],label=NAMES[flow],capsize=2,**style)
            ax.set_xlabel('Целевая фактическая загрузка для потока П');ax.set_ylabel(label);ax.legend()
    axs[0].plot([.5,.99],[.5,.99],color='.5',ls=':',label='Целевая загрузка')
    axs[1].set_yscale('log')
    save(fig,'actual_load')
    df=pd.read_csv(RESULTS/'form2.csv')
    for load in [.5,.9]:
        fig,axs=plt.subplots(1,2,figsize=(10,3.45))
        for style,(flow,d) in zip(STYLES,df[(df.y==load)&(df.way=='b')].groupby('arrival',sort=False)):
            for ax,key,label in zip(axs,['w','pi'],['Оценка ожидания w, с','Оценка потери π']):
                ax.plot(d.N,d[key],label=NAMES[flow],**style)
                ax.set_xscale('log'); ax.set_xlabel('Прошедших заявок N в одном прогоне');ax.set_ylabel(label);ax.legend()
        save(fig,'transient_'+str(int(load*100)))
    from methodical_tables import stability_table
    stable=stability_table(df)
    fig,axs=plt.subplots(1,2,figsize=(10,3.7))
    for way,ax in zip(['b','a'],axs):
        for style,(flow,d) in zip(STYLES,stable[stable.way==way].groupby('arrival',sort=False)):
            ax.plot(d.y,d.N_stable,label=NAMES[flow],**style)
        ax.set_title('Изменение b при фиксированном a' if way=='b' else 'Изменение a при фиксированном b')
        ax.set_xlabel('Предлагаемая нагрузка '+r'$y_{max}$');ax.set_ylabel(r'$N_{уст}$, прошедших заявок')
        ax.set_yscale('log');ax.legend()
    save(fig,'transient_loads')
    df=pd.read_csv(RESULTS/'servers.csv')
    fig,axs=plt.subplots(2,2,figsize=(10,6.3))
    for column,fixed in enumerate([True,False]):
        for row,key in enumerate(['w','u']):
            ax=axs[row,column]
            for style,(k,d) in zip(STYLES,df[df.fixed_input==fixed].groupby('K_per_node')):
                ax.plot(d.y,d[key],label=f'K = {k} в каждом узле',**style)
            if row==0:ax.set_title('Неизменный вход и обслуживание' if fixed else 'Сохранена нагрузка на прибор')
            ax.set_xlabel('Базовая нагрузка '+r'$y_{max}$')
            ax.set_ylabel('Среднее ожидание w, с' if key=='w' else 'Среднее пребывание u, с');ax.legend()
    save(fig,'servers')
    df=pd.read_csv(RESULTS/'closed.csv');exact=pd.read_csv(RESULTS/'closed_exact.csv')
    fig,axs=plt.subplots(1,2,figsize=(10,3.6))
    for style,(law,d) in zip(STYLES,df.groupby('law',sort=False)):
        d=d.sort_values('M')
        axs[0].errorbar(d.M,d.through,yerr=d.through_ci,label=LAWS[law],capsize=2,**style)
        axs[1].plot(d.M,d.u,label=LAWS[law],**style)
    axs[0].plot(exact.M,exact.through,color='black',alpha=.35,label='Точный расчёт M')
    axs[0].axhline(.04,color='.5',ls=':',label='Предельная производительность 0,04')
    for ax,key in zip(axs,[r'Производительность $\lambda_0$, 1/с',r'Среднее пребывание $U$, с']):
        ax.set_xlabel('Число заявок M');ax.set_ylabel(key);ax.legend();ax.set_ylim(bottom=0)
    save(fig,'closed')
    df=pd.read_csv(RESULTS/'bottleneck.csv')
    fig,axs=plt.subplots(1,2,figsize=(9,3.4));labels=['Исходная','b₃ = 5 с','K₃ = 2']
    for ax,key,ylabel in zip(axs,['through','u'],[r'Производительность $\lambda_0$, 1/с',r'Время пребывания $U$, с']):
        ax.bar(labels,df[key],yerr=df[key+'_ci'],color=['.25','.50','.75'],edgecolor='black',capsize=3)
        ax.set_ylabel(ylabel)
    save(fig,'bottleneck')
    df=pd.read_csv(RESULTS/'open.csv');df=df[df.comparison=='sweep']
    fig,axs=plt.subplots(1,2,figsize=(10,3.6))
    for style,(law,d) in zip(STYLES,df.groupby('law',sort=False)):
        for ax,key,label in zip(axs,['w','u'],[r'Ожидание в сети $W$, с',r'Пребывание в сети $U$, с']):
            ax.errorbar(d.lambda_,d[key],yerr=d[key+'_ci'],label=LAWS[law],capsize=2,**style)
            ax.set_xlabel(r'Внешняя интенсивность $\lambda_0$, 1/с');ax.set_ylabel(label);ax.legend()
    save(fig,'open')
    df=pd.read_csv(RESULTS/'closed.csv');d=df[(df.law=='M')&(df.M==6)].iloc[0]
    fig,axs=plt.subplots(1,2,figsize=(9,3.4))
    for ax,key,label in zip(axs,['rho','l'],['Загрузка ρ','Средняя длина очереди l']):
        ax.bar(['У1','У2','У3'],[d[key+str(j)] for j in range(1,4)],color='.6',edgecolor='black')
        ax.set_ylabel(label)
    save(fig,'node_bottleneck')
    if NATIVE:
        histograms=json.loads((RESULTS/'histograms.json').read_text())
        for prefix in ['smo','network']:
            fig,axs=plt.subplots(1,2,figsize=(10,3.4))
            for ax,suffix,label in zip(axs,['w','u'],['Время ожидания','Время пребывания']):
                h=histograms[prefix+'_'+suffix]
                finite=[row for row in h['bins'] if row[0] is not None and row[1] is not None]
                width=finite[0][1]-finite[0][0]
                cumulative=0;edge=finite[-1][1]
                for lo,hi,count in h['bins']:
                    cumulative+=count
                    if cumulative/h['n']>=.995 and hi is not None:edge=max(hi,width);break
                shown=[row for row in finite if row[0]<edge]
                ax.bar([r[0] for r in shown],[r[2]/h['n'] for r in shown],
                       width=width,align='edge',color='.65',edgecolor='black',linewidth=.4)
                zero=sum(count for lo,hi,count in h['bins'] if hi==0)
                if zero:
                    ax.bar(0,zero/h['n'],width=.35*width,align='edge',color='.4',edgecolor='black')
                symbol=suffix.upper() if prefix=='network' else suffix
                ax.set_xlabel(label+' '+symbol+', с');ax.set_ylabel('Относительная частота')
                ax.set_xlim(0,edge)
                note=f'ν = {h["cv"]:.3f}\nПо стандартным отчётам GPSS\nПоказано до накопленной частоты 99,5%'
                if suffix=='w':note+=f'\nДоля нулевых ожиданий: {zero/h["n"]:.1%}'+f'\nКВ положительной части: {h["cv_positive"]:.3f}'
                ax.text(.98,.94,note,transform=ax.transAxes,va='top',ha='right',fontsize=8)
            save(fig,'hist_'+prefix)
        return
    samples=np.load(RESULTS/'histograms.npz')
    for prefix in ['smo','network']:
        fig,axs=plt.subplots(1,2,figsize=(10,3.4))
        for ax,suffix,label in zip(axs,['w','u'],['Время ожидания w, с','Время пребывания u, с']):
            if prefix=='network':
                label=label.replace(' w,',' W,').replace(' u,',' U,')
            a=samples[prefix+'_'+suffix];end=np.quantile(a,.995)
            bins=np.linspace(0,end,35)
            ax.hist(a,bins=bins,weights=np.ones(len(a))/len(a),color='.65',edgecolor='black',linewidth=.4)
            ax.set_xlabel(label);ax.set_ylabel('Доля наблюдений в интервале')
            ax.text(.98,.94,f'ν = {a.std(ddof=1)/a.mean():.3f}\nПоказано до квантиля 99,5%',transform=ax.transAxes,va='top',ha='right',fontsize=9)
        save(fig,'hist_'+prefix)


if __name__=='__main__':make_figures()
