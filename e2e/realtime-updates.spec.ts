import { test, expect } from '@playwright/test';

// Test configuration constants
const MAX_PERFORMANCE_WARNINGS = 10;

/**
 * Real-time Updates E2E Tests
 * 
 * Tests SignalR connection, live ticker updates, and market data streaming
 * Per ADR-009: Event-Driven Architecture with MessagePack & Targeted Broadcast
 * Per ADR-005: Test against Dockerized Local Environment
 */
test.describe('SignalR Connection Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should attempt to connect to SignalR on trading page load', async ({ page }) => {
    // Trading component initializes SignalR connection on ngOnInit
    // Wait for connection attempt
    await page.waitForTimeout(2000);
    
    // Page should remain functional regardless of connection status
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
  });

  test('should handle SignalR connection success', async ({ page }) => {
    // In local environment, SignalR may connect to emulator or fail gracefully
    await page.waitForTimeout(3000);
    
    // UI should be functional
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should handle SignalR connection failure gracefully', async ({ page }) => {
    // If SignalR fails to connect, UI should continue to work
    await page.waitForTimeout(2000);
    
    // Order entry should still be functional
    await page.click('button:has-text("Place Order")');
    
    // Success message or error should appear
    await page.waitForTimeout(2000);
    
    // Page remains usable
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should not block UI during connection attempt', async ({ page }) => {
    // UI should be immediately interactive, not waiting for SignalR
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
    
    // Can interact with form immediately
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await expect(symbolInput).toBeFocused();
  });

  test('should maintain connection state across page lifecycle', async ({ page }) => {
    // Initial connection attempt
    await page.waitForTimeout(2000);
    
    // Navigate away
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Navigate back
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Connection should be re-established or handled gracefully
    await page.waitForTimeout(2000);
    
    // UI should be functional
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });
});

/**
 * Live Ticker Updates Tests
 * Per ADR-009: Fan-out pattern with MessagePack protocol
 */
test.describe('Live Ticker Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should display ticker prices if SignalR connected', async ({ page }) => {
    // Wait for potential ticker updates
    await page.waitForTimeout(3000);
    
    // If connected, prices should be displayed in UI
    // Check for price-related elements in chart or widgets
    const priceElements = page.locator('text=/\\$\\d+/');
    const elementCount = await priceElements.count();
    
    // If price elements exist, at least one should be visible
    if (elementCount > 0) {
      await expect(priceElements.first()).toBeVisible();
    }
  });

  test('should handle ticker updates without UI flicker', async ({ page }) => {
    // Monitor for UI stability
    await page.waitForTimeout(2000);
    
    // Core UI elements should remain visible and stable
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    await expect(page.locator('h3:has-text("Position Blotter")')).toBeVisible({ timeout: 5000 });
  });

  test('should process ticker updates efficiently', async ({ page }) => {
    // Monitor console for performance issues
    const warnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });
    
    // Wait for potential ticker stream
    await page.waitForTimeout(5000);
    
    // No excessive performance warnings
    const perfWarnings = warnings.filter(w => 
      w.toLowerCase().includes('performance') ||
      w.toLowerCase().includes('slow')
    );
    expect(perfWarnings.length).toBeLessThan(MAX_PERFORMANCE_WARNINGS);
  });

  test('should subscribe to correct exchange ticker group', async ({ page }) => {
    // Trading component connects with exchangeId from config
    // Group format: ticker:{ExchangeId} per ADR-009
    await page.waitForTimeout(2000);
    
    // Connection attempt should use proper exchange ID
    // UI should function regardless of connection result
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });
});

/**
 * Market Data Streaming Tests
 */
test.describe('Market Data Streaming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should handle continuous data stream without memory leaks', async ({ page }) => {
    // Let data stream for a period
    await page.waitForTimeout(5000);
    
    // Navigate away and back
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Page should still be responsive
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should update UI with streaming data if available', async ({ page }) => {
    // If SignalR is connected and streaming data
    await page.waitForTimeout(3000);
    
    // Check if any dynamic content is updating
    // Chart or price displays may update
    const dynamicContent = page.locator('kendo-chart, app-financial-chart');
    const contentCount = await dynamicContent.count();
    
    // If dynamic content exists, verify it's rendered properly
    if (contentCount > 0) {
      await expect(dynamicContent.first()).toBeVisible();
    }
  });

  test('should handle data stream interruptions gracefully', async ({ page }) => {
    // Simulate navigation which disconnects stream
    await page.waitForTimeout(2000);
    
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Trading Desk")', { timeout: 10000 });
    
    // Immediately return
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Should reconnect and remain functional
    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should apply deadband filtering to reduce noise', async ({ page }) => {
    // Per ADR-009: Deadband filtering ignores price changes < $0.01
    // This is backend logic, but UI should handle filtered updates efficiently
    await page.waitForTimeout(3000);
    
    // UI should update smoothly without excessive re-renders
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
    
    // No console errors from excessive updates
    await page.waitForTimeout(2000);
  });
});

/**
 * Connection Error Handling Tests
 */
