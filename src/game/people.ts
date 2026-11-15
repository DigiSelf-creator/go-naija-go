/**
 * People in the streets, the well room and the hall, hooked into the game (task S3g1b;
 * design.md "People everywhere" parts 3 to 6, 11 and 12). Game (game.ts) owns one of these: it
 * feeds it every step's events and calls its draw parts at the right places in the draw order.
 * It only reads the run: people never change the game (part 11), and switching them off
 * (`on = false`) gives the same run.
 */
import { folkFramesFor } from '../art/folkBake';
import { KEKE_RIDERS, OKADA_RIDERS, STORE_KEEPER, STORE_KEEPER_SPOT, endBusWindows } from '../art/folkCasts';
import type { FolkFrame, FolkLook } from '../art/folk';
import type { HeroLook } from '../art/hero';
import { ROOM } from '../art/wellRoom';
import type { View } from '../engine/view';
import { CastSheet, LayerSlot, drawBubbleAt, drawBusHeads, drawKekeHeads, drawOkadaBaked, drawWindowRow, screenRatio, type Rect } from './crowdDraw';
import { CROWD, FrameWatch, HallCrowd, RoomKeeper, STREET_OF, StreetCrowd, crowdSpots, hallCast, streetCast, type Bubble, type CrowdEvent, type CrowdLook, type CrowdView, type FolkDraw } from './crowd';
import type { Level } from './level';
import type { Run } from './run';

type G = CanvasRenderingContext2D;
export type CrowdSound = 'crowdCheer' | 'crowdCheerBig';

/** The okada passes every 25 s of play at 300 u/s on the far road (part 4). */
export const OKADA = { every: 25, speed: 300, firstAt: 6, scale: 0.55 } as const;

/** What the people need to know about the game now. */
export interface PeopleNow {
  level: Level;
  run: Run;
  look: HeroLook;
  camX: number;
  viewW: number;
  /** The street's look for the counts: tired, bright or fixed. */
  crowdLook: CrowdLook;
  still: boolean;
  clock: number;
  /** World units the picture is raised (Game.lift). */
  lift: number;
}

export class GamePeople {
  /** People on (tests turn them off to check that the run is the same). */
  on = true;
  street: StreetCrowd | null = null;
  hall: HallCrowd | null = null;
  readonly keeper = new RoomKeeper();
  readonly watch = new FrameWatch();
  /** Played by the screen (main.ts), within the crowd sound rules. */
  onSound: (name: CrowdSound) => void = () => {};
  private key = '';
  private looks: FolkLook[] = [];
  private hallLooks: FolkLook[] = [];
  private walkLooks = new Set<number>();
  private readonly streetSheet = new CastSheet((l, i) => this.streetFrames(l, i));
  private readonly hallSheet = new CastSheet(() => ['stand', 'walk0', 'walk1', 'walk2', 'walk3', 'cheer0', 'cheer1', 'clap0', 'clap1']);
  private readonly roomSheet = new CastSheet(() => ['sit', 'wave0', 'wave1', 'clap0', 'clap1']);
  /** The last list drawn (for tests and qa: nobody after the hero). */
  drawn: FolkDraw[] = [];
  /** People drawn on screen in the last frame (for the murmur). */
  seen = 0;
  /** The last bubble's box (world units), for qa. */
  bubbleBox: Rect | null = null;
  /** The parked buses' passengers, picked from the street's cast. */
  private busLooks: (FolkLook | undefined)[] = [];
  private passLooks: (FolkLook | undefined)[] = [];
  private startLooks: (FolkLook | undefined)[] = [];
  private endLooks: (FolkLook | undefined)[] = [];
  private endWin: { x: number; y: number; w: number; h: number }[] | null = null;
  private readonly slots = { pass: new LayerSlot(), start: new LayerSlot(), end: new LayerSlot(), keke: new LayerSlot(), okada: new LayerSlot() };
  /** The bus park bus's windows (worked out once per street). */
  private endWindows(n: PeopleNow): { x: number; y: number; w: number; h: number }[] {
    return (this.endWin ??= n.level.end ? endBusWindows(n.level.end.x, 0, n.level.groundY) : []);
  }
  /** Milliseconds the people took this frame so far, and the average over recent frames (part 11: at most 1.5 at 4x CPU). */
  private spent = 0;
  costMs = 0;
  costMax = 0;
  private frames = 0;

