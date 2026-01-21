# Azure DevOps Work Item CSV Export

This document explains how to use the work item CSV export feature to migrate the AssetSim Pro project backlog to Azure DevOps Boards.

## Overview

The export feature generates a CSV file containing all AssetSim Pro work items in a format that can be directly imported into Azure DevOps Boards. The exported data includes:

- **1 Epic**: Portfolio Simulation Platform
- **6 Features**: Exchange Management, Order Execution, Market Simulation Engine, Portfolio Management, Trading UI, Analytics & Reporting
- **25 User Stories**: Distributed across the 6 features with proper parent-child relationships

## Using the API Endpoint

### Local Development

If running the backend locally with Azure Functions Core Tools:

```bash
# Start the backend
cd apps/backend
npm start

# Download the CSV
curl http://localhost:7071/api/v1/work-items/export -o assetsim-work-items.csv
```

### Production

If deployed to Azure:

```bash
# Download the CSV (replace with your Function App URL)
curl https://your-function-app.azurewebsites.net/api/v1/work-items/export -o assetsim-work-items.csv
```

## Importing to Azure DevOps Boards

### Prerequisites

1. Azure DevOps organization and project
2. Appropriate permissions to import work items
3. The exported CSV file

### Import Steps

1. **Navigate to Azure DevOps Boards**
   - Go to your Azure DevOps project
   - Click on "Boards" in the left navigation
   - Select "Backlogs"

2. **Open Import Dialog**
   - Click the "..." menu in the top right
   - Select "Import Work Items"

3. **Upload CSV File**
   - Click "Choose File" and select your `assetsim-work-items.csv`
   - Azure DevOps will automatically detect the CSV format

4. **Map Columns** (if needed)
   The following columns should map automatically:
   - Work Item Type → Work Item Type
   - Title → Title
   - State → State
   - Priority → Priority
   - Story Points → Story Points (or Effort)
   - Description → Description
   - Acceptance Criteria → Acceptance Criteria

   > Note: The CSV **does not contain a separate `Parent` column**. Azure DevOps infers parent-child relationships using its hierarchical import format: parent items have an `ID` value and child items immediately follow their parent with an empty `ID`.

5. **Review and Import**
   - Review the preview of work items to be imported
   - Click "Import" to complete the process

6. **Verify Import**
   - Check that the Epic appears at the top level
   - Verify Features are children of the Epic
   - Verify User Stories are children of their respective Features
   - Check that States, Priority, and Story Points are correct

## Work Item Structure

### Epic: Portfolio Simulation Platform (200 story points)

#### Feature 1: Exchange Management (34 story points)
- Create Exchange API endpoint (Closed, 8 points)
- Implement Exchange RLS policies (Closed, 13 points)
- Exchange role management UI (Active, 8 points)
- Exchange configuration page (New, 5 points)

#### Feature 2: Order Execution (42 story points)
- Create Order API endpoint (Closed, 13 points)
- Market order matching engine (Active, 13 points)
- Limit order matching engine (Active, 8 points)
- Stop and Stop-Limit order support (New, 8 points)

#### Feature 3: Market Simulation Engine (34 story points)
- Market tick timer function (Closed, 8 points)
- Random walk price generation (Closed, 8 points)
- OHLC data aggregation (Closed, 13 points)
- SignalR real-time price broadcast (Active, 5 points)

#### Feature 4: Portfolio Management (29 story points)
- Create Portfolio API endpoint (New, 8 points)
- Portfolio positions view (New, 8 points)
- Portfolio P&L calculation (New, 8 points)
- Portfolio analytics dashboard (New, 5 points)

#### Feature 5: Trading UI (34 story points)
- Price chart with Kendo Charts (Active, 8 points)
- Order entry form component (New, 8 points)
- Order blotter with Kendo Grid (New, 8 points)
- Position blotter (New, 5 points)
- Market depth display (New, 5 points)

#### Feature 6: Analytics & Reporting (27 story points)
- Performance attribution report (New, 8 points)
- Trade execution quality metrics (New, 8 points)
- Risk exposure dashboard (New, 8 points)
- Historical data export (New, 3 points)

## CSV Format Details

### Column Descriptions

- **ID**: Azure DevOps hierarchical import ID; parent items (Epic) have an ID value, child items (Features, User Stories) have empty ID field
- **Work Item Type**: Epic, Feature, or User Story
- **Title**: Brief title of the work item
- **State**: New, Active, Resolved, or Closed
- **Priority**: 1-4 (1 = highest priority)
- **Story Points**: Estimated effort (optional for Epics and Features)
- **Description**: Detailed description of the work item (markdown supported)
- **Acceptance Criteria**: List of criteria that must be met (markdown supported)

### Special Handling

- **Markdown**: Preserved in Description and Acceptance Criteria fields
- **Line Breaks**: Converted to spaces for Azure DevOps compatibility
- **Commas**: Fields containing commas are automatically quoted
- **Quotes**: Internal quotes are escaped by doubling (e.g., `"text"` → `"text""`)

## Troubleshooting

### Import Fails

If the import fails:

1. **Check CSV Format**: Open the CSV in a text editor to verify format
2. **Verify Column Headers**: Ensure headers match Azure DevOps field names
3. **Check Hierarchy Columns**: Verify that parent work items have values in the `ID` column and that their child items immediately follow them with a blank `ID` value
4. **Review Error Messages**: Azure DevOps will provide specific error details

### Hierarchy Issues

If the hierarchy doesn't display correctly:

1. **Verify Hierarchical Layout**: Each parent work item (Epic or Feature) must have an `ID` value, and all of its child items (Features or User Stories) must immediately follow it in the CSV with a blank `ID` value
2. **Preserve Row Ordering**: Do not reorder rows in Excel or other tools; the CSV relies on parents appearing before their children and on children being grouped directly under their parent
3. **Check for Gaps**: Ensure there are no unrelated work items inserted between a parent and its children, as this can break the inferred hierarchy during import

### Missing Fields

If some fields don't import:

1. **Map Custom Fields**: You may need to manually map custom Azure DevOps fields
2. **Check Field Names**: Ensure your Azure DevOps project has matching field names
3. **Field Types**: Verify field types match (e.g., numeric for Story Points)

## Sample CSV

A sample CSV file is available at `apps/backend/sample-work-items.csv` for reference.

## Technical Details

### Implementation

- **Location**: `apps/backend/src/functions/exportWorkItems.ts`
- **Data Source**: `apps/backend/src/data/assetsim-work-items.ts`
- **Utilities**: `apps/backend/src/types/work-item.ts`
- **Tests**: 28 passing tests with 83.8% coverage

### Running Tests

```bash
cd apps/backend
npm test -- src/types/work-item.spec.ts src/functions/exportWorkItems.spec.ts
```

### Modifying Work Items

To add or modify work items:

1. Edit `apps/backend/src/data/assetsim-work-items.ts`
2. Follow the existing data structure
3. Maintain proper parent references
4. Run tests to verify changes
5. Rebuild: `npm run build`

## References

- [Azure DevOps CSV Import Documentation](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/import-work-items-from-csv?view=azure-devops)
- [Backend API Documentation](./README.md)
- [RFC 4180 CSV Standard](https://datatracker.ietf.org/doc/html/rfc4180)
