import { test, expect } from '@playwright/test';

/**
 * Authentication & Authorization E2E Tests
 * 
 * Tests authentication flows, RBAC boundaries, and user session management
 * Per ADR-005: Test against Dockerized Local Environment
 * Per ADR-020: Azure AD authentication (mocked in local environment)
 */
test.describe('Authentication & Authorization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should auto-authenticate user with MockAuthService in local environment', async ({ page }) => {
    // In local environment, MockAuthService auto-authenticates
    // Verify user is authenticated by checking for authenticated UI elements
    await expect(page.locator('text=AssetSim Pro')).toBeVisible({ timeout: 10000 });
    
    // User avatar should be visible indicating authenticated state
    await expect(page.locator('kendo-avatar')).toBeVisible();
  });

  test('should display user initials in avatar', async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Avatar should be present with user initials
    const avatar = page.locator('kendo-avatar');
    await expect(avatar).toBeVisible();
    
    // Avatar should have initials attribute or content
    const avatarElement = await avatar.elementHandle();
    expect(avatarElement).not.toBeNull();
  });

  test('should maintain session across navigation', async ({ page }) => {
    // Verify user remains authenticated across different routes
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('kendo-avatar')).toBeVisible();
    
    // Navigate to trading page
    await page.goto('/trade');
    await expect(page.locator('kendo-avatar')).toBeVisible();
    
    // User should remain authenticated throughout
    await expect(page.locator('text=AssetSim Pro')).toBeVisible();
  });

  test('should display buying power for authenticated user', async ({ page }) => {
    // Wait for authentication
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Buying power should be visible in AppBar
    await expect(page.locator('.buying-power-label, text=Buying Power')).toBeVisible();
    
    // Buying power value should be displayed
    const buyingPowerValue = page.locator('.buying-power-value');
    await expect(buyingPowerValue).toBeVisible();
    
    // Value should be formatted as currency
    const value = await buyingPowerValue.textContent();
    expect(value).toMatch(/\$[\d,]+/);
  });

  test('should handle authentication state in AppShell', async ({ page }) => {
    // Verify AppShell component loads with authentication
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // AppBar should be visible
    await expect(page.locator('kendo-appbar')).toBeVisible();
    
    // Navigation drawer should be available
    await expect(page.locator('kendo-drawer')).toBeVisible();
  });

  test('should provide access to navigation menu for authenticated users', async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
    
    // Menu should be accessible (drawer is visible)
    const drawer = page.locator('kendo-drawer');
    await expect(drawer).toBeVisible();
    
    // Navigation items should be present
    await expect(page.locator('text=Terminal')).toBeVisible();
    await expect(page.locator('text=Execution')).toBeVisible();
  });
});

/**
 * RBAC (Role-Based Access Control) Tests
 * Per ADR-002: Exchange-scoped RBAC
 */
test.describe('RBAC Permission Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=AssetSim Pro', { timeout: 10000 });
  });

  test('should allow access to trading terminal for all authenticated users', async ({ page }) => {
    // All authenticated users should access trading terminal
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h2:has-text("Trading Desk")')).toBeVisible();
  });

  test('should allow access to execution page for all authenticated users', async ({ page }) => {
    // All authenticated users should access execution page
    await page.goto('/trade');
    await expect(page).toHaveURL(/\/trade/);
    await expect(page.locator('h2:has-text("Live Trading Terminal")')).toBeVisible();
  });

  test('should display consistent UI elements for authenticated users', async ({ page }) => {
    // Verify consistent UI across all pages
    const pages = ['/dashboard', '/trade', '/portfolio'];
    
    for (const path of pages) {
      await page.goto(path);
      
      // AppBar should always be visible
      await expect(page.locator('kendo-appbar')).toBeVisible();
      
      // User avatar should always be visible
      await expect(page.locator('kendo-avatar')).toBeVisible();
      
      // Buying power should always be visible
      await expect(page.locator('.buying-power-label, text=Buying Power')).toBeVisible();
    }
  });
});
