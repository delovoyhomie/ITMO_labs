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
  ll n = 0;
  cin >> n;

  vector<ll> to(n + 1);
  vector<ll> indeg(n + 1, 0);
  for (ll i = 1; i <= n; ++i) {
    cin >> to[i];
    ++indeg[to[i]];
  }

  queue<ll> q;
  for (ll i = 1; i <= n; ++i) {
    if (indeg[i] == 0) {
      q.push(i);
    }
  }

  vector<char> removed(n + 1, false);
  while (!q.empty()) {
    ll v = q.front();
    q.pop();
    removed[v] = true;

    ll u = to[v];
    --indeg[u];
    if (indeg[u] == 0) {
      q.push(u);
    }
  }

  ll ans = 0;
  vector<char> used(n + 1, false);
  for (ll i = 1; i <= n; ++i) {
    if (removed[i] || used[i]) {
      continue;
    }

    ++ans;
    ll v = i;
    while (!used[v]) {
      used[v] = true;
      v = to[v];
    }
  }

  cout << ans << el;
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
