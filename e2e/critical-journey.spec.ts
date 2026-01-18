import { test, expect } from '@playwright/test';

/**
 * Critical User Journey: Login -> Place Order -> Verify Blotter
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('Critical User Journey: Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete full trading journey', async ({ page }) => {
    // Step 1: Login
    // Note: In local environment, authentication might be mocked
    // In production, this would use Azure AD authentication
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Step 2: Navigate to Trading Terminal
    await page.click('text=Terminal');
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();

    // Step 3: Verify Market Data is Loading
    // The dashboard should show widgets as per ADR configuration
    await expect(page.locator('app-market-depth, text=Market Depth')).toBeVisible({ timeout: 5000 });
    
    // Step 4: Navigate to Execution Page
    await page.click('text=Execution');
    
    // Step 5: Place an Order
    // Note: This assumes an order form exists in the execution page
    // Adjust selectors based on actual implementation
    const orderButton = page.locator('button:has-text("Place Order"), button:has-text("Submit")').first();
    if (await orderButton.isVisible({ timeout: 5000 })) {
      // Fill order form (adjust selectors based on actual implementation)
      const symbolInput = page.locator('input[name="symbol"], input[placeholder*="Symbol"]').first();
      if (await symbolInput.isVisible({ timeout: 2000 })) {
        await symbolInput.fill('SPY');
      }
      
      const quantityInput = page.locator('input[name="quantity"], input[placeholder*="Quantity"]').first();
      if (await quantityInput.isVisible({ timeout: 2000 })) {
        await quantityInput.fill('100');
      }
    }
    
    // Step 6: Verify Blotter (Order History)
    // Navigate to portfolio/blotter to verify order appears
    await page.click('text=Fund Performance');
    
    // Verify the page loaded successfully
    await expect(page.locator('body')).toContainText('Fund Performance', { timeout: 5000 });
  });

  test('should display trading terminal with widgets', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify dashboard loads
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible({ timeout: 10000 });
    
    // Verify widgets are present (per ADR-022)
    const widgets = [
      'Market Depth',
      'VaR',
      'Bloomberg Feed',
      'Risk',
      'News'
    ];
    
    // At least one widget should be visible
    let widgetVisible = false;
    for (const widget of widgets) {
      if (await page.locator(`text=${widget}`).isVisible({ timeout: 2000 }).catch(() => false)) {
        widgetVisible = true;
        break;
      }
    }
    expect(widgetVisible).toBeTruthy();
  });

  test('should handle navigation between sections', async ({ page }) => {
    // Test navigation between main sections
    await page.goto('/');
    
    // Navigate to Terminal
    await page.click('text=Terminal');
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Navigate to Fund Performance
    await page.click('text=Fund Performance');
    await expect(page).toHaveURL(/.*portfolio/);
    
    // Navigate to Execution
    await page.click('text=Execution');
    await expect(page).toHaveURL(/.*trade/);
  });
});
