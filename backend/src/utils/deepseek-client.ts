import OpenAI from "openai";

import { logger } from "./logger.js";

let cachedClient: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not set");
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

  cachedClient = new OpenAI({
    apiKey,
    baseURL: baseUrl,
  });

  logger.info("DeepSeek client initialized");

  return cachedClient;
}
