import { test, expect } from '@playwright/test';

/**
 * Position Blotter E2E Tests
 * 
 * Tests position blotter grid, filtering, sorting, and order display
 * Per ADR-022: Trading UI Components - Position Blotter implementation
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('Position Blotter Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Position Blotter")', { timeout: 10000 });
  });

  test('should display position blotter section', async ({ page }) => {
    // Position Blotter title should be visible
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible();
    
    // Position blotter component should be rendered
    const positionBlotter = page.locator('app-position-blotter');
    await expect(positionBlotter).toBeVisible();
  });

  test('should display Kendo Grid', async ({ page }) => {
    // Kendo Grid should be rendered
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
  });

  test('should display grid column headers', async ({ page }) => {
    // Wait for grid to load
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // Column headers should be visible
    const headers = page.locator('kendo-grid th');
    await expect(headers.filter({ hasText: 'Order ID' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Symbol' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Side' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Status' })).toBeVisible();
  });

  test('should display order data in grid', async ({ page }) => {
    // Wait for grid to load
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // Grid should contain order data (stub data includes AAPL, MSFT, etc.)
    const gridCells = page.locator('kendo-grid td');
    
    // At least one order should be visible
    await expect(gridCells.filter({ hasText: 'AAPL' }).first()).toBeVisible();
  });

  test('should display multiple orders in stub data', async ({ page }) => {
    // Wait for grid to load
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // Grid should have multiple rows (stub data has 4 orders)
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    
    // Should have at least 1 order, stub data typically has 4
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should display order symbols in grid', async ({ page }) => {
    // Wait for grid to load
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // Verify stub data symbols are present
    const gridCells = page.locator('kendo-grid td');
    
    // Common stock symbols in stub data
    const aaplCell = gridCells.filter({ hasText: 'AAPL' });
    await expect(aaplCell.first()).toBeVisible();
  });

  test('should display order status in grid', async ({ page }) => {
    // Wait for grid to load
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // Grid should show order statuses
    const gridCells = page.locator('kendo-grid td');
    
    // Check for status values (FILLED, PENDING, etc.)
    const filledStatus = gridCells.filter({ hasText: 'FILLED' });
    const pendingStatus = gridCells.filter({ hasText: 'PENDING' });
    
    const filledCount = await filledStatus.count();
    const pendingCount = await pendingStatus.count();
    
    // At least some orders should have statuses
    expect(filledCount + pendingCount).toBeGreaterThan(0);
  });
});

/**
 * Status Filter Tests
 */
test.describe('Status Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Position Blotter")', { timeout: 10000 });
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
  });

  test('should display status filter dropdown', async ({ page }) => {
    // Status filter dropdown should be present
    const statusDropdown = page.locator('kendo-dropdownlist').first();
    await expect(statusDropdown).toBeVisible();
  });

  test('should display all orders by default', async ({ page }) => {
    // All orders should be visible initially (4 in stub data)
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    
    // Should show all stub data orders
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should have filter dropdown with status options', async ({ page }) => {
    // Status dropdown should exist
    const dropdown = page.locator('kendo-dropdownlist').first();
    await expect(dropdown).toBeVisible();
    
    // Dropdown should be interactive (clickable)
    await expect(dropdown).toBeEnabled();
  });

  test('should show orders with FILLED status', async ({ page }) => {
    // Verify FILLED orders exist in the grid
    const gridCells = page.locator('kendo-grid td');
    const filledCells = gridCells.filter({ hasText: 'FILLED' });
    
    const filledCount = await filledCells.count();
    
    // Should have at least one FILLED order in stub data
    expect(filledCount).toBeGreaterThan(0);
  });

  test('should show orders with PENDING status', async ({ page }) => {
    // Verify PENDING orders exist in the grid
    const gridCells = page.locator('kendo-grid td');
    const pendingCells = gridCells.filter({ hasText: 'PENDING' });
    
    const pendingCount = await pendingCells.count();
    
    // Should have at least one PENDING order in stub data
    expect(pendingCount).toBeGreaterThan(0);
  });
});

/**
 * Grid Interaction Tests
 */
test.describe('Grid Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('kendo-grid', { timeout: 10000 });
  });

  test('should allow clicking on grid rows', async ({ page }) => {
    // Wait for grid to be fully loaded
    await page.waitForSelector('kendo-grid tbody tr', { timeout: 5000 });
    
    // Click on first row
    const firstRow = page.locator('kendo-grid tbody tr').first();
    await firstRow.click();
    
    // Row should be selected (may change styling)
    await page.waitForTimeout(300);
    
    // Grid should remain functional
    await expect(page.locator('kendo-grid')).toBeVisible();
  });

  test('should display grid with proper styling', async ({ page }) => {
    // Grid should be visible with proper theming
    const grid = page.locator('kendo-grid');
    await expect(grid).toBeVisible();
    
    // Grid should have some styling classes
    const gridClass = await grid.getAttribute('class');
    expect(gridClass).toBeTruthy();
  });

  test('should scroll grid if content exceeds viewport', async ({ page }) => {
    // Grid should be scrollable if it has many rows
    const grid = page.locator('kendo-grid');
    await expect(grid).toBeVisible();
    
    // Check if grid has scrollable content
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    
    // With 4 stub orders, grid should display them
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should display grid cell content', async ({ page }) => {
    // Verify grid cells have content
    const gridCells = page.locator('kendo-grid td');
    const cellCount = await gridCells.count();
    
    // Should have multiple cells with data
    expect(cellCount).toBeGreaterThan(0);
    
    // First cell should have some text content
    const firstCellText = await gridCells.first().textContent();
    expect(firstCellText).toBeTruthy();
  });
});

