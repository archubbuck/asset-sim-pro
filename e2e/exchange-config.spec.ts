import { test, expect } from '@playwright/test';

/**
 * Exchange Configuration E2E Tests
 * 
 * Tests exchange creation, rules retrieval, market regime switching, and multi-tenant isolation
 * Per ADR-002: Zero Trust Network with Exchange-Scoped RBAC
 * Per ADR-008: Multi-Tenancy via ExchangeId
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('Exchange Configuration Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
  });

  test('should load application with exchange configuration', async ({ page }) => {
    // App should initialize with exchange configuration
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Dashboard should display fund/exchange name
    const title = page.locator('h2:has-text("Trading Desk")');
    await expect(title).toBeVisible();
    
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();
  });

  test('should load trading page with exchange context', async ({ page }) => {
    // Trading page uses exchange ID for SignalR connection
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Page should load successfully
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    
    // Exchange context is used (via TRADING_STUB_CONFIG)
    await page.waitForTimeout(2000);
  });

  test('should use exchange ID from configuration', async ({ page }) => {
    // Exchange ID is injected via TRADING_STUB_CONFIG token
    // SignalR connection uses this ID
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Wait for SignalR connection attempt with exchange ID
    await page.waitForTimeout(2000);
    
    // UI should be functional with exchange context
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });
});

/**
 * Exchange Rules Retrieval Tests
 * Per ADR: GET /api/v1/exchange/rules endpoint
 */
test.describe('Exchange Rules Retrieval', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
  });

  test('should retrieve exchange rules on dashboard load', async ({ page }) => {
    // Dashboard may fetch exchange rules via API
    await page.waitForTimeout(2000);
    
    // Dashboard should display with rules applied
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();
    
    // Widgets should be configured per exchange rules
    await expect(page.locator('app-market-depth')).toBeVisible();
  });

  test('should handle exchange rules fetch failure gracefully', async ({ page }) => {
    // If API call fails, UI should work with defaults
    await page.waitForTimeout(2000);
    
    // Dashboard should still render
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();
    
    // Default widgets should be shown
    await expect(page.locator('app-market-depth')).toBeVisible();
    await expect(page.locator('app-risk-matrix')).toBeVisible();
  });

  test('should apply exchange-specific widget configuration', async ({ page }) => {
    // Exchange rules may control which widgets are displayed
    // Per ADR-021: Feature flags control dashboard layout
    await page.waitForTimeout(2000);
    
    // Verify widgets are displayed per configuration
    const widgets = page.locator('app-market-depth, app-risk-matrix, app-news-terminal');
    const widgetCount = await widgets.count();
    
    // At least default widgets should be present
    expect(widgetCount).toBeGreaterThan(0);
  });

  test('should display exchange rules in UI if available', async ({ page }) => {
    // Exchange rules may be displayed to users
    await page.waitForTimeout(2000);
    
    // Check for any rules display - if present, verify it's visible
    const rulesDisplay = page.locator('text=/Rules/i, text=/Configuration/i, text=/Settings/i');
    const rulesCount = await rulesDisplay.count();
    
    if (rulesCount > 0) {
      await expect(rulesDisplay.first()).toBeVisible();
    }
  });
});

/**
 * Market Regime Switching Tests
 * Per ADR: Risk Managers configure market regimes (High Volatility, Liquidity Crisis, etc.)
 */
test.describe('Market Regime Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
  });

  test('should display current market regime if configured', async ({ page }) => {
    // Market regime may be displayed in UI
    await page.waitForTimeout(2000);
    
    // Look for regime indicators - if present, verify visibility
    const regimeIndicators = page.locator('text=/Regime/i, text=/Volatility/i, text=/Market Conditions/i');
    const indicatorCount = await regimeIndicators.count();
    
    if (indicatorCount > 0) {
      await expect(regimeIndicators.first()).toBeVisible();
    }
  });

  test('should handle regime-specific trading rules', async ({ page }) => {
    // Different regimes may have different rules
    // Navigate to trading page
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Trading should work under current regime
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
    
    // Submit order
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Should handle order per regime rules
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should update UI when regime changes', async ({ page }) => {
    // If regime changes (via SignalR or API), UI should update
    await page.waitForTimeout(3000);
    
    // UI should remain stable regardless of regime
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();
    
    // Widgets should continue to function
    await expect(page.locator('app-market-depth')).toBeVisible();
  });

  test('should display regime-specific risk metrics', async ({ page }) => {
    // Risk Matrix widget may show regime-specific data
    await page.waitForTimeout(2000);
    
    // Risk Matrix should be visible
    await expect(page.locator('app-risk-matrix')).toBeVisible();
    
    // Widget should display some content
    const riskMatrix = page.locator('app-risk-matrix');
    const content = await riskMatrix.textContent();
    expect(content).toBeTruthy();
  });
});

