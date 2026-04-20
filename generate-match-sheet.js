#!/usr/bin/env node

// Per-Test match sheets — one per constituent Test in test-series with matches[].
// Output: match/<series-slug>-<match-number>.html
// Template modelled on redesign-import/cricket-dist/match-test-delhi.html.

import fs from 'fs';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(d, n) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function dayStamp(d) {
  return `${WEEKDAY_SHORT[d.getUTCDay()]} · ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const TEAM_CODE_MAP = {
  IND: 'IN', AUS: 'AU', ENG: 'UK', NZL: 'NZ', PAK: 'PK', BAN: 'BD', AFG: 'AF', SL: 'SL',
  IN: 'IN', AU: 'AU', UK: 'UK', PK: 'PK', NZ: 'NZ', ZA: 'ZA', BD: 'BD', AF: 'AF',
};
const TEAM_DISPLAY = { IND: 'India', AUS: 'Australia', ENG: 'England', PAK: 'Pakistan', NZ: 'New Zealand',
  ZA: 'South Africa', BD: 'Bangladesh', AFG: 'Afghanistan', SL: 'Sri Lanka', WI: 'West Indies',
  IN: 'India', UK: 'England', AU: 'Australia', PK: 'Pakistan' };
const TEAM_DEV = { IND: 'भारत', AUS: 'ऑस्ट्रेलिया', ENG: 'इंग्लैंड', PAK: 'पाकिस्तान', ZA: 'दक्षिण अफ़्रीका',
  NZ: 'न्यूज़ीलैंड', IN: 'भारत', AU: 'ऑस्ट्रेलिया', UK: 'इंग्लैंड', PK: 'पाकिस्तान' };

function roleShort(role) {
  return { batter: 'BAT', bowler: 'BOWL', 'all-rounder': 'ALL', 'wicket-keeper': 'WK' }[role] || (role || '').toUpperCase();
}

function formatPlayerName(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length < 2) return name || '';
  const surname = parts[0];
  const given = parts.slice(1).join(' ');
  const titleSurname = surname.charAt(0) + surname.slice(1).toLowerCase();
  return `${given.charAt(0)}. ${titleSurname}`;
}

function squadsForSeries(series, allPlayers) {
  const teams = (series.teams || []).filter(t => t !== 'INTL');
  return teams.map(teamCode => {
    const natCode = TEAM_CODE_MAP[teamCode] || teamCode;
    const players = allPlayers
      .filter(p => p.nationalityCode === natCode)
      .sort((a, b) => (a.ranking || 99) - (b.ranking || 99))
      .slice(0, 5);
    return { side: teamCode, display: TEAM_DISPLAY[teamCode] || teamCode, players };
  });
}

const DEFAULT_SESSIONS = {
  india: { start: '09:30 IST', lunch: '11:30', tea: '14:10', stumps: '16:30' },
  england: { start: '11:00 BST', lunch: '13:00', tea: '15:40', stumps: '18:00' },
  australia: { start: '10:00 AEDT', lunch: '12:00', tea: '14:40', stumps: '17:00' },
  south_africa: { start: '10:00 SAST', lunch: '12:00', tea: '14:40', stumps: '17:00' },
  sri_lanka: { start: '10:00 SLST', lunch: '12:00', tea: '14:40', stumps: '17:00' },
};

function pickSessions(series, testMatch) {
  if (series.sessionTimes) return series.sessionTimes;
  const v = (testMatch.venue || series.venue || '').toLowerCase();
  if (v.includes('india') || /chennai|delhi|ahmedabad|kolkata|mumbai|bengaluru|hyderabad/.test(v)) return DEFAULT_SESSIONS.india;
  if (v.includes('england') || /lord|oval|edgbaston|headingley|old trafford|london|birmingham|leeds|manchester/.test(v)) return DEFAULT_SESSIONS.england;
  if (/australia|melbourne|sydney|perth|brisbane|adelaide|mcg|scg/.test(v)) return DEFAULT_SESSIONS.australia;
  if (v.includes('south africa') || /cape town|johannesburg|durban/.test(v)) return DEFAULT_SESSIONS.south_africa;
  if (v.includes('sri lanka') || v.includes('galle')) return DEFAULT_SESSIONS.sri_lanka;
  return DEFAULT_SESSIONS.india;
}

function renderDays(testMatch) {
  const start = parseUTC(testMatch.date);
  if (!start) return '';
  return `<section class="section">
    <div class="eyebrow">§ 01 — Five Days</div>
    <h2>Day-by-day rhythm</h2>
    <div class="days">
      ${[0, 1, 2, 3, 4].map(i => {
        const d = addDays(start, i);
        const captions = ['New ball · toss-dependent', 'Trail the total', 'Pitch starts to grip', 'Often decisive', 'Draw · chase · collapse'];
        return `<div class="day"><div class="n">Day ${i + 1}</div><div class="dt">${htmlEscape(dayStamp(d))}</div><div class="sess">${captions[i]}</div></div>`;
      }).join('')}
    </div>
  </section>`;
}

function renderSquads(series, allPlayers) {
  const sides = squadsForSeries(series, allPlayers);
  if (sides.length !== 2) return '';
  return `<section class="section">
    <div class="eyebrow">§ 02 — Playing XI Watchlist</div>
    <h2>Stars on both sides</h2>
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
        }).join('')}
      </div>`).join('')}
    </div>
  </section>`;
}

