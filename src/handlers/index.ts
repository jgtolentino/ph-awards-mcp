import { CallToolRequest, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { 
  SearchSchema, 
  GetDocumentSchema, 
  StatsSchema, 
  ExtractInsightsSchema 
} from '../schemas/tools.js';
import { PHAwardsAPI } from '../services/api.js';
import { logDebug, logError } from '../utils/logger.js';

// Initialize API client
const apiBaseUrl = process.env.RENDER_API_URL || 'https://gagambi-backend.onrender.com';
const api = new PHAwardsAPI(apiBaseUrl);

export async function handleToolCall(request: CallToolRequest) {
  const { name, arguments: args } = request.params;

  logDebug('Tool call received', { tool: name, args });

  try {
    switch (name) {
      case 'ph_awards_search': {
        const validatedArgs = SearchSchema.parse(args);
        const result = await api.search(validatedArgs.query, validatedArgs.category);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'ph_awards_get_document': {
        const validatedArgs = GetDocumentSchema.parse(args);
        const result = await api.getDocument(validatedArgs.document_id);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'ph_awards_stats': {
        StatsSchema.parse(args); // Validate empty object
        const result = await api.getStats();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'ph_awards_extract_insights': {
        const validatedArgs = ExtractInsightsSchema.parse(args);
        const result = await api.extractInsights(
          validatedArgs.focus,
          validatedArgs.limit
        );
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    logError('Tool execution failed', {
      tool: name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof McpError) {
      throw error;
    }

    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.message}`
      );
    }

    // Handle API errors
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
}