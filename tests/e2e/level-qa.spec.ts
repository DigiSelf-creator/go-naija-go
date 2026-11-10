/**
 * qa C7: originality, the art gallery on the phone profile. Screenshots go to $QA_SHOTS
 * (default test-results/qa-shots).
 *
 * Piece M2 retired the slice 1 level (w1-l1) and its level checks that lived here; street 1 by
 * hand is in hands.spec.ts and Go-Slow Hall in hall.spec.ts and hall-qa.spec.ts.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, type Page } from '@playwright/test';

const SHOTS = process.env['QA_SHOTS'] ?? 'test-results/qa-shots';
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

test('originality: the art gallery on the phone profile', async ({ page }) => {
  await page.goto('./?gallery');
  await page.waitForTimeout(800);
  await shot(page, 'gallery');
});
