import { chromium, Browser, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Playwright Screenshot Capture Script
 * 
 * Captures high-quality screenshots of AssetSim Pro features for promotional/marketing purposes.
 * 
 * Prerequisites:
 * - Application must be running on http://localhost:4200 (run `npm start` first)
 * - Docker services should be running (run `docker compose up -d`)
 * 
 * Usage:
 *   npm run screenshots
 * 
 * Output:
 *   Screenshots are saved to ./screenshots/ directory
 */

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:4200';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');
const VIEWPORT = { width: 1920, height: 1080 }; // Full HD for marketing materials

interface ScreenshotConfig {
  name: string;
  url: string;
  description: string;
  waitForSelector?: string;
  additionalWait?: number;
  fullPage?: boolean;
}

const screenshots: ScreenshotConfig[] = [
  {
    name: '01-dashboard-overview',
    url: '/dashboard',
    description: 'Trading Desk Dashboard with widgets',
    waitForSelector: 'h2:has-text("Trading Desk")',
    additionalWait: 3000, // Wait for widgets to fully render
    fullPage: true,
  },
  {
    name: '02-market-depth-widget',
    url: '/dashboard',
    description: 'L2 Market Depth widget showing order book',
    waitForSelector: 'h3:has-text("L2 Market Depth")',
    additionalWait: 2000,
  },
  {
    name: '03-risk-matrix-widget',
    url: '/dashboard',
    description: 'Risk Matrix (VaR) widget',
    waitForSelector: 'h3:has-text("Risk Matrix")',
    additionalWait: 2000,
  },
  {
    name: '04-news-terminal-widget',
    url: '/dashboard',
    description: 'News Terminal widget',
    waitForSelector: 'h3:has-text("News Terminal")',
    additionalWait: 2000,
  },
  {
    name: '05-trading-terminal',
    url: '/trade',
    description: 'Live Trading Terminal with order entry',
    waitForSelector: 'h2:has-text("Live Trading Terminal")',
    additionalWait: 3000,
    fullPage: true,
  },
  {
    name: '06-order-entry-form',
    url: '/trade',
    description: 'Order Entry form with fields',
    waitForSelector: 'h3:has-text("Order Entry")',
    additionalWait: 2000,
  },
  {
    name: '07-position-blotter',
    url: '/trade',
    description: 'Position Blotter with order grid',
    waitForSelector: 'h3:has-text("Position Blotter")',
    additionalWait: 3000, // Wait for grid to load with data
  },
  {
    name: '08-financial-chart',
    url: '/trade',
    description: 'Financial Chart with OHLC candlesticks',
    waitForSelector: 'app-financial-chart',
    additionalWait: 2000,
  },
];

async function ensureDirectoryExists(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(
  page: Page,
  config: ScreenshotConfig
): Promise<void> {
  console.log(`\n📸 Capturing: ${config.name}`);
  console.log(`   Description: ${config.description}`);
  console.log(`   URL: ${config.url}`);

  try {
    // Navigate to the page
    await page.goto(`${BASE_URL}${config.url}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for specific selector if provided
    if (config.waitForSelector) {
      await page.waitForSelector(config.waitForSelector, { timeout: 10000 });
    }

    // Additional wait for dynamic content to render
    if (config.additionalWait) {
      await page.waitForTimeout(config.additionalWait);
    }

    // Capture screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${config.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: config.fullPage || false,
      animations: 'disabled', // Disable animations for consistent screenshots
    });

    console.log(`   ✅ Saved to: ${screenshotPath}`);
  } catch (error) {
    console.error(`   ❌ Error capturing ${config.name}:`, error);
  }
}

async function captureOrderSubmissionFlow(
  page: Page,
  browser: Browser
): Promise<void> {
  console.log(`\n📸 Capturing: 09-order-submission-flow`);
  console.log(`   Description: Complete order submission with success message`);

  try {
    await page.goto(`${BASE_URL}/trade`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('h3:has-text("Order Entry")', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify order entry form is visible
    const symbolInput = page.locator('kendo-textbox input').first();
    await symbolInput.waitFor({ state: 'visible' });

    // Take screenshot before submission
    const beforePath = path.join(SCREENSHOTS_DIR, '09-order-entry-before-submit.png');
    await page.screenshot({
      path: beforePath,
      fullPage: false,
      animations: 'disabled',
    });
    console.log(`   ✅ Saved before state: ${beforePath}`);

    // Submit the order
    await page.click('button:has-text("Place Order")');

    // Wait for success message
    await page.waitForSelector('.status-message', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Take screenshot after submission
    const afterPath = path.join(SCREENSHOTS_DIR, '09-order-entry-after-submit.png');
    await page.screenshot({
      path: afterPath,
      fullPage: false,
      animations: 'disabled',
    });
    console.log(`   ✅ Saved after state: ${afterPath}`);
  } catch (error) {
    console.error(`   ❌ Error capturing order submission flow:`, error);
  }
}

async function main(): Promise<void> {
  console.log('🚀 AssetSim Pro Screenshot Capture Utility');
  console.log('==========================================\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output Directory: ${SCREENSHOTS_DIR}`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);

  // Ensure screenshots directory exists
  await ensureDirectoryExists(SCREENSHOTS_DIR);

  // Launch browser
  console.log('\n🌐 Launching Chromium browser...');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // 2x for retina/high-DPI displays
  });

  const page = await context.newPage();

  // Set reasonable timeouts
  page.setDefaultTimeout(30000);

  // Capture all configured screenshots
  for (const config of screenshots) {
    await captureScreenshot(page, config);
  }

  // Capture order submission flow (special case with before/after)
  await captureOrderSubmissionFlow(page, browser);

  // Close browser
  await browser.close();

  console.log('\n✨ Screenshot capture complete!');
  console.log(`\n📁 All screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`\nTotal screenshots captured: ${screenshots.length + 2}`); // +2 for before/after order submission
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
