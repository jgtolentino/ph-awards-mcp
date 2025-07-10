import { describe, it, expect, jest } from '@jest/globals';
import { handleToolCall } from '../src/handlers/index';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

// Mock the API module
jest.mock('../src/services/api', () => ({
  PHAwardsAPI: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({
      results: [
        {
          id: '1',
          brand: 'Test Brand',
          campaign: 'Test Campaign',
          agency: 'Test Agency',
          year: 2023,
          category: 'Digital',
        },
      ],
      total: 1,
    }),
    getDocument: jest.fn().mockResolvedValue({
      id: '1',
      brand: 'Test Brand',
      campaign: 'Test Campaign',
      agency: 'Test Agency',
      year: 2023,
      category: 'Digital',
      description: 'Test description',
    }),
    getStats: jest.fn().mockResolvedValue({
      total_documents: 100,
      brands: 50,
      campaigns: 75,
      agencies: 25,
      years_covered: [2020, 2021, 2022, 2023],
    }),
    extractInsights: jest.fn().mockResolvedValue({
      insights: [
        {
          type: 'effectiveness',
          title: 'Test Insight',
          description: 'Test insight description',
          relevance_score: 0.95,
        },
      ],
    }),
  })),
}));

describe('Tool Handlers', () => {
  describe('ph_awards_search', () => {
    it('should search with valid parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'ph_awards_search',
          arguments: {
            query: 'test',
            category: 'all',
          },
        },
      };

      const result = await handleToolCall(request);
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('results');
      expect(parsed.results).toHaveLength(1);
    });

    it('should fail with missing query', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'ph_awards_search',
          arguments: {
            category: 'all',
          },
        },
      };

      await expect(handleToolCall(request)).rejects.toThrow();
    });
  });

  describe('ph_awards_get_document', () => {
    it('should get document with valid ID', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'ph_awards_get_document',
          arguments: {
            document_id: '1',
          },
        },
      };

      const result = await handleToolCall(request);
      expect(result).toHaveProperty('content');
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('id', '1');
      expect(parsed).toHaveProperty('brand');
    });
  });

  describe('ph_awards_stats', () => {
    it('should get stats without parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'ph_awards_stats',
          arguments: {},
        },
      };

      const result = await handleToolCall(request);
      expect(result).toHaveProperty('content');
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('total_documents');
      expect(parsed).toHaveProperty('brands');
    });
  });

  describe('ph_awards_extract_insights', () => {
    it('should extract insights with default parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'ph_awards_extract_insights',
          arguments: {},
        },
      };

      const result = await handleToolCall(request);
      expect(result).toHaveProperty('content');
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('insights');
      expect(parsed.insights).toHaveLength(1);
    });
  });

  describe('unknown tool', () => {
    it('should throw error for unknown tool', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      };

      await expect(handleToolCall(request)).rejects.toThrow('Unknown tool');
    });
  });
});