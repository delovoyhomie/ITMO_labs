"""УИР 2, вариант 16/17/13. Стационарные модели и характеристики."""
from dataclasses import dataclass
from itertools import product

import numpy as np


BASE_LAMBDA = 0.8
B = 5.0
MU = 1 / B
PHASE_RATE = 2 / B
SWEEP = np.arange(1, 21) / 10


@dataclass(frozen=True)
class System:
    buffers: tuple
    routing: tuple
    erlang_at_last: bool = False


SYSTEMS = (System((1, 1, 0), (0.30, 0.45, 0.25)),
           System((2, 1, 0), (0.30, 0.45, 0.25), True))


def local_transitions(system, j):
    """Возвращает дуги локального графа: откуда, куда, вид события."""
    if system.erlang_at_last and j == len(system.buffers) - 1:
        return [(0, 1, "arrival"), (1, 2, "phase"), (2, 0, "phase")]
    capacity = system.buffers[j] + 1
    return [(n, n + 1, "arrival") for n in range(capacity)] + [
        (n, n - 1, "service") for n in range(1, capacity + 1)]


def state_label(state, system):
    labels = list(map(str, state))
    if system.erlang_at_last and state[-1]:
        labels[-1] = ("I", "II")[state[-1] - 1]
    return "(" + ",".join(labels) + ")"


def build(system, lam):
    local_states = [range(3) if system.erlang_at_last and j == len(system.buffers)-1
                    else range(r + 2) for j, r in enumerate(system.buffers)]
    states = list(product(*local_states))
    index = {state: i for i, state in enumerate(states)}
    rates = lam * np.array(system.routing)
    G = np.zeros((len(states), len(states)))
    edges = []
    for i, state in enumerate(states):
        for j in range(len(local_states)):
            for start, end, kind in local_transitions(system, j):
                if start == state[j]:
                    target = state[:j] + (end,) + state[j+1:]
                    k = index[target]
                    G[i, k] = {"arrival": rates[j], "service": MU,
                               "phase": PHASE_RATE}[kind]
                    edges.append((i, k, j, kind))
    np.fill_diagonal(G, -G.sum(axis=1))
    return states, G, edges


def stationary(G):
    A = G.T.copy()
    A[-1] = 1
    rhs = np.zeros(len(G))
    rhs[-1] = 1
    return np.linalg.solve(A, rhs)


def characteristics(system, lam, states, P):
    K = np.asarray(system.buffers) + 1
    n = np.array(states)
    if system.erlang_at_last:
        # Фаза II — продолжение обслуживания той же заявки.
        n[:, -1] = n[:, -1] > 0
    arrival = lam * np.array(system.routing)
    loss = P @ (n == K)
    accepted = P @ (n < K)
    throughput = arrival * accepted
    # FIFO. Экспоненциальный прибор: n обслуживаний по b.
    # П3 с E2 имеет нулевую очередь и принимает только в пустом состоянии.
    waiting = (P @ (B * n * (n < K))) / accepted
    metrics = {
        "y": arrival * B,
        "rho": P @ (n > 0),
        "l": P @ np.maximum(n - 1, 0),
        "m": P @ n,
        "w": waiting,
        "u": waiting + B,
        "pi": loss,
        "through": throughput,
    }
    totals = {key: values.sum() for key, values in metrics.items()}
    totals["pi"] = np.dot(arrival, loss) / lam
    for key in ("w", "u"):
        totals[key] = np.dot(throughput, metrics[key]) / throughput.sum()
    return n, metrics, totals


def solve(system, lam=BASE_LAMBDA):
    states, G, edges = build(system, lam)
    P = stationary(G)
    n, metrics, totals = characteristics(system, lam, states, P)
    arrival = lam * np.array(system.routing)
    completion = MU * metrics["rho"]
    if system.erlang_at_last:
        completion[-1] = PHASE_RATE * P[np.array(states)[:, -1] == 2].sum()

    # Независимый расчёт локальных вероятностей для раздельных приборов.
    local_P = []
    for j, rate in enumerate(arrival):
        if system.erlang_at_last and j == len(arrival)-1:
            weights = np.array([1, rate / PHASE_RATE, rate / PHASE_RATE])
        else:
            weights = (rate / MU) ** np.arange(system.buffers[j] + 2)
        local_P.append(weights / weights.sum())
    product_P = np.array([np.prod(parts) for parts in product(*local_P)])
    assert np.min(P) >= 0
    np.testing.assert_allclose(G.sum(axis=1), 0, atol=1e-12)
    np.testing.assert_allclose(np.einsum("i,ij->j", P, G), 0, atol=1e-12)
    np.testing.assert_allclose(P.sum(), 1, atol=1e-12)
    np.testing.assert_allclose(P, product_P, atol=1e-12)
    np.testing.assert_allclose(completion, metrics["through"], atol=1e-12)
    np.testing.assert_allclose(metrics["l"], metrics["through"] * metrics["w"], atol=1e-12)
    np.testing.assert_allclose(metrics["m"], metrics["through"] * metrics["u"], atol=1e-12)
    np.testing.assert_allclose(totals["l"], totals["through"] * totals["w"], atol=1e-12)
    np.testing.assert_allclose(totals["m"], totals["through"] * totals["u"], atol=1e-12)
    return states, G, edges, P, n, metrics, totals
