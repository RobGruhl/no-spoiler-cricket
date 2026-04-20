#!/usr/bin/env node

/**
 * Per-match / per-series detail pages.
 * Output: match-details/<slug>.html
 *
 * Two layout shapes, auto-selected:
 *   - single-match / single bilateral T20I → "match sheet"
 *   - test-series / odi-series / franchise-league / icc-tournament → "manual"
 *     with a matches-within-series table if `matches[]` exists.
 */

import fs from 'fs';
import path from 'path';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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

function fmtDateRange(startYmd, endYmd) {
  const s = parseUTC(startYmd);
  if (!s) return '';
  const e = parseUTC(endYmd);
  if (!e || +e === +s) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} ${s.getUTCFullYear()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()} ${e.getUTCFullYear()}`;
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()} ${e.getUTCFullYear()}`;
}

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

const FORMAT_LABEL = {
  'test-series': 'TEST SERIES',
  'odi-series': 'ODI SERIES',
  't20i-series': 'T20I SERIES',
  'single-match': 'MATCH',
  'franchise-league': 'FRANCHISE',
  'icc-tournament': 'ICC TOURNAMENT',
};

const PRESTIGE_LABEL = {
  'ashes': 'THE ASHES',
  'border-gavaskar': 'BORDER-GAVASKAR',
  'pataudi-trophy': 'PATAUDI / de MELLO',
  'world-cup': 'WORLD CUP',
  't20-world-cup': 'T20 WORLD CUP',
  'champions-trophy': 'CHAMPIONS TROPHY',
  'wtc-final': 'WTC FINAL',
  'ipl-final': 'IPL FINAL',
  'india-pakistan': 'IND vs PAK',
};

const GEO_LABEL = {
  IN: { flag: '🇮🇳', name: 'India' },
  US: { flag: '🇺🇸', name: 'United States' },
  UK: { flag: '🇬🇧', name: 'United Kingdom' },
  AU: { flag: '🇦🇺', name: 'Australia' },
  NZ: { flag: '🇳🇿', name: 'New Zealand' },
  ZA: { flag: '🇿🇦', name: 'South Africa' },
  PK: { flag: '🇵🇰', name: 'Pakistan' },
  BD: { flag: '🇧🇩', name: 'Bangladesh' },
  INTL: { flag: '🌐', name: 'International' },
};
const PRIMARY_GEO_ORDER = ['IN', 'US', 'UK', 'AU', 'PK', 'NZ', 'ZA', 'BD', 'INTL'];

function prestigeBadgeHtml(m) {
  const p = (m.prestige || [])[0];
  if (!p) return '';
  const label = PRESTIGE_LABEL[p] || p.toUpperCase();
  if (p === 'ashes') return `<span class="code" style="background:var(--icc-blue);color:#fff;border-color:var(--icc-blue)">${label}</span>`;
  if (p === 'ipl-final') return `<span class="code ind">${label}</span>`;
  if (p.includes('world-cup') || p === 'champions-trophy') return `<span class="code gt">${label}</span>`;
  if (p === 'india-pakistan') return `<span class="code sig">${label}</span>`;
  return `<span class="code sig">${label}</span>`;
}

