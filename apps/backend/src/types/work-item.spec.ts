import { describe, it, expect } from 'vitest';
import {
  escapeCsvValue,
  mapGitHubStatusToAzureDevOps,
  workItemToCsvRow,
  workItemsToCSV,
  WorkItem,
  CSV_HEADERS,
} from './work-item';

describe('work-item utilities', () => {
  describe('escapeCsvValue', () => {
    it('should return empty string for undefined or null', () => {
      expect(escapeCsvValue(undefined)).toBe('');
      expect(escapeCsvValue(null as any)).toBe('');
      expect(escapeCsvValue('')).toBe('');
    });

    it('should return value as-is if no special characters', () => {
      expect(escapeCsvValue('Simple text')).toBe('Simple text');
      expect(escapeCsvValue(123)).toBe('123');
    });

    it('should quote and escape values with commas', () => {
      expect(escapeCsvValue('Value, with comma')).toBe('"Value, with comma"');
    });

    it('should convert newlines to spaces for Azure DevOps compatibility', () => {
      expect(escapeCsvValue('Line 1\nLine 2')).toBe('Line 1 Line 2');
      expect(escapeCsvValue('Line 1\r\nLine 2')).toBe('Line 1 Line 2');
    });

    it('should quote and double-escape internal quotes', () => {
      expect(escapeCsvValue('Value with "quotes"')).toBe('"Value with ""quotes"""');
    });

    it('should handle complex markdown content', () => {
      const markdown = '- Item 1\n- Item 2\n- "Special" item';
      const escaped = escapeCsvValue(markdown);
      // Newlines converted to spaces, quotes doubled and wrapped in quotes
      expect(escaped).toBe('"- Item 1 - Item 2 - ""Special"" item"');
    });
  });

  describe('mapGitHubStatusToAzureDevOps', () => {
    it('should map "closed" to "Closed"', () => {
      expect(mapGitHubStatusToAzureDevOps('closed')).toBe('Closed');
      expect(mapGitHubStatusToAzureDevOps('Closed')).toBe('Closed');
      expect(mapGitHubStatusToAzureDevOps('CLOSED')).toBe('Closed');
    });

    it('should map "open" and "active" to "Active"', () => {
      expect(mapGitHubStatusToAzureDevOps('open')).toBe('Active');
      expect(mapGitHubStatusToAzureDevOps('active')).toBe('Active');
      expect(mapGitHubStatusToAzureDevOps('Open')).toBe('Active');
      expect(mapGitHubStatusToAzureDevOps('Active')).toBe('Active');
    });

    it('should map other statuses to "New"', () => {
      expect(mapGitHubStatusToAzureDevOps('pending')).toBe('New');
      expect(mapGitHubStatusToAzureDevOps('draft')).toBe('New');
      expect(mapGitHubStatusToAzureDevOps('unknown')).toBe('New');
    });
  });

  describe('workItemToCsvRow', () => {
    it('should convert parent work item to CSV row with ID', () => {
      const workItem: WorkItem = {
        id: '1',
        workItemType: 'Epic',
        title: 'Test Epic',
        state: 'Active',
        priority: 1,
        storyPoints: 100,
        description: 'Test description',
        acceptanceCriteria: '- Criteria 1 - Criteria 2',
      };

      const row = workItemToCsvRow(workItem, false);
      expect(row).toBe('1,Epic,Test Epic,Active,1,100,Test description,- Criteria 1 - Criteria 2');
    });

    it('should convert child work item to CSV row with empty ID', () => {
      const workItem: WorkItem = {
        workItemType: 'User Story',
        title: 'Test Story',
        state: 'Active',
        priority: 2,
        storyPoints: 5,
        description: 'Test description',
        acceptanceCriteria: '- Criteria 1 - Criteria 2',
        parent: 'Test Feature',
      };

      const row = workItemToCsvRow(workItem, true);
      expect(row).toBe(',User Story,Test Story,Active,2,5,Test description,- Criteria 1 - Criteria 2');
    });

    it('should handle optional fields', () => {
      const workItem: WorkItem = {
        id: '1',
        workItemType: 'Epic',
        title: 'Test Epic',
        state: 'New',
        priority: 1,
      };

      const row = workItemToCsvRow(workItem, false);
      expect(row).toBe('1,Epic,Test Epic,New,1,,,,');
    });

    it('should properly escape commas in values', () => {
      const workItem: WorkItem = {
        id: '1',
        workItemType: 'Feature',
        title: 'Feature, with comma',
        state: 'Active',
        priority: 1,
        description: 'Description, also with comma',
      };

      const row = workItemToCsvRow(workItem, false);
      expect(row).toContain('"Feature, with comma"');
      expect(row).toContain('"Description, also with comma"');
    });
  });

  describe('workItemsToCSV', () => {
    it('should generate hierarchical CSV with Epic and children', () => {
      const workItems: WorkItem[] = [
        {
          id: '1',
          workItemType: 'Epic',
          title: 'Epic 1',
          state: 'Active',
          priority: 1,
          storyPoints: 100,
        },
        {
          workItemType: 'Feature',
          title: 'Feature 1',
          state: 'New',
          priority: 2,
          storyPoints: 20,
          parent: 'Epic 1',
        },
      ];

      const csv = workItemsToCSV(workItems);
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // header + Epic + Feature (as child)
      expect(lines[0]).toBe(CSV_HEADERS.join(','));
      expect(lines[1]).toContain('1,Epic,Epic 1'); // Epic with ID
      expect(lines[2]).toContain(',Feature,Feature 1'); // Feature with empty ID
    });

    it('should generate valid CSV for empty array', () => {
      const csv = workItemsToCSV([]);
      expect(csv).toBe(CSV_HEADERS.join(','));
    });

    it('should maintain proper hierarchy in output', () => {
      const workItems: WorkItem[] = [
        {
          id: '1',
          workItemType: 'Epic',
          title: 'My Epic',
          state: 'Active',
          priority: 1,
        },
        {
          workItemType: 'Feature',
          title: 'My Feature',
          state: 'Active',
          priority: 1,
          parent: 'My Epic',
        },
        {
          workItemType: 'User Story',
          title: 'My Story',
          state: 'New',
          priority: 2,
          parent: 'My Feature',
        },
      ];

      const csv = workItemsToCSV(workItems);
      const lines = csv.split('\n');

      // Epic with ID, Feature with empty ID (child), User Story with empty ID (grandchild)
      expect(lines.length).toBe(4); // header + Epic + Feature + User Story
      expect(lines[1]).toContain('1,Epic,My Epic'); // Epic with ID
      expect(lines[2]).toContain(',Feature,My Feature'); // Feature with empty ID
      expect(lines[3]).toContain(',User Story,My Story'); // User Story with empty ID
    });

    it('should handle markdown content in description and acceptance criteria', () => {
      const workItems: WorkItem[] = [
        {
          id: '1',
          workItemType: 'Epic',
          title: 'Epic with Markdown',
          state: 'Active',
          priority: 1,
        },
        {
          workItemType: 'User Story',
          title: 'Story with Markdown',
          state: 'Active',
          priority: 2,
          description: 'Description with **bold** and *italic* text',
          acceptanceCriteria: '- [x] First item\n- [ ] Second item\n- [ ] Third item',
          parent: 'Epic with Markdown',
        },
      ];

      const csv = workItemsToCSV(workItems);
      expect(csv).toContain('**bold**');
      expect(csv).toContain('*italic*');
      // Newlines are converted to spaces
      expect(csv).toContain('- [x] First item - [ ] Second item - [ ] Third item');
    });
  });

  describe('CSV_HEADERS', () => {
    it('should have the correct Azure DevOps hierarchical columns', () => {
      expect(CSV_HEADERS).toEqual([
        'ID',
        'Work Item Type',
        'Title',
        'State',
        'Priority',
        'Story Points',
        'Description',
        'Acceptance Criteria',
      ]);
    });
  });
});
