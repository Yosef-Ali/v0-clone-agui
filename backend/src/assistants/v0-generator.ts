import { randomUUID } from "node:crypto";

import {
  initialGeneratorState,
  defaultSteps,
  type StepStatus,
  type ArtifactSummary,
} from "../state/generator-state.js";
import { buildComponentFromPrompt } from "../utils/component-template.js";
import { logger } from "../utils/logger.js";
import {
  type AssistantSummary,
  type GraphInfo,
  type GraphSchemas,
  type ThreadValues,
} from "../types/langgraph.js";
import type { RunContext, RunResult } from "./index.js";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "spec", label: "PRD & Decisions" },
  { id: "schema", label: "Data Schema" },
  { id: "ui", label: "UI Scaffolding" },
  { id: "apis", label: "APIs" },
  { id: "build", label: "Build" },
  { id: "fix", label: "Auto-Fix" },
  { id: "done", label: "Done" },
];

type StepId = keyof typeof defaultSteps;

const graphInfo: GraphInfo = {
  nodes: STEPS.map((step) => ({ id: step.id, label: step.label })),
  edges: STEPS.slice(0, -1).map((step, index) => ({
    source: step.id,
    target: STEPS[index + 1]!.id,
  })),
};

const schemas: GraphSchemas = {
  input_schema: {
    type: "object",
    title: "GeneratorInput",
    properties: {
      messages: { type: "array" },
      prompt: { type: "string" },
    },
  },
  output_schema: {
    type: "object",
    title: "GeneratorOutput",
    properties: {
      componentCode: { type: "string" },
      approved: { type: "boolean" },
      currentStep: { type: "string" },
      steps: { type: "object" },
      artifacts: { type: "array" },
      logs: { type: "array" },
      prd: { type: "string" },
      progress: { type: "number" },
    },
  },
  context_schema: {
    type: "object",
    title: "GeneratorContext",
    properties: {
      userId: { type: "string" },
      sessionId: { type: "string" },
    },
  },
  config_schema: {
    type: "object",
    title: "GeneratorConfig",
    properties: {
      streamSubgraphs: { type: "boolean" },
    },
  },
};

const summary: AssistantSummary = {
  assistant_id: "v0-generator",
  graph_id: "v0-generator",
  name: "V0 Generator",
  description: "Transforms natural language briefs into Tailwind UI previews.",
  metadata: {
    tags: ["ui", "preview", "ag-ui"],
  },
};

