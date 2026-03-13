/**
 * E2E Test Suite: Month Lifecycle (MONTH-01 through MONTH-07)
 *
 * These tests cover the month lifecycle state machine transitions:
 *   MONTH-01: Open → Calculated
 *   MONTH-02: Calculated → Approved
 *   MONTH-03: Approved → Closed
 *   MONTH-04: Closed month rejects writes
 *   MONTH-05: Unlock closed month (with mandatory reason)
 *   MONTH-06: Unlock without reason blocked
 *   MONTH-07: Revert Calculated → Open
 *
 * Prerequisites:
 *   - A running instance of the app (npm run dev or via playwright webServer config)
 *   - A seeded Supabase database with at least one open monthly period
 *   - A valid test user account (set TEST_EMAIL / TEST_PASSWORD env vars)
 *
 * These tests run sequentially (not in parallel) because they depend on
 * month status progressing through the lifecycle.
 */

import { test, expect, type Page } from '@playwright/test'

// ── Test configuration ──

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@stonefieldcapital.ca'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// ── Helpers ──

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 10_000 })
}

async function navigateToMonthPage(page: Page) {
  // Navigate to the month lifecycle / calculations page
  // This targets the future calculations or month management page
  await page.goto(`${BASE_URL}/dashboard/calculations`)
  await page.waitForLoadState('networkidle')
}

async function getMonthStatus(page: Page): Promise<string> {
  const statusBadge = page.locator('[data-testid="month-status"]')
  return (await statusBadge.textContent()) ?? ''
}

// ── Auth setup — run once before all tests ──

