# No Spoiler Cricket

Spoiler-safe 2026 cricket calendar with direct watch links. Built as a static
site — no JavaScript framework, just node generators that emit HTML from
hand-curated JSON.

## Quick start

```bash
npm run build
open index.html
```

## What's in the box

- `index.html` — 2026 cricket fixtures calendar (filterable by format, team, prestige, rating)
- `players.html` + `players/<slug>.html` — top players index with announced programs
- `ipl.html` + `ipl/<slug>.html` — **IPL 2026 hub** with all 10 franchises, format rules, per-region broadcast, and per-team pages (captain, marquee watch, squad, home venue)
- `match-details/<slug>.html` — per-match/series briefing sheets (IPL sheet includes a franchise grid)

## Focus: IPL 2026

The marquee league is the Indian Premier League — mid-season right now (20 Mar → 24 May 2026). The IPL hub surfaces:

- All ten franchises (CSK, MI, RCB, KKR, DC, GT, RR, SRH, LSG, PBKS) with 2026 captains, home venues, and marquee-watch players
- Format & rules (two groups of five, 14 league matches each, Impact Player rule retained for 2026)
- Where to watch by region — India (JioHotstar / Star Sports), US (Willow TV), UK (Sky Sports), AU (Fox/Kayo), Canada, UAE, SEA, South Africa
- Pre-tournament storylines — RCB defending, Cameron Green's record KKR buy, Dhoni's possible farewell, Pant/Iyer captaincy swaps, Samson to CSK, Suryavanshi's second year

## Data pipeline

Canonical data lives in `data/*.json`:

- `data/match-data.json` — fixtures and series
- `data/players.json` — top players with ICC rankings + IPL franchise links
- `data/ipl-teams.json` — IPL 2026 franchise detail (captains, venues, squads, colors)

HTML generators read it and emit static pages:

```bash
npm run build      # rebuilds everything

# or individually:
node generate-page.js                      # calendar → index.html
node generate-match-details.js --all       # per-match sheets → match-details/
node generate-players-index.js             # → players.html
node generate-player-details.js --all      # per-player → players/<slug>.html
node generate-ipl-teams.js                 # → ipl.html + ipl/<slug>.html
```

## Research

The `research/` folder contains Perplexity-sourced research notes that seeded
the IPL 2026 data (captains, squads, broadcast deals, pre-tournament
storylines). The research script lives in
`~/Projects/hello-perplexity/tmp/ipl-2026-research.js`.

## Spoiler safety

- No results, scorecards, or standings anywhere.
- Pre-tournament storylines and historical context (prior editions) are fine.
- Where-to-watch blocks include a reminder to disable autoplay and skip YouTube sidebars.

See `CLAUDE.md` for the schema reference. Every HTML page is generated from
the JSON — no manual editing.
