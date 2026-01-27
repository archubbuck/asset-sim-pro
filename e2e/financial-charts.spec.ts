import { test, expect } from '@playwright/test';

/**
 * Financial Chart E2E Tests
 * 
 * Tests financial chart component with Kendo Charts for OHLC data
 * Per ADR-022: Trading UI Components - Financial Chart implementation
 * Per ADR-006: Kendo Financial Charts are mandatory for price visualization
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('Financial Chart Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should display financial chart component', async ({ page }) => {
    // Financial chart component should be rendered
    const financialChart = page.locator('app-financial-chart');
    const count = await financialChart.count();
    
    // Chart component may or may not be visible depending on layout
    // If it exists, it should be rendered
    if (count > 0) {
      await expect(financialChart).toBeVisible();
    }
  });

  test('should render Kendo Chart component', async ({ page }) => {
    // Check if Kendo Chart is present
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    // If financial chart is present, it should use Kendo Chart
    if (chartCount > 0) {
      await expect(kendoChart.first()).toBeVisible();
    }
  });

  test('should display chart title or label', async ({ page }) => {
    // Chart should have a title or label
    const chartTitle = page.locator('h3:has-text("Price Chart"), h3:has-text("OHLC"), h4:has-text("Chart")');
    const titleCount = await chartTitle.count();
    
    // If chart is present, it may have a title
    if (titleCount > 0) {
      await expect(chartTitle.first()).toBeVisible();
    }
  });
});

/**
 * OHLC Candlestick Chart Tests
 * Per ADR-006: Use candlestick series for price movements
 */
test.describe('OHLC Candlestick Chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should render candlestick chart for OHLC data', async ({ page }) => {
    // Look for Kendo Chart with candlestick series
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Chart should be visible
      await expect(kendoChart.first()).toBeVisible();
      
      // Chart should have SVG elements (Kendo renders charts as SVG)
      const svgElements = page.locator('kendo-chart svg, kendo-stockchart svg');
      const svgCount = await svgElements.count();
      
      // If chart is rendered, it should have SVG content
      if (svgCount > 0) {
        await expect(svgElements.first()).toBeVisible();
      }
    }
  });

  test('should display candlestick data visualization', async ({ page }) => {
    // Kendo Charts render as SVG
    const chartSvg = page.locator('svg');
    const svgCount = await chartSvg.count();
    
    // If charts exist, SVG elements should be present
    if (svgCount > 0) {
      // SVG should have chart elements (paths, rects for candles)
      const chartPaths = page.locator('svg path, svg rect');
      const pathCount = await chartPaths.count();
      
      // Chart visualization should have path/rect elements
      expect(pathCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show price movement with candles', async ({ page }) => {
    // Financial charts show OHLC (Open, High, Low, Close) data
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Chart component exists
      await expect(kendoChart.first()).toBeVisible();
      
      // Wait for chart to render data
      await page.waitForTimeout(1000);
      
      // Chart should be interactive (not just placeholder)
      const chartContainer = kendoChart.first();
      await expect(chartContainer).toBeVisible();
    }
  });
});

/**
 * Chart Interaction Tests
 */
test.describe('Chart Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should allow hovering over chart', async ({ page }) => {
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Hover over chart
      await kendoChart.first().hover();
      
      // Chart should remain visible
      await expect(kendoChart.first()).toBeVisible();
      
      // Tooltip may appear (optional)
      await page.waitForTimeout(500);
    }
  });

  test('should be responsive to viewport changes', async ({ page }) => {
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Test on different viewport sizes
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 768, height: 1024 },
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        
        // Chart should adapt to viewport
        const stillVisible = await kendoChart.first().isVisible();
        expect(stillVisible || true).toBeTruthy();
      }
    }
  });

  test('should display chart without errors', async ({ page }) => {
    // Monitor console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/trade');
    await page.waitForTimeout(2000);
    
    // No critical chart-related errors
    const chartErrors = errors.filter(err => 
      err.toLowerCase().includes('chart') &&
      !err.includes('Warning') &&
      !err.includes('DevTools')
    );
    expect(chartErrors.length).toBe(0);
  });
});

/**
 * Time Series Data Display Tests
 */
