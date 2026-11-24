"""Форма 2: остановка по числу прошедших заявок, как у TERMINATE 1.

Отдельный контрольный алгоритм, не меняющий сохранённые стационарные серии.
Начальное состояние пустое; заявка считается прошедшей при отказе или
завершении обслуживания. Среднее ожидание регистрируется в начале
обслуживания, как при DEPART/QTABLE, пребывание — при завершении.
"""
from heapq import heappush, heappop
import numpy as np
import pandas as pd
from scipy.stats import t as student
from model import ROOT, trace_parameters, random_durations, network

GRID = (10, 20, 50, 100, 200, 300, 600, 1000, 3000, 10000, 30000, 100000)
LOADS = (.1, .3, .5, .7, .9)
REPS = 12


def change_percent(current, previous):
    """В форме 2 методички знаменатель — ТЕКУЩЕЕ значение (13,8%; 8,9%)."""
    return abs(current-previous)/abs(current)*100 if previous is not None and current else np.nan


def passed_path(checkpoints=GRID, seed=160600, a=None, b=5., arrival='M',
                buffers=(2, 1, 0), service=('M', 'M', 'E2')):
    """Снимки одного непрерывного прогона при N завершений/отказов."""
    x, ax, cv, *_ = trace_parameters()
    a = ax if a is None else a
    checkpoints = tuple(sorted(set(checkpoints)))
    cap = np.array(buffers) + 1
    size = checkpoints[-1] + int(cap.sum()) + 1
    streams = [np.random.default_rng(s) for s in np.random.SeedSequence(seed).spawn(5)]
    if arrival == 'T':
        intervals = np.resize(x, size) * a / ax
    else:
        intervals = random_durations(streams[0], size, a,
                                     'H2' if arrival == 'A' else arrival, cv)
    times = np.cumsum(intervals)
    destination = np.searchsorted(np.cumsum([.3, .45, .25]), streams[1].random(size))
    duration = np.empty(size)
    for j in range(3):
        ix = np.flatnonzero(destination == j)
        duration[ix] = random_durations(streams[j+2], len(ix), b, service[j])
    # type=0: начало обслуживания; type=1: завершение. Моменты совпадений
    # имеют нулевую вероятность, кроме начала обслуживания сразу при входе.
    events = []
    available = np.zeros(3)
    occupancy = np.zeros(3, dtype=int)
    queued = np.zeros(3, dtype=int)
    active = np.zeros(3, dtype=int)
    area_q = area_c = clock = 0.
    sums = dict(w=0., w2=0., nw=0, u=0., u2=0., nu=0)
    lost = passed = arrived = index = 0
    rows = []
    while passed < checkpoints[-1]:
        incoming = times[index]
        next_event = events[0][0] if events else np.inf
        tm = min(incoming, next_event)
        dt = tm - clock
        area_q += dt * queued.sum()
        area_c += dt * active.sum()
        clock = tm
        if next_event <= incoming:
            tm, kind, j, w, u = heappop(events)
            if kind == 0:
                queued[j] -= 1
                active[j] += 1
                sums['w'] += w; sums['w2'] += w*w; sums['nw'] += 1
            else:
                active[j] -= 1
                occupancy[j] -= 1
                sums['u'] += u; sums['u2'] += u*u; sums['nu'] += 1
                passed += 1
        else:
            j = destination[index]
            arrived += 1
            if occupancy[j] >= cap[j]:
                lost += 1; passed += 1
            else:
                start = max(tm, available[j])
                end = start + duration[index]
                w, u = start-tm, end-tm
                available[j] = end
                occupancy[j] += 1
                if start <= tm:
                    active[j] += 1
                    sums['w'] += w; sums['w2'] += w*w; sums['nw'] += 1
                else:
                    queued[j] += 1
                    heappush(events, (start, 0, j, w, u))
                heappush(events, (end, 1, j, w, u))
            index += 1
        if passed in checkpoints and (not rows or rows[-1]['N'] != passed):
            assert arrived == passed + occupancy.sum()
            assert passed == lost + sums['nu']
            assert np.all(queued >= 0) and np.all(active >= 0)
            assert np.array_equal(occupancy, queued+active)
            rows.append(dict(N=passed, arrived=arrived, lost=lost, time=clock,
                             area_q=area_q, area_c=area_c, **sums))
    return rows


