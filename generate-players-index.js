#!/usr/bin/env node

// Outputs players.html — grid of top cricketers with role/team chip filters.

import fs from 'fs';

const ROLE_LABELS = {
  'batter': 'Batter',
  'bowler': 'Bowler',
  'all-rounder': 'All-rounder',
  'wicket-keeper': 'Wicket-keeper',
};

// Nation codes rendered as a boxed mono tag instead of emoji (no-emoji rule)
const NATIONALITY_TAG = {
  IN: 'IND', AU: 'AUS', UK: 'ENG', GB: 'ENG', NZ: 'NZ', ZA: 'SA', PK: 'PAK',
  BD: 'BAN', AF: 'AFG', WI: 'WI', IE: 'IRE', NP: 'NEP', SL: 'SL',
};

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function formatSurnameFirst(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length < 2) return name || '';
  const surname = parts[0];
  const given = parts.slice(1).join(' ');
  const titleCase = surname.charAt(0) + surname.slice(1).toLowerCase();
  const initial = given.charAt(0);
  return `${initial}. ${titleCase}`;
}

function buildIndex(players, opts = {}) {
  const { lastUpdated = null } = opts;
  const built = new Date().toISOString().slice(0, 10);
  const updateStr = lastUpdated ? lastUpdated.slice(0, 10) : built;

  const cards = players.map((p, i) => {
    const natTag = NATIONALITY_TAG[p.nationalityCode] || (p.nationalityCode || '');
    const photoPath = p.photoUrl?.startsWith('players/') ? p.photoUrl : '';
    const specialtyTags = (p.specialties || []).slice(0, 3).map(s => s.toUpperCase().replace('-', ' ')).join(' · ');
    const specialtyData = (p.specialties || []).concat([p.role || '']).join(' ');
    const slug = p.slug || p.id;
    return `<a class="rc" data-role="${htmlEscape(p.role || '')}" data-nat="${htmlEscape(p.nationalityCode || '')}" data-sp="${htmlEscape(specialtyData)}" href="players/${htmlEscape(slug)}.html">
      <div class="rc-num">№ ${String(i + 1).padStart(2, '0')}</div>
      <div class="rc-photo">${photoPath ? `<img loading="lazy" src="${htmlEscape(photoPath)}" alt="${htmlEscape(p.name)}" onerror="this.style.display='none';this.parentNode.innerHTML='<span class=&quot;no-photo mono&quot;>No photo</span>'"/>` : `<span class="no-photo mono">No photo</span>`}</div>
      <div class="rc-rank mono">#${p.ranking || '—'} · ${ROLE_LABELS[p.role] || p.role || ''}</div>
      <div class="rc-name">${htmlEscape(formatSurnameFirst(p.name))}</div>
      <div class="rc-team mono">${htmlEscape(p.team || '')}</div>
      <div class="rc-tags mono">${specialtyTags}</div>
      <div class="rc-foot mono"><span><span class="nat-tag">${htmlEscape(natTag)}</span> ${htmlEscape(p.nationality || '')}</span></div>
    </a>`;
  }).join('');

  const teamsCount = new Set(players.map(p => (p.team || '').split('·')[0].trim()).filter(Boolean)).size;
  const nationsCount = new Set(players.map(p => p.nationalityCode).filter(Boolean)).size;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Top Players 2026 — No Spoiler Cricket</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="shared.css"/>
<style>
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:36px;padding:34px 0 28px;border-bottom:2px dashed var(--rule)}
.hero h1{font-weight:900;font-size:clamp(56px,7vw,96px);line-height:.88;letter-spacing:-.045em;margin:0}
.hero h1 .a{color:var(--saffron)}
.hero h1 .b{color:var(--green)}
.hero .dev{font-family:var(--font-dev);font-size:16px;color:var(--saffron);font-weight:600;margin-top:6px}
.hero .lead{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-top:16px;max-width:62ch}
.hero aside{border-left:2px dashed var(--rule);padding-left:26px;display:grid;grid-template-columns:repeat(2,1fr);gap:16px 22px;align-content:start}
.hero .stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.hero .stat .v{font-weight:800;font-size:30px;letter-spacing:-.02em;margin-top:4px;line-height:1;color:var(--navy)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:24px;border-top:1px solid var(--rule)}
.rc{display:grid;grid-template-rows:auto auto auto auto auto auto auto;border-right:1px dashed var(--rule-soft);border-bottom:1px dashed var(--rule-soft);padding:16px;transition:background .08s;min-height:280px;color:inherit;gap:4px}
.rc:nth-child(4n){border-right:0}
.rc:hover{background:var(--paper-2)}
.rc-num{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;color:var(--saffron);font-weight:700;text-transform:uppercase;margin-bottom:10px}
.rc-photo{width:100%;aspect-ratio:1/1;background:var(--paper-2);margin-bottom:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid var(--rule-soft)}
.rc-photo img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(.15) contrast(1.02)}
.rc-photo .no-photo{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.rc-rank{font-family:var(--font-mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px}
.rc-name{font-weight:700;font-size:18px;letter-spacing:-.01em;line-height:1.1;margin-bottom:4px}
.rc-team{font-family:var(--font-mono);font-size:11px;color:var(--ink-2);letter-spacing:.04em;margin-bottom:8px;line-height:1.3;text-transform:uppercase}
.rc-tags{font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--ink-3);margin-bottom:10px}
.rc-foot{display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin-top:auto;padding-top:8px;border-top:1px dashed var(--rule-soft)}
.nat-tag{display:inline-block;background:var(--navy);color:#fff;padding:2px 6px;font-weight:700;letter-spacing:.12em;font-size:9.5px;margin-right:4px}
.rc.hidden{display:none}
@media (max-width:1100px){
  .grid{grid-template-columns:repeat(3,1fr)}
  .rc:nth-child(4n){border-right:1px dashed var(--rule-soft)}
  .rc:nth-child(3n){border-right:0}
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:2px dashed var(--rule);padding-top:20px}
}
@media (max-width:640px){
  .grid{grid-template-columns:repeat(2,1fr)}
  .rc:nth-child(3n){border-right:1px dashed var(--rule-soft)}
  .rc:nth-child(2n){border-right:0}
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
          Platform №&nbsp;<b>5</b><br/>
          <b>Players Index</b><br/>
          ${htmlEscape(updateStr.toUpperCase())}
        </div>
      </div>
      <nav class="platform">
        <a href="index.html"><span class="num">01</span>Fixtures</a>
        <a href="series/"><span class="num">02</span>Series</a>
        <a href="match/"><span class="num">03</span>Match Sheets</a>
        <a href="teams/"><span class="num">04</span>Teams</a>
        <a href="players.html" class="on"><span class="num">05</span>Players</a>
        <span class="spacer"></span>
        <span class="stamp mono">EN · हिंदी</span>
      </nav>
    </div>
  </header>

  <main class="frame">

    <section class="hero">
      <div>
        <div class="eyebrow">ICC International Rankings · 2026</div>
        <h1>Top <span class="a">Players</span><br/><span class="b">${players.length}</span> on file</h1>
        <div class="dev">शीर्ष खिलाड़ी · २०२६</div>
        <p class="lead">${players.length} cricketers across formats. Click through for each player's 2026 fixture program.</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Players</span><span class="v">${players.length}</span></div>
        <div class="stat"><span class="k">Nations</span><span class="v">${nationsCount}</span></div>
        <div class="stat"><span class="k">Teams</span><span class="v">${teamsCount}</span></div>
        <div class="stat"><span class="k">India</span><span class="v">${players.filter(p => p.nationalityCode === 'IN').length}</span></div>
      </aside>
    </section>

    <section class="toolbar" id="toolbar">
      <div class="toolbar-row">
        <span class="tb-label">Role</span>
        <button class="chip on" data-f="role" data-v="all">All</button>
        <button class="chip" data-f="role" data-v="batter">Batters</button>
        <button class="chip" data-f="role" data-v="bowler">Bowlers</button>
        <button class="chip" data-f="role" data-v="all-rounder">All-rounders</button>
        <button class="chip" data-f="role" data-v="wicket-keeper">Keepers</button>
        <span class="tb-label" style="margin-left:18px">Nation</span>
        <button class="chip on" data-f="nat" data-v="all">All</button>
        <button class="chip" data-f="nat" data-v="IN">India</button>
        <button class="chip" data-f="nat" data-v="AU">Australia</button>
        <button class="chip" data-f="nat" data-v="UK">England</button>
        <button class="chip" data-f="nat" data-v="PK">Pakistan</button>
        <button class="chip" data-f="nat" data-v="ZA">South Africa</button>
        <span class="showing"><b id="shown">${players.length}</b> of <b>${players.length}</b> players</span>
      </div>
    </section>

    <section class="grid" id="grid">${cards}</section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · Players Index</span>
        <span class="dev">धर्म · खेल · रोमांच</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>

  <script>
  (function(){
    const state = {role:'all', nat:'all'};
    const grid = document.getElementById('grid');
    const shown = document.getElementById('shown');
    document.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
      const f = btn.dataset.f, v = btn.dataset.v;
      state[f] = v;
      document.querySelectorAll('.chip[data-f="'+f+'"]').forEach(b => b.classList.toggle('on', b === btn));
      let n = 0;
      grid.querySelectorAll('.rc').forEach(card => {
        const roleMatch = state.role === 'all' || card.dataset.role === state.role;
        const natMatch = state.nat === 'all' || card.dataset.nat === state.nat;
        const match = roleMatch && natMatch;
        card.classList.toggle('hidden', !match);
        if (match) n++;
      });
      shown.textContent = n;
    }));
  })();
  </script>
</body>
</html>
`;
}

function main() {
  const data = JSON.parse(fs.readFileSync('./data/players.json', 'utf8'));
  const players = (data.players || []).slice().sort((a, b) => (a.ranking || 99) - (b.ranking || 99));
  const html = buildIndex(players, { lastUpdated: data.lastUpdated });
  fs.writeFileSync('./players.html', html);
  console.log(`✓ wrote players.html — ${players.length} players`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('node generate-players-index.js   # generates players.html');
  } else {
    main();
  }
}

export { buildIndex, main };
