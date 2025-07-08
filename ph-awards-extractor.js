#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  archivePath: '/Users/tbwa/Desktop/PH_Awards_All_1112_Documents.json',
  dbPath: '/Users/tbwa/Documents/GitHub/ces_intelligence.db',
  verbose: true
};

// Filipino cultural intelligence markers
const FILIPINO_CULTURAL_MARKERS = {
  values: ['bayanihan', 'kapwa', 'pakikipagkapwa', 'utang na loob', 'hiya', 'bahala na', 'malasakit'],
  festivals: ['fiesta', 'pasko', 'mahal na araw', 'flores de mayo', 'sinulog', 'ati-atihan'],
  family: ['pamilya', 'nanay', 'tatay', 'lola', 'lolo', 'ate', 'kuya', 'bunso'],
  food: ['adobo', 'sinigang', 'lechon', 'lumpia', 'halo-halo', 'balut', 'taho', 'sisig'],
  expressions: ['salamat', 'kumusta', 'pasensya na', 'kaya natin to', 'sige', 'ingat', 'mahal kita'],
  places: ['barangay', 'palengke', 'sari-sari store', 'jeepney', 'tricycle', 'kalye'],
  occasions: ['noche buena', 'media noche', 'handaan', 'binyag', 'kasal', 'birthday']
};

// CES scoring weights
const CES_WEIGHTS = {
  businessResults: 0.30,
  marketImpact: 0.25,
  creativity: 0.20,
  culturalRelevance: 0.15,
  efficiency: 0.10
};

