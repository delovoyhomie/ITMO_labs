/**
 * @author: Slava Yakimenko
 */

#include <algorithm>
#include <iostream>
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

void solve() {
  vector<string> a;
  string s;
  while (cin >> s) {
    a.push_back(s);
  }

  sort(all(a), [](const string& x, const string& y) { return x + y > y + x; });

  string ans;
  for (ll i = 0; i < static_cast<ll>(a.size()); ++i) {
    ans += a[i];
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
