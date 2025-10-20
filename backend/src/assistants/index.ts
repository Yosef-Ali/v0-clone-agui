import { createV0GeneratorAssistant } from "./v0-generator.js";
import {
  type AssistantSummary,
  type GraphInfo,
  type GraphSchemas,
  type ThreadRecord,
  type ThreadValues,
} from "../types/langgraph.js";

interface RunContext {
  thread: ThreadRecord;
  input: Record<string, unknown>;
  runId: string;
  emit(event: string, payload: unknown): void;
  emitState(state: ThreadValues): void;
}

interface RunResult {
  state: ThreadValues;
  summary: string;
  completedStep: string;
}

interface AssistantDefinition {
  summary: AssistantSummary;
  graph: GraphInfo;
  schemas: GraphSchemas;
  run(context: RunContext): Promise<RunResult>;
}

class AssistantRegistry {
  private readonly assistantsById = new Map<string, AssistantDefinition>();
  private readonly assistantsByGraphId = new Map<string, AssistantDefinition>();

  constructor() {
    const assistant = createV0GeneratorAssistant();
    this.register(assistant);
  }

  register(definition: AssistantDefinition): void {
    this.assistantsById.set(definition.summary.assistant_id, definition);
    this.assistantsByGraphId.set(definition.summary.graph_id, definition);
  }

  getByAssistantId(assistantId: string): AssistantDefinition {
    const assistant = this.assistantsById.get(assistantId);
    if (!assistant) {
      throw new Error(`Assistant ${assistantId} not found`);
    }
    return assistant;
  }

  getByGraphId(graphId: string): AssistantDefinition {
    const assistant = this.assistantsByGraphId.get(graphId);
    if (!assistant) {
      throw new Error(`Graph ${graphId} not registered`);
    }
    return assistant;
  }

  search(filter?: { graphId?: string }): AssistantSummary[] {
    const assistants = filter?.graphId
      ? [this.assistantsByGraphId.get(filter.graphId)].filter(
          (item): item is AssistantDefinition => Boolean(item)
        )
      : Array.from(this.assistantsById.values());

    return assistants.map((assistant) => assistant.summary);
  }
}

export const assistantRegistry = new AssistantRegistry();
export type { RunContext, RunResult, AssistantDefinition };
