"""УИР 3. Событийная имитация СМО и сети М1, вариант 16 / 6 / 6.

Все интервалы измерены в секундах. Алгоритм не использует готовые
стационарные результаты для формирования экспериментальных оценок.
"""
from pathlib import Path
from heapq import heappush, heappop, heapreplace
from collections import deque
from math import factorial

import numpy as np
from scipy.stats import t as student

ROOT = Path(__file__).resolve().parent
ROUTING = np.array([.30, .45, .25])
SERVERS = (1, 4, 1)
MEANS = (1., 15., 10.)
P10, P12 = .2, .3
P13 = 1 - P10 - P12
VISITS = np.array([1, P12, P13]) / P10


def trace_parameters():
    x = np.loadtxt(ROOT / 'data' / 'trace16.csv', delimiter=',', skiprows=1)
    a = x.mean()
    cv = np.sqrt(np.mean(x*x) - a*a) / a
    q = (1 + np.sqrt((cv*cv-1)/(cv*cv+1))) / 2
    t1, t2 = a/(2*q), a/(2*(1-q))
    return x, a, cv, q, t1, t2


def random_durations(rng, size, mean, law='M', cv=2.):
    """M, E2, H2 с заданным средним. H2 с равными вкладами в среднее."""
    if law == 'M':
        return rng.exponential(mean, size)
    if law == 'E2':
        return rng.gamma(2, mean/2, size)
    if law == 'D':
        return np.full(size, mean)
    if law == 'H2':
        q = (1 + np.sqrt((cv*cv-1)/(cv*cv+1))) / 2
        scale = np.where(rng.random(size) <= q, mean/(2*q), mean/(2*(1-q)))
        return rng.exponential(scale)
    raise ValueError(law)


def smo(n=100_000, warmup=10_000, seed=160600, a=None, b=5.,
        arrival='M', service=('M','M','E2'), buffers=(2,1,0),
        servers=(1,1,1), routing=ROUTING, return_samples=False):
    """N измеряемых внешних поступлений после warmup поступлений.

    Отказ фиксируется при заполнении выбранного узла. Запрет перевода
    к другому узлу сохраняет систему из УИР 2. Для каждого принятого
    поступления резервируется обслуживание FIFO. Завершения извлекаются
    из очереди событий перед обработкой следующего поступления.
    """
    x, ax, cv, *_ = trace_parameters()
    a = ax if a is None else a
    streams = [np.random.default_rng(s) for s in np.random.SeedSequence(seed).spawn(2+len(servers))]
    ra, rr = streams[:2]
    size = n + warmup
    if arrival == 'T':
        # Сохраняем порядок исходных 300 значений, повторяем всю трассу.
        intervals = np.resize(x, size) * a/ax
    else:
        intervals = random_durations(ra, size, a, 'H2' if arrival=='A' else arrival, cv)
    times = np.cumsum(intervals)
    destinations = np.searchsorted(np.cumsum(routing), rr.random(size))
    duration = np.empty(size)
    for j in range(len(servers)):
        ix = np.flatnonzero(destinations==j)
        duration[ix] = random_durations(streams[j+2], len(ix), b, service[j])
    lower = times[warmup-1] if warmup else 0.
    upper = times[-1]
    horizon = upper-lower
    available = [[0.]*k for k in servers]
    departures = [[] for _ in servers]
    busy, queue = np.zeros(len(servers)), np.zeros(len(servers))
    loss = np.zeros(len(servers), dtype=int)
    count = np.zeros(len(servers), dtype=int)
    w, u, js = [], [], []
    max_waiting = np.zeros(len(servers), dtype=int)
    for i, (tm, j, dur) in enumerate(zip(times, destinations, duration)):
        ends = departures[j]
        while ends and ends[0] <= tm:
            heappop(ends)
        if i >= warmup:
            count[j] += 1
        if len(ends) >= servers[j]+buffers[j]:
            if i >= warmup:
                loss[j] += 1
            continue
        start = max(tm, available[j][0])
        end = start+dur
        heapreplace(available[j], end)
        heappush(ends, end)
        queue[j] += max(0., min(start,upper)-max(tm,lower))
        busy[j] += max(0., min(end,upper)-max(start,lower))
        if i >= warmup:
            w.append(start-tm); u.append(end-tm); js.append(j)
            max_waiting[j] = max(max_waiting[j], len(ends)-servers[j])
    w, u, js = np.array(w), np.array(u), np.array(js)
    rates = (count-loss)/horizon
    out = dict(n=n, lost=int(loss.sum()), pi=loss.sum()/n,
               through=len(w)/horizon, rho=busy.sum()/horizon/sum(servers),
               l=queue.sum()/horizon, m=(queue.sum()+busy.sum())/horizon,
               w=float(w.mean()), u=float(u.mean()),
               sw=float(w.std(ddof=1)), su=float(u.std(ddof=1)),
               cvw=float(w.std(ddof=1)/w.mean()) if w.mean() else 0.,
               cvu=float(u.std(ddof=1)/u.mean()), time=horizon,
               max_waiting=max_waiting.tolist(),
               nodes=[dict(rho=busy[j]/horizon/servers[j], l=queue[j]/horizon,
                           m=(busy[j]+queue[j])/horizon, through=rates[j],
                           pi=loss[j]/count[j] if count[j] else np.nan,
                           w=float(w[js==j].mean()) if np.any(js==j) else np.nan,
                           u=float(u[js==j].mean()) if np.any(js==j) else np.nan)
                      for j in range(len(servers))])
    if return_samples:
        out['samples_w'], out['samples_u'] = w, u
    return out


