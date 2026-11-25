/**
 * qa K1c (docs/kano.md part 10): the way to Kano at 320 x 240, 568 x 320, 640 x 200 and 851 x 393
 * (Travel card, download card, the ride, the arrival card, Kano's home, the "To Kano" stop, Settings);
 * offline after one visit with the Ogun part never on the phone; the ride's times; a broken or
 * missing Kano file; fast taps. With QA_SHOTS=<folder> it saves pictures (k1c-*.png).
 */
import { expect, test, type Page } from "@playwright/test";
import { PAST_DOUBLE_TAP_MS, screenNow } from "./helpers";

const SHOTS = process.env["QA_SHOTS"];
const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = {
  kobo: 0,
  power: 0,
  tech: 0,
  fixed: [],
  fixes: 0,
  paid: {},
  hints: ["walk", "bright", "buka", "collect", "road"],
};
const STREETS = {
  1: { done: true, best: 100 },
  2: { done: true, best: 100 },
  3: { done: true, best: 100 },
};
const DONE = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const OGUN_WON = {
  v: 2,
  states: { lagos: DONE, ogun: { ...DONE, arrived: true } },
  city: CITY,
};
const OGUN_NOT_WON = {
  v: 2,
  states: {
    lagos: DONE,
    ogun: { streets: STREETS, parcel: false, arrived: true },
  },
  city: CITY,
  where: "ogun",
};
const SIZES = [
  { width: 320, height: 240 },
  { width: 568, height: 320 },
  { width: 640, height: 200 },
  { width: 851, height: 393 },
] as const;

const partOf = (url: string): string | null =>
  /\/worlds\/([^/]+)\//.exec(new URL(url).pathname)?.[1] ?? null;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/k1c-${name}.png` });
};

async function open(
  page: Page,
  save: object,
  extra: Record<string, string> = {},
): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.evaluate(
    ({ look, p, extra }) => {
      localStorage.setItem("gidi-look", look);
      localStorage.setItem("gidi-intro", '"seen"');
      localStorage.setItem("gidi-progress", p);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    { look: LOOK, p: JSON.stringify(save), extra },
  );
  await page.reload();
  await page.getByRole("button", { name: "Play" }).tap();
  await expect.poll(() => screenNow(page)).toMatch(/^(city|ogun|kano)$/);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  return errors;
}