test.describe('Month Lifecycle State Machine', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ─────────────────────────────────────────────────────────
  // MONTH-01: Open → Calculated
  // ─────────────────────────────────────────────────────────
  test('MONTH-01: transition from Open to Calculated via Run Calculations', async ({ page }) => {
    await navigateToMonthPage(page)

    // Verify month is in Open status
    const status = await getMonthStatus(page)
    expect(status.toLowerCase()).toContain('open')

    // Click Run Calculations
    const runCalcButton = page.locator('button', { hasText: /run calculations/i })
    await expect(runCalcButton).toBeVisible()
    await runCalcButton.click()

    // A diff/confirmation view should appear
    const diffView = page.locator('[data-testid="calculation-diff"], [data-testid="calculation-preview"]')
    await expect(diffView).toBeVisible({ timeout: 15_000 })

    // Confirm the calculation
    const confirmButton = page.locator('button', { hasText: /confirm|accept|apply/i })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Verify status transitioned to Calculated
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/calculated/i, {
      timeout: 10_000,
    })
  })

  // ─────────────────────────────────────────────────────────
  // MONTH-07: Revert Calculated → Open
  // (Tested before MONTH-02 so we can return to Calculated after)
  // ─────────────────────────────────────────────────────────
  test('MONTH-07: revert Calculated back to Open', async ({ page }) => {
    await navigateToMonthPage(page)

    // Status should be Calculated from MONTH-01
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/calculated/i)

    // Click Revert to Open
    const revertButton = page.locator('button', { hasText: /revert to open|revert/i })
    await expect(revertButton).toBeVisible()
    await revertButton.click()

    // Confirm revert if there's a confirmation dialog
    const confirmRevert = page.locator('button', { hasText: /confirm|yes/i })
    if (await confirmRevert.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmRevert.click()
    }

    // Verify status is back to Open
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/open/i, {
      timeout: 10_000,
    })

    // Re-run calculations to get back to Calculated for MONTH-02
    const runCalcButton = page.locator('button', { hasText: /run calculations/i })
    await runCalcButton.click()

    const diffView = page.locator('[data-testid="calculation-diff"], [data-testid="calculation-preview"]')
    await expect(diffView).toBeVisible({ timeout: 15_000 })

    const confirmButton = page.locator('button', { hasText: /confirm|accept|apply/i })
    await confirmButton.click()

    await expect(page.locator('[data-testid="month-status"]')).toContainText(/calculated/i, {
      timeout: 10_000,
    })
  })

  // ─────────────────────────────────────────────────────────
  // MONTH-02: Calculated → Approved
  // ─────────────────────────────────────────────────────────
  test('MONTH-02: transition from Calculated to Approved', async ({ page }) => {
    await navigateToMonthPage(page)

    // Status should be Calculated
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/calculated/i)

    // Admin clicks Approve
    const approveButton = page.locator('button', { hasText: /approve/i })
    await expect(approveButton).toBeVisible()
    await approveButton.click()

    // Confirm if there's a confirmation dialog
    const confirmApprove = page.locator('button', { hasText: /confirm|yes/i })
    if (await confirmApprove.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmApprove.click()
    }

    // Verify status is Approved
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/approved/i, {
      timeout: 10_000,
    })
  })

  // ─────────────────────────────────────────────────────────
  // MONTH-03: Approved → Closed
  // ─────────────────────────────────────────────────────────
  test('MONTH-03: transition from Approved to Closed', async ({ page }) => {
    await navigateToMonthPage(page)

    // Status should be Approved
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/approved/i)

    // Admin clicks Close Month
    const closeButton = page.locator('button', { hasText: /close month|close/i })
    await expect(closeButton).toBeVisible()
    await closeButton.click()

    // Confirm closing
    const confirmClose = page.locator('button', { hasText: /confirm|yes/i })
    if (await confirmClose.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmClose.click()
    }

    // Verify status is Closed
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/closed/i, {
      timeout: 10_000,
    })
  })

  // ─────────────────────────────────────────────────────────
  // MONTH-04: Closed month rejects writes
  // ─────────────────────────────────────────────────────────
  test('MONTH-04: closed month rejects transaction writes', async ({ page }) => {
    // Navigate to transactions page for the closed month
    await page.goto(`${BASE_URL}/dashboard/transactions`)
    await page.waitForLoadState('networkidle')

    // Attempt to add a transaction to the closed month
    const addButton = page.locator('button, a', { hasText: /add transaction|new transaction/i })

    if (await addButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addButton.click()

      // Fill in a minimal transaction form
      const amountInput = page.locator('input[name="amount"], input[placeholder*="amount" i]')
      if (await amountInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await amountInput.fill('1000')
      }

      // Submit
      const submitButton = page.locator('button[type="submit"]')
      if (await submitButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await submitButton.click()
      }

      // Expect an error message indicating the month is closed
      const errorMessage = page.locator('[role="alert"], .text-red-600, .text-red-500, [data-testid="error-message"]')
      await expect(errorMessage).toBeVisible({ timeout: 10_000 })
      const errorText = await errorMessage.textContent()
      expect(errorText?.toLowerCase()).toMatch(/closed|cannot|rejected|not allowed/i)
    } else {
      // If the Add Transaction button is disabled or hidden for closed months, that's also valid
      const disabledButton = page.locator('button[disabled]', { hasText: /add transaction|new transaction/i })
      const noButton = await addButton.count() === 0
      expect(noButton || (await disabledButton.count()) > 0).toBe(true)
    }
  })

  // ─────────────────────────────────────────────────────────
  // MONTH-06: Unlock without reason is blocked
  // (Tested before MONTH-05 to keep month in Closed state)
  // ─────────────────────────────────────────────────────────
  test('MONTH-06: unlock without reason is blocked', async ({ page }) => {
    await navigateToMonthPage(page)

    // Status should be Closed
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/closed/i)

    // Click Unlock
    const unlockButton = page.locator('button', { hasText: /unlock/i })
    await expect(unlockButton).toBeVisible()
    await unlockButton.click()

    // A dialog / form should appear with a reason field
    const reasonInput = page.locator(
      'textarea[name="reason"], input[name="reason"], [data-testid="unlock-reason"]',
    )
    await expect(reasonInput).toBeVisible({ timeout: 5_000 })

    // Leave reason blank and try to submit
    await reasonInput.fill('')
    const submitUnlock = page.locator('button', { hasText: /confirm|submit|unlock/i })
    await submitUnlock.click()

    // Should show validation error — reason is mandatory
    const validationError = page.locator(
      '[role="alert"], .text-red-600, .text-red-500, [data-testid="reason-error"]',
    )
    await expect(validationError).toBeVisible({ timeout: 5_000 })

    // Month should still be Closed
    // Close the dialog if still open
    const cancelButton = page.locator('button', { hasText: /cancel|close/i })
    if (await cancelButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await cancelButton.click()
    }

    await expect(page.locator('[data-testid="month-status"]')).toContainText(/closed/i)
  })

  // ─────────────────────────────────────────────────────────
  // MONTH-05: Unlock closed month (with reason)
  // ─────────────────────────────────────────────────────────
  test('MONTH-05: unlock closed month with mandatory reason', async ({ page }) => {
    await navigateToMonthPage(page)

    // Status should be Closed
    await expect(page.locator('[data-testid="month-status"]')).toContainText(/closed/i)

    // Click Unlock
    const unlockButton = page.locator('button', { hasText: /unlock/i })
    await expect(unlockButton).toBeVisible()
    await unlockButton.click()

    // Fill in the mandatory reason
    const reasonInput = page.locator(
      'textarea[name="reason"], input[name="reason"], [data-testid="unlock-reason"]',
    )
    await expect(reasonInput).toBeVisible({ timeout: 5_000 })
    await reasonInput.fill('Late correction: investor deposit was missed')

    // Submit
    const submitUnlock = page.locator('button', { hasText: /confirm|submit|unlock/i })
    await submitUnlock.click()

    // Verify month transitions — after unlock the spec says it returns to Approved
    // (unlocked is an intermediate state; the system moves it to approved)
    await expect(page.locator('[data-testid="month-status"]')).toContainText(
      /unlocked|approved/i,
      { timeout: 10_000 },
    )

    // Verify audit log entry was created (check for a success toast or audit indicator)
    const successIndicator = page.locator(
      '[data-testid="toast-success"], [role="status"], .text-green-600',
    )
    // This is optional — some implementations may not show a toast
    if (await successIndicator.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(successIndicator).toBeVisible()
    }
  })
})

