import { chromium, Browser, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import * as sql from 'mssql';
import { checkDockerServices } from './utils/docker-check';

/**
 * Check if database is initialized
 */
async function checkDatabaseInitialized(): Promise<boolean> {
  let pool: sql.ConnectionPool | null = null;
  try {
    const connectionString =
      'Server=localhost,1433;Database=AssetSimPro;User Id=sa;Password=LocalDevPassword123!;Encrypt=true;TrustServerCertificate=true';

    pool = await sql.connect(connectionString);
    return true;
  } catch (error) {
    return false;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

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
  fullPage?: boolean;
}

// Total: 8 screenshot configurations + 2 from order submission flow = 10 screenshots
const screenshots: ScreenshotConfig[] = [
  {
    name: '01-dashboard-overview',
    url: '/dashboard',
    description: 'Trading Desk Dashboard with widgets',
    waitForSelector: 'h2:has-text("Trading Desk")',
    fullPage: true,
  },
  {
    name: '02-market-depth-widget',
    url: '/dashboard',
    description: 'L2 Market Depth widget showing order book',
    waitForSelector: 'h3:has-text("L2 Market Depth")',
  },
  {
    name: '03-risk-matrix-widget',
    url: '/dashboard',
    description: 'Risk Matrix (VaR) widget',
    waitForSelector: 'h3:has-text("Risk Matrix")',
  },
  {
    name: '04-news-terminal-widget',
    url: '/dashboard',
    description: 'News Terminal widget',
    waitForSelector: 'h3:has-text("News Terminal")',
  },
  {
    name: '05-trading-terminal',
    url: '/trade',
    description: 'Live Trading Terminal with order entry',
    waitForSelector: 'h2:has-text("Live Trading Terminal")',
    fullPage: true,
  },
  {
    name: '06-order-entry-form',
    url: '/trade',
    description: 'Order Entry form with fields',
    waitForSelector: 'h3:has-text("Order Entry")',
  },
  {
    name: '07-position-blotter',
    url: '/trade',
    description: 'Position Blotter with order grid',
    waitForSelector: 'h3:has-text("Position Blotter")',
  },
  {
    name: '08-financial-chart',
    url: '/trade',
    description: 'Financial Chart with OHLC candlesticks',
    waitForSelector: 'app-financial-chart',
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
): Promise<boolean> {
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

    // Wait for page to be fully loaded with all dynamic content
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Capture screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${config.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: config.fullPage || false,
      animations: 'disabled', // Disable animations for consistent screenshots
    });

    console.log(`   ✅ Saved to: ${screenshotPath}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error capturing ${config.name}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function captureOrderSubmissionFlow(page: Page): Promise<boolean> {
  console.log(`\n📸 Capturing: 09-order-submission-flow`);
  console.log(`   Description: Complete order submission with success message`);

  try {
    await page.goto(`${BASE_URL}/trade`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('h3:has-text("Order Entry")', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('networkidle');

    // Take screenshot after submission
    const afterPath = path.join(SCREENSHOTS_DIR, '09-order-entry-after-submit.png');
    await page.screenshot({
      path: afterPath,
      fullPage: false,
      animations: 'disabled',
    });
    console.log(`   ✅ Saved after state: ${afterPath}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error capturing order submission flow:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function main(): Promise<void> {
  console.log('🚀 AssetSim Pro Screenshot Capture Utility');
  console.log('==========================================\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output Directory: ${SCREENSHOTS_DIR}`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);

  // Check prerequisites
  console.log('\n🔍 Checking prerequisites...\n');
  
  // Check Docker services
  const dockerCheck = await checkDockerServices();
  const requiredServices = ['sql', 'redis', 'azurite', 'signalr-emulator'];
  const allRunning = requiredServices.every(s => dockerCheck.services.includes(s));
  
  if (!allRunning) {
    console.error('❌ ERROR: Required Docker services are not running\n');
    if (dockerCheck.services.length === 0) {
      console.error('No Docker services are running. Please start them:');
    } else {
      console.error(`Running services: ${dockerCheck.services.join(', ')}`);
      console.error('Missing required services. Please ensure all services are running:');
    }
    console.error('  1. Run: docker compose up -d');
    console.error('  2. Wait for services to be healthy (~30 seconds)');
    console.error('  3. Verify: docker compose ps\n');
    process.exit(1);
  }
  console.log('✅ Docker services are running');
  
  // Check database initialization
  const dbInitialized = await checkDatabaseInitialized();
  if (!dbInitialized) {
    console.error('\n❌ ERROR: Database is not initialized\n');
    console.error('Please initialize the database:');
    console.error('  1. Run: npm run db:init');
    console.error('  2. (Optional) Seed demo data: npm run seed:local\n');
    process.exit(1);
  }
  console.log('✅ Database is initialized');
  
  console.log('✅ All prerequisites met\n');

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

  // Check if application is running
  console.log('\n🔍 Checking if application is running...');
  try {
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    if (!response || !response.ok()) {
      throw new Error(`Application not responding at ${BASE_URL}`);
    }
    console.log('   ✅ Application is running');
  } catch (error) {
    console.error(`\n❌ ERROR: Cannot connect to application at ${BASE_URL}`);
    console.error('   Please ensure the application is running:\n');
    console.error('   For Frontend:');
    console.error('   1. Run: npm start');
    console.error('   2. Wait for application to start (shows "Application bundle generation complete")');
    console.error('   3. Verify at: http://localhost:4200\n');
    console.error('   For Backend (optional for basic screenshots):');
    console.error('   1. cd apps/backend');
    console.error('   2. npm install (if not done)');
    console.error('   3. cp local.settings.json.example local.settings.json (if not done)');
    console.error('   4. npm start\n');
    console.error('   Then run: npm run screenshots\n');
    await browser.close();
    process.exit(1);
  }

  // Track success/failure
  let successCount = 0;
  let failureCount = 0;
  const failedScreenshots: string[] = [];

  // Capture all configured screenshots
  for (const config of screenshots) {
    const success = await captureScreenshot(page, config);
    if (success) {
      successCount++;
    } else {
      failureCount++;
      failedScreenshots.push(config.name);
    }
  }

  // Capture order submission flow (special case with before/after)
  const orderFlowSuccess = await captureOrderSubmissionFlow(page);
  if (orderFlowSuccess) {
    successCount += 2; // before and after screenshots
  } else {
    failureCount += 2;
    failedScreenshots.push('09-order-entry-before-submit', '09-order-entry-after-submit');
  }

  // Close browser
  await browser.close();

  // Report results
  console.log('\n' + '='.repeat(50));
  console.log('📊 Screenshot Capture Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📁 Output Directory: ${SCREENSHOTS_DIR}`);
  
  if (failedScreenshots.length > 0) {
    console.log('\n⚠️  Failed Screenshots:');
    failedScreenshots.forEach(name => console.log(`   - ${name}`));
  }

  if (failureCount === 0) {
    console.log('\n✨ All screenshots captured successfully!');
  } else {
    console.log('\n⚠️  Some screenshots failed. Check the errors above for details.');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
