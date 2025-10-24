"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Sparkles,
  ClipboardCopy,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Send,
  CheckCircle2,
  Loader2,
  Circle,
} from "lucide-react";

import {
  createInitialComponentState,
  useComponentState,
  type ArtifactSummary,
  type ComponentState,
  type StepStatus,
} from "../app/providers";
import { ApprovalMessage } from "./approval-message";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface MessageSection {
  type: "text";
  content: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  type?: "normal" | "approval";
  sections: MessageSection[];
  // For approval messages
  prdText?: string;
  requirements?: any;
}


type StreamPayload = {
  assistant_id: string;
  input: Record<string, unknown>;
};

// Removed formatPrdFromRequirements - no longer used

type StepThreadMessage =
  | {
      id: string;
      variant: "text" | "log" | "thought";
      content: string;
    }
  | {
      id: string;
      variant: "approval";
      prdText: string;
      requirements?: any;
    };

type StepThreadState = {
  id: string;
  label: string;
  status: StepStatus["status"];
  messages: StepThreadMessage[];
};

const STEP_DEFINITIONS: Array<{ id: string; label: string }> = [
  { id: "spec", label: "Analyzing requirements" },
  { id: "design", label: "Designing component" },
  { id: "code", label: "Generating code" },
  { id: "build", label: "Building preview" },
];