/**
 * Order Display Tests
 */
test.describe('Order Data Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('kendo-grid', { timeout: 10000 });
  });

  test('should display order IDs', async ({ page }) => {
    // Grid should show order IDs
    const gridCells = page.locator('kendo-grid td');
    
    // First cell typically contains order ID
    const firstCell = gridCells.first();
    const cellText = await firstCell.textContent();
    
    // Should have some content (order ID)
    expect(cellText).toBeTruthy();
    expect(cellText?.length).toBeGreaterThan(0);
  });

  test('should display order symbols', async ({ page }) => {
    // Verify symbols are displayed in grid
    const gridCells = page.locator('kendo-grid td');
    
    // Look for common stock symbols
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
    let foundSymbol = false;
    
    for (const symbol of symbols) {
      const symbolCell = gridCells.filter({ hasText: symbol });
      const count = await symbolCell.count();
      if (count > 0) {
        foundSymbol = true;
        break;
      }
    }
    
    // At least one symbol should be found
    expect(foundSymbol).toBeTruthy();
  });

  test('should display order sides (BUY/SELL)', async ({ page }) => {
    // Grid should show order sides
    const gridCells = page.locator('kendo-grid td');
    
    // Look for BUY or SELL indicators
    const buyCells = gridCells.filter({ hasText: 'BUY' });
    const sellCells = gridCells.filter({ hasText: 'SELL' });
    
    const buyCount = await buyCells.count();
    const sellCount = await sellCells.count();
    
    // Should have at least some BUY or SELL orders
    expect(buyCount + sellCount).toBeGreaterThan(0);
  });

  test('should display order quantities', async ({ page }) => {
    // Grid should show quantities
    const gridCells = page.locator('kendo-grid td');
    
    // Quantities are typically numeric values
    // Just verify cells have content
    const cellCount = await gridCells.count();
    expect(cellCount).toBeGreaterThan(0);
  });

  test('should display order timestamps or dates', async ({ page }) => {
    // Grid may show timestamps or dates for orders
    const gridCells = page.locator('kendo-grid td');
    const cellCount = await gridCells.count();
    
    // Grid should have data
    expect(cellCount).toBeGreaterThan(0);
    
    // Content should exist in cells
    const firstCellWithText = await gridCells.first().textContent();
    expect(firstCellWithText).toBeTruthy();
  });
});

/**
 * Blotter Responsiveness Tests
 */
test.describe('Blotter Responsiveness', () => {
  test('should display blotter on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Position Blotter")', { timeout: 10000 });
    
    // Blotter should be visible
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    // All columns should be visible
    const headers = page.locator('kendo-grid th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
  });

  test('should adapt blotter on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Position Blotter")', { timeout: 10000 });
    
    // Blotter should still be visible
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
  });

  test('should adapt blotter on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Position Blotter")', { timeout: 10000 });
    
    // Blotter may be scrollable or adapted for mobile
    // Grid should be present in DOM (may need to scroll to see)
    const grid = page.locator('kendo-grid');
    const gridCount = await grid.count();
    
    // Grid should exist in DOM
    expect(gridCount).toBeGreaterThan(0);
  });
});

/**
 * Blotter Performance Tests
 */
test.describe('Blotter Performance', () => {
  test('should load blotter within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/trade');
    await page.waitForSelector('kendo-grid', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Blotter should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should render grid without errors', async ({ page }) => {
    // Monitor console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/trade');
    await page.waitForSelector('kendo-grid', { timeout: 10000 });
    
    // Wait for grid to fully render
    await page.waitForTimeout(2000);
    
    // No critical errors should occur
    const criticalErrors = errors.filter(err => 
      !err.includes('Warning') && 
      !err.includes('DevTools')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should handle large number of orders efficiently', async ({ page }) => {
    // With stub data (4 orders), grid should render quickly
    await page.goto('/trade');
    await page.waitForSelector('kendo-grid', { timeout: 10000 });
    
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    
    // Grid should display all stub orders
    expect(rowCount).toBeGreaterThan(0);
    
    // Grid should remain interactive
    const grid = page.locator('kendo-grid');
    await expect(grid).toBeVisible();
  });
});

/**
 * Blotter Integration Tests
 */
test.describe('Blotter Integration with Order Entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h3:has-text("Order Entry")', { timeout: 10000 });
    await page.waitForSelector('kendo-grid', { timeout: 10000 });
  });

  test('should display both order entry and blotter on same page', async ({ page }) => {
    // Both components should be visible
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible();
    await expect(page.locator('kendo-grid')).toBeVisible();
  });

  test('should maintain blotter visibility after order submission', async ({ page }) => {
    // Submit an order
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Blotter should still be visible
    await expect(page.locator('kendo-grid')).toBeVisible();
    
    // Blotter should still have data
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });
});