export function createV0GeneratorAssistant() {
  return {
    summary,
    graph: graphInfo,
    schemas,
    async run({ thread, input, runId, emit, emitState }: RunContext): Promise<RunResult> {
      const state: ThreadValues = {
        ...initialGeneratorState,
        // deep clone of default steps to avoid shared reference
        steps: Object.fromEntries(
          Object.entries(defaultSteps).map(([id, step]) => [id, { ...step }])
        ),
      };

      const prompt = extractLatestUserPromptFromInput(input, thread.values);
      state.currentStep = "spec";
      emitState(state);

      const totalSteps = STEPS.length;

      const setStepStatus = (id: StepId, status: StepStatus["status"], note?: string) => {
        state.steps[id] = {
          id,
          label: defaultSteps[id]?.label ?? id,
          status,
          note,
        };
        emit("step-status", state.steps[id]);
      };

      const pushLog = (text: string) => {
        state.logs = [...state.logs, text].slice(-200);
        emit("log", { text });
      };

      const pushArtifact = (artifact: ArtifactSummary) => {
        state.artifacts = state.artifacts.filter((item) => item.path !== artifact.path).concat(artifact);
        emit("artifact", { file: artifact });
      };

      const updateProgress = (index: number) => {
        const pct = Math.min(100, Math.round(((index + 1) / totalSteps) * 100));
        state.progress = pct;
        emit("progress", { pct });
      };

      try {
        for (let index = 0; index < STEPS.length; index += 1) {
          const step = STEPS[index]!;
          setStepStatus(step.id, "running");
          state.currentStep = step.id;
          emitState(state);

          switch (step.id) {
            case "spec": {
              const spec = generateSpec(prompt);
              state.prd = spec;
              pushArtifact({
                path: "docs/specs/PRD.md",
                title: "Product Requirements",
                language: "markdown",
                contents: spec,
              });
              emit("prd", { prd: spec });
              pushLog(`Spec generated for prompt: "${prompt}"`);
              break;
            }
            case "schema": {
              const schema = generateSchema(state.prd ?? "", prompt);
              pushArtifact({
                path: "schema.prisma",
                title: "Database Schema",
                language: "prisma",
                contents: schema,
              });
              pushLog("Data schema drafted using inferred entities.");
              break;
            }
            case "ui": {
              const { componentCode } = await buildComponentFromPrompt({ prompt });
              state.componentCode = componentCode;
              state.currentStep = "preview";
              pushArtifact({
                path: "app/components/Preview.tsx",
                title: "Preview Component",
                language: "tsx",
                contents: componentCode,
              });
              pushLog("UI scaffold generated (Tailwind + shadcn).");
              break;
            }
            case "apis": {
              const apis = generateApiRoutes(prompt);
              pushArtifact({
                path: "app/api/routes.md",
                title: "API Routes",
                language: "markdown",
                contents: apis,
              });
              pushLog("REST API routes outlined for core entities.");
              break;
            }
            case "build": {
              pushLog("Running build...");
              await delay(150);
              pushLog("Build completed successfully.");
              break;
            }
            case "fix": {
              pushLog("No fix needed. Build is green.");
              break;
            }
            case "done": {
              pushLog("All steps completed. Project ready for review.");
              break;
            }
            default:
              break;
          }

          setStepStatus(step.id, "success");
          updateProgress(index);
          emitState(state);
          await delay(100);
        }

        state.currentStep = "approval";
        emitState(state);

        return {
          state,
          summary: `Generated scaffold for: ${prompt}`,
          completedStep: "done",
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Assistant run failed", { error });
        pushLog(`Error: ${message}`);
        setStepStatus(state.currentStep as StepId, "error", message);
        emitState(state);
        throw error;
      }
    },
  };
}

function extractLatestUserPromptFromInput(
  input: Record<string, unknown>,
  previousValues: ThreadValues
): string {
  const timestamp = new Date().toISOString();

  const rawMessages = Array.isArray((input as { messages?: unknown }).messages)
    ? (input as { messages: unknown[] }).messages
    : [];

  const normalized = rawMessages
    .map((message) => {
      if (!message || typeof message !== "object") {
        return null;
      }
      const payload = message as Record<string, unknown>;
      const role = (payload.role as string) ?? "user";
      if (role !== "user") {
        return null;
      }
      const content = payload.content;
      if (typeof content === "string") {
        return content;
      }
      if (Array.isArray(content) && content.length > 0) {
        const item = content[0];
        if (item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") {
          return (item as { text: string }).text;
        }
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  if (normalized.length > 0) {
    return normalized.at(-1)!;
  }

  if (typeof input.prompt === "string" && input.prompt.trim().length > 0) {
    return input.prompt.trim();
  }

  if (previousValues.prd) {
    return previousValues.prd.split("\n")[0]?.replace(/^#\s*/, "") || previousValues.prd;
  }

  return `Generate a dashboard for: ${timestamp}`;
}

function generateSpec(prompt: string): string {
  const title = toTitleCase(prompt.split(/[.!?\n]/)[0] ?? "Generated App");
  const modules = inferModules(prompt);
  return `# ${title}

## Overview
- Requested: ${prompt}
- Modules detected: ${modules.join(", ")}
- Goals: accelerate workflows, deliver responsive UX, enable analytics

## Modules
${modules.map((module) => `- ${module}`).join("\n")}

## Personas
- Operator: manages day-to-day records
- Manager: reviews performance metrics and approvals
- Developer: maintains integrations and automations

## Non-Functional Requirements
- Authentication & RBAC, audit logs, responsive UI, instrumentation hooks
`;
}

function generateSchema(spec: string, prompt: string): string {
  const modules = inferModules(prompt);
  const entities = modules.slice(0, 4).map((module) => toTitleCase(module.slice(0, -1)));
  const schemaLines = entities.map((entity) => {
    const name = entity.replace(/\s+/g, "");
    return `model ${name} {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
  });

  return `// Inferred from prompt
// ${prompt}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

${schemaLines.join("\n\n")}
`;
}

function generateApiRoutes(prompt: string): string {
  const modules = inferModules(prompt);
  return `# REST API Routes

${modules
    .map((module) => {
      const slug = module.toLowerCase().replace(/\s+/g, "-");
      return `## /api/${slug}
- GET /api/${slug}
- POST /api/${slug}
- PATCH /api/${slug}/:id
- DELETE /api/${slug}/:id`;
    })
    .join("\n\n")}
`;
}

function inferModules(prompt: string): string[] {
  const known = [
    { keyword: "patient", name: "Patients" },
    { keyword: "appointment", name: "Appointments" },
    { keyword: "invoice", name: "Billing" },
    { keyword: "doctor", name: "Doctors" },
    { keyword: "task", name: "Tasks" },
    { keyword: "inventory", name: "Inventory" },
    { keyword: "project", name: "Projects" },
    { keyword: "ticket", name: "Support Tickets" },
    { keyword: "dashboard", name: "Reporting" },
  ];

  const lower = prompt.toLowerCase();
  const modules = known
    .filter((module) => lower.includes(module.keyword))
    .map((module) => module.name);

  if (modules.length === 0) {
    modules.push("Dashboard", "Records", "Settings");
  } else if (!modules.includes("Dashboard")) {
    modules.unshift("Dashboard");
  }

  return Array.from(new Set(modules));
}

function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type V0GeneratorAssistant = ReturnType<typeof createV0GeneratorAssistant>;
