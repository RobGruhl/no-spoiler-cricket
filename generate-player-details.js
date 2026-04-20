#!/usr/bin/env node

// Per-player detail page: profile + 2026 fixtures featuring the player's nation.

import fs from 'fs';
import path from 'path';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const ROLE_LABELS = {
  'batter': 'Batter',
  'bowler': 'Bowler',
  'all-rounder': 'All-rounder',
  'wicket-keeper': 'Wicket-keeper',
};

const NATIONALITY_TAG = {
  IN: 'IND', AU: 'AUS', UK: 'ENG', GB: 'ENG', NZ: 'NZ', ZA: 'SA', PK: 'PAK',
  BD: 'BAN', AF: 'AFG', WI: 'WI', IE: 'IRE', NP: 'NEP', SL: 'SL',
};

// Map player nationalityCode → team codes used in match-data teams[]
const TEAM_CODE_MAP = {
  IN: ['IND', 'IN'], AU: ['AUS', 'AU'], UK: ['ENG', 'UK', 'GB'],
  NZ: ['NZ', 'NZL'], ZA: ['ZA', 'RSA'], PK: ['PAK', 'PK'],
  BD: ['BAN', 'BD'], AF: ['AFG', 'AF'], SL: ['SL', 'LKA'],
};

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtShortDate(ymd) {
  const d = parseUTC(ymd);
  if (!d) return '';
  return `${WEEKDAY_SHORT[d.getUTCDay()]}, ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function formatSurnameFirst(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length < 2) return name || '';
  const surname = parts[0];
  const given = parts.slice(1).join(' ');
  const titleCase = surname.charAt(0) + surname.slice(1).toLowerCase();
  return `${given} ${titleCase}`;
}

function computeAge(dob) {
  const d = parseUTC(dob);
  if (!d) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const mDiff = now.getUTCMonth() - d.getUTCMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

function renderProgram(player, allMatches) {
  const wantCodes = new Set(TEAM_CODE_MAP[player.nationalityCode] || [player.nationalityCode]);

  // Also pick franchise-league fixtures that could plausibly feature the player
  // (IPL for anyone in an IPL team, PSL for PK-nationals, etc.)
  const playerTeamName = (player.team || '').split('·').map(s => s.trim())[1] || '';
  const franchiseName = playerTeamName.toLowerCase();

  const matches = allMatches.filter(m => {
    const teams = m.teams || [];
    const teamMatch = teams.some(t => wantCodes.has(t));
    if (teamMatch) return true;
    // Franchise league heuristic: include IPL/PSL/BBL/etc if player's franchise matches
    if (m.format === 'franchise-league') {
      if (franchiseName && m.name.toLowerCase().includes('premier league') && franchiseName) {
        // IPL: include if player has an IPL-style franchise
        const iplFranchises = ['mumbai indians', 'chennai super kings', 'royal challengers', 'gujarat titans', 'rajasthan royals', 'sunrisers', 'delhi capitals', 'lucknow super giants', 'kolkata knight riders', 'punjab kings'];
        return iplFranchises.some(f => franchiseName.includes(f));
      }
    }
    // ICC tournaments featuring internationals — include if player is a T20I regular
    if (m.format === 'icc-tournament' && (player.specialties || []).some(s => s.includes('limited-overs') || s.includes('t20'))) return true;
    return false;
  });

  if (!matches.length) return '<p class="prose">No confirmed 2026 fixtures yet. Check back as squads are announced.</p>';

  // Group by month
  const byMonth = {};
  matches.forEach(m => {
    const month = parseUTC(m.startDate)?.getUTCMonth();
    if (month == null) return;
    (byMonth[month] = byMonth[month] || []).push(m);
  });

  return Object.keys(byMonth).sort((a, b) => a - b).map(mo => {
    const rows = byMonth[mo].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')).map(m => {
      return `<a class="prow" href="../match-details/${htmlEscape(m.id)}.html">
        <div class="c first mono">${htmlEscape(fmtShortDate(m.startDate))}</div>
        <div class="c"><span class="name">${htmlEscape(m.name)}</span></div>
        <div class="c mono cat">${htmlEscape((m.format || '').replace('-', ' ').toUpperCase())}</div>
      </a>`;
    }).join('');
    return `<div class="pm">
      <div class="pm-head">
        <div class="pm-num mono">${String(Number(mo) + 1).padStart(2, '0')}</div>
        <div class="pm-name">${MONTH_NAMES[Number(mo)]}</div>
        <div class="pm-count mono">${byMonth[mo].length} fixture${byMonth[mo].length !== 1 ? 's' : ''}</div>
      </div>
      <div class="pm-list">${rows}</div>
    </div>`;
  }).join('');
}

function buildPlayerHtml(player, allMatches, iplTeamsBySlug = {}) {
  const built = new Date().toISOString().slice(0, 10);
  const natTag = NATIONALITY_TAG[player.nationalityCode] || (player.nationalityCode || '');
  const photo = player.photoUrl && player.photoUrl.startsWith('players') ? `../${player.photoUrl}` : null;
  const age = computeAge(player.dateOfBirth);
  const display = formatSurnameFirst(player.name);
  const nameParts = display.split(' ');
  const given = nameParts[0];
  const surname = nameParts.slice(1).join(' ');
  const specialties = (player.specialties || []).map(s => s.replace('-', ' '));
  const franchise = player.iplFranchise ? iplTeamsBySlug[player.iplFranchise] : null;

  const programHtml = renderProgram(player, allMatches);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(display)} — No Spoiler Cricket</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:14px 0;border-bottom:1px dashed var(--rule-soft)}
.crumbs a{color:var(--ink-3)} .crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.hero{display:grid;grid-template-columns:220px 1.2fr 1fr;gap:36px;padding:34px 0 28px;border-bottom:2px dashed var(--rule)}
.hero .photo{aspect-ratio:1/1;background:var(--paper-2);border:1px solid var(--rule);overflow:hidden;display:flex;align-items:center;justify-content:center}
.hero .photo img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(.12) contrast(1.03)}
.hero .photo .no-photo{font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.hero .tag{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.hero h1{font-weight:900;font-size:clamp(44px,5.5vw,80px);line-height:.9;letter-spacing:-.04em;margin:0;color:var(--navy)}
.hero h1 .em{font-weight:800;color:var(--saffron);display:block}
.hero .sub{font-family:var(--font-mono);font-size:13px;letter-spacing:.06em;color:var(--ink-2);margin-top:12px;line-height:1.5}
.hero aside{border-left:2px dashed var(--rule);padding-left:26px;display:grid;grid-template-columns:1fr 1fr;gap:16px 22px;align-content:start}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-weight:800;font-size:28px;letter-spacing:-.02em;line-height:1;margin-top:4px;color:var(--navy)}
.stat .v.sm{font-size:16px}
.stat .v.mono{font-family:var(--font-mono);font-weight:700}
.section{padding:26px 0;border-bottom:1px dashed var(--rule-soft)}
.section h2{font-weight:800;font-size:22px;letter-spacing:-.01em;margin:0 0 10px}
.section .eyebrow{margin-bottom:4px;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)}
.chips-inline{display:flex;gap:6px;flex-wrap:wrap}
.sp{display:inline-flex;align-items:center;height:22px;padding:0 9px;background:var(--navy);color:#fff;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;line-height:1}
.nat-tag{display:inline-block;background:var(--navy);color:#fff;padding:2px 7px;font-family:var(--font-mono);font-weight:700;letter-spacing:.14em;font-size:10px;margin-right:4px}
.ipl-badge{display:inline-flex;align-items:center;gap:10px;margin-top:14px;padding:10px 14px;border:1px dashed var(--rule);background:var(--paper-2);color:inherit;transition:background .1s}
.ipl-badge:hover{background:var(--paper)}
.ipl-badge .swatch{display:inline-block;width:18px;height:18px;background:var(--franchise-color,var(--navy));border:1px solid var(--rule)}
.ipl-badge .lbl{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--saffron);font-weight:700}
.ipl-badge .nm{font-size:14px;font-weight:700;letter-spacing:-.005em}
.ipl-badge .arr{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.1em}
.program{margin-top:14px}
.pm{margin-top:24px}
.pm-head{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:baseline;padding:16px 0 8px;border-top:3px solid var(--ink)}
.pm-head .pm-num{font-weight:900;font-size:48px;line-height:.9;letter-spacing:-.04em;color:var(--navy)}
.pm-head .pm-name{font-weight:700;font-size:22px;letter-spacing:-.02em}
.pm-head .pm-count{font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);text-align:right}
.pm-list{border-top:1px solid var(--rule)}
.prow{display:grid;grid-template-columns:140px 1fr 140px;gap:0;padding:10px 0;border-bottom:1px dashed var(--rule-soft);align-items:center;color:inherit}
.prow:hover{background:var(--paper-2)}
.prow .c{padding:0 10px;min-width:0}
.prow .c.first{padding-left:0}
.prow .c .name{font-weight:600;font-size:15px;letter-spacing:-.005em}
.prow .c.cat{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase;text-align:right}
.prose{font-size:15px;line-height:1.6;color:var(--ink-2);margin:10px 0;max-width:72ch}
.bio{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--rule);margin-top:14px}
.bio .s{padding:18px;border-right:1px dashed var(--rule-soft);border-bottom:1px dashed var(--rule-soft)}
.bio .s:last-child{border-right:0}
.bio .s .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.bio .s .v{font-weight:700;font-size:22px;letter-spacing:-.02em;margin-top:4px;line-height:1;color:var(--navy)}
.bio .s .v.mono{font-family:var(--font-mono);font-weight:700}
@media (max-width:1100px){
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:2px dashed var(--rule);padding-top:20px}
  .bio{grid-template-columns:repeat(2,1fr)}
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
        <div class="mast-meta">
          Document <b>NSC/PLY/${htmlEscape((player.slug || player.id || '').toUpperCase().slice(0, 10))}</b><br/>
          <b>Player Sheet</b><br/>
          ${htmlEscape(built.toUpperCase())}
        </div>
      </div>
      <nav class="platform">
        <a href="../index.html"><span class="num">01</span>Fixtures</a>
        <a href="../series/"><span class="num">02</span>Series</a>
        <a href="../match/"><span class="num">03</span>Match Sheets</a>
        <a href="../teams/"><span class="num">04</span>Teams</a>
        <a href="../players.html" class="on"><span class="num">05</span>Players</a>
        <span class="spacer"></span>
        <span class="stamp mono">§ Player Sheet</span>
      </nav>
    </div>
  </header>

  <main class="frame">
    <div class="crumbs"><a href="../index.html">Fixtures</a><span class="sep">/</span><a href="../players.html">Players</a><span class="sep">/</span>${htmlEscape(display)}</div>

    <section class="hero">
      <div class="photo">
        ${photo ? `<img src="${htmlEscape(photo)}" alt="${htmlEscape(display)}" onerror="this.parentNode.innerHTML='<span class=&quot;no-photo&quot;>No photo</span>'"/>` : `<span class="no-photo">No photo</span>`}
      </div>
      <div>
        <div class="tag">
          <span><span class="nat-tag">${htmlEscape(natTag)}</span> ${htmlEscape(player.nationality || '')}</span>
          <span>Rank #${player.ranking || '—'}</span>
          ${age ? `<span>Age ${age}</span>` : ''}
          <span>${htmlEscape(ROLE_LABELS[player.role] || player.role || '')}</span>
        </div>
        <h1>${htmlEscape(given)}<span class="em">${htmlEscape(surname)}</span></h1>
        <p class="sub">${htmlEscape(player.team || 'Team TBD')}</p>
        <div class="chips-inline" style="margin-top:14px">
          ${specialties.map(s => `<span class="sp">${htmlEscape(s.toUpperCase())}</span>`).join('')}
        </div>
        ${franchise ? `<a class="ipl-badge" style="--franchise-color:${franchise.primaryColor}" href="../teams/${htmlEscape(franchise.slug)}.html">
          <span class="swatch"></span>
          <span><span class="lbl">IPL 2026 · ${htmlEscape(franchise.abbr)}</span><br/><span class="nm">${htmlEscape(franchise.name)}</span></span>
          <span class="arr">→</span>
        </a>` : ''}
      </div>
      <aside>
        <div class="stat"><span class="k">Rank</span><span class="v">${player.ranking || '—'}</span></div>
        <div class="stat"><span class="k">Role</span><span class="v sm">${htmlEscape(ROLE_LABELS[player.role] || player.role || '—')}</span></div>
        <div class="stat"><span class="k">Team</span><span class="v sm">${htmlEscape(player.team || 'TBD')}</span></div>
        <div class="stat"><span class="k">Nation</span><span class="v sm"><span class="nat-tag">${htmlEscape(natTag)}</span> ${htmlEscape(player.nationality || '')}</span></div>
      </aside>
    </section>

    <section class="section">
      <div class="eyebrow">§ 01 — Profile</div>
      <h2>Bio</h2>
      <div class="bio">
        <div class="s"><div class="k">Nationality</div><div class="v sm"><span class="nat-tag">${htmlEscape(natTag)}</span> ${htmlEscape(player.nationality || 'Unknown')}</div></div>
        <div class="s"><div class="k">Date of Birth</div><div class="v sm mono">${htmlEscape(player.dateOfBirth || '—')}</div></div>
        <div class="s"><div class="k">Specialties</div><div class="v sm">${specialties.map(s => htmlEscape(s)).join(' · ') || '—'}</div></div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 02 — 2026 Fixtures</div>
      <h2>Likely appearances</h2>
      <p class="prose" style="font-size:12px;letter-spacing:.04em">Derived from nation &amp; franchise — squads are announced closer to each fixture.</p>
      <div class="program">${programHtml}</div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · § Player Sheet · ${htmlEscape(display)}</span>
        <span class="dev">धर्म · खेल · रोमांच</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

function loadIplTeamsBySlug() {
  try {
    const d = JSON.parse(fs.readFileSync('./data/ipl-teams.json', 'utf8'));
    const map = {};
    for (const t of d.teams || []) map[t.slug] = t;
    return map;
  } catch { return {}; }
}

function generateAll() {
  const playersData = JSON.parse(fs.readFileSync('./data/players.json', 'utf8'));
  let matchData = { matches: [] };
  try { matchData = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8')); } catch {}
  const iplTeamsBySlug = loadIplTeamsBySlug();
  const outDir = './players';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (const p of playersData.players || []) {
    if (!p.slug && !p.id) continue;
    const filepath = path.join(outDir, `${p.slug || p.id}.html`);
    fs.writeFileSync(filepath, buildPlayerHtml(p, matchData.matches || [], iplTeamsBySlug));
    n++;
  }
  console.log(`✓ generated ${n} player pages`);
}

const args = process.argv.slice(2);
if (args.includes('--all')) {
  generateAll();
} else if (args.includes('--player') && args.length >= 2) {
  const slug = args[args.indexOf('--player') + 1];
  const playersData = JSON.parse(fs.readFileSync('./data/players.json', 'utf8'));
  const p = (playersData.players || []).find(x => (x.slug || x.id) === slug);
  if (!p) { console.error(`❌ player not found: ${slug}`); process.exit(1); }
  let matchData = { matches: [] };
  try { matchData = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8')); } catch {}
  const iplTeamsBySlug = loadIplTeamsBySlug();
  const outDir = './players';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filepath = path.join(outDir, `${p.slug || p.id}.html`);
  fs.writeFileSync(filepath, buildPlayerHtml(p, matchData.matches || [], iplTeamsBySlug));
  console.log(`✓ ${filepath}`);
} else if (args.includes('--help')) {
  console.log('Usage: node generate-player-details.js --all | --player <slug>');
} else {
  console.log('No args. Use --help.');
}

export { buildPlayerHtml, generateAll };
