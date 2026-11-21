import { GoogleGenAI } from '@google/genai';
import { createAirService } from './air/air-service.js';
import { createAiService } from './ai/ai-service.js';
import { createGeminiClient, type GenerateContent } from './ai/gemini-client.js';
import { createApp } from './app.js';
import { parseConfig } from './config.js';

function geminiCaller(apiKey: string | undefined): GenerateContent | null {
  if (apiKey === undefined) {
    return null;
  }
  const genai = new GoogleGenAI({ apiKey });
  return (params) => genai.models.generateContent(params);
}

/**
 * Build the real app from environment variables — the one place production dependencies are
 * created. Used by the Vercel function and by the Vite dev server.
 */
export function createServerApp(env: Record<string, unknown> = process.env) {
  const config = parseConfig(env);
  const client = createGeminiClient({
    generate: geminiCaller(config.GEMINI_API_KEY),
    models: config.GEMINI_MODELS,
    thinkingLevel: config.GEMINI_THINKING_LEVEL,
    dailyBudget: config.GEMINI_DAILY_BUDGET,
    now: Date.now,
  });
  return createApp({
    config,
    now: Date.now,
    air: createAirService({ fetch, now: () => new Date() }),
    ai: createAiService({ client, now: Date.now }),
  });
}
