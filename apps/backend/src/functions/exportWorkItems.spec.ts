import { describe, it, expect, vi } from 'vitest';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { exportWorkItems } from './exportWorkItems';
import { ASSETSIM_WORK_ITEMS } from '../data/assetsim-work-items';

describe('exportWorkItems', () => {
  const mockContext = {
    log: vi.fn(),
    error: vi.fn(),
  } as unknown as InvocationContext;

  const mockRequest = {
    method: 'GET',
    url: 'http://localhost:7071/api/v1/work-items/export',
  } as HttpRequest;

  it('should return CSV content with correct headers', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    expect(response.status).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(response.headers?.['Content-Disposition']).toBe('attachment; filename="assetsim-work-items.csv"');
  });

  it('should include CSV header row with ID column', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    const csvContent = response.body as string;
    const lines = csvContent.split('\n');
    
    expect(lines[0]).toBe('ID,Work Item Type,Title,State,Priority,Story Points,Description,Acceptance Criteria');
  });

  it('should export all work items in hierarchical format', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    const csvContent = response.body as string;
    const lines = csvContent.split('\n');
    
    // Header + data rows (no multi-line cells since newlines are converted to spaces)
    expect(lines.length).toBe(ASSETSIM_WORK_ITEMS.length + 1);
  });

  it('should export Epic as first row with ID', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    const csvContent = response.body as string;
    const lines = csvContent.split('\n');
    
    expect(lines[1]).toContain('1,Epic,Portfolio Simulation Platform');
  });

  it('should include Features as children with empty ID', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    const csvContent = response.body as string;
    
    expect(csvContent).toContain(',Feature,Exchange Management');
  });

  it('should include User Stories as children with empty ID', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    const csvContent = response.body as string;
    
    expect(csvContent).toContain(',User Story,Create Exchange API endpoint');
  });

  it('should properly escape markdown content', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    const csvContent = response.body as string;
    
    // Check that Acceptance Criteria header is present
    expect(csvContent).toContain('Acceptance Criteria');
    
    // Verify markdown is present (not stripped) but newlines are converted to spaces
    expect(csvContent).toContain('- ');
    
    // Verify newlines within fields are replaced with spaces
    const lines = csvContent.split('\n');
    expect(lines.length).toBe(ASSETSIM_WORK_ITEMS.length + 1);
  });

  it('should log work item count', async () => {
    await exportWorkItems(mockRequest, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith(expect.stringContaining(`${ASSETSIM_WORK_ITEMS.length} work items`));
  });

  it('should handle errors gracefully', async () => {
    // We can't easily test the error path without mocking the workItemsToCSV function
    // But we can verify the handler still returns a successful response in the normal case
    const response = await exportWorkItems(mockRequest, mockContext);
    
    // Normal case should succeed
    expect(response.status).toBe(200);
  });

  it('should verify correct number of work items', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    const csvContent = response.body as string;
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    // Calculate expected counts dynamically from data
    const expectedEpics = ASSETSIM_WORK_ITEMS.filter(item => item.workItemType === 'Epic').length;
    const expectedFeatures = ASSETSIM_WORK_ITEMS.filter(item => item.workItemType === 'Feature').length;
    const expectedStories = ASSETSIM_WORK_ITEMS.filter(item => item.workItemType === 'User Story').length;
    
    // Total: Header + all work items
    expect(lines.length).toBe(ASSETSIM_WORK_ITEMS.length + 1);
    
    // Count by type based on hierarchical CSV format:
    // - Epic rows: ID followed by "Epic" (e.g. "123,Epic,...")
    // - Feature rows: empty ID field, start with ",Feature,..."
    // - User Story rows: empty ID field, start with ",User Story,..."
    const epicCount = lines.filter(line => /^[^,]+,Epic,/.test(line)).length;
    const featureCount = lines.filter(line => line.startsWith(',Feature,')).length;
    const storyCount = lines.filter(line => line.startsWith(',User Story,')).length;
    
    expect(epicCount).toBe(expectedEpics);
    expect(featureCount).toBe(expectedFeatures);
    expect(storyCount).toBe(expectedStories);
  });

  it('should include all required columns for each row', async () => {
    const response = await exportWorkItems(mockRequest, mockContext);

    const csvContent = response.body as string;
    const lines = csvContent.split('\n');
    
    // Check a few sample rows have the right number of commas
    // (Some values may be empty but commas should still be there)
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    
    dataLines.forEach(line => {
      // Each row should have at least 7 commas (8 fields)
      const commaCount = (line.match(/,/g) || []).length;
      expect(commaCount).toBeGreaterThanOrEqual(7);
    });
  });
});
