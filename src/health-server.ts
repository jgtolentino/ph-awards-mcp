import http from 'http';
import { logInfo } from './utils/logger.js';

// Create a simple HTTP server for health checks
export function startHealthServer(port = 3000): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'healthy',
        service: 'ph-awards-mcp',
        version: '2.0.0',
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    logInfo(`Health check server listening on port ${port}`);
  });

  return server;
}