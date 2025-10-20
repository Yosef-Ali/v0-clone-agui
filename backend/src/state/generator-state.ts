import { z } from "zod";

export const stepStatusSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["queued", "running", "waiting", "success", "error"]),
  note: z.string().optional(),
});

export const artifactSchema = z.object({
  path: z.string(),
  title: z.string().optional(),
  language: z.string().optional(),
  contents: z.string(),
});

export const generatorStateSchema = z.object({
  componentCode: z.string(),
  approved: z.boolean(),
  currentStep: z.string(),
  feedback: z.string().nullable().optional(),
  steps: z.record(stepStatusSchema),
  logs: z.array(z.string()),
  artifacts: z.array(artifactSchema),
  prd: z.string().optional(),
  progress: z.number().min(0).max(100),
});

export type StepStatus = z.infer<typeof stepStatusSchema>;
export type ArtifactSummary = z.infer<typeof artifactSchema>;
export type GeneratorState = z.infer<typeof generatorStateSchema>;

export const defaultSteps: Record<string, StepStatus> = {
  spec: { id: "spec", label: "PRD & Decisions", status: "queued" },
  schema: { id: "schema", label: "Data Schema", status: "queued" },
  ui: { id: "ui", label: "UI Scaffolding", status: "queued" },
  apis: { id: "apis", label: "APIs", status: "queued" },
  build: { id: "build", label: "Build", status: "queued" },
  fix: { id: "fix", label: "Auto-Fix", status: "queued" },
  done: { id: "done", label: "Done", status: "queued" },
};

export const initialGeneratorState: GeneratorState = {
  componentCode: "",
  approved: false,
  currentStep: "idle",
  feedback: null,
  steps: defaultSteps,
  logs: [],
  artifacts: [],
  prd: undefined,
  progress: 0,
};