  /* Every part the game calls is timed (update and drawing), for qa's 1.5 ms check. */
  update(n: PeopleNow, dt: number, events: readonly CrowdEvent[]): void {
    if (!this.on) return;
    // Timed one step in 8 (and counted 8 times): reading the clock each step costs too.
    if (++this.steps % 8 !== 0) {
      this.updateNow(n, dt, events);
      return;
    }
    const t0 = performance.now();
    this.updateNow(n, dt, events);
    this.spent += (performance.now() - t0) * 8;
  }
  private steps = 0;

  drawOkada(g: G, view: View, n: PeopleNow): void {
    if (!this.on) return;
    const t0 = performance.now();
    this.drawOkadaNow(g, view, n);
    this.spent += performance.now() - t0;
  }

  drawBack(g: G, view: View, n: PeopleNow): void {
    if (!this.on) return;
    const t0 = performance.now();
    this.drawBackNow(g, view, n);
    this.spent += performance.now() - t0;
  }

  drawAt(g: G, which: 'stop' | 'park', n: PeopleNow, view: View): void {
    if (!this.on) return;
    const t0 = performance.now();
    this.drawAtNow(g, which, n, view);
    this.spent += performance.now() - t0;
  }

  drawStartBus(g: G, view: View, n: PeopleNow): void {
    if (!this.on) return;
    const t0 = performance.now();
    this.drawStartBusNow(g, view, n);
    this.spent += performance.now() - t0;
  }

  drawEndBus(g: G, view: View, n: PeopleNow, dx: number): void {
    if (!this.on) return;
    const t0 = performance.now();
    this.drawEndBusNow(g, view, n, dx);
    this.spent += performance.now() - t0;
  }

  drawRoom(g: G, view: View, n: PeopleNow): void {
    if (!this.on) return;
    const t0 = performance.now();
    this.drawRoomNow(g, view, n);
    this.spent += performance.now() - t0;
  }

  drawHall(g: G, view: View, n: PeopleNow, outside: boolean): void {
    if (!this.on) return;
    const t0 = performance.now();
    this.drawHallNow(g, view, n, outside);
    this.spent += performance.now() - t0;
  }

  drawBubble(g: G, view: View, n: PeopleNow, lift: number): void {
    if (!this.on) return;
    const t0 = performance.now();
    this.drawBubbleNow(g, view, n, lift);
    this.spent += performance.now() - t0;
  }

  /** The frame is drawn: keeps the running average of the people's time a frame. */
  endFrame(): void {
    const ms = this.spent;
    this.spent = 0;
    this.frames++;
    this.costMs += (ms - this.costMs) / Math.min(this.frames, 120);
    if (this.frames > 30) this.costMax = Math.max(this.costMax, ms);
  }
  resetCost(): void {
    this.costMs = this.costMax = 0;
    this.frames = 0;
  }

  private streetFrames(look: FolkLook, i: number): FolkFrame[] {
    const all = folkFramesFor(look);
    return this.walkLooks.has(i) ? all : all.filter((f) => !f.startsWith('walk'));
  }

  /** The street sheet's last bake (ms; qa: at most 40 on the slow phone profile). */
  get bakeMs(): number {
    return this.streetSheet.bakeMs;
  }

  /** A new run (Game.begin / reset): fresh people; backing off is forgotten. */
  restart(): void {
    this.key = '';
    this.street = null;
    this.hall = null;
    this.watch.reset();
    this.resetCost();
  }

