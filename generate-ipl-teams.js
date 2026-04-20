#!/usr/bin/env node

// Generates ipl.html (the IPL league hub — all 10 franchises) and
// ipl/<slug>.html per team page. Pulls from data/ipl-teams.json and
// cross-references data/players.json to render proper player cards.

import fs from 'fs';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateRange(a, b) {
  const s = parseUTC(a);
  if (!s) return '';
  const e = parseUTC(b);
  if (!e) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()}`;
}

const TEAMS_CSS = `
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:16px 0;border-bottom:1px solid var(--rule-soft)}
.crumbs a{color:var(--ink-3);border-bottom:1px solid transparent}
.crumbs a:hover{color:var(--ink);border-bottom-color:var(--ink)}
.crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.hero{display:grid;grid-template-columns:1.4fr 1fr;gap:40px;padding:40px 0 32px;border-bottom:3px solid var(--ink)}
.hero .tag{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:12px;align-items:center;margin-bottom:18px;flex-wrap:wrap}
.hero h1{font-family:var(--font-sans);font-weight:800;font-size:clamp(56px,7vw,104px);line-height:.88;letter-spacing:-.04em;margin:0}
.hero h1 .em{font-style:italic;font-weight:500;color:var(--signal)}
.hero .sub{font-family:var(--font-mono);font-size:13px;letter-spacing:.06em;color:var(--ink-2);margin-top:18px;max-width:62ch;line-height:1.5}
.hero aside{border-left:1px solid var(--rule);padding-left:28px;display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;align-content:start}
.stat{display:block}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-family:var(--font-sans);font-weight:700;font-size:32px;letter-spacing:-.02em;line-height:1;margin-top:4px}
.stat .v.sm{font-size:18px;line-height:1.2}
.section{padding:32px 0;border-bottom:1px solid var(--rule-soft)}
.section h2{font-family:var(--font-sans);font-weight:700;font-size:22px;letter-spacing:-.01em;margin:0 0 6px}
.teams-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;border-top:1px solid var(--rule);margin-top:20px}
.tcard{display:grid;grid-template-rows:auto auto auto 1fr auto;gap:10px;padding:22px;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft);color:inherit;position:relative;min-height:220px;transition:background .1s}
.tcard:nth-child(2n){border-right:0}
.tcard:hover{background:var(--paper-2)}
.tcard::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--team-color,var(--ink))}
.tcard .head{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding-left:14px}
.tcard .abbr{font-family:var(--font-sans);font-weight:800;font-size:28px;letter-spacing:-.02em;color:var(--team-color,var(--ink))}
.tcard .name{font-family:var(--font-sans);font-weight:700;font-size:18px;letter-spacing:-.005em;padding-left:14px}
.tcard .meta{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;padding-left:14px}
.tcard .id-line{font-family:var(--font-sans);font-size:13.5px;color:var(--ink-2);line-height:1.45;padding-left:14px;max-width:52ch}
.tcard .foot{display:flex;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase;padding-left:14px;padding-top:6px;border-top:1px solid var(--rule-soft);margin-top:6px}
.tcard .titles{color:var(--ink);font-weight:600}
.wstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--rule);margin-top:16px}
.wcell{padding:16px 18px;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft)}
.wcell:nth-child(4n){border-right:0}
.wcell .geo{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);display:flex;align-items:center;gap:8px}
.wcell .flag{font-size:18px}
.wcell .bc{font-family:var(--font-sans);font-weight:600;font-size:15px;margin-top:6px;line-height:1.2}
.wcell .notes{font-size:11.5px;color:var(--ink-2);margin-top:4px;line-height:1.4}
.wcell a{color:var(--ink);border-bottom:1px solid var(--rule-soft)}
.wcell a:hover{border-bottom-color:var(--ink)}
.rules{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:14px}
.rules .rule h3{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin:0 0 6px;font-weight:500}
.rules .rule p{font-family:var(--font-sans);font-size:14px;color:var(--ink-2);line-height:1.55;margin:0}
.narratives{margin-top:10px;padding:0;list-style:none}
.narratives li{font-family:var(--font-sans);font-size:15px;line-height:1.55;color:var(--ink-2);margin:8px 0;padding-left:18px;position:relative;max-width:78ch}
.narratives li::before{content:"§";position:absolute;left:0;color:var(--ink-3);font-family:var(--font-mono);font-weight:600}
@media (max-width:960px){
  .teams-grid{grid-template-columns:1fr}
  .tcard:nth-child(2n){border-right:0}
  .wstrip{grid-template-columns:repeat(2,1fr)}
  .wcell:nth-child(4n){border-right:1px solid var(--rule-soft)}
  .wcell:nth-child(2n){border-right:0}
  .rules{grid-template-columns:1fr}
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:1px solid var(--rule);padding-top:20px}
}
`;

const TEAM_CSS = `
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:16px 0;border-bottom:1px solid var(--rule-soft)}
.crumbs a{color:var(--ink-3);border-bottom:1px solid transparent}
.crumbs a:hover{color:var(--ink);border-bottom-color:var(--ink)}
.crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.team-band{height:10px;width:100%;background:var(--team-color)}
.hero{display:grid;grid-template-columns:1.4fr 1fr;gap:40px;padding:40px 0 32px;border-bottom:3px solid var(--ink)}
.hero .tag{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.hero h1{font-family:var(--font-sans);font-weight:800;font-size:clamp(48px,6vw,96px);line-height:.88;letter-spacing:-.04em;margin:0}
.hero h1 .em{color:var(--team-color);font-style:italic;font-weight:600}
.hero .abbr-tag{display:inline-flex;align-items:center;justify-content:center;background:var(--team-color);color:#fff;font-family:var(--font-sans);font-weight:800;font-size:18px;padding:4px 10px;letter-spacing:.02em;border:1px solid var(--team-color)}
.hero .sub{font-family:var(--font-sans);font-size:16px;color:var(--ink-2);margin-top:18px;max-width:58ch;line-height:1.55}
.hero aside{border-left:1px solid var(--rule);padding-left:28px;display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;align-content:start}
.stat{display:block}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-family:var(--font-sans);font-weight:700;font-size:28px;letter-spacing:-.02em;line-height:1;margin-top:4px}
.stat .v.sm{font-size:16px;line-height:1.25}
.section{padding:32px 0;border-bottom:1px solid var(--rule-soft)}
.section h2{font-family:var(--font-sans);font-weight:700;font-size:22px;letter-spacing:-.01em;margin:0 0 6px}
.section h2 .emark{color:var(--team-color)}
.marquee{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--rule);margin-top:16px}
.marquee .head{padding:18px 22px;background:var(--team-color);color:#fff;display:flex;flex-direction:column;justify-content:center;gap:6px}
.marquee .head .lbl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;opacity:.85}
.marquee .head .nm{font-family:var(--font-sans);font-weight:700;font-size:28px;letter-spacing:-.015em;line-height:1}
.marquee .body{padding:22px;font-family:var(--font-sans);font-size:14.5px;line-height:1.55;color:var(--ink-2)}
.squad-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:16px;border-top:1px solid var(--rule)}
.pcard{padding:16px;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft);display:grid;gap:6px;color:inherit;align-content:start;min-height:200px}
.pcard:nth-child(4n){border-right:0}
.pcard:hover{background:var(--paper-2)}
.pcard .ph{width:100%;aspect-ratio:1/1;background:var(--paper-2);overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid var(--rule-soft);margin-bottom:8px}
.pcard .ph img{width:100%;height:100%;object-fit:cover;filter:grayscale(.15) contrast(1.02)}
.pcard .ph .no-photo{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.pcard .nm{font-family:var(--font-sans);font-weight:700;font-size:15px;letter-spacing:-.005em;line-height:1.2}
.pcard .rl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.pcard .nat{font-family:var(--font-mono);font-size:11px;color:var(--ink-2);letter-spacing:.04em;margin-top:auto;padding-top:6px;border-top:1px solid var(--rule-soft)}
.pcard.noclick{cursor:default}
.pcard.noclick:hover{background:transparent}
.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px 40px;margin-top:14px}
.info-grid .info .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)}
.info-grid .info .v{font-family:var(--font-sans);font-size:17px;font-weight:600;margin-top:4px;letter-spacing:-.005em}
.info-grid .info .vs{font-family:var(--font-sans);font-size:14px;color:var(--ink-2);line-height:1.5;margin-top:6px;max-width:46ch}
.teams-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-top:1px solid var(--rule);margin-top:16px}
.teams-strip a{padding:14px;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft);color:inherit;display:flex;flex-direction:column;gap:4px;transition:background .08s}
.teams-strip a:nth-child(5n){border-right:0}
.teams-strip a:hover{background:var(--paper-2)}
.teams-strip .a-ab{font-family:var(--font-sans);font-weight:800;font-size:18px;color:var(--sib-color,var(--ink));letter-spacing:-.01em}
.teams-strip .a-nm{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.06em;color:var(--ink-3);text-transform:uppercase}
@media (max-width:1100px){
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:1px solid var(--rule);padding-top:20px}
  .squad-grid{grid-template-columns:repeat(3,1fr)}
  .pcard:nth-child(4n){border-right:1px solid var(--rule-soft)}
  .pcard:nth-child(3n){border-right:0}
  .teams-strip{grid-template-columns:repeat(2,1fr)}
  .teams-strip a:nth-child(5n){border-right:1px solid var(--rule-soft)}
  .teams-strip a:nth-child(2n){border-right:0}
  .info-grid{grid-template-columns:1fr}
  .marquee{grid-template-columns:1fr}
}
@media (max-width:640px){
  .squad-grid{grid-template-columns:repeat(2,1fr)}
  .pcard:nth-child(3n){border-right:1px solid var(--rule-soft)}
  .pcard:nth-child(2n){border-right:0}
}
`;

const NAT_FLAG = {
  IN: '🇮🇳', AU: '🇦🇺', UK: '🇬🇧', GB: '🇬🇧',
  NZ: '🇳🇿', ZA: '🇿🇦', PK: '🇵🇰', BD: '🇧🇩',
  AF: '🇦🇫', WI: '🏴‍☠️', IE: '🇮🇪', NP: '🇳🇵', SL: '🇱🇰',
};

const GEO_LABELS = {
  IN: ['🇮🇳', 'India'],
  US: ['🇺🇸', 'United States'],
  UK: ['🇬🇧', 'United Kingdom'],
  AU: ['🇦🇺', 'Australia'],
  CA: ['🇨🇦', 'Canada'],
  AE: ['🇦🇪', 'UAE / Middle East'],
  SG: ['🇸🇬', 'Singapore / SEA'],
  ZA: ['🇿🇦', 'South Africa'],
  NZ: ['🇳🇿', 'New Zealand'],
};

function playerSlugLookup(players) {
  const byName = new Map();
  for (const p of players) {
    // Map both "SHARMA Rohit" and "Rohit Sharma" forms to their slug
    const slug = p.slug || p.id;
    const display = p.name || '';
    byName.set(display.toLowerCase(), slug);
    // Flip to "First Surname" (regardless of original case)
    const parts = display.split(/\s+/);
    if (parts.length >= 2) {
      const first = parts.slice(1).join(' ');
      const surname = parts[0];
      const titleSurname = surname.charAt(0) + surname.slice(1).toLowerCase();
      byName.set(`${first} ${titleSurname}`.toLowerCase(), slug);
      byName.set(`${first.toLowerCase()} ${surname.toLowerCase()}`, slug);
    }
  }
  return (name) => byName.get(String(name).toLowerCase()) || null;
}

function buildHubPage({ league, teams, ipl2026Match }) {
  const stamp = new Date().toISOString().slice(0, 10);

  const teamCards = teams.map(t => `
    <a class="tcard" style="--team-color:${t.primaryColor}" href="ipl/${t.slug}.html">
      <div class="head">
        <div class="abbr">${htmlEscape(t.abbr)}</div>
        <div class="meta">${htmlEscape(t.titles || 0)} title${t.titles === 1 ? '' : 's'}${t.titleYears?.length ? ' · ' + t.titleYears.slice(-2).join(', ') : ''}</div>
      </div>
      <div class="name">${htmlEscape(t.name)}</div>
      <div class="meta">${htmlEscape(t.city)} · ${htmlEscape(t.homeVenueShort || t.homeVenue)}</div>
      <div class="id-line">${htmlEscape(t.identity)}</div>
      <div class="foot">
        <span>Captain · <span class="titles">${htmlEscape(t.captain || '—')}</span></span>
        <span>→</span>
      </div>
    </a>`).join('');

  const broadcastCells = Object.entries(league.broadcast).map(([geo, gd]) => {
    const [flag, label] = GEO_LABELS[geo] || ['🌐', geo];
    const p = gd.primary || {};
    return `<div class="wcell">
      <div class="geo"><span class="flag">${flag}</span>${htmlEscape(label)}</div>
      <div class="bc">${p.url ? `<a href="${htmlEscape(p.url)}" target="_blank" rel="noopener">${htmlEscape(p.broadcaster)}</a>` : htmlEscape(p.broadcaster || '—')}</div>
      ${p.notes ? `<div class="notes">${htmlEscape(p.notes)}</div>` : ''}
    </div>`;
  }).join('');

  const storylineBullets = (ipl2026Match?.matchDetails?.storylines || []).map(s => `<li>${htmlEscape(s)}</li>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(league.seasonLabel)} — No Spoiler Cricket</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="shared.css"/>
