#!/usr/bin/env node

// Series landing pages — one per series in data/match-data.json.
// Output: series/<slug>.html.
// Template modelled on redesign-import/cricket-dist/series-border-gavaskar.html.

import fs from 'fs';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtDateRange(a, b) {
  const s = parseUTC(a); if (!s) return '';
  const e = parseUTC(b);
  if (!e || +e === +s) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} ${s.getUTCFullYear()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()} ${e.getUTCFullYear()}`;
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()} ${e.getUTCFullYear()}`;
}

function fmtShortDate(ymd) {
  const d = parseUTC(ymd); if (!d) return '';
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const FMT_CLASS = {
  'test-series': 'test',
  'odi-series': 'odi',
  't20i-series': 't20i',
  'single-match': 'league',
  'franchise-league': 'league',
  'icc-tournament': 'icc',
};
function fmtChip(match) {
  let cls = FMT_CLASS[match.format] || 'league';
  if (match.format === 'franchise-league' && String(match.id || '').startsWith('ipl-')) cls = 'ipl';
  if ((match.name || '').toLowerCase().includes('women')) cls = 'womens';
  const label = { test: 'TEST', odi: 'ODI', t20i: 'T20I', ipl: 'IPL', league: 'LEAGUE', icc: 'ICC', womens: "WOMEN'S" }[cls];
  return `<span class="fmt ${cls}">${label}</span>`;
}

const TEAM_CODE_MAP = {
  IND: 'IN', AUS: 'AU', ENG: 'UK', NZL: 'NZ', PAK: 'PK', BAN: 'BD', AFG: 'AF', SL: 'SL', IN: 'IN', AU: 'AU', UK: 'UK', PK: 'PK',
};
const TEAM_DISPLAY = { IND: 'India', AUS: 'Australia', ENG: 'England', PAK: 'Pakistan', NZ: 'New Zealand', ZA: 'South Africa',
  BD: 'Bangladesh', AFG: 'Afghanistan', SL: 'Sri Lanka', WI: 'West Indies', IN: 'India', UK: 'England', AU: 'Australia', PK: 'Pakistan', INTL: 'International Field' };

function squadsForMatch(match, allPlayers) {
  const teams = (match.teams || []).filter(t => t !== 'INTL');
  if (!teams.length) return [];
  return teams.map(teamCode => {
    const natCode = TEAM_CODE_MAP[teamCode] || teamCode;
    const players = allPlayers
      .filter(p => p.nationalityCode === natCode)
      .sort((a, b) => (a.ranking || 99) - (b.ranking || 99))
      .slice(0, 6);
    return { side: teamCode, display: TEAM_DISPLAY[teamCode] || teamCode, players };
  });
}

function roleShort(role) {
  return { batter: 'BAT', bowler: 'BOWL', 'all-rounder': 'ALL', 'wicket-keeper': 'WK' }[role] || (role || '').toUpperCase();
}

function formatPlayerName(name) {
  // "SHARMA Rohit" → "R. Sharma"
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length < 2) return name || '';
  const surname = parts[0];
  const given = parts.slice(1).join(' ');
  const titleSurname = surname.charAt(0) + surname.slice(1).toLowerCase();
  return `${given.charAt(0)}. ${titleSurname}`;
}

