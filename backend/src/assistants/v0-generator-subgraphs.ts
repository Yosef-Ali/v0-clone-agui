import { randomUUID } from "node:crypto";
import { createSupervisorGraph, createInitialSupervisorState } from "../graphs/supervisor.js";
import type { SupervisorState } from "../state/generator-state.js";
import type {
  AssistantSummary,
  GraphInfo,
  GraphSchemas,
  ThreadRecord,
  ThreadValues,
} from "../types/langgraph.js";
import { logger } from "../utils/logger.js";
import type { RunContext, RunResult } from "./index.js";

/**
 * V0 Generator Assistant with LangGraph Subgraphs
 *
 * This is the new version that uses 4 specialized subgraphs:
 * 1. Requirements Parser
 * 2. Component Designer
 * 3. Code Generator
 * 4. Preview & Iteration
 *
 * All coordinated by a Supervisor graph
 */

const graphInfo: GraphInfo = {
  nodes: [
    { id: "__start__", label: "Start" },
    { id: "router", label: "Router" },
    { id: "requirements_parser", label: "Requirements Parser" },
    { id: "component_designer", label: "Component Designer" },
    { id: "code_generator", label: "Code Generator" },
    { id: "preview_iteration", label: "Preview & Iteration" },
    { id: "__end__", label: "End" },
  ],
  edges: [
    { source: "__start__", target: "router" },
    { source: "router", target: "requirements_parser" },
    { source: "requirements_parser", target: "router" },
    { source: "router", target: "component_designer" },
    { source: "component_designer", target: "router" },
    { source: "router", target: "code_generator" },
    { source: "code_generator", target: "router" },
    { source: "router", target: "preview_iteration" },
    { source: "preview_iteration", target: "router" },
    { source: "router", target: "__end__" },
  ],
};

const schemas: GraphSchemas = {
  input_schema: {
    type: "object",
    title: "V0GeneratorInput",
    properties: {
      messages: { type: "array" },
      userApproval: { type: "boolean" },
      feedback: { type: ["string", "null"] },
    },
  },
  output_schema: {
    type: "object",
    title: "V0GeneratorOutput",
    properties: {
      messages: { type: "array" },
      componentState: { type: "object" },
      currentStep: { type: "string" },
      requirements: { type: "object" },
      designSpec: { type: "object" },
    },
  },
  context_schema: {
    type: "object",
    title: "V0GeneratorContext",
    properties: {
      sessionId: { type: "string" },
      iterationCount: { type: "integer" },
    },
  },
  config_schema: {
    type: "object",
    title: "V0GeneratorConfig",
    properties: {
      maxIterations: { type: "integer", minimum: 1, maximum: 10, default: 5 },
    },
  },
};

const summary: AssistantSummary = {
  assistant_id: "v0-generator-subgraphs",
  graph_id: "v0-generator-subgraphs",
  name: "V0 Generator (Subgraph Architecture)",
  description: "Multi-agent system with 4 specialized subgraphs for component generation",
  metadata: {
    tags: ["ui", "preview", "ag-ui", "subgraphs", "langgraph"],
    version: "2.0.0",
  },
};

/**
 * Helper to extract user message text
 */
function extractUserMessage(messages: any[]): string {
  const lastUserMsg = messages.filter((m: any) => m.role === "user" || m.type === "human").pop();

  if (!lastUserMsg) {
    return "";
  }

  if (Array.isArray(lastUserMsg.content)) {
    const textContent = lastUserMsg.content.find((c: any) => c.type === "text");
    return textContent?.text || "";
  }

  if (typeof lastUserMsg.content === "string") {
    return lastUserMsg.content;
  }

  return "";
}

/**
 * Create the V0 Generator Assistant with Subgraphs
 */
export function createV0GeneratorSubgraphsAssistant() {
  // Initialize supervisor graph once
  const supervisorGraph = createSupervisorGraph();

  return {
    summary,
    graph: graphInfo,
    schemas,

    async run({ thread, input, runId, emit, emitState }: RunContext): Promise<RunResult> {
      logger.info("[V0GeneratorSubgraphs] Starting run", { runId, threadId: thread.threadId });

      const timestamp = new Date().toISOString();

      // Extract messages from input
      const incomingMessages = (input.messages as any[]) || [];
      const userApproval = (input.userApproval as boolean) || false;
      const feedback = (input.feedback as string | null) || null;

      // Merge with existing thread messages (stored in supervisorState)
      const previousState = (thread.values as any).supervisorState as SupervisorState | undefined;
      const allMessages = previousState?.messages || [];
      const mergedMessages = [...allMessages, ...incomingMessages];

      // Extract user's request
      const userRequest = extractUserMessage(mergedMessages);

      logger.debug("[V0GeneratorSubgraphs] User request", { userRequest });

      // Create or update supervisor state
      let state: SupervisorState;

      if (previousState) {
        // Continue existing session
        state = {
          ...previousState,
          messages: mergedMessages,
          userApproval,
          feedback,
          updatedAt: timestamp,
        };

        logger.info("[V0GeneratorSubgraphs] Continuing session", {
          sessionId: state.sessionId,
          currentStep: state.currentStep,
          iteration: state.iterationCount,
        });
      } else {
        // New session
        state = createInitialSupervisorState(userRequest, thread.threadId);
        logger.info("[V0GeneratorSubgraphs] New session started", {
          sessionId: state.sessionId,
        });
      }

      // Execute supervisor graph
      logger.info("[V0GeneratorSubgraphs] Invoking supervisor graph");
      const result = await supervisorGraph.invoke(state as any);

      logger.info("[V0GeneratorSubgraphs] Supervisor graph completed", {
        currentStep: result.currentStep,
        hasCode: !!result.componentState?.code,
      });

      // Build ThreadValues response
      // Note: ThreadValues extends GeneratorState, but we add supervisorState for persistence
      const values: ThreadValues = {
        componentCode: result.componentState?.code || "",
        approved: result.userApproval,
        currentStep: result.currentStep,
        feedback: result.feedback || null,
        steps: {},
        logs: [],
        artifacts: [],
        progress: 100,
        // Add custom properties for subgraph state (will be cast to any when stored)
        ...(result as any),
      } as any;

      // Store the full supervisor state for next iteration
      (values as any).supervisorState = result;

      // Emit state for streaming
      emitState(values);

      // Generate summary message
      let summaryText = "";
      switch (result.currentStep) {
        case "requirements":
          summaryText = result.requirements?.clarificationNeeded
            ? "I need clarification on your requirements."
            : "Requirements analyzed. Designing component...";
          break;
        case "design":
          summaryText = "Component structure designed. Generating code...";
          break;
        case "code":
          summaryText = "Code generated. Preparing preview...";
          break;
        case "preview":
          summaryText = "Component ready for preview!";
          break;
        case "approved":
          summaryText = "Component approved! Ready to export.";
          break;
        default:
          summaryText = `Processing: ${result.currentStep}`;
      }

      return {
        state: values,
        summary: summaryText,
        completedStep: result.currentStep || "supervisor",
      };
    },
  };
}

export type V0GeneratorSubgraphsAssistant = ReturnType<typeof createV0GeneratorSubgraphsAssistant>;
