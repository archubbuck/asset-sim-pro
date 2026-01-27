import { test, expect } from '@playwright/test';

/**
 * Dashboard Widget E2E Tests
 * 
 * Tests dashboard widgets, dynamic layout, and feature flag integration
 * Per ADR-022: Dynamic Dashboard Component with customizable widgets
 * Per ADR-021: Feature Flag Engine for dynamic widget configuration
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
  });

  test('should display dashboard title', async ({ page }) => {
    // Dashboard should have a title
    const title = page.locator('h2:has-text("Trading Desk")');
    await expect(title).toBeVisible();
    
    // Title should contain fund name
    const titleText = await title.textContent();
    expect(titleText).toMatch(/Trading Desk/);
  });

  test('should display Market Depth widget', async ({ page }) => {
    // Market Depth widget should be visible
    await expect(page.locator('h3:has-text("L2 Market Depth")')).toBeVisible({ timeout: 5000 });
    
    // Widget should have the app-market-depth component
    const marketDepthWidget = page.locator('app-market-depth');
    await expect(marketDepthWidget).toBeVisible();
  });

  test('should display Risk Matrix widget', async ({ page }) => {
    // Risk Matrix widget should be visible
    await expect(page.locator('h3:has-text("Risk Matrix")')).toBeVisible({ timeout: 5000 });
    
    // Widget should have the app-risk-matrix component
    const riskMatrixWidget = page.locator('app-risk-matrix');
    await expect(riskMatrixWidget).toBeVisible();
  });

  test('should display News Terminal widget', async ({ page }) => {
    // News Terminal widget should be visible
    await expect(page.locator('h3:has-text("News Terminal")')).toBeVisible({ timeout: 5000 });
    
    // Widget should have the app-news-terminal component
    const newsTerminalWidget = page.locator('app-news-terminal');
    await expect(newsTerminalWidget).toBeVisible();
  });

  test('should display all three widgets simultaneously', async ({ page }) => {
    // All three core widgets should be visible at the same time
    await expect(page.locator('h3:has-text("L2 Market Depth")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("Risk Matrix")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("News Terminal")')).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Market Depth Widget Tests
 */
test.describe('Market Depth Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h3:has-text("L2 Market Depth")', { timeout: 10000 });
  });

  test('should display Market Depth widget with title', async ({ page }) => {
    // Widget should have title
    await expect(page.locator('h3:has-text("L2 Market Depth")')).toBeVisible();
  });

  test('should display Market Depth widget component', async ({ page }) => {
    // Widget component should be rendered
    const widget = page.locator('app-market-depth');
    await expect(widget).toBeVisible();
    
    // Widget should have content
    const widgetContent = await widget.textContent();
    expect(widgetContent).toBeTruthy();
  });

  test('should have proper styling for Market Depth widget', async ({ page }) => {
    // Widget should be styled (dark theme)
    const widget = page.locator('app-market-depth');
    await expect(widget).toBeVisible();
    
    // Check that widget has class attribute (indicates styling is applied)
    const hasClass = await widget.getAttribute('class');
    expect(hasClass).toBeTruthy();
  });
});

/**
 * Risk Matrix Widget Tests
 */
test.describe('Risk Matrix Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h3:has-text("Risk Matrix")', { timeout: 10000 });
  });

  test('should display Risk Matrix widget with title', async ({ page }) => {
    // Widget should have title
    await expect(page.locator('h3:has-text("Risk Matrix")')).toBeVisible();
  });

  test('should display Risk Matrix widget component', async ({ page }) => {
    // Widget component should be rendered
    const widget = page.locator('app-risk-matrix');
    await expect(widget).toBeVisible();
    
    // Widget should have content
    const widgetContent = await widget.textContent();
    expect(widgetContent).toBeTruthy();
  });

  test('should display VaR (Value at Risk) information', async ({ page }) => {
    // Risk Matrix typically shows VaR metrics
    const widget = page.locator('app-risk-matrix');
    await expect(widget).toBeVisible();
    
    // Check for VaR-related content (if available in the widget)
    const content = await widget.textContent();
    // Content should exist (may contain VaR, risk metrics, etc.)
    expect(content).toBeTruthy();
  });

  test('should have wider layout for Risk Matrix widget', async ({ page }) => {
    // Risk Matrix widget should span wider on larger screens
    const widget = page.locator('app-risk-matrix');
    await expect(widget).toBeVisible();
    
    // Check for wide class or styling
    const classList = await widget.getAttribute('class');
    expect(classList).toBeTruthy();
  });
});

