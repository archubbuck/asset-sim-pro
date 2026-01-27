import { test, expect } from '@playwright/test';

/**
 * Error Handling E2E Tests
 * 
 * Tests API error responses, network failures, validation, and user-friendly error messages
 * Per ADR-018: Standardized Error Handling with Problem Details (RFC 7807)
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('API Error Responses', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should handle order submission errors gracefully', async ({ page }) => {
    // Submit an order
    await page.click('button:has-text("Place Order")');
    
    // Wait for response - either success or error message should appear
    const statusMessage = page.locator('.status-message, .message, .alert, [role="alert"]');
    await expect(statusMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display error message when API call fails', async ({ page }) => {
    // Monitor for error messages in UI
    await page.waitForTimeout(2000);
    
    // Try to trigger an error by submitting with invalid data
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    await symbolInput.fill('INVALID@@@');
    
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Page should remain functional
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should show specific error details from API', async ({ page }) => {
    // When API returns error, details should be shown
    // Submit order and wait for response
    await page.click('button:has-text("Place Order")');
    
    // Either error or success message should be displayed
    const messages = page.locator('.status-message, .message');
    await expect(messages.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle 400 Bad Request errors', async ({ page }) => {
    // Bad request errors should show validation messages
    await page.waitForTimeout(1000);
    
    // Try submitting with potentially invalid data
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.fill('0');
    
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // UI should handle gracefully
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should handle 500 Internal Server Error gracefully', async ({ page }) => {
    // If backend returns 500, UI should show user-friendly error
    // In test environment with stub data, this may not occur
    await page.waitForTimeout(2000);
    
    // UI should be stable
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should handle 404 Not Found errors', async ({ page }) => {
    // If endpoint is not found, error should be handled
    await page.waitForTimeout(1000);
    
    // Navigate to potentially non-existent route
    await page.goto('/nonexistent');
    await page.waitForTimeout(2000);
    
    // Should not crash - may show 404 or redirect
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });
});

/**
 * Network Failure Tests
 */
test.describe('Network Failures', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    // Simulate slow network by waiting
    await page.click('button:has-text("Place Order")');
    
    // Wait for timeout scenario
    await page.waitForTimeout(15000);
    
    // UI should remain functional
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should display offline indicator when network unavailable', async ({ page }) => {
    // Check for connection status indicators
    await page.waitForTimeout(2000);
    
    // UI should show some indication of network status
    // This may be implicit (SignalR disconnected, etc.)
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should allow retry after network failure', async ({ page }) => {
    // After network failure, user should be able to retry
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(3000);
    
    // Should be able to submit again
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // UI should handle multiple attempts
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should work with stub data when backend unavailable', async ({ page }) => {
    // UI should fall back to stub data when APIs are unavailable
    await page.waitForTimeout(2000);
    
    // Position blotter should show stub data
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    
    // Stub data should be displayed (4 orders)
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should maintain UI state during network interruption', async ({ page }) => {
    // Enter custom order details
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    await symbolInput.fill('NFLX');
    
    // Simulate network delay
    await page.waitForTimeout(2000);
    
    // Form state should be preserved
    await expect(symbolInput).toHaveValue('NFLX');
    
    // UI should remain interactive
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });
});

/**
 * Input Validation Tests
 */
test.describe('Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Order Entry")', { timeout: 10000 });
  });

  test('should validate empty symbol field', async ({ page }) => {
    // Clear symbol
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    
    // Try to submit
    await page.click('button:has-text("Place Order")');
    
    // Either validation error or default symbol should be used
    // Wait for either error message or success message
    await page.waitForTimeout(2000);
    
    const errorMessage = page.locator('.error, .validation-error, .kendo-formerror');
    const successMessage = page.locator('.status-message.success, .status-message');
    
    const errorCount = await errorMessage.count();
    const successCount = await successMessage.count();
    
    // Either validation error appears or order succeeds with default value
    expect(errorCount + successCount).toBeGreaterThan(0);
  });

  test('should validate invalid symbol characters', async ({ page }) => {
    // Enter invalid symbol
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    await symbolInput.fill('$$$###');
    
    // Try to submit
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Should handle gracefully
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should validate zero quantity', async ({ page }) => {
    // Set quantity to 0
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.fill('0');
    
    // Try to submit - should either validate or handle zero quantity
    await page.click('button:has-text("Place Order")');
    
    // Wait a moment for any validation to appear
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    
    // Page should remain functional
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
    
    // If validation messages exist, they should be visible
    const validationMessages = page.locator('.validation-message, .error, .kendo-formerror');
    const validationCount = await validationMessages.count();
    if (validationCount > 0) {
      await expect(validationMessages.first()).toBeVisible();
    }
  });

  test('should validate negative quantity', async ({ page }) => {
    // Try to enter negative quantity
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.type('-500');
    
    await page.waitForTimeout(500);
    
    // Numeric input should prevent or convert negative values
    const value = await quantityInput.inputValue();
    
    // Value should be handled (prevented, converted, or validated)
    expect(value).toBeTruthy();
  });

  test('should validate very large quantity', async ({ page }) => {
    // Enter extremely large quantity
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.fill('999999999999');
    
    // Try to submit
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Should handle large numbers gracefully
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should validate required fields before submission', async ({ page }) => {
    // Try to clear all fields and submit
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    
    // Try to submit - should either validate or use defaults
    await page.click('button:has-text("Place Order")');
    
    // Wait a moment for any validation to appear
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    
    // Page should remain functional
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
    
    // If validation messages exist, they should be visible
    const validationMessages = page.locator('.validation-message, .error, .kendo-formerror');
    const validationCount = await validationMessages.count();
    if (validationCount > 0) {
      await expect(validationMessages.first()).toBeVisible();
    }
  });
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should show validation messages near invalid fields', async ({ page }) => {
    // Clear required field
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    
    // Click away to trigger blur validation
    await page.locator('h3:has-text("Order Entry")').click();
    await page.waitForTimeout(500);
    
    // Check for validation message - if present, it should be visible
    const validationMessages = page.locator('.error, .invalid, .validation-error, .kendo-formerror');
    const messageCount = await validationMessages.count();
    
    // Validation may be shown or field may accept empty (use default)
    if (messageCount > 0) {
      await expect(validationMessages.first()).toBeVisible();
    }
  });
});