<style>${TEAMS_CSS}</style>
</head>
<body>
  <div class="tricolour thick"></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div class="wordmark">No<span class="slash">/</span>Spoiler Cricket
          <span class="sub">IPL · 2026 · Franchises &amp; watch guide</span>
        </div>
        <div class="mast-meta">
          Document <b>NSC/IPL/26</b><br/>
          Updated <b>${stamp}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="index.html">01 — Fixtures</a>
        <a href="players.html">02 — Players</a>
        <a href="ipl.html" class="on">03 — IPL</a>
        <span class="spacer"></span>
        <span class="edition mono">EN</span>
      </nav>
    </div>
  </header>

  <main class="frame">

    <nav class="crumbs">
      <a href="index.html">Fixtures</a><span class="sep">/</span>
      <span>${htmlEscape(league.seasonLabel)}</span>
    </nav>

    <section class="hero">
      <div>
        <div class="tag">
          <span class="code sig">IPL</span>
          <span>${htmlEscape(league.seasonLabel)}</span>
          <span>·</span>
          <span>${formatDateRange(league.startDate, league.endDate)}</span>
          <span>·</span>
          <span>${league.totalMatches} matches</span>
        </div>
        <h1>Indian Premier<br/><span class="em">League</span></h1>
        <p class="sub">Ten franchises. Seventy-four matches over ten weeks. The richest, loudest, and most-watched T20 league in the world — every evening from March to late May.</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Season</span><span class="v">19</span></div>
        <div class="stat"><span class="k">Franchises</span><span class="v">${teams.length}</span></div>
        <div class="stat"><span class="k">Matches</span><span class="v">${league.totalMatches}</span></div>
        <div class="stat"><span class="k">League stage</span><span class="v">${league.leagueMatches}</span></div>
        <div class="stat"><span class="k">Playoffs</span><span class="v">${league.playoffMatches}</span></div>
        <div class="stat"><span class="k">Defending</span><span class="v sm">${htmlEscape((teams.find(t => t.id === league.defendingChampion) || {}).abbr || '—')}</span></div>
      </aside>
    </section>

    <section class="section">
      <div class="eyebrow">§ Franchises</div>
      <h2>Ten teams. One trophy.</h2>
      <div class="teams-grid">${teamCards}</div>
    </section>

    <section class="section">
      <div class="eyebrow">§ Format &amp; rules</div>
      <h2>${htmlEscape(league.season)} — structure</h2>
      <div class="rules">
        <div class="rule">
          <h3>Format</h3>
          <p>${htmlEscape(league.format)}</p>
        </div>
        <div class="rule">
          <h3>Impact Player</h3>
          <p>${htmlEscape(league.impactPlayerRule)}</p>
        </div>
        <div class="rule">
          <h3>Auction cycle</h3>
          <p>${htmlEscape(league.auctionYear)}. Most recent mega-auction was pre-2025; 2026 is a retention/mini-auction year with only marginal squad changes.</p>
        </div>
        <div class="rule">
          <h3>Playoffs</h3>
          <p>Four matches. Qualifier 1 pits the league top two — winner goes direct to the Final. Eliminator is a sudden-death between #3 and #4. Qualifier 2 is Qualifier 1's loser vs the Eliminator winner. Final is a standalone single-match decider.</p>
        </div>
      </div>
    </section>

    ${storylineBullets ? `<section class="section">
      <div class="eyebrow">§ Pre-tournament storylines</div>
      <h2>Things to know before the first ball</h2>
      <ul class="narratives">${storylineBullets}</ul>
    </section>` : ''}

    <section class="section">
      <div class="eyebrow">§ Where to watch — IPL ${league.season}</div>
      <h2>Primary broadcasters by region</h2>
      <div class="wstrip">${broadcastCells}</div>
    </section>

    <section class="section">
      <div class="eyebrow">§ Full fixture schedule</div>
      <h2>All 74 matches</h2>
      <p class="sub" style="max-width:72ch;font-family:var(--font-sans);color:var(--ink-2);margin-top:10px;">The league schedule, start times, and venue-by-venue breakdown is on the IPL fixture page. Spoiler-safe — no scores or standings — just dates, teams, and where to watch.</p>
      <p style="margin-top:14px"><a href="match-details/ipl-2026.html" style="border-bottom:1px solid var(--ink);font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:600">→ View IPL 2026 fixture sheet</a></p>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · 2026 Fixtures</span>
        <span>§ 03 — IPL</span>
        <span>Built ${stamp}</span>
      </div>
    </footer>

  </main>
