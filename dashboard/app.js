// Token Launch Radar dashboard. Everything it shows comes from window.RADAR,
// the data.js main.ts writes beside this page: the page works fully offline.
// It renders the ranked board with sortable columns and filters, and a detail
// panel per protocol with the model's arithmetic and the farm plan.

(function () {
  'use strict';
  var DATA = window.RADAR;
  var rowsEl = document.getElementById('rows');
  var headEl = document.getElementById('head-row');
  var detailEl = document.getElementById('detail');
  var emptyEl = document.getElementById('empty');
  var countEl = document.getElementById('count');
  if (!DATA || !rowsEl || !headEl || !detailEl) return;

  var state = { q: '', category: '', chain: '', watch: false, key: 'rank', dir: 1, slug: null };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  }
  function moneyFull(n) {
    return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function pct(v) {
    if (v === null || v === undefined) return '<span class="chains">n/a</span>';
    var cls = v >= 0 ? 'up' : 'down';
    return '<span class="' + cls + '">' + (v >= 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function ageText(days) {
    if (days === null) return 'unknown';
    if (days < 60) return days + 'd';
    if (days < 730) return Math.round(days / 30.4) + ' mo';
    return (days / 365.25).toFixed(1) + ' yrs';
  }
  function chainText(chains) {
    if (!chains.length) return '—';
    if (chains.length <= 2) return esc(chains.join(', '));
    return esc(chains[0] + ', ' + chains[1]) + ' <span class="chains">+' + (chains.length - 2) + '</span>';
  }

  /* header stats */
  var watchCount = DATA.rows.filter(function (r) { return r.watchlist; }).length;
  document.getElementById('stats').innerHTML =
    chip(DATA.scanned, 'protocols scanned') +
    chip(DATA.rows.length, 'pre-token ranked') +
    chip(watchCount, 'watchlist tracked') +
    chip(DATA.as_of, 'snapshot date');
  function chip(v, k) {
    return '<div class="chip"><span class="v">' + esc(v) + '</span><span class="k">' + esc(k) + '</span></div>';
  }

  /* filter options, built from the rows themselves */
  function fillSelect(id, values) {
    var sel = document.getElementById(id);
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }
  var cats = {}, chains = {};
  DATA.rows.forEach(function (r) {
    if (r.category) cats[r.category] = true;
    r.chains.forEach(function (c) { chains[c] = true; });
  });
  fillSelect('f-category', Object.keys(cats).sort());
  fillSelect('f-chain', Object.keys(chains).sort());

  /* sortable columns */
  var COLUMNS = [
    { key: 'rank', label: '#', num: true },
    { key: 'name', label: 'Protocol', num: false },
    { key: 'category', label: 'Category', num: false },
    { key: 'chains', label: 'Chains', num: false },
    { key: 'tvl_usd', label: 'TVL', num: true },
    { key: 'change_7d', label: '7d change', num: true },
    { key: 'age_days', label: 'Age', num: true },
    { key: 'multiple', label: 'Multiple', num: true },
    { key: 'implied_value_usd', label: 'Implied value', num: true }
  ];
  headEl.innerHTML = COLUMNS.map(function (c) {
    return '<th data-key="' + c.key + '"' + (c.num ? ' class="num"' : '') + '>' + c.label + '</th>';
  }).join('');
  headEl.addEventListener('click', function (ev) {
    var th = ev.target.closest('th');
    if (!th) return;
    var key = th.getAttribute('data-key');
    if (state.key === key) state.dir = -state.dir;
    else { state.key = key; state.dir = key === 'name' || key === 'category' ? 1 : -1; }
    render();
  });

  function valueOf(r, key) {
    if (key === 'chains') return r.chains.join(' ');
    var v = r[key];
    return v === null || v === undefined ? -Infinity : v;
  }
  function visible() {
    var q = state.q.trim().toLowerCase();
    var list = DATA.rows.filter(function (r) {
      if (state.watch && !r.watchlist) return false;
      if (state.category && r.category !== state.category) return false;
      if (state.chain && r.chains.indexOf(state.chain) === -1) return false;
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.slug.indexOf(q) === -1) return false;
      return true;
    });
    var key = state.key, dir = state.dir;
    list.sort(function (a, b) {
      var va = valueOf(a, key), vb = valueOf(b, key);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return a.rank - b.rank;
    });
    return list;
  }

  function render() {
    var list = visible();
    countEl.textContent = list.length + ' of ' + DATA.rows.length + ' protocols';
    emptyEl.hidden = list.length > 0;
    Array.prototype.forEach.call(headEl.children, function (th) {
      var on = th.getAttribute('data-key') === state.key;
      th.classList.toggle('sorted', on);
      if (on) th.textContent = th.textContent.replace(/ [▲▼]$/, '') + (state.dir === 1 ? ' ▲' : ' ▼');
    });
    rowsEl.innerHTML = list.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"' + (r.slug === state.slug ? ' class="selected"' : '') + '>' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td class="name">' + esc(r.name) + (r.watchlist ? '<span class="badge">Watchlist</span>' : '') +
          '<span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || 'Uncategorised') + '</td>' +
        '<td>' + chainText(r.chains) + '</td>' +
        '<td class="num money">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num money">' + r.multiple.toFixed(3) + 'x</td>' +
        '<td class="num implied">' + money(r.implied_value_usd) + '</td></tr>';
    }).join('');
  }

  /* detail panel */
  function basisText(r) {
    if (r.multiple_basis === 'category') {
      return 'Median market-cap/TVL of the ' + r.multiple_peers + ' tokened ' + esc(r.category) +
        ' protocols in the snapshot: what the market already pays for a dollar of ' + esc(r.category) + ' TVL.';
    }
    return 'This category has fewer than 3 tokened peers in the snapshot, so the multiple is the global tokened median across ' +
      r.multiple_peers + ' protocols: the whole market\'s price for a dollar of TVL.';
  }
  function openDetail(r) {
    state.slug = r.slug;
    var changeNote = r.change_7d === null ? 'no 7-day change reported, so momentum is neutral' :
      '7-day TVL change of ' + (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%, clamped to the [-60%, +120%] band';
    var ageNote = r.listed_at === null ? 'no listing date recorded, so maturity is neutral' :
      'tracked since ' + r.listed_at + ' (' + ageText(r.age_days) + '), on the five-year ramp from 0.80 to 1.20';
    detailEl.innerHTML =
      '<button class="close" id="d-close" aria-label="Close detail">&times;</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<span class="d-slug">' + esc(r.slug) + '</span>' +
      '<div class="pill-row">' +
        '<span class="pill rank">Rank #' + r.rank + ' of ' + DATA.rows.length + '</span>' +
        (r.watchlist ? '<span class="pill watch">Watchlist</span>' : '') +
        '<span class="pill">' + esc(r.category || 'Uncategorised') + '</span>' +
        '<span class="pill">' + esc(r.chains.join(' · ') || 'no chains listed') + '</span>' +
      '</div>' +
      '<div class="stat-grid">' +
        stat(moneyFull(r.tvl_usd), 'Total value locked') +
        stat(r.change_7d === null ? 'n/a' : (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%', 'TVL change, 7 days') +
        stat(r.listed_at || 'unknown', 'Tracked since') +
        stat(ageText(r.age_days), 'Track record') +
      '</div>' +
      '<h3>Why this implied value</h3>' +
      '<div class="breakdown">' +
        line('TVL', moneyFull(r.tvl_usd)) +
        line('x category multiple', r.multiple.toFixed(4) + 'x') +
        line('x momentum', r.momentum.toFixed(3)) +
        line('x maturity', r.maturity.toFixed(3)) +
        '<div class="line total"><span>Implied value</span><span>' + moneyFull(r.implied_value_usd) + '</span></div>' +
        '<p class="why">' + basisText(r) + ' Momentum: ' + changeNote + '. Maturity: ' + ageNote + '.</p>' +
      '</div>' +
      '<h3>Farm plan</h3>' +
      '<ol class="farm">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    document.getElementById('d-close').addEventListener('click', function () {
      state.slug = null;
      history.replaceState(null, '', location.pathname + location.search);
      showHint();
      render();
    });
    render();
  }
  function stat(v, k) {
    return '<div class="stat"><span class="v">' + esc(v) + '</span><span class="k">' + esc(k) + '</span></div>';
  }
  function line(k, v) {
    return '<div class="line"><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>';
  }
  function showHint() {
    var top = DATA.rows.slice(0, 5);
    detailEl.innerHTML =
      '<h2>Reading the board</h2>' +
      '<p class="hint">Rank is the model\'s claim: <strong>TVL x category multiple x momentum x maturity</strong>. ' +
      'The multiple comes from protocols whose tokens already trade, so a pre-token protocol is priced the way the market ' +
      'already prices its category. The global tokened median in this snapshot is <strong>' + DATA.global_multiple.toFixed(3) + 'x</strong> ' +
      'across ' + DATA.global_peers + ' protocols.</p>' +
      '<h3>Top of the board</h3>' +
      '<ol class="farm">' + top.map(function (r) {
        return '<li><strong>' + esc(r.name) + '</strong> — ' + money(r.implied_value_usd) + ' implied on ' + money(r.tvl_usd) + ' TVL (' + esc(r.category || 'uncategorised') + ')</li>';
      }).join('') + '</ol>' +
      '<p class="hint">Click any row for its breakdown and farm plan. Rows badged Watchlist are on the snapshot\'s watchlist: pre-token protocols above the ' + money(DATA.floor_usd) + ' TVL floor.</p>';
  }

  rowsEl.addEventListener('click', function (ev) {
    var tr = ev.target.closest('tr');
    if (!tr) return;
    var slug = tr.getAttribute('data-slug');
    var row = DATA.rows.find(function (r) { return r.slug === slug; });
    if (row) {
      history.replaceState(null, '', '#' + slug);
      openDetail(row);
      detailEl.scrollIntoView({ block: 'nearest' });
    }
  });

  /* controls */
  document.getElementById('q').addEventListener('input', function (ev) { state.q = ev.target.value; render(); });
  document.getElementById('f-category').addEventListener('change', function (ev) { state.category = ev.target.value; render(); });
  document.getElementById('f-chain').addEventListener('change', function (ev) { state.chain = ev.target.value; render(); });
  document.getElementById('f-watch').addEventListener('change', function (ev) { state.watch = ev.target.checked; render(); });

  /* deep link: #slug opens that protocol's detail */
  var start = DATA.rows.find(function (r) { return '#' + r.slug === location.hash; });
  if (start) openDetail(start); else showHint();
  render();
})();
