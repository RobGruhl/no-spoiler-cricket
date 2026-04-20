#!/usr/bin/env node

// Meta-refresh redirects for old URLs that were live on GitHub Pages
// before the IA migration. Each stub is a minimal HTML file with an
// instant redirect + canonical link to the new URL.
//
// Old → new mapping:
//   /match-details/<slug>.html → /series/<slug>.html
//   /ipl.html                  → /series/ipl-2026.html
//   /ipl/<slug>.html           → /teams/<slug>.html

import fs from 'fs';

function redirectStub(newPath, label) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Moved — No Spoiler Cricket</title>
<link rel="canonical" href="${newPath}"/>
<meta http-equiv="refresh" content="0; url=${newPath}"/>
<style>body{font-family:system-ui,sans-serif;padding:40px;max-width:560px;margin:0 auto;color:#14110f;background:#fffdf6}a{color:#0a2447}</style>
</head>
<body>
<p>This page has moved.</p>
<p>Redirecting to <a href="${newPath}">${label || newPath}</a>…</p>
</body>
</html>
`;
}

function main() {
  const matchData = JSON.parse(fs.readFileSync('./data/match-data.json', 'utf8'));
  const iplData = JSON.parse(fs.readFileSync('./data/ipl-teams.json', 'utf8'));

  let n = 0;

  // /match-details/<slug>.html → /series/<slug>.html
  for (const m of matchData.matches || []) {
    if (!m.id) continue;
    const out = `./match-details/${m.id}.html`;
    fs.writeFileSync(out, redirectStub(`../series/${m.id}.html`, m.name));
    n++;
  }
  console.log(`✓ ${n} /match-details redirects`);

  // /ipl.html → /series/ipl-2026.html
  fs.writeFileSync('./ipl.html', redirectStub('series/ipl-2026.html', 'Indian Premier League 2026'));
  console.log(`✓ /ipl.html redirect`);

  // /ipl/<slug>.html → /teams/<slug>.html
  if (fs.existsSync('./ipl')) {
    for (const t of iplData.teams || []) {
      const out = `./ipl/${t.slug}.html`;
      fs.writeFileSync(out, redirectStub(`../teams/${t.slug}.html`, t.name));
    }
    console.log(`✓ ${iplData.teams.length} /ipl/<slug> redirects`);
  }
}

main();
