import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/ui-test-entrypoints/midday.html');
  await page.waitForSelector('.midday-checkin');
});

test('happy path: mark a goal hit, drag a handle, write a note, save', async ({ page }) => {
  // Mark first goal as hit
  const toggles = page.locator('.midday-goal-row__toggle');
  await toggles.first().click();
  await expect(page.locator('.midday-goal-row__text--hit').first()).toBeVisible();

  // Write a note
  await page.locator('.midday-note-field').fill('Good morning session');

  // Save
  await page.locator('.midday-save-btn').click();

  // Saved payload should include the goal outcome and time split
  const payload = await page.evaluate(() => document.body.dataset.savedPayload);
  expect(payload).toBeTruthy();
  const result = JSON.parse(payload!);
  expect(result.goal_outcomes).toHaveLength(1);
  expect(result.goal_outcomes[0].outcome.type).toBe('Hit');
  expect(result.note).toBe('Good morning session');
  expect(result.time_split.goal_weights).toHaveLength(3);
  expect(result.time_split.distraction_weight).toBeGreaterThan(0);
});

test('save with nothing touched — succeeds immediately', async ({ page }) => {
  await page.locator('.midday-save-btn').click();

  const payload = await page.evaluate(() => document.body.dataset.savedPayload);
  const result = JSON.parse(payload!);
  expect(result.goal_outcomes).toHaveLength(0);
  expect(result.note).toBeNull();
});

test('ⓘ toggle opens and closes detail for a planned goal', async ({ page }) => {
  const infoBtns = page.locator('.midday-goal-row__info-btn');

  // Detail hidden initially
  await expect(page.locator('.midday-goal-row__detail')).not.toBeVisible();

  // First goal is a planned FizzBuzz goal — detail should mention the concern and waypoint
  await infoBtns.first().click();
  const detail = page.locator('.midday-goal-row__detail').first();
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('Team');
  await expect(detail).toContainText('Closed beta sign-up flow');

  // Close it
  await infoBtns.first().click();
  await expect(detail).not.toBeVisible();
});

test('ⓘ toggle opens and closes detail for a distraction goal', async ({ page }) => {
  const infoBtns = page.locator('.midday-goal-row__info-btn');

  // Third goal is a distraction (support rotation)
  await infoBtns.nth(2).click();
  const detail = page.locator('.midday-goal-row__detail').first();
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('support rotation');

  await infoBtns.nth(2).click();
  await expect(detail).not.toBeVisible();
});

test('goal toggle cycles: first click = hit (strikethrough), second = miss (no strikethrough)', async ({ page }) => {
  const toggle = page.locator('.midday-goal-row__toggle').first();
  const text = page.locator('.midday-goal-row__text').first();

  // Initially no strikethrough
  await expect(text).not.toHaveClass(/midday-goal-row__text--hit/);

  // First click → hit
  await toggle.click();
  await expect(text).toHaveClass(/midday-goal-row__text--hit/);

  // Second click → miss
  await toggle.click();
  await expect(text).not.toHaveClass(/midday-goal-row__text--hit/);

  // Third click → hit again (never back to unmarked)
  await toggle.click();
  await expect(text).toHaveClass(/midday-goal-row__text--hit/);
});
