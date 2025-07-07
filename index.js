#!/usr/bin/env node

/**
 * PH Awards MCP Service - Standalone Deployment
 * REST API service for PH Awards data with SQLite backend
 * Render-ready deployment
 */

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db;
try {
  db = new Database('./ces_intelligence.db', { verbose: console.log });
  console.log('✅ Database connected');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'ph-awards-mcp',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PH Awards MCP Service',
    version: '1.0.0',
    docs: '/api/docs',
    endpoints: {
      stats: '/api/v1/ph-awards/stats',
      search: '/api/v1/ph-awards/campaigns/search',
      cultural: '/api/v1/ph-awards/cultural/trends',
      predict: '/api/v1/ph-awards/predict/award'
    }
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'PH Awards MCP API',
    version: '1.0.0',
    description: 'Philippine Awards Campaign Intelligence API',
    endpoints: [
      {
        path: '/api/v1/ph-awards/stats',
        method: 'GET',
        description: 'Get campaign statistics and metrics'
      },
      {
        path: '/api/v1/ph-awards/campaigns/search',
        method: 'POST',
        description: 'Search campaigns by criteria',
        body: {
          query: 'string',
          filters: 'object'
        }
      },
      {
        path: '/api/v1/ph-awards/cultural/trends',
        method: 'GET',
        description: 'Get Filipino cultural intelligence trends'
      },
      {
        path: '/api/v1/ph-awards/predict/award',
        method: 'POST',
        description: 'Predict award potential for campaign',
        body: {
          campaign_text: 'string'
        }
      }
    ]
  });
});

// PH Awards Statistics
app.get('/api/v1/ph-awards/stats', (req, res) => {
  try {
    const stats = {
      total_campaigns: 0,
      processed_campaigns: 0,
      award_winners: 0,
      csr_campaigns: 0,
      cultural_campaigns: 0
    };

    // Check if campaigns table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns'").get();
    
    if (tableExists) {
      const totalQuery = db.prepare('SELECT COUNT(*) as count FROM campaigns');
      const processedQuery = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE campaign_name IS NOT NULL');
      const awardQuery = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE won_award = 1');
      const csrQuery = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE is_csr_campaign = 1');
      const culturalQuery = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE uses_local_culture = 1');

      stats.total_campaigns = totalQuery.get()?.count || 0;
      stats.processed_campaigns = processedQuery.get()?.count || 0;
      stats.award_winners = awardQuery.get()?.count || 0;
      stats.csr_campaigns = csrQuery.get()?.count || 0;
      stats.cultural_campaigns = culturalQuery.get()?.count || 0;
    }

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      message: error.message
    });
  }
});

// Campaign Search
app.post('/api/v1/ph-awards/campaigns/search', (req, res) => {
  try {
    const { query = '', filters = {}, limit = 10, offset = 0 } = req.body;
    
    let sql = 'SELECT * FROM campaigns WHERE 1=1';
    const params = [];

    // Add search query
    if (query.trim()) {
      sql += ' AND (campaign_name LIKE ? OR content LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }

    // Add filters
    if (filters.won_award !== undefined) {
      sql += ' AND won_award = ?';
      params.push(filters.won_award ? 1 : 0);
    }

    if (filters.is_csr_campaign !== undefined) {
      sql += ' AND is_csr_campaign = ?';
      params.push(filters.is_csr_campaign ? 1 : 0);
    }

    if (filters.uses_local_culture !== undefined) {
      sql += ' AND uses_local_culture = ?';
      params.push(filters.uses_local_culture ? 1 : 0);
    }

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const campaigns = db.prepare(sql).all(...params);

    // Get total count for pagination
    let countSql = sql.replace('SELECT *', 'SELECT COUNT(*)')
                     .replace(/ LIMIT.*$/, '');
    const countParams = params.slice(0, -2); // Remove limit and offset
    const total = db.prepare(countSql).get(...countParams)?.['COUNT(*)'] || 0;

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

// Cultural Trends
app.get('/api/v1/ph-awards/cultural/trends', (req, res) => {
  try {
    const trends = {
      cultural_elements: [],
      emotional_patterns: [],
      regional_targeting: [],
      innovation_markers: []
    };

    // Check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns'").get();
    
    if (tableExists) {
      // Get cultural campaigns
      const culturalCampaigns = db.prepare(`
        SELECT * FROM campaigns 
        WHERE uses_local_culture = 1 AND campaign_name IS NOT NULL
        ORDER BY overall_ces_score DESC
        LIMIT 20
      `).all();

      trends.cultural_elements = culturalCampaigns.map(c => ({
        campaign: c.campaign_name,
        score: c.overall_ces_score,
        cultural_markers: c.uses_local_culture
      }));

      // Aggregate stats
      const csrCount = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE is_csr_campaign = 1').get()?.count || 0;
      const culturalCount = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE uses_local_culture = 1').get()?.count || 0;
      const youthCount = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE targets_youth = 1').get()?.count || 0;

      trends.summary = {
        csr_campaigns: csrCount,
        cultural_campaigns: culturalCount,
        youth_targeting: youthCount
      };
    }

    res.json({
      success: true,
      data: trends,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cultural trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cultural trends',
      message: error.message
    });
  }
});

// Award Prediction
app.post('/api/v1/ph-awards/predict/award', (req, res) => {
  try {
    const { campaign_text } = req.body;
    
    if (!campaign_text) {
      return res.status(400).json({
        success: false,
        error: 'campaign_text is required'
      });
    }

    // Simple prediction logic (can be enhanced with ML)
    const text = campaign_text.toLowerCase();
    let score = 50; // Base score

    // Award keywords boost
    const awardKeywords = ['award', 'winner', 'gold', 'silver', 'bronze', 'grand prix', 'best'];
    const awardMatches = awardKeywords.filter(keyword => text.includes(keyword));
    score += awardMatches.length * 10;

    // CSR keywords boost
    const csrKeywords = ['csr', 'social', 'community', 'environment', 'sustainability'];
    const csrMatches = csrKeywords.filter(keyword => text.includes(keyword));
    score += csrMatches.length * 8;

    // Cultural keywords boost
    const culturalKeywords = ['filipino', 'pinoy', 'bayanihan', 'family', 'kapamilya'];
    const culturalMatches = culturalKeywords.filter(keyword => text.includes(keyword));
    score += culturalMatches.length * 6;

    // Cap at 100
    score = Math.min(score, 100);

    const prediction = {
      award_probability: score,
      confidence: score > 70 ? 'high' : score > 50 ? 'medium' : 'low',
      factors: {
        award_indicators: awardMatches,
        csr_elements: csrMatches,
        cultural_elements: culturalMatches
      },
      recommendation: score > 70 ? 'Strong award potential' : 
                     score > 50 ? 'Moderate award potential' : 
                     'Consider strengthening award elements'
    };

    res.json({
      success: true,
      data: prediction,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Prediction failed',
      message: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} not found`,
    available_endpoints: [
      'GET /health',
      'GET /api/v1/ph-awards/stats',
      'POST /api/v1/ph-awards/campaigns/search',
      'GET /api/v1/ph-awards/cultural/trends',
      'POST /api/v1/ph-awards/predict/award'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PH Awards MCP Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (db) {
    db.close();
    console.log('✅ Database connection closed');
  }
  process.exit(0);
});

export default app;