// Fails if the first load (everything in dist/ except later worlds) is 3 MB or more (P1).
// Also fails if the offline cache (dist/sw.js) misses a built file, or if a built file points at
// another site (nothing loads from the network after the first visit; no trackers).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const BUDGET = 3 * 1000 * 1000; // 3 MB
const LATER = /^worlds\//; // later worlds load only when reached

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
for (const f of files) {
  const rel = relative(DIST, f).split(sep).join('/');
  const size = statSync(f).size;
  if (LATER.test(rel)) later += size;
  else first += size;
}

const kb = (n) => `${(n / 1000).toFixed(1)} KB`;
console.log(`First load: ${kb(first)} of ${kb(BUDGET)} budget (${files.length} files). Later worlds: ${kb(later)}.`);
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
  .filter((r) => /^assets\/.+\.js$/.test(r) && !page.includes(r));
if (lazy.length > 0) {
  const lazyBytes = lazy.reduce((n, r) => n + statSync(join(DIST, r)).size, 0);
  console.log(`Of that, loaded only when needed: ${kb(lazyBytes)} (${lazy.map((r) => `${r.replace(/^assets\//, '')} ${kb(statSync(join(DIST, r)).size)}`).join(', ')}). The page itself: ${kb(first - lazyBytes)}.`);
}
if (first >= BUDGET) {
  console.error('Over the 3 MB first-load budget.');
  process.exit(1);
}

// The offline cache lists every first-load file (sw.js itself and later worlds aside).
const rels = files.map((f) => relative(DIST, f).split(sep).join('/'));
let sw = '';
try {
  sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
} catch {
  console.error('No dist/sw.js: the offline cache is missing.');
  process.exit(1);
}
const missing = rels.filter((r) => r !== 'sw.js' && !LATER.test(r) && !r.endsWith('.map') && !sw.includes(`"./${r}"`));
if (missing.length > 0) {
  console.error(`The offline cache (sw.js) misses: ${missing.join(', ')}`);
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
console.log(`Offline cache lists all ${rels.length - 1} built files; no other site is named.`);