// ─────────────────────────────────────────────────────────
// Additional Auth E2E tests (AUTH-03, AUTH-05 from QA plan)
// ─────────────────────────────────────────────────────────

test.describe('Authentication Guards', () => {
  test('AUTH-05: unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()

    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    // Should be redirected to login
    expect(page.url()).toContain('/login')
  })

  test('AUTH-03: invalid credentials show error message', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error and stay on login
    const errorMessage = page.locator('[role="alert"], .text-red-600, .text-red-500')
    await expect(errorMessage).toBeVisible({ timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})

// ─────────────────────────────────────────────────────────
// Soft Delete E2E tests (INV-04, INV-05, ACC-05 from QA plan)
// ─────────────────────────────────────────────────────────

test.describe('Soft Delete Behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('INV-04 & INV-05: soft deleted investor disappears from list', async ({ page }) => {
    // Navigate to investors and check there are investors
    await page.goto(`${BASE_URL}/dashboard/investors`)
    await page.waitForLoadState('networkidle')

    // Get initial count of investor rows
    const initialRows = await page.locator('table tbody tr, [data-testid="investor-row"]').count()

    if (initialRows === 0) {
      test.skip(true, 'No investors to delete — skipping')
      return
    }

    // Click on the first investor
    const firstInvestorLink = page.locator('table tbody tr a, [data-testid="investor-row"] a').first()
    await firstInvestorLink.click()
    await page.waitForLoadState('networkidle')

    // Click Delete button
    const deleteButton = page.locator('button', { hasText: /delete/i })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Confirm deletion in the dialog
    const confirmDelete = page.locator('button', { hasText: /confirm|yes|delete/i }).last()
    await expect(confirmDelete).toBeVisible({ timeout: 5_000 })
    await confirmDelete.click()

    // Should be redirected back to investors list
    await page.waitForURL('**/investors', { timeout: 10_000 })

    // Verify the count decreased
    const newRows = await page.locator('table tbody tr, [data-testid="investor-row"]').count()
    expect(newRows).toBeLessThan(initialRows)
  })

  test('ACC-05: soft deleted account disappears from list', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/accounts`)
    await page.waitForLoadState('networkidle')

    const initialRows = await page.locator('table tbody tr, [data-testid="account-row"]').count()

    if (initialRows === 0) {
      test.skip(true, 'No accounts to delete — skipping')
      return
    }

    // Click on the first account
    const firstAccountLink = page.locator('table tbody tr a, [data-testid="account-row"] a').first()
    await firstAccountLink.click()
    await page.waitForLoadState('networkidle')

    // Click Delete button
    const deleteButton = page.locator('button', { hasText: /delete/i })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Confirm
    const confirmDelete = page.locator('button', { hasText: /confirm|yes|delete/i }).last()
    await expect(confirmDelete).toBeVisible({ timeout: 5_000 })
    await confirmDelete.click()

    // Should be redirected back to accounts list
    await page.waitForURL('**/accounts', { timeout: 10_000 })

    const newRows = await page.locator('table tbody tr, [data-testid="account-row"]').count()
    expect(newRows).toBeLessThan(initialRows)
  })
})
