import { z } from 'zod';

// Search tool schema
export const SearchSchema = z.object({
  query: z.string().min(1).describe('Search query (brand name, campaign title, or agency)'),
  category: z.enum(['all', 'brand', 'campaign', 'agency'])
    .default('all')
    .describe('Category to search in'),
});

// Get document schema
export const GetDocumentSchema = z.object({
  document_id: z.string().min(1).describe('The ID of the document to retrieve'),
});

// Stats schema (empty object)
export const StatsSchema = z.object({});

// Extract insights schema
export const ExtractInsightsSchema = z.object({
  focus: z.enum(['effectiveness', 'creativity', 'strategy', 'roi'])
    .default('effectiveness')
    .describe('Focus area for insights'),
  limit: z.number().int().positive().default(5)
    .describe('Number of insights to return'),
});

// Tool definitions for MCP
export const TOOLS = [
  {
    name: 'ph_awards_search',
    description: 'Search PH Awards documents by brand, campaign, or agency',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (brand name, campaign title, or agency)',
        },
        category: {
          type: 'string',
          enum: ['all', 'brand', 'campaign', 'agency'],
          description: 'Category to search in',
          default: 'all',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'ph_awards_get_document',
    description: 'Get a specific PH Awards document by ID',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'The ID of the document to retrieve',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'ph_awards_stats',
    description: 'Get statistics about PH Awards database',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ph_awards_extract_insights',
    description: 'Extract insights from PH Awards data',
    inputSchema: {
      type: 'object',
      properties: {
        focus: {
          type: 'string',
          enum: ['effectiveness', 'creativity', 'strategy', 'roi'],
          description: 'Focus area for insights',
          default: 'effectiveness',
        },
        limit: {
          type: 'integer',
          description: 'Number of insights to return',
          default: 5,
        },
      },
    },
  },
] as const;