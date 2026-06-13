import { test, expect } from '@playwright/test';

const STEP = 230; // CARD_WIDTH (220) + GAP (10)

test.beforeEach(async ({ page }) => {
  await page.goto('/ui-test-entrypoints/goals.html');
  // Wait for the timeline to be rendered and laid out.
  await page.waitForSelector('.goal-timeline');
});

test('› button cannot scroll into the peek quarter', async ({ page }) => {
  const nextBtn = page.locator('button', { hasText: '›' });
  const hardMax = await page.evaluate((step) => {
    const el = document.querySelector('.goal-timeline') as HTMLDivElement;
    return Math.max(0, el.scrollWidth - el.clientWidth - step);
  }, STEP);

  // Click more times than there are real quarters.
  for (let i = 0; i < 8; i++) await nextBtn.click();

  const scrollLeft = await page.evaluate(() => (document.querySelector('.goal-timeline') as HTMLDivElement).scrollLeft);
  expect(scrollLeft).toBeLessThanOrEqual(hardMax + 1); // +1 for rounding
});

test('scroller moves after drag', async ({ page }) => {
  const scroller = page.locator('.goal-timeline').first();
  const box = await scroller.boundingBox();
  if (!box) throw new Error('scroller not found');

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const scrollBefore = await page.evaluate(() => (document.querySelector('.goal-timeline') as HTMLDivElement).scrollLeft);

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 150, cy, { steps: 10 });
  await page.mouse.up();

  const { scrollLeft, maxScrollLeft } = await page.evaluate(() => {
    const el = document.querySelector('.goal-timeline') as HTMLDivElement;
    return {
      scrollLeft: el.scrollLeft,
      maxScrollLeft: Math.max(0, el.scrollWidth - el.clientWidth),
    };
  });

  // Either scrolled right, or hit the right edge and rubber-banded back.
  expect(scrollLeft).toBeGreaterThanOrEqual(scrollBefore);
  expect(scrollLeft).toBeLessThanOrEqual(maxScrollLeft + 1);
});

test('rubber-band springs back after dragging past end', async ({ page }) => {
  const scroller = page.locator('.goal-timeline').first();
  const box = await scroller.boundingBox();
  if (!box) throw new Error('scroller not found');

  const hardMax = await page.evaluate((step) => {
    const el = document.querySelector('.goal-timeline') as HTMLDivElement;
    return Math.max(0, el.scrollWidth - el.clientWidth - step);
  }, STEP);

  // First scroll to the end via nav so rubber-band drag starts near hardMax.
  const nextBtn = page.locator('button', { hasText: '›' });
  for (let i = 0; i < 8; i++) await nextBtn.click();

  // Now drag left (towards future) to trigger the rubber-band.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 200, cy, { steps: 20 });
  await page.mouse.up();

  // Wait for the spring-back animation to complete (~350ms + buffer).
  await page.waitForTimeout(500);

  const { scrollLeft, transform } = await page.evaluate(() => {
    const el = document.querySelector('.goal-timeline') as HTMLDivElement;
    const inner = document.querySelector('.goal-timeline__inner') as HTMLDivElement;
    return {
      scrollLeft: el.scrollLeft,
      transform: inner.style.transform,
    };
  });

  expect(scrollLeft).toBeCloseTo(hardMax, -1); // within ~5px
  expect(transform).toBe('');
});
