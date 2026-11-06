// Fails if the first load (everything in dist/ except later worlds) is 3 MB or more.
import { readdirSync, statSync } from 'node:fs';
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
if (first >= BUDGET) {
  console.error('Over the 3 MB first-load budget.');
  process.exit(1);
}
