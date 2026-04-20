/**
 * @author: Slava Yakimenko
 */

#include <deque>
#include <iostream>

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

void balance(deque<ll>& left, deque<ll>& right) {
  if (left.size() < right.size()) {
    left.push_back(right.front());
    right.pop_front();
  }
  if (left.size() > right.size() + 1) {
    right.push_front(left.back());
    left.pop_back();
  }
}

void solve() {
  ll n = 0;
  cin >> n;

  deque<ll> left;
  deque<ll> right;

  for (ll i = 0; i < n; ++i) {
    char type = 0;
    cin >> type;

    if (type == '+') {
      ll x = 0;
      cin >> x;
      right.push_back(x);
      balance(left, right);
    } else if (type == '*') {
      ll x = 0;
      cin >> x;
      right.push_front(x);
      balance(left, right);
    } else {
      cout << left.front() << el;
      left.pop_front();
      balance(left, right);
    }
  }
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
