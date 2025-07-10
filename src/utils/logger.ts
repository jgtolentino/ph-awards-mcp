import fs from 'fs';
import path from 'path';

// Get log file path from environment or use default
const LOG_FILE = process.env.MCP_LOG_FILE || path.join(process.cwd(), 'mcp-debug.log');
const DEBUG = process.env.MCP_DEBUG === 'true';

export function logDebug(message: string, meta?: any): void {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} [DEBUG] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    // Silently fail - we can't use console.error
  }
}

export function logError(message: string, meta?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} [ERROR] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    // Silently fail - we can't use console.error
  }
}

export function logInfo(message: string, meta?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} [INFO] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    // Silently fail - we can't use console.error
  }
}