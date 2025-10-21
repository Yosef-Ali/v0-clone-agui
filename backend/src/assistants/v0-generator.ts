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
      approval: {
        type: "object",
        properties: {
          step: { type: "string" },
          status: { type: "string", enum: ["approved", "rejected"] },
          feedback: { type: "string" },
        },
      },
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
      awaitingApproval: { type: "boolean" },
      pendingApprovalStep: { type: ["string", "null"] },
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
      const state = initializeState(thread.values);
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

      const approvalDecision = parseApprovalDecision(input);
      const pendingApprovalStep = (state.pendingApprovalStep ?? null) as StepId | null;
      const awaitingHardApproval =
        state.awaitingApproval &&
        pendingApprovalStep &&
        (pendingApprovalStep !== "spec" || Boolean(state.prd));

      if (awaitingHardApproval && pendingApprovalStep) {
        if (!approvalDecision || approvalDecision.step !== pendingApprovalStep) {
          setStepStatus(
            pendingApprovalStep,
            "waiting",
            state.steps[pendingApprovalStep]?.note ?? "Awaiting approval"
          );
          state.currentStep = pendingApprovalStep;
          emitState(state);
          emitApprovalRequired({
            step: pendingApprovalStep,
            label:
              defaultSteps[pendingApprovalStep]?.label ?? pendingApprovalStep,
            state,
            emit,
          });
          return {
            state,
            summary: `Awaiting approval for ${
              defaultSteps[pendingApprovalStep]?.label ?? pendingApprovalStep
            }`,
            completedStep: pendingApprovalStep,
          };
        }

        if (approvalDecision.status === "approved") {
          setStepStatus(pendingApprovalStep, "success");
          state.awaitingApproval = false;
          state.pendingApprovalStep = null;
          state.feedback = null;
          pushLog(
            `${defaultSteps[pendingApprovalStep]?.label ?? pendingApprovalStep} approved by human reviewer.`
          );
        } else {
          setStepStatus(
            pendingApprovalStep,
            "error",
            approvalDecision.feedback ?? "Changes requested by human reviewer."
          );
          state.awaitingApproval = false;
          state.pendingApprovalStep = null;
          state.feedback = approvalDecision.feedback ?? "Changes requested by reviewer.";
          emitState(state);
          emit("approval-rejected", {
            stepId: pendingApprovalStep,
            feedback: approvalDecision.feedback ?? null,
          });
          return {
            state,
            summary: `Approval rejected for ${defaultSteps[pendingApprovalStep]?.label ?? pendingApprovalStep}`,
            completedStep: pendingApprovalStep,
          };
        }
      }

      const prompt = extractLatestUserPromptFromInput(input, state);

      try {
        for (let index = 0; index < STEPS.length; index += 1) {
          const step = STEPS[index]!;
          if (state.steps[step.id]?.status === "success") {
            continue;
          }

          // Skip fix step if there are no errors
          if (step.id === "fix") {
            const buildStep = state.steps["build"];
            if (buildStep?.status === "success") {
              // No errors, skip the fix step entirely
              continue;
            }
          }

          setStepStatus(step.id, "running");
          state.currentStep = step.id;
          emitState(state);

          switch (step.id) {
            case "spec": {
              pushLog("Analyzing your requirements and generating PRD...");
              const spec = generateSpec(prompt);
              state.prd = spec;
              pushArtifact({
                path: "docs/specs/PRD.md",
                title: "Product Requirements",
                language: "markdown",
                contents: spec,
              });
              emit("prd", { prd: spec });
              pushLog(`PRD generated. Please review and approve.`);
              state.awaitingApproval = true;
              state.pendingApprovalStep = "spec";
              setStepStatus("spec", "waiting", "Awaiting human approval");
              emitState(state);
              emitApprovalRequired({
                step: "spec",
                label: defaultSteps.spec.label,
                state,
                emit,
                note: "Review the PRD draft and approve to continue.",
              });
              updateProgress(index);
              return {
                state,
                summary: `Awaiting approval for ${defaultSteps.spec.label}`,
                completedStep: "spec",
              };
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
        state.awaitingApproval = false;
        state.pendingApprovalStep = null;
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

function initializeState(previous?: ThreadValues): ThreadValues {
  const base = previous ?? initialGeneratorState;
  return {
    ...initialGeneratorState,
    ...base,
    steps: mergeSteps(base.steps),
    logs: Array.isArray(base.logs) ? [...base.logs] : [],
    artifacts: Array.isArray(base.artifacts) ? [...base.artifacts] : [],
    awaitingApproval: Boolean(base.awaitingApproval),
    pendingApprovalStep: base.pendingApprovalStep ?? null,
  };
}

function mergeSteps(existing?: Record<string, StepStatus>): Record<string, StepStatus> {
  const merged: Record<string, StepStatus> = {};

  for (const [id, step] of Object.entries(defaultSteps)) {
    const existingStep = existing?.[id];
    merged[id] = {
      id: step.id,
      label: step.label,
      status: existingStep?.status ?? step.status,
      note: existingStep?.note,
    };
  }

  if (existing) {
    for (const [id, step] of Object.entries(existing)) {
      if (!merged[id]) {
        merged[id] = { ...step };
      }
    }
  }

  return merged;
}

type ApprovalDecision = {
  step: StepId;
  status: "approved" | "rejected";
  feedback?: string;
};

function parseApprovalDecision(input: Record<string, unknown>): ApprovalDecision | null {
  const rawApproval = (input as { approval?: unknown }).approval;
  if (!rawApproval || typeof rawApproval !== "object") {
    return null;
  }

  const approval = rawApproval as Record<string, unknown>;
  const step = approval.step;
  const status = approval.status;

  if (!isStepId(step)) {
    return null;
  }

  if (status !== "approved" && status !== "rejected") {
    return null;
  }

  const feedback =
    typeof approval.feedback === "string" && approval.feedback.trim().length > 0
      ? approval.feedback.trim()
      : undefined;

  return {
    step,
    status,
    feedback,
  };
}

function isStepId(value: unknown): value is StepId {
  return typeof value === "string" && value in defaultSteps;
}

function emitApprovalRequired({
  step,
  label,
  state,
  emit,
  note,
}: {
  step: StepId;
  label: string;
  state: ThreadValues;
  emit: RunContext["emit"];
  note?: string;
}) {
  const message =
    note ??
    `Awaiting approval for ${label}. Review the draft below and approve to continue.`;

  emit("approval-required", {
    stepId: step,
    label,
    message,
    artifactPath: state.artifacts.find(
      (artifact) => artifact.path === "docs/specs/PRD.md"
    )?.path,
    excerpt: buildExcerpt(state.prd),
  });
}

function buildExcerpt(prd?: string | null): string | undefined {
  if (!prd) {
    return undefined;
  }

  const excerpt = prd.split("\n").slice(0, 10).join("\n").trim();
  return excerpt.length > 0 ? excerpt : undefined;
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

function generateSchema(_spec: string, prompt: string): string {
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
