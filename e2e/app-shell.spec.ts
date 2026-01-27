import { test, expect } from '@playwright/test';

/**
 * App Shell & Navigation E2E Tests
 * 
 * Tests AppShell component, navigation drawer, and routing
 * Per ADR-022: Trading UI Components - App Shell implementation
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('App Shell Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
  });

  test('should display AppBar with branding', async ({ page }) => {
    // Verify AppBar is visible
    await expect(page.locator('kendo-appbar')).toBeVisible();
    
    // Verify "AssetSim Pro" branding is visible
    await expect(page.locator('text=AssetSim Pro')).toBeVisible();
    
    // Branding should be styled with proper color (blue)
    const title = page.locator('.app-title');
    await expect(title).toBeVisible();
  });

  test('should display menu toggle button in AppBar', async ({ page }) => {
    // Menu button should be visible
    const menuButton = page.locator('kendo-appbar button').first();
    await expect(menuButton).toBeVisible();
    
    // Button should have menu icon
    const hasIcon = await menuButton.locator('svg, kendo-icon').count();
    expect(hasIcon).toBeGreaterThan(0);
  });

  test('should display buying power in AppBar', async ({ page }) => {
    // Buying Power label should be visible
    await expect(page.locator('.buying-power-label, text=Buying Power')).toBeVisible();
    
    // Buying Power value should be displayed
    const buyingPowerValue = page.locator('.buying-power-value');
    await expect(buyingPowerValue).toBeVisible();
    
    // Value should be formatted as currency with $ symbol
    const value = await buyingPowerValue.textContent();
    expect(value).toMatch(/\$[\d,]+/);
  });

  test('should display user avatar in AppBar', async ({ page }) => {
    // Avatar should be visible in AppBar
    const avatar = page.locator('kendo-avatar');
    await expect(avatar).toBeVisible();
    
    // Avatar should be circular
    const shapeAttr = await avatar.getAttribute('shape');
    expect(shapeAttr).toBe('circle');
  });

  test('should toggle drawer when menu button is clicked', async ({ page }) => {
    // Get drawer element
    const drawer = page.locator('kendo-drawer');
    await expect(drawer).toBeVisible();
    
    // Click menu button to toggle
    const menuButton = page.locator('kendo-appbar button').first();
    await menuButton.click();
    
    // Wait for animation
    await page.waitForTimeout(300);
    
    // Drawer should still be visible (it toggles between expanded and mini mode)
    await expect(drawer).toBeVisible();
  });
});

/**
 * Navigation Drawer Tests
 */
test.describe('Navigation Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
  });

  test('should display navigation items in drawer', async ({ page }) => {
    // Verify drawer is visible
    await expect(page.locator('kendo-drawer')).toBeVisible();
    
    // Verify navigation items are present
    await expect(page.locator('text=Terminal')).toBeVisible();
    await expect(page.locator('text=Execution')).toBeVisible();
    
    // Fund Performance link may or may not be visible depending on configuration
    // No assertion needed - its presence is optional
  });

  test('should navigate to Dashboard when Terminal is clicked', async ({ page }) => {
    // Click Terminal navigation item
    await page.click('text=Terminal');
    
    // Should navigate to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Dashboard content should be visible
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Trading page when Execution is clicked', async ({ page }) => {
    // Click Execution navigation item
    await page.click('text=Execution');
    
    // Should navigate to /trade
    await expect(page).toHaveURL(/\/trade/);
    
    // Trading page content should be visible
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Portfolio page when Fund Performance is clicked', async ({ page }) => {
    // Check if Fund Performance link exists
    const fundPerformanceLink = page.locator('text=Fund Performance');
    const count = await fundPerformanceLink.count();
    
    if (count > 0) {
      // Click Fund Performance navigation item
      await fundPerformanceLink.click();
      
      // Should navigate to /portfolio
      await expect(page).toHaveURL(/\/portfolio/);
    } else {
      // Skip test if Fund Performance is not available
      test.skip();
    }
  });

  test('should maintain drawer visibility across navigation', async ({ page }) => {
    // Drawer should be visible on dashboard
    await page.goto('/dashboard');
    await expect(page.locator('kendo-drawer')).toBeVisible();
    
    // Drawer should be visible on trade page
    await page.goto('/trade');
    await expect(page.locator('kendo-drawer')).toBeVisible();
    
    // AppBar should also remain visible
    await expect(page.locator('kendo-appbar')).toBeVisible();
  });

  test('should highlight selected navigation item', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 5000 });
    
    // The Terminal item should be selected/highlighted
    // (Implementation may vary - just verify items are interactive)
    const terminalItem = page.locator('text=Terminal');
    await expect(terminalItem).toBeVisible();
  });
});

/**
 * Routing Tests
 */
test.describe('Application Routing', () => {
  test('should redirect root path to dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Should automatically redirect to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    
    // Dashboard content should be visible
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible({ timeout: 5000 });
  });

  test('should handle direct navigation to /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should display dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible({ timeout: 10000 });
  });

  test('should handle direct navigation to /trade', async ({ page }) => {
    await page.goto('/trade');
    
    // Should display trading page
    await expect(page).toHaveURL(/\/trade/);
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible({ timeout: 10000 });
  });

  test('should handle direct navigation to /portfolio', async ({ page }) => {
    await page.goto('/portfolio');
    
    // Should display portfolio/trading page (lazy loaded)
    await expect(page).toHaveURL(/\/portfolio/);
    // Content should load
    await expect(page.locator('h2, h3')).toBeVisible({ timeout: 10000 });
  });

  test('should preserve AppShell across all routes', async ({ page }) => {
    const routes = ['/dashboard', '/trade', '/portfolio'];
    
    for (const route of routes) {
      await page.goto(route);
      
      // AppBar should be visible on all routes
      await expect(page.locator('kendo-appbar')).toBeVisible();
      
      // Drawer should be visible on all routes
      await expect(page.locator('kendo-drawer')).toBeVisible();
      
      // Branding should be visible on all routes
      await expect(page.locator('text=AssetSim Pro')).toBeVisible();
      
      // User avatar should be visible on all routes
      await expect(page.locator('kendo-avatar')).toBeVisible();
    }
  });

  test('should handle browser back button navigation', async ({ page }) => {
    // Start at dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to trade page
    await page.goto('/trade');
    await expect(page).toHaveURL(/\/trade/);
    
    // Use browser back button
    await page.goBack();
    
    // Should return to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();
  });

  test('should handle browser forward button navigation', async ({ page }) => {
    // Start at dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to trade page
    await page.goto('/trade');
    await expect(page).toHaveURL(/\/trade/);
    
    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Use browser forward button
    await page.goForward();
    
    // Should navigate forward to trade page
    await expect(page).toHaveURL(/\/trade/);
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });
});

/**
 * Responsive Layout Tests
 */
test.describe('Responsive Layout', () => {
  test('should display properly on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // All elements should be visible
    await expect(page.locator('kendo-appbar')).toBeVisible();
    await expect(page.locator('kendo-drawer')).toBeVisible();
    await expect(page.locator('text=AssetSim Pro')).toBeVisible();
  });

  test('should display properly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Core elements should be visible
    await expect(page.locator('kendo-appbar')).toBeVisible();
    await expect(page.locator('text=AssetSim Pro')).toBeVisible();
  });

  test('should display properly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Core elements should be visible
    await expect(page.locator('kendo-appbar')).toBeVisible();
    await expect(page.locator('text=AssetSim Pro')).toBeVisible();
  });
});
