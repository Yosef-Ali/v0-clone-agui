import { type GeneratorState } from "../state/generator-state.js";

export type LangGraphRole = "user" | "assistant" | "system" | "tool";
export type LangGraphMessageType = "human" | "ai" | "system" | "tool";

export interface LangGraphMessageContent {
  type: "text";
  text: string;
}

export interface LangGraphMessage {
  id: string;
  role: LangGraphRole;
  type: LangGraphMessageType;
  content: LangGraphMessageContent[];
  createdAt: string;
}

export interface ThreadValues extends GeneratorState {}

export interface ThreadMetadata {
  writes: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ThreadRecord {
  threadId: string;
  metadata: ThreadMetadata;
  values: ThreadValues;
  status: "idle" | "running" | "completed";
  createdAt: string;
  updatedAt: string;
  checkpoint?: {
    checkpoint_id: string;
  };
}

export interface GraphSchemas {
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  context_schema: Record<string, unknown>;
  config_schema: Record<string, unknown>;
}

export interface GraphInfo {
  nodes: Array<{ id: string; label: string; description?: string }>;
  edges: Array<{ source: string; target: string }>;
}

export interface AssistantSummary {
  assistant_id: string;
  graph_id: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}