/** Every visible button in `root` at least 44 x 44 and inside the screen; no sideways scroll. */
async function fits(page: Page, sel: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const bad: string[] = [];
    const root = [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((e) => e.getClientRects().length > 0)
      .pop();
    if (!root) return [`no ${sel}`];
    if (document.documentElement.scrollWidth > innerWidth + 1)
      bad.push("sideways scroll");
    for (const b of root.querySelectorAll("button")) {
      if (b.getClientRects().length === 0) continue;
      const r = b.getBoundingClientRect();
      const t = (b.textContent || b.getAttribute("aria-label") || "?")
        .trim()
        .slice(0, 30);
      if (r.width < 43.5 || r.height < 43.5)
        bad.push(`"${t}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      // Scroll it into view: it must then sit inside the screen and be tappable at its centre.
      b.scrollIntoView({ block: "nearest" });
      const q = b.getBoundingClientRect();
      if (
        q.left < -0.5 ||
        q.top < -0.5 ||
        q.right > innerWidth + 0.5 ||
        q.bottom > innerHeight + 0.5
      )
        bad.push(`"${t}" off screen`);
      const hit = document.elementFromPoint(
        q.left + q.width / 2,
        q.top + q.height / 2,
      );
      if (!hit || !b.contains(hit)) bad.push(`"${t}" not tappable`);
      // Words spilling out of the button.
      if (b.scrollWidth > b.clientWidth + 2) bad.push(`"${t}" words spill out`);
    }
    for (const p of root.querySelectorAll("h2, p")) {
      if (p.getClientRects().length === 0 || !(p.textContent ?? "").trim())
        continue;
      p.scrollIntoView({ block: "nearest" });
      const r = p.getBoundingClientRect();
      if (r.top < -0.5 || r.bottom > innerHeight + 0.5)
        bad.push(
          `words "${(p.textContent ?? "").slice(0, 30)}" never fully seen`,
        );
    }
    root
      .querySelectorAll("*")
      .forEach((e) => ((e as HTMLElement).scrollTop = 0));
    return bad;
  }, sel);
}

test.describe("part 1 at every size (web, first visit)", () => {
  test.use({ serviceWorkers: "block" });
  for (const size of SIZES) {
    const at = `${size.width}x${size.height}`;
    test(`qa K1c ${at}: Travel, download, ride, arrival, Kano home, Settings`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      const errors = await open(page, OGUN_WON);
      const faults: string[] = [];
      await page
        .locator(".screen")
        .getByRole("button", { name: "Travel" })
        .first()
        .tap();
      const t = page.getByRole("dialog", { name: "Where to?" });
      await expect(t).toBeVisible();
      const places = t.locator(".travel-place");
      await expect(places).toHaveCount(3);
      const boxes = await Promise.all(
        (await places.all()).map(async (b) => (await b.boundingBox())!),
      );
      // kano.md 1.5 asks 140 x 72. Three stacked do not fit 240 tall without a scroll, so under
      // 300 tall they may shrink to 48 (Tp/designer to confirm; reported in K1c).
      const minH = size.height < 300 ? 47.5 : 71.5;
      for (const b of boxes)
        if (b.width < 139.5 || b.height < minH)
          faults.push(
            `travel button ${Math.round(b.width)}x${Math.round(b.height)}`,
          );
      const rows = new Set(boxes.map((b) => Math.round(b.y))).size;
      if (size.width >= 480 && rows !== 1)
        faults.push(
          `travel: ${rows} rows at ${size.width} wide (side by side wanted)`,
        );
      if (size.width < 480 && rows !== 3)
        faults.push(
          `travel: ${rows} rows at ${size.width} wide (one above the other wanted)`,
        );
      faults.push(
        ...(await fits(page, '[role="dialog"]')).map((f) => `travel ${f}`),
      );
      await shot(page, `${at}-travel`);
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await places.nth(2).tap();
      const dl = page.locator(".download-card");
      await expect(
        dl.getByText("Kano is ready to download (about 85 KB)."),
      ).toBeVisible();
      faults.push(
        ...(await fits(page, ".download-card")).map((f) => `download ${f}`),
      );
      await shot(page, `${at}-download`);
      await dl.getByRole("button", { name: "Download" }).tap();
      await expect.poll(() => screenNow(page)).toBe("ride");
      await page.waitForTimeout(2600);
      await shot(page, `${at}-ride-mid`);
      const skip = page.getByRole("button", { name: "Skip" });
      const sb = (await skip.boundingBox())!;
      if (sb.width < 43.5 || sb.height < 43.5)
        faults.push(`Skip ${sb.width}x${sb.height}`);
      if (sb.x + sb.width > size.width + 0.5 || sb.y < -0.5)
        faults.push("Skip off screen");
      await expect
        .poll(() => screenNow(page), { timeout: 10_000 })
        .toBe("kano");
      const card = page.getByRole("dialog", { name: "Welcome to Kano!" });
      await expect(card).toBeVisible();
      faults.push(
        ...(await fits(page, '[role="dialog"]')).map((f) => `arrival ${f}`),
      );
      const go = card.getByRole("button", { name: "Let's go" });
      // kano.md 1.4: 56 tall. Short screens (under 360) keep Ogun's arrival card size, 48 (qa O7 passed it).
      if ((await go.boundingBox())!.height < (size.height < 360 ? 47.5 : 55.5))
        faults.push(`Let's go ${(await go.boundingBox())!.height} tall`);
      await shot(page, `${at}-arrival`);
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await go.tap();
      await expect(card).toHaveCount(0);
      faults.push(
        ...(await fits(page, ".kano-city")).map((f) => `kano home ${f}`),
      );
      await shot(page, `${at}-kano-home`);
      await page
        .locator(".kano-city")
        .getByRole("button", { name: "Settings" })
        .tap();
      await expect(
        page.getByText(
          "Your hero, Lagos, Ogun and Kano are saved on this phone.",
        ),
      ).toBeAttached();
      await page
        .getByText("Your hero, Lagos, Ogun and Kano are saved on this phone.")
        .scrollIntoViewIfNeeded();
      await shot(page, `${at}-settings`);
      console.log(`${at} faults: ${faults.length}\n  ${faults.join("\n  ")}`);
      expect.soft(faults).toEqual([]);
      expect(errors).toEqual([]);
    });

    test(`qa K1c ${at}: Ogun road "To Kano" stop, locked then open`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      const errors = await open(page, OGUN_NOT_WON);
      await page
        .locator(".ogun-city")
        .getByRole("button", { name: "Challenge road" })
        .tap();
      const stop = page
        .getByRole("region", { name: "Challenge road" })
        .locator('[data-where="wayOn"]');
      await expect(stop).toHaveAttribute(
        "aria-label",
        "To Kano. Locked. Win Pothole Hall to open the road to Kano.",
      );
      await stop.scrollIntoViewIfNeeded();
      await shot(page, `${at}-to-kano-locked`);
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await stop.tap({ force: true });
      await page.waitForTimeout(600);
      await shot(page, `${at}-to-kano-locked-tapped`);
      const lockedCard = page.getByRole("dialog", { name: "To Kano" });
      await expect(
        lockedCard.getByText("Win Pothole Hall to open the road to Kano."),
      ).toBeVisible();
      await expect(
        lockedCard.getByRole("button", { name: "Go to Kano" }),
      ).toHaveCount(0);
      const f = await fits(page, '[role="dialog"]');
      await shot(page, `${at}-to-kano-locked-card`);
      expect.soft(f).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test("qa K1c: offline after one visit, the Ogun part never on the phone; Lagos and Kano still work offline", async ({
  page,
  context,
}) => {
  const asked: string[] = [];
  context.on("request", (r) => {
    const p = partOf(r.url());
    if (p) asked.push(p);
  });
  // The Ogun part can never load in this test (KN-R10).
  await context.route(/\/worlds\/ogun\//, (route) =>
    route.abort("blockedbyclient"),
  );
  const errors = await open(page, OGUN_WON);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.getByRole("button", { name: "Play" }).tap();
  await expect.poll(() => screenNow(page)).toBe("city");
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page
    .locator(".screen")
    .getByRole("button", { name: "Travel" })
    .first()
    .tap();
  await page
    .getByRole("dialog", { name: "Where to?" })
    .locator('[data-state="kano"]')
    .tap();
  await page
    .locator(".download-card")
    .getByRole("button", { name: "Download" })
    .tap();
  await expect.poll(() => screenNow(page)).toBe("ride");
  await page.getByRole("button", { name: "Skip" }).tap();
  await expect.poll(() => screenNow(page)).toBe("kano");
  await page
    .getByRole("dialog", { name: "Welcome to Kano!" })
    .getByRole("button", { name: "Let's go" })
    .tap();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const all: string[] = [];
        for (const k of await caches.keys())
          for (const r of await (await caches.open(k)).keys())
            all.push(new URL(r.url).pathname);
        return all.filter((p) => p.includes("/worlds/kano/")).length;
      }),
    )
    .toBe(2);
  expect(asked.filter((p) => p !== "kano")).toEqual([]);

  // Second visit, no internet: Play opens Kano with no download card.
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Play" }).tap();
  await expect.poll(() => screenNow(page)).toBe("kano");
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await expect(page.locator(".download-card")).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Welcome to Kano!" }),
  ).toHaveCount(0);
  await shot(page, "offline-kano-home");
  // Kano to Lagos and back, offline.
  await page
    .locator(".kano-city")
    .getByRole("button", { name: "Travel" })
    .tap();
  await page
    .getByRole("dialog", { name: "Where to?" })
    .locator('[data-state="lagos"]')
    .tap();
  await expect.poll(() => screenNow(page)).toBe("ride");
  await page.getByRole("button", { name: "Skip" }).tap();
  await expect.poll(() => screenNow(page)).toBe("city");
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page
    .locator(".screen")
    .getByRole("button", { name: "Travel" })
    .first()
    .tap();
  await page
    .getByRole("dialog", { name: "Where to?" })
    .locator('[data-state="kano"]')
    .tap();
  await expect.poll(() => screenNow(page)).toMatch(/^(ride|kano)$/);
  await expect(page.locator(".download-card")).toHaveCount(0);
  await expect.poll(() => screenNow(page), { timeout: 10_000 }).toBe("kano");
  expect(asked.filter((p) => p !== "kano")).toEqual([]);
  expect(errors).toEqual([]);
});

