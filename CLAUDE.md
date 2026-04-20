# No Spoiler Cricket

**Mission**: Spoiler-safe cricket fixtures and direct watch links for the 2026 season. Match-level detail pages with clickable broadcaster URLs per geo (India first).

Based on the layout of `~/Projects/no-spoiler-cycling` — the UCI Roadbook paper/ink aesthetic ported for cricket.

## Formats covered

- **Test** — 5-day series (e.g. Border-Gavaskar, Ashes, India vs England)
- **ODI** — 50-over bilateral series
- **T20I** — 20-over bilateral series
- **Franchise leagues** — IPL, The Hundred, BBL, PSL, SA20, ILT20, CPL, MLC
- **ICC tournaments** — World Cup, T20 World Cup, Champions Trophy, World Test Championship

## Data pipeline

Canonical data lives in `data/*.json`. HTML generators read it and emit static pages.

```
npm run build      # rebuilds index + all match/series + player pages
```

Or individually:

```
node generate-page.js                      # calendar → index.html
node generate-match-details.js --all       # per-match sheets → match-details/
node generate-match-details.js --match <id>
node generate-players-index.js             # → players.html
node generate-player-details.js --all      # per-player → players/<slug>.html
```

## Data files

- `data/match-data.json` — fixtures and series
- `data/players.json` — top players with ICC rankings
- `data/broadcasters.json` — reference for where each geo watches

## Spoiler safety

- Do not include results, scorecards, or winner info anywhere.
- Where-to-watch blocks carry a reminder to disable autoplay and avoid sidebars on YouTube.
- Historical context about *prior* editions is OK (e.g. "Australia have held the Border-Gavaskar since 2023") — but keep it about prior cycles, never the current fixture.

## Schema notes

### Match / series

```
{
  "id": "ind-vs-aus-bgt-2026",
  "name": "Border-Gavaskar Trophy (IND vs AUS)",
  "format": "test-series",           // test-series | odi-series | t20i-series | franchise-league | icc-tournament | single-match
  "teams": ["IND", "AUS"],           // ICC country codes
  "venue": "Australia",
  "startDate": "2026-11-20",
  "endDate": "2026-12-28",
  "rating": 5,                        // 1–5
  "prestige": ["border-gavaskar"],   // border-gavaskar | ashes | india-pakistan | world-cup | t20-world-cup | champions-trophy | wtc-final | ipl-final
  "conditions": ["bouncy","pace-friendly"],  // pace-friendly | spin-friendly | batting | swinging | bouncy | flat | day-night | pink-ball
  "matches": [                        // for series/tournaments — the constituent matches
    { "matchNumber": 1, "name": "1st Test", "date": "2026-11-20", "venue": "Perth", "matchType": "test" },
    ...
  ],
  "broadcast": {
    "geos": {
      "IN": { "primary": { "broadcaster": "...", "url": "...", "type": "streaming", "coverage": "live", "subscription": true } }
    },
    "youtubeChannels": [{ "channel": "...", "handle": "@icc", "contentType": "highlights" }]
  },
  "matchDetails": {
    "summary": "...",
    "storylines": [...],
    "playersToWatch": [...],
    "historicalContext": "...",
    "watchNotes": "..."
  },
  "topPlayers": [                    // subset of players.json for the favourites panel
    { "id": "rohit-sharma", "name": "SHARMA Rohit", "team": "India", "ranking": 1, ... }
  ]
}
```

### Player

```
{
  "id": "rohit-sharma",
  "slug": "rohit-sharma",
  "name": "SHARMA Rohit",            // SURNAME First
  "team": "India · Mumbai Indians",  // national · franchise
  "role": "batter",                   // batter | bowler | all-rounder | wicket-keeper
  "specialties": ["opener","captain","limited-overs"],
  "ranking": 1,                       // composite (or format-specific ICC rank)
  "nationality": "India",
  "nationalityCode": "IN",
  "dateOfBirth": "1987-04-30",
  "photoUrl": "players/photos/rohit-sharma.jpg"
}
```

## Geos for broadcast priority

`IN · US · UK · AU · NZ · ZA · PK · BD · INTL`

India first because the target audience is Indian-descent US viewers who also care about Willow TV / Hotstar USA availability.
