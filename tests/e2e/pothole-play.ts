/**
 * O5b: Pothole Hall played by the keys on the phone profile, by the plan in pothole-brain.ts
 * (shared by pothole-hall.spec.ts and pothole-perf.spec.ts).
 */
import type { Page } from '@playwright/test';
import type { Pad } from './hall-play';
import { decidePothole, POT_BOT, type PotJump } from './pothole-brain';

export interface Arena {
  pitX: number;
  lips: [number, number];
  carrying: boolean;
  bagReady: boolean;
  defeated: boolean;
  hits: number;
  phase: number;
  finishT: number;
  gulp: number;
}
export const potSnap = (page: Page) =>
  page.evaluate(() => {
    const g = window.__game!;
    const r = g.run;
    return { h: g.hero, a: g.arena as unknown as Arena | null, phase: r.phase, lives: r.lives, time: r.time, hazards: r.hazards, screen: g.screen, paused: g.paused, toast: g.toast };
  });

/** Plays the fight by the plan until the third bag (or game over). */
export async function playPothole(page: Page, pad: Pad, onPoll?: (s: Awaited<ReturnType<typeof potSnap>>) => Promise<void>): Promise<{ presses: number; lost: number; toasts: Set<string>; log: string[]; last: Awaited<ReturnType<typeof potSnap>> }> {
  let jump: PotJump | null = null;
  let stage = 0;
  let sawAir = false;
  let pressedAt = 0;
  let presses = 0;
  const toasts = new Set<string>();
  const log: string[] = [];
  let lastWhy = '';
  let s = await potSnap(page);
  let late = 0.06;
  const lives0 = s.lives;
  for (let i = 0; i < 20000; i++) {
    const t0 = s.time;
    s = await potSnap(page);
    // How late the plan acts: the time between two looks (a slow or busy phone looks less often).
    if (s.time > t0) late = Math.min(0.2, Math.max(0.04, late * 0.8 + (s.time - t0) * 0.2 * 1.5));
    if (s.toast) toasts.add(s.toast);
    if (onPoll) await onPoll(s);
    if (s.phase !== 'arena' || !s.a || s.a.defeated) break;
    if (s.paused || s.screen !== 'play') continue;
    const h = s.h;
    if (jump) {
      if (!h.grounded) sawAir = true;
      // Hold to the top; a crossing presses again there and holds to the next top.
      if (!h.grounded && h.vy >= -60) {
        if (stage === 0) {
          await pad.jumpUp();
          if (jump === 'cross') {
            await pad.jumpDown();
            presses++;
          }
          stage = 1;
        } else if (stage === 1 && jump === 'cross' && h.vy >= -60 && s.time - pressedAt > 0.45) {
          await pad.jumpUp();
          stage = 2;
        }
      }
      if ((sawAir && h.grounded) || (!sawAir && s.time - pressedAt > 0.5)) {
        await pad.jumpUp();
        jump = null;
      }
      continue;
    }
    const gravel = s.hazards.filter((z) => z.kind === 'gravel' && z.mode === 'move').map((z) => ({ x: z.x, vx: z.x < s.a!.pitX ? -80 : 80 }));
    const d = decidePothole({ hero: h, pitX: s.a.pitX, lips: s.a.lips, carrying: s.a.carrying, bagReady: s.a.bagReady, defeated: s.a.defeated, gravel, gulp: s.a.gulp >= 0 }, late);
    if (d.why !== lastWhy) log.push(`${s.time.toFixed(2)} s x ${h.x.toFixed(0)} lips ${s.a.lips.map(Math.round).join('-')}: ${d.why}`);
    lastWhy = d.why;
    await pad.move(d.move);
    if (d.jump) {
      await pad.jumpDown();
      presses++;
      jump = d.jump;
      stage = 0;
      sawAir = false;
      pressedAt = s.time;
    }
  }
  await pad.done();
  return { presses, lost: lives0 - s.lives, toasts, log, last: s };
}


/**
 * The same plan, run inside the page on every animation frame (keys sent as key events), for the
 * slowed frame-rate check: at 4x CPU the test's own looks come too late to play by. It stops once
 * he is beaten or the try is over; `window.__pilot` says how it ended.
 */
export async function startPilot(page: Page): Promise<void> {
  await page.evaluate(
    ({ src, bot }) => {
      const decide = new Function('POT_BOT', `return (${src});`)(bot) as typeof decidePothole;
      const w = window as unknown as { __pilot: { done: boolean; bags: number; lost: number } };
      const state = { done: false, bags: 0, lost: 0 };
      w.__pilot = state;
      const key = (code: string, down: boolean): void => {
        window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code === 'Space' ? ' ' : code, bubbles: true }));
      };
      let held: -1 | 0 | 1 = 0;
      const move = (d: -1 | 0 | 1): void => {
        if (d === held) return;
        if (held) key(held > 0 ? 'ArrowRight' : 'ArrowLeft', false);
        held = d;
        if (d) key(d > 0 ? 'ArrowRight' : 'ArrowLeft', true);
      };
      let jump: string | null = null;
      let stage = 0;
      let sawAir = false;
      let at = 0;
      let lives = -1;
      const frame = (): void => {
        const g = window.__game!;
        // Only the cheap looks (the hero and the fight's own snapshot), so the pilot costs little a frame.
        const a = g.arena as unknown as {
          pitX: number;
          lips: [number, number];
          carrying: boolean;
          bagReady: boolean;
          defeated: boolean;
          hits: number;
          gravel: { x: number; vx: number }[];
          gulp: number;
          lives: number;
          time: number;
          runPhase: string;
        } | null;
        const r = { phase: a?.runPhase, lives: a?.lives ?? 0, time: a?.time ?? 0 };
        if (!a || r.phase !== 'arena' || a.defeated) {
          move(0);
          if (jump) key('Space', false);
          state.done = true;
          state.bags = a?.hits ?? state.bags;
          return;
        }
        if (lives < 0) lives = r.lives;
        if (lives - r.lives !== state.lost) (state as unknown as { log: string[] }).log = [...((state as unknown as { log?: string[] }).log ?? []), `t ${r.time.toFixed(2)} x ${g.hero.x.toFixed(0)} y ${g.hero.y.toFixed(0)} lips ${a.lips.map(Math.round).join('-')} gravel ${a.gravel.map((z) => Math.round(z.x)).join(',')} jump ${jump} stage ${stage}`];
        state.lost = lives - r.lives;
        state.bags = a.hits;
        const h = g.hero;
        if (!g.paused && g.screen === 'play') {
          if (jump) {
            if (!h.grounded) sawAir = true;
            if (!h.grounded && h.vy >= -60) {
              if (stage === 0) {
                key('Space', false);
                if (jump === 'cross') key('Space', true);
                stage = 1;
              } else if (jump === 'cross' && stage === 1 && r.time - at > 0.45) {
                key('Space', false);
                stage = 2;
              }
            }
            if ((sawAir && h.grounded) || (!sawAir && r.time - at > 0.5)) {
              key('Space', false);
              jump = null;
            }
          } else {
            const d = decide({ hero: h, pitX: a.pitX, lips: a.lips, carrying: a.carrying, bagReady: a.bagReady, defeated: a.defeated, gravel: a.gravel, gulp: a.gulp >= 0 }, 0.02);
            move(d.move);
            if (d.jump) {
              key('Space', true);
              jump = d.jump;
              stage = 0;
              sawAir = false;
              at = r.time;
            }
          }
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    { src: decidePothole.toString(), bot: POT_BOT },
  );
}
