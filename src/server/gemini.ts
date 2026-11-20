import { GoogleGenAI } from '@google/genai';

/**
 * Create a Gemini AI client instance if an API key is provided.
 * Returns undefined when no API key is available.
 */
export function createGeminiClient(apiKey?: string): GoogleGenAI | undefined {
  if (!apiKey) {
    return undefined;
  }
  return new GoogleGenAI({ apiKey });
}