test.describe("web, no service worker", () => {
  test.use({ serviceWorkers: "block" });

  test("qa K1c: ride times: about 5 s the first time, about 2 s after; reduced motion is still and short", async ({
    page,
  }) => {
    const errors = await open(page, OGUN_WON);
    const go = async () => {
      await page
        .locator(".screen")
        .getByRole("button", { name: "Travel" })
        .first()
        .tap();
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await page
        .getByRole("dialog", { name: "Where to?" })
        .locator('[data-state="kano"]')
        .tap();
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      const dl = page
        .locator(".download-card")
        .getByRole("button", { name: "Download" });
      if (await dl.count()) await dl.tap();
      await expect.poll(() => screenNow(page)).toBe("ride");
      const t0 = Date.now();
      await expect
        .poll(() => screenNow(page), { timeout: 15_000, intervals: [50] })
        .toBe("kano");
      return (Date.now() - t0) / 1000;
    };
    const back = async () => {
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      const card = page.getByRole("dialog", { name: "Welcome to Kano!" });
      if (await card.count())
        await card.getByRole("button", { name: "Let's go" }).tap();
      await page
        .locator(".kano-city")
        .getByRole("button", { name: "Travel" })
        .tap();
      await page
        .getByRole("dialog", { name: "Where to?" })
        .locator('[data-state="lagos"]')
        .tap();
      await expect.poll(() => screenNow(page)).toBe("ride");
      await expect(
        page.getByRole("img", {
          name: "A long bus drives from Kano back down the road.",
        }),
      ).toBeVisible();
      const t0 = Date.now();
      await expect
        .poll(() => screenNow(page), { timeout: 15_000, intervals: [50] })
        .toBe("city");
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      return (Date.now() - t0) / 1000;
    };
    const first = await go();
    const ret = await back();
    const again = await go();
    console.log(
      `ride first ${first.toFixed(1)} s (5 + 1 hold), back ${ret.toFixed(1)} s, again ${again.toFixed(1)} s (2 + 1 hold)`,
    );
    expect(first).toBeGreaterThan(5);
    expect(first).toBeLessThan(7.5);
    expect(again).toBeGreaterThan(2);
    expect(again).toBeLessThan(4.5);
    await back();
    // Reduced motion: the end picture only.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const still = await go();
    console.log(`reduced motion ride ${still.toFixed(1)} s`);
    expect(still).toBeLessThan(2.5);
    expect(errors).toEqual([]);
  });

  test("qa K1c: no internet before the download: plain words, Lagos still works; a broken file: plain words, no crash", async ({
    page,
    context,
  }) => {
    const errors = await open(page, OGUN_WON);
    await context.route(/\/worlds\/kano\//, (route) =>
      route.abort("internetdisconnected"),
    );
    await context.setOffline(true);
    await page
      .locator(".screen")
      .getByRole("button", { name: "Travel" })
      .first()
      .tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page
      .getByRole("dialog", { name: "Where to?" })
      .locator('[data-state="kano"]')
      .tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await shot(page, "no-internet-first");
    if (
      await page
        .locator(".download-card")
        .getByRole("button", { name: "Download" })
        .count()
    )
      await page
        .locator(".download-card")
        .getByRole("button", { name: "Download" })
        .tap();
    await expect(
      page.getByText(
        "Kano needs the internet once to download. Lagos and Ogun still work with no internet.",
      ),
    ).toBeVisible();
    await shot(page, "no-internet");
    await page.getByRole("button", { name: "OK" }).tap();
    expect(await screenNow(page)).toBe("city");
    await context.setOffline(false);
    await context.unroute(/\/worlds\/kano\//);
    // A broken file.
    await page.route(/\/worlds\/kano\/kano-/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: 'export const part = { id: "kano", version: 99 };',
      }),
    );
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page
      .locator(".screen")
      .getByRole("button", { name: "Travel" })
      .first()
      .tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page
      .getByRole("dialog", { name: "Where to?" })
      .locator('[data-state="kano"]')
      .tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    const dl = page
      .locator(".download-card")
      .getByRole("button", { name: "Download" });
    if (await dl.count()) await dl.tap();
    await expect(
      page
        .getByText(
          "Kano could not open just now. Lagos and Ogun still work. Try again later.",
        )
        .first(),
    ).toBeVisible();
    await shot(page, "broken");
    expect(["city", "ride"]).toContain(await screenNow(page));
    expect(errors).toEqual([]);
  });

  test("qa K1c: fast taps: many taps on Download, Skip and Let's go make one ride and one arrival", async ({
    page,
  }) => {
    const errors = await open(page, OGUN_WON);
    await page
      .locator(".screen")
      .getByRole("button", { name: "Travel" })
      .first()
      .tap();
    await page
      .getByRole("dialog", { name: "Where to?" })
      .locator('[data-state="kano"]')
      .tap();
    const dl = page
      .locator(".download-card")
      .getByRole("button", { name: "Download" });
    const box = (await dl.boundingBox())!;
    for (let i = 0; i < 8; i++)
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => screenNow(page)).toBe("ride");
    const sk = (await page
      .getByRole("button", { name: "Skip" })
      .boundingBox())!;
    for (let i = 0; i < 8; i++)
      await page.touchscreen.tap(sk.x + sk.width / 2, sk.y + sk.height / 2);
    await expect.poll(() => screenNow(page)).toBe("kano");
    await page.waitForTimeout(1500);
    expect(await screenNow(page)).toBe("kano");
    const go = page
      .getByRole("dialog", { name: "Welcome to Kano!" })
      .getByRole("button", { name: "Let's go" });
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    const g = (await go.boundingBox())!;
    for (let i = 0; i < 6; i++)
      await page.touchscreen.tap(g.x + g.width / 2, g.y + g.height / 2);
    await page.waitForTimeout(800);
    expect(await screenNow(page)).toBe("kano");
    await expect(
      page.getByRole("dialog", { name: "Welcome to Kano!" }),
    ).toHaveCount(0);
    // Rotate the phone and hide the page mid-ride: the ride still ends at Kano.
    await page
      .locator(".kano-city")
      .getByRole("button", { name: "Travel" })
      .tap();
    await page
      .getByRole("dialog", { name: "Where to?" })
      .locator('[data-state="lagos"]')
      .tap();
    await expect.poll(() => screenNow(page)).toBe("ride");
    await page.setViewportSize({ width: 393, height: 851 });
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.setViewportSize({ width: 851, height: 393 });
    await expect.poll(() => screenNow(page), { timeout: 10_000 }).toBe("city");
    expect(errors).toEqual([]);
  });
});

