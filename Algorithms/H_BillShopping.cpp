/**
 * @author: Slava Yakimenko
 */

#include <algorithm>
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
  ll n = 0, k = 0;
  cin >> n >> k;

  vector<ll> a(n);
  for (ll i = 0; i < n; ++i) {
    cin >> a[i];
  }

  sort(all(a));
  reverse(all(a));

  ll ans = 0;
  for (ll i = 0; i < n; ++i) {
    if ((i + 1) % k != 0) {
      ans += a[i];
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
