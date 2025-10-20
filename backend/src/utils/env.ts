import { config } from "dotenv";

let initialized = false;

export function loadEnvironment(): void {
  if (initialized) {
    return;
  }

  config();
  initialized = true;
}

export function getEnvNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
