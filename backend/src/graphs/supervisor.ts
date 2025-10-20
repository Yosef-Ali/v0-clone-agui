import { StateGraph, END } from "@langchain/langgraph";
import type { SupervisorState } from "../state/generator-state.js";
import { createRequirementsParserGraph } from "./subgraphs/requirements-parser.js";
import { createComponentDesignerGraph } from "./subgraphs/component-designer.js";
import { createCodeGeneratorGraph } from "./subgraphs/code-generator.js";
import { createPreviewIterationGraph } from "./subgraphs/preview-iteration.js";
import { logger } from "../utils/logger.js";

/**
 * Supervisor Graph - Parent Graph coordinating all subgraphs
 *
 * Responsibilities:
 * - Route user requests to appropriate subgraphs
 * - Maintain global state
 * - Coordinate agent handoffs
 * - Handle interrupts for HITL
 *
 * Flow:
 * 1. Requirements Parser (analyze user input)
 * 2. Component Designer (design structure)
 * 3. Code Generator (generate code)
 * 4. Preview & Iteration (HITL approval)
 * 5. Loop back if rejected, end if approved
 */

/**
 * Router node - decides which subgraph to execute next
 */
function routeToSubgraph(state: SupervisorState): string {
  const { currentStep, userApproval } = state;

  logger.info(`[Supervisor] Routing from step: ${currentStep}, approval: ${userApproval}`);

  // Route based on current step
  switch (currentStep) {
    case "requirements":
      return "requirements_parser";

    case "design":
      return "component_designer";

    case "code":
      return "code_generator";

    case "preview":
      // Check if user approved or rejected
      if (userApproval === true) {
        return "approved";
      }
      // If feedback exists, go back to requirements
      if (state.feedback && state.feedback.trim() !== "") {
        return "requirements_parser";
      }
      return "preview_iteration";

    case "approved":
      return "end";

    case "rejected":
      // User rejected, go back to requirements with feedback
      return "requirements_parser";

    default:
      logger.warn(`[Supervisor] Unknown step: ${currentStep}, defaulting to requirements`);
      return "requirements_parser";
  }
}

/**
 * Create the Supervisor Graph
 */
export function createSupervisorGraph() {
  // Initialize subgraphs
  const requirementsParserGraph = createRequirementsParserGraph();
  const componentDesignerGraph = createComponentDesignerGraph();
  const codeGeneratorGraph = createCodeGeneratorGraph();
  const previewIterationGraph = createPreviewIterationGraph();

  // Create supervisor workflow
  const workflow = new StateGraph<SupervisorState>({
    channels: {
      messages: {
        value: (left: any[], right: any[]) => {
          if (!right) return left || [];
          return [...(left || []), ...right];
        },
        default: () => [],
      },
      currentStep: {
        value: (left: any, right: any) => right || left,
        default: () => "requirements",
      },
      requirements: {
        value: (left: any, right: any) => right || left,
      },
      designSpec: {
        value: (left: any, right: any) => right || left,
      },
      componentState: {
        value: (left: any, right: any) => right || left,
      },
      userApproval: {
        value: (left: any, right: any) => (right !== undefined ? right : left),
        default: () => false,
      },
      feedback: {
        value: (left: any, right: any) => (right !== undefined ? right : left),
      },
      iterationCount: {
        value: (left: any, right: any) => (right !== undefined ? right : left),
        default: () => 0,
      },
      sessionId: {
        value: (left: any, right: any) => right || left,
      },
      createdAt: {
        value: (left: any, right: any) => right || left,
      },
      updatedAt: {
        value: (left: any, right: any) => right || left || new Date().toISOString(),
      },
    },
  });

  // Add subgraph nodes
  workflow.addNode("requirements_parser", async (state: SupervisorState) => {
    logger.info("[Supervisor] Executing Requirements Parser subgraph");
    const result = await requirementsParserGraph.invoke(state);
    logger.debug("[Supervisor] Requirements Parser result:", result);
    return result;
  });

  workflow.addNode("component_designer", async (state: SupervisorState) => {
    logger.info("[Supervisor] Executing Component Designer subgraph");
    const result = await componentDesignerGraph.invoke(state);
    logger.debug("[Supervisor] Component Designer result:", result);
    return result;
  });

  workflow.addNode("code_generator", async (state: SupervisorState) => {
    logger.info("[Supervisor] Executing Code Generator subgraph");
    const result = await codeGeneratorGraph.invoke(state);
    logger.debug("[Supervisor] Code Generator result:", result);
    return result;
  });

  workflow.addNode("preview_iteration", async (state: SupervisorState) => {
    logger.info("[Supervisor] Executing Preview & Iteration subgraph");
    const result = await previewIterationGraph.invoke(state);
    logger.debug("[Supervisor] Preview & Iteration result:", result);
    return result;
  });

  // Add routing node
  workflow.addNode("router", (state: SupervisorState) => {
    logger.info("[Supervisor] Router node - current state:", {
      step: state.currentStep,
      hasRequirements: !!state.requirements,
      hasDesign: !!state.designSpec,
      hasCode: !!state.componentState,
    });
    return state; // Pass through, routing happens in conditional edges
  });

  // Set entry point
  workflow.setEntryPoint("router");

  // Add conditional routing from router
  workflow.addConditionalEdges(
    "router",
    routeToSubgraph,
    {
      requirements_parser: "requirements_parser",
      component_designer: "component_designer",
      code_generator: "code_generator",
      preview_iteration: "preview_iteration",
      approved: END,
      end: END,
    }
  );

  // After each subgraph, route back to router for next decision
  workflow.addEdge("requirements_parser", "router");
  workflow.addEdge("component_designer", "router");
  workflow.addEdge("code_generator", "router");
  workflow.addEdge("preview_iteration", "router");

  logger.info("[Supervisor] Supervisor graph compiled successfully");

  return workflow.compile();
}

/**
 * Helper function to initialize supervisor state from user input
 */
export function createInitialSupervisorState(userMessage: string, sessionId?: string): SupervisorState {
  return {
    messages: [
      {
        id: `msg-${Date.now()}`,
        role: "user",
        type: "human",
        content: [{ type: "text", text: userMessage }],
        createdAt: new Date().toISOString(),
      },
    ],
    currentStep: "requirements",
    userApproval: false,
    feedback: null,
    iterationCount: 0,
    sessionId: sessionId || `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