export function ChatInterface() {
  const { componentState, setComponentState } = useComponentState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef<string | null>(null);
  const currentStepRef = useRef<string | null>(null);

  const createInitialStepThreads = useCallback(() => {
    const entries = STEP_DEFINITIONS.map(
      ({ id, label }): [string, StepThreadState] => [
        id,
        {
          id,
          label,
          status: "queued",
          messages: [],
        },
      ]
    );
    return Object.fromEntries(entries) as Record<string, StepThreadState>;
  }, []);

  const [stepThreads, setStepThreads] = useState<Record<string, StepThreadState>>(() =>
    createInitialStepThreads()
  );

  // Helper function to copy text to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => console.log("Copied to clipboard"),
      (err) => console.error("Failed to copy:", err)
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    (incoming: Partial<ComponentState> & Record<string, unknown>) => {
      setComponentState((prev) => {
        const nextRequirements =
          (incoming as { requirements?: ComponentState["requirements"] })
            .requirements ?? prev.requirements;

        const nextDesignSpec =
          (incoming as { designSpec?: ComponentState["designSpec"] })
            .designSpec ?? prev.designSpec;

        const nextPrd =
          typeof incoming.prd === "string"
            ? incoming.prd
            : prev.prd;

        return {
          componentCode: incoming.componentCode ?? prev.componentCode,
          currentStep: incoming.currentStep ?? prev.currentStep,
          approved: incoming.approved ?? prev.approved,
          feedback:
            incoming.feedback !== undefined ? incoming.feedback : prev.feedback,
          steps: mergeSteps(prev.steps, incoming.steps),
          logs: incoming.logs ?? prev.logs,
          artifacts: incoming.artifacts ?? prev.artifacts,
          prd: nextPrd,
          progress:
            typeof incoming.progress === "number"
              ? incoming.progress
              : prev.progress,
          requirements: nextRequirements,
          designSpec: nextDesignSpec,
        };
      });
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
      if (resetState) {
        threadIdRef.current = null;
        setComponentState(createInitialComponentState());
        setMessages(userMessage ? [userMessage] : []);
        currentStepRef.current = null;
        setStepThreads(createInitialStepThreads());
      } else if (userMessage) {
        setMessages((prev) => [...prev, userMessage]);
      }

      const threadId = ensureThreadId();

      setIsLoading(true);
      const startTime = Date.now();

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
          console.log(`[SSE Event] ${eventName}:`, payload);

          const ensureStepThread = (stepId: string) => {
            if (!STEP_DEFINITIONS.some((def) => def.id === stepId)) {
              return;
            }
            setStepThreads((prev) => {
              if (prev[stepId]) {
                return prev;
              }
              const next = { ...prev };
              next[stepId] = {
                id: stepId,
                label:
                  STEP_DEFINITIONS.find((def) => def.id === stepId)?.label ?? stepId,
                status: "queued",
                messages: [],
              };
              return next;
            });
          };

          const updateStepTrackers = (status: StepStatus) => {
            ensureStepThread(status.id);
            setStepThreads((prev) => {
              const next = { ...prev };
              const thread = next[status.id];
              if (!thread) {
                return prev;
              }
              next[status.id] = {
                ...thread,
                status: status.status,
              };
              return next;
            });

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

          const appendToStep = (
            stepId: string,
            message: StepThreadMessage,
            overrideStatus?: StepStatus["status"]
          ) => {
            if (!STEP_DEFINITIONS.some((def) => def.id === stepId)) {
              return;
            }
            ensureStepThread(stepId);
            setStepThreads((prev) => {
              const next = { ...prev };
              const thread = next[stepId];
              if (!thread) {
                return prev;
              }
              next[stepId] = {
                ...thread,
                status: overrideStatus ?? thread.status,
                messages: [...thread.messages, message],
              };
              return next;
            });
          };

          switch (eventName) {
            case "run-started":
              console.log("🚀 Pipeline started");
              appendLog("Pipeline started");
              break;
            case "step-status":
              if (payload) {
                console.log(`📊 Step status: ${payload.id} → ${payload.status}`);
                updateStepTrackers(payload as StepStatus);
                if (payload.status === "running") {
                  currentStepRef.current = payload.id;
                  appendToStep(payload.id, {
                    id: `${payload.id}-start-${Date.now()}-${Math.random()}`,
                    variant: "thought",
                    content: "Starting execution.",
                  }, "running");
                } else if (payload.status === "success") {
                  appendToStep(payload.id, {
                    id: `${payload.id}-success-${Date.now()}-${Math.random()}`,
                    variant: "log",
                    content: "Completed successfully.",
                  }, "success");
                }
              }
              break;
            case "progress":
              if (typeof payload?.pct === "number") {
                console.log(`📈 Progress: ${payload.pct}%`);
                setComponentState((prev) => ({
                  ...prev,
                  progress: payload.pct,
                }));
              }
              break;
            case "prd":
              if (typeof payload?.prd === "string") {
                console.log("📋 PRD received:", payload.prd.substring(0, 100) + "...");
                setComponentState((prev) => ({ ...prev, prd: payload.prd }));
                appendToStep("spec", {
                  id: `spec-prd-${Date.now()}-${Math.random()}`,
                  variant: "text",
                  content: payload.prd,
                });
              }
              break;
            case "artifact":
              if (payload?.file) {
                console.log("📄 Artifact received:", payload.file.path);
                const artifact = payload.file as ArtifactSummary;
                setComponentState((prev) => ({
                  ...prev,
                  artifacts: prev.artifacts
                    .filter((item) => item.path !== artifact.path)
                    .concat(artifact),
                }));
                const stepId = currentStepRef.current ?? "code";
                appendToStep(stepId, {
                  id: `${stepId}-artifact-${Date.now()}-${Math.random()}`,
                  variant: "log",
                  content: `Artifact generated: ${artifact.path}`,
                });
              }
              break;
            case "log":
              if (typeof payload?.text === "string") {
                appendLog(payload.text);
                const stepId = currentStepRef.current;
                if (stepId) {
                  appendToStep(stepId, {
                    id: `${stepId}-log-${Date.now()}-${Math.random()}`,
                    variant: "log",
                    content: payload.text,
                  });
                }
              }
              break;
            case "values":
              if (payload) {
                console.log("🔄 State update (values):", Object.keys(payload));
                applyIncomingState(payload as Partial<ComponentState>);
              }
              break;
            case "approval-required":
              console.log("👍 PRD approval required");
              appendLog("PRD approval required – waiting on user decision");
              appendToStep("spec", {
                id: `spec-approval-${Date.now()}-${Math.random()}`,
                variant: "approval",
                prdText: payload?.prd || payload?.requirements?.rawInput || "",
                requirements: payload?.requirements,
              }, "waiting");
              break;
            case "run-finished": {
              const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
              console.log(`🏁 Run finished. Elapsed: ${elapsedTime}s`);

              // Only add completion message to build step if it actually ran
              setStepThreads((prev) => {
                const buildThread = prev.build;
                if (buildThread && buildThread.status !== "queued" && buildThread.status !== "success") {
                  const finalMessage =
                    payload?.summary ||
                    "Your component is ready! Check the preview on the right →";
                  const next = { ...prev };
                  next.build = {
                    ...buildThread,
                    status: "success",
                    messages: [
                      ...buildThread.messages,
                      {
                        id: `build-summary-${Date.now()}-${Math.random()}`,
                        variant: "text" as const,
                        content: `${finalMessage}\n\nCompleted in ${elapsedTime}s.`,
                      },
                    ],
                  };
                  return next;
                }
                return prev;
              });

              appendLog("Pipeline completed");
              break;
            }
            case "error":
              appendLog(`Error: ${payload?.message ?? "unknown"}`);
              break;
            default:
              break;
          }
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
      } catch (error: any) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          sections: [{
            type: "text",
            content: `Error: ${error.message}. Make sure the backend is running on ${BACKEND_URL}`
          }],
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [appendLog, applyIncomingState, setComponentState, createInitialStepThreads]
  );

  const handleApprove = async () => {
    console.log("✅ User approved PRD");
    setStepThreads((prev) => {
      const next = { ...prev };
      const spec = next.spec;
      if (spec) {
        next.spec = {
          ...spec,
          status: "running",
          messages: spec.messages.filter((msg) => msg.variant !== "approval"),
        };
      }
      return next;
    });
    setIsLoading(true);

    await streamRun({
      payload: {
        assistant_id: "v0-generator-subgraphs",
        input: {
          messages: [],
          userApproval: true,
        },
      },
      resetState: false,
    });
  };

  const handleReject = async () => {
    console.log("❌ User rejected PRD");
    const feedback = prompt("What changes would you like to make to the requirements?");

    if (feedback) {
      setStepThreads((prev) => {
        const next = { ...prev };
        const spec = next.spec;
        if (spec) {
          next.spec = {
            ...spec,
            status: "running",
            messages: spec.messages.filter((msg) => msg.variant !== "approval"),
          };
        }
        return next;
      });
      setIsLoading(true);

      await streamRun({
        payload: {
          assistant_id: "v0-generator-subgraphs",
          input: {
            messages: [],
            userApproval: false,
            feedback,
          },
        },
        resetState: false,
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput("");

    await streamRun({
      payload: {
        assistant_id: "v0-generator-subgraphs",
        input: {
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: content }],
            },
          ],
        },
      },
      userMessage: {
        id: `${Date.now()}-${Math.random()}`,
        role: "user",
        sections: [{ type: "text", content }],
      },
      resetState: true,
    });
  };

  const isInputDisabled = useMemo(
    () => isLoading,
    [isLoading]
  );

  const showEmptyState = messages.length === 0;

  const visibleStepThreads = useMemo(() => {
    return STEP_DEFINITIONS.map(({ id }) => stepThreads[id]).filter(
      (thread): thread is StepThreadState =>
        Boolean(
          thread &&
          thread.status !== "queued" &&
          (thread.messages.length > 0 ||
           thread.status === "running" ||
           thread.status === "waiting" ||
           thread.status === "error")
        )
    );
  }, [stepThreads]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-gradient-to-b from-background to-muted/20 p-6">
        <h1 className="text-3xl font-semibold text-foreground">V0 Clone</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe your app in natural language and I&apos;ll build it for you
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {showEmptyState && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-semibold text-foreground">
                Ready to build something amazing?
              </p>
              <p className="text-sm text-muted-foreground">
                Tell me what you&apos;d like to build and I&apos;ll produce the UI.
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-4">
              <p className="text-xs font-medium text-muted-foreground">
                Try something like:
              </p>
              <p className="mt-2 text-sm text-foreground">
                &quot;Build a todo app with dark mode and reminders&quot;
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              /* User message */
              <div className="flex justify-end">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-end gap-3">
                    <div className="max-w-[420px] rounded-3xl border border-border bg-primary px-5 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
                      {message.sections[0]?.content}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      Sent just now
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => copyToClipboard(message.sections[0]?.content || "")}
                      >
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Avatar fallback="ME" className="mt-1" />
                </div>
              </div>
            ) : (
              /* Assistant message */
              <div className="flex items-start gap-3">
                <Avatar fallback="AI" className="mt-1 bg-primary/10 text-primary" />
                <div className="flex-1 space-y-4">
                  {/* Approval message */}
                  {message.type === "approval" && message.prdText ? (
                    <div className="max-w-[85%] space-y-4 rounded-2xl border border-border bg-card px-5 py-4 text-sm shadow-sm">
                      <p className="text-sm text-muted-foreground">
                        I drafted a PRD based on your request. Approve to continue to design and coding, or request changes if it needs tweaks.
                      </p>
                      <ApprovalMessage
                        prdText={message.prdText}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    </div>
                  ) : (
                    /* Normal text message */
                    <div className="max-w-[85%] space-y-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm shadow-sm">
                      <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                        {message.sections[0]?.content}
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5" />
                          Response
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(message.sections[0]?.content || "")}
                          >
                            <ClipboardCopy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {visibleStepThreads.map((thread) => (
          <StepThreadView
            key={thread.id}
            thread={thread}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-background p-4"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g., Build a todo app with dark mode..."
            className="flex-1 rounded-full border border-border bg-muted/30 px-5 py-3 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isInputDisabled}
          />
          <Button
            type="submit"
            disabled={isInputDisabled || !input.trim()}
            className="h-12 rounded-full px-6 shadow-sm transition-all hover:shadow-md"
            size="lg"
          >
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

interface StepThreadViewProps {
  thread: StepThreadState;
  onApprove: () => void;
  onReject: () => void;
}

function StepThreadView({ thread, onApprove, onReject }: StepThreadViewProps) {
  const statusIcon = (() => {
    switch (thread.status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-foreground" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "waiting":
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
      case "error":
        return <Circle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  })();

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        {statusIcon}
        <div>
          <p className="text-sm font-medium text-foreground">{thread.label}</p>
          {thread.status === "waiting" && (
            <p className="text-xs text-muted-foreground">Awaiting your approval to continue.</p>
          )}
        </div>
      </div>

      <div className="space-y-4 border-t border-dashed border-border pt-4">
        {thread.messages.map((message) => {
          if (message.variant === "approval") {
            return (
              <div key={message.id} className="rounded-2xl border border-border bg-background px-4 py-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  Review the PRD below. Approve to proceed, or request tweaks.
                </p>
                <ApprovalMessage
                  prdText={message.prdText}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              </div>
            );
          }

          if (message.variant === "thought") {
            return (
              <div key={message.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Sparkles className="mt-1 h-3.5 w-3.5 text-muted-foreground/80" />
                <span className="leading-relaxed">{message.content}</span>
              </div>
            );
          }

          const baseClass =
            message.variant === "log"
              ? "text-xs text-muted-foreground/80"
              : "text-sm text-foreground";

          return (
            <div key={message.id} className={`${baseClass} whitespace-pre-wrap leading-relaxed`}>
              {message.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