  /** Makes the place's people when the place, its look or the player's look changed. */
  private ensure(n: PeopleNow): void {
    const { level } = n;
    const hk = `${n.look.skin},${n.look.hair},${n.look.outfit}`;
    const key = `${level.id}|${n.crowdLook}|${hk}`;
    if (key === this.key) return;
    this.key = key;
    this.street = null;
    this.hall = null;
    if (level.hall) {
      this.hallLooks = hallCast(n.look);
      this.hall = new HallCrowd(level.groundY);
      return;
    }
    const name = STREET_OF[level.id];
    if (!name || !level.manual) return;
    const cast = streetCast(name, n.look);
    this.looks = cast.looks;
    const plan = crowdSpots(level, n.crowdLook, cast.looks, cast.park);
    this.walkLooks = new Set(plan.walkers.map((w) => w.look));
    this.street = new StreetCrowd(plan, name, level.groundY, level);
    // 3 to 5 heads in a bus's windows: every skin tone across the street's cast.
    this.busLooks = [cast.looks[1], cast.looks[4], cast.looks[7], cast.looks[10], cast.looks[13]];
    this.passLooks = this.busLooks.slice(0, 4);
    this.startLooks = [this.busLooks[0], this.busLooks[2], this.busLooks[3], undefined];
    this.endLooks = [this.busLooks[0], undefined, this.busLooks[1], this.busLooks[2], this.busLooks[4]];
    this.endWin = null;
  }

  private updateNow(n: PeopleNow, dt: number, events: readonly CrowdEvent[]): void {
    if (!this.on) return;
    this.ensure(n);
    const run = n.run;
    const back = this.watch.level;
    this.keeper.still = n.still;
    this.keeper.update(dt, events, run.room?.room.groundY ?? 300);
    if (this.hall && run.boss) {
      this.hall.still = n.still;
      this.hall.backOff = back;
      const say = this.hall.update(dt, this.hallView(n), events);
      if (say.cheer) this.onSound(say.cheer);
      return;
    }
    const s = this.street;
    if (!s || run.below) return;
    s.still = n.still;
    s.backOff = back;
    const say = s.update(dt, this.streetView(n), events);
    if (say.cheer) this.onSound(say.cheer);
  }

  /** One view object, filled again each call (no garbage a frame). */
  private readonly sv: CrowdView = { camX: 0, viewW: 0, hero: { x: 0, vx: 0, grounded: true }, atBus: false, checkpointReached: false };
  private streetView(n: PeopleNow): CrowdView {
    const h = n.run.hero;
    const v = this.sv;
    v.camX = n.camX;
    v.viewW = n.viewW;
    v.hero.x = h.x;
    v.hero.vx = h.vx;
    v.hero.grounded = h.grounded;
    v.atBus = n.run.phase === 'bus' || n.run.phase === 'cleared';
    v.checkpointReached = n.run.checkpointReached;
    return v;
  }

  private hallView(n: PeopleNow): Parameters<HallCrowd['update']>[1] {
    const boss = n.run.boss!;
    return { hits: boss.hits, defeated: boss.defeated, finishT: boss.defeated ? boss.modeTime : 0, throws: boss.throws, camX: n.camX, viewW: n.viewW };
  }

  /** Feeds the frame time for backing off (part 11). */
  frame(ms: number): void {
    this.watch.frame(ms);
  }

  /* ------------------------------------------------------------ street drawing */

  /** Device px per world unit, and the sheet ready for it. */
  private ready(view: View): void {
    if (this.street) this.streetSheet.ready(this.looks, view.scale, this.key);
  }

  /** The passengers of the passing bus or keke (backdrop.ts riders), in its own transform. */
  riders(view: View, n: PeopleNow): ((g: G, x: number, kind: 'bus' | 'keke') => void) | undefined {
    if (!this.on || !this.street) return undefined;
    this.riderView = view;
    this.riderNow = n;
    return this.riderFn;
  }
  private riderView: View | null = null;
  private riderNow: PeopleNow | null = null;
  private readonly riderFn = (g: G, x: number, kind: 'bus' | 'keke'): void => {
    const view = this.riderView;
    const n = this.riderNow;
    if (!view || !n) return;
    const t0 = performance.now();
    this.ridersAt(g, view, n, x, kind, n.run.hero.x - n.camX, n.clock);
    this.spent += performance.now() - t0;
  };

  private ridersAt(g: G, view: View, n: PeopleNow, x: number, kind: 'bus' | 'keke', heroSx: number, t: number): void {
    const near = Math.abs(x - heroSx) < CROWD.waveNear;
    const wave = near && !n.still ? (((Math.floor(t / 0.25) % 2) + 1) as 1 | 2) : near ? 1 : 0;
    if (kind === 'bus') drawBusHeads(g, this.slots.pass, this.passLooks, wave, view.scale * 0.5, Math.sin(t * 14) * 0.6);
    else drawKekeHeads(g, this.slots.keke, KEKE_RIDERS, wave, view.scale * 0.55, t);
  }

