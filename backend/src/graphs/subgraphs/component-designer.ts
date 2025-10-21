import { StateGraph, END, type CompiledStateGraph } from "@langchain/langgraph";
import type { SupervisorState, DesignSpec } from "../../state/generator-state.js";
import { logger } from "../../utils/logger.js";

/**
 * Component Designer Subgraph
 *
 * Designs the component structure and layout based on requirements
 */

interface ComponentDesignerState extends SupervisorState {}

/**
 * Design component structure
 */
async function designComponentNode(state: ComponentDesignerState): Promise<Partial<SupervisorState>> {
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
    interactions: features.map((feature) => ({
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
export function createComponentDesignerGraph(): CompiledStateGraph<any, any> {
  const workflow = new StateGraph<ComponentDesignerState>({
    channels: {
      messages: {
        value: (left: any[], right: any[]) => {
          // Only pass through, don't duplicate
          return right !== undefined ? right : left;
        },
      },
      currentStep: {
        value: (left: any, right: any) => right || left,
      },
      requirements: {
        value: (left: any, right: any) => right || left,
      },
      designSpec: {
        value: (left: any, right: any) => right || left,
      },
    },
  });

  workflow.addNode("design", designComponentNode);
  workflow.setEntryPoint("design");
  workflow.addEdge("design", END);

  return workflow.compile();
}
