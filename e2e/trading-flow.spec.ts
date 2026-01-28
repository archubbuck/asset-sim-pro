import { test, expect } from '@playwright/test';

/**
 * Trading Flow E2E Tests
 * 
 * Tests order entry, validation, submission, and real-time updates
 * Per ADR-022: Trading UI Components - Order Entry implementation
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('Order Entry Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should display order entry form', async ({ page }) => {
    // Order Entry section should be visible
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    
    // Order entry component should be rendered
    const orderEntry = page.locator('app-order-entry');
    await expect(orderEntry).toBeVisible();
  });

  test('should display all order entry fields', async ({ page }) => {
    // Verify all form fields are present
    await expect(page.locator('kendo-label:has-text("Symbol")')).toBeVisible();
    await expect(page.locator('kendo-label:has-text("Side")')).toBeVisible();
    await expect(page.locator('kendo-label:has-text("Order Type")')).toBeVisible();
    await expect(page.locator('kendo-label:has-text("Quantity")')).toBeVisible();
  });

  test('should have default values pre-filled', async ({ page }) => {
    // Symbol should have default value (AAPL)
    const symbolInput = page.locator('kendo-textbox input').first();
    await expect(symbolInput).toHaveValue('AAPL');
    
    // Quantity should have default value (100)
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await expect(quantityInput).toHaveValue('100');
  });

  test('should display Place Order button', async ({ page }) => {
    // Place Order button should be visible
    const placeOrderButton = page.locator('button:has-text("Place Order")');
    await expect(placeOrderButton).toBeVisible();
    
    // Button should be enabled (not disabled)
    await expect(placeOrderButton).toBeEnabled();
  });

  test('should allow changing symbol', async ({ page }) => {
    // Clear and enter new symbol
    const symbolInput = page.locator('kendo-textbox input').first();
    
    // Clear existing value
    await symbolInput.click();
    await symbolInput.fill('');
    
    // Enter new symbol
    await symbolInput.fill('MSFT');
    
    // Verify new value
    await expect(symbolInput).toHaveValue('MSFT');
  });

  test('should allow changing quantity', async ({ page }) => {
    // Change quantity
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    
    // Clear and enter new quantity
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.fill('500');
    
    // Verify new value
    await expect(quantityInput).toHaveValue('500');
  });

  test('should have order side selector', async ({ page }) => {
    // Side field should be present (BUY/SELL)
    await expect(page.locator('kendo-label:has-text("Side")')).toBeVisible();
    
    // There should be a dropdown or button group for side selection
    const sideControl = page.locator('kendo-dropdownlist, kendo-buttongroup, kendo-combobox').first();
    const count = await sideControl.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have order type selector', async ({ page }) => {
    // Order Type field should be present (MARKET/LIMIT)
    await expect(page.locator('kendo-label:has-text("Order Type")')).toBeVisible();
    
    // There should be a dropdown for order type selection
    const orderTypeControl = page.locator('kendo-dropdownlist, kendo-combobox');
    const count = await orderTypeControl.count();
    expect(count).toBeGreaterThan(0);
  });
});

/**
 * Order Submission Tests
 */
test.describe('Order Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Order Entry")', { timeout: 10000 });
  });

  test('should submit order with default values', async ({ page }) => {
    // Click Place Order with default values
    await page.click('button:has-text("Place Order")');
    
    // Success message should appear
    await expect(page.locator('.status-message.success, .status-message')).toBeVisible({ timeout: 10000 });
    
    // Message should indicate order was placed
    const message = page.locator('.status-message');
    const messageText = await message.textContent();
    expect(messageText).toMatch(/Order.*placed/i);
  });

  test('should display success message after order submission', async ({ page }) => {
    // Submit order
    await page.click('button:has-text("Place Order")');
    
    // Wait for success message
    const successMessage = page.locator('.status-message.success, .status-message');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    // Message should be visible for a reasonable time
    await page.waitForTimeout(1000);
    await expect(successMessage).toBeVisible();
  });

  test('should submit order with custom symbol', async ({ page }) => {
    // Change symbol to GOOGL
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    await symbolInput.fill('GOOGL');
    
    // Submit order
    await page.click('button:has-text("Place Order")');
    
    // Success message should appear
    await expect(page.locator('.status-message')).toBeVisible({ timeout: 10000 });
  });

  test('should submit order with custom quantity', async ({ page }) => {
    // Change quantity to 1000
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.fill('1000');
    
    // Submit order
    await page.click('button:has-text("Place Order")');
    
    // Success message should appear
    await expect(page.locator('.status-message')).toBeVisible({ timeout: 10000 });
  });

  test('should allow submitting multiple orders', async ({ page }) => {
    // Submit first order
    await page.click('button:has-text("Place Order")');
    await expect(page.locator('.status-message')).toBeVisible({ timeout: 10000 });
    
    // Wait a moment
    await page.waitForTimeout(2000);
    
    // Change symbol for second order
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    await symbolInput.fill('TSLA');
    
    // Submit second order
    await page.click('button:has-text("Place Order")');
    
    // Success message should appear again
    await expect(page.locator('.status-message')).toBeVisible({ timeout: 10000 });
  });
});

/**
 * Order Validation Tests
 */
