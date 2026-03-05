/**
 * @author: Slava Yakimenko
 */

#include <cctype>
#include <iostream>
#include <string>
#include <unordered_map>
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
  unordered_map<string, ll> v;
  vector<unordered_map<string, ll>> st;
  st.push_back(unordered_map<string, ll>());
  string s;

  while (cin >> s) {
    if (s == "{") {
      st.push_back(unordered_map<string, ll>());
      continue;
    }
    if (s == "}") {
      for (auto it = st.back().begin(); it != st.back().end(); ++it) {
        if (it->second == 0) {
          v.erase(it->first);
        } else {
          v[it->first] = it->second;
        }
      }
      st.pop_back();
      continue;
    }

    ll p = static_cast<ll>(s.find('='));
    string a = s.substr(0, p);
    string b = s.substr(p + 1);
    unsigned char c = static_cast<unsigned char>(b[0]);
    bool is_num = (c == '-') || isdigit(c);

    if (st.back().find(a) == st.back().end()) {
      if (v.find(a) == v.end()) {
        st.back()[a] = 0;
      } else {
        st.back()[a] = v[a];
      }
    }

    if (is_num) {
      ll x = stoll(b);
      if (x == 0) {
        v.erase(a);
      } else {
        v[a] = x;
      }
    } else {
      ll x = 0;
      if (v.find(b) != v.end()) {
        x = v[b];
      }
      cout << x << el;
      if (x == 0) {
        v.erase(a);
      } else {
        v[a] = x;
      }
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
