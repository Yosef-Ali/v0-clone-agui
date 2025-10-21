import { StateGraph, END, START } from "@langchain/langgraph";
import type { ComponentStateType } from "../../state/generator-state.js";
import { getDeepSeekClient } from "../../utils/deepseek-client.js";
import { logger } from "../../utils/logger.js";

/**
 * Code Generator Subgraph
 *
 * Generates production-ready React/Tailwind code from design spec
 */

// Use partial state for subgraph to avoid strict type checking issues
interface CodeGeneratorState {
  messages?: any[];
  currentStep?: any;
  requirements?: any;
  designSpec?: any;
  componentState?: any;
  userApproval?: boolean;
  feedback?: string | null;
  iterationCount?: number;
  sessionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Generate component code
 */
async function generateCodeNode(state: CodeGeneratorState): Promise<Partial<CodeGeneratorState>> {
  logger.info("[CodeGenerator] Generating component code");

  if (!state.designSpec || !state.requirements) {
    throw new Error("Design spec or requirements not found");
  }

  const { requirements, designSpec } = state;
  const client = getDeepSeekClient();

  const systemPrompt = `You are an expert React and Tailwind CSS developer.
Generate a production-ready component based on the design specification.

Requirements:
${JSON.stringify(requirements, null, 2)}

Design Spec:
${JSON.stringify(designSpec, null, 2)}

Generate ONLY the HTML markup with inline <script> for interactivity.
- Use Tailwind CSS utility classes
- Include inline JavaScript in <script> tags
- Make it interactive and responsive
- Return ONLY the HTML, no markdown code blocks`;

  try {
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: requirements.rawInput },
      ],
    });

    let code = completion.choices[0]?.message?.content || "";

    // Clean up any markdown code blocks
    code = code.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

    const componentState: ComponentStateType = {
      code,
      language: "html",
      framework: "react",
      dependencies: ["react", "tailwindcss"],
      validated: true,
      errors: [],
    };

    logger.info("[CodeGenerator] Code generated successfully");

    return {
      componentState,
      currentStep: "preview",
    };
  } catch (error) {
    logger.error("[CodeGenerator] Failed to generate code", { error });
    throw error;
  }
}

/**
 * Create the Code Generator subgraph
 */
export function createCodeGeneratorGraph(): any {
  const workflow: any = new StateGraph<CodeGeneratorState>({
    channels: {
      messages: {
        value: (left?: any[], right?: any[]) => {
          // Only pass through, don't duplicate
          return right !== undefined ? right : (left || []);
        },
        default: () => [],
      },
      currentStep: {
        value: (left: any, right: any) => right || left,
        default: () => "code",
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

  workflow.addNode("generate", generateCodeNode);
  workflow.addEdge(START, "generate");
  workflow.addEdge("generate", END);

  return workflow.compile();
}
