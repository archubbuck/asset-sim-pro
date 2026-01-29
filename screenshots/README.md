# AssetSim Pro - Marketing Screenshots

This directory contains high-quality screenshots of AssetSim Pro features for promotional and marketing purposes.

## Automated Screenshot Generation (Recommended)

Screenshots can be automatically generated and committed using GitHub Actions:

### Option 1: Manual Workflow Trigger (Recommended)

Trigger the screenshot capture workflow manually from the GitHub UI:

1. Go to **Actions** tab in GitHub
2. Select **"Capture Marketing Screenshots"** workflow
3. Click **"Run workflow"** button
4. Screenshots will be automatically:
   - Generated with full application stack
   - Committed to the repository
   - Available as workflow artifacts

### Option 2: Automatic on Main Branch

Screenshots are automatically captured and updated when changes are pushed to the `main` branch (enabled in CI workflow).

## Local Screenshot Generation

To generate screenshots locally:

```bash
# 1. Start Docker services
docker compose up -d

# 2. Initialize and seed database
npm run db:init
npm run seed:local

# 3. Start the application
npm start

# 4. In another terminal, capture screenshots
npm run screenshots

# 5. Commit the screenshots
git add screenshots/*.png
git commit -m "chore: update marketing screenshots"
git push
```

## Expected Screenshots

The script will generate the following 10 screenshots:

1. **01-dashboard-overview.png** - Trading Desk Dashboard with all widgets (full page)
2. **02-market-depth-widget.png** - L2 Market Depth order book widget
3. **03-risk-matrix-widget.png** - Risk Matrix (VaR) widget
4. **04-news-terminal-widget.png** - News Terminal widget
5. **05-trading-terminal.png** - Live Trading Terminal (full page)
6. **06-order-entry-form.png** - Order Entry form with fields
7. **07-position-blotter.png** - Position Blotter with order grid
8. **08-financial-chart.png** - Financial Chart with OHLC candlesticks
9. **09-order-entry-before-submit.png** - Order form before submission
10. **09-order-entry-after-submit.png** - Order form with success message

## Screenshot Specifications

- **Resolution**: 1920x1080 (Full HD)
- **Scale**: 2x for retina displays
- **Format**: PNG
- **Theme**: Institutional Slate (Kendo UI theme)

## Usage in Documentation

These screenshots can be used in:
- Marketing materials
- Documentation
- Presentations
- Website/landing pages
- GitHub README
- Product demos

## CI/CD Integration

The screenshot capture process is integrated into the CI/CD pipeline:

- **Workflow**: `.github/workflows/capture-screenshots.yml`
- **Trigger**: Manual (workflow_dispatch) or automatic on main branch
- **Requirements**: Full application stack (Angular, Docker services, database)
- **Output**: Screenshots committed to repository + workflow artifacts

The automated workflow handles:
- Starting Docker services (SQL Server, Redis, Azurite, SignalR)
- Initializing and seeding the database
- Starting the Angular dev server
- Capturing screenshots with Playwright
- Committing changes back to the repository