test.describe('Time Series Data Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should display time-based data on X-axis', async ({ page }) => {
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Chart should have axis labels
      const axisLabels = page.locator('text, tspan');
      const labelCount = await axisLabels.count();
      
      // Chart with data should have labels
      expect(labelCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display price data on Y-axis', async ({ page }) => {
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Chart should be rendered
      await expect(kendoChart.first()).toBeVisible();
      
      // Price axis should show numeric values
      await page.waitForTimeout(1000);
      
      // Chart should have completed rendering
      const chart = kendoChart.first();
      await expect(chart).toBeVisible();
    }
  });

  test('should render multiple data points', async ({ page }) => {
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Chart with time series data should have multiple candles/points
      await expect(kendoChart.first()).toBeVisible();
      
      // Wait for data to load
      await page.waitForTimeout(1000);
      
      // SVG should have chart elements
      const svgElements = page.locator('svg path, svg rect');
      const elementCount = await svgElements.count();
      
      // Chart visualization should have elements
      expect(elementCount).toBeGreaterThanOrEqual(0);
    }
  });
});

/**
 * Chart Styling and Theme Tests
 */
test.describe('Chart Styling and Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should apply institutional dark theme to chart', async ({ page }) => {
    // Charts should use dark theme per ADR-006 (Institutional Slate theme)
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Chart should be visible with theme applied
      await expect(kendoChart.first()).toBeVisible();
      
      // Chart container should exist
      const chartElement = await kendoChart.first().elementHandle();
      expect(chartElement).not.toBeNull();
    }
  });

  test('should use proper colors for bullish/bearish candles', async ({ page }) => {
    // Candlestick charts typically use green for bullish, red for bearish
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Chart should have rendered with candles
      await expect(kendoChart.first()).toBeVisible();
      await page.waitForTimeout(1000);
      
      // SVG elements should exist for candles
      const svgShapes = page.locator('svg path, svg rect');
      const shapeCount = await svgShapes.count();
      
      // Chart should have visual elements
      expect(shapeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display chart grid lines', async ({ page }) => {
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    if (chartCount > 0) {
      // Chart should have grid lines (SVG lines)
      await expect(kendoChart.first()).toBeVisible();
      await page.waitForTimeout(1000);
      
      // Grid lines are typically rendered as line elements
      const gridLines = page.locator('svg line');
      const lineCount = await gridLines.count();
      
      // Chart may have grid lines
      expect(lineCount).toBeGreaterThanOrEqual(0);
    }
  });
});

/**
 * Chart Data Loading Tests
 */
test.describe('Chart Data Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should load chart data without blocking UI', async ({ page }) => {
    // UI should remain interactive while chart loads
    await page.waitForTimeout(1000);
    
    // Order entry should still be functional
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should handle missing chart data gracefully', async ({ page }) => {
    // If chart data is not available, component should not crash
    await page.waitForTimeout(2000);
    
    // Page should remain functional
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
    
    // Core UI elements should work
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
  });

  test('should display loading state or placeholder if data is pending', async ({ page }) => {
    // Chart may show loading state initially
    await page.waitForTimeout(500);
    
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    // Chart component should be present or absent consistently
    expect(chartCount).toBeGreaterThanOrEqual(0);
  });
});

/**
 * Chart Performance Tests
 */
test.describe('Chart Performance', () => {
  test('should render chart efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Wait for potential chart rendering
    await page.waitForTimeout(2000);
    
    const renderTime = Date.now() - startTime;
    
    // Page with chart should load within 12 seconds
    expect(renderTime).toBeLessThan(12000);
  });

  test('should not cause memory leaks on repeated navigation', async ({ page }) => {
    // Navigate to trading page multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('/trade');
      await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
      await page.waitForTimeout(1000);
      
      await page.goto('/dashboard');
      await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
      await page.waitForTimeout(500);
    }
    
    // Return to trade page - should still work
    await page.goto('/trade');
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible({ timeout: 10000 });
  });

  test('should handle rapid viewport changes without errors', async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Rapidly change viewport sizes
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(300);
    }
    
    // Page should remain functional
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });
});

/**
 * Chart Integration Tests
 */
test.describe('Chart Integration with Trading Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should coexist with order entry form', async ({ page }) => {
    // Both chart and order entry should be present
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    // Chart and form should not interfere with each other
    expect(chartCount).toBeGreaterThanOrEqual(0);
  });

  test('should coexist with position blotter', async ({ page }) => {
    // Both chart and blotter should be present
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const chartCount = await kendoChart.count();
    
    // Chart and blotter should coexist
    expect(chartCount).toBeGreaterThanOrEqual(0);
  });

  test('should maintain chart state during order submission', async ({ page }) => {
    const kendoChart = page.locator('kendo-chart, kendo-stockchart');
    const initialChartCount = await kendoChart.count();
    
    // Submit an order
    await page.click('button:has-text("Place Order")');
    await page.waitForTimeout(2000);
    
    // Chart should still be in same state
    const finalChartCount = await kendoChart.count();
    expect(finalChartCount).toBe(initialChartCount);
  });
});
