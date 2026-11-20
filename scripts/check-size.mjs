// Fails if the first load (everything in dist/ except later worlds) is 3 MB or more (P1), or if a
// later state's lazy part (dist/worlds/<id>/) is over its gzip budget (O1b1: Ogun, 150 KB).
// Also fails if the offline cache (dist/sw.js) misses a built file, or if a built file points at
// another site (nothing loads from the network after the first visit; no trackers).
// qa O2: the debug art galleries (?gallery=…) are built into dist/assets/debug/; they are not in
// the first load or the first-visit cache, and the check fails if any gallery chunk is.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const BUDGET = 3 * 1000 * 1000; // 3 MB
const LATER = /^worlds\//; // later worlds load only when reached
const DEBUG = /^assets\/debug\//; // debug galleries: fetched only by ?gallery= on the test link
const SITE_PAGES = /^privacy\.html$/; // ST3: the store privacy page (decision 56), on the site but not in the game

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error('No dist/ folder. Run npm run build first.');
  process.exit(1);
}

let first = 0;
let later = 0;
let debug = 0;
for (const f of files) {
  const rel = relative(DIST, f).split(sep).join('/');
  const size = statSync(f).size;
  if (LATER.test(rel)) later += size;
  else if (DEBUG.test(rel)) debug += size;
  else if (!SITE_PAGES.test(rel)) first += size;
}

const kb = (n) => `${(n / 1000).toFixed(1)} KB`;
console.log(`First load: ${kb(first)} of ${kb(BUDGET)} budget (${files.length} files). Later worlds: ${kb(later)}. Debug galleries (not cached): ${kb(debug)}.`);
// For information (the budget above counts them): script chunks the page itself does not name
// load only when needed (the moving intro, the art gallery); the offline cache still holds them.
let page = '';
try {
  page = readFileSync(join(DIST, 'index.html'), 'utf8');
} catch {
  /* reported below as a missing cache entry */
}
const lazy = files
  .map((f) => relative(DIST, f).split(sep).join('/'))
  .filter((r) => /^assets\/.+\.js$/.test(r) && !DEBUG.test(r) && !page.includes(r));
