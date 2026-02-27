import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

for (const viewport of viewports) {
  test(`home visual snapshot (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(250)
    await expect(page).toHaveScreenshot(`home-${viewport.name}.png`, {
      fullPage: true,
    })
  })
}
