#!/usr/bin/env node

// Unified Teams pages — IPL franchises + cricket nations.
// Output:
//   /teams/index.html         — teams index (franchises + nations)
//   /teams/<franchise>.html   — per IPL franchise
//   /teams/<nation>.html      — per cricket nation
// Replaces generate-ipl-teams.js.

import fs from 'fs';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtShortDateRange(a, b) {
  const s = parseUTC(a); if (!s) return '';
  const e = parseUTC(b);
  if (!e || +e === +s) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()}`;
}

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function formatPlayerName(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length < 2) return name || '';
  const surname = parts[0];
  const given = parts.slice(1).join(' ');
  const titleSurname = surname.charAt(0) + surname.slice(1).toLowerCase();
  return `${given.charAt(0)}. ${titleSurname}`;
}

function platformNav(activeTeam) {
  return `<nav class="platform">
    <a href="../index.html"><span class="num">01</span>Fixtures</a>
    <a href="../series/"><span class="num">02</span>Series</a>
    <a href="../match/"><span class="num">03</span>Match Sheets</a>
    <a href="${activeTeam ? '' : '#'}" class="on"><span class="num">04</span>Teams</a>
    <a href="../players.html"><span class="num">05</span>Players</a>
    <span class="spacer"></span>
    <span class="stamp mono">§ 04 / Teams</span>
  </nav>`;
}

function masthead(doc, heading) {
  const built = new Date().toISOString().slice(0, 10);
  return `<header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div>
          <div class="wordmark-dev">नो स्पॉइलर क्रिकेट</div>
          <div class="wordmark">No<span class="slash">/</span>Spoiler <span class="two">Cricket</span></div>
        </div>
        <div class="mast-meta">Document <b>${htmlEscape(doc)}</b><br/><b>${htmlEscape(heading)}</b><br/>${built.toUpperCase()}</div>
      </div>
      ${platformNav(true)}
    </div>
  </header>`;
}

const COMMON_CSS = `
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:14px 0;border-bottom:1px dashed var(--rule-soft)}
.crumbs a{color:var(--ink-3)} .crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.section{padding:26px 0;border-bottom:1px dashed var(--rule-soft)}
.section h2{font-weight:800;font-size:22px;letter-spacing:-.01em;margin:0 0 6px}
`;

// ————— Teams index —————

function buildTeamsIndex(nations, franchises) {
  const built = new Date().toISOString().slice(0, 10);
  const nationCards = nations.map(n => `
    <a class="ncard" href="${htmlEscape(n.id)}.html" style="--t-primary:${n.colors.primary};--t-secondary:${n.colors.secondary}">
      <div class="ncard-code">${htmlEscape(n.teamCode)}</div>
      <div class="ncard-name">${htmlEscape(n.name)}</div>
      <div class="ncard-dev">${htmlEscape(n.name_hi)}</div>
      <div class="ncard-nick">${htmlEscape(n.nickname)}</div>
    </a>`).join('');
  const franchiseCards = franchises.map(t => `
    <a class="fcard" href="${htmlEscape(t.slug)}.html" style="--t-primary:${t.primaryColor}">
      <div class="fcard-abbr">${htmlEscape(t.abbr)}</div>
      <div class="fcard-name">${htmlEscape(t.short)}</div>
      <div class="fcard-captain mono">${htmlEscape(t.captain || '—')}</div>
      <div class="fcard-venue mono">${htmlEscape(t.homeVenueShort || t.homeVenue || '')}</div>
    </a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Teams — No Spoiler Cricket</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
