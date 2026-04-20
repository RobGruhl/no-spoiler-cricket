#!/usr/bin/env node

// Reads data/match-data.json, transforms to redesign "ticket row" shape,
// emits index.html in the Fixtures Platform aesthetic (Indian Railways × match ticket).

import fs from 'fs';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_HI  = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्तूबर','नवंबर','दिसंबर'];

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateRange(startYmd, endYmd) {
  const s = parseUTC(startYmd);
  if (!s) return '';
  const e = parseUTC(endYmd);
  if (!e || +e === +s) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()}`;
}

// Format class mapping — our data format → new shared.css .fmt class
const FMT_CLASS = {
  'test-series': 'test',
  'odi-series': 'odi',
  't20i-series': 't20i',
  'franchise-league': 'league',   // overridden to 'ipl' for ipl-2026
  'icc-tournament': 'icc',
  'single-match': 'league',
};
const FMT_LABEL = { test: 'TEST', odi: 'ODI', t20i: 'T20I', ipl: 'IPL', league: 'LEAGUE', icc: 'ICC', womens: "WOMEN'S" };

// Token color — navy/red/saffron/green
const TOK_COLOR = { test: 'red', odi: 'navy', t20i: 'saffron', ipl: 'green', league: 'navy', icc: 'navy', womens: 'navy' };

// Broadcaster shorthand — strip to the core label
function cvShort(str) {
  if (!str) return '';
  return String(str)
    .replace(/JioCinema.*|Disney\+ Hotstar.*|JioHotstar.*/i, 'JioHotstar')
    .replace(/Star Sports.*/i, 'Star Sports')
    .replace(/Sky Sports.*/i, 'Sky Sports')
    .replace(/Fox Cricket.*|Kayo Sports.*|Fox \/ Kayo.*/i, 'Fox · Kayo')
    .replace(/Willow TV.*/i, 'Willow TV')
    .replace(/SuperSport.*/i, 'SuperSport')
    .replace(/Sony Sports.*|SonyLIV.*/i, 'Sony Sports')
    .replace(/PTV Sports.*/i, 'PTV Sports')
    .replace(/TNT Sports.*|Discovery\+.*/i, 'TNT Sports')
    .replace(/BBC.*/i, 'BBC')
    .replace(/FanCode.*/i, 'FanCode')
    .replace(/ATN.*/i, 'ATN')
    .replace(/YuppTV.*/i, 'YuppTV')
    .replace(/beIN.*/i, 'beIN')
    .split(/[·,/]/)[0]
    .trim();
}

// Default overs per format (for the .ovr column)
function defaultOvers(fmtClass) {
  return { test: 450, odi: 100, t20i: 40, ipl: 40, league: 40, icc: 40, womens: 40 }[fmtClass] || '—';
}

function isWomensSeries(m) {
  const n = (m.name || '').toLowerCase();
  return n.includes("women") || n.includes('womens');
}

function transformMatch(m) {
  const month = m.startDate ? Number(m.startDate.slice(5, 7)) : 0;
  let fmtClass = FMT_CLASS[m.format] || 'league';
  if (m.format === 'franchise-league' && String(m.id).startsWith('ipl-')) fmtClass = 'ipl';
  if (isWomensSeries(m)) fmtClass = 'womens';

  const teams = m.teams || [];
  const featuresIndia = teams.includes('IND') || teams.includes('IN') || (m.venue || '').toLowerCase().includes('india');

  // Build the vs label
  const TEAM_LABEL = { IND: 'IND', IN: 'IND', AUS: 'AUS', AU: 'AUS', ENG: 'ENG', UK: 'ENG', PAK: 'PAK', PK: 'PAK',
    NZ: 'NZ', ZA: 'SA', BD: 'BAN', SL: 'SL', AFG: 'AFG', WI: 'WI', US: 'USA', INTL: 'Intl Field' };
  let vs = '';
  if (teams.length === 2) {
    vs = `${TEAM_LABEL[teams[0]] || teams[0]} vs ${TEAM_LABEL[teams[1]] || teams[1]}`;
  } else if (teams.length === 1 && teams[0] !== 'INTL') {
    vs = `${TEAM_LABEL[teams[0]] || teams[0]} Domestic`;
  } else {
    vs = 'Intl Field';
  }

  // Primary watch shortname — prefer India, fall back in order
  const geoOrder = ['IN', 'US', 'UK', 'AU'];
  let cv = '';
  for (const g of geoOrder) {
    const p = m.broadcast?.geos?.[g]?.primary;
    if (p?.broadcaster) { cv = cvShort(p.broadcaster); break; }
  }

  // Token letter from the ID (uppercase first character, up to 2 chars for IPL-final etc)
  const idBits = String(m.id).split('-');
  let tok = (idBits[0] || '').slice(0, 2).toUpperCase();
  if (m.id === 'ipl-2026') tok = 'IPL';
  if (m.id === 'asia-cup-2026') tok = 'AC';
  if (m.id?.startsWith('icc-t20-world')) tok = 'T20';
  if (m.id?.startsWith('icc-womens')) tok = 'W';
  if (m.id?.startsWith('ashes')) tok = 'ASH';
  if (m.id?.startsWith('aus-tour-ind')) tok = 'BGT';
  if (m.id === 'ind-tour-eng-2026') tok = 'ENG';
  if (tok.length > 3) tok = tok.slice(0, 3);

  return {
    start: m.startDate,
    end: m.endDate || m.startDate,
    dt: formatDateRange(m.startDate, m.endDate),
    month,
    name: m.name,
    name_hi: m.name_hi || '',
    venue: m.venue || '',
    teams,
    featuresIndia,
    rating: m.rating || 0,
    fmt: fmtClass,
    fmtLabel: FMT_LABEL[fmtClass] || fmtClass.toUpperCase(),
    tok,
    tokCol: TOK_COLOR[fmtClass] || 'navy',
    vs,
    prestige: m.prestige || [],
    cv: cv || 'TBD',
    overs: defaultOvers(fmtClass),
    matchCount: Array.isArray(m.matches) ? m.matches.length : 0,
    slug: m.id,
  };
}

function computeStats(rows) {
  return {
    total: rows.length,
    india: rows.filter(r => r.featuresIndia).length,
    tests: rows.filter(r => r.fmt === 'test').length,
    ipl: rows.filter(r => r.fmt === 'ipl').length,
    icc: rows.filter(r => r.fmt === 'icc').length,
    fiveStar: rows.filter(r => r.rating === 5).length,
  };
}

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function nextBoardPick(rows, todayYmd) {
  const future = rows.filter(r => r.rating === 5 && r.end >= todayYmd)
    .sort((a, b) => a.start.localeCompare(b.start));
  return future[0] || null;
}

function buildHtml(rows, stats, updatedLabel, todayYmd) {
  const matchesJson = JSON.stringify(rows);
  const updatedUpper = updatedLabel.toUpperCase();
  const pick = nextBoardPick(rows, todayYmd);

  const boardHtml = pick ? `
    <section class="board" style="margin-top:18px">
      <span class="tag">● NEXT ★★★★★</span>
      <div>
        <div class="vs">${htmlEscape(pick.vs).replace('vs', '<span class="x">vs</span>')}</div>
        ${pick.name_hi ? `<div class="dev">${htmlEscape(pick.name_hi)}</div>` : `<div class="dev">${htmlEscape(pick.name)}</div>`}
      </div>
      <div class="when">
        <b>${htmlEscape(pick.dt.toUpperCase())}</b>
        <span class="tm">${htmlEscape(pick.cv)}</span>
      </div>
      <a class="cta" href="series/${htmlEscape(pick.slug)}.html">Series Sheet →</a>
    </section>` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>No Spoiler Cricket — 2026 Fixtures</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="shared.css"/>
<style>
.hero{display:grid;grid-template-columns:1.4fr 1fr;gap:36px;padding:34px 0 28px;border-bottom:2px dashed var(--rule)}
.hero h1{font-weight:900;font-size:clamp(54px,7vw,100px);line-height:.88;letter-spacing:-.04em;margin:0}
.hero h1 .a{color:var(--saffron)}
.hero h1 .b{color:var(--green)}
.hero .dev{font-family:var(--font-dev);font-size:16px;color:var(--saffron);font-weight:600;margin-top:6px}
.hero .lead{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-top:16px;max-width:62ch}
.hero aside{border-left:2px dashed var(--rule);padding-left:26px;display:grid;grid-template-columns:1fr 1fr;gap:16px 22px;align-content:start}
.hero .stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.hero .stat .v{font-weight:800;font-size:30px;letter-spacing:-.02em;margin-top:4px;line-height:1;color:var(--navy)}
.hero .stat .v.sm{font-size:20px}
</style>
</head>
<body>
  <div class="tricolour thick"><span></span><span></span><span></span></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div>
          <div class="wordmark-dev">नो स्पॉइलर क्रिकेट</div>
          <div class="wordmark">No<span class="slash">/</span>Spoiler <span class="two">Cricket</span></div>
        </div>
        <div class="mast-meta">
          Platform №&nbsp;<b>1</b><br/>
          <b>Fixtures Board</b><br/>
          ${updatedUpper}
        </div>
      </div>
      <nav class="platform">
        <a href="index.html" class="on"><span class="num">01</span>Fixtures</a>
        <a href="series/"><span class="num">02</span>Series</a>
        <a href="match/"><span class="num">03</span>Match Sheets</a>
        <a href="teams/"><span class="num">04</span>Teams</a>
        <a href="players.html"><span class="num">05</span>Players</a>
        <span class="spacer"></span>
        <span class="stamp mono">EN · हिंदी</span>
      </nav>
    </div>
  </header>

  <main class="frame">

    <section class="hero">
      <div>
        <div class="eyebrow">ICC &amp; Franchise Cricket · Season 2026</div>
        <h1>The <span class="a">2026</span><br/>Season, <span class="b">Unspoiled</span>.</h1>
        <div class="dev">हर मैच · बिना स्पॉइलर</div>
        <div class="lead">Every fixture worth watching. Rated, grouped by month, never tells you who won.</div>
      </div>
      <aside>
        <div class="stat"><span class="k">Series on file</span><span class="v">${stats.total}</span></div>
        <div class="stat"><span class="k">Featuring India</span><span class="v">${stats.india}</span></div>
        <div class="stat"><span class="k">Tests</span><span class="v">${stats.tests}</span></div>
        <div class="stat"><span class="k">IPL</span><span class="v">${stats.ipl}</span></div>
        <div class="stat"><span class="k">ICC tournaments</span><span class="v sm">${stats.icc}</span></div>
        <div class="stat"><span class="k">★★★★★</span><span class="v sm">${stats.fiveStar}</span></div>
      </aside>
    </section>

    ${boardHtml}

    <section class="toolbar" id="toolbar">
      <div class="toolbar-row">
        <span class="tb-label">Rating</span>
        <button class="chip on" data-f="rating" data-v="0">All</button>
        <button class="chip" data-f="rating" data-v="3">★★★+</button>
        <button class="chip" data-f="rating" data-v="4">★★★★+</button>
        <button class="chip" data-f="rating" data-v="5">★★★★★</button>
        <span class="tb-label" style="margin-left:18px">Format</span>
        <button class="chip on" data-f="fmt" data-v="all">All</button>
        <button class="chip" data-f="fmt" data-v="test">Test</button>
        <button class="chip" data-f="fmt" data-v="odi">ODI</button>
        <button class="chip" data-f="fmt" data-v="t20i">T20I</button>
        <button class="chip" data-f="fmt" data-v="ipl">IPL</button>
        <button class="chip" data-f="fmt" data-v="league">League</button>
        <button class="chip" data-f="fmt" data-v="icc">ICC</button>
        <span class="showing"><b id="shown">—</b> of <b id="total">—</b> series</span>
      </div>
      <div class="toolbar-row">
        <span class="tb-label">Team</span>
        <button class="chip on" data-f="team" data-v="all">All</button>
        <button class="chip" data-f="team" data-v="IND">IND</button>
        <button class="chip" data-f="team" data-v="AUS">AUS</button>
        <button class="chip" data-f="team" data-v="ENG">ENG</button>
        <button class="chip" data-f="team" data-v="PAK">PAK</button>
        <span class="tb-label" style="margin-left:18px">Prestige</span>
        <button class="chip on" data-f="prestige" data-v="all">All</button>
        <button class="chip" data-f="prestige" data-v="ashes">Ashes</button>
        <button class="chip" data-f="prestige" data-v="border-gavaskar">BGT</button>
        <button class="chip" data-f="prestige" data-v="t20-world-cup">T20 WC</button>
        <button class="chip" data-f="prestige" data-v="ipl-final">IPL</button>
        <button class="chip" data-f="prestige" data-v="india-pakistan">Ind vs Pak</button>
      </div>
    </section>

    <section id="cal"></section>

    <section class="legend">
      <div>
        <h3>★ Rating Guide</h3>
        <div class="row2">
          <span class="k">★★★★★</span><span class="v">Unmissable — Ashes, BGT, WTC Final, IPL Playoffs</span>
          <span class="k">★★★★</span><span class="v">Marquee — ICC events, top bilateral tours</span>
          <span class="k">★★★</span><span class="v">Solid — league stage, mid-table bilaterals</span>
          <span class="k">★★</span><span class="v">Nice to catch — early group stages</span>
        </div>
      </div>
      <div>
        <h3>Format Codes</h3>
        <div class="row2">
          <span class="k">TEST</span><span class="v">5-day international · 2 innings/side</span>
          <span class="k">ODI</span><span class="v">One Day International · 50 overs</span>
          <span class="k">T20I</span><span class="v">International Twenty20</span>
          <span class="k">IPL</span><span class="v">Indian Premier League franchise</span>
          <span class="k">LEAGUE</span><span class="v">BBL · PSL · The Hundred · SA20 · MLC</span>
          <span class="k">ICC</span><span class="v">ICC tournament · WC · Champions Trophy</span>
        </div>
      </div>
      <div>
        <h3>Colophon</h3>
        <div class="row2">
          <span class="k">Set in</span><span class="v">Inter Tight · JetBrains Mono · Noto Devanagari</span>
          <span class="k">Palette</span><span class="v">Saffron · White · Green · Navy · Gold</span>
          <span class="k">Metaphor</span><span class="v">Indian Railways × match ticket</span>
          <span class="k">Edition</span><span class="v">${updatedLabel}</span>
        </div>
      </div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · 2026 Fixtures Board</span>
        <span class="dev">धर्म · खेल · रोमांच</span>
        <span>Admit One · No Refunds on Spoilers</span>
      </div>
    </footer>
  </main>

  <script>
  window.MONTHS = ${JSON.stringify(MONTH_NAMES)};
  window.MONTHS_HI = ${JSON.stringify(MONTHS_HI)};
  window.MATCHES = ${matchesJson};
  </script>
  <script>
  const state = {rating:0, fmt:"all", team:"all", prestige:"all"};
  const MONTHS = window.MONTHS, MONTHS_HI = window.MONTHS_HI;

  const starsHtml = (n) => {
    const on = "★".repeat(n), off = "★".repeat(5-n);
    return '<span class="stars">' + on + '<span class="off">' + off + '</span></span>';
  };

  const teamMatches = (r, t) => {
    if (t === 'all') return true;
    const map = {IND:['IND','IN'], ENG:['ENG','UK','GB'], AUS:['AUS','AU'], PAK:['PAK','PK']};
    const opts = map[t] || [t];
    return opts.some(x => r.teams.includes(x));
  };

  function match(r){
    if (state.rating && r.rating < state.rating) return false;
    if (state.fmt !== "all" && r.fmt !== state.fmt) return false;
    if (state.prestige !== "all" && !r.prestige.includes(state.prestige)) return false;
    if (state.team !== "all" && !teamMatches(r, state.team)) return false;
    return true;
  }

  function rowHtml(r){
    const href = r.slug ? ('series/' + r.slug + '.html') : '#';
    const tok = r.tok ? '<span class="tok ' + r.tokCol + '">' + r.tok + '</span>' : '';
    const vsHtml = r.vs.replace(/vs/, '<span class="x">vs</span>');
    const subBits = [];
    if (r.venue) subBits.push(r.venue);
    if (r.matchCount) subBits.push(r.matchCount + ' matches');
    return '<a class="row" href="' + href + '">' +
      '<div class="c first">' + tok + '</div>' +
      '<div class="c dt">' + r.dt + '<span class="tm">' + (r.cv || '') + '</span></div>' +
      '<div class="c"><span class="fmt ' + r.fmt + '">' + r.fmtLabel + '</span></div>' +
      '<div class="c"><div class="vs">' + vsHtml + '</div><div class="sub">' + r.name + '</div></div>' +
      '<div class="c ven">' + (r.venue || '') + '</div>' +
      '<div class="c ovr">' + r.overs + ' ov</div>' +
      '<div class="c">' + starsHtml(r.rating) + '</div>' +
      '<div class="c cv">' + (r.cv || '') + '</div>' +
    '</a>';
  }

  function render(){
    const host = document.getElementById("cal");
    const filtered = window.MATCHES.filter(match);
    document.getElementById("shown").textContent = filtered.length;
    document.getElementById("total").textContent = window.MATCHES.length;

    const groups = {};
    filtered.forEach(r => (groups[r.month] = groups[r.month] || []).push(r));

    let html = "";
    Object.keys(groups).sort((a,b) => a - b).forEach(mo => {
      const list = groups[mo];
      html += '<header class="month-head">' +
        '<div><div class="lbl">Month</div><div class="num mono">' + String(mo).padStart(2,"0") + '</div></div>' +
        '<div><div class="lbl">2026</div><div class="name">' + MONTHS[mo-1] + '</div><div class="dev">' + MONTHS_HI[mo-1] + '</div></div>' +
        '<div class="count">' + list.length + ' series</div>' +
      '</header>';
      list.forEach(r => html += rowHtml(r));
    });
    if (!filtered.length) html = '<div style="padding:60px 0;text-align:center;font-family:var(--font-mono);color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase">No fixtures match these filters.</div>';
    host.innerHTML = html;
  }

  document.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.f, v = btn.dataset.v;
      state[f] = (f === "rating") ? Number(v) : v;
      document.querySelectorAll('.chip[data-f="' + f + '"]').forEach(b => b.classList.toggle("on", b === btn));
      render();
    });
  });

  render();
  </script>
</body>
</html>
`;
}

function main() {
  const data = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8'));
  const rows = data.matches
    .map(transformMatch)
    .filter(r => r.start)
    .sort((a, b) => a.start.localeCompare(b.start));
  const stats = computeStats(rows);
  const updated = parseUTC((data.lastUpdated || '').slice(0, 10)) || new Date();
  const updatedLabel = `${String(updated.getUTCDate()).padStart(2, '0')} ${MONTH_SHORT[updated.getUTCMonth()].toUpperCase()} ${updated.getUTCFullYear()}`;
  const todayYmd = new Date().toISOString().slice(0, 10);

  const html = buildHtml(rows, stats, updatedLabel, todayYmd);
  fs.writeFileSync('./index.html', html);
  console.log(`✓ wrote index.html — ${rows.length} series · ${stats.india} featuring India · ${stats.tests} tests · ${stats.ipl} IPL · ${stats.icc} ICC`);
}

main();
