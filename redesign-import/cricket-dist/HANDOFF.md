# No Spoiler Cricket — Handoff Prompt for Claude Code

## What this is
A design system + sample pages for **No Spoiler Cricket**, the cricket sibling of No Spoiler Cycling. The aesthetic is **"Fixtures Platform"**: Indian Railways departure-board × match ticket. Saffron / white / green tricolour, navy for authority, gold for live accents. Devanagari co-headlines where it earns its place.

## Files in this kit
- `shared.css` — design system (tokens, tricolour band, masthead, platform nav, `.fmt` format chips, `.tok` ticket squares, `.board` departure-hero, `.row` fixture row, Tweaks panel)
- `data.js` — sample data with the right shape: `MATCHES[]`, `TEST_MATCH`, `IPL_MATCH`. Field names: `id, dt, start, time, month, vs, vs_hi, series, fmt (test|odi|t20i|ipl|league|womens), disc (intl|franchise|domestic|women), gender, ven, rating, ovrs, cv, hot, final, tok, tokCol, slug`
- `fixtures.html` — calendar; **series-grouped by default**, toggle to date view; format/rating/team filters; departure-board hero pins the next ★★★★★ match
- `series-border-gavaskar.html` — sample **series landing** (5-Test bilateral tour): series arc strip, squads, storylines
- `match-test-delhi.html` — Test match sheet: 5-day rhythm, playing-XI watchlist, head-to-head
- `match-ipl-final.html` — IPL match sheet: favourites cards, toss schedule, past finals

## Why the page types are different from cycling
Cricket matches live **inside series**, not as isolated events. A flat calendar flattens the narrative ("is this the decider?"). So:
- **Fixtures** is the default landing — series-grouped
- **Series landing** is the page type cycling doesn't have (bilateral tours AND franchise tournaments)
- **Match sheet** has two variants: Test (5-day rhythm) vs. limited-overs (single-evening)

## What to build
1. Swap the sample `data.js` for the full cricket calendar. Preserve field names or adapt CSS selectors in `shared.css` — `.fmt.test`, `.fmt.ipl`, `.fmt.odi`, `.fmt.t20i`, `.fmt.womens`, `.fmt.league` are all styled.
2. Generate `series-{slug}.html` for every series using the Border–Gavaskar template. For franchise tournaments (IPL/BBL/PSL), extend that template with a points table + playoff bracket section (same visual language).
3. Generate `match-test-{slug}.html` for every Test using that template.
4. Generate `match-ipl-{slug}.html` / `match-odi-{slug}.html` / `match-t20i-{slug}.html` for limited-overs matches. They can share the IPL template with minor label swaps.
5. Build `teams.html` — one page per team/nation (IND, AUS, ENG, PAK, SA, NZ, WI, SL, BAN, AFG + IPL franchises). Use the masthead + platform nav from any existing page.
6. **Before shipping to GitHub Pages:** remove the `<div class="tweaks">` block and the `__edit_mode` / `TWEAK_DEFAULTS` script in every HTML file. Those are design-review only.

## Design rules to preserve
- **Fonts:** Inter Tight (sans) · JetBrains Mono (mono) · Noto Sans Devanagari (dev) — loaded from Google Fonts, no asset copies needed.
- **Colors:** use the CSS variables in `:root`. Never invent new colors.
- **Tricolour band:** always at the very top of `<body>`. One per page.
- **Wordmark:** `No/Spoiler` stays in ink + saffron slash; `Cricket` in navy.
- **Platform nav:** five sections — Fixtures · Series · Test Sheet · IPL Sheet · Teams. Each starts with a mono number (01–05). Active item is navy/white.
- **Devanagari:** subtitles on mastheads, month names (`MONTHS_HI`), team names on detail pages. Optional via the Devanagari Tweak — the site must still make sense with it off.
- **Format chips (`.fmt`):** always uppercase, always colored by format. TEST=red, ODI=navy, T20/T20I=saffron, IPL=green, LEAGUE=ink, WOMEN'S=outlined navy.
- **Star ratings:** same 5-star scale as cycling. ★★★★★ is rare, reserved for unmissable.
- **Section numbering (§ 01, § 02…):** keep it on every detail page — it's the "roadbook" DNA that ties the two sibling sites together.

## What NOT to do
- Don't add emoji.
- Don't invent new colors. Everything is in the CSS variables.
- Don't swap fonts. The typography IS the brand.
- Don't drop the Devanagari. Subtle, but it's what makes this specifically Indian.
- Don't use the cycling Roadbook layout verbatim for cricket — the series grouping is load-bearing.

## Sample directory layout
```
/
  index.html              → symlink or copy of fixtures.html
  fixtures.html
  shared.css
  data.js
  series/
    border-gavaskar-2026.html
    ipl-2026.html
    ashes-2026.html
    ...
  match/
    test-delhi-2026.html
    ipl-final-2026.html
    odi-lords-eng-sa.html
    ...
  teams/
    india.html
    australia.html
    mumbai-indians.html
    ...
```

## Live preview reference
Open `fixtures.html` first. Then `series-border-gavaskar.html` → `match-test-delhi.html` → `match-ipl-final.html`. These four cover the whole system.
