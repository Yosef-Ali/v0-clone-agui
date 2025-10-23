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

  const systemPrompt = `You are an expert React and Tailwind CSS developer specializing in creating beautiful, production-ready UI components.

USER REQUEST: "${requirements.rawInput}"

KEY REQUIREMENTS:
${requirements.features.map((f: string) => `- ${f}`).join('\n')}

DESIGN CONSTRAINTS:
- Theme: ${requirements.styling.theme}
- Color Scheme: ${requirements.styling.colorScheme}
- Layout Style: ${requirements.styling.layout}

INSTRUCTIONS:
1. Create a complete, self-contained HTML component with inline styles and scripts
2. Use Tailwind CSS utility classes for all styling
3. Implement full interactivity with vanilla JavaScript in <script> tags
4. Follow these structure guidelines:
   - Clean, semantic HTML5 markup
   - Proper component hierarchy and organization
   - Responsive design (mobile-first approach)
   - Accessible (ARIA labels, keyboard navigation)
   - Beautiful visual design with proper spacing and typography
5. For a TODO app, include:
   - Input field to add new todos
   - List of todo items with checkboxes
   - Delete button for each todo
   - Dark mode support (if requested)
   - Smooth animations and transitions
   - Local storage persistence
6. Return ONLY the HTML code - no markdown code blocks, no explanations
7. Make sure all text is properly readable (no overlapping or garbled text)
8. Use proper Tailwind spacing utilities (p-4, m-2, gap-3, etc.)
9. Ensure all interactive elements have proper event handlers

QUALITY CHECKLIST:
✓ Clean, readable code structure
✓ Proper indentation and formatting
✓ All features from requirements implemented
✓ Smooth user experience with animations
✓ Responsive on all screen sizes
✓ No overlapping text or broken layouts
✓ Proper contrast and readability
✓ Interactive elements work correctly

Generate the complete HTML component now:`;

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
          // Accumulate messages from nodes
          if (!right) return left || [];
          return [...(left || []), ...right];
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