${COMMON_CSS}
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:36px;padding:34px 0 28px;border-bottom:2px dashed var(--rule)}
.hero h1{font-weight:900;font-size:clamp(56px,7vw,100px);line-height:.88;letter-spacing:-.04em;margin:0}
.hero h1 .a{color:var(--saffron)} .hero h1 .b{color:var(--green)}
.hero .dev{font-family:var(--font-dev);font-size:16px;color:var(--saffron);font-weight:600;margin-top:6px}
.hero .lead{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-top:16px;max-width:62ch}
.hero aside{border-left:2px dashed var(--rule);padding-left:26px;display:grid;grid-template-columns:repeat(2,1fr);gap:16px 22px;align-content:start}
.hero .stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.hero .stat .v{font-weight:800;font-size:30px;letter-spacing:-.02em;margin-top:4px;line-height:1;color:var(--navy)}
.ngrid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--rule);margin-top:16px}
.ncard{padding:18px;border-right:1px dashed var(--rule-soft);border-bottom:1px dashed var(--rule-soft);position:relative;display:grid;gap:4px;color:inherit;min-height:130px;transition:background .08s}
.ncard:nth-child(3n){border-right:0}
.ncard:hover{background:var(--paper-2)}
.ncard::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--t-primary,var(--navy))}
.ncard-code{font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;color:var(--saffron);font-weight:700;padding-left:12px}
.ncard-name{font-weight:900;font-size:28px;letter-spacing:-.02em;padding-left:12px;line-height:1;color:var(--navy);margin-top:4px}
.ncard-dev{font-family:var(--font-dev);font-size:16px;color:var(--saffron);font-weight:600;padding-left:12px}
.ncard-nick{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.1em;padding-left:12px;margin-top:auto;text-transform:uppercase}
.fgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-top:1px solid var(--rule);margin-top:16px}
.fcard{padding:16px;border-right:1px dashed var(--rule-soft);border-bottom:1px dashed var(--rule-soft);position:relative;display:grid;gap:4px;color:inherit;min-height:120px;transition:background .08s}
.fcard:nth-child(5n){border-right:0}
.fcard:hover{background:var(--paper-2)}
.fcard::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--t-primary,var(--navy))}
.fcard-abbr{font-weight:900;font-size:22px;letter-spacing:-.02em;color:var(--t-primary,var(--navy));padding-left:10px;line-height:1}
.fcard-name{font-weight:600;font-size:13px;padding-left:10px}
.fcard-captain{font-size:10.5px;letter-spacing:.08em;color:var(--ink-2);padding-left:10px;text-transform:uppercase}
.fcard-venue{font-size:10.5px;letter-spacing:.12em;color:var(--ink-3);padding-left:10px;text-transform:uppercase;margin-top:auto}
@media (max-width:1100px){
  .ngrid{grid-template-columns:repeat(2,1fr)}
  .ncard:nth-child(3n){border-right:1px dashed var(--rule-soft)}
  .ncard:nth-child(2n){border-right:0}
  .fgrid{grid-template-columns:repeat(2,1fr)}
  .fcard:nth-child(5n){border-right:1px dashed var(--rule-soft)}
  .fcard:nth-child(2n){border-right:0}
  .hero{grid-template-columns:1fr}
}
</style>
</head>
<body>
  <div class="tricolour thick"><span></span><span></span><span></span></div>
  ${masthead('NSC/TEAMS/26', 'Teams Index')}

  <main class="frame">
    <div class="crumbs"><a href="../index.html">Fixtures</a><span class="sep">/</span>Teams</div>

    <section class="hero">
      <div>
        <div class="eyebrow">All teams · Season 2026</div>
        <h1>The <span class="a">Teams</span><br/>of <span class="b">2026</span>.</h1>
        <div class="dev">टीमें · २०२६</div>
        <p class="lead">${nations.length} cricket nations and ${franchises.length} IPL franchises. Click through for squad, captain, home venue, and fixtures.</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Nations</span><span class="v">${nations.length}</span></div>
        <div class="stat"><span class="k">Franchises</span><span class="v">${franchises.length}</span></div>
        <div class="stat"><span class="k">IPL titles total</span><span class="v">${franchises.reduce((s, t) => s + (t.titles || 0), 0)}</span></div>
        <div class="stat"><span class="k">Test-playing</span><span class="v">${nations.length}</span></div>
      </aside>
    </section>

    <section class="section">
      <div class="eyebrow">§ 01 — Cricket nations</div>
      <h2>International teams</h2>
      <div class="ngrid">${nationCards}</div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 02 — IPL 2026 franchises</div>
      <h2>Ten teams, one trophy</h2>
      <div class="fgrid">${franchiseCards}</div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · Teams Index</span>
        <span class="dev">धर्म · खेल · रोमांच</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

