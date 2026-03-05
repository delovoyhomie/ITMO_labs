/**
 * @author: Slava Yakimenko
 */

#include <algorithm>
#include <cmath>
#include <functional>
#include <iostream>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <stack>
#include <string>
#include <unordered_map>
#include <unordered_set>
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

  vector<ll> flowers(n);
  for (ll i = 0; i < n; ++i) {
    cin >> flowers[i];
  }

  ll left = 0;
  ll best_left = 0;
  ll best_right = 0;
  ll best_len = -INF;

  for (ll right = 0; right < n; ++right) {
    if (right >= 2 && flowers[right] == flowers[right - 1] &&
        flowers[right - 1] == flowers[right - 2]) {
      left = max(left, right - 1);
    }

    ll current_length = right - left + 1;

    if (current_length > best_len || (current_length == best_len && left < best_left)) {
      best_len = current_length;
      best_left = left;
      best_right = right;
    }
  }

  cout << best_left + 1 << ' ' << best_right + 1 << el;
}

int main() {
  fastIO();
  // freopen("tickets.in", "r", stdin);
  // freopen("tickets.out", "w", stdout);
  bool multitest = false;
  ll T = 1;
  if (multitest) {
    cin >> T;
  }
  for (ll i = 0; i < T; ++i) {
    solve();
  }
}