  /** The okada on the far road (screen space, after the backdrop): every 25 s, both ways in turn. */
  private drawOkadaNow(g: G, view: View, n: PeopleNow): void {
    if (!this.on || !this.street || n.still || this.watch.level >= 1) return;
    const t = n.clock - OKADA.firstAt;
    if (t < 0) return;
    const k = Math.floor(t / OKADA.every);
    const u = t - k * OKADA.every;
    const W = view.width;
    const across = (W + 120) / OKADA.speed;
    if (u > across) return;
    const right = k % 2 === 0;
    const x = right ? -60 + u * OKADA.speed : W + 60 - u * OKADA.speed;
    g.save();
    g.translate(x, n.level.groundY - 24);
    g.scale(right ? OKADA.scale : -OKADA.scale, OKADA.scale);
    drawOkadaBaked(g, this.slots.okada, OKADA_RIDERS[0], OKADA_RIDERS[1], (Math.floor(u / 0.08) % 2) as 0 | 1, view.scale * OKADA.scale);
    g.restore();
  }

  /** The back pavement people (world space, before the road and everything the hero can touch). */
  private drawBackNow(g: G, view: View, n: PeopleNow): void {
    this.drawn = [];
    this.seen = 0;
    if (!this.on || !this.street) return;
    this.ready(view);
    const list = this.street.draw(this.streetView(n));
    this.drawn = list;
    this.seen = list.length;
    this.later = list;
    this.batch(g, view, n, null);
  }

  /**
   * Draws the street people of one layer in device pixels, each a 1:1 copy from the sheet (baked
   * at the screen's own scale) at whole pixels: no scaling and no smoothing work per person.
   */
  private batch(g: G, view: View, n: PeopleNow, which: 'stop' | 'park' | null): void {
    let set = false;
    const k = view.scale;
    for (const d of this.later) {
      if (this.layerOf(d, n) !== which) continue;
      if (!set) {
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        set = true;
      }
      this.streetSheet.drawDevice(g, d, (d.x - n.camX) * k, (d.y - n.lift) * k, k);
    }
    if (set) g.restore();
  }
  private later: FolkDraw[] = [];

  /** The people at the checkpoint bus stop (after its shelter) or the bus park (after its picture). */
  private drawAtNow(g: G, which: 'stop' | 'park', n: PeopleNow, view: View): void {
    if (!this.on || !this.street) return;
    this.batch(g, view, n, which);
  }

  private layerOf(d: FolkDraw, n: PeopleNow): 'stop' | 'park' | null {
    const L = n.level;
    if (Math.abs(d.x - (L.checkpoint + 50)) < 60 && d.y === L.groundY - CROWD.feetUp) return 'stop';
    if (L.end && d.x > L.end.x - 200) return 'park';
    return null;
  }

  /** Heads in the start fence's parked bus (after the fence). */
  private drawStartBusNow(g: G, view: View, n: PeopleNow): void {
    if (!this.on || !this.street) return;
    const fx = n.level.startWall;
    if (fx + 120 < n.camX || fx - 40 > n.camX + n.viewW) return;
    const near = Math.abs(n.run.hero.x - (fx + 64)) < CROWD.waveNear;
    const wave = near ? (n.still ? 1 : (((Math.floor(n.clock / 0.25) % 2) + 1) as 1 | 2)) : 0;
    g.save();
    g.translate(fx + 64, n.level.groundY - 18);
    g.scale(0.72, 0.72);
    drawBusHeads(g, this.slots.start, this.startLooks, wave, view.scale * 0.72);
    g.restore();
  }

  /** Heads in the bus at the bus park (after drawEndBus): they cheer, then wave the bus off. */
  private drawEndBusNow(g: G, view: View, n: PeopleNow, dx: number): void {
    if (!this.on || !this.street || !n.level.end) return;
    const s = this.street;
    const wave = s.busCheer || n.run.phase === 'bus' ? (n.still ? 1 : (((Math.floor(n.clock / 0.2) % 2) + 1) as 1 | 2)) : 0;
    drawWindowRow(g, this.slots.end, this.endWindows(n), this.endLooks, wave, view.scale);
    void dx;
  }