function renderArc(match) {
  if (!Array.isArray(match.matches) || !match.matches.length) return '';
  const n = match.matches.length;
  const cols = Math.min(n, 5);
  return `<section class="section">
    <div class="eyebrow">§ 01 — Series Arc</div>
    <h2>${n} ${match.format === 'test-series' ? 'Test' : 'match'}${n > 1 ? (match.format === 'test-series' ? 's' : 'es') : ''}, ${new Set(match.matches.map(m => (m.venue || '').split(',').pop().trim())).size} ${match.format === 'test-series' ? 'cities' : 'venues'}</h2>
    <div class="arc" style="grid-template-columns:repeat(${cols},1fr)">
      ${match.matches.map((mm, i) => {
        const venueShort = (mm.venue || '').split(',')[0].trim();
        const venueCity = (mm.venue || '').split(',')[1]?.trim() || venueShort;
        return `<div class="m">
          <div class="n">${match.format === 'test-series' ? 'Test' : 'Match'} ${String(mm.matchNumber || i + 1).padStart(2, '0')}</div>
          <div class="t">${htmlEscape(venueCity || venueShort)}</div>
          <div class="dt">${htmlEscape(fmtShortDate(mm.date).toUpperCase())}</div>
          <div class="ven">${htmlEscape(venueShort)}</div>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

function renderSquads(match, allPlayers) {
  const sides = squadsForMatch(match, allPlayers);
  if (sides.length !== 2) return '';
  return `<section class="section">
    <div class="eyebrow">§ 02 — Squads</div>
    <h2>Who's in contention</h2>
    <div class="squads">
      ${sides.map(s => `<div class="sq">
        <h4>${htmlEscape(s.display)}</h4>
        ${s.players.map(p => {
          const tag = (p.specialties || []).includes('captain') ? ' / C' : '';
          return `<a class="li" href="../players/${htmlEscape(p.slug || p.id)}.html">
            <span class="no">#${p.ranking || '—'}</span>
            <span class="nm">${htmlEscape(formatPlayerName(p.name))}</span>
            <span class="rl">${htmlEscape(roleShort(p.role) + tag)}</span>
          </a>`;
        }).join('') || '<div class="li"><span class="no">—</span><span class="nm">No players indexed</span><span class="rl">—</span></div>'}
      </div>`).join('')}
    </div>
  </section>`;
}

function renderStorylines(match) {
  const lines = match.matchDetails?.storylines || [];
  if (!lines.length) return '';
  return `<section class="section">
    <div class="eyebrow">§ 03 — Storylines</div>
    <h2>What's at stake</h2>
    <div class="stor">
      ${lines.slice(0, 6).map((s, i) => `<div class="card">
        <div class="n">Thread ${String(i + 1).padStart(2, '0')}</div>
        <p>${htmlEscape(s)}</p>
      </div>`).join('')}
    </div>
  </section>`;
}

function renderHistorical(match) {
  const h = match.matchDetails?.historicalContext;
  if (!h) return '';
  return `<section class="section">
    <div class="eyebrow">§ 04 — Historical Context</div>
    <h2>Form book &amp; lore</h2>
    <p class="prose">${htmlEscape(h)}</p>
  </section>`;
}

function renderWatch(match) {
  const geos = match.broadcast?.geos || {};
  const order = ['IN', 'US', 'UK', 'AU', 'NZ', 'ZA', 'PK', 'BD'];
  const entries = order.filter(g => geos[g]?.primary).concat(Object.keys(geos).filter(g => !order.includes(g) && geos[g]?.primary));
  if (!entries.length) return '';
  return `<section class="section watch">
    <div class="eyebrow">§ 05 — Where to Watch</div>
    <h2>Broadcast partners</h2>
    <div class="wtable">
      ${entries.map(g => {
        const p = geos[g].primary;
        return `<div class="wrow">
          <div class="w-geo"><span class="w-code">${htmlEscape(g)}</span><span class="w-name">${htmlEscape(p.country || g)}</span></div>
          <div class="w-bc"><div class="w-bc-name">${htmlEscape(p.broadcaster || 'TBD')}</div>${p.notes ? `<div class="w-bc-notes">${htmlEscape(p.notes)}</div>` : ''}</div>
          <div class="w-cta">${p.url ? `<a class="watch-cta" href="${htmlEscape(p.url)}" target="_blank" rel="noopener">Watch →</a>` : '<span class="watch-cta disabled">no link</span>'}</div>
        </div>`;
      }).join('')}
    </div>
    <p class="prose" style="font-size:12.5px;margin-top:14px">⚠ Spoiler warning: live streams and broadcaster home pages often show scores. Disable autoplay and skip YouTube sidebars.</p>
  </section>`;
}

function renderConstituentMatches(match, hasPerMatchSheets) {
  if (!Array.isArray(match.matches) || !match.matches.length) return '';
  return `<section class="section">
    <div class="eyebrow">§ 06 — Match Sheets</div>
    <h2>Individual ${match.format === 'test-series' ? 'Tests' : 'matches'}</h2>
    <div class="mlist">
      ${match.matches.map((mm, i) => {
        const label = hasPerMatchSheets ? `<a class="mrow" href="../match/${match.id}-${mm.matchNumber || i + 1}.html">` : `<div class="mrow">`;
        const closer = hasPerMatchSheets ? '</a>' : '</div>';
        return `${label}
          <div class="c first"><span class="mn">${mm.matchNumber ?? i + 1}</span></div>
          <div class="c lbl">${htmlEscape((mm.matchType || 'Match').toUpperCase())}</div>
          <div class="c dt">${htmlEscape(fmtShortDate(mm.date))}</div>
          <div class="c nm">${htmlEscape(mm.name || '')}</div>
          <div class="c vn">${htmlEscape(mm.venue || '')}</div>
        ${closer}`;
      }).join('')}
    </div>
  </section>`;
}

function renderViewing(match) {
  const w = match.matchDetails?.watchNotes;
  if (!w) return '';
  return `<section class="section">
    <div class="eyebrow">§ 07 — Viewing Notes</div>
    <h2>When to tune in</h2>
    <p class="prose">${htmlEscape(w)}</p>
  </section>`;
}

function buildSeriesHtml(match, allPlayers, hasPerMatchSheets) {
  const built = new Date().toISOString().slice(0, 10);
  const dateLabel = fmtDateRange(match.startDate, match.endDate);
  const coverage = match.broadcast?.geos?.IN?.primary?.broadcaster
    || match.broadcast?.geos?.US?.primary?.broadcaster
    || match.broadcast?.geos?.UK?.primary?.broadcaster
    || 'TBD';
  const matchCount = Array.isArray(match.matches) ? match.matches.length : null;
  const teamsLabel = (match.teams || []).filter(t => t !== 'INTL').map(t => TEAM_DISPLAY[t] || t).join(' vs ') || 'International field';

  // Split name for hero typography
  const titleParts = match.name.split(/[—–\(]/);
  const heroH1 = titleParts.length >= 2
    ? `${htmlEscape(titleParts[0].trim())}<br/><span class="vs">${htmlEscape(titleParts.slice(1).join(' ').replace(/\)$/, '').trim())}</span>`
    : htmlEscape(match.name);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(match.name)} — No Spoiler Cricket</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:14px 0;border-bottom:1px dashed var(--rule-soft)}
.crumbs a{color:var(--ink-3)} .crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.section{padding:26px 0;border-bottom:1px dashed var(--rule-soft)}
.section h2{font-weight:800;font-size:22px;letter-spacing:-.01em;margin:0 0 6px}
.arc{display:grid;gap:0;border-top:3px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:16px}
.arc .m{padding:16px 14px;border-right:1px dashed var(--rule);position:relative}
.arc .m:last-child{border-right:0}
.arc .m .n{font-family:var(--font-mono);font-size:10px;letter-spacing:.22em;color:var(--saffron);font-weight:700;text-transform:uppercase}
.arc .m .t{font-weight:800;font-size:20px;letter-spacing:-.01em;margin-top:4px}
.arc .m .dt{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-2);letter-spacing:.08em;margin-top:4px}
.arc .m .ven{font-family:var(--font-mono);font-size:9.5px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;margin-top:6px}
.squads{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:14px}
.sq h4{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--saffron);font-weight:700;margin:0 0 10px}
.sq .li{display:grid;grid-template-columns:50px 1fr 60px;padding:8px 0;border-bottom:1px dashed var(--rule-soft);color:inherit;transition:background .08s}
.sq .li:hover{background:var(--paper-2)}
.sq .li .no{font-family:var(--font-mono);color:var(--ink-3);font-weight:600}
.sq .li .nm{font-weight:600}
.sq .li .rl{font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--ink-3);text-align:right;text-transform:uppercase}
.stor{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:14px}
.stor .card{padding:16px;border:1px solid var(--rule);border-left:3px solid var(--saffron)}
.stor .card .n{font-family:var(--font-mono);font-size:10px;letter-spacing:.22em;color:var(--saffron);font-weight:700;text-transform:uppercase}
.stor .card p{margin:8px 0 0;font-size:14.5px;line-height:1.45}
.wtable{display:grid;grid-template-columns:1fr;border-top:1px solid var(--rule);margin-top:14px}
.wrow{display:grid;grid-template-columns:180px 1fr 120px;gap:0;padding:14px 0;border-bottom:1px dashed var(--rule-soft);align-items:center}
.wrow .w-geo{display:flex;align-items:center;gap:10px;padding:0 10px 0 0}
.wrow .w-code{font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:.14em;color:#fff;background:var(--navy);padding:3px 8px}
.wrow .w-name{font-weight:600;font-size:14px}
.wrow .w-bc{padding:0 16px;min-width:0}
.wrow .w-bc-name{font-weight:600;font-size:15px;line-height:1.2}
.wrow .w-bc-notes{font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.4}
.wrow .w-cta{text-align:right}
.watch-cta{display:inline-flex;align-items:center;padding:9px 14px;background:var(--navy);color:#fff;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;border:1px solid var(--navy);line-height:1;transition:background .12s}
.watch-cta:hover{background:var(--saffron);border-color:var(--saffron)}
.watch-cta.disabled{background:transparent;color:var(--ink-3);border-color:var(--rule-soft);cursor:default}
.mlist{display:grid;grid-template-columns:1fr;margin-top:14px;border-top:1px solid var(--rule)}
.mrow{display:grid;grid-template-columns:60px 70px 120px 1.5fr 1fr;gap:0;padding:12px 0;border-bottom:1px dashed var(--rule-soft);align-items:center;color:inherit;transition:background .08s}
.mrow:hover{background:var(--paper-2)}
.mrow .c{padding:0 10px;min-width:0}
.mrow .c.first{padding-left:0}
.mrow .mn{font-weight:800;font-size:22px;letter-spacing:-.03em;color:var(--navy)}
.mrow .lbl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-2)}
.mrow .dt{font-family:var(--font-mono);font-size:12px}
.mrow .nm{font-weight:600;font-size:14px}
.mrow .vn{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.04em}
.prose{font-size:15px;line-height:1.6;color:var(--ink-2);margin:10px 0;max-width:72ch}
.hero .tag{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)}
.hero h1{font-weight:900;font-size:clamp(52px,6.5vw,96px);line-height:.9;letter-spacing:-.035em;margin:0}
.hero h1 .vs{color:var(--saffron);font-weight:500;font-style:italic;margin:0 .1em;display:block}
.hero .dev{font-family:var(--font-dev);font-size:18px;color:var(--saffron);font-weight:600;margin-top:8px}
.hero .sub{font-family:var(--font-mono);font-size:13px;letter-spacing:.04em;color:var(--ink-2);margin-top:16px;max-width:56ch}
@media (max-width:1100px){
  .squads{grid-template-columns:1fr}
  .stor{grid-template-columns:1fr}
  .wrow{grid-template-columns:1fr;gap:10px;padding:14px 10px}
  .wrow .w-cta{text-align:left}
  .mrow{grid-template-columns:44px 60px 1fr}
  .mrow .c.dt,.mrow .c.vn{display:none}
}
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
        <div class="mast-meta">Document <b>NSC/${htmlEscape(match.id.toUpperCase().slice(0, 14))}</b><br/><b>Series Sheet</b><br/>${htmlEscape(built.toUpperCase())}</div>
      </div>
      <nav class="platform">
        <a href="../index.html"><span class="num">01</span>Fixtures</a>
        <a href="../series/" class="on"><span class="num">02</span>Series</a>
        <a href="../match/"><span class="num">03</span>Match Sheets</a>
        <a href="../teams/"><span class="num">04</span>Teams</a>
        <a href="../players.html"><span class="num">05</span>Players</a>
        <span class="spacer"></span>
        <span class="stamp mono">§ 02 / Series</span>
      </nav>
    </div>
  </header>

  <main class="frame">
    <div class="crumbs"><a href="../index.html">Fixtures</a><span class="sep">/</span>${MONTH_NAMES[(parseUTC(match.startDate) || new Date()).getUTCMonth()]} 2026<span class="sep">/</span>${htmlEscape(match.name)}</div>

    <section class="hero">
      <div>
        <div class="tag">
          ${fmtChip(match)}
          <span>${htmlEscape(teamsLabel)}</span>
          <span style="color:var(--saffron)">${'★'.repeat(match.rating || 0)}</span>
          <span>${htmlEscape(dateLabel)}</span>
        </div>
        <h1>${heroH1}</h1>
        ${match.name_hi ? `<div class="dev">${htmlEscape(match.name_hi)}</div>` : ''}
        <p class="sub">${htmlEscape(match.matchDetails?.summary || match.description || '')}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Dates</span><span class="v sm">${htmlEscape(dateLabel)}</span></div>
        <div class="stat"><span class="k">Format</span><span class="v sm">${htmlEscape({ 'test-series': 'Test', 'odi-series': 'ODI', 't20i-series': 'T20I', 'franchise-league': 'Franchise T20', 'icc-tournament': 'ICC' }[match.format] || 'Series')}</span></div>
        <div class="stat"><span class="k">Venue</span><span class="v sm">${htmlEscape(match.venue || '—')}</span></div>
        <div class="stat"><span class="k">${match.format === 'test-series' ? 'Tests' : 'Matches'}</span><span class="v mono">${matchCount || '—'}</span></div>
        <div class="stat"><span class="k">Coverage (IN)</span><span class="v sm">${htmlEscape(coverage)}</span></div>
        <div class="stat"><span class="k">Rating</span><span class="v">${match.rating || '—'}★</span></div>
      </aside>
    </section>

    ${renderArc(match)}
    ${renderSquads(match, allPlayers)}
    ${renderStorylines(match)}
    ${renderConstituentMatches(match, hasPerMatchSheets)}
    ${renderHistorical(match)}
    ${renderWatch(match)}
    ${renderViewing(match)}

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · Series Sheet · ${htmlEscape(match.name)}</span>
        <span class="dev">धर्म · खेल · रोमांच</span>
        <span>Built ${built}</span>
      </div>
    </footer>

  </main>
</body>
</html>
`;
}

function main() {
  const data = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8'));
  let allPlayers = [];
  try { allPlayers = JSON.parse(fs.readFileSync('./data/players.json', 'utf8')).players || []; } catch {}
  const outDir = './series';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (const m of data.matches || []) {
    if (!m.id) continue;
    // Per-Test match sheets only exist for test-series with matches[]
    const hasPerMatchSheets = m.format === 'test-series' && Array.isArray(m.matches) && m.matches.length > 0;
    fs.writeFileSync(`${outDir}/${m.id}.html`, buildSeriesHtml(m, allPlayers, hasPerMatchSheets));
    n++;
  }
  console.log(`✓ wrote ${n} series landings to /series/`);
}

main();
