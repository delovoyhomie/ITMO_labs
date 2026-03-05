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

void solve() {
  ll a = 0, b = 0, c = 0, d = 0, k = 0;
  cin >> a >> b >> c >> d >> k;

  auto go = [&](ll x) -> ll {
    ll y = x * b;
    if (y < c) {
      return 0;
    }
    ll r = y - c;
    if (r > d) {
      return d;
    }
    return r;
  };

  vector<ll> pos(d + 1, -1);
  vector<ll> seq;

  ll x = a;
  ll day = 0;
  while (pos[x] == -1) {
    pos[x] = day;
    seq.push_back(x);
    x = go(x);
    ++day;
  }

  ll start = pos[x];
  ll len = day - start;

  ll ans = 0;
  if (k < static_cast<ll>(seq.size())) {
    ans = seq[k];
  } else if (k < start) {
    ans = seq[k];
  } else {
    ll id = start + (k - start) % len;
    ans = seq[id];
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
