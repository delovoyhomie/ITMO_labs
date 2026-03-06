/**
 * @author: Slava Yakimenko
 */

#include <iostream>
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

bool ok(vector<ll>& v, ll n, ll k, ll x) {
  ll cnt = 1;
  ll last = v[0];
  for (ll i = 1; i < n; ++i) {
    if (v[i] - last >= x) {
      ++cnt;
      last = v[i];
    }
  }
  return cnt >= k;
}

void solve() {
  ll n = 0, k = 0;
  cin >> n >> k;

  vector<ll> v(n);
  for (ll i = 0; i < n; ++i) {
    cin >> v[i];
  }

  ll l = 0;
  ll r = v[n - 1] - v[0] + 1;
  while (r - l > 1) {
    ll m = (l + r) / 2;
    if (ok(v, n, k, m)) {
      l = m;
    } else {
      r = m;
    }
  }

  cout << l << el;
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
