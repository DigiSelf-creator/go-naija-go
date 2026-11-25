/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Files the service worker must NOT fetch on install. Later worlds load only when reached.
 * ST3: privacy.html is the store listing's privacy page (decision 56), a plain page on this site
 * that the game never opens, so a player never downloads it with the game.
 */
const PRECACHE_SKIP = [/^sw\.js$/, /\.map$/, /^worlds\//, /^assets\/debug\//, /^privacy\.html$/];

/**
 * qa O2: the debug art galleries (?gallery=…, src/art/galleries.ts and the gallery*.ts files it
 * opens). They and whatever only they import are built into dist/assets/debug/, outside the first-visit
 * cache: a player never downloads them, and the test link still fetches them when asked.
 */
const DEBUG_ROOT = /[\\/]src[\\/]art[\\/]galler(y[^\\/]*|ies)\.ts$/;

/** Modules the game itself never reaches (only the debug galleries do); filled at the end of each build. */
const debugOnly = new Set<string>();

/** Finds the modules reachable from the page without passing through a debug gallery. */
function debugModules(): Plugin {
  return {
    name: 'gidi-debug-modules',
    apply: 'build',
    buildEnd() {
      debugOnly.clear();
      const ids = [...this.getModuleIds()];
      const game = new Set<string>();
      const todo = ids.filter((id) => this.getModuleInfo(id)?.isEntry);
      while (todo.length > 0) {
        const id = todo.pop()!;
        if (game.has(id) || DEBUG_ROOT.test(id)) continue;
        game.add(id);
        const info = this.getModuleInfo(id);
        if (info) todo.push(...info.importedIds, ...info.dynamicallyImportedIds);
      }
      for (const id of ids) if (!game.has(id)) debugOnly.add(id);
    },
  };
}

/** True when every module in a chunk is debug only (a gallery, or art only galleries draw). */
function isDebugChunk(moduleIds: readonly string[]): boolean {
  return moduleIds.length > 0 && moduleIds.every((m) => debugOnly.has(m));
}

/**
 * O1b2: art that only a later state shows, though it lives in src/art/ (art's galleries import it
 * too, which would otherwise make it a shared chunk in the first-visit cache).
 */
const WORLD_ART: Readonly<Record<string, RegExp>> = { ogun: /[\\/]src[\\/]art[\\/]ogunGate\.ts$/ };

/** The later state a source file belongs to (src/worlds/<id>/... or its WORLD_ART), or null. */
function worldOf(file: string | null | undefined): string | null {
  const m = file ? /[\\/]src[\\/]worlds[\\/]([a-z0-9-]+)[\\/]/.exec(file) ?? /^src\/worlds\/([a-z0-9-]+)\//.exec(file) : null;
  if (m) return m[1]!;
  for (const [id, re] of Object.entries(WORLD_ART)) if (file && re.test(file)) return id;
  return null;
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * Writes dist/sw.js from src/sw/sw.js after the build, filling in the list of
 * built files and a version hash. Paths are relative, so it works under any
 * GitHub Pages sub-path.
 */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'gidi-service-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(root, config.build.outDir);
    },
    closeBundle() {
      const hash = createHash('sha256');
      const files = listFiles(outDir)
        .map((f) => relative(outDir, f).split(sep).join('/'))
        .filter((f) => !PRECACHE_SKIP.some((re) => re.test(f)))
        .sort();
      for (const f of files) {
        hash.update(f);
        hash.update(readFileSync(join(outDir, f)));
      }
      const urls = ['./', ...files.filter((f) => f !== 'index.html').map((f) => `./${f}`), './index.html'];
      // O1b1: each later state's files, so an update can carry a part the player already has.
      const worlds: Record<string, string[]> = {};
      for (const f of listFiles(outDir).map((x) => relative(outDir, x).split(sep).join('/'))) {
        const m = /^worlds\/([^/]+)\//.exec(f);
        if (!m || f.endsWith('.map')) continue;
        hash.update(f);
        hash.update(readFileSync(join(outDir, f)));
        (worlds[m[1]!] ??= []).push(`./${f}`);
      }
      const template = readFileSync(resolve(root, 'src/sw/sw.js'), 'utf8');
      const out = template
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__PRECACHE__', JSON.stringify(urls))
        .replace('__WORLDS__', JSON.stringify(worlds));
      writeFileSync(join(outDir, 'sw.js'), out);
    },
  };
}

// `vite build --mode app` (npm run app:sync) builds the store app (ST1a): the same game into dist,
// with no service worker (the app carries its files) and with the app-only code in src/native.
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
    rollupOptions: {
      output: {
        // O1b1: a later state's part (src/worlds/<id>/ and what only it imports) is built into
        // dist/worlds/<id>/, outside the first load and the first-visit cache.
        chunkFileNames: (chunk) => {
          if (isDebugChunk(chunk.moduleIds)) return 'assets/debug/[name]-[hash].js';
          const id = worldOf(chunk.facadeModuleId) ?? worldOf(chunk.moduleIds.find((m) => worldOf(m)) ?? null);
          // K3b: a part's own art shared with the debug galleries (src/worlds/kano/galleryArt.ts) is
          // game code: named "art" so it is never taken for a gallery chunk (check-size).
          const name = /galler(y|ies)/i.test(chunk.name) ? 'art' : '[name]';
          return id ? `worlds/${id}/${name}-[hash].js` : 'assets/[name]-[hash].js';
        },
        assetFileNames: (asset) => {
          const id = (asset.originalFileNames ?? []).map((f) => worldOf(f)).find(Boolean);
          return id ? `worlds/${id}/[name]-[hash][extname]` : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  plugins: mode === 'app' ? [debugModules()] : [debugModules(), serviceWorker()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
}));