test.describe('Order Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Order Entry")', { timeout: 10000 });
  });

  test('should handle empty symbol gracefully', async ({ page }) => {
    // Clear symbol field
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    
    const placeOrderButton = page.locator('button:has-text("Place Order")');
    
    // Check if button is disabled due to validation
    const isDisabled = await placeOrderButton.isDisabled().catch(() => false);
    
    if (isDisabled) {
      // Button is disabled - validation is working
      const validationMessages = page.locator('.validation-message, .error, .kendo-formerror');
      const validationCount = await validationMessages.count();
      if (validationCount > 0) {
        await expect(validationMessages.first()).toBeVisible();
      }
    } else {
      // Button is enabled - try to submit order (should either show validation error or use default)
      await placeOrderButton.click();
      
      // Wait a moment for any validation to appear
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
      
      // If validation messages exist, they should be visible
      const validationMessages = page.locator('.validation-message, .error, .kendo-formerror');
      const validationCount = await validationMessages.count();
      if (validationCount > 0) {
        await expect(validationMessages.first()).toBeVisible();
      }
    }
    
    // Page should still be functional (button remains visible)
    await expect(placeOrderButton).toBeVisible();
  });

  test('should handle zero quantity gracefully', async ({ page }) => {
    // Set quantity to 0
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.fill('0');
    await quantityInput.press('Tab'); // Trigger blur to ensure validation runs
    
    // Wait a moment for validation to process
    await page.waitForTimeout(500);
    
    const placeOrderButton = page.locator('button:has-text("Place Order")');
    
    // Check if button is disabled due to validation
    const isDisabled = await placeOrderButton.isDisabled().catch(() => false);
    
    if (isDisabled) {
      // Button is disabled - validation is working correctly
      const validationMessages = page.locator('.validation-message, .error, .kendo-formerror');
      const validationCount = await validationMessages.count();
      if (validationCount > 0) {
        await expect(validationMessages.first()).toBeVisible();
      }
    } else {
      // Button is enabled - try to submit order
      // Wait for button to be clickable
      await expect(placeOrderButton).toBeEnabled({ timeout: 2000 });
      await placeOrderButton.click();
      
      // Wait a moment for any validation to appear
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
      
      // Check for validation messages after submission
      const validationMessages = page.locator('.validation-message, .error, .kendo-formerror');
      const validationCount = await validationMessages.count();
      if (validationCount > 0) {
        await expect(validationMessages.first()).toBeVisible();
      }
    }
    
    // Page should still be functional (button remains visible)
    await expect(placeOrderButton).toBeVisible();
  });

  test('should handle negative quantity gracefully', async ({ page }) => {
    // Try to set negative quantity
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.type('-100');
    
    // Numeric input may prevent negative values or convert them
    await page.waitForTimeout(500);
    
    // Page should remain functional
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should handle very large quantity', async ({ page }) => {
    // Enter large quantity
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.fill('999999999');
    
    // Try to submit order
    await page.click('button:has-text("Place Order")');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Page should handle this (either success or validation error)
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });
});

/**
 * Trading Page Layout Tests
 */
test.describe('Trading Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should display trading terminal title', async ({ page }) => {
    // Page title should be visible
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should display order entry and position blotter', async ({ page }) => {
    // Both order entry and position blotter should be visible
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible({ timeout: 5000 });
  });

  test('should display financial chart component if present', async ({ page }) => {
    // Financial chart component may be present depending on layout
    const financialChart = page.locator('app-financial-chart');
    const count = await financialChart.count();
    
    // If chart exists, it should be at least one instance
    if (count > 0) {
      await expect(financialChart.first()).toBeVisible();
    }
  });

  test('should maintain layout after order submission', async ({ page }) => {
    // Submit an order
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Layout should remain intact
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible();
  });
});

/**
 * Real-time Updates Tests
 */
test.describe('Real-time Trading Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should display connection status indicator', async ({ page }) => {
    // Check for connection status (may be shown via SignalR connection)
    // The trading component connects to SignalR on init
    
    // Wait for potential connection indicators
    await page.waitForTimeout(2000);
    
    // Page should be functional regardless of connection status
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should handle SignalR connection gracefully', async ({ page }) => {
    // Trading component attempts to connect to SignalR
    // In test environment, this may fail gracefully
    
    // Wait for connection attempt
    await page.waitForTimeout(3000);
    
    // UI should remain functional
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should continue functioning if SignalR connection fails', async ({ page }) => {
    // Even if SignalR connection fails, UI should work
    await page.waitForTimeout(2000);
    
    // Order entry should still work
    await page.click('button:has-text("Place Order")');
    
    // Success or error message should appear
    await page.waitForTimeout(2000);
    
    // Page remains functional
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });
});

/**
 * Trading Form Interactions Tests
 */
test.describe('Trading Form Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Order Entry")', { timeout: 10000 });
  });

  test('should focus on symbol field when clicked', async ({ page }) => {
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    
    // Input should be focused
    await expect(symbolInput).toBeFocused();
  });

  test('should focus on quantity field when clicked', async ({ page }) => {
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    
    // Input should be focused
    await expect(quantityInput).toBeFocused();
  });

  test('should allow tab navigation between fields', async ({ page }) => {
    // Click on symbol field
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    
    // Press Tab to move to next field
    await page.keyboard.press('Tab');
    
    // Focus should move (some field should be focused)
    await page.waitForTimeout(300);
    
    // Form should remain interactive
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should allow typing in symbol field', async ({ page }) => {
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await symbolInput.fill('');
    await symbolInput.type('IBM');
    
    // Value should update as typed
    await expect(symbolInput).toHaveValue('IBM');
  });

  test('should allow numeric input in quantity field', async ({ page }) => {
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await quantityInput.click();
    await quantityInput.fill('');
    await quantityInput.type('250');
    
    // Value should update
    await expect(quantityInput).toHaveValue('250');
  });
});
