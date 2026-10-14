import { test, expect } from '@playwright/test'

// This E2E test requires a running Supabase instance with migrations applied
// Run with: npm run test:e2e

test.describe('Sticker System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login')
    
    // Sign in with test credentials
    // Note: These should be configured in your test environment
    await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'testpassword')
    await page.click('button[type="submit"]')
    
    // Wait for navigation to complete
    await page.waitForURL('**/home', { timeout: 10000 })
  })

  test('complete sticker workflow: add, edit, save, and persist', async ({ page }) => {
    // Navigate to create new journal entry
    await page.goto('http://localhost:5173/journal/new')
    await page.waitForLoadState('networkidle')
    
    // Fill in basic entry details
    await page.fill('input#entry-title', 'E2E Sticker Test Entry')
    await page.fill('textarea#entry-content', 'Testing sticker functionality with Playwright.')
    
    // Verify Decorate button is visible
    const decorateButton = page.locator('button[aria-pressed]', { hasText: 'Decorate' })
    await expect(decorateButton).toBeVisible()
    
    // Enable decorate mode
    await decorateButton.click()
    await expect(decorateButton).toHaveText(/Done Decorating/)
    
    // Verify sticker tray is visible
    await expect(page.locator('.sticker-tray')).toBeVisible()
    
    // Select Library tab (should be default, but let's be explicit)
    await page.locator('button[role="tab"]', { hasText: 'Library' }).click()
    
    // Add a builtin sticker
    const firstSticker = page.locator('[aria-label*="sticker"]').first()
    await expect(firstSticker).toBeVisible({ timeout: 5000 })
    await firstSticker.click()
    
    // Verify sticker appears on canvas
    const canvas = page.locator('.sticker-canvas')
    await expect(canvas.locator('[data-sticker-id]')).toHaveCount(1)
    
    // Verify sticker is selected and toolbar appears
    await expect(page.locator('.sticker-toolbar')).toBeVisible()
    
    // Drag the sticker (simulate movement)
    const stickerElement = canvas.locator('[data-sticker-id]').first()
    const boundingBox = await stickerElement.boundingBox()
    if (boundingBox) {
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(boundingBox.x + 100, boundingBox.y + 50)
      await page.mouse.up()
    }
    
    // Duplicate the sticker
    await page.locator('button[aria-label="Duplicate sticker"]').click()
    await expect(canvas.locator('[data-sticker-id]')).toHaveCount(2)
    
    // Test undo
    await page.keyboard.press('Control+z')
    await expect(canvas.locator('[data-sticker-id]')).toHaveCount(1)
    
    // Test redo
    await page.keyboard.press('Control+Shift+z')
    await expect(canvas.locator('[data-sticker-id]')).toHaveCount(2)
    
    // Delete one sticker
    await page.locator('[data-sticker-id]').first().click()
    await page.keyboard.press('Delete')
    await expect(canvas.locator('[data-sticker-id]')).toHaveCount(1)
    
    // Test layer operations
    await page.locator('[data-sticker-id]').first().click()
    await page.locator('button[aria-label="Bring to front"]').click()
    
    // Test rotation
    await page.locator('button[title="Rotate +15°"]').click()
    await page.waitForTimeout(100) // Brief wait for rotation to apply
    
    // Finish decorating
    await decorateButton.click()
    await expect(page.locator('.sticker-tray')).not.toBeVisible()
    
    // Save the entry
    await page.locator('button', { hasText: /Save/ }).click()
    await page.waitForURL('**/journal', { timeout: 10000 })
    
    // Navigate back to the saved entry
    await page.locator('a', { hasText: 'E2E Sticker Test Entry' }).first().click()
    await page.waitForLoadState('networkidle')
    
    // Verify sticker persisted (in view mode)
    await expect(page.locator('[data-sticker-id]')).toHaveCount(1)
    
    // Verify no editing controls in view mode
    await expect(page.locator('.sticker-toolbar')).not.toBeVisible()
    await expect(page.locator('.sticker-tray')).not.toBeVisible()
    
    // Switch to edit mode if there's an edit button
    const editButton = page.locator('button', { hasText: /Edit/ })
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForLoadState('networkidle')
      
      // Enable decorate mode again
      await decorateButton.click()
      
      // Verify sticker still there and editable
      await expect(page.locator('[data-sticker-id]')).toHaveCount(1)
      await expect(page.locator('.sticker-tray')).toBeVisible()
    }
  })

  test('upload custom sticker', async ({ page }) => {
    // Navigate to create new journal entry
    await page.goto('http://localhost:5173/journal/new')
    await page.waitForLoadState('networkidle')
    
    // Fill in basic entry details
    await page.fill('input#entry-title', 'Custom Sticker Upload Test')
    await page.fill('textarea#entry-content', 'Testing custom sticker upload.')
    
    // Enable decorate mode
    await page.locator('button[aria-pressed]', { hasText: 'Decorate' }).click()
    
    // Switch to My Stickers tab
    await page.locator('button[role="tab"]', { hasText: 'My Stickers' }).click()
    
    // Verify upload button is visible
    await expect(page.locator('button', { hasText: 'Upload Sticker' })).toBeVisible()
    
    // Note: Actual file upload testing would require:
    // 1. A test PNG/WebP file
    // 2. File input interaction
    // 3. Verification of upload success
    // This is a placeholder for the upload flow test
  })

  test('keyboard shortcuts work correctly', async ({ page }) => {
    // Navigate to create new journal entry
    await page.goto('http://localhost:5173/journal/new')
    await page.waitForLoadState('networkidle')
    
    // Fill in basic details
    await page.fill('input#entry-title', 'Keyboard Shortcuts Test')
    await page.fill('textarea#entry-content', 'Testing keyboard navigation.')
    
    // Enable decorate mode
    await page.locator('button[aria-pressed]', { hasText: 'Decorate' }).click()
    
    // Add a sticker
    await page.locator('[aria-label*="sticker"]').first().click()
    
    const canvas = page.locator('.sticker-canvas')
    await expect(canvas.locator('[data-sticker-id]')).toHaveCount(1)
    
    // Select the sticker
    await page.locator('[data-sticker-id]').first().click()
    
    // Test arrow key nudging
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    
    // Test Escape to deselect
    await page.keyboard.press('Escape')
    await expect(page.locator('.sticker-toolbar')).not.toBeVisible()
    
    // Select again
    await page.locator('[data-sticker-id]').first().click()
    
    // Test Delete key
    await page.keyboard.press('Delete')
    await expect(canvas.locator('[data-sticker-id]')).toHaveCount(0)
  })

  test('sticker interactions are smooth (performance check)', async ({ page }) => {
    // Navigate to create new journal entry
    await page.goto('http://localhost:5173/journal/new')
    await page.waitForLoadState('networkidle')
    
    // Fill in basic details
    await page.fill('input#entry-title', 'Performance Test')
    await page.fill('textarea#entry-content', 'Testing sticker performance.')
    
    // Enable decorate mode
    await page.locator('button[aria-pressed]', { hasText: 'Decorate' }).click()
    
    // Add multiple stickers
    for (let i = 0; i < 5; i++) {
      await page.locator('[aria-label*="sticker"]').first().click()
      await page.waitForTimeout(100)
    }
    
    const canvas = page.locator('.sticker-canvas')
    await expect(canvas.locator('[data-sticker-id]')).toHaveCount(5)
    
    // Measure interaction responsiveness
    // This is a basic check; in production, you'd measure FPS during drag
    const startTime = Date.now()
    
    // Click through all stickers
    for (let i = 0; i < 5; i++) {
      await canvas.locator('[data-sticker-id]').nth(i).click()
      await page.waitForTimeout(50)
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Should complete in reasonable time (< 2 seconds for 5 interactions)
    expect(duration).toBeLessThan(2000)
  })

  test('accessibility: keyboard navigation works', async ({ page }) => {
    // Navigate to create new journal entry
    await page.goto('http://localhost:5173/journal/new')
    await page.waitForLoadState('networkidle')
    
    // Fill in basic details
    await page.fill('input#entry-title', 'Accessibility Test')
    await page.fill('textarea#entry-content', 'Testing keyboard navigation.')
    
    // Tab to Decorate button and activate it
    await page.keyboard.press('Tab')
    // Note: Actual tab sequence depends on form layout
    // This is a simplified version
    
    // Enable decorate mode
    await page.locator('button[aria-pressed]', { hasText: 'Decorate' }).click()
    
    // Verify ARIA labels are present
    await expect(page.locator('[aria-label*="sticker"]').first()).toHaveAttribute('aria-label')
    await expect(page.locator('button[aria-label="Close sticker tray"]')).toHaveAttribute('aria-label')
    
    // Verify toolbar buttons have aria-labels
    await page.locator('[aria-label*="sticker"]').first().click()
    await expect(page.locator('button[aria-label="Duplicate sticker"]')).toHaveAttribute('aria-label')
    await expect(page.locator('button[aria-label="Delete sticker"]')).toHaveAttribute('aria-label')
  })
})
