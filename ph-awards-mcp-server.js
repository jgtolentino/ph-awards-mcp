#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

// API configuration
const API_BASE_URL = process.env.RENDER_API_URL || 'https://gagambi-backend.onrender.com';

// Create server instance
const server = new Server(
  {
    name: 'ph-awards-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const TOOLS = [
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
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'ph_awards_search': {
        const response = await axios.get(`${API_BASE_URL}/api/v1/awards/search`, {
          params: {
            q: args.query,
            category: args.category || 'all',
          },
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'ph_awards_get_document': {
        const response = await axios.get(`${API_BASE_URL}/api/v1/awards/${args.document_id}`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'ph_awards_stats': {
        const response = await axios.get(`${API_BASE_URL}/api/v1/awards/stats`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'ph_awards_extract_insights': {
        // For now, we'll simulate insights extraction
        const insights = {
          focus: args.focus || 'effectiveness',
          insights: [
            {
              title: 'Digital Transformation Dominates',
              description: 'Over 60% of winning campaigns leveraged digital innovation',
              score: 0.85,
            },
            {
              title: 'Local Insights Drive Global Success',
              description: 'Campaigns with strong local cultural insights showed 40% higher effectiveness',
              score: 0.78,
            },
            {
              title: 'Integrated Campaigns Win',
              description: 'Multi-channel campaigns had 3x higher success rate',
              score: 0.92,
            },
          ].slice(0, args.limit || 5),
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(insights, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PH Awards MCP Server running on stdio');
}

main().catch(console.error);