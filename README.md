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
- `match-details/<slug>.html` — per-match/series briefing sheets
- `players.html` + `players/<slug>.html` — top players index with announced programs

## Seed data

`data/match-data.json` ships with a representative sample of marquee 2026
cricket fixtures — ICC T20 World Cup, IPL, Border-Gavaskar Trophy, Ashes tail,
bilateral series featuring India, major franchise leagues. Expand as the real
calendar firms up.

Any placeholder values are marked in the UI. Replace with real data as it
becomes available.

## Roll-your-own

See `CLAUDE.md` for the schema reference. Every HTML page is generated from
the JSON — no manual editing.