def confidence(values):
    v = np.asarray(values, float)
    return float(v.mean()), float(student.ppf(.975, len(v)-1)*v.std(ddof=1)/np.sqrt(len(v)))


def closed_exact(population, servers=SERVERS, means=MEANS):
    """Распределение Гордонa–Ньюэлла для экспоненциальной сети M1.

    Коэффициенты передач отнесены к прохождению через условный узел 0.
    Суммирование по всем n1+n2+n3=M, включая многоканальный узел 2.
    """
    weights = []
    for v,b,k in zip(VISITS,means,servers):
        g = np.ones(population+1)
        for n in range(1,population+1):
            g[n] = g[n-1]*v*b/min(n,k)
        weights.append(g)
    def total(m):
        return sum(weights[0][i]*weights[1][j]*weights[2][m-i-j]
                   for i in range(m+1) for j in range(m-i+1))
    norm = total(population)
    states = np.array([(i,j,population-i-j) for i in range(population+1)
                       for j in range(population-i+1)])
    probs = np.array([np.prod([weights[j][s[j]] for j in range(3)]) for s in states])/norm
    x = total(population-1)/norm if population else 0.
    m = probs @ states
    l = probs @ np.maximum(states-np.asarray(servers),0)
    rho = (probs @ np.minimum(states,np.asarray(servers)))/np.asarray(servers)
    return dict(through=x, u=population/x if x else 0., w=l.sum()/x if x else 0.,
                l=l.sum(), m=population, nodes=[dict(rho=rho[j],l=l[j],m=m[j],
                through=x*VISITS[j],w=l[j]/(x*VISITS[j]) if x else 0.,
                u=m[j]/(x*VISITS[j]) if x else 0.) for j in range(3)])


def open_exact(lam, servers=SERVERS, means=MEANS):
    """Узловые M/M/k из уравнений трафика разомкнутой сети Джексона."""
    nodes = []
    for v,b,k in zip(VISITS,means,servers):
        rate = lam*v; y = rate*b; rho = y/k
        if rho >= 1:
            raise ValueError('Стационарного режима нет')
        p0 = 1/(sum(y**i/factorial(i) for i in range(k))+y**k/factorial(k)/(1-rho))
        l = p0*y**k*rho/(factorial(k)*(1-rho)**2)
        nodes.append(dict(rho=rho,l=l,m=l+y,through=rate,w=l/rate,u=l/rate+b))
    return dict(through=lam, l=sum(x['l'] for x in nodes),m=sum(x['m'] for x in nodes),
                w=sum(v*x['w'] for v,x in zip(VISITS,nodes)),
                u=sum(v*x['u'] for v,x in zip(VISITS,nodes)),nodes=nodes)


