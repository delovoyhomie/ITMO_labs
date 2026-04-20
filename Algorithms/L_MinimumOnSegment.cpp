/**
 * @author: Slava Yakimenko
 */

#include <deque>
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

  deque<ll> q;
  bool first = true;
  for (ll i = 0; i < n; ++i) {
    while (!q.empty() && q.front() <= i - k) {
      q.pop_front();
    }

    while (!q.empty() && a[q.back()] >= a[i]) {
      q.pop_back();
    }
    q.push_back(i);

    if (i + 1 >= k) {
      if (!first) {
        cout << ' ';
      }
      first = false;
      cout << a[q.front()];
    }
  }
  cout << el;
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
