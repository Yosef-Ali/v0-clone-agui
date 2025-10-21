import { z } from "zod";

// Legacy types for backward compatibility
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
  awaitingApproval: z.boolean().optional().default(false),
  pendingApprovalStep: z.string().nullable().optional(),
  clarificationAsked: z.boolean().optional().default(false),
  clarificationAnswers: z.record(z.string()).optional(),
});

export type StepStatus = z.infer<typeof stepStatusSchema>;
export type ArtifactSummary = z.infer<typeof artifactSchema>;
export type GeneratorState = z.infer<typeof generatorStateSchema>;

// New Subgraph Architecture Types

export const messageContentSchema = z.object({
  type: z.enum(["text", "image"]),
  text: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  type: z.enum(["human", "ai", "system", "tool"]),
  content: z.array(messageContentSchema),
  createdAt: z.string(),
});

export const requirementsSchema = z.object({
  rawInput: z.string(),
  features: z.array(z.string()),
  styling: z.object({
    theme: z.enum(["light", "dark", "auto"]),
    colorScheme: z.string(),
    layout: z.string(),
  }),
  components: z.array(z.string()).optional(),
  clarificationNeeded: z.boolean(),
  clarificationQuestions: z.array(z.string()).optional(),
});

export const designSpecSchema = z.object({
  componentHierarchy: z.array(z.string()),
  layout: z.object({
    type: z.enum(["flex", "grid", "stack"]),
    direction: z.string(),
    spacing: z.string().optional(),
    padding: z.string().optional(),
  }),
  styling: z.object({
    framework: z.string(),
    theme: z.string().optional(),
    colorScheme: z.string().optional(),
    classes: z.record(z.array(z.string())),
  }),
  interactions: z.array(z.object({
    trigger: z.string(),
    action: z.string(),
    target: z.string(),
  })),
});

export const componentStateSchema = z.object({
  code: z.string(),
  language: z.string(),
  framework: z.string(),
  dependencies: z.array(z.string()).optional(),
  validated: z.boolean(),
  errors: z.array(z.string()),
});

export const supervisorStateSchema = z.object({
  messages: z.array(messageSchema),
  currentStep: z.enum(["requirements", "design", "code", "preview", "approved", "rejected"]),
  requirements: requirementsSchema.optional(),
  designSpec: designSpecSchema.optional(),
  componentState: componentStateSchema.optional(),
  userApproval: z.boolean(),
  feedback: z.string().nullable().optional(),
  iterationCount: z.number().default(0),
  sessionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MessageContent = z.infer<typeof messageContentSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Requirements = z.infer<typeof requirementsSchema>;
export type DesignSpec = z.infer<typeof designSpecSchema>;
export type ComponentStateType = z.infer<typeof componentStateSchema>;
export type SupervisorState = z.infer<typeof supervisorStateSchema>;

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
  awaitingApproval: false,
  pendingApprovalStep: null,
  clarificationAsked: false,
  clarificationAnswers: {},
};