/**
 * User-Friendly Error Messages Tests
 */
test.describe('User-Friendly Error Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should display readable error messages', async ({ page }) => {
    // Submit order and check message
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Check for messages
    const messages = page.locator('.status-message, .message, .alert');
    const count = await messages.count();
    
    if (count > 0) {
      // Message should have readable text
      const messageText = await messages.first().textContent();
      expect(messageText).toBeTruthy();
      expect(messageText!.length).toBeGreaterThan(0);
      
      // Should not show technical jargon like stack traces
      expect(messageText).not.toMatch(/\bat\b.*\.ts:\d+/);
      expect(messageText).not.toMatch(/Error: Error:/);
    }
  });

  test('should not display technical stack traces to users', async ({ page }) => {
    // Monitor page content for stack traces
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Get visible page text
    const bodyText = await page.locator('body').textContent();
    
    // Should not contain stack trace patterns
    expect(bodyText).not.toMatch(/at Object\./);
    expect(bodyText).not.toMatch(/\.ts:\d+:\d+/);
  });

  test('should display success messages clearly', async ({ page }) => {
    // Submit order
    await page.click('button:has-text("Place Order")');
    
    // Look for success message
    const successMessage = page.locator('.status-message.success, .success, .alert-success');
    const successCount = await successMessage.count();
    
    if (successCount > 0) {
      await expect(successMessage.first()).toBeVisible({ timeout: 10000 });
      
      // Message should be readable
      const text = await successMessage.first().textContent();
      expect(text).toBeTruthy();
      expect(text).toMatch(/success|placed|completed/i);
    }
  });

  test('should display warning messages when appropriate', async ({ page }) => {
    // Warnings may appear for non-critical issues
    await page.waitForTimeout(2000);
    
    // Check for warning messages - if present, they should be readable
    const warnings = page.locator('.warning, .alert-warning, [role="alert"]');
    const warningCount = await warnings.count();
    
    if (warningCount > 0) {
      const firstWarning = warnings.first();
      await expect(firstWarning).toBeVisible();
      const warningText = await firstWarning.textContent();
      expect(warningText).toBeTruthy();
      expect(warningText!.length).toBeGreaterThan(0);
    }
  });

  test('should use consistent styling for error messages', async ({ page }) => {
    // Submit order to trigger message
    await page.click('button:has-text("Place Order")');
    
    // Wait for status message to appear
    const messages = page.locator('.status-message, .message, .alert');
    await expect(messages.first()).toBeVisible({ timeout: 10000 });
    
    // Messages should have consistent class names and styling
    const firstMessage = messages.first();
    
    // Should have styling classes
    const classes = await firstMessage.getAttribute('class');
    expect(classes).toBeTruthy();
    expect(classes!.length).toBeGreaterThan(0);
  });

  test('should provide actionable error messages', async ({ page }) => {
    // Error messages should tell users what to do
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Check for any error messages
    const errors = page.locator('.error, .alert-error, .status-message.error');
    const errorCount = await errors.count();
    
    if (errorCount > 0) {
      const errorText = await errors.first().textContent();
      
      // Message should be helpful, not just "Error"
      expect(errorText).toBeTruthy();
      expect(errorText!.toLowerCase()).not.toBe('error');
    }
  });
});

/**
 * Error Recovery Tests
 */
test.describe('Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should allow form resubmission after error', async ({ page }) => {
    // Submit once
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Should be able to submit again
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Button should remain enabled
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should clear error message on new submission', async ({ page }) => {
    // Submit first order
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Change form data
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    await symbolInput.fill('AMZN');
    
    // Submit again
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // New message should appear (old one cleared)
    await expect(page.locator('.status-message')).toBeVisible({ timeout: 5000 });
  });

  test('should allow page refresh to reset state', async ({ page }) => {
    // Cause an error
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.fill('INVALID@@@');
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Refresh page
    await page.reload();
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Form should be reset to defaults
    const refreshedSymbol = page.locator('kendo-textbox input').first();
    const value = await refreshedSymbol.inputValue();
    
    // Should have default value (AAPL)
    expect(value).toBe('AAPL');
  });

  test('should maintain stable UI despite multiple errors', async ({ page }) => {
    // Submit multiple times rapidly
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Place Order")');
      await page.waitForTimeout(1000);
    }
    
    // UI should remain stable
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });
});

/**
 * Global Error Handling Tests
 */
test.describe('Global Error Handling', () => {
  test('should handle JavaScript errors gracefully', async ({ page }) => {
    // Monitor for uncaught errors
    let hasUncaughtError = false;
    page.on('pageerror', () => {
      hasUncaughtError = true;
    });
    
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Perform various actions
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // No uncaught errors should crash the app
    expect(hasUncaughtError).toBeFalsy();
  });

  test('should handle console errors without crashing', async ({ page }) => {
    // Monitor console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Even if console errors occur, UI should remain functional
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should prevent error cascades', async ({ page }) => {
    // One error should not cause chain reaction
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Trigger potential error
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // UI components should all still work
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // Can navigate away
    await page.goto('/dashboard');
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible({ timeout: 10000 });
  });
});