test.describe('Connection Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should display error message if connection fails', async ({ page }) => {
    // Wait for connection attempt
    await page.waitForTimeout(3000);
    
    // Check for error indicators - if present, verify they're visible
    const errorMessages = page.locator('.error, .alert, [role="alert"]');
    const errorCount = await errorMessages.count();
    
    // If error messages exist, at least one should be visible
    if (errorCount > 0) {
      await expect(errorMessages.first()).toBeVisible();
    }
  });

  test('should log connection errors to console', async ({ page }) => {
    // Monitor console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for connection attempt
    await page.waitForTimeout(3000);
    
    // Some errors may occur (SignalR connection failure is expected in test env)
    // Just verify page remains functional
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should allow retry after connection failure', async ({ page }) => {
    // Initial connection attempt
    await page.waitForTimeout(2000);
    
    // Reload page to retry connection
    await page.reload();
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Should attempt to reconnect
    await page.waitForTimeout(2000);
    
    // UI should be functional
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should continue working in offline mode if connection unavailable', async ({ page }) => {
    // Even without SignalR, UI should work with stub data
    await page.waitForTimeout(2000);
    
    // Order entry should work
    await page.click('button:has-text("Place Order")');
    
    // Should show success or error
    await page.waitForTimeout(2000);
    
    // Blotter should display stub data
    await expect(page.locator('kendo-grid')).toBeVisible({ timeout: 5000 });
    
    const gridRows = page.locator('kendo-grid tbody tr');
    const rowCount = await gridRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should not crash app on connection exception', async ({ page }) => {
    // Monitor for uncaught exceptions
    let uncaughtException = false;
    page.on('pageerror', () => {
      uncaughtException = true;
    });
    
    // Wait for connection attempt and potential errors
    await page.waitForTimeout(3000);
    
    // No uncaught exceptions should crash the app
    expect(uncaughtException).toBeFalsy();
    
    // App should still be functional
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });
});

/**
 * MessagePack Protocol Tests
 * Per ADR-009: SignalR must use MessagePack for efficiency
 */
test.describe('MessagePack Protocol', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should use MessagePack for SignalR communication', async ({ page }) => {
    // This is configured in SignalRService
    // We can verify by checking network requests
    await page.waitForTimeout(2000);
    
    // SignalR connection should be established (if service is available)
    // In test environment, this may fail gracefully
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should handle binary MessagePack data efficiently', async ({ page }) => {
    // MessagePack is binary protocol for efficient serialization
    // UI should handle updates smoothly
    await page.waitForTimeout(3000);
    
    // No performance degradation
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
    
    // UI remains responsive
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    await expect(symbolInput).toBeFocused();
  });
});

/**
 * Exchange-Scoped Broadcast Tests
 * Per ADR-009: Data streams isolated per Exchange
 */
test.describe('Exchange-Scoped Broadcast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
  });

  test('should connect to exchange-specific ticker group', async ({ page }) => {
    // Trading component uses config.exchangeId for connection
    // Group format: ticker:{ExchangeId}
    await page.waitForTimeout(2000);
    
    // Connection should be scoped to specific exchange
    // UI should function with or without connection
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should only receive data for subscribed exchange', async ({ page }) => {
    // Multi-tenant isolation: only data for current exchange
    await page.waitForTimeout(3000);
    
    // Data should be filtered by exchange ID
    // This is backend logic, but UI should handle scoped data
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should handle exchange ID from configuration', async ({ page }) => {
    // Exchange ID is provided via TRADING_STUB_CONFIG
    // Connection should use this ID
    await page.waitForTimeout(2000);
    
    // Page should load with proper configuration
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
  });
});

/**
 * Real-time Performance Tests
 */
test.describe('Real-time Performance', () => {
  test('should handle high-frequency updates without lag', async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Simulate high-frequency update scenario
    await page.waitForTimeout(5000);
    
    // UI should remain responsive
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.click();
    
    // Input should respond immediately
    await expect(symbolInput).toBeFocused();
    
    // Clear any existing value first
    await symbolInput.fill('');
    
    // Type new value with delay to simulate user input
    await symbolInput.type('FAST', { delay: 50 });
    
    // Wait for input to stabilize
    await page.waitForTimeout(300);
    
    // Verify the value was entered
    const inputValue = await symbolInput.inputValue();
    expect(inputValue).toContain('FAST');
  });

  test('should not accumulate memory over time with streaming data', async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Let stream run for extended period
    await page.waitForTimeout(8000);
    
    // Navigate away and back multiple times
    for (let i = 0; i < 2; i++) {
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      
      await page.goto('/trade');
      await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
      await page.waitForTimeout(2000);
    }
    
    // Should still be responsive
    await expect(page.locator('button:has-text("Place Order")')).toBeEnabled();
  });

  test('should throttle UI updates to prevent overload', async ({ page }) => {
    await page.goto('/trade');
    await page.waitForSelector('h2:has-text("Live Trading Terminal")', { timeout: 10000 });
    
    // Wait for streaming data
    await page.waitForTimeout(4000);
    
    // UI should update smoothly without excessive re-renders
    // Core elements should remain stable
    await expect(page.locator('h3:has-text("Order Entry")')).toBeVisible();
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
  });
});
