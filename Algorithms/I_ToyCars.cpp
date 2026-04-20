/**
 * @author: Slava Yakimenko
 */

#include <iostream>
#include <set>
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
  ll n = 0, k = 0, p = 0;
  cin >> n >> k >> p;

  vector<ll> a(p);
  for (ll i = 0; i < p; ++i) {
    cin >> a[i];
  }

  const ll no_next = p + 1;
  vector<ll> next_pos(p, no_next);
  vector<ll> last(n + 1, no_next);

  for (ll i = p - 1; i >= 0; --i) {
    next_pos[i] = last[a[i]];
    last[a[i]] = i;
  }

  ll ans = 0;
  vector<ll> current_next(n + 1, no_next);
  vector<bool> on_floor(n + 1, false);
  set<pair<ll, ll>> floor_cars;

  for (ll i = 0; i < p; ++i) {
    const ll car = a[i];

    if (on_floor[car]) {
      floor_cars.erase({current_next[car], car});
    } else {
      ++ans;
      if (static_cast<ll>(floor_cars.size()) == k) {
        auto it = prev(floor_cars.end());
        on_floor[it->second] = false;
        floor_cars.erase(it);
      }
      on_floor[car] = true;
    }

    current_next[car] = next_pos[i];
    floor_cars.insert({current_next[car], car});
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
