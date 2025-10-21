"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createInitialComponentState,
  useComponentState,
  type ArtifactSummary,
  type ComponentState,
  type StepStatus,
} from "../app/providers";
import { StepsTimeline } from "./steps-timeline";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface PendingApprovalInfo {
  stepId: string;
  label: string;
  message: string;
  artifactPath?: string;
  excerpt?: string;
}

interface ClarificationPrompt {
  stepId: string;
  questions: Array<{ id: string; question: string }>;
}

type StreamPayload = {
  assistant_id: string;
  input: Record<string, unknown>;
};

function buildClarificationPayload(
  answer: string,
  prompt: ClarificationPrompt | null
): Record<string, string> | undefined {
  if (!prompt) {
    return undefined;
  }

  const normalized = answer.trim();
  if (!normalized) {
    return undefined;
  }

  const entries = prompt.questions.map((question, index) => [
    question.id || `q${index + 1}`,
    normalized,
  ]);

  return Object.fromEntries(entries);
}

export function ChatInterface() {
  const { componentState, setComponentState } = useComponentState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingApproval, setPendingApproval] =
    useState<PendingApprovalInfo | null>(null);
  const [clarificationPrompt, setClarificationPrompt] =
    useState<ClarificationPrompt | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingApproval, clarificationPrompt]);

  useEffect(() => {
    if (!componentState.awaitingApproval) {
      setPendingApproval(null);
    }
  }, [componentState.awaitingApproval]);

  const ensureThreadId = () => {
    if (!threadIdRef.current) {
      threadIdRef.current = `thread-${Date.now()}`;
    }
    return threadIdRef.current;
  };

  const mergeSteps = useCallback(
    (
      prev: ComponentState["steps"],
      incoming?: Record<string, StepStatus>
    ): ComponentState["steps"] => {
      const base = createInitialComponentState().steps;
      const result: Record<string, StepStatus> = {};

      for (const key of Object.keys(base)) {
        const next = incoming?.[key];
        result[key] = {
          ...base[key],
          ...(prev[key] ?? {}),
          ...(next ?? {}),
        };
      }

      if (incoming) {
        for (const [id, step] of Object.entries(incoming)) {
          if (!result[id]) {
            result[id] = { ...step };
          }
        }
      }

      return result;
    },
    []
  );

  const applyIncomingState = useCallback(
    (incoming: Partial<ComponentState>) => {
      setComponentState((prev) => ({
        componentCode: incoming.componentCode ?? prev.componentCode,
        currentStep: incoming.currentStep ?? prev.currentStep,
        approved: incoming.approved ?? prev.approved,
        feedback:
          incoming.feedback !== undefined ? incoming.feedback : prev.feedback,
        steps: mergeSteps(prev.steps, incoming.steps),
        logs: incoming.logs ?? prev.logs,
        artifacts: incoming.artifacts ?? prev.artifacts,
        prd: incoming.prd ?? prev.prd,
        progress:
          typeof incoming.progress === "number"
            ? incoming.progress
            : prev.progress,
        awaitingApproval:
          typeof incoming.awaitingApproval === "boolean"
            ? incoming.awaitingApproval
            : prev.awaitingApproval,
        pendingApprovalStep:
          incoming.pendingApprovalStep !== undefined
            ? (incoming.pendingApprovalStep as string | null)
            : prev.pendingApprovalStep,
      }));
    },
    [mergeSteps, setComponentState]
  );

  const appendLog = useCallback(
    (value: string) => {
      setComponentState((prev) => ({
        ...prev,
        logs: [...prev.logs, value].slice(-200),
      }));
    },
    [setComponentState]
  );

  const streamRun = useCallback(
    async ({
      payload,
      userMessage,
      resetState,
    }: {
      payload: StreamPayload;
      userMessage?: Message;
      resetState?: boolean;
    }) => {
      const threadId = ensureThreadId();
      if (userMessage) {
        setMessages((prev) => [...prev, userMessage]);
      }

      if (resetState) {
        setPendingApproval(null);
        setClarificationPrompt(null);
        setComponentState(createInitialComponentState());
      }

      setIsLoading(true);

      try {
        const response = await fetch(
          `${BACKEND_URL}/threads/${threadId}/runs/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error(`Backend error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body reader available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        let dataBuffer = "";
        let assistantSummary = "";
        let summaryPushed = false;

        const flushEvent = () => {
          if (!currentEvent || !dataBuffer) {
            currentEvent = "";
            dataBuffer = "";
            return;
          }

          try {
            const payload = JSON.parse(dataBuffer);
            handleSseEvent(currentEvent, payload);
          } catch (error) {
            console.warn(
              "Failed to parse SSE payload",
              currentEvent,
              dataBuffer,
              error
            );
          }

          currentEvent = "";
          dataBuffer = "";
        };

        const handleSseEvent = (eventName: string, payload: any) => {
          switch (eventName) {
            case "run-started":
              appendLog("Pipeline started");
              break;
            case "step-status":
              if (payload) {
                updateStepStatus(payload as StepStatus);
              }
              break;
            case "progress":
              if (typeof payload?.pct === "number") {
                setComponentState((prev) => ({
                  ...prev,
                  progress: payload.pct,
                }));
              }
              break;
            case "prd":
              if (typeof payload?.prd === "string") {
                setComponentState((prev) => ({ ...prev, prd: payload.prd }));
              }
              break;
            case "artifact":
              if (payload?.file) {
                const artifact = payload.file as ArtifactSummary;
                setComponentState((prev) => ({
                  ...prev,
                  artifacts: prev.artifacts
                    .filter((item) => item.path !== artifact.path)
                    .concat(artifact),
                }));
              }
              break;
            case "log":
              if (typeof payload?.text === "string") {
                appendLog(payload.text);
              }
              break;
            case "values":
              if (payload) {
                applyIncomingState(payload as Partial<ComponentState>);
              }
              break;
            case "clarification-required": {
              const questions = Array.isArray(payload?.questions)
                ? payload.questions
                    .map((question: any, index: number) => {
                      if (typeof question === "string") {
                        return { id: `question-${index}`, question };
                      }
                      if (
                        question &&
                        typeof question === "object" &&
                        typeof question.id === "string" &&
                        typeof question.question === "string"
                      ) {
                        return {
                          id: question.id,
                          question: question.question,
                        };
                      }
                      return null;
                    })
                    .filter(
                      (item): item is { id: string; question: string } =>
                        item !== null
                    )
                : [];

              if (questions.length > 0) {
                const prompt: ClarificationPrompt = {
                  stepId:
                    typeof payload?.stepId === "string"
                      ? payload.stepId
                      : "spec",
                  questions,
                };
                setClarificationPrompt(prompt);
                assistantSummary = "Awaiting clarification for PRD";
                summaryPushed = true;
              }
              break;
            }
            case "approval-required": {
              const info: PendingApprovalInfo = {
                stepId:
                  typeof payload?.stepId === "string" ? payload.stepId : "spec",
                label:
                  typeof payload?.label === "string"
                    ? payload.label
                    : "Approval Required",
                message:
                  typeof payload?.message === "string"
                    ? payload.message
                    : "Please review and approve the latest output to continue.",
                artifactPath:
                  typeof payload?.artifactPath === "string"
                    ? payload.artifactPath
                    : undefined,
                excerpt:
                  typeof payload?.excerpt === "string"
                    ? payload.excerpt
                    : undefined,
              };

              setPendingApproval(info);
              setMessages((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-approval`,
                  role: "assistant",
                  content: info.message,
                },
              ]);
              assistantSummary = info.message;
              summaryPushed = true;
              break;
            }
            case "approval-rejected":
              if (typeof payload?.feedback === "string") {
                appendLog(`Changes requested: ${payload.feedback}`);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `${Date.now()}-approval-rejected`,
                    role: "assistant",
                    content: `Changes requested: ${payload.feedback}`,
                  },
                ]);
                summaryPushed = true;
                assistantSummary = `Changes requested: ${payload.feedback}`;
              }
              break;
            case "run-finished":
              if (typeof payload?.summary === "string") {
                assistantSummary = payload.summary;
              }
              appendLog("Pipeline completed");
              break;
            case "error":
              appendLog(`Error: ${payload?.message ?? "unknown"}`);
              break;
            default:
              break;
          }
        };

        const updateStepStatus = (status: StepStatus) => {
          setComponentState((prev) => ({
            ...prev,
            currentStep:
              status.status === "running" ? status.id : prev.currentStep,
            steps: {
              ...prev.steps,
              [status.id]: {
                ...prev.steps[status.id],
                ...status,
              },
            },
          }));
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            flushEvent();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              flushEvent();
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const chunk = line.slice(5).trim();
              dataBuffer = dataBuffer ? `${dataBuffer}${chunk}` : chunk;
            } else if (line.trim() === "") {
              flushEvent();
            }
          }
        }

        if (assistantSummary && !summaryPushed) {
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-assistant`,
              role: "assistant",
              content: assistantSummary,
            },
          ]);
        }
      } catch (error: any) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${error.message}. Make sure the backend is running on ${BACKEND_URL}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [appendLog, applyIncomingState, setComponentState]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput("");

    const clarificationPayload = buildClarificationPayload(
      content,
      clarificationPrompt
    );
    if (clarificationPayload) {
      setClarificationPrompt(null);
    }

    await streamRun({
      payload: {
        assistant_id: "v0-generator",
        input: {
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: content }],
            },
          ],
          ...(clarificationPayload ? { clarification: clarificationPayload } : {}),
        },
      },
      userMessage: {
        id: Date.now().toString(),
        role: "user",
        content,
      },
      resetState: !clarificationPayload,
    });
  };

  const handleApprovalDecision = async (
    status: "approved" | "rejected"
  ) => {
    if (!pendingApproval) return;

    let feedback: string | undefined;
    if (status === "rejected") {
      feedback = window.prompt("What changes would you like?") ?? undefined;
      if (!feedback) {
        return;
      }
    }

    const content =
      status === "approved"
        ? `Approved ${pendingApproval.label}.`
        : `Requested changes for ${pendingApproval.label}: ${feedback}`;

    await streamRun({
      payload: {
        assistant_id: "v0-generator",
        input: {
          approval: {
            step: pendingApproval.stepId,
            status,
            ...(feedback ? { feedback } : {}),
          },
        },
      },
      userMessage: {
        id: `${Date.now()}-decision`,
        role: "user",
        content,
      },
      resetState: false,
    });
  };

  const isInputDisabled = useMemo(
    () => isLoading || pendingApproval !== null,
    [isLoading, pendingApproval]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-background">
        <h1 className="text-2xl font-bold text-foreground">V0 Clone</h1>
        <p className="text-sm text-muted-foreground">
          Describe your app in natural language
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg">Hi! 👋</p>
            <p className="mt-2">Describe the app you want to build...</p>
            <p className="text-sm mt-4 text-muted-foreground/60">
              e.g., Build a todo app with dark mode
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {clarificationPrompt && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                We need a bit more detail before writing the PRD.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your answers in a single message or respond one-by-one.
              </p>
            </div>

            <ol className="space-y-2 text-sm text-muted-foreground">
              {clarificationPrompt.questions.map((question, index) => (
                <li key={question.id} className="leading-relaxed">
                  <span className="font-medium text-foreground">
                    {index + 1}.
                  </span>{" "}
                  {question.question}
                </li>
              ))}
            </ol>

            <p className="text-xs text-muted-foreground/80">
              Tip: you can paste rapid-fire answers; the assistant will parse
              the intent and continue once ready.
            </p>
          </div>
        )}

        {pendingApproval && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Awaiting approval: {pendingApproval.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {pendingApproval.message}
              </p>
              {pendingApproval.excerpt && (
                <pre className="mt-3 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                  {pendingApproval.excerpt}
                </pre>
              )}
            </div>

            {componentState.prd && (
              <details className="rounded-md border border-border/60 bg-background/60 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">
                  View PRD draft
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {componentState.prd}
                </pre>
              </details>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleApprovalDecision("approved")}
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                Approve PRD
              </button>
              <button
                onClick={() => handleApprovalDecision("rejected")}
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Request Changes
              </button>
            </div>
          </div>
        )}

        <StepsTimeline />

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border bg-background"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g., Build a todo app with dark mode..."
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            disabled={isInputDisabled}
          />
          <button
            type="submit"
            disabled={isInputDisabled || !input.trim()}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        {pendingApproval && (
          <p className="mt-2 text-xs text-muted-foreground">
            Complete the approval above to continue generation.
          </p>
        )}
      </form>
    </div>
  );
}
