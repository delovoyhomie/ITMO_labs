/**
 * @author: Slava Yakimenko
 */

#include <iostream>
#include <queue>
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

void bfs(const vector<vector<ll>>& g, ll limit, vector<char>& used) {
  const ll n = static_cast<ll>(g.size());

  queue<ll> q;
  used[0] = true;
  q.push(0);

  while (!q.empty()) {
    ll v = q.front();
    q.pop();

    for (ll to = 0; to < n; ++to) {
      if (!used[to] && g[v][to] <= limit) {
        used[to] = true;
        q.push(to);
      }
    }
  }
}

bool can_fly(const vector<vector<ll>>& g, const vector<vector<ll>>& rg, ll limit) {
  const ll n = static_cast<ll>(g.size());

  vector<char> used(n, false);
  bfs(g, limit, used);
  for (ll i = 0; i < n; ++i) {
    if (!used[i]) {
      return false;
    }
  }

  fill(all(used), false);
  bfs(rg, limit, used);
  for (ll i = 0; i < n; ++i) {
    if (!used[i]) {
      return false;
    }
  }

  return true;
}

void solve() {
  ll n = 0;
  cin >> n;

  vector<vector<ll>> g(n, vector<ll>(n));
  vector<vector<ll>> rg(n, vector<ll>(n));

  ll mx = 0;
  for (ll i = 0; i < n; ++i) {
    for (ll j = 0; j < n; ++j) {
      cin >> g[i][j];
      rg[j][i] = g[i][j];
      mx = max(mx, g[i][j]);
    }
  }

  ll left = -1;
  ll right = mx;
  while (right - left > 1) {
    ll mid = (left + right) / 2;
    if (can_fly(g, rg, mid)) {
      right = mid;
    } else {
      left = mid;
    }
  }

  cout << right << el;
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
