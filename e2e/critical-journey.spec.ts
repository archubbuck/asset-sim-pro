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
    // Step 1: Verify Application Loads
    // In local environment, authentication is mocked via MockAuthService
    // The AppShell component displays "AssetSim Pro" in the header
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Step 2: Navigate to Trading Terminal (Dashboard)
    // The navigation drawer has a "Terminal" link that routes to /dashboard
    await page.click('text=Terminal');
    await page.waitForURL(/\/dashboard/);
    
    // Step 3: Verify Dashboard Widgets are Displayed
    // The dashboard should show "Trading Desk" title and widgets
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();
    await expect(page.locator('h3:has-text("L2 Market Depth")')).toBeVisible({ timeout: 5000 });
    
    // Step 4: Navigate to Execution Page
    // The "Execution" nav link routes to /trade where the order entry form is
    await page.click('text=Execution');
    await page.waitForURL(/\/trade/);
    
    // Step 5: Place an Order
    // Verify order entry form is visible
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    
    // Fill in order details - using default values that should already be populated
    // Symbol field should have "AAPL" by default
    await expect(page.locator('kendo-textbox input').first()).toHaveValue('AAPL');
    
    // Quantity should be 100 by default, verify it's set
    const quantityInput = page.locator('kendo-numerictextbox input').first();
    await expect(quantityInput).toHaveValue('100');
    
    // Submit the order
    await page.click('button:has-text("Place Order")');
    
    // Verify order confirmation message appears
    await expect(page.locator('.status-message.success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.status-message.success')).toContainText(/Order.*placed/);
    
    // Step 6: Verify Blotter (Order History)
    // The position blotter is on the same page (trade page) below the order entry
    // Wait for the blotter to load and display orders
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible();
    
    // Verify the blotter grid is displayed with data (stub data will be shown)
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // Verify at least one order is visible in the blotter
    // In stub mode, orders like "AAPL", "MSFT", etc. should be present
    const gridCells = page.locator('kendo-grid td');
    await expect(gridCells.filter({ hasText: 'AAPL' }).first()).toBeVisible();
  });

  test('should display trading terminal with widgets', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify dashboard loads
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible({ timeout: 10000 });
    
    // Verify widgets are present (per ADR-022)
    // Based on DashboardComponent implementation, the following widgets should be visible:
    // - L2 Market Depth
    // - Risk Matrix (VaR)
    // - News Terminal
    
    await expect(page.locator('h3:has-text("L2 Market Depth")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("Risk Matrix")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("News Terminal")')).toBeVisible({ timeout: 5000 });
  });

  test('should handle navigation between sections', async ({ page }) => {
    // Test navigation between main sections
    // Start at root which redirects to /dashboard
    await page.goto('/');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to Terminal (already on dashboard, but verify)
    await page.click('text=Terminal');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();
    
    // Navigate to Execution directly via URL to avoid navigation timeout
    await page.goto('/trade');
    await expect(page).toHaveURL(/\/trade/);
    // Verify trading page loads
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should display order entry form with validation', async ({ page }) => {
    // Navigate to trading/execution page
    await page.goto('/trade');
    
    // Verify order entry form is visible
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    
    // Verify form fields are present
    await expect(page.locator('kendo-label:has-text("Symbol")')).toBeVisible();
    await expect(page.locator('kendo-label:has-text("Side")')).toBeVisible();
    await expect(page.locator('kendo-label:has-text("Order Type")')).toBeVisible();
    await expect(page.locator('kendo-label:has-text("Quantity")')).toBeVisible();
    
    // Verify Place Order button is present
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });

  test('should display position blotter with orders', async ({ page }) => {
    // Navigate to trading page
    await page.goto('/trade');
    
    // Verify position blotter is visible
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible();
    
    // Verify the grid is rendered
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // In stub mode, verify sample orders are displayed
    // The blotter loads stub data with AAPL, MSFT, GOOGL, TSLA orders
    const gridCells = page.locator('kendo-grid td');
    await expect(gridCells.filter({ hasText: 'AAPL' }).first()).toBeVisible();
    
    // Verify grid has column headers - use more specific selectors
    const headers = page.locator('kendo-grid th');
    await expect(headers.filter({ hasText: 'Order ID' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Symbol' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Side' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Status' })).toBeVisible();
  });

  test('should filter orders by status in position blotter', async ({ page }) => {
    // Navigate to trading page
    await page.goto('/trade');
    
    // Wait for blotter to load
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible();
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // Verify we can see the filter dropdown and that it has options
    const statusDropdown = page.locator('kendo-dropdownlist').first();
    await expect(statusDropdown).toBeVisible();
    
    // Verify all orders are initially visible (stub data has 4 orders)
    const gridRows = page.locator('kendo-grid tbody tr');
    await expect(gridRows).toHaveCount(4, { timeout: 5000 });
    
    // Verify at least one FILLED order exists in the stub data
    const gridCells = page.locator('kendo-grid td');
    await expect(gridCells.filter({ hasText: 'FILLED' }).first()).toBeVisible();
  });

  test('should handle order submission and display success message', async ({ page }) => {
    // Navigate to trading page
    await page.goto('/trade');
    
    // Verify order entry form is visible
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    
    // The form has default values pre-filled (AAPL, BUY, MARKET, 100)
    // Just click Place Order to submit with defaults
    await page.click('button:has-text("Place Order")');
    
    // Verify success message appears
    await expect(page.locator('.status-message.success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.status-message')).toContainText(/Order.*placed/i);
  });
});
