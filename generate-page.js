#!/usr/bin/env node

// Reads data/match-data.json, transforms to a compact row shape, embeds it in
// index.html alongside the shared.css paper/ink calendar layout.

import fs from 'fs';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateRange(startYmd, endYmd) {
  const s = parseUTC(startYmd);
  if (!s) return '';
  const e = parseUTC(endYmd);
  if (!e || +e === +s) return `${WEEKDAY_SHORT[s.getUTCDay()]}, ${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()}`;
}

const FORMAT_CODE = {
  'test-series': 'test',
  'odi-series': 'odi',
  't20i-series': 't20i',
  'single-match': 'single',
  'franchise-league': 'franchise',
  'icc-tournament': 'icc',
};

const FORMAT_LABEL = {
  test: 'TEST',
  odi: 'ODI',
  t20i: 'T20I',
  single: 'SINGLE',
  franchise: 'FRNCH',
  icc: 'ICC',
};

const PRIMARY_GEO_ORDER = ['IN', 'US', 'UK', 'AU', 'PK', 'NZ', 'ZA', 'BD'];

function transformMatch(m) {
  const month = m.startDate ? Number(m.startDate.slice(5, 7)) : 0;
  const format = FORMAT_CODE[m.format] || m.format || 'single';
  const prestige = m.prestige || [];
  const conditions = m.conditions || [];
  const teams = m.teams || [];
  const featuresIndia = teams.includes('IND') || teams.includes('IN') || (m.venue || '').toLowerCase().includes('india');

  const geos = PRIMARY_GEO_ORDER.filter(g => m.broadcast?.geos?.[g]?.primary?.url);
  const otherGeos = Object.keys(m.broadcast?.geos || {})
    .filter(g => !PRIMARY_GEO_ORDER.includes(g) && m.broadcast.geos[g]?.primary?.url);

  const matchCount = Array.isArray(m.matches) ? m.matches.length : 0;

  return {
    d: formatDateRange(m.startDate, m.endDate),
    start: m.startDate,
    end: m.endDate || m.startDate,
    month,
    name: m.name,
    venue: m.venue || '',
    teams,
    featuresIndia,
    rating: m.rating || 0,
    format,
    prestige,
    conditions,
    geos,
    otherGeos,
    matchCount,
    slug: m.id,
  };
}

function computeStats(rows) {
  return {
    total: rows.length,
    india: rows.filter(r => r.featuresIndia).length,
    tests: rows.filter(r => r.format === 'test').length,
    franchises: rows.filter(r => r.format === 'franchise').length,
    icc: rows.filter(r => r.format === 'icc').length,
    fiveStar: rows.filter(r => r.rating === 5).length,
  };
}

