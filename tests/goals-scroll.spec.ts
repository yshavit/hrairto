import { test, expect } from '@playwright/test'

const STEP = 230 // CARD_WIDTH (220) + GAP (10)

test.beforeEach(async ({ page }) => {
    await page.goto('/ui-test-entrypoints/goals.html')
    // Wait for the scrollers to be rendered and laid out.
    await page.waitForSelector('.quarter-scroller')
})

test('› button cannot scroll into the peek quarter', async ({ page }) => {
    const nextBtn = page.locator('button', { hasText: '›' })
    const hardMax = await page.evaluate(() => {
        const el = document.querySelector('.quarter-scroller') as HTMLDivElement
        return Math.max(0, el.scrollWidth - el.clientWidth - 230)
    })

    // Click more times than there are real quarters.
    for (let i = 0; i < 8; i++) await nextBtn.click()

    const scrollLeft = await page.evaluate(() =>
        (document.querySelector('.quarter-scroller') as HTMLDivElement).scrollLeft
    )
    expect(scrollLeft).toBeLessThanOrEqual(hardMax + 1) // +1 for rounding
})

test('both swimlane scrollers stay in sync after drag', async ({ page }) => {
    const scroller = page.locator('.quarter-scroller').first()
    const box = await scroller.boundingBox()
    if (!box) throw new Error('scroller not found')

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx - 150, cy, { steps: 10 })
    await page.mouse.up()

    const scrollLefts = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.quarter-scroller')).map(
            el => (el as HTMLDivElement).scrollLeft
        )
    )
    // All scrollers must agree.
    expect(scrollLefts.every(v => v === scrollLefts[0])).toBe(true)
})

test('rubber-band springs back after dragging past end', async ({ page }) => {
    const scroller = page.locator('.quarter-scroller').first()
    const box = await scroller.boundingBox()
    if (!box) throw new Error('scroller not found')

    const hardMax = await page.evaluate(() => {
        const el = document.querySelector('.quarter-scroller') as HTMLDivElement
        return Math.max(0, el.scrollWidth - el.clientWidth - 230)
    })

    // First scroll to the end via nav so rubber-band drag starts near hardMax.
    const nextBtn = page.locator('button', { hasText: '›' })
    for (let i = 0; i < 8; i++) await nextBtn.click()

    // Now drag left (towards future) to trigger the rubber-band.
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx - 200, cy, { steps: 20 })
    await page.mouse.up()

    // Wait for the spring-back animation to complete (~350ms + buffer).
    await page.waitForTimeout(500)

    const { scrollLeft, transform } = await page.evaluate(() => {
        const scroller = document.querySelector('.quarter-scroller') as HTMLDivElement
        const inner = document.querySelector('.quarter-scroller__inner') as HTMLDivElement
        return {
            scrollLeft: scroller.scrollLeft,
            transform: inner.style.transform,
        }
    })

    expect(scrollLeft).toBeCloseTo(hardMax, -1) // within ~5px
    expect(transform).toBe('')
})
