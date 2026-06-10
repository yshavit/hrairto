import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/ui-test-entrypoints/weekly.html');
  await page.waitForSelector('.weekly-section');
});

// Complete the reflection phase: mark all unmarked goals, fill notes, select health,
// click Done. Used by tests that need to start in the planning phase.
async function completeReflection(page: Parameters<typeof test>[1]['page']) {
  // Click all unmarked toggles atomically — doing it in a loop re-queries the
  // locator after each click (the class disappears) and nth(i) goes out of bounds.
  await page.evaluate(() => {
    document.querySelectorAll<HTMLButtonElement>('.past-goal-row--unmarked .past-goal-row__toggle').forEach((btn) => btn.click());
  });

  // Fill reflection notes
  await page.locator('.reflection-notes__textarea').fill('Weekly reflection notes');

  // Select waypoint health confidence
  await page.locator('.waypoint-health-card__btn', { hasText: 'on track' }).click();

  // Complete reflection
  await page.locator('button', { hasText: /Done reflecting/ }).click();
}

test('happy path: full reflection → planning → save', async ({ page }) => {
  await completeReflection(page);

  // Planning section should now be open
  const planSection = page.locator('.weekly-section').last();
  await expect(planSection.locator('.weekly-section__collapse')).toHaveClass(/weekly-section__collapse--open/);

  // Add a goal
  await page.locator('.plan-goal-section .add-goal-btn').first().click();
  await page.locator('.add-goal-form__input').fill('Ship it');
  await page.locator('.add-goal-form__submit').click();

  // Save
  await page.locator('button', { hasText: 'Set Plan' }).click();

  // DOM signal set by the test entrypoint's onSave stub
  await expect(page.locator('body')).toHaveAttribute('data-saved-payload', /"type":"Plan"/);
  await expect(page.locator('body')).toHaveAttribute('data-saved-payload', /"Ship it"/);
});

test('blocked transitions: planning not accessible before reflection is complete', async ({ page }) => {
  const planSection = page.locator('.weekly-section').last();
  const planCollapse = planSection.locator('.weekly-section__collapse');

  // Planning section starts closed
  await expect(planCollapse).not.toHaveClass(/weekly-section__collapse--open/);

  // Clicking anywhere on the planning header doesn't open it
  await planSection.locator('.weekly-section-header').click();
  await expect(planCollapse).not.toHaveClass(/weekly-section__collapse--open/);
});

test('edit cycle: planning collapses on Edit, data intact after re-reflecting', async ({ page }) => {
  await completeReflection(page);

  const planSection = page.locator('.weekly-section').last();
  const planCollapse = planSection.locator('.weekly-section__collapse');
  await expect(planCollapse).toHaveClass(/weekly-section__collapse--open/);

  // Add a goal to test persistence
  await page.locator('.plan-goal-section .add-goal-btn').first().click();
  await page.locator('.add-goal-form__input').fill('Persistent goal');
  await page.locator('.add-goal-form__submit').click();
  await expect(page.locator('.plan-goal-item__text', { hasText: 'Persistent goal' })).toBeVisible();

  // Click Edit → planning should collapse, reflection should reopen
  await page.locator('button', { hasText: 'Edit' }).click();
  await expect(planCollapse).not.toHaveClass(/weekly-section__collapse--open/);

  const reflectSection = page.locator('.weekly-section').first();
  await expect(reflectSection.locator('.weekly-section__collapse')).toHaveClass(/weekly-section__collapse--open/);

  // Re-complete reflection
  await page.locator('button', { hasText: /Done reflecting/ }).click();
  await expect(planCollapse).toHaveClass(/weekly-section__collapse--open/);

  // Goal data survives
  await expect(page.locator('.plan-goal-item__text', { hasText: 'Persistent goal' })).toBeVisible();
});

test('reflection header non-clickable while in planning phase', async ({ page }) => {
  await completeReflection(page);

  const planSection = page.locator('.weekly-section').last();
  const planCollapse = planSection.locator('.weekly-section__collapse');
  await expect(planCollapse).toHaveClass(/weekly-section__collapse--open/);

  // Click the reflect section header background (not the Edit button)
  const reflectHeader = page.locator('.weekly-section').first().locator('.weekly-section-header');
  await reflectHeader.click({ position: { x: 10, y: 10 } });

  // Planning must stay open, reflecting must stay closed
  await expect(planCollapse).toHaveClass(/weekly-section__collapse--open/);
  const reflectCollapse = page.locator('.weekly-section').first().locator('.weekly-section__collapse');
  await expect(reflectCollapse).not.toHaveClass(/weekly-section__collapse--open/);
});