def network(population=None, lam=None, law='M', arrival='M', servers=SERVERS,
            means=MEANS, warmup=10_000, cycles=80_000, seed=66001,
            return_samples=False):
    """Дискретно-событийная сеть M1 с FIFO и неограниченными очередями.

    population задано для замкнутой сети. Её возврат 1->0->1
    не имеет задержки. Каждый такой возврат завершает один цикл.
    У открытой сети 0 — внешний источник/сток, lam — его интенсивность.
    """
    if (population is None) == (lam is None):
        raise ValueError('Нужно задать ровно одно из population, lam')
    rngs = [np.random.default_rng(s) for s in np.random.SeedSequence(seed).spawn(3)]
    rr, rs, ra = rngs
    # Пакетная генерация сокращает стоимость вызовов NumPy в цикле событий.
    def draws(rng, kind, mean):
        while True:
            yield from random_durations(rng, 16384, mean, kind)
    draws_service = [draws(rs,law if j==2 else 'M',b) for j,b in enumerate(means)]
    routes = iter(rr.random(16384))
    def route():
        nonlocal routes
        try: return next(routes)
        except StopIteration:
            routes = iter(rr.random(16384)); return next(routes)
    ia = draws(ra,arrival,1/lam) if lam else None
    queues = [deque() for _ in range(3)]
    active = [0]*3
    events = []
    serial = 0
    # event = (time, serial, node, cycle_enter, accumulated_wait)
    qarea, barea, node_count = np.zeros(3), np.zeros(3), np.zeros(3,dtype=int)
    wait_sums, stay_sums = np.zeros(3), np.zeros(3)
    cycles_w, cycles_u = [], []
    count = 0; started = False; lower = last = 0.
    def enter(j, tm, cycle_time, accumulated_wait):
        nonlocal serial
        if active[j] < servers[j]:
            active[j] += 1; serial += 1
            heappush(events,(tm+next(draws_service[j]),serial,j,cycle_time,accumulated_wait,tm,0.))
        else:
            queues[j].append((tm,cycle_time,accumulated_wait))
    if population:
        for _ in range(population): enter(0,0.,0.,0.)
    else:
        heappush(events,(next(ia),-1,-1,0.,0.,0.,0.))
    while count < warmup+cycles:
        tm, seq, j, cycle_time, acc_wait, entered, wait = heappop(events)
        if started:
            dt = tm-last
            qarea += np.fromiter(map(len,queues),float)*dt
            barea += np.array(active)*dt
        last = tm
        if j == -1:
            enter(0,tm,tm,0.)
            heappush(events,(tm+next(ia),-1,-1,0.,0.,0.,0.))
            continue
        active[j] -= 1
        if started:
            node_count[j] += 1
            wait_sums[j] += wait
            stay_sums[j] += tm-entered
        if queues[j]:
            ent, ct, aw = queues[j].popleft()
            w = tm-ent; active[j] += 1; serial += 1
            heappush(events,(tm+next(draws_service[j]),serial,j,ct,aw+w,ent,w))
        if j == 0:
            r = route()
            if r < P10:
                count += 1
                if started:
                    cycles_w.append(acc_wait); cycles_u.append(tm-cycle_time)
                if count == warmup and not started:
                    started=True; lower=last=tm
                if population:
                    enter(0,tm,tm,0.)
            else:
                enter(1 if r<P10+P12 else 2,tm,cycle_time,acc_wait)
        else:
            enter(0,tm,cycle_time,acc_wait)
    horizon = tm-lower
    cw, cu = np.array(cycles_w), np.array(cycles_u)
    out = dict(through=cycles/horizon,w=float(cw.mean()),u=float(cu.mean()),
               sw=float(cw.std(ddof=1)),su=float(cu.std(ddof=1)),
               cvw=float(cw.std(ddof=1)/cw.mean()) if cw.mean() else np.nan,
               cvu=float(cu.std(ddof=1)/cu.mean()),
               l=qarea.sum()/horizon,m=(qarea+barea).sum()/horizon,
               time=horizon,cycles=cycles,population=population,
               nodes=[dict(rho=barea[j]/horizon/servers[j],l=qarea[j]/horizon,
                           m=(qarea[j]+barea[j])/horizon,
                           through=node_count[j]/horizon,
                           w=wait_sums[j]/node_count[j],u=stay_sums[j]/node_count[j])
                      for j in range(3)])
    if return_samples:out['samples_w'],out['samples_u']=cw,cu
    return out
