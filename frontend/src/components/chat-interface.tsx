"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createInitialComponentState,
  useComponentState,
  type ArtifactSummary,
  type ComponentState,
  type StepStatus,
} from "../app/providers";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface MessageSection {
  type: "text" | "status-badge";
  content?: string;
  icon?: string;
  label?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  sections: MessageSection[];
  thinkingTime?: number;
  workingTime?: number;
}


type StreamPayload = {
  assistant_id: string;
  input: Record<string, unknown>;
};

const formatPrdFromRequirements = (requirements: any | undefined): string | undefined => {
  if (!requirements) {
    return undefined;
  }

  const sections: string[] = [];

  // Header
  sections.push("# Product Requirements Document\n");

  // Project Summary
  if (requirements.rawInput) {
    sections.push("## 📋 Project Summary");
    sections.push(requirements.rawInput.trim() + "\n");
  }

  // Key Features
  if (Array.isArray(requirements.features) && requirements.features.length > 0) {
    sections.push("## ✨ Key Features");
    requirements.features.forEach((feature: string) => {
      sections.push(`- **${feature}**`);
    });
    sections.push("");
  }

  // Visual Direction
  const styling = requirements.styling ?? {};
  const stylingDetails = [
    styling.theme ? `**Theme:** ${styling.theme}` : null,
    styling.colorScheme ? `**Color Scheme:** ${styling.colorScheme}` : null,
    styling.layout ? `**Layout:** ${styling.layout}` : null,
  ].filter(Boolean);
  if (stylingDetails.length > 0) {
    sections.push("## 🎨 Visual Direction");
    stylingDetails.forEach(detail => sections.push(`- ${detail}`));
    sections.push("");
  }

  // Component Architecture
  if (Array.isArray(requirements.components) && requirements.components.length > 0) {
    sections.push("## 🧩 Component Architecture");
    requirements.components.forEach((component: string) => {
      sections.push(`- \`${component}\``);
    });
    sections.push("");
  }

  // Clarifications (if any)
  if (requirements.clarificationNeeded && Array.isArray(requirements.clarificationQuestions)) {
    sections.push("## ❓ Clarifications Needed");
    requirements.clarificationQuestions.forEach((question: string) => {
      sections.push(`- ${question}`);
    });
    sections.push("");
  }

  return sections.length > 1 ? sections.join("\n") : undefined;
};

export function ChatInterface() {
  const { componentState, setComponentState } = useComponentState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef<string | null>(null);

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
            : formatPrdFromRequirements(nextRequirements) ?? prev.prd;

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
      const threadId = ensureThreadId();
      if (userMessage) {
        setMessages((prev) => [...prev, userMessage]);
      }

      if (resetState) {
        setComponentState(createInitialComponentState());
      }

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
        let assistantMessage = "";
        let statusBadges: Array<{ icon: string; text: string }> = [];

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
                assistantMessage = `I've analyzed your requirements. Here's what I understood:\n\n${payload.prd}`;
                statusBadges.push({ icon: "📋", text: "Requirements analyzed" });
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
            case "step-status":
              if (payload?.status === "success") {
                if (payload.id === "spec") {
                  statusBadges.push({ icon: "✓", text: "Requirements analyzed" });
                } else if (payload.id === "design") {
                  statusBadges.push({ icon: "✓", text: "Design created" });
                } else if (payload.id === "code") {
                  statusBadges.push({ icon: "✓", text: "Code generated" });
                } else if (payload.id === "build") {
                  statusBadges.push({ icon: "✓", text: "Preview ready" });
                }
              }
              break;
            case "run-finished":
              const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
              if (!assistantMessage) {
                assistantMessage = payload?.summary || "Component ready!";
              }

              // Build sections from message and status badges
              const sections: MessageSection[] = [
                { type: "text", content: assistantMessage }
              ];

              // Add status badges as inline sections
              statusBadges.forEach(badge => {
                sections.push({
                  type: "status-badge",
                  icon: badge.icon,
                  label: badge.text
                });
              });

              setMessages((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-assistant`,
                  role: "assistant",
                  sections,
                  thinkingTime: Math.floor(elapsedTime / 3), // Simulated thinking time
                  workingTime: elapsedTime,
                },
              ]);
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
    [appendLog, applyIncomingState, setComponentState]
  );

  const handleSubmit = async (event: React.FormEvent) => {
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
        id: Date.now().toString(),
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

  // AG-UI Process Stage Indicator
  const getProcessStage = () => {
    if (showEmptyState) return null;
    if (componentState.currentStep === "spec") return { step: 1, label: "Requirements", icon: "📋" };
    if (componentState.currentStep === "design") return { step: 2, label: "Design", icon: "🎨" };
    if (componentState.currentStep === "code") return { step: 3, label: "Code Generation", icon: "⚡" };
    if (componentState.currentStep === "build") return { step: 4, label: "Build & Preview", icon: "🚀" };
    if (componentState.componentCode) return { step: 4, label: "Complete", icon: "✅" };
    return null;
  };

  const processStage = getProcessStage();

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-background">
        <h1 className="text-2xl font-bold text-foreground">V0 Clone</h1>
        <p className="text-sm text-muted-foreground">
          Describe your app in natural language
        </p>
        {processStage && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span>{processStage.icon}</span>
              <span className="font-semibold text-foreground">Stage {processStage.step}:</span>
              <span className="text-muted-foreground">{processStage.label}</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    step <= (processStage.step || 0)
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {showEmptyState && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <p className="text-lg font-semibold text-foreground">Hi! 👋</p>
            <p className="text-sm">Tell me what you'd like to build and I'll produce the UI.</p>
            <p className="text-xs text-muted-foreground/70">
              Try "Build a todo app with dark mode and reminders"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {/* Thinking time BEFORE content */}
                {message.role === "assistant" && message.thinkingTime && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 opacity-70">
                    <span>🤔</span>
                    <span>Thought for {message.thinkingTime}s</span>
                  </div>
                )}

                {/* Content sections with inline status badges */}
                <div className="space-y-3">
                  {message.sections.map((section, idx) => (
                    <div key={idx}>
                      {section.type === "text" && (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {section.content}
                        </div>
                      )}
                      {section.type === "status-badge" && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                          <span>{section.icon}</span>
                          <span>{section.label}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Working time AFTER content */}
                {message.role === "assistant" && message.workingTime && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 opacity-70 border-t border-border/30 pt-2">
                    <span>⚡</span>
                    <span>Worked for {message.workingTime}s</span>
                  </div>
                )}

                {/* Action buttons for assistant messages */}
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
                    <button
                      className="p-1.5 rounded hover:bg-background/60 transition-colors"
                      title="Like"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-background/60 transition-colors"
                      title="Dislike"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-background/60 transition-colors"
                      title="Copy"
                      onClick={() => {
                        const text = message.sections
                          .filter(s => s.type === "text")
                          .map(s => s.content)
                          .join("\n\n");
                        navigator.clipboard.writeText(text);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-background/60 transition-colors"
                      title="More"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}


        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm shadow-sm">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-70">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>
                  {componentState.currentStep === "spec" && "Analyzing requirements..."}
                  {componentState.currentStep === "design" && "Designing component..."}
                  {componentState.currentStep === "code" && "Generating code..."}
                  {componentState.currentStep === "build" && "Building preview..."}
                  {!componentState.currentStep && "Thinking..."}
                </span>
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
      </form>
    </div>
  );
}