if (lazy.length > 0) {
  const lazyBytes = lazy.reduce((n, r) => n + statSync(join(DIST, r)).size, 0);
  console.log(`Of that, loaded only when needed: ${kb(lazyBytes)} (${lazy.map((r) => `${r.replace(/^assets\//, '')} ${kb(statSync(join(DIST, r)).size)}`).join(', ')}). The page itself: ${kb(first - lazyBytes)}.`);
}
if (first >= BUDGET) {
  console.error('Over the 3 MB first-load budget.');
  process.exit(1);
}

// O1b1 (docs/ogun.md 9.1): one line for each later state's part, gzipped as a phone downloads it.
const WORLD_BUDGETS = { ogun: 150 * 1000 };
const gz = (r) => gzipSync(readFileSync(join(DIST, r)), { level: 9 }).length;
let overWorld = false;
for (const [id, budget] of Object.entries(WORLD_BUDGETS)) {
  const mine = files.map((f) => relative(DIST, f).split(sep).join('/')).filter((r) => r.startsWith(`worlds/${id}/`) && !r.endsWith('.map'));
  const name = id[0].toUpperCase() + id.slice(1);
  if (mine.length === 0) {
    console.error(`${name} part: missing (no dist/worlds/${id}/).`);
    overWorld = true;
    continue;
  }
  const size = mine.reduce((n, r) => n + gz(r), 0);
  console.log(`${name} part: ${kb(size)} gzip of ${kb(budget)} budget (${mine.length} files, dist/worlds/${id}/).`);
  if (size > budget) {
    console.error(`The ${name} part is over its ${kb(budget)} gzip budget.`);
    overWorld = true;
  }
}
if (overWorld) process.exit(1);

// The offline cache lists every first-load file (sw.js itself and later worlds aside).
const rels = files.map((f) => relative(DIST, f).split(sep).join('/'));
let sw = '';
try {
  sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
} catch {
  console.error('No dist/sw.js: the offline cache is missing.');
  process.exit(1);
}
const missing = rels.filter((r) => r !== 'sw.js' && !SITE_PAGES.test(r) && !LATER.test(r) && !DEBUG.test(r) && !r.endsWith('.map') && !sw.includes(`"./${r}"`));
if (missing.length > 0) {
  console.error(`The offline cache (sw.js) misses: ${missing.join(', ')}`);
  process.exit(1);
}
// qa O2: no debug gallery in the first-visit list (every web player would download it), and every
// gallery chunk is built into assets/debug/ (so none slips into assets/ and the cache).
const precache = JSON.parse(/const PRECACHE = (\[[^\]]*\]);/.exec(sw)?.[1] ?? 'null');
if (!Array.isArray(precache)) {
  console.error('The offline cache (sw.js) has no PRECACHE list.');
  process.exit(1);
}
const cachedGalleries = precache.filter((u) => DEBUG.test(u.replace(/^\.\//, '')) || /galler(y|ies)/i.test(u));
const strayGalleries = rels.filter((r) => /galler(y|ies)[^/]*\.js$/i.test(r) && !DEBUG.test(r));
// ST3: the privacy page is a site page, never part of the game's first-visit download.
const cachedPages = precache.filter((u) => SITE_PAGES.test(u.replace(/^\.\//, '')));
if (cachedPages.length > 0) {
  console.error(`Site pages in the first-visit cache: ${cachedPages.join(', ')}`);
  process.exit(1);
}
if (!rels.includes('privacy.html')) {
  console.error('No dist/privacy.html: the store privacy page (decision 56) is missing.');
  process.exit(1);
}
if (cachedGalleries.length > 0 || strayGalleries.length > 0) {
  console.error(`Debug galleries in the first-visit cache: ${[...cachedGalleries, ...strayGalleries].join(', ')}`);
  process.exit(1);
}
const debugFiles = rels.filter((r) => DEBUG.test(r));
if (debugFiles.length > 0 && !debugFiles.some((r) => /galleries/.test(r))) {
  console.error('No debug gallery loader (assets/debug/galleries-*.js) was built.');
  process.exit(1);
}
// O1b1: a later state's files are never named by the page (so never fetched before asked for),
// and the service worker knows them (so an update keeps a state the player already has).
const worldFiles = rels.filter((r) => LATER.test(r) && !r.endsWith('.map'));
const early = worldFiles.filter((r) => page.includes(r));
if (early.length > 0) {
  console.error(`The page loads later-state files at once: ${early.join(', ')}`);
  process.exit(1);
}
const unknown = worldFiles.filter((r) => !sw.includes(`"./${r}"`));
if (unknown.length > 0) {
  console.error(`The service worker does not know these later-state files: ${unknown.join(', ')}`);
  process.exit(1);
}

// No built page, script, style or manifest names another site. XML namespace names are not
// loads (the browser never fetches them).
const NAMESPACES = new Set(['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink', 'http://www.w3.org/1999/xhtml']);
const outside = [];
for (const r of rels.filter((x) => /\.(html|js|mjs|css|webmanifest|json|svg)$/.test(x))) {
  const text = readFileSync(join(DIST, r), 'utf8');
  for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>\\]+/gi)) {
    if (!NAMESPACES.has(m[0])) outside.push(`${r}: ${m[0]}`);
  }
}
if (outside.length > 0) {
  console.error(`Built files point at other sites (nothing may load from the network):\n  ${outside.join('\n  ')}`);
  process.exit(1);
}
const sitePages = rels.filter((r) => SITE_PAGES.test(r)).length;
console.log(`Offline cache lists all ${rels.length - 1 - debugFiles.length - sitePages} built files (debug galleries aside: ${debugFiles.length}, none cached; site pages not in the game: ${sitePages}); no other site is named.`);