def summarize(runs):
    """Объединённые моменты; доверие 0,95 по независимым повторениям.

    Полуинтервал отношения сумм — дельта-метод с t-квантилем. Последовательные
    ожидания внутри одного прогона не считаются независимыми наблюдениями.
    """
    d = pd.DataFrame(runs)
    total = d.sum(numeric_only=True)
    out = dict(N=int(d.N.iloc[0]), repetitions=len(d), passed_total=int(total.N),
               lost=int(total.lost), arrived=int(total.arrived),
               pi=total.lost/total.N,
               l=total.area_q/total.time, rho=total.area_c/total.time/3,
               mean_time=d.time.mean())
    for key, count in [('w', 'nw'), ('u', 'nu')]:
        n = total[count]
        mean = total[key]/n if n else np.nan
        sd = np.sqrt(max(0., (total[key+'2']-total[key]**2/n)/(n-1))) if n>1 else np.nan
        residual = d[key] - mean*d[count]
        half = (student.ppf(.975, len(d)-1) *
                np.sqrt(len(d)/(len(d)-1)*np.sum(residual**2))/n) if n else np.nan
        out.update({key:mean, 's'+key:sd, 'cv'+key:sd/mean if mean else np.nan,
                    key+'_ci':half})
    return out


def stability_table(frame):
    rows = []
    for (way, flow, load), d in frame.groupby(['way', 'arrival', 'y']):
        d = d.sort_values('N')
        last = d.iloc[-1]
        def relative(series, value):
            return abs(series-value)/abs(value) if value else (series != 0).astype(float)
        good = ((relative(d.w, last.w) < .05) &
                (relative(d.pi, last.pi) < .05) & (d.D_percent < 5))
        n = next((int(d.iloc[i].N) for i in range(len(d)) if good.iloc[i:].all()), None)
        rows.append(dict(way=way, arrival=flow, y=load, N_stable=n,
                         final_D_percent=last.D_percent))
    return pd.DataFrame(rows)


def collect_network_protocols():
    """Сохраняет фактическую длительность каждого из сравниваемых прогонов."""
    closed = pd.read_csv(ROOT/'results'/'closed.csv')
    opened = pd.read_csv(ROOT/'results'/'open.csv')
    rows = []
    for kind in ['closed', 'open']:
        for law in ['M', 'E2', 'H2']:
            reference = (closed[(closed.law==law)&(closed.M==3)].iloc[0] if kind=='closed'
                         else opened[(opened.law==law)&(opened.comparison=='matched')&
                                     (opened.arrival=='M')].iloc[0])
            runs = []
            for rep in range(8):
                args = dict(population=3, cycles=30000, warmup=10000) if kind=='closed' else dict(
                    lam=reference.lambda_, cycles=40000, warmup=20000)
                item = network(seed=66000+rep, law=law, **args)
                rows.append(dict(kind=kind, law=law, replication=rep+1,
                                 cycles=item['cycles'], duration=item['time'],
                                 through=item['through'], w=item['w'], u=item['u']))
                runs.append(item)
            for key in ['through','w','u']:
                np.testing.assert_allclose(np.mean([r[key] for r in runs]), reference[key],
                                           rtol=1e-10, atol=1e-10)
            print('Протоколы сети:', kind, law, flush=True)
    pd.DataFrame(rows).to_csv(ROOT/'results'/'network_protocols.csv', index=False)


def main():
    _, ax, *_ = trace_parameters()
    raw, combined = [], []
    # Два способа изменения нагрузки: b при фиксированном a и a при b=5.
    for way in ['b', 'a']:
        for flow in ['M', 'T', 'A']:
            for load in LOADS:
                a = ax if way == 'b' else .45*5/load
                b = load*ax/.45 if way == 'b' else 5.
                snapshots = []
                for r in range(REPS):
                    path = passed_path(seed=160600+r, a=a, b=b, arrival=flow)
                    for item in path:
                        item.update(replication=r+1, way=way, arrival=flow, y=load, a=a, b=b)
                        raw.append(item)
                    snapshots.append(path)
                previous_pi = previous_w = None
                for i, n in enumerate(GRID):
                    row = summarize([p[i] for p in snapshots])
                    row.update(way=way, arrival=flow, y=load, a=a, b=b)
                    row['P_percent'] = change_percent(row['pi'], previous_pi)
                    row['O_percent'] = change_percent(row['w'], previous_w)
                    row['D_percent'] = row['w_ci']/row['w']*100 if row['w'] else np.nan
                    combined.append(row)
                    previous_pi, previous_w = row['pi'], row['w']
                print('Форма 2:', way, flow, load, flush=True)
    pd.DataFrame(raw).to_csv(ROOT/'results'/'form2_replications.csv', index=False)
    frame = pd.DataFrame(combined)
    frame.to_csv(ROOT/'results'/'form2.csv', index=False)
    stability_table(frame).to_csv(ROOT/'results'/'transient_stability.csv', index=False)
    collect_network_protocols()
    print('Сохранены 360 строк формы 2 и 4320 снимков прогонов.', flush=True)


if __name__ == '__main__':
    main()
