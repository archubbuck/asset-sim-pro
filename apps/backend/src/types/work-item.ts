import { z } from 'zod';

// Azure DevOps Work Item Types
export type WorkItemType = 'Epic' | 'Feature' | 'User Story';
export type WorkItemState = 'New' | 'Active' | 'Resolved' | 'Closed';

// Zod schemas for validation
export const WorkItemSchema = z.object({
  id: z.string().optional(), // ID for parent work items, empty for children
  workItemType: z.enum(['Epic', 'Feature', 'User Story']),
  title: z.string().min(1).max(255),
  state: z.enum(['New', 'Active', 'Resolved', 'Closed']),
  priority: z.number().int().min(1).max(4),
  storyPoints: z.number().int().min(0).optional(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  parent: z.string().optional(), // Used internally to track hierarchy
});

export type WorkItem = z.infer<typeof WorkItemSchema>;

// CSV column headers for Azure DevOps hierarchical import
export const CSV_HEADERS = [
  'ID',
  'Work Item Type',
  'Title',
  'State',
  'Priority',
  'Story Points',
  'Description',
  'Acceptance Criteria',
] as const;

/**
 * Escapes a string value for CSV format compatible with Azure DevOps import
 * - Replaces newlines with spaces to ensure single-line cells
 * - Wraps in quotes if contains comma or quote
 * - Escapes internal quotes by doubling them
 * - Preserves markdown formatting (but removes line breaks)
 */
export function escapeCsvValue(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  let str = String(value);
  
  // Replace newlines with spaces for Azure DevOps compatibility
  // This prevents multi-line cells which can cause import issues
  str = str.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Check if value needs quoting
  const needsQuotes = str.includes(',') || str.includes('"');
  
  if (needsQuotes) {
    // Escape quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return str;
}

/**
 * Maps GitHub issue state to Azure DevOps work item state
 */
export function mapGitHubStatusToAzureDevOps(githubStatus: string): WorkItemState {
  const status = githubStatus.toLowerCase();
  
  if (status === 'closed') {
    return 'Closed';
  } else if (status === 'active' || status === 'open') {
    return 'Active';
  }
  
  return 'New';
}

/**
 * Converts a work item to a CSV row in Azure DevOps hierarchical format
 * Parent items have an ID, children have an empty ID field
 */
export function workItemToCsvRow(item: WorkItem, isChild: boolean = false): string {
  const values = [
    isChild ? '' : escapeCsvValue(item.id || ''), // Empty ID for children
    escapeCsvValue(item.workItemType),
    escapeCsvValue(item.title),
    escapeCsvValue(item.state),
    escapeCsvValue(item.priority),
    escapeCsvValue(item.storyPoints),
    escapeCsvValue(item.description),
    escapeCsvValue(item.acceptanceCriteria),
  ];
  
  return values.join(',');
}

/**
 * Converts an array of work items to a complete CSV string in Azure DevOps hierarchical format
 * Children are listed immediately after their parents with empty ID fields
 */
export function workItemsToCSV(items: WorkItem[]): string {
  const headerRow = CSV_HEADERS.join(',');
  const dataRows: string[] = [];
  
  // Process items hierarchically
  items.forEach(item => {
    // If this item has no parent, it's a top-level item (Epic)
    if (!item.parent) {
      dataRows.push(workItemToCsvRow(item, false));
      
      // Find and add all direct children
      const children = items.filter(child => child.parent === item.title);
      children.forEach(child => {
        dataRows.push(workItemToCsvRow(child, true));
        
        // Find and add grandchildren (User Stories under Features)
        const grandchildren = items.filter(gc => gc.parent === child.title);
        grandchildren.forEach(grandchild => {
          dataRows.push(workItemToCsvRow(grandchild, true));
        });
      });
    }
  });
  
  return [headerRow, ...dataRows].join('\n');
}
