import OpenAI from "openai";

import { logger } from "./logger.js";

let cachedClient: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI | null {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    logger.debug("DEEPSEEK_API_KEY not set; falling back to template generator");
    return null;
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

  cachedClient = new OpenAI({
    apiKey,
    baseURL: baseUrl,
  });

  return cachedClient;
}