function renderWatchSection(match) {
  const geos = match.broadcast?.geos || {};
  const entries = PRIMARY_GEO_ORDER
    .filter(g => geos[g]?.primary)
    .concat(Object.keys(geos).filter(g => !PRIMARY_GEO_ORDER.includes(g) && geos[g]?.primary));
  const ytChannels = match.broadcast?.youtubeChannels || [];

  if (!entries.length && !ytChannels.length) {
    return `<section class="section">
      <div class="eyebrow">§ Watch</div>
      <h2>Where to watch <span class="placeholder">TBD</span></h2>
      <p class="prose">Broadcast details not yet confirmed.</p>
    </section>`;
  }

  const rows = entries.map(g => {
    const geo = GEO_LABEL[g] || { flag: '🌍', name: g };
    const p = geos[g].primary;
    const alts = geos[g].alternatives || [];
    const typeTag = p.subscription ? '$' : 'free';
    const coverageTag = (p.coverage || 'live').toUpperCase();
    const cta = p.url
      ? `<a class="watch-cta" href="${htmlEscape(p.url)}" target="_blank" rel="noopener">Watch →</a>`
      : `<span class="watch-cta disabled">${p.type === 'none' ? 'not telecast' : 'no link'}</span>`;
    const altsHtml = alts.length
      ? `<div class="w-alts">${alts.map(a => {
          const aTag = a.subscription ? '$' : 'free';
          const aCover = (a.coverage || '').toUpperCase();
          const aCta = a.url
            ? `<a href="${htmlEscape(a.url)}" target="_blank" rel="noopener">${htmlEscape(a.broadcaster)} →</a>`
            : `<span>${htmlEscape(a.broadcaster)}</span>`;
          return `<span class="w-alt">${aCta}<span class="w-altmeta mono">${aCover}${aTag ? ' · ' + aTag : ''}</span></span>`;
        }).join('')}</div>` : '';
    return `<div class="wrow">
      <div class="w-geo"><span class="w-flag">${geo.flag}</span><span class="w-name">${htmlEscape(geo.name)}</span></div>
      <div class="w-bc">
        <div class="w-bc-name">${htmlEscape(p.broadcaster || 'TBD')}</div>
        <div class="w-bc-meta mono">${htmlEscape(p.type || '')} · ${coverageTag} · ${typeTag}</div>
        ${p.notes ? `<div class="w-bc-notes">${htmlEscape(p.notes)}</div>` : ''}
        ${altsHtml}
      </div>
      <div class="w-cta">${cta}</div>
    </div>`;
  }).join('');

  const ytHtml = ytChannels.length ? `<div class="w-yt mono">
    <span class="w-yt-lbl">YouTube</span>
    ${ytChannels.map(c => {
      const url = c.handle ? `https://www.youtube.com/${encodeURIComponent(c.handle)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(c.channel || '')}`;
      return `<a href="${htmlEscape(url)}" target="_blank" rel="noopener">${htmlEscape(c.handle || c.channel)}${c.contentType ? ' · ' + htmlEscape(c.contentType) : ''}</a>`;
    }).join('<span class="sep">·</span>')}
  </div>` : '';

  return `<section class="section watch">
    <div class="eyebrow">§ Watch</div>
    <h2>Where to watch</h2>
    <div class="wtable">${rows}</div>
    ${ytHtml}
    <p class="prose" style="margin-top:10px;font-size:12px;letter-spacing:.04em">⚠️ Spoiler warning: live streams and broadcaster home pages often show current scores. Disable autoplay &amp; avoid sidebar recommendations on YouTube.</p>
  </section>`;
}

function renderMatchesList(match) {
  if (!Array.isArray(match.matches) || !match.matches.length) return '';
  const rows = match.matches.map(mm => {
    const typeCode = (mm.matchType || '').toUpperCase() || 'MATCH';
    return `<div class="mrow">
      <div class="c first"><span class="mn">${mm.matchNumber ?? '—'}</span></div>
      <div class="c lbl mono">${htmlEscape(typeCode)}</div>
      <div class="c dt mono">${htmlEscape(fmtShortDate(mm.date))}</div>
      <div class="c nm">${htmlEscape(mm.name || '')}</div>
      <div class="c vn mono">${htmlEscape(mm.venue || '')}</div>
    </div>`;
  }).join('');
  return `<section class="section">
    <div class="eyebrow">§ 02 — Fixtures</div>
    <h2>Match-by-match</h2>
    <div class="mlist">${rows}</div>
  </section>`;
}

function renderStorylines(match) {
  const stories = match.matchDetails?.storylines || [];
  if (!stories.length) return '';
  return `<section class="section">
    <div class="eyebrow">§ 04 — Storylines</div>
    <h2>Narratives to watch</h2>
    <ul class="narratives">${stories.map(s => `<li>${htmlEscape(s)}</li>`).join('')}</ul>
  </section>`;
}

function renderHistorical(match) {
  const h = match.matchDetails?.historicalContext;
  if (!h) return '';
  return `<section class="section">
    <div class="eyebrow">§ 05 — Historical Context</div>
    <h2>Form book &amp; lore</h2>
    <p class="prose">${htmlEscape(h)}</p>
  </section>`;
}

function renderViewing(match) {
  const w = match.matchDetails?.watchNotes;
  if (!w) return '';
  return `<section class="section">
    <div class="eyebrow">§ 06 — Viewing Notes</div>
    <h2>When to tune in</h2>
    <p class="prose">${htmlEscape(w)}</p>
  </section>`;
}

function renderFranchisesGrid(match, iplTeams) {
  if (match.id !== 'ipl-2026' || !iplTeams || !iplTeams.length) return '';
  const cards = iplTeams.map(t => `
    <a class="fcard" style="--team-color:${t.primaryColor}" href="../ipl/${htmlEscape(t.slug)}.html">
      <div class="fcard-ab">${htmlEscape(t.abbr)}</div>
      <div class="fcard-nm">${htmlEscape(t.name)}</div>
      <div class="fcard-cp mono">Captain · ${htmlEscape(t.captain || '—')}</div>
      <div class="fcard-hv mono">${htmlEscape(t.homeVenueShort || t.homeVenue)}</div>
    </a>`).join('');
  return `<section class="section">
    <div class="eyebrow">§ Franchises</div>
    <h2>The ten teams</h2>
    <p class="prose" style="font-size:13px">Each franchise has its own hub page with squad, marquee watch, and full team info. <a href="../ipl.html" style="border-bottom:1px solid var(--ink);font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase">View IPL league hub →</a></p>
    <div class="fgrid">${cards}</div>
  </section>`;
}

function renderPlayersToWatch(match, allPlayers) {
  let list = [];
  if (match.topPlayers && match.topPlayers.length) {
    list = match.topPlayers;
  } else if (Array.isArray(allPlayers)) {
    // Derive from players.json: prefer players whose nationality matches participating teams
    const teams = match.teams || [];
    const nationalityMap = { IND: 'IN', AUS: 'AU', ENG: 'UK', PAK: 'PK', NZL: 'NZ', RSA: 'ZA', BAN: 'BD' };
    const wantCodes = new Set(teams.map(t => nationalityMap[t] || t));
    list = allPlayers
      .filter(p => wantCodes.has(p.nationalityCode))
      .sort((a, b) => (a.ranking || 99) - (b.ranking || 99))
      .slice(0, 6);
  }
  if (!list.length) return '';
  return `<section class="section">
    <div class="eyebrow">§ 03 — Players to watch</div>
    <h2>Who to watch</h2>
    <div class="fav">${list.map((p, i) => {
      const [surname, given] = (p.name || '').split(' ');
      const display = given ? `${given.charAt(0)}. ${surname.charAt(0) + surname.slice(1).toLowerCase()}` : (p.name || '');
      const role = p.role || (p.specialties || [])[0] || '';
      return `<a class="card" href="../players/${htmlEscape(p.slug || p.id)}.html">
        <div class="no">№ ${String(i + 1).padStart(2, '0')}${role ? ' · ' + role.toUpperCase() : ''}</div>
        <div class="nm">${htmlEscape(display)}</div>
        <div class="tm">${htmlEscape(p.team || '')}</div>
        <div class="ft"><span>${p.ranking ? '#' + p.ranking : ''}</span><span class="st">${(p.specialties || []).slice(0, 2).join(' · ')}</span></div>
      </a>`;
    }).join('')}</div>
  </section>`;
}

function pageScaffold({ title, docCode, navOn, crumbs, body, footerSection }) {
  const built = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:16px 0;border-bottom:1px solid var(--rule-soft)}
.crumbs a{color:var(--ink-3);border-bottom:1px solid transparent}
.crumbs a:hover{color:var(--ink);border-bottom-color:var(--ink)}
.crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.hero{display:grid;grid-template-columns:1.5fr 1fr;gap:48px;padding:40px 0 32px;border-bottom:3px solid var(--ink);position:relative}
.hero .tag{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:12px;align-items:center;margin-bottom:18px;flex-wrap:wrap}
.hero h1{font-family:var(--font-sans);font-weight:800;font-size:clamp(48px,6vw,92px);line-height:.88;letter-spacing:-.04em;margin:0}
.hero h1 .em{font-style:italic;font-weight:500;color:var(--signal)}
.hero .sub{font-family:var(--font-mono);font-size:13px;letter-spacing:.06em;color:var(--ink-2);margin-top:18px;max-width:62ch;line-height:1.5}
.hero aside{border-left:1px solid var(--rule);padding-left:28px;display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;align-content:start}
.stat{display:block}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-family:var(--font-sans);font-weight:700;font-size:32px;letter-spacing:-.02em;line-height:1;margin-top:4px}
.stat .v.sm{font-size:18px;line-height:1.15}
.stat .v.mono{font-family:var(--font-mono);font-weight:600;letter-spacing:-.01em}
.section{padding:28px 0;border-bottom:1px solid var(--rule-soft)}
.section h2{font-family:var(--font-sans);font-weight:700;font-size:22px;letter-spacing:-.01em;margin:0 0 6px}
.section .eyebrow{margin-bottom:4px}
.placeholder{display:inline-block;border:1px dashed var(--ink-3);padding:2px 8px;font-family:var(--font-mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);margin-left:10px;vertical-align:middle;border-radius:2px}
.section.watch{background:linear-gradient(180deg, rgba(181,44,35,.04), transparent 70%)}
.wtable{display:grid;grid-template-columns:1fr;border-top:1px solid var(--rule);margin-top:14px}
.wrow{display:grid;grid-template-columns:200px 1fr 120px;gap:0;padding:16px 0;border-bottom:1px solid var(--rule-soft);align-items:center}
.wrow .w-geo{display:flex;align-items:center;gap:10px;padding:0 10px 0 0}
.wrow .w-flag{font-size:24px;line-height:1}
.wrow .w-name{font-family:var(--font-sans);font-weight:600;font-size:14px;letter-spacing:-.005em}
.wrow .w-bc{padding:0 16px;min-width:0}
.wrow .w-bc-name{font-family:var(--font-sans);font-weight:600;font-size:15px;letter-spacing:-.005em;line-height:1.2}
.wrow .w-bc-meta{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-top:4px}
.wrow .w-bc-notes{font-family:var(--font-sans);font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.4}
.wrow .w-alts{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px 14px;font-family:var(--font-mono);font-size:11px}
.wrow .w-alt{display:flex;align-items:center;gap:6px;color:var(--ink-2)}
.wrow .w-alt a{border-bottom:1px solid var(--rule-soft);color:var(--ink)}
.wrow .w-alt a:hover{border-bottom-color:var(--ink)}
.wrow .w-altmeta{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.wrow .w-cta{text-align:right}
.watch-cta{display:inline-flex;align-items:center;padding:10px 16px;background:var(--ink);color:var(--paper);font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;border:1px solid var(--ink);line-height:1;transition:background .12s,color .12s}
.watch-cta:hover{background:var(--signal);border-color:var(--signal);color:#fff}
.watch-cta.disabled{background:transparent;color:var(--ink-3);border-color:var(--rule-soft);cursor:default}
.w-yt{margin-top:18px;padding:14px;border:1px dashed var(--rule);display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:11.5px;letter-spacing:.08em}
.w-yt-lbl{font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);margin-right:6px}
.w-yt a{border-bottom:1px solid var(--rule-soft);color:var(--ink)}
.w-yt a:hover{border-bottom-color:var(--ink)}
.w-yt .sep{color:var(--rule-soft);margin:0 4px}
.mlist{display:grid;grid-template-columns:1fr;margin-top:14px;border-top:1px solid var(--rule)}
.mrow{display:grid;grid-template-columns:60px 70px 120px 1.5fr 1fr;gap:0;padding:12px 0;border-bottom:1px solid var(--rule-soft);align-items:center}
.mrow .c{padding:0 10px;min-width:0}
.mrow .c.first{padding-left:0}
.mrow .mn{font-family:var(--font-sans);font-weight:800;font-size:22px;letter-spacing:-.03em}
.mrow .lbl{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-2)}
.mrow .dt{font-size:12px}
.mrow .nm{font-family:var(--font-sans);font-weight:600;font-size:14px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrow .vn{font-size:11px;color:var(--ink-3);letter-spacing:.04em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrow:hover{background:var(--paper-2)}
.fgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:0;margin-top:16px;border-top:1px solid var(--rule)}
.fcard{padding:16px;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft);position:relative;display:grid;gap:6px;color:inherit;min-height:130px;transition:background .08s}
.fcard:nth-child(5n){border-right:0}
.fcard:hover{background:var(--paper-2)}
.fcard::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--team-color,var(--ink))}
.fcard .fcard-ab{font-family:var(--font-sans);font-weight:800;font-size:24px;color:var(--team-color,var(--ink));letter-spacing:-.02em;padding-left:10px;line-height:1}
.fcard .fcard-nm{font-family:var(--font-sans);font-weight:600;font-size:13.5px;line-height:1.2;padding-left:10px;letter-spacing:-.005em}
.fcard .fcard-cp{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.08em;color:var(--ink-2);padding-left:10px;text-transform:uppercase}
.fcard .fcard-hv{font-size:10.5px;letter-spacing:.12em;color:var(--ink-3);padding-left:10px;text-transform:uppercase;margin-top:auto}
@media (max-width:960px){
  .fgrid{grid-template-columns:repeat(2,1fr)}
  .fcard:nth-child(5n){border-right:1px solid var(--rule-soft)}
  .fcard:nth-child(2n){border-right:0}
}
.narratives{margin-top:10px;padding:0;list-style:none}
.narratives li{font-family:var(--font-sans);font-size:15px;line-height:1.55;color:var(--ink-2);margin:8px 0;padding-left:18px;position:relative}
.narratives li::before{content:"§";position:absolute;left:0;color:var(--ink-3);font-family:var(--font-mono);font-weight:600}
.prose{font-family:var(--font-sans);font-size:15px;line-height:1.6;color:var(--ink-2);margin:10px 0;max-width:72ch}
.fav{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--rule);margin-top:14px}
.fav .card{padding:18px;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft);display:grid;grid-template-rows:auto auto auto auto;gap:6px;color:inherit}
.fav .card:nth-child(3n){border-right:0}
.fav .card:hover{background:var(--paper-2)}
.fav .card .no{font-family:var(--font-mono);font-size:11px;letter-spacing:.18em;color:var(--ink-3)}
.fav .card .nm{font-family:var(--font-sans);font-weight:700;font-size:20px;letter-spacing:-.015em}
.fav .card .tm{font-family:var(--font-mono);font-size:12px;color:var(--ink-2);letter-spacing:.04em}
.fav .card .ft{display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase}
.fav .card .ft .st{color:var(--ink)}
@media (max-width:1100px){
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:1px solid var(--rule);padding-top:20px}
  .fav{grid-template-columns:1fr}
  .mrow{grid-template-columns:44px 60px 1fr}
  .mrow .c.dt,.mrow .c.vn{display:none}
  .wrow{grid-template-columns:1fr;gap:10px;padding:14px 10px}
  .wrow .w-cta{text-align:left}
}
</style>
</head>
<body>
  <div class="tricolour thick"></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div class="wordmark">No<span class="slash">/</span>Spoiler Cricket
          <span class="sub">Match Sheet · Season MMXXVI</span>
        </div>
        <div class="mast-meta">
          Document <b>${htmlEscape(docCode)}</b><br/>
          Built <b>${built}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="../index.html"${navOn==='cal'?' class="on"':''}>01 — Fixtures</a>
        <a href="../players.html"${navOn==='players'?' class="on"':''}>02 — Players</a>
        <a href="../ipl.html"${navOn==='ipl'?' class="on"':''}>03 — IPL</a>
        <span class="spacer"></span>
        <span class="edition mono">§ Match Sheet</span>
      </nav>
    </div>
  </header>

  <main class="frame">
    <div class="crumbs">${crumbs}</div>
    ${body}
    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cricket · 2026 Fixtures</span>
        <span>${htmlEscape(footerSection)}</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

function renderMatchPage(match, allPlayers, iplTeams) {
  const fmtLabel = FORMAT_LABEL[match.format] || match.format.toUpperCase();
  const dateLabel = fmtDateRange(match.startDate, match.endDate);
  const teamsLabel = (match.teams || []).filter(t => t !== 'INTL').join(' vs ') || 'International field';
  const matchCount = Array.isArray(match.matches) ? match.matches.length : 0;
  const conditions = (match.conditions || []).map(c => c.replace('-', ' ').toUpperCase()).join(' · ');
  const coverage = match.broadcast?.geos?.IN?.primary?.broadcaster
    || match.broadcast?.geos?.US?.primary?.broadcaster
    || match.broadcast?.geos?.UK?.primary?.broadcaster
    || 'TBD';

  // Split name for hero typography
  const titleParts = match.name.split(/[—–\(]/);
  const heroH1 = titleParts.length >= 2
    ? `${htmlEscape(titleParts[0].trim())}<br/><span class="em">${htmlEscape(titleParts.slice(1).join(' ').replace(/\)$/, '').trim())}</span>`
    : htmlEscape(match.name);

  const body = `
    <section class="hero">
      <div>
        <div class="tag">
          <span class="code inv">${fmtLabel}</span>
          ${prestigeBadgeHtml(match)}
          <span>${'★'.repeat(match.rating || 0)}</span>
          <span>${htmlEscape(dateLabel)}</span>
        </div>
        <h1>${heroH1}</h1>
        <p class="sub">${htmlEscape(match.matchDetails?.summary || match.description || '')}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Teams</span><span class="v sm">${htmlEscape(teamsLabel)}</span></div>
        <div class="stat"><span class="k">Venue</span><span class="v sm">${htmlEscape(match.venue || '—')}</span></div>
        <div class="stat"><span class="k">${match.format === 'test-series' ? 'Tests' : matchCount ? 'Matches' : 'Dates'}</span><span class="v mono">${matchCount || '—'}</span></div>
        <div class="stat"><span class="k">Conditions</span><span class="v sm">${htmlEscape(conditions || '—')}</span></div>
        <div class="stat"><span class="k">IN Coverage</span><span class="v sm">${htmlEscape(coverage)}</span></div>
        <div class="stat"><span class="k">Rating</span><span class="v">${match.rating || '—'}★</span></div>
      </aside>
    </section>

    ${renderWatchSection(match)}
    ${renderFranchisesGrid(match, iplTeams)}
    ${renderMatchesList(match)}
    ${renderPlayersToWatch(match, allPlayers)}
    ${renderStorylines(match)}
    ${renderHistorical(match)}
    ${renderViewing(match)}
  `;

  return pageScaffold({
    title: `${match.name} — No Spoiler Cricket`,
    docCode: `NSC/${match.id.toUpperCase().slice(0, 14)}`,
    navOn: 'cal',
    crumbs: `<a href="../index.html">Fixtures</a><span class="sep">/</span>${MONTH_NAMES[(parseUTC(match.startDate) || new Date()).getUTCMonth()]} ${(parseUTC(match.startDate) || new Date()).getUTCFullYear()}<span class="sep">/</span>${htmlEscape(match.name)}`,
    body,
    footerSection: `§ Match Sheet · ${match.name}`,
  });
}

function loadIplTeams() {
  try { return JSON.parse(fs.readFileSync('./data/ipl-teams.json', 'utf8')).teams || []; } catch { return []; }
}

function generateAll(dataPath = './data/match-data.json', playersPath = './data/players.json', outDir = './match-details') {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let allPlayers = [];
  try { allPlayers = JSON.parse(fs.readFileSync(playersPath, 'utf8')).players || []; } catch {}
  const iplTeams = loadIplTeams();
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (const m of data.matches) {
    if (!m.id) continue;
    const filepath = path.join(outDir, `${m.id}.html`);
    fs.writeFileSync(filepath, renderMatchPage(m, allPlayers, iplTeams));
    n++;
  }
  console.log(`✓ generated ${n} match/series sheets`);
}

function generateOne(matchId) {
  const data = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8'));
  const match = data.matches.find(m => m.id === matchId);
  if (!match) { console.error(`❌ match not found: ${matchId}`); process.exit(1); }
  let allPlayers = [];
  try { allPlayers = JSON.parse(fs.readFileSync('./data/players.json', 'utf8')).players || []; } catch {}
  const iplTeams = loadIplTeams();
  const outDir = './match-details';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filepath = path.join(outDir, `${match.id}.html`);
  fs.writeFileSync(filepath, renderMatchPage(match, allPlayers, iplTeams));
  console.log(`✓ ${filepath}`);
}

const args = process.argv.slice(2);
if (args.includes('--all')) {
  generateAll();
} else if (args.includes('--match') && args.length >= 2) {
  generateOne(args[args.indexOf('--match') + 1]);
} else if (args.includes('--help')) {
  console.log(`Match Details Generator

Usage:
  node generate-match-details.js --all             Generate all fixtures
  node generate-match-details.js --match <id>      Generate one
  node generate-match-details.js --help

Output: match-details/<match-id>.html
`);
} else {
  console.log('No arguments provided. Use --help.');
}

export { renderMatchPage, generateAll };
