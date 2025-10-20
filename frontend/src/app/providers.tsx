"use client";

import { CopilotKit } from "@copilotkit/react-core";
import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export type StepStatus = {
  id: string;
  label: string;
  status: "queued" | "running" | "waiting" | "success" | "error";
  note?: string;
};

export type ArtifactSummary = {
  path: string;
  title?: string;
  language?: string;
  contents: string;
};

export interface ComponentState {
  componentCode: string;
  currentStep: string;
  approved: boolean;
  feedback: string | null;
  steps: Record<string, StepStatus>;
  logs: string[];
  artifacts: ArtifactSummary[];
  prd?: string;
  progress: number;
}

export const INITIAL_COMPONENT_STATE: ComponentState = {
  componentCode: "",
  currentStep: "idle",
  approved: false,
  feedback: null,
  steps: {
    spec: { id: "spec", label: "PRD & Decisions", status: "queued" },
    schema: { id: "schema", label: "Data Schema", status: "queued" },
    ui: { id: "ui", label: "UI Scaffolding", status: "queued" },
    apis: { id: "apis", label: "APIs", status: "queued" },
    build: { id: "build", label: "Build", status: "queued" },
    fix: { id: "fix", label: "Auto-Fix", status: "queued" },
    done: { id: "done", label: "Done", status: "queued" },
  },
  logs: [],
  artifacts: [],
  prd: undefined,
  progress: 0,
};

export function createInitialComponentState(): ComponentState {
  return {
    ...INITIAL_COMPONENT_STATE,
    steps: Object.fromEntries(
      Object.entries(INITIAL_COMPONENT_STATE.steps).map(([id, step]) => [
        id,
        { ...step },
      ])
    ) as Record<string, StepStatus>,
    logs: [],
    artifacts: [],
    prd: undefined,
  };
}

const ComponentContext = createContext<{
  componentState: ComponentState;
  setComponentState: Dispatch<SetStateAction<ComponentState>>;
}>({
  componentState: INITIAL_COMPONENT_STATE,
  setComponentState: () => {},
});

export function useComponentState() {
  return useContext(ComponentContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [componentState, setComponentState] = useState<ComponentState>(
    createInitialComponentState()
  );

  return (
    <ComponentContext.Provider value={{ componentState, setComponentState }}>
      <CopilotKit
        runtimeUrl="/api/copilotkit"
        publicApiKey={process.env.NEXT_PUBLIC_COPILOTKIT_API_KEY}
      >
        {children}
      </CopilotKit>
    </ComponentContext.Provider>
  );
}
