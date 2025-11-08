import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import axios from 'axios';

const router = Router();

// Schema for chat requests
const chatRequestSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  context: z.object({
    userId: z.string().uuid().optional(),
  }).optional(),
});

// GET /api/chat-with-data - Health check for chat service
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Chat with Data service is running',
    vannaApiUrl: process.env.VANNA_API_BASE_URL || 'Not configured',
  });
});

// POST /api/chat-with-data - Forwards NL queries to Vanna AI
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, context } = chatRequestSchema.parse(req.body);

    const startTime = Date.now();

    // Check if Vanna API is configured
    if (!process.env.VANNA_API_BASE_URL) {
      return res.status(503).json({
        success: false,
        error: 'Vanna AI service is not configured',
        query,
        generatedSQL: null,
        results: [],
        chartType: 'metric',
        executionTime: 0,
      });
    }

    try {
      // Forward the request to Vanna AI service
      const vannaResponse = await axios.post(
        `${process.env.VANNA_API_BASE_URL}/ask`,
        {
          query,
          context,
        },
        {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const executionTime = Date.now() - startTime;

      // Transform Vanna AI response to match our API format
      const chatResponse = {
        success: true,
        query,
        generatedSQL: vannaResponse.data.sql || vannaResponse.data.generatedSQL,
        results: vannaResponse.data.results || [],
        chartType: vannaResponse.data.chart_type || vannaResponse.data.chartType || 'table',
        executionTime: executionTime / 1000, // Convert to seconds
        error: null,
        suggestedFollowUp: vannaResponse.data.suggestedFollowUp || [],
      };

      res.json(chatResponse);
    } catch (vannaError) {
      const executionTime = Date.now() - startTime;

      // If Vanna AI is unavailable, provide a helpful error response
      if (axios.isAxiosError(vannaError)) {
        console.error('❌ Vanna AI service error:', vannaError.message);

        // Check if it's a connection error
        if (vannaError.code === 'ECONNREFUSED' || vannaError.code === 'ETIMEDOUT') {
          return res.status(503).json({
            success: false,
            query,
            generatedSQL: null,
            results: [],
            chartType: 'metric',
            executionTime: executionTime / 1000,
            error: 'Vanna AI service is temporarily unavailable. Please try again later.',
          });
        }

        // Check if Vanna AI returned an error response
        if (vannaError.response) {
          return res.status(vannaError.response.status).json({
            success: false,
            query,
            generatedSQL: vannaError.response.data.sql || null,
            results: vannaError.response.data.results || [],
            chartType: vannaError.response.data.chart_type || 'metric',
            executionTime: executionTime / 1000,
            error: vannaError.response.data.error || 'Vanna AI service error',
          });
        }
      }

      // Generic error
      throw vannaError;
    }
  } catch (error) {
    console.error('❌ Error in chat-with-data endpoint:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: error.errors,
        query: req.body.query || 'Unknown',
        generatedSQL: null,
        results: [],
        chartType: 'metric',
        executionTime: 0,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process your query',
      details: error instanceof Error ? error.message : 'Unknown error',
      query: req.body.query || 'Unknown',
      generatedSQL: null,
      results: [],
      chartType: 'metric',
      executionTime: 0,
    });
  }
});

// GET /api/chat-with-data/suggestions - Returns suggested queries for users
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const suggestions = [
      "What's the total spend in the last 90 days?",
      "List top 5 vendors by spend.",
      "Show overdue invoices as of today.",
      "Compare spend by category.",
      "What's our average invoice value?",
      "How many invoices were processed this month?",
      "What's the total value of pending invoices?",
      "Show payment trends over the last 6 months.",
    ];

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('❌ Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suggestions',
    });
  }
});

export default router;