function buildHtml(rows, stats, updatedLabel) {
  const matchesJson = JSON.stringify(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>No Spoiler Cricket — 2026 Fixtures</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="shared.css"/>
<style>
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:40px;padding:44px 0 32px;border-bottom:1px solid var(--rule)}
.hero h1{font-family:var(--font-sans);font-weight:800;font-size:clamp(56px,7vw,104px);line-height:.88;letter-spacing:-.045em;margin:0}
.hero h1 .tri{background:linear-gradient(90deg,var(--india-saffron) 0 33%,var(--ink) 33% 66%,var(--india-green) 66% 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero .lead{font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin-top:18px}
.hero aside{border-left:1px solid var(--rule);padding-left:32px;display:grid;grid-template-columns:repeat(2,1fr);gap:18px 24px;align-content:start}
.stat{display:block}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-family:var(--font-sans);font-weight:700;font-size:32px;letter-spacing:-.02em;line-height:1;margin-top:4px}
.stat .v.sm{font-size:22px}
.toolbar{position:sticky;top:0;background:var(--paper);z-index:10;border-bottom:1px solid var(--rule);padding:12px 0 10px;margin-top:18px}
.toolbar-row{display:flex;flex-wrap:wrap;gap:6px 6px;align-items:center}
.toolbar-row + .toolbar-row{margin-top:8px}
.tb-label{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin-right:10px;min-width:56px}
.showing{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;margin-left:auto}
.showing b{color:var(--ink);font-weight:600}
.cal{margin-top:0}
.row{display:grid;grid-template-columns:56px 72px 120px 1fr 150px 90px 120px 80px;gap:0;padding:10px 0;border-bottom:1px solid var(--rule-soft);align-items:center;transition:background .08s;color:inherit}
.row:hover{background:var(--paper-2)}
.row .c{padding:0 10px;display:flex;align-items:center;min-width:0}
.row .c.first{padding-left:0}
.row .name{font-family:var(--font-sans);font-weight:600;font-size:16px;letter-spacing:-.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .venue{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.04em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .dt{font-family:var(--font-mono);font-size:12px;letter-spacing:.02em}
.row .mc{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;text-align:right}
.row .cond{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-2);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .bc{font-family:var(--font-mono);font-size:13px;text-align:right;line-height:1;display:flex;gap:4px;justify-content:flex-end;align-items:center}
.row .bc .f{display:inline-block;font-size:16px}
.row .bc .more{font-size:10px;color:var(--ink-3);letter-spacing:.08em;margin-left:2px}
.row .bc.tbd{font-size:10.5px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase}
.row.india{background:linear-gradient(90deg, rgba(255,153,51,.10), transparent 45%)}
.row.ashes{background:linear-gradient(90deg, rgba(0,48,135,.10), transparent 45%)}
.row.wc{background:linear-gradient(90deg, rgba(201,164,60,.18), transparent 45%)}
.legend{margin-top:48px;padding:22px 0;border-top:3px solid var(--ink);border-bottom:1px solid var(--rule);display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:32px}
.legend h3{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin:0 0 14px;font-weight:500}
.legend .row2{display:grid;grid-template-columns:auto 1fr;column-gap:14px;row-gap:8px;font-family:var(--font-mono);font-size:12px}
.legend .row2 .k{color:var(--ink);font-weight:600;letter-spacing:.04em}
.legend .row2 .v{color:var(--ink-3)}
@media (max-width:1100px){
  .row{grid-template-columns:50px 60px 110px 1fr 90px}
  .row .c.cond,.row .c.bc,.row .c.mc,.row .c.venue{display:none}
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:1px solid var(--rule);padding-top:20px}
}
@media (max-width:640px){
  .row{grid-template-columns:48px 1fr 70px}
  .row .c.first,.row .c:nth-child(4),.row .c:nth-child(8){display:flex}
  .row .c:nth-child(2),.row .c:nth-child(3),.row .c.venue,.row .c.cond,.row .c.bc{display:none}
}
</style>
</head>
<body>
  <div class="tricolour thick"></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div>
          <div class="wordmark">No<span class="slash">/</span>Spoiler<br/>Cricket
            <span class="sub">International Cricket · Fixtures &amp; Watch Guide · Season MMXXVI</span>
          </div>
        </div>
        <div class="mast-meta">
          Edition <b>2026</b><br/>
          Document <b>NSC/FIX/26</b><br/>
          Updated <b>${updatedLabel}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="index.html" class="on">01 — Fixtures</a>
        <a href="players.html">02 — Players</a>
        <a href="ipl.html">03 — IPL</a>
        <span class="spacer"></span>
        <span class="edition mono">EN</span>
      </nav>
    </div>
  </header>

  <main class="frame">

    <section class="hero">
      <div>
        <div class="eyebrow">International &amp; Franchise Cricket · 2026</div>
        <h1>The 2026<br/>Cricket Season, <span class="tri">Unspoiled</span>.</h1>
        <p class="lead">Every series worth watching. Filtered, coded, and scheduled — without telling you who won.</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Fixtures on file</span><span class="v">${stats.total}</span></div>
        <div class="stat"><span class="k">Featuring India</span><span class="v">${stats.india}</span></div>
        <div class="stat"><span class="k">Test series</span><span class="v">${stats.tests}</span></div>
        <div class="stat"><span class="k">Franchise leagues</span><span class="v">${stats.franchises}</span></div>
        <div class="stat"><span class="k">ICC tournaments</span><span class="v sm">${stats.icc}</span></div>
        <div class="stat"><span class="k">★★★★★ fixtures</span><span class="v sm">${stats.fiveStar}</span></div>
      </aside>
    </section>

    <section class="toolbar" id="toolbar">
      <div class="toolbar-row">
        <span class="tb-label">Rating</span>
        <button class="chip on" data-f="rating" data-v="0">All</button>
        <button class="chip" data-f="rating" data-v="3">★★★+</button>
        <button class="chip" data-f="rating" data-v="4">★★★★+</button>
        <button class="chip" data-f="rating" data-v="5">★★★★★</button>
        <span class="tb-label" style="margin-left:18px">Format</span>
        <button class="chip on" data-f="format" data-v="all">All</button>
        <button class="chip" data-f="format" data-v="test">Test</button>
        <button class="chip" data-f="format" data-v="odi">ODI</button>
        <button class="chip" data-f="format" data-v="t20i">T20I</button>
        <button class="chip" data-f="format" data-v="franchise">Franchise</button>
        <button class="chip" data-f="format" data-v="icc">ICC</button>
        <span class="showing"><b id="shown">—</b> of <b id="total">—</b> fixtures</span>
      </div>
      <div class="toolbar-row">
        <span class="tb-label">Team</span>
        <button class="chip on" data-f="team" data-v="all">All</button>
        <button class="chip" data-f="team" data-v="IND">India</button>
        <button class="chip" data-f="team" data-v="ENG">England</button>
        <button class="chip" data-f="team" data-v="AUS">Australia</button>
        <button class="chip" data-f="team" data-v="PAK">Pakistan</button>
        <span class="tb-label" style="margin-left:18px">Prestige</span>
        <button class="chip on" data-f="prestige" data-v="all">All</button>
        <button class="chip" data-f="prestige" data-v="ashes">Ashes</button>
        <button class="chip" data-f="prestige" data-v="border-gavaskar">BGT</button>
        <button class="chip" data-f="prestige" data-v="world-cup">World Cup</button>
        <button class="chip" data-f="prestige" data-v="t20-world-cup">T20 WC</button>
        <button class="chip" data-f="prestige" data-v="ipl-final">IPL Final</button>
        <button class="chip" data-f="prestige" data-v="india-pakistan">Ind vs Pak</button>
      </div>
    </section>

    <section class="cal" id="cal"></section>

    <section class="legend">
      <div>
        <h3>★ Rating Guide</h3>
        <div class="row2">
          <span class="k">★★★★★</span><span class="v">Can't miss — World Cup, Ashes, BGT, IPL final</span>
          <span class="k">★★★★</span><span class="v">Major fixtures — ICC, India tours, big franchise</span>
          <span class="k">★★★</span><span class="v">Good cricket — established franchise leagues</span>
          <span class="k">★★</span><span class="v">Nice to catch — domestic / filler bilateral</span>
          <span class="k">★</span><span class="v">Completionist</span>
        </div>
      </div>
      <div>
        <h3>Format Codes</h3>
        <div class="row2">
          <span class="k">TEST</span><span class="v">Test series (5 days per match)</span>
          <span class="k">ODI</span><span class="v">One-Day Internationals (50 overs)</span>
          <span class="k">T20I</span><span class="v">International T20 bilateral</span>
          <span class="k">FRNCH</span><span class="v">Franchise T20 league (IPL, PSL, BBL…)</span>
          <span class="k">ICC</span><span class="v">ICC tournament (World Cup etc.)</span>
        </div>
      </div>
      <div>
        <h3>Colophon</h3>
        <div class="row2">
          <span class="k">Set in</span><span class="v">Inter Tight · JetBrains Mono</span>
          <span class="k">Colours</span><span class="v">Willow-cream · Ball-red · India tri-colour</span>
          <span class="k">Edition</span><span class="v">${updatedLabel}</span>
          <span class="k">Source</span><span class="v">FTP calendar · editorial selection</span>
        </div>
      </div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · 2026 Fixtures</span>
        <span>§ 01 — Fixtures</span>
        <span>Built ${stamp}</span>
      </div>
    </footer>
  </main>

  <script>
  window.MONTHS = ${JSON.stringify(MONTH_NAMES)};
  window.MATCHES = ${matchesJson};
  </script>
  <script>
  const state = {rating:0, format:"all", team:"all", prestige:"all"};
  const MONTHS = window.MONTHS;
  const FORMAT_LABEL = ${JSON.stringify(FORMAT_LABEL)};
  const GEO_FLAG = {IN:"🇮🇳",US:"🇺🇸",UK:"🇬🇧",AU:"🇦🇺",PK:"🇵🇰",NZ:"🇳🇿",ZA:"🇿🇦",BD:"🇧🇩",INTL:"🌐"};

  const starsHtml = (n) => {
    const on = "★".repeat(n), off = "★".repeat(5-n);
    return \`<span class="stars">\${on}<span class="off">\${off}</span></span>\`;
  };
  const condMap = {"pace-friendly":"PACE", "spin-friendly":"SPIN", "batting":"BAT", "swinging":"SWG", "bouncy":"BNC", "flat":"FLT", "day-night":"D/N", "pink-ball":"PNK"};
  const condHtml = (arr) => (arr||[]).map(c=>condMap[c]||c.toUpperCase()).join(" · ");
  const geoCell = (r) => {
    if (!r.geos.length && !r.otherGeos.length) return '<span class="bc tbd">TBD</span>';
    const main = r.geos.map(g => \`<span class="f" title="\${g}">\${GEO_FLAG[g]||g}</span>\`).join("");
    const extra = r.otherGeos.length ? \`<span class="more">+\${r.otherGeos.length}</span>\` : "";
    return main + extra;
  };
  const teamMatches = (r, t) => {
    if (t === 'all') return true;
    // Accept both 3-letter (IND/AUS/ENG) and 2-letter (IN/UK/AU) forms in data
    const map = {IND:['IND','IN'], ENG:['ENG','UK','GB'], AUS:['AUS','AU'], PAK:['PAK','PK']};
    const opts = map[t] || [t];
    return opts.some(x => r.teams.includes(x));
  };

  function match(r){
    if (state.rating && r.rating < state.rating) return false;
    if (state.format!=="all" && r.format!==state.format) return false;
    if (state.prestige!=="all" && !r.prestige.includes(state.prestige)) return false;
    if (state.team!=="all" && !teamMatches(r, state.team)) return false;
    return true;
  }

  function render(){
    const host = document.getElementById("cal");
    const grouped = {};
    const filtered = window.MATCHES.filter(match);
    filtered.forEach(r => (grouped[r.month] = grouped[r.month] || []).push(r));
    document.getElementById("shown").textContent = filtered.length;
    document.getElementById("total").textContent = window.MATCHES.length;

    let html = "";
    Object.keys(grouped).sort((a,b)=>a-b).forEach(m => {
      const fixtures = grouped[m];
      html += \`<header class="month-head">
        <div><div class="lbl">Month</div><div class="num mono">\${String(m).padStart(2,"0")}</div></div>
        <div><div class="lbl">2026</div><div class="name">\${MONTHS[m-1]}</div></div>
        <div class="count">\${fixtures.length} fixture\${fixtures.length!==1?"s":""}</div>
      </header>\`;
      fixtures.forEach(r => {
        const href = r.slug ? \`match-details/\${r.slug}.html\` : "#";
        const isAshes = r.prestige.includes('ashes');
        const isWC = r.prestige.includes('world-cup') || r.prestige.includes('t20-world-cup') || r.prestige.includes('champions-trophy');
        const cls = isWC?'wc':isAshes?'ashes':(r.featuresIndia?'india':'');
        const fmtLabel = FORMAT_LABEL[r.format] || r.format.toUpperCase();
        const codeCls = r.format==='icc' ? 'code icc' : r.format==='test' ? 'code inv' : 'code';
        const countLabel = r.matchCount ? \`\${r.matchCount} \${r.format==='test'?'test':r.format==='icc'?'match':'m'}\` : '';
        html += \`<a class="row \${cls}" href="\${href}">
          <div class="c first">\${starsHtml(r.rating)}</div>
          <div class="c"><span class="\${codeCls}">\${fmtLabel}</span></div>
          <div class="c dt">\${r.d}</div>
          <div class="c"><span class="name">\${r.name}</span></div>
          <div class="c venue">\${r.venue}</div>
          <div class="c cond">\${condHtml(r.conditions)}</div>
          <div class="c bc">\${geoCell(r)}</div>
          <div class="c mc">\${countLabel}</div>
        </a>\`;
      });
    });
    if (!filtered.length) html = \`<div style="padding:60px 0;text-align:center;font-family:var(--font-mono);color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase">No fixtures match these filters.</div>\`;
    host.innerHTML = html;
  }

  document.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.f, v = btn.dataset.v;
      state[f] = (f==="rating") ? Number(v) : v;
      document.querySelectorAll(\`.chip[data-f="\${f}"]\`).forEach(b => b.classList.toggle("on", b===btn));
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

  const html = buildHtml(rows, stats, updatedLabel);
  fs.writeFileSync('./index.html', html);
  console.log(`✓ wrote index.html — ${rows.length} fixtures · ${stats.india} featuring India · ${stats.tests} tests · ${stats.franchises} franchises · ${stats.icc} ICC`);
}

main();