function renderKeys(series) {
  const lines = (series.matchDetails?.storylines || []).slice(0, 3);
  if (!lines.length) return '';
  return `<section class="section">
    <div class="eyebrow">§ 03 — Threads to Follow</div>
    <h2>What decides this Test</h2>
    <div class="keys">
      ${lines.map(l => `<div class="k">${htmlEscape(l)}</div>`).join('')}
    </div>
  </section>`;
}

function renderRecent(series) {
  const recent = series.recentMeetings;
  if (!Array.isArray(recent) || !recent.length) return '';
  return `<section class="section">
    <div class="eyebrow">§ 04 — Head-to-Head</div>
    <h2>Recent series meetings</h2>
    <div class="recent">
      ${recent.map(r => `
        <div class="yr">${htmlEscape(String(r.yr))}</div>
        <div class="who">${htmlEscape(r.who)}</div>
        <div class="tm">${htmlEscape(r.result)}</div>
        <div class="gp">${htmlEscape(r.host)}</div>
      `).join('')}
    </div>
  </section>`;
}

function buildTestSheet(series, testMatch, allPlayers) {
  const built = new Date().toISOString().slice(0, 10);
  const start = parseUTC(testMatch.date);
  const end = addDays(start, 4);
  const dateLabel = `${start.getUTCDate()}–${end.getUTCDate()} ${MONTH_SHORT[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  const sessions = pickSessions(series, testMatch);
  const teams = (series.teams || []).filter(t => t !== 'INTL');
  const vsLabel = teams.map(t => TEAM_DISPLAY[t] || t).map(s => s.split(' ')[0]).join(' v ');
  const vsDev = teams.map(t => TEAM_DEV[t] || '').filter(Boolean).join(' बनाम ');
  const slug = `${series.id}-${testMatch.matchNumber || ''}`;
  const testOrdinal = ordinal(testMatch.matchNumber || 1);
  const totalTests = series.matches?.length || 5;
  const venueShort = (testMatch.venue || '').split(',')[0].trim();
  const venueCity = (testMatch.venue || '').split(',').slice(1).join(',').trim() || venueShort;

  const coverage = series.broadcast?.geos?.IN?.primary?.broadcaster
    || series.broadcast?.geos?.UK?.primary?.broadcaster
    || series.broadcast?.geos?.AU?.primary?.broadcaster
    || 'TBD';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(vsLabel)} · ${testOrdinal} Test · ${htmlEscape(venueCity)} — No Spoiler Cricket</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:14px 0;border-bottom:1px dashed var(--rule-soft)}
.crumbs a{color:var(--ink-3)} .crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.section{padding:26px 0;border-bottom:1px dashed var(--rule-soft)}
.section h2{font-weight:800;font-size:22px;letter-spacing:-.01em;margin:0 0 6px}
.hero .tag{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)}
.hero h1{font-weight:900;font-size:clamp(52px,6.5vw,96px);line-height:.9;letter-spacing:-.035em;margin:0}
.hero h1 .vs{color:var(--saffron);font-weight:500;font-style:italic;margin:0 .2em}
.hero .dev{font-family:var(--font-dev);font-size:18px;color:var(--saffron);font-weight:600;margin-top:8px}
.hero .sub{font-family:var(--font-mono);font-size:13px;letter-spacing:.04em;color:var(--ink-2);margin-top:16px;max-width:56ch}
.days{display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-top:1px solid var(--rule);margin-top:14px}
.day{padding:14px 12px;border-right:1px dashed var(--rule);border-bottom:1px dashed var(--rule)}
.day:last-child{border-right:0}
.day .n{font-family:var(--font-mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--saffron);font-weight:700}
.day .dt{font-weight:800;font-size:18px;letter-spacing:-.01em;margin-top:4px;color:var(--navy)}
.day .sess{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-2);margin-top:6px;letter-spacing:.04em}
.squads{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:14px}
.sq h4{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--saffron);font-weight:700;margin:0 0 10px}
.sq .li{display:grid;grid-template-columns:50px 1fr 70px;padding:8px 0;border-bottom:1px dashed var(--rule-soft);color:inherit;transition:background .08s}
.sq .li:hover{background:var(--paper-2)}
.sq .li .no{font-family:var(--font-mono);color:var(--ink-3);font-weight:600}
.sq .li .nm{font-weight:600}
.sq .li .rl{font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--ink-3);text-align:right;text-transform:uppercase}
.keys{margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.keys .k{padding:14px;border:1px solid var(--rule);border-left:3px solid var(--saffron);font-size:14px;line-height:1.45}
.recent{display:grid;grid-template-columns:60px 1fr 1fr 100px;border-top:1px solid var(--rule);margin-top:14px}
.recent>*{padding:10px;border-bottom:1px dashed var(--rule-soft)}
.recent .yr{font-family:var(--font-mono);color:var(--ink-3);font-weight:700}
.recent .who{font-weight:700}
.recent .tm{font-family:var(--font-mono);font-size:12px;color:var(--ink-2)}
.recent .gp{font-family:var(--font-mono);text-align:right;color:var(--ink-3);font-size:12px}
@media (max-width:1100px){
  .keys{grid-template-columns:1fr}
  .squads{grid-template-columns:1fr}
  .days{grid-template-columns:repeat(2,1fr)}
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
        <div class="mast-meta">Document <b>NSC/${htmlEscape(slug.toUpperCase().slice(0, 20))}</b><br/>Format <b>TEST</b><br/>${htmlEscape(built.toUpperCase())}</div>
      </div>
      <nav class="platform">
        <a href="../index.html"><span class="num">01</span>Fixtures</a>
        <a href="../series/"><span class="num">02</span>Series</a>
        <a href="../match/" class="on"><span class="num">03</span>Match Sheets</a>
        <a href="../teams/"><span class="num">04</span>Teams</a>
        <a href="../players.html"><span class="num">05</span>Players</a>
        <span class="spacer"></span>
        <span class="stamp mono">§ 03 / Match Sheet</span>
      </nav>
    </div>
  </header>

  <main class="frame">
    <div class="crumbs"><a href="../index.html">Fixtures</a><span class="sep">/</span><a href="../series/${htmlEscape(series.id)}.html">${htmlEscape(series.name)}</a><span class="sep">/</span>${testOrdinal} Test · ${htmlEscape(venueCity)}</div>

    <section class="hero">
      <div>
        <div class="tag">
          <span class="fmt test">TEST</span>
          <span>${htmlEscape(series.name.split('(')[0].trim())} · ${testOrdinal} of ${totalTests}</span>
          <span style="color:var(--saffron)">${'★'.repeat(series.rating || 0)}</span>
        </div>
        <h1>${htmlEscape(teams[0] || '')}<span class="vs">v</span>${htmlEscape(teams[1] || '')}</h1>
        ${vsDev ? `<div class="dev">${htmlEscape(vsDev)} · ${testOrdinal === '1st' ? 'पहला' : testOrdinal === '2nd' ? 'दूसरा' : testOrdinal === '3rd' ? 'तीसरा' : testOrdinal === '4th' ? 'चौथा' : 'पाँचवाँ'} टेस्ट</div>` : ''}
        <p class="sub">${htmlEscape(testMatch.name || '')}. Five days at ${htmlEscape(venueShort)}. ${htmlEscape(series.matchDetails?.summary || '').slice(0, 140)}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Dates</span><span class="v sm">${htmlEscape(dateLabel)}</span></div>
        <div class="stat"><span class="k">Start</span><span class="v sm">${htmlEscape(sessions.start)}</span></div>
        <div class="stat"><span class="k">Venue</span><span class="v sm">${htmlEscape(venueShort)}</span></div>
        <div class="stat"><span class="k">City</span><span class="v sm">${htmlEscape(venueCity)}</span></div>
        <div class="stat"><span class="k">Conditions</span><span class="v sm">${htmlEscape((series.conditions || []).join(' · ') || '—')}</span></div>
        <div class="stat"><span class="k">Watch</span><span class="v sm">${htmlEscape(coverage)}</span></div>
      </aside>
    </section>

    <section class="statband">
      <div class="s"><div class="k">Session 1</div><div class="v">${htmlEscape(sessions.start.split(' ')[0])}</div></div>
      <div class="s"><div class="k">Lunch</div><div class="v">${htmlEscape(sessions.lunch)}</div></div>
      <div class="s"><div class="k">Tea</div><div class="v">${htmlEscape(sessions.tea)}</div></div>
      <div class="s"><div class="k">Stumps</div><div class="v">${htmlEscape(sessions.stumps)}</div></div>
      <div class="s"><div class="k">Overs/day</div><div class="v mono">90</div></div>
    </section>

    ${renderDays(testMatch)}
    ${renderSquads(series, allPlayers)}
    ${renderKeys(series)}
    ${renderRecent(series)}

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · Match Sheet · ${testOrdinal} Test · ${htmlEscape(venueCity)}</span>
        <span class="dev">धर्म · खेल · रोमांच</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function main() {
  const data = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8'));
  let allPlayers = [];
  try { allPlayers = JSON.parse(fs.readFileSync('./data/players.json', 'utf8')).players || []; } catch {}
  const outDir = './match';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (const series of data.matches || []) {
    if (series.format !== 'test-series') continue;
    if (!Array.isArray(series.matches) || !series.matches.length) continue;
    for (const tm of series.matches) {
      const slug = `${series.id}-${tm.matchNumber || ''}`;
      fs.writeFileSync(`${outDir}/${slug}.html`, buildTestSheet(series, tm, allPlayers));
      n++;
    }
  }
  console.log(`✓ wrote ${n} per-Test match sheets to /match/`);
}

main();
