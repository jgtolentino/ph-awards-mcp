#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall } from './handlers/index.js';
import { TOOLS } from './schemas/tools.js';
import { logInfo, logError } from './utils/logger.js';
import { startHealthServer } from './health-server.js';

// Server configuration
const server = new Server(
  {
    name: 'ph-awards-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logInfo('Listing tools');
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, handleToolCall);

// Main function
async function main() {
  logInfo('Starting PH Awards MCP server', {
    version: '2.0.0',
    apiUrl: process.env.RENDER_API_URL || 'https://gagambi-backend.onrender.com',
  });

  // Start health check server for Render
  const healthPort = parseInt(process.env.PORT || '3000', 10);
  startHealthServer(healthPort);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logInfo('Server connected via stdio transport');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logInfo('Received SIGINT, shutting down gracefully');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logInfo('Received SIGTERM, shutting down gracefully');
    await server.close();
    process.exit(0);
  });
}

// Start server
main().catch((error) => {
  logError('Fatal error during startup', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});