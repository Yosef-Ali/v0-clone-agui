import { StateGraph, END } from "@langchain/langgraph";
import type { SupervisorState } from "../../state/generator-state.js";
import { logger } from "../../utils/logger.js";

/**
 * Preview & Iteration Subgraph
 *
 * Handles HITL (Human-In-The-Loop) approval workflow
 * - Shows preview to user
 * - Waits for approval/rejection
 * - Handles feedback for iteration
 */

interface PreviewIterationState extends SupervisorState {}

/**
 * Check if user has approved or rejected
 */
function checkApprovalNode(state: PreviewIterationState): "approved" | "rejected" | "waiting" {
  logger.info("[PreviewIteration] Checking approval status", {
    userApproval: state.userApproval,
    feedback: state.feedback,
  });

  if (state.userApproval === true) {
    return "approved";
  }

  if (state.feedback && state.feedback.trim() !== "") {
    return "rejected";
  }

  return "waiting";
}

/**
 * Handle user approval
 */
function handleApprovalNode(state: PreviewIterationState): Partial<SupervisorState> {
  logger.info("[PreviewIteration] Component approved by user");

  return {
    currentStep: "approved",
    // Return ONLY the new message to add, not the entire array
    messages: [
      {
        id: `msg-${Date.now()}`,
        role: "assistant",
        type: "ai",
        content: [{ type: "text", text: "Component approved! Ready to export." }],
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Handle user rejection and feedback
 */
function handleFeedbackNode(state: PreviewIterationState): Partial<SupervisorState> {
  logger.info("[PreviewIteration] Component rejected, processing feedback", {
    feedback: state.feedback,
  });

  const iterationCount = (state.iterationCount || 0) + 1;

  // Return ONLY the new feedback message to add, not the entire array
  const newMessage = {
    id: `msg-${Date.now()}`,
    role: "user",
    type: "human",
    content: [{ type: "text", text: state.feedback || "Please revise" }],
    createdAt: new Date().toISOString(),
  };

  // Route back to requirements parsing with feedback
  return {
    currentStep: "requirements",
    messages: [newMessage],
    iterationCount,
    userApproval: false,
    feedback: null,
  };
}

/**
 * Prepare preview for user
 */
function preparePreviewNode(state: PreviewIterationState): Partial<SupervisorState> {
  logger.info("[PreviewIteration] Preparing preview for user");

  if (!state.componentState) {
    throw new Error("Component state not found");
  }

  return {
    currentStep: "preview",
    // Return ONLY the new message to add, not the entire array
    messages: [
      {
        id: `msg-${Date.now()}`,
        role: "assistant",
        type: "ai",
        content: [{ type: "text", text: "Component ready for preview. Please review and approve." }],
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Create the Preview & Iteration subgraph
 */
export function createPreviewIterationGraph() {
  const workflow = new StateGraph<PreviewIterationState>({
    channels: {
      messages: {
        value: (left: any[], right: any[]) => {
          // Only pass through, don't duplicate
          return right !== undefined ? right : left;
        },
        default: () => [],
      },
      currentStep: {
        value: (left: any, right: any) => right || left,
      },
      componentState: {
        value: (left: any, right: any) => right || left,
      },
      userApproval: {
        value: (left: any, right: any) => (right !== undefined ? right : left),
      },
      feedback: {
        value: (left: any, right: any) => (right !== undefined ? right : left),
      },
      iterationCount: {
        value: (left: any, right: any) => (right !== undefined ? right : left),
        default: () => 0,
      },
    },
  });

  // Add nodes
  workflow.addNode("prepare", preparePreviewNode);
  workflow.addNode("approve", handleApprovalNode);
  workflow.addNode("handle_feedback", handleFeedbackNode);

  // Set entry point
  workflow.setEntryPoint("prepare");

  // Add conditional routing from prepare
  workflow.addConditionalEdges(
    "prepare",
    checkApprovalNode,
    {
      approved: "approve",
      rejected: "handle_feedback",
      waiting: END,
    }
  );

  // End after approval or feedback
  workflow.addEdge("approve", END);
  workflow.addEdge("handle_feedback", END);

  return workflow.compile();
}