</body>
</html>
`;
}

function buildTeamPage({ team, league, teams, players }) {
  const stamp = new Date().toISOString().slice(0, 10);
  const findSlug = playerSlugLookup(players);

  // Build player cards from keyPlayers — match to players.json slugs where possible
  const playerCards = (team.keyPlayers || []).map(nm => {
    const slug = findSlug(nm);
    const rec = slug ? players.find(p => (p.slug || p.id) === slug) : null;
    const photoPath = rec?.photoUrl?.startsWith('players/') ? `../${rec.photoUrl}` : '';
    const flag = rec ? (NAT_FLAG[rec.nationalityCode] || '🏳️') : '';
    const role = rec?.role ? rec.role.replace('-', ' ') : '';
    const nat = rec?.nationality || '';
    const displayName = rec ? (rec.name) : nm;
    const href = slug ? `../players/${slug}.html` : null;
    const inner = `
      <div class="ph">${photoPath ? `<img loading="lazy" src="${htmlEscape(photoPath)}" alt="${htmlEscape(displayName)}" onerror="this.style.display='none';this.parentNode.innerHTML='<span class=&quot;no-photo&quot;>No photo</span>'"/>` : `<span class="no-photo">No photo</span>`}</div>
      <div class="nm">${htmlEscape(displayName)}</div>
      <div class="rl">${htmlEscape(role || '—')}</div>
      <div class="nat">${flag} ${htmlEscape(nat || '')}</div>`;
    return href
      ? `<a class="pcard" href="${href}">${inner}</a>`
      : `<div class="pcard noclick">${inner}</div>`;
  }).join('');

  const siblingCards = teams.filter(t => t.id !== team.id).map(t => `
    <a href="${t.slug}.html" style="--sib-color:${t.primaryColor}">
      <span class="a-ab">${htmlEscape(t.abbr)}</span>
      <span class="a-nm">${htmlEscape(t.short)}</span>
    </a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(team.name)} — ${htmlEscape(league.seasonLabel)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>${TEAM_CSS}</style>
</head>
<body style="--team-color:${team.primaryColor};--team-secondary:${team.secondaryColor}">
  <div class="tricolour thick"></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div class="wordmark">No<span class="slash">/</span>Spoiler Cricket
          <span class="sub">IPL · Franchise · ${htmlEscape(team.abbr)}</span>
        </div>
        <div class="mast-meta">
          Document <b>NSC/IPL/${htmlEscape(team.abbr)}</b><br/>
          Updated <b>${stamp}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="../index.html">01 — Fixtures</a>
        <a href="../players.html">02 — Players</a>
        <a href="../ipl.html" class="on">03 — IPL</a>
        <span class="spacer"></span>
        <span class="edition mono">EN</span>
      </nav>
    </div>
  </header>

  <div class="team-band"></div>

  <main class="frame">

    <nav class="crumbs">
      <a href="../index.html">Fixtures</a><span class="sep">/</span>
      <a href="../ipl.html">IPL 2026</a><span class="sep">/</span>
      <span>${htmlEscape(team.short)}</span>
    </nav>

    <section class="hero">
      <div>
        <div class="tag">
          <span class="abbr-tag">${htmlEscape(team.abbr)}</span>
          <span>${htmlEscape(team.city)}</span>
          <span>·</span>
          <span>${htmlEscape(team.homeVenueShort || team.homeVenue)}</span>
          <span>·</span>
          <span>${team.titles || 0} title${team.titles === 1 ? '' : 's'}</span>
        </div>
        <h1>${htmlEscape(team.name.split(' ').slice(0, -1).join(' '))}<br/><span class="em">${htmlEscape(team.name.split(' ').slice(-1)[0])}</span></h1>
        <p class="sub">${htmlEscape(team.identity)}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Captain</span><span class="v sm">${htmlEscape(team.captain || '—')}</span></div>
        <div class="stat"><span class="k">Head coach</span><span class="v sm">${htmlEscape(team.coach || '—')}</span></div>
        <div class="stat"><span class="k">Home venue</span><span class="v sm">${htmlEscape(team.homeVenueShort || team.homeVenue)}</span></div>
        <div class="stat"><span class="k">Pitch</span><span class="v sm">${htmlEscape(team.pitchReputation || '—')}</span></div>
        <div class="stat"><span class="k">IPL titles</span><span class="v">${team.titles || 0}</span></div>
        <div class="stat"><span class="k">Owner</span><span class="v sm">${htmlEscape((team.owner || '').split(/[·(]/)[0].trim() || '—')}</span></div>
      </aside>
    </section>

    <section class="section">
      <div class="eyebrow">§ Marquee watch</div>
      <h2>Who to <span class="emark">watch</span></h2>
      <div class="marquee">
        <div class="head">
          <div class="lbl">Face of ${htmlEscape(team.abbr)} — 2026</div>
          <div class="nm">${htmlEscape((team.marqueeWatch || '').split(' — ')[0] || '')}</div>
        </div>
        <div class="body">${htmlEscape((team.marqueeWatch || '').split(' — ').slice(1).join(' — ') || team.marqueeWatch || '')}</div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ Key players · 2026 squad</div>
      <h2>Names to know</h2>
      <div class="squad-grid">${playerCards}</div>
    </section>

    <section class="section">
      <div class="eyebrow">§ Franchise</div>
      <h2>About the team</h2>
      <div class="info-grid">
        <div class="info">
          <span class="k">Full name</span>
          <span class="v">${htmlEscape(team.name)}</span>
        </div>
        <div class="info">
          <span class="k">Titles</span>
          <span class="v">${team.titles || 0}${team.titleYears?.length ? `<span class="vs">${team.titleYears.join(' · ')}</span>` : ''}</span>
        </div>
        <div class="info">
          <span class="k">Home city</span>
          <span class="v">${htmlEscape(team.city)}, ${htmlEscape(team.state || '')}</span>
        </div>
        <div class="info">
          <span class="k">Home venue</span>
          <span class="v">${htmlEscape(team.homeVenue)}<span class="vs">${htmlEscape(team.pitchReputation || '')}</span></span>
        </div>
        <div class="info">
          <span class="k">Ownership</span>
          <span class="v"><span class="vs" style="margin-top:0;font-size:16px;color:var(--ink)">${htmlEscape(team.owner || '—')}</span></span>
        </div>
        <div class="info">
          <span class="k">Colours</span>
          <span class="v" style="display:flex;gap:10px;align-items:center">
            <span style="display:inline-block;width:24px;height:24px;background:${team.primaryColor};border:1px solid var(--rule)"></span>
            <span style="display:inline-block;width:24px;height:24px;background:${team.secondaryColor};border:1px solid var(--rule)"></span>
            <span class="mono" style="font-size:11px;color:var(--ink-3);letter-spacing:.06em">${htmlEscape(team.primaryColor)} · ${htmlEscape(team.secondaryColor)}</span>
          </span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ Other IPL franchises</div>
      <h2>Browse the league</h2>
      <div class="teams-strip">${siblingCards}</div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · 2026 Fixtures</span>
        <span>§ IPL / ${htmlEscape(team.abbr)}</span>
        <span>Built ${stamp}</span>
      </div>
    </footer>

  </main>
</body>
</html>
`;
}

function main() {
  const iplData = JSON.parse(fs.readFileSync('./data/ipl-teams.json', 'utf8'));
  const playersData = JSON.parse(fs.readFileSync('./data/players.json', 'utf8'));
  const matchData = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8'));
  const league = iplData.league;
  const teams = iplData.teams;
  const players = playersData.players || [];
  const ipl2026Match = (matchData.matches || []).find(m => m.id === 'ipl-2026');

  // Write hub
  const hubHtml = buildHubPage({ league, teams, ipl2026Match });
  fs.writeFileSync('./ipl.html', hubHtml);
  console.log(`✓ wrote ipl.html — ${teams.length} franchises`);

  // Write team pages
  if (!fs.existsSync('./ipl')) fs.mkdirSync('./ipl');
  for (const team of teams) {
    const html = buildTeamPage({ team, league, teams, players });
    fs.writeFileSync(`./ipl/${team.slug}.html`, html);
    console.log(`✓ wrote ipl/${team.slug}.html`);
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();

export { main };