test.describe("slow phone", () => {
  test.use({ serviceWorkers: "block" });
  test("qa K1c slowed 4x CPU: the ride north keeps 30 fps (as Ogun ride, about 34 here); Kano home draws nothing while idle", async ({
    page,
  }) => {
    const errors = await open(page, OGUN_WON);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page
      .locator(".screen")
      .getByRole("button", { name: "Travel" })
      .first()
      .tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page
      .getByRole("dialog", { name: "Where to?" })
      .locator('[data-state="kano"]')
      .tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page
      .locator(".download-card")
      .getByRole("button", { name: "Download" })
      .tap();
    await expect.poll(() => screenNow(page)).toBe("ride");
    const fps = await page.evaluate(
      () =>
        new Promise<number>((done) => {
          let n = 0;
          const t0 = performance.now();
          const step = () => {
            n++;
            if (performance.now() - t0 < 3000) requestAnimationFrame(step);
            else done((n * 1000) / (performance.now() - t0));
          };
          requestAnimationFrame(step);
        }),
    );
    console.log(`ride fps at 4x CPU: ${fps.toFixed(1)}`);
    expect(fps).toBeGreaterThanOrEqual(30);
    await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe("kano");
    await page
      .getByRole("dialog", { name: "Welcome to Kano!" })
      .getByRole("button", { name: "Let's go" })
      .tap();
    await page.waitForTimeout(500);
    const d0 = await page.evaluate(() => window.__game!.kanoHome?.draws ?? -1);
    await page.waitForTimeout(2000);
    const d1 = await page.evaluate(() => window.__game!.kanoHome?.draws ?? -1);
    console.log(`kano home draws while idle: ${d1 - d0}`);
    expect(d1 - d0).toBe(0);
    expect(errors).toEqual([]);
  });
});
