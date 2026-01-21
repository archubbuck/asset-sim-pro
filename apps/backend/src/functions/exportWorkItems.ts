import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { workItemsToCSV } from '../types/work-item';
import { ASSETSIM_WORK_ITEMS } from '../data/assetsim-work-items';

/**
 * GET /api/v1/work-items/export
 * 
 * Exports all AssetSim Pro work items as a CSV file ready for import into Azure DevOps Boards.
 * The CSV includes proper hierarchy (Epic -> Features -> User Stories) with all required fields.
 * 
 * Response Format: text/csv
 * Content-Disposition: attachment; filename="assetsim-work-items.csv"
 */
export async function exportWorkItems(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('Exporting AssetSim Pro work items to CSV');

    // Generate CSV content
    const csvContent = workItemsToCSV(ASSETSIM_WORK_ITEMS);
    
    const rowCount = ASSETSIM_WORK_ITEMS.length;
    context.log(`Generated CSV with ${rowCount} work items`);

    // Return CSV file as download
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="assetsim-work-items.csv"',
      },
      body: csvContent,
    };
  } catch (error) {
    context.error('Error exporting work items:', error);

    return {
      status: 500,
      jsonBody: {
        type: 'https://assetsim.com/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An internal error occurred while exporting work items. Please try again or contact support if the issue persists.',
      },
    };
  }
}

app.http('exportWorkItems', {
  methods: ['GET'],
  route: 'v1/work-items/export',
  authLevel: 'function',
  handler: exportWorkItems,
});
