import { z } from 'zod';

// Azure DevOps Work Item Types
export type WorkItemType = 'Epic' | 'Feature' | 'User Story';
export type WorkItemState = 'New' | 'Active' | 'Resolved' | 'Closed';

// Zod schemas for validation
export const WorkItemSchema = z.object({
  workItemType: z.enum(['Epic', 'Feature', 'User Story']),
  title: z.string().min(1).max(255),
  state: z.enum(['New', 'Active', 'Resolved', 'Closed']),
  priority: z.number().int().min(1).max(4),
  storyPoints: z.number().int().min(0).optional(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  parent: z.string().optional(), // Parent work item title
});

export type WorkItem = z.infer<typeof WorkItemSchema>;

// CSV Export response
export interface WorkItemCSVExportResponse {
  filename: string;
  content: string;
  rowCount: number;
}

// CSV column headers for Azure DevOps import
export const CSV_HEADERS = [
  'Work Item Type',
  'Title',
  'State',
  'Priority',
  'Story Points',
  'Description',
  'Acceptance Criteria',
  'Parent',
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
 * Converts a work item to a CSV row
 */
export function workItemToCsvRow(item: WorkItem): string {
  const values = [
    escapeCsvValue(item.workItemType),
    escapeCsvValue(item.title),
    escapeCsvValue(item.state),
    escapeCsvValue(item.priority),
    escapeCsvValue(item.storyPoints),
    escapeCsvValue(item.description),
    escapeCsvValue(item.acceptanceCriteria),
    escapeCsvValue(item.parent),
  ];
  
  return values.join(',');
}

/**
 * Converts an array of work items to a complete CSV string
 */
export function workItemsToCSV(items: WorkItem[]): string {
  const headerRow = CSV_HEADERS.join(',');
  const dataRows = items.map(workItemToCsvRow);
  
  return [headerRow, ...dataRows].join('\n');
}
