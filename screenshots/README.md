# AssetSim Pro - Marketing Screenshots

This directory contains high-quality screenshots of AssetSim Pro features for promotional and marketing purposes.

## Generating Screenshots

To generate the screenshots, run the following commands:

```bash
# 1. Start the application
npm start

# 2. In another terminal, capture screenshots
npm run screenshots
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

## Note

Screenshots must be generated locally with the application running. The automated CI/CD pipeline does not capture screenshots as it requires the full application stack (Angular app, Docker services, database).

To update screenshots, run `npm run screenshots` locally and commit the updated images.