// ————— Nation page —————

function upcomingFixturesForNation(nation, allSeries) {
  const today = new Date().toISOString().slice(0, 10);
  const wantCodes = new Set([nation.code, nation.teamCode]);
  return allSeries
    .filter(s => (s.teams || []).some(t => wantCodes.has(t)))
    .filter(s => (s.endDate || s.startDate) >= today)
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
    .slice(0, 6);
}

function topPlayersForNation(nation, allPlayers) {
  return allPlayers
    .filter(p => p.nationalityCode === nation.code)
    .sort((a, b) => (a.ranking || 99) - (b.ranking || 99))
    .slice(0, 8);
}

function buildNationPage(nation, allPlayers, allSeries) {
  const built = new Date().toISOString().slice(0, 10);
  const fixtures = upcomingFixturesForNation(nation, allSeries);
  const players = topPlayersForNation(nation, allPlayers);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(nation.name)} — Team · No Spoiler Cricket</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
${COMMON_CSS}
.team-band{height:10px;background:var(--t-primary)}
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:36px;padding:34px 0 28px;border-bottom:2px dashed var(--rule)}
.hero .tag{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.hero h1{font-weight:900;font-size:clamp(56px,7vw,104px);line-height:.88;letter-spacing:-.04em;margin:0;color:var(--t-primary)}
.hero h1 .em{color:var(--t-secondary);display:block;font-style:italic;font-weight:600}
.hero .dev{font-family:var(--font-dev);font-size:22px;color:var(--t-secondary);font-weight:700;margin-top:8px}
.hero .sub{font-size:15px;color:var(--ink-2);margin-top:16px;max-width:56ch;line-height:1.55}
.hero aside{border-left:2px dashed var(--rule);padding-left:26px;display:grid;grid-template-columns:1fr 1fr;gap:16px 22px;align-content:start}
.hero .stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.hero .stat .v{font-weight:800;font-size:18px;letter-spacing:-.02em;margin-top:4px;line-height:1.2;color:var(--navy)}
.captains{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--rule);margin-top:14px}
.cap{padding:18px;border-right:1px dashed var(--rule-soft);border-bottom:1px dashed var(--rule-soft)}
.cap:last-child{border-right:0}
.cap .lbl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--saffron);font-weight:700}
.cap .nm{font-weight:800;font-size:22px;letter-spacing:-.01em;margin-top:6px;color:var(--navy)}
.squad-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:16px;border-top:1px solid var(--rule)}
.pcard{padding:14px;border-right:1px dashed var(--rule-soft);border-bottom:1px dashed var(--rule-soft);display:grid;gap:4px;color:inherit;align-content:start;min-height:180px;transition:background .08s}
.pcard:nth-child(4n){border-right:0}
.pcard:hover{background:var(--paper-2)}
.pcard .ph{width:100%;aspect-ratio:1/1;background:var(--paper-2);overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid var(--rule-soft);margin-bottom:8px}
.pcard .ph img{width:100%;height:100%;object-fit:cover;filter:grayscale(.12) contrast(1.03)}
.pcard .ph .no-photo{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.pcard .nm{font-weight:700;font-size:14px;line-height:1.2}
.pcard .rl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;color:var(--ink-3);text-transform:uppercase}
.pcard .rk{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.1em;color:var(--saffron);font-weight:700;margin-top:auto;padding-top:6px;border-top:1px dashed var(--rule-soft)}
.fxlist{border-top:1px solid var(--rule);margin-top:14px}
.fx{display:grid;grid-template-columns:100px 1fr 100px 80px;gap:0;padding:12px 0;border-bottom:1px dashed var(--rule-soft);align-items:center;color:inherit}
.fx:hover{background:var(--paper-2)}
.fx .c{padding:0 10px}
.fx .c.first{padding-left:0}
.fx .dt{font-family:var(--font-mono);font-size:11px;letter-spacing:.06em}
.fx .nm{font-weight:600;font-size:15px}
.fx .sub{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
.fx .stars{font-family:var(--font-mono);font-size:11px;color:var(--saffron);text-align:right}
@media (max-width:1100px){
  .hero{grid-template-columns:1fr}
  .captains{grid-template-columns:1fr}
  .squad-grid{grid-template-columns:repeat(2,1fr)}
  .pcard:nth-child(4n){border-right:1px dashed var(--rule-soft)}
  .pcard:nth-child(2n){border-right:0}
  .fx{grid-template-columns:80px 1fr 60px}
  .fx .c:nth-child(4){display:none}
}
</style>
</head>
<body style="--t-primary:${nation.colors.primary};--t-secondary:${nation.colors.secondary}">
  <div class="tricolour thick"><span></span><span></span><span></span></div>
  ${masthead(`NSC/TEAM/${nation.teamCode}`, `Team Sheet · ${nation.name}`)}
  <div class="team-band"></div>

  <main class="frame">
    <div class="crumbs"><a href="../index.html">Fixtures</a><span class="sep">/</span><a href="index.html">Teams</a><span class="sep">/</span>${htmlEscape(nation.name)}</div>

    <section class="hero">
      <div>
        <div class="tag">
          <span style="background:var(--t-primary);color:#fff;font-family:var(--font-mono);font-weight:700;padding:3px 9px;letter-spacing:.14em">${htmlEscape(nation.teamCode)}</span>
          <span>${htmlEscape(nation.nickname)}</span>
          <span>${htmlEscape(nation.homeBoard)}</span>
        </div>
        <h1>${htmlEscape(nation.name.split(' ')[0])}${nation.name.split(' ').slice(1).join(' ') ? `<span class="em">${htmlEscape(nation.name.split(' ').slice(1).join(' '))}</span>` : ''}</h1>
        <div class="dev">${htmlEscape(nation.name_hi)}</div>
        <p class="sub">${htmlEscape(nation.identity)}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Head Coach</span><span class="v">${htmlEscape(nation.coach)}</span></div>
        <div class="stat"><span class="k">Home Board</span><span class="v">${htmlEscape(nation.homeBoard)}</span></div>
        <div class="stat"><span class="k">Players on file</span><span class="v">${players.length}</span></div>
        <div class="stat"><span class="k">Upcoming fixtures</span><span class="v">${fixtures.length}</span></div>
      </aside>
    </section>

    <section class="section">
      <div class="eyebrow">§ 01 — Captains by format</div>
      <h2>Who leads in ${new Date().getUTCFullYear()}</h2>
      <div class="captains">
        <div class="cap"><div class="lbl">Test</div><div class="nm">${htmlEscape(nation.captains.test || '—')}</div></div>
        <div class="cap"><div class="lbl">ODI</div><div class="nm">${htmlEscape(nation.captains.odi || '—')}</div></div>
        <div class="cap"><div class="lbl">T20I</div><div class="nm">${htmlEscape(nation.captains.t20i || '—')}</div></div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 02 — Squad highlights</div>
      <h2>${players.length} players in the international pool</h2>
      <div class="squad-grid">
        ${players.map(p => {
          const photoPath = p.photoUrl?.startsWith('players/') ? `../${p.photoUrl}` : '';
          return `<a class="pcard" href="../players/${htmlEscape(p.slug || p.id)}.html">
            <div class="ph">${photoPath ? `<img loading="lazy" src="${htmlEscape(photoPath)}" alt="${htmlEscape(p.name)}" onerror="this.parentNode.innerHTML='<span class=&quot;no-photo&quot;>No photo</span>'"/>` : `<span class="no-photo">No photo</span>`}</div>
            <div class="nm">${htmlEscape(formatPlayerName(p.name))}</div>
            <div class="rl">${htmlEscape((p.role || '').replace('-', ' ').toUpperCase())}</div>
            <div class="rk">#${p.ranking || '—'}</div>
          </a>`;
        }).join('')}
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 03 — Upcoming fixtures</div>
      <h2>What's next</h2>
      <div class="fxlist">
        ${fixtures.length ? fixtures.map(s => `<a class="fx" href="../series/${htmlEscape(s.id)}.html">
          <div class="c first dt">${htmlEscape(fmtShortDateRange(s.startDate, s.endDate))}</div>
          <div class="c"><div class="nm">${htmlEscape(s.name)}</div><div class="sub">${htmlEscape(s.venue || '')}</div></div>
          <div class="c"><span class="fmt ${mapFmt(s)}">${htmlEscape(fmtLabel(s))}</span></div>
          <div class="c stars">${'★'.repeat(s.rating || 0)}</div>
        </a>`).join('') : '<div style="padding:20px 0;color:var(--ink-3);font-family:var(--font-mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase">No upcoming fixtures on file.</div>'}
      </div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · Team Sheet · ${htmlEscape(nation.name)}</span>
        <span class="dev">धर्म · खेल · रोमांच</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

function mapFmt(s) {
  if (s.format === 'franchise-league' && String(s.id).startsWith('ipl-')) return 'ipl';
  if (s.format === 'test-series') return 'test';
  if (s.format === 'odi-series') return 'odi';
  if (s.format === 't20i-series') return 't20i';
  if (s.format === 'icc-tournament') return 'icc';
  return 'league';
}
function fmtLabel(s) {
  return { test: 'TEST', odi: 'ODI', t20i: 'T20I', ipl: 'IPL', league: 'LEAGUE', icc: 'ICC' }[mapFmt(s)];
}

// ————— Franchise page (IPL) —————

function buildFranchisePage(team, allFranchises, allPlayers) {
  const built = new Date().toISOString().slice(0, 10);
  // Match key players to players.json records where possible
  const findPlayer = (name) => {
    const lc = name.toLowerCase();
    return allPlayers.find(p => {
      const n = (p.name || '').toLowerCase();
      if (n === lc) return true;
      const parts = n.split(/\s+/);
      if (parts.length >= 2) {
        const flipped = `${parts.slice(1).join(' ')} ${parts[0]}`;
        if (flipped === lc) return true;
      }
      return false;
    });
  };

  const playerCards = (team.keyPlayers || []).map(nm => {
    const rec = findPlayer(nm);
    const photoPath = rec?.photoUrl?.startsWith('players/') ? `../${rec.photoUrl}` : '';
    const role = rec?.role ? rec.role.replace('-', ' ') : '';
    const href = rec ? `../players/${rec.slug || rec.id}.html` : null;
    const inner = `
      <div class="ph">${photoPath ? `<img loading="lazy" src="${htmlEscape(photoPath)}" alt="${htmlEscape(rec?.name || nm)}" onerror="this.parentNode.innerHTML='<span class=&quot;no-photo&quot;>No photo</span>'"/>` : `<span class="no-photo">No photo</span>`}</div>
      <div class="nm">${htmlEscape(rec ? formatPlayerName(rec.name) : nm)}</div>
      <div class="rl">${htmlEscape((role || '—').toUpperCase())}</div>`;
    return href ? `<a class="pcard" href="${href}">${inner}</a>` : `<div class="pcard">${inner}</div>`;
  }).join('');

  const siblings = allFranchises.filter(t => t.id !== team.id).map(t => `
    <a class="sib" href="${htmlEscape(t.slug)}.html" style="--s-color:${t.primaryColor}">
      <span class="sib-ab">${htmlEscape(t.abbr)}</span>
      <span class="sib-nm">${htmlEscape(t.short)}</span>
    </a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(team.name)} — IPL Franchise · No Spoiler Cricket</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
${COMMON_CSS}
.team-band{height:10px;background:var(--t-primary)}
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:36px;padding:34px 0 28px;border-bottom:2px dashed var(--rule)}
.hero .tag{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)}
.hero .abbr-tag{display:inline-flex;align-items:center;background:var(--t-primary);color:#fff;font-weight:900;font-size:20px;padding:4px 12px;letter-spacing:-.005em}
.hero h1{font-weight:900;font-size:clamp(52px,6.5vw,96px);line-height:.9;letter-spacing:-.035em;margin:0;color:var(--navy)}
.hero h1 .em{color:var(--t-primary);font-style:italic;font-weight:800;display:block}
.hero .sub{font-size:15px;color:var(--ink-2);margin-top:16px;max-width:56ch;line-height:1.55}
.hero aside{border-left:2px dashed var(--rule);padding-left:26px;display:grid;grid-template-columns:1fr 1fr;gap:16px 22px;align-content:start}
.hero .stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.hero .stat .v{font-weight:800;font-size:17px;letter-spacing:-.02em;margin-top:4px;line-height:1.2;color:var(--navy)}
.marquee{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--rule);margin-top:14px}
.marquee .h{padding:18px 22px;background:var(--t-primary);color:#fff;display:flex;flex-direction:column;justify-content:center;gap:6px}
.marquee .h .lbl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;opacity:.85;font-weight:700}
.marquee .h .nm{font-weight:800;font-size:26px;letter-spacing:-.015em;line-height:1}
.marquee .b{padding:22px;font-size:14.5px;line-height:1.55;color:var(--ink-2)}
.squad-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:16px;border-top:1px solid var(--rule)}
.pcard{padding:14px;border-right:1px dashed var(--rule-soft);border-bottom:1px dashed var(--rule-soft);display:grid;gap:4px;color:inherit;align-content:start;min-height:180px;transition:background .08s}
.pcard:nth-child(4n){border-right:0}
.pcard:hover{background:var(--paper-2)}
.pcard .ph{width:100%;aspect-ratio:1/1;background:var(--paper-2);overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid var(--rule-soft);margin-bottom:8px}
.pcard .ph img{width:100%;height:100%;object-fit:cover;filter:grayscale(.12) contrast(1.03)}
.pcard .ph .no-photo{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.pcard .nm{font-weight:700;font-size:14px}
.pcard .rl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;color:var(--ink-3);text-transform:uppercase}
.info{display:grid;grid-template-columns:repeat(2,1fr);gap:24px 40px;margin-top:14px}
.info .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)}
.info .v{font-weight:700;font-size:17px;letter-spacing:-.005em;margin-top:4px;color:var(--navy)}
.info .vs{font-size:13.5px;color:var(--ink-2);line-height:1.55;margin-top:6px}
.sibs{display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-top:1px solid var(--rule);margin-top:16px}
.sib{padding:14px;border-right:1px dashed var(--rule-soft);border-bottom:1px dashed var(--rule-soft);display:flex;flex-direction:column;gap:4px;color:inherit;transition:background .08s}
.sib:nth-child(5n){border-right:0}
.sib:hover{background:var(--paper-2)}
.sib-ab{font-weight:900;font-size:18px;color:var(--s-color,var(--navy));letter-spacing:-.01em}
.sib-nm{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.06em;color:var(--ink-3);text-transform:uppercase}
@media (max-width:1100px){
  .hero{grid-template-columns:1fr}
  .squad-grid{grid-template-columns:repeat(3,1fr)}
  .pcard:nth-child(4n){border-right:1px dashed var(--rule-soft)}
  .pcard:nth-child(3n){border-right:0}
  .sibs{grid-template-columns:repeat(3,1fr)}
  .sib:nth-child(5n){border-right:1px dashed var(--rule-soft)}
  .sib:nth-child(3n){border-right:0}
  .marquee{grid-template-columns:1fr}
  .info{grid-template-columns:1fr}
}
</style>
</head>
<body style="--t-primary:${team.primaryColor};--t-secondary:${team.secondaryColor}">
  <div class="tricolour thick"><span></span><span></span><span></span></div>
  ${masthead(`NSC/TEAM/${team.abbr}`, `Franchise · ${team.abbr}`)}
  <div class="team-band"></div>

  <main class="frame">
    <div class="crumbs"><a href="../index.html">Fixtures</a><span class="sep">/</span><a href="index.html">Teams</a><span class="sep">/</span><a href="../series/ipl-2026.html">IPL 2026</a><span class="sep">/</span>${htmlEscape(team.short)}</div>

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
        <h1>${htmlEscape(team.name.split(' ').slice(0, -1).join(' '))}<span class="em">${htmlEscape(team.name.split(' ').slice(-1)[0])}</span></h1>
        <p class="sub">${htmlEscape(team.identity)}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Captain</span><span class="v">${htmlEscape(team.captain || '—')}</span></div>
        <div class="stat"><span class="k">Head coach</span><span class="v">${htmlEscape(team.coach || '—')}</span></div>
        <div class="stat"><span class="k">Home venue</span><span class="v">${htmlEscape(team.homeVenueShort || team.homeVenue)}</span></div>
        <div class="stat"><span class="k">Pitch</span><span class="v">${htmlEscape(team.pitchReputation || '—')}</span></div>
        <div class="stat"><span class="k">IPL titles</span><span class="v">${team.titles || 0}</span></div>
        <div class="stat"><span class="k">Owner</span><span class="v">${htmlEscape((team.owner || '').split(/[·(]/)[0].trim() || '—')}</span></div>
      </aside>
    </section>

    <section class="section">
      <div class="eyebrow">§ 01 — Marquee watch</div>
      <h2>Who to watch in ${new Date().getUTCFullYear()}</h2>
      <div class="marquee">
        <div class="h">
          <div class="lbl">Face of ${htmlEscape(team.abbr)} — 2026</div>
          <div class="nm">${htmlEscape((team.marqueeWatch || '').split(' — ')[0] || '')}</div>
        </div>
        <div class="b">${htmlEscape((team.marqueeWatch || '').split(' — ').slice(1).join(' — ') || team.marqueeWatch || '')}</div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 02 — Key players</div>
      <h2>${(team.keyPlayers || []).length} names to know</h2>
      <div class="squad-grid">${playerCards}</div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 03 — Franchise</div>
      <h2>About the team</h2>
      <div class="info">
        <div><div class="k">Full name</div><div class="v">${htmlEscape(team.name)}</div></div>
        <div><div class="k">Titles</div><div class="v">${team.titles || 0}${team.titleYears?.length ? `<div class="vs">${team.titleYears.join(' · ')}</div>` : ''}</div></div>
        <div><div class="k">Home city</div><div class="v">${htmlEscape(team.city)}, ${htmlEscape(team.state || '')}</div></div>
        <div><div class="k">Home venue</div><div class="v">${htmlEscape(team.homeVenue)}<div class="vs">${htmlEscape(team.pitchReputation || '')}</div></div></div>
        <div><div class="k">Ownership</div><div class="v"><div class="vs" style="margin-top:0;font-size:15px;color:var(--navy)">${htmlEscape(team.owner || '—')}</div></div></div>
        <div><div class="k">Colours</div><div class="v" style="display:flex;gap:10px;align-items:center">
          <span style="display:inline-block;width:20px;height:20px;background:${team.primaryColor};border:1px solid var(--rule)"></span>
          <span style="display:inline-block;width:20px;height:20px;background:${team.secondaryColor};border:1px solid var(--rule)"></span>
          <span class="mono" style="font-size:11px;color:var(--ink-3);letter-spacing:.06em">${htmlEscape(team.primaryColor)} · ${htmlEscape(team.secondaryColor)}</span>
        </div></div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 04 — Other IPL franchises</div>
      <h2>Browse the league</h2>
      <div class="sibs">${siblings}</div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · Franchise · ${htmlEscape(team.abbr)}</span>
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
  const iplData = JSON.parse(fs.readFileSync('./data/ipl-teams.json', 'utf8'));
  const nationsData = JSON.parse(fs.readFileSync('./data/nations.json', 'utf8'));
  const playersData = JSON.parse(fs.readFileSync('./data/players.json', 'utf8'));
  const matchData = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8'));
  const nations = nationsData.nations || [];
  const franchises = iplData.teams || [];
  const allPlayers = playersData.players || [];
  const allSeries = matchData.matches || [];

  const outDir = './teams';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Index
  fs.writeFileSync(`${outDir}/index.html`, buildTeamsIndex(nations, franchises));
  console.log(`✓ wrote teams/index.html`);

  // Nations
  for (const n of nations) {
    fs.writeFileSync(`${outDir}/${n.id}.html`, buildNationPage(n, allPlayers, allSeries));
    console.log(`✓ wrote teams/${n.id}.html`);
  }

  // Franchises
  for (const t of franchises) {
    fs.writeFileSync(`${outDir}/${t.slug}.html`, buildFranchisePage(t, franchises, allPlayers));
    console.log(`✓ wrote teams/${t.slug}.html`);
  }

  console.log(`✓ ${nations.length} nations + ${franchises.length} franchises = ${nations.length + franchises.length} team pages`);
}

main();
