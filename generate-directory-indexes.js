#!/usr/bin/env node

// Simple listing pages for /series/ and /match/ so GH Pages doesn't 404
// when a user hits the bare directory URL. Linked from the platform nav.

import fs from 'fs';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtDateRange(a, b) {
  const s = parseUTC(a); if (!s) return '';
  const e = parseUTC(b);
  if (!e || +e === +s) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()}`;
}

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function mapFmt(s) {
  if (s.format === 'franchise-league' && String(s.id).startsWith('ipl-')) return 'ipl';
  if (s.format === 'test-series') return 'test';
  if (s.format === 'odi-series') return 'odi';
  if (s.format === 't20i-series') return 't20i';
  if (s.format === 'icc-tournament') return 'icc';
  return 'league';
}
function fmtLabel(s) { return { test: 'TEST', odi: 'ODI', t20i: 'T20I', ipl: 'IPL', league: 'LEAGUE', icc: 'ICC' }[mapFmt(s)]; }

function platformNav(active) {
  const slots = [
    { n: '01', label: 'Fixtures', href: '../index.html', key: 'fixtures' },
    { n: '02', label: 'Series', href: '../series/', key: 'series' },
    { n: '03', label: 'Match Sheets', href: '../match/', key: 'match' },
    { n: '04', label: 'Teams', href: '../teams/', key: 'teams' },
    { n: '05', label: 'Players', href: '../players.html', key: 'players' },
  ];
  return `<nav class="platform">
    ${slots.map(s => `<a href="${s.href}"${s.key === active ? ' class="on"' : ''}><span class="num">${s.n}</span>${s.label}</a>`).join('')}
    <span class="spacer"></span>
    <span class="stamp mono">§ Index</span>
  </nav>`;
}

function shell({ title, crumbs, active, body }) {
  const built = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:14px 0;border-bottom:1px dashed var(--rule-soft)}
.crumbs a{color:var(--ink-3)} .crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:36px;padding:34px 0 28px;border-bottom:2px dashed var(--rule)}
.hero h1{font-weight:900;font-size:clamp(56px,7vw,100px);line-height:.88;letter-spacing:-.04em;margin:0}
.hero h1 .a{color:var(--saffron)} .hero h1 .b{color:var(--green)}
.hero .dev{font-family:var(--font-dev);font-size:16px;color:var(--saffron);font-weight:600;margin-top:6px}
.hero .lead{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-top:16px;max-width:62ch}
.hero aside{border-left:2px dashed var(--rule);padding-left:26px;display:grid;grid-template-columns:1fr 1fr;gap:16px 22px;align-content:start}
.hero .stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.hero .stat .v{font-weight:800;font-size:30px;letter-spacing:-.02em;margin-top:4px;line-height:1;color:var(--navy)}
.llist{border-top:1px solid var(--rule);margin-top:16px}
.lrow{display:grid;grid-template-columns:110px 80px 1fr 60px 160px;gap:0;padding:12px 0;border-bottom:1px dashed var(--rule-soft);align-items:center;color:inherit;transition:background .08s}
.lrow:hover{background:var(--paper-2)}
.lrow .c{padding:0 10px}
.lrow .c.first{padding-left:0}
.lrow .dt{font-family:var(--font-mono);font-size:11px;letter-spacing:.06em}
.lrow .vs{font-weight:700;font-size:16px}
.lrow .sub{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
.lrow .cv{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-2);letter-spacing:.06em;text-transform:uppercase;text-align:right}
.lrow .stars{color:var(--saffron);font-family:var(--font-mono);font-size:11px}
@media (max-width:900px){
  .lrow{grid-template-columns:90px 1fr 50px}
  .lrow .c.cv,.lrow .c:nth-child(2){display:none}
  .hero{grid-template-columns:1fr}
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
        <div class="mast-meta">Section <b>§ ${active === 'series' ? '02' : '03'}</b><br/><b>${active === 'series' ? 'Series Index' : 'Match Sheets'}</b><br/>${built.toUpperCase()}</div>
      </div>
      ${platformNav(active)}
    </div>
  </header>

  <main class="frame">
    <div class="crumbs">${crumbs}</div>
    ${body}
    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · ${active === 'series' ? 'Series Index' : 'Match Sheets'}</span>
        <span class="dev">धर्म · खेल · रोमांच</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

function seriesRow(s) {
  const cv = s.broadcast?.geos?.IN?.primary?.broadcaster
    || s.broadcast?.geos?.US?.primary?.broadcaster
    || s.broadcast?.geos?.UK?.primary?.broadcaster
    || '—';
  return `<a class="lrow" href="${htmlEscape(s.id)}.html">
    <div class="c first dt">${htmlEscape(fmtDateRange(s.startDate, s.endDate))}</div>
    <div class="c"><span class="fmt ${mapFmt(s)}">${htmlEscape(fmtLabel(s))}</span></div>
    <div class="c"><div class="vs">${htmlEscape(s.name)}</div><div class="sub">${htmlEscape(s.venue || '—')}</div></div>
    <div class="c stars">${'★'.repeat(s.rating || 0)}</div>
    <div class="c cv">${htmlEscape(String(cv).split(/[·/]/)[0].trim())}</div>
  </a>`;
}

function matchRow(series, tm) {
  const ord = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' }[tm.matchNumber] || `${tm.matchNumber}th`;
  const slug = `${series.id}-${tm.matchNumber}`;
  return `<a class="lrow" href="${htmlEscape(slug)}.html">
    <div class="c first dt">${htmlEscape(fmtDateRange(tm.date))}</div>
    <div class="c"><span class="fmt test">TEST</span></div>
    <div class="c"><div class="vs">${htmlEscape(series.name.split('(')[0].trim())} · ${ord} Test</div><div class="sub">${htmlEscape(tm.venue || '—')}</div></div>
    <div class="c stars">${'★'.repeat(series.rating || 0)}</div>
    <div class="c cv">${htmlEscape(ord)}</div>
  </a>`;
}

function main() {
  const data = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8'));
  const series = (data.matches || []).slice().sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

  // /series/index.html
  const seriesBody = `
    <section class="hero">
      <div>
        <div class="eyebrow">§ 02 — Series Index · 2026</div>
        <h1>All <span class="a">Series</span>,<br/><span class="b">${series.length}</span> on file.</h1>
        <div class="dev">सीज़न २०२६ · सभी श्रृंखलाएँ</div>
        <p class="lead">Every bilateral tour, franchise league, and ICC tournament on the 2026 calendar. Click through for series arc, squads, and storylines.</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Series</span><span class="v">${series.length}</span></div>
        <div class="stat"><span class="k">Test series</span><span class="v">${series.filter(s => s.format === 'test-series').length}</span></div>
        <div class="stat"><span class="k">Franchise leagues</span><span class="v">${series.filter(s => s.format === 'franchise-league').length}</span></div>
        <div class="stat"><span class="k">ICC</span><span class="v">${series.filter(s => s.format === 'icc-tournament').length}</span></div>
      </aside>
    </section>
    <section class="llist">${series.map(seriesRow).join('')}</section>`;
  fs.writeFileSync('./series/index.html', shell({
    title: 'Series — No Spoiler Cricket',
    crumbs: `<a href="../index.html">Fixtures</a><span class="sep">/</span>Series`,
    active: 'series',
    body: seriesBody,
  }));
  console.log('✓ wrote series/index.html');

  // /match/index.html (only Tests with matches[])
  const testSeries = series.filter(s => s.format === 'test-series' && Array.isArray(s.matches) && s.matches.length);
  const allTests = testSeries.flatMap(s => s.matches.map(tm => ({ series: s, tm })));
  const matchBody = `
    <section class="hero">
      <div>
        <div class="eyebrow">§ 03 — Match Sheets</div>
        <h1>Per-match <span class="a">Sheets</span>,<br/>just the <span class="b">Tests</span>.</h1>
        <div class="dev">मैच शीट · टेस्ट मैच</div>
        <p class="lead">Day-by-day rhythm, sessions, XI watchlist, and head-to-head for each Test in a series. Limited-overs and franchise matches live inside their series pages.</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Test sheets</span><span class="v">${allTests.length}</span></div>
        <div class="stat"><span class="k">Test series</span><span class="v">${testSeries.length}</span></div>
        <div class="stat"><span class="k">Days of cricket</span><span class="v">${allTests.length * 5}</span></div>
        <div class="stat"><span class="k">Overs/day</span><span class="v">90</span></div>
      </aside>
    </section>
    <section class="llist">${allTests.map(({ series, tm }) => matchRow(series, tm)).join('')}</section>`;
  fs.writeFileSync('./match/index.html', shell({
    title: 'Match Sheets — No Spoiler Cricket',
    crumbs: `<a href="../index.html">Fixtures</a><span class="sep">/</span>Match Sheets`,
    active: 'match',
    body: matchBody,
  }));
  console.log('✓ wrote match/index.html');
}

main();
