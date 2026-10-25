import { test, expect } from '@playwright/test'
import { fixture, noOverflow, shot } from './planner-fixture'

// RPC responses below are local fixtures, never hosted capsule contents.
for (const width of [390, 1440]) {
  test(`capsule collection and letter reading at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await fixture(page)
    await page.route('**/rest/v1/rpc/list_capsules', route => route.fulfill({
      contentType: 'application/json', body: JSON.stringify([
        { id: 'ready', title: 'Remember this beginning', unlock_date: '2025-01-01', can_open: true },
        { id: 'sealed', title: 'For the person I am becoming', unlock_date: '2030-06-01', can_open: false },
      ]),
    }))
    await page.route('**/rest/v1/rpc/open_capsule', route => route.fulfill({
      contentType: 'application/json', body: JSON.stringify({ message: 'You made room for the things that matter.\nKeep going.' }),
    }))
    await page.goto('/capsules')
    await expect(page.getByRole('heading', { name: 'A moment has found you.' })).toBeVisible()
    await noOverflow(page)
    await shot(page, 'capsules-' + width)
    await page.getByRole('navigation', { name: 'Capsule overview' }).getByRole('button', { name: /Ready to open/ }).click()
    await expect(page.locator('.keepsake-card')).toHaveCount(1)
    await page.getByRole('button', { name: 'Break the seal' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('You made room for the things that matter.')
    await shot(page, 'capsule-letter-' + width)
    await page.getByRole('button', { name: 'Close capsule', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await page.getByRole('navigation', { name: 'Capsule overview' }).getByRole('button', { name: /Sealed for later/ }).click()
    await expect(page.locator('.keepsake-card')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Break the seal' })).toHaveCount(0)
  })
}

test('empty collection invites writing and failed sealing retains the message', async ({ page }) => {
  await fixture(page)
  await page.route('**/rest/v1/rpc/list_capsules', route => route.fulfill({ contentType: 'application/json', body: '[]' }))
  await page.route('**/rest/v1/rpc/create_capsule', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Please try again.' }) }))
  await page.goto('/capsules')
  await page.getByRole('button', { name: 'Write your first capsule' }).click()
  await expect(page.locator('#capsule-title')).toBeFocused()
  await page.locator('#capsule-title').fill('A little of today')
  await page.locator('#capsule-message').fill('Keep making time for ordinary days.')
  await page.getByRole('button', { name: 'In a year', exact: true }).click()
  await page.getByRole('button', { name: 'Seal this moment' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('#capsule-message')).toHaveValue('Keep making time for ordinary days.')
})
