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

void solve() {
  ll n = 0, m = 0;
  cin >> n >> m;

  vector<vector<ll>> g(n + 1);
  for (ll i = 0; i < m; ++i) {
    ll u = 0, v = 0;
    cin >> u >> v;
    g[u].push_back(v);
    g[v].push_back(u);
  }

  vector<ll> color(n + 1, -1);
  queue<ll> q;

  for (ll start = 1; start <= n; ++start) {
    if (color[start] != -1) {
      continue;
    }

    color[start] = 0;
    q.push(start);

    while (!q.empty()) {
      ll v = q.front();
      q.pop();

      for (ll to : g[v]) {
        if (color[to] == -1) {
          color[to] = 1 - color[v];
          q.push(to);
        } else if (color[to] == color[v]) {
          cout << "NO" << el;
          return;
        }
      }
    }
  }

  cout << "YES" << el;
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