  /* ------------------------------------------------------------ the well room and the hall */

  private drawRoomNow(g: G, view: View, n: PeopleNow): void {
    this.drawn = [];
    if (!this.on) return;
    const room = n.run.room?.room;
    if (!room) return;
    this.roomSheet.ready([STORE_KEEPER], view.scale, 'keeper');
    const d: FolkDraw = { look: 0, frame: this.keeper.frame(), x: STORE_KEEPER_SPOT.x, y: room.groundY - CROWD.feetUp, flip: false, size: 1 };
    this.roomSheet.draw(g, d);
    this.drawn = [d];
    this.seen = 1;
    // Life above: a soft shadow of feet crossing a ceiling light hole every 6 s.
    const sh = this.keeper.shadow();
    if (sh) {
      const hx = sh.hole === 0 ? ROOM.arriveX : ROOM.exitX;
      g.save();
      g.beginPath();
      g.ellipse(hx, ROOM.beamY - 14, 14, 3, 0, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = 'rgba(40,24,12,0.45)';
      g.beginPath();
      g.ellipse(hx - 22 + sh.k * 44, ROOM.beamY - 14, 6, 2.6, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }

  /** The hall's people: those at the door and walking in (before the boss and the hero). */
  private drawHallNow(g: G, view: View, n: PeopleNow, outside: boolean): void {
    if (!outside) this.drawn = [];
    if (!this.on || !this.hall || !n.run.boss) return;
    this.hallSheet.ready(this.hallLooks, view.scale, `hall|${this.key}`);
    const list = outside ? this.later : this.hall.draw(this.hallView(n));
    if (!outside) {
      this.later = list;
      this.drawn = list;
      this.seen = list.length;
    }
    for (const d of list) {
      const out = d.x < 0 || d.x > 566;
      if (out === outside) this.hallSheet.draw(g, d);
    }
  }

  /* ------------------------------------------------------------ the one bubble */

  /** The bubble now (street, room or hall), if any. */
  private bubbleNow(n: PeopleNow): Bubble | null {
    if (n.run.below) return this.keeper.bubble;
    if (this.hall) return this.hall.bubble;
    return this.street?.bubble ?? null;
  }

  /**
   * Draws the one bubble (world space, last), unless it would cover the hero, a hazard, a coin,
   * a food, a throw, the HUD or the buttons (part 6).
   */
  private drawBubbleNow(g: G, view: View, n: PeopleNow, lift: number): void {
    this.bubbleBox = null;
    if (!this.on) return;
    const b = this.bubbleNow(n);
    if (!b) return;
    const run = n.run;
    const h = run.hero;
    const avoid: Rect[] = [
      { x: h.x - 18, y: h.y - 62, w: 36, h: 66 },
      // The HUD row and the hit counter at the top; the buttons strip at the bottom.
      { x: n.camX - 1000, y: lift - 1000, w: n.viewW + 2000, h: 1000 + 78 + view.safe.top },
      { x: n.camX - 1000, y: 352, w: n.viewW + 2000, h: 1000 },
    ];
    const L = n.camX - 40;
    const R = n.camX + n.viewW + 40;
    for (const z of run.hazards) if (z.mode !== 'gone' && z.x > L && z.x < R) avoid.push({ x: z.x - 24, y: z.y - 12, w: 48, h: 60 });
    for (const c of run.room?.coins ?? run.coins) if (!c.taken && c.x > L && c.x < R) avoid.push({ x: c.x - 12, y: c.y - 12, w: 24, h: 24 });
    for (const f of run.foods) if (!f.taken && f.x > L && f.x < R) avoid.push({ x: f.x - 16, y: f.y - 16, w: 32, h: 32 });
    for (const th of run.boss?.throws ?? []) avoid.push({ x: th.x - 30, y: th.y - 30, w: 60, h: 60 });
    this.bubbleBox = drawBubbleAt(g, b, view.scale, avoid, screenRatio());
  }
}
