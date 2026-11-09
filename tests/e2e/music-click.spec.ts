/**
 * No clicks in the music (S2.9). Renders a few seconds of the street loop through the real
 * Music class (src/engine/music.ts, as written, not a copy) into an OfflineAudioContext and
 * looks at every pair of neighbouring samples. A click is one sample far away from the one
 * before it: a jump much bigger than the music's own loud moments.
 *
 * Guards the 19b8cf7 fix: a new GainNode starts at gain 1, and when a note began between two
 * samples one sample went out at full volume before the envelope took hold, a tick on many
 * shaker hits. Chromium only (it renders the same way every time there).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import ts from 'typescript';

const ROOT = join(import.meta.dirname, '..', '..');

/** A source file as an ES module the page can import; its own imports point at the route below. */
function moduleJs(file: string): string {
  const src = readFileSync(join(ROOT, file), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  return js.replace(/from '\.\.\/art\/tunes'/g, "from './tunes.js'").replace(/from '\.\/audio-unlock'/g, "from './audio-unlock.js'");
}

/**
 * A single-sample jump this many times the music's typical loud moment is a click. With the
 * fix the biggest jump is under 3x (the bright shaker hiss); before it, 17x to 41x.
 */
const CLICK_RATIO = 10;

test('music: the street loop rendered offline has no single-sample clicks', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Chromium only');
  test.setTimeout(60_000);
  const files: Record<string, string> = {
    'music.js': moduleJs('src/engine/music.ts'),
    'tunes.js': moduleJs('src/art/tunes.ts'),
    'audio-unlock.js': moduleJs('src/engine/audio-unlock.ts'),
    'blank.html': '<!doctype html><title>music</title>',
  };
  await page.route('**/__music-test/*', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!;
    const body = files[name];
    if (body === undefined) return route.fulfill({ status: 404 });
    return route.fulfill({ body, contentType: name.endsWith('.html') ? 'text/html' : 'text/javascript' });
  });
  await page.goto('./__music-test/blank.html');

  const r = await page.evaluate(async (ratio) => {
    const { Music, stepSeconds } = (await import('./music.js' as string)) as typeof import('../../src/engine/music');
    const { TUNES } = (await import('./tunes.js' as string)) as typeof import('../../src/art/tunes');
    const SR = 44100;
    const tune = TUNES.street;
    // The first bars of the street loop: shaker, drum, bass and tune all play in them.
    const secs = Math.min(8, tune.bars * 16 * stepSeconds(tune, 0));
    const oac = new OfflineAudioContext(1, Math.ceil(SR * secs), SR);
    // The scheduler reads currentTime, which stands at 0 before rendering: move it by hand,
    // one 25 ms timer tick at a time, as the real timer would while the music plays.
    let now = 0;
    const ac = new Proxy(oac, {
      get(t, k) {
        if (k === 'currentTime') return now;
        if (k === 'state') return 'running';
        const v = Reflect.get(t, k) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
      },
    }) as unknown as AudioContext;
    let tick = (): void => {};
    const music = new Music({
      setInterval: (f) => {
        tick = f;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval: () => {},
    });
    music.attach(ac);
    music.play('street', 0);
    for (now = 0; now < secs; now += 0.025) tick();
    const x = (await oac.startRendering()).getChannelData(0);

    // Typical loud moment: the median of the peaks of each 50 ms window that has sound.
    const win = Math.round(SR * 0.05);
    const peaks: number[] = [];
    for (let a = 0; a + win <= x.length; a += win) {
      let m = 0;
      for (let i = a; i < a + win; i++) m = Math.max(m, Math.abs(x[i]!));
      if (m > 1e-4) peaks.push(m);
    }
    peaks.sort((a, b) => a - b);
    const typical = peaks[peaks.length >> 1] ?? 0;
    let jump = 0;
    let at = 0;
    let loudest = 0;
    for (let i = 1; i < x.length; i++) {
      const d = Math.abs(x[i]! - x[i - 1]!);
      if (d > jump) {
        jump = d;
        at = i;
      }
      loudest = Math.max(loudest, Math.abs(x[i]!));
    }
    // How many samples jump past the click line (a tick on many notes shows many).
    let clicks = 0;
    for (let i = 1; i < x.length; i++) if (Math.abs(x[i]! - x[i - 1]!) > typical * ratio) clicks++;
    return { secs, typical, jump, at: at / SR, loudest, clicks, windows: peaks.length };
  }, CLICK_RATIO);
  console.log(
    `street music offline, ${r.secs.toFixed(1)} s: typical peak ${r.typical.toFixed(4)}, biggest one-sample jump ${r.jump.toFixed(4)} ` +
      `(${(r.jump / r.typical).toFixed(2)}x) at ${r.at.toFixed(3)} s, loudest ${r.loudest.toFixed(4)}, jumps over ${CLICK_RATIO}x: ${r.clicks}`,
  );
  expect(r.windows, 'the music made sound').toBeGreaterThan(20);
  expect(r.loudest, 'no clipping').toBeLessThan(1);
  expect(r.jump / r.typical, `biggest one-sample jump at ${r.at.toFixed(3)} s, against the typical peak`).toBeLessThan(CLICK_RATIO);
});