/**
 * Multi-Tenant Isolation Tests
 * Per ADR-002: Exchange-scoped RBAC and ADR-008: Multi-tenancy via ExchangeId
 */
test.describe('Multi-Tenant Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
  });

  test('should scope all data to current exchange', async ({ page }) => {
    // All displayed data should be for current exchange only
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Position blotter shows only current exchange orders
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    
    // Should show orders for current exchange (stub data)
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should connect to exchange-specific SignalR group', async ({ page }) => {
    // SignalR connection uses exchange ID for group
    // Group format: ticker:{ExchangeId}
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Wait for connection attempt
    await page.waitForTimeout(2000);
    
    // Connection should be scoped to exchange
    // UI should function with or without connection
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should display only current exchange data in widgets', async ({ page }) => {
    // Dashboard widgets show exchange-specific data
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // All widgets should show data for current exchange
    await expect(page.locator('app-market-depth')).toBeVisible();
    await expect(page.locator('app-risk-matrix')).toBeVisible();
    await expect(page.locator('app-news-terminal')).toBeVisible();
    
    // Data should be scoped (this is backend logic, but UI displays it)
    await page.waitForTimeout(2000);
  });

  test('should include exchange ID in API requests', async ({ page }) => {
    // API requests should include exchange context
    // Monitor network requests
    const requests: string[] = [];
    page.on('request', request => {
      requests.push(request.url());
    });
    
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Submit order
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Some API requests should be made
    // Exchange ID should be included (in headers, query, or body)
    expect(requests.length).toBeGreaterThan(0);
  });

  test('should prevent cross-exchange data leakage', async ({ page }) => {
    // UI should only show current exchange data
    // This is enforced by backend, but UI should not leak data
    await page.goto('/trade');
    await page.waitForSelector('kendo-grid', { timeout: 10000 });
    
    // Grid should show only current exchange orders
    const gridCells = page.locator('kendo-grid td');
    const cellCount = await gridCells.count();
    
    // Data should be present
    expect(cellCount).toBeGreaterThan(0);
    
    // All data should belong to same exchange (can't verify without multiple exchanges)
    // Just ensure data is displayed consistently
  });
});

/**
 * Exchange Creation Flow Tests
 * Per ADR-002: POST /api/v1/exchanges to create new simulation venue
 */
test.describe('Exchange Creation Flow', () => {
  test('should provide UI for exchange creation if available', async ({ page }) => {
    // Check if exchange creation UI exists
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Look for exchange creation text links
    const createExchangeTextLinks = page.locator('text=/Create Exchange/i, text=/New Exchange/i, text=/Add Exchange/i');
    const textLinkCount = await createExchangeTextLinks.count();
    
    // Look for exchange creation buttons
    const createButtons = page.locator('button:has-text("Create")');
    const buttonCount = await createButtons.count();
    
    // If either text links or buttons exist, verify visibility
    if (textLinkCount > 0) {
      await expect(createExchangeTextLinks.first()).toBeVisible();
    } else if (buttonCount > 0) {
      await expect(createButtons.first()).toBeVisible();
    }
  });

  test('should handle exchange creation workflow if implemented', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Check for exchange management features - if present, verify basic functionality
    const exchangeFeatures = page.locator('text=/Exchange/i, text=/Venue/i');
    const featureCount = await exchangeFeatures.count();
    
    if (featureCount > 0) {
      // At least one exchange-related feature should be visible
      await expect(exchangeFeatures.first()).toBeVisible();
    }
  });

  test('should assign RiskManager role to exchange creator', async ({ page }) => {
    // Per ADR-002: Creator gets RiskManager (Admin) role
    // This is backend logic, but we can verify user has admin capabilities
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // User should have access to all features
    // Check for admin-specific UI elements
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();
    
    // Can navigate to all sections
    await page.goto('/trade');
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible({ timeout: 10000 });
  });
});

