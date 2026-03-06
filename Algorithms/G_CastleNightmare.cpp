/**
 * @author: Slava Yakimenko
 */

#include <algorithm>
#include <iostream>
#include <queue>
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
  string s;
  cin >> s;

  vector<ll> w(26);
  for (ll i = 0; i < 26; ++i) {
    cin >> w[i];
  }

  ll n = static_cast<ll>(s.size());
  vector<ll> cnt(26, 0);
  for (ll i = 0; i < n; ++i) {
    ++cnt[s[i] - 'a'];
  }

  vector<vector<ll>> jobs;
  for (ll i = 0; i < 26; ++i) {
    if (cnt[i] >= 2) {
      ll lim = (n - cnt[i] + 2) / 2;
      jobs.push_back({lim, w[i], i});
    }
  }

  sort(all(jobs), [](const vector<ll>& a, const vector<ll>& b) {
    if (a[0] == b[0]) {
      if (a[1] == b[1]) {
        return a[2] > b[2];
      }
      return a[1] > b[1];
    }
    return a[0] > b[0];
  });

  ll t = static_cast<ll>(jobs.size());
  vector<ll> rk(26, 0);
  priority_queue<pair<ll, ll>> q;
  ll p = 0;
  for (ll cur = t; cur >= 1; --cur) {
    while (p < static_cast<ll>(jobs.size()) && jobs[p][0] >= cur) {
      q.push({-jobs[p][1], jobs[p][2]});
      ++p;
    }
    pair<ll, ll> x = q.top();
    q.pop();
    rk[x.second] = cur;
  }

  string ans(n, '?');
  vector<ll> left = cnt;
  for (ll i = 0; i < 26; ++i) {
    if (rk[i] > 0) {
      ll r = rk[i];
      ans[r - 1] = static_cast<char>('a' + i);
      ans[n - r] = static_cast<char>('a' + i);
      left[i] -= 2;
    }
  }

  ll pos = t;
  for (ll i = 0; i < 26; ++i) {
    while (left[i] > 0) {
      ans[pos] = static_cast<char>('a' + i);
      ++pos;
      --left[i];
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
