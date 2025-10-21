import { StateGraph, END, START } from "@langchain/langgraph";
import type { DesignSpec } from "../../state/generator-state.js";
import { logger } from "../../utils/logger.js";

/**
 * Component Designer Subgraph
 *
 * Designs the component structure and layout based on requirements
 */

// Use partial state for subgraph to avoid strict type checking issues
interface ComponentDesignerState {
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
 * Design component structure
 */
async function designComponentNode(state: ComponentDesignerState): Promise<Partial<ComponentDesignerState>> {
  logger.info("[ComponentDesigner] Designing component structure");

  if (!state.requirements) {
    throw new Error("Requirements not found");
  }

  const { features, styling, components } = state.requirements;

  // Create design spec based on requirements
  const designSpec: DesignSpec = {
    componentHierarchy: components || ["Container", "Content"],
    layout: {
      type: styling.layout === "modern" ? "flex" : styling.layout === "minimal" ? "grid" : "stack",
      direction: "column",
      spacing: "md",
      padding: "lg",
    },
    styling: {
      framework: "tailwind",
      theme: styling.theme || "light",
      colorScheme: styling.colorScheme || "blue",
      classes: {
        Container: [
          "min-h-screen",
          styling.theme === "dark" ? "bg-gray-900" : "bg-gray-50",
          "flex",
          "items-center",
          "justify-center",
          "p-6",
        ],
        Content: [
          "bg-white",
          styling.theme === "dark" ? "bg-gray-800" : "bg-white",
          "rounded-2xl",
          "shadow-xl",
          "p-8",
          "max-w-md",
          "w-full",
        ],
      },
    },
    interactions: features.map((feature: string) => ({
      trigger: "click",
      action: `handle${feature.replace(/\s+/g, "")}`,
      target: feature,
    })),
  };

  logger.info("[ComponentDesigner] Design spec created", { designSpec });

  return {
    designSpec,
    currentStep: "code",
  };
}

/**
 * Create the Component Designer subgraph
 */
export function createComponentDesignerGraph(): any {
  const workflow: any = new StateGraph<ComponentDesignerState>({
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
        default: () => "design",
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

  workflow.addNode("design", designComponentNode);
  workflow.addEdge(START, "design");
  workflow.addEdge("design", END);

  return workflow.compile();
}