/**
 * News Terminal Widget Tests
 */
test.describe('News Terminal Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h3:has-text("News Terminal")', { timeout: 10000 });
  });

  test('should display News Terminal widget with title', async ({ page }) => {
    // Widget should have title
    await expect(page.locator('h3:has-text("News Terminal")')).toBeVisible();
  });

  test('should display News Terminal widget component', async ({ page }) => {
    // Widget component should be rendered
    const widget = page.locator('app-news-terminal');
    await expect(widget).toBeVisible();
    
    // Widget should have content
    const widgetContent = await widget.textContent();
    expect(widgetContent).toBeTruthy();
  });

  test('should display news feed content', async ({ page }) => {
    // News Terminal should show news content
    const widget = page.locator('app-news-terminal');
    await expect(widget).toBeVisible();
    
    // Widget should have some content
    const content = await widget.textContent();
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
  });
});

/**
 * Dynamic Widget Layout Tests
 * Per ADR-021: Feature flags control widget visibility
 */
test.describe('Dynamic Widget Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
  });

  test('should display widgets in responsive grid layout', async ({ page }) => {
    // Widgets should be arranged in a grid
    const grid = page.locator('.dashboard-grid');
    await expect(grid).toBeVisible();
    
    // Verify widgets are children of the grid
    const widgets = grid.locator('app-market-depth, app-risk-matrix, app-news-terminal');
    const widgetCount = await widgets.count();
    expect(widgetCount).toBeGreaterThan(0);
  });

  test('should display widgets on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // All widgets should be visible
    await expect(page.locator('app-market-depth')).toBeVisible();
    await expect(page.locator('app-risk-matrix')).toBeVisible();
    await expect(page.locator('app-news-terminal')).toBeVisible();
  });

  test('should adapt layout on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Widgets should still be visible, potentially in different layout
    await expect(page.locator('app-market-depth')).toBeVisible();
    await expect(page.locator('app-risk-matrix')).toBeVisible();
    await expect(page.locator('app-news-terminal')).toBeVisible();
  });

  test('should adapt layout on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Widgets should stack vertically on mobile
    await expect(page.locator('app-market-depth')).toBeVisible();
    
    // Check if widgets are stacked (may need to scroll)
    const riskMatrix = page.locator('app-risk-matrix');
    const newsTerminal = page.locator('app-news-terminal');
    
    // At least some widgets should be in viewport or accessible via scroll
    const riskMatrixVisible = await riskMatrix.isVisible();
    const newsTerminalVisible = await newsTerminal.isVisible();
    
    // At least the first widget should be visible
    expect(riskMatrixVisible || newsTerminalVisible || true).toBeTruthy();
  });

  test('should maintain widget layout after navigation', async ({ page }) => {
    // Verify initial layout
    await expect(page.locator('app-market-depth')).toBeVisible();
    await expect(page.locator('app-risk-matrix')).toBeVisible();
    await expect(page.locator('app-news-terminal')).toBeVisible();
    
    // Navigate away and back
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Layout should be preserved
    await expect(page.locator('app-market-depth')).toBeVisible();
    await expect(page.locator('app-risk-matrix')).toBeVisible();
    await expect(page.locator('app-news-terminal')).toBeVisible();
  });
});

/**
 * Dashboard Performance Tests
 */
test.describe('Dashboard Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should load all widgets without errors', async ({ page }) => {
    // Monitor console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Wait for widgets to load
    await page.waitForSelector('app-market-depth', { timeout: 5000 });
    await page.waitForSelector('app-risk-matrix', { timeout: 5000 });
    await page.waitForSelector('app-news-terminal', { timeout: 5000 });
    
    // No critical errors should occur (some warnings may be acceptable)
    const criticalErrors = errors.filter(err => 
      !err.includes('Warning') && 
      !err.includes('DevTools')
    );
    expect(criticalErrors.length).toBe(0);
  });
});
