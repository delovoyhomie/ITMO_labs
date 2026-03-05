/**
 * @author: Slava Yakimenko
 */

#include <algorithm>
#include <cctype>
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
  string s;
  cin >> s;

  const ll m = static_cast<ll>(s.size());
  vector<ll> animal_id(m, 0);
  vector<ll> trap_id(m, 0);

  ll animal_count = 0;
  ll trap_count = 0;
  for (ll i = 0; i < m; i++) {
    const unsigned char ch = static_cast<unsigned char>(s[i]);
    if (islower(ch)) {
      animal_id[i] = ++animal_count;
    } else {
      trap_id[i] = ++trap_count;
    }
  }

  vector<ll> answer(trap_count + 1, 0);
  vector<ll> st;
  st.reserve(m);

  for (ll i = 0; i < m; ++i) {
    if (!st.empty()) {
      const ll top = st.back();
      const unsigned char top_ch = static_cast<unsigned char>(s[top]);
      const unsigned char cur_ch = static_cast<unsigned char>(s[i]);

      const bool same_kind = tolower(top_ch) == tolower(cur_ch);
      const bool opposite_case =
          (islower(top_ch) && isupper(cur_ch)) || (isupper(top_ch) && islower(cur_ch));

      if (same_kind && opposite_case) {
        st.pop_back();
        if (isupper(top_ch)) {
          answer[trap_id[top]] = animal_id[i];
        } else {
          answer[trap_id[i]] = animal_id[top];
        }
        continue;
      }
    }
    st.push_back(i);
  }

  if (!st.empty()) {
    cout << "Impossible" << el;
    return;
  }

  cout << "Possible" << el;
  for (ll i = 1; i <= trap_count; ++i) {
    if (i > 1) {
      cout << ' ';
    }
    cout << answer[i];
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
