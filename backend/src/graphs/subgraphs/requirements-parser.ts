import { StateGraph, END, START } from "@langchain/langgraph";
import type { SupervisorState, Requirements } from "../../state/generator-state.js";
import { getDeepSeekClient } from "../../utils/deepseek-client.js";
import { logger } from "../../utils/logger.js";

/**
 * Requirements Parser Subgraph
 *
 * Parses user input and extracts structured requirements including:
 * - Features requested
 * - Styling preferences
 * - Component types needed
 * - Clarification questions if input is ambiguous
 */

interface RequirementsParserState extends SupervisorState {
  // Subgraph-specific state can be added here
}

/**
 * Parse requirements from user message
 */
async function parseRequirementsNode(state: RequirementsParserState): Promise<Partial<SupervisorState>> {
  logger.info("[RequirementsParser] Parsing user requirements");

  const latestUserMessage = state.messages
    .filter((m) => m.role === "user")
    .pop();

  if (!latestUserMessage) {
    throw new Error("No user message found");
  }

  const userText = Array.isArray(latestUserMessage.content)
    ? latestUserMessage.content.find((c: any) => c.type === "text")?.text || ""
    : latestUserMessage.content;

  const client = getDeepSeekClient();

  const systemPrompt = `You are a requirements analyst for a UI component generator.
Analyze the user's request and extract structured requirements.

Respond in JSON format:
{
  "features": ["feature1", "feature2"],
  "styling": {
    "theme": "light" | "dark" | "auto",
    "colorScheme": "blue" | "green" | "purple" | "custom",
    "layout": "modern" | "minimal" | "classic"
  },
  "components": ["Button", "Input", "Card"],
  "clarificationNeeded": true/false,
  "clarificationQuestions": ["question1?", "question2?"]
}`;

  try {
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    });

    let responseText = completion.choices[0]?.message?.content || "{}";

    // Clean up markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(responseText);

    const requirements: Requirements = {
      rawInput: userText,
      features: parsed.features || [],
      styling: parsed.styling || {
        theme: "light",
        colorScheme: "blue",
        layout: "modern",
      },
      components: parsed.components || [],
      clarificationNeeded: parsed.clarificationNeeded || false,
      clarificationQuestions: parsed.clarificationQuestions || [],
    };

    logger.info("[RequirementsParser] Requirements extracted", { requirements });

    // Move to design step
    return {
      requirements,
      currentStep: "design",
    };
  } catch (error) {
    logger.error("[RequirementsParser] Failed to parse requirements", { error });
    throw error;
  }
}

/**
 * Create the Requirements Parser subgraph
 */
export function createRequirementsParserGraph() {
  const workflow: any = new StateGraph<RequirementsParserState>({
    channels: {
      messages: {
        value: (left?: any[], right?: any[]) => {
          // Accumulate messages from nodes
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
        value: (left: any, right: any) => right !== undefined ? right : left,
        default: () => false,
      },
      feedback: {
        value: (left: any, right: any) => right !== undefined ? right : left,
        default: () => null,
      },
      iterationCount: {
        value: (left: any, right: any) => right !== undefined ? right : left,
        default: () => 0,
      },
      sessionId: {
        value: (left: any, right: any) => right || left,
        default: () => "",
      },
      createdAt: {
        value: (left: any, right: any) => right || left,
        default: () => new Date().toISOString(),
      },
      updatedAt: {
        value: (left: any, right: any) => right || left,
        default: () => new Date().toISOString(),
      },
    },
  });

  workflow.addNode("parse", parseRequirementsNode);
  workflow.addEdge(START, "parse");
  workflow.addEdge("parse", END);

  return workflow.compile();
}
