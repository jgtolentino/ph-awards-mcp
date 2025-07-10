import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import { logDebug, logError } from '../utils/logger.js';

// Response schemas
const SearchResponseSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    brand: z.string(),
    campaign: z.string(),
    agency: z.string(),
    year: z.number(),
    category: z.string(),
  })),
  total: z.number(),
});

const DocumentResponseSchema = z.object({
  id: z.string(),
  brand: z.string(),
  campaign: z.string(),
  agency: z.string(),
  year: z.number(),
  category: z.string(),
  description: z.string(),
  results: z.string().optional(),
  metrics: z.record(z.any()).optional(),
});

const StatsResponseSchema = z.object({
  total_documents: z.number(),
  brands: z.number(),
  campaigns: z.number(),
  agencies: z.number(),
  years_covered: z.array(z.number()),
});

const InsightsResponseSchema = z.object({
  insights: z.array(z.object({
    type: z.string(),
    title: z.string(),
    description: z.string(),
    relevance_score: z.number(),
  })),
});

export class PHAwardsAPI {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for debugging
    this.client.interceptors.request.use((config) => {
      logDebug('API Request', { method: config.method, url: config.url });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        logDebug('API Response', { status: response.status });
        return response;
      },
      (error) => {
        logError('API Error', { 
          message: error.message,
          response: error.response?.data 
        });
        throw error;
      }
    );
  }

  async search(query: string, category: string) {
    try {
      const response = await this.client.get('/api/search', {
        params: { query, category },
      });
      return SearchResponseSchema.parse(response.data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid API response: ${error.message}`);
      }
      throw error;
    }
  }

  async getDocument(documentId: string) {
    try {
      const response = await this.client.get(`/api/documents/${documentId}`);
      return DocumentResponseSchema.parse(response.data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid API response: ${error.message}`);
      }
      throw error;
    }
  }

  async getStats() {
    try {
      const response = await this.client.get('/api/stats');
      return StatsResponseSchema.parse(response.data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid API response: ${error.message}`);
      }
      throw error;
    }
  }

  async extractInsights(focus: string, limit: number) {
    try {
      const response = await this.client.post('/api/insights', {
        focus,
        limit,
      });
      return InsightsResponseSchema.parse(response.data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid API response: ${error.message}`);
      }
      throw error;
    }
  }
}