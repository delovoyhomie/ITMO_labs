/**
 * @author: Slava Yakimenko
 */

#include <iostream>
#include <queue>
#include <utility>
#include <vector>

using namespace std;
typedef long long ll;

#define fastIO()                 \
  do {                           \
    ios::sync_with_stdio(false); \
    cin.tie(nullptr);            \
    cout.tie(nullptr);           \
  } while (0)
#define deb(x) cout << #x << " = " << x << '\n'
#define all(x) x.begin(), x.end()
#define el '\n'
#define INF static_cast<ll>(1e17)

/*
 * HEADER END
 */

struct Node {
  ll l = 0;
  ll r = 0;
  int prev = 0;
  int next = 0;
  bool is_free = false;
  bool alive = false;
};

struct HeapNode {
  ll len = 0;
  ll neg_l = 0;
  int id = 0;

  bool operator<(const HeapNode& other) const {
    if (len != other.len) {
      return len < other.len;
    }
    if (neg_l != other.neg_l) {
      return neg_l < other.neg_l;
    }
    return id < other.id;
  }
};

ll get_len(const Node& node) {
  return node.r - node.l + 1;
}

void push_free_segment(priority_queue<HeapNode>& heap, const vector<Node>& nodes, int id) {
  heap.push({get_len(nodes[id]), -nodes[id].l, id});
}

bool is_actual_free_segment(const HeapNode& top, const vector<Node>& nodes) {
  const Node& node = nodes[top.id];
  return node.alive && node.is_free && get_len(node) == top.len && node.l == -top.neg_l;
}

void solve() {
  ll n = 0, m = 0;
  cin >> n >> m;

  vector<Node> nodes(m + 2);
  vector<int> allocated(m + 1, 0);
  priority_queue<HeapNode> heap;

  nodes[1] = {1, n, 0, 0, true, true};
  int nodes_cnt = 1;
  push_free_segment(heap, nodes, 1);

  for (ll i = 1; i <= m; ++i) {
    ll x = 0;
    cin >> x;

    if (x > 0) {
      while (!heap.empty() && !is_actual_free_segment(heap.top(), nodes)) {
        heap.pop();
      }

      if (heap.empty() || heap.top().len < x) {
        cout << -1 << el;
        continue;
      }

      const int id = heap.top().id;
      heap.pop();

      allocated[i] = id;
      cout << nodes[id].l << el;

      if (get_len(nodes[id]) == x) {
        nodes[id].is_free = false;
        continue;
      }

      ++nodes_cnt;
      nodes[nodes_cnt] = {nodes[id].l + x, nodes[id].r, id, nodes[id].next, true, true};
      if (nodes[id].next != 0) {
        nodes[nodes[id].next].prev = nodes_cnt;
      }

      nodes[id].r = nodes[id].l + x - 1;
      nodes[id].next = nodes_cnt;
      nodes[id].is_free = false;

      push_free_segment(heap, nodes, nodes_cnt);
    } else {
      const ll t = -x;
      if (t < 1 || t > m || allocated[t] == 0) {
        continue;
      }

      int id = allocated[t];
      allocated[t] = 0;
      if (!nodes[id].alive || nodes[id].is_free) {
        continue;
      }

      nodes[id].is_free = true;
      int cur = id;

      if (nodes[cur].prev != 0 && nodes[nodes[cur].prev].alive && nodes[nodes[cur].prev].is_free) {
        const int prev_id = nodes[cur].prev;
        nodes[prev_id].r = nodes[cur].r;
        nodes[prev_id].next = nodes[cur].next;
        if (nodes[cur].next != 0) {
          nodes[nodes[cur].next].prev = prev_id;
        }
        nodes[cur].alive = false;
        cur = prev_id;
      }

      if (nodes[cur].next != 0 && nodes[nodes[cur].next].alive && nodes[nodes[cur].next].is_free) {
        const int next_id = nodes[cur].next;
        nodes[cur].r = nodes[next_id].r;
        nodes[cur].next = nodes[next_id].next;
        if (nodes[next_id].next != 0) {
          nodes[nodes[next_id].next].prev = cur;
        }
        nodes[next_id].alive = false;
      }

      nodes[cur].is_free = true;
      push_free_segment(heap, nodes, cur);
    }
  }
}

int main() {
  fastIO();
  // freopen("input.txt", "r", stdin);
  // freopen("output.txt", "w", stdout);
  bool multitest = false;
  ll T = 1;
  if (multitest) {
    cin >> T;
  }
  for (ll i = 0; i < T; ++i) {
    solve();
  }
}