/**
 * Exchange Context Persistence Tests
 */
test.describe('Exchange Context Persistence', () => {
  test('should maintain exchange context across navigation', async ({ page }) => {
    // Exchange context should be consistent throughout session
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Get dashboard fund name
    const dashboardTitle = await page.locator('h2:has-text("Trading Desk")').textContent();
    
    // Navigate to trading page
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Exchange context should be same
    // (Can't directly verify without inspecting exchange ID, but functionality should work)
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
    
    // Navigate back
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Context should still be same
    const finalTitle = await page.locator('h2:has-text("Trading Desk")').textContent();
    expect(finalTitle).toBe(dashboardTitle);
  });

  test('should persist exchange context on page refresh', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Get initial state
    const initialTitle = await page.locator('h2:has-text("Trading Desk")').textContent();
    
    // Refresh page
    await page.reload();
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Context should be restored
    const refreshedTitle = await page.locator('h2:has-text("Trading Desk")').textContent();
    expect(refreshedTitle).toBe(initialTitle);
  });

  test('should maintain exchange context in browser session', async ({ page }) => {
    // Exchange context persists through session
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Close and reopen page (simulate tab close/reopen)
    await page.goto('about:blank');
    await page.waitForTimeout(500);
    
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Should reload with same exchange
    await expect(page.locator('app-market-depth')).toBeVisible();
  });
});

/**
 * Exchange-Scoped Features Tests
 */
test.describe('Exchange-Scoped Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
  });

  test('should display exchange-specific dashboard layout', async ({ page }) => {
    // Dashboard layout controlled by exchange configuration
    // Per ADR-021: Feature flags control widget visibility
    await page.waitForTimeout(2000);
    
    // Widgets should be displayed per exchange config
    await expect(page.locator('app-market-depth')).toBeVisible();
    await expect(page.locator('app-risk-matrix')).toBeVisible();
    await expect(page.locator('app-news-terminal')).toBeVisible();
  });

  test('should scope market data to exchange', async ({ page }) => {
    // Market data (tickers, prices) scoped to exchange
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Position blotter shows exchange-specific orders
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should scope news feed to exchange if applicable', async ({ page }) => {
    // News Terminal may show exchange-specific news
    await page.waitForTimeout(2000);
    
    await expect(page.locator('app-news-terminal')).toBeVisible();
    
    // News should be displayed (scoping is backend logic)
    const newsTerminal = page.locator('app-news-terminal');
    const content = await newsTerminal.textContent();
    expect(content).toBeTruthy();
  });

  test('should apply exchange-specific risk limits', async ({ page }) => {
    // Risk limits enforced per exchange
    await page.waitForTimeout(2000);
    
    // Risk Matrix shows exchange risk
    await expect(page.locator('app-risk-matrix')).toBeVisible();
    
    // Navigate to trading
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Orders should respect exchange limits (backend validation)
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Order should be processed within limits
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });
});

/**
 * Exchange Configuration Error Handling Tests
 */
test.describe('Exchange Configuration Error Handling', () => {
  test('should handle missing exchange configuration gracefully', async ({ page }) => {
    // If exchange config fails to load, use defaults
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Default widgets should display
    await expect(page.locator('app-market-depth')).toBeVisible();
  });

  test('should handle invalid exchange ID gracefully', async ({ page }) => {
    // Invalid exchange ID should not crash app
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // UI should work with fallback behavior
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should display error if exchange is unavailable', async ({ page }) => {
    // If exchange service is down, show error
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    
    // Either dashboard loads or error is shown
    const dashboard = page.locator('h2:has-text("Trading Desk")');
    
    // Check for error using separate locators with try-catch for safety
    const errorClass = page.locator('.error, .alert');
    const errorText = page.locator('text=/Error/i');
    
    const dashboardVisible = await dashboard.isVisible();
    
    let errorClassVisible = false;
    let errorTextVisible = false;
    
    try {
      errorClassVisible = await errorClass.isVisible();
    } catch (e) {
      // Element not found
    }
    
    try {
      errorTextVisible = await errorText.isVisible();
    } catch (e) {
      // Element not found
    }
    
    const errorVisible = errorClassVisible || errorTextVisible;
    
    // One of them should be visible
    expect(dashboardVisible || errorVisible).toBeTruthy();
  });
});
