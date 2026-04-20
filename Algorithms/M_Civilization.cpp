/**
 * @author: Slava Yakimenko
 */

#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
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

struct State {
  ll dist = 0;
  ll id = 0;

  bool operator>(const State& other) const {
    return dist > other.dist;
  }
};

void solve() {
  ll n = 0, m = 0;
  cin >> n >> m;

  ll sx = 0, sy = 0;
  cin >> sx >> sy;
  --sx;
  --sy;

  ll tx = 0, ty = 0;
  cin >> tx >> ty;
  --tx;
  --ty;

  vector<string> grid(n);
  for (ll i = 0; i < n; ++i) {
    cin >> grid[i];
  }

  const ll total = n * m;
  const ll start = sx * m + sy;
  const ll target = tx * m + ty;

  vector<ll> dist(total, INF);
  vector<char> parent(total, '?');

  const ll dx[4] = {-1, 0, 1, 0};
  const ll dy[4] = {0, 1, 0, -1};
  const char step[4] = {'N', 'E', 'S', 'W'};

  priority_queue<State, vector<State>, greater<State>> q;
  dist[start] = 0;
  q.push({0, start});

  while (!q.empty()) {
    State cur = q.top();
    q.pop();

    if (cur.dist != dist[cur.id]) {
      continue;
    }
    if (cur.id == target) {
      break;
    }

    const ll x = cur.id / m;
    const ll y = cur.id % m;

    for (ll dir = 0; dir < 4; ++dir) {
      const ll nx = x + dx[dir];
      const ll ny = y + dy[dir];

      if (nx < 0 || nx >= n || ny < 0 || ny >= m) {
        continue;
      }
      if (grid[nx][ny] == '#') {
        continue;
      }

      ll w = 1;
      if (grid[nx][ny] == 'W') {
        w = 2;
      }

      const ll to = nx * m + ny;
      if (dist[to] > dist[cur.id] + w) {
        dist[to] = dist[cur.id] + w;
        parent[to] = step[dir];
        q.push({dist[to], to});
      }
    }
  }

  if (dist[target] == INF) {
    cout << -1 << el;
    return;
  }

  string path;
  ll cur = target;
  while (cur != start) {
    const char dir = parent[cur];
    path += dir;

    const ll x = cur / m;
    const ll y = cur % m;

    if (dir == 'N') {
      cur = (x + 1) * m + y;
    } else if (dir == 'E') {
      cur = x * m + (y - 1);
    } else if (dir == 'S') {
      cur = (x - 1) * m + y;
    } else {
      cur = x * m + (y + 1);
    }
  }

  reverse(all(path));
  cout << dist[target] << el;
  cout << path << el;
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