class PHAwardsExtractor {
  constructor() {
    this.db = null;
    this.stats = {
      totalDocuments: 0,
      processedDocuments: 0,
      extractedMetrics: 0,
      culturalInsights: 0,
      errors: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing PH Awards Intelligence Extractor...');
    
    // Create database
    this.db = new Database(CONFIG.dbPath);
    await this.createSchema();
    
    console.log('✅ Database initialized');
  }

  async createSchema() {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        campaign_name TEXT NOT NULL,
        brand TEXT,
        agency TEXT,
        year INTEGER,
        category TEXT,
        subcategory TEXT,
        market TEXT DEFAULT 'Philippines',
        award_metal TEXT,
        overall_ces_score REAL,
        business_results_score REAL,
        market_impact_score REAL,
        creativity_score REAL,
        cultural_relevance_score REAL,
        efficiency_score REAL,
        summary TEXT,
        raw_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT,
        metric_type TEXT,
        metric_name TEXT,
        numeric_value REAL,
        text_value TEXT,
        unit TEXT,
        period TEXT,
        context TEXT,
        confidence_score REAL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS cultural_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT,
        cultural_element TEXT,
        category TEXT,
        context TEXT,
        impact_score REAL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS effectiveness_indicators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT,
        indicator_type TEXT,
        description TEXT,
        value REAL,
        benchmark REAL,
        outperformance REAL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON campaigns(brand)`,
      `CREATE INDEX IF NOT EXISTS idx_campaigns_ces ON campaigns(overall_ces_score)`,
      `CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(metric_type)`,
      `CREATE INDEX IF NOT EXISTS idx_cultural_category ON cultural_insights(category)`
    ];

    schemas.forEach(schema => this.db.prepare(schema).run());
  }

  async validateArchive() {
    try {
      const data = await fs.readFile(CONFIG.archivePath, 'utf8');
      const fileData = JSON.parse(data);
      
      // Handle the nested structure
      const archive = fileData.documents || fileData;
      const metadata = fileData.metadata || {};
      const statistics = fileData.statistics || {};
      
      console.log('\n📊 Archive Validation:');
      console.log(`✓ Total documents: ${metadata.total_documents || statistics.total || 'Unknown'}`);
      console.log(`✓ File size: ${(data.length / 1024 / 1024).toFixed(2)} MB`);
      console.log(`✓ Effectiveness documents: ${metadata.effectiveness_documents || statistics.effectiveness || 0}`);
      console.log(`✓ Documents with metrics: ${metadata.documents_with_metrics || statistics.with_metrics || 0}`);
      
      // If we have statistics, show them
      if (statistics.total) {
        console.log('\n📈 Document breakdown:');
        const statKeys = Object.keys(statistics).filter(k => k.startsWith('award_') || k.startsWith('year_'));
        statKeys.forEach(key => {
          const label = key.replace('award_', 'Award: ').replace('year_', 'Year: ');
          console.log(`  - ${label}: ${statistics[key]} documents`);
        });
      }
      
      // Return documents array if it exists, otherwise the whole object
      if (Array.isArray(archive)) {
        return archive;
      } else if (fileData.documents && Array.isArray(fileData.documents)) {
        return fileData.documents;
      } else {
        // Try to find the documents array in the structure
        if (fileData.all_documents && Array.isArray(fileData.all_documents)) {
          console.log(`✓ Found ${fileData.all_documents.length} documents in 'all_documents' key`);
          return fileData.all_documents;
        }
        const keys = Object.keys(fileData);
        const docsKey = keys.find(k => Array.isArray(fileData[k]) && fileData[k].length > 0);
        if (docsKey) {
          console.log(`✓ Found documents in key: ${docsKey}`);
          return fileData[docsKey];
        }
        throw new Error('Could not find documents array in the file structure');
      }
    } catch (error) {
      console.error('❌ Archive validation failed:', error.message);
      throw error;
    }
  }

  extractMetrics(content) {
    const metrics = [];
    const patterns = {
      percentage: /(\d+(?:\.\d+)?)\s*%\s*([a-zA-Z\s]+)/g,
      currency: /(?:₱|PHP|P)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|M|B)?/gi,
      multiplier: /(\d+(?:\.\d+)?)[xX]\s*([a-zA-Z\s]+)/g,
      growth: /(?:grew|increased|up)\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*%/gi,
      numeric: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|thousand|K|M|B)?\s*([a-zA-Z\s]+)/g
    };

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        metrics.push({
          type,
          value: match[1],
          context: match[0],
          unit: match[2] || null
        });
      }
    });

    return metrics;
  }

  detectCulturalElements(content) {
    const insights = [];
    const lowerContent = content.toLowerCase();

    Object.entries(FILIPINO_CULTURAL_MARKERS).forEach(([category, markers]) => {
      markers.forEach(marker => {
        if (lowerContent.includes(marker.toLowerCase())) {
          const context = this.extractContext(content, marker);
          insights.push({
            element: marker,
            category,
            context,
            impact: this.calculateCulturalImpact(marker, context)
          });
        }
      });
    });

    return insights;
  }

  extractContext(content, term, windowSize = 100) {
    const index = content.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - windowSize);
    const end = Math.min(content.length, index + term.length + windowSize);
    
    return content.slice(start, end).trim();
  }

  calculateCulturalImpact(element, context) {
    // Simple scoring based on prominence and context
    let score = 0.5; // Base score
    
    if (context.toLowerCase().includes('strategy')) score += 0.2;
    if (context.toLowerCase().includes('success')) score += 0.2;
    if (context.toLowerCase().includes('connect')) score += 0.1;
    
    return Math.min(1.0, score);
  }

  calculateCESScores(campaign, metrics, culturalInsights) {
    const scores = {
      businessResults: this.scoreBusinessResults(metrics),
      marketImpact: this.scoreMarketImpact(metrics),
      creativity: this.scoreCreativity(campaign),
      culturalRelevance: this.scoreCulturalRelevance(culturalInsights),
      efficiency: this.scoreEfficiency(metrics)
    };

    // Calculate weighted overall score
    const overall = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + (score * CES_WEIGHTS[key]);
    }, 0);

    return { ...scores, overall };
  }

  scoreBusinessResults(metrics) {
    const relevantMetrics = metrics.filter(m => 
      m.type === 'growth' || m.type === 'percentage' || m.type === 'currency'
    );
    
    if (relevantMetrics.length === 0) return 0.5;
    
    // Simple scoring based on metric presence and values
    let score = 0.5 + (relevantMetrics.length * 0.1);
    return Math.min(1.0, score);
  }

  scoreMarketImpact(metrics) {
    const impactKeywords = ['market share', 'reach', 'awareness', 'penetration'];
    const impactMetrics = metrics.filter(m => 
      impactKeywords.some(keyword => m.context.toLowerCase().includes(keyword))
    );
    
    return Math.min(1.0, 0.5 + (impactMetrics.length * 0.15));
  }

  scoreCreativity(campaign) {
    const creativeKeywords = ['innovative', 'first', 'unique', 'breakthrough', 'original'];
    const content = (campaign.raw_content || '').toLowerCase();
    
    const creativeCount = creativeKeywords.filter(keyword => content.includes(keyword)).length;
    return Math.min(1.0, 0.4 + (creativeCount * 0.15));
  }

  scoreCulturalRelevance(insights) {
    if (insights.length === 0) return 0.3;
    
    const avgImpact = insights.reduce((sum, insight) => sum + insight.impact, 0) / insights.length;
    const diversityBonus = Math.min(0.3, insights.length * 0.05);
    
    return Math.min(1.0, avgImpact + diversityBonus);
  }

  scoreEfficiency(metrics) {
    const efficiencyKeywords = ['roi', 'efficiency', 'cost-effective', 'budget'];
    const efficiencyMetrics = metrics.filter(m => 
      efficiencyKeywords.some(keyword => m.context.toLowerCase().includes(keyword))
    );
    
    return Math.min(1.0, 0.5 + (efficiencyMetrics.length * 0.25));
  }

  async processDocument(doc) {
    try {
      const campaignId = crypto.createHash('md5')
        .update(`${doc.campaign_name}_${doc.brand}_${doc.year}`)
        .digest('hex');

      const content = doc.content || doc.summary || '';
      
      // Extract components
      const metrics = this.extractMetrics(content);
      const culturalInsights = this.detectCulturalElements(content);
      const cesScores = this.calculateCESScores(doc, metrics, culturalInsights);

      // Insert campaign
      const campaignStmt = this.db.prepare(`
        INSERT OR REPLACE INTO campaigns (
          id, campaign_name, brand, agency, year, category, subcategory,
          award_metal, overall_ces_score, business_results_score,
          market_impact_score, creativity_score, cultural_relevance_score,
          efficiency_score, summary, raw_content
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      campaignStmt.run(
        campaignId,
        doc.campaign_name || 'Unknown Campaign',
        doc.brand || 'Unknown Brand',
        doc.agency || 'Unknown Agency',
        doc.year || new Date().getFullYear(),
        doc.category || 'General',
        doc.subcategory || null,
        doc.award_metal || null,
        cesScores.overall,
        cesScores.businessResults,
        cesScores.marketImpact,
        cesScores.creativity,
        cesScores.culturalRelevance,
        cesScores.efficiency,
        doc.summary || content.slice(0, 500),
        content
      );

      // Insert metrics
      const metricStmt = this.db.prepare(`
        INSERT INTO metrics (
          campaign_id, metric_type, metric_name, numeric_value, text_value, unit, context
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      metrics.forEach(metric => {
        metricStmt.run(
          campaignId,
          metric.type,
          'Extracted Metric',
          parseFloat(metric.value.replace(/,/g, '')) || null,
          metric.value,
          metric.unit,
          metric.context
        );
      });

      // Insert cultural insights
      const culturalStmt = this.db.prepare(`
        INSERT INTO cultural_insights (
          campaign_id, cultural_element, category, context, impact_score
        ) VALUES (?, ?, ?, ?, ?)
      `);

      culturalInsights.forEach(insight => {
        culturalStmt.run(
          campaignId,
          insight.element,
          insight.category,
          insight.context,
          insight.impact
        );
      });

      this.stats.processedDocuments++;
      this.stats.extractedMetrics += metrics.length;
      this.stats.culturalInsights += culturalInsights.length;

      if (CONFIG.verbose && this.stats.processedDocuments % 50 === 0) {
        console.log(`✓ Processed ${this.stats.processedDocuments} documents...`);
      }

    } catch (error) {
      this.stats.errors++;
      console.error(`Error processing document: ${error.message}`);
    }
  }

  async extractAll() {
    console.log('\n🔄 Starting extraction process...');
    
    const archive = await this.validateArchive();
    this.stats.totalDocuments = archive.length;

    console.log('\n💾 Processing documents...');
    
    // Process in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < archive.length; i += batchSize) {
      const batch = archive.slice(i, i + batchSize);
      
      const transaction = this.db.transaction(() => {
        batch.forEach(doc => this.processDocument(doc));
      });
      
      transaction();
      
      console.log(`✓ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(archive.length/batchSize)} complete`);
    }

    this.showStats();
  }

  showStats() {
    console.log('\n📊 Extraction Complete!');
    console.log('====================');
    console.log(`✓ Documents processed: ${this.stats.processedDocuments}/${this.stats.totalDocuments}`);
    console.log(`✓ Metrics extracted: ${this.stats.extractedMetrics}`);
    console.log(`✓ Cultural insights: ${this.stats.culturalInsights}`);
    console.log(`✗ Errors encountered: ${this.stats.errors}`);
    
    // Database statistics
    const campaignCount = this.db.prepare('SELECT COUNT(*) as count FROM campaigns').get();
    const avgCES = this.db.prepare('SELECT AVG(overall_ces_score) as avg FROM campaigns').get();
    const topBrands = this.db.prepare(`
      SELECT brand, COUNT(*) as count, AVG(overall_ces_score) as avg_score
      FROM campaigns 
      GROUP BY brand 
      ORDER BY avg_score DESC 
      LIMIT 5
    `).all();

    console.log(`\n📈 Database Summary:`);
    console.log(`✓ Total campaigns: ${campaignCount.count}`);
    console.log(`✓ Average CES score: ${avgCES.avg.toFixed(3)}`);
    
    console.log(`\n🏆 Top Performing Brands:`);
    topBrands.forEach((brand, i) => {
      console.log(`${i+1}. ${brand.brand} - Score: ${brand.avg_score.toFixed(3)} (${brand.count} campaigns)`);
    });
  }

  async close() {
    if (this.db) {
      this.db.close();
      console.log('\n✅ Database connection closed');
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const extractor = new PHAwardsExtractor();

  try {
    if (args.includes('--help')) {
      console.log(`
PH Awards Intelligence Extractor
================================

Usage: node extractor.js [options]

Options:
  --validate    Validate the archive file
  --stats       Show database statistics only
  --help        Show this help message

Default: Run full extraction
      `);
      return;
    }

    await extractor.initialize();

    if (args.includes('--validate')) {
      await extractor.validateArchive();
      console.log('\n✅ Validation complete!');
    } else if (args.includes('--stats')) {
      extractor.showStats();
    } else {
      await extractor.extractAll();
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await extractor.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PHAwardsExtractor;