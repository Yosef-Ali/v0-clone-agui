"use client";

import { useState, useRef, useEffect } from "react";

import {
  createInitialComponentState,
  useComponentState,
  type ArtifactSummary,
  type ComponentState,
  type StepStatus,
} from "../app/providers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const { setComponentState } = useComponentState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const threadId = `thread-${Date.now()}`;
      const response = await fetch(`${BACKEND_URL}/threads/${threadId}/runs/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant_id: "v0-generator",
          input: {
            messages: [
              {
                role: "user",
                content: [{ type: "text", text: userMessage.content }],
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }

      setComponentState(createInitialComponentState());

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let dataBuffer = "";
      let assistantSummary = "";

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
          console.warn("Failed to parse SSE payload", currentEvent, dataBuffer, error);
        }

        currentEvent = "";
        dataBuffer = "";
      };

      const handleSseEvent = (eventName: string, payload: any) => {
        switch (eventName) {
          case "run-started":
            pushLog("Pipeline started");
            break;
          case "step-status":
            if (payload) {
              updateStepStatus(payload as StepStatus);
            }
            break;
          case "progress":
            if (typeof payload?.pct === "number") {
              setComponentState((prev) => ({ ...prev, progress: payload.pct }));
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
                artifacts: prev.artifacts.filter((item) => item.path !== artifact.path).concat(artifact),
              }));
            }
            break;
          case "log":
            if (typeof payload?.text === "string") {
              pushLog(payload.text);
            }
            break;
          case "values":
            if (payload) {
              applyIncomingState(payload as Partial<ComponentState>);
            }
            break;
          case "run-finished":
            if (typeof payload?.summary === "string") {
              assistantSummary = payload.summary;
            }
            pushLog("Pipeline completed");
            break;
          case "error":
            pushLog(`Error: ${payload?.message ?? "unknown"}`);
            break;
          default:
            break;
        }
      };

      const applyIncomingState = (incoming: Partial<ComponentState>) => {
        setComponentState((prev) => ({
          componentCode: incoming.componentCode ?? prev.componentCode,
          currentStep: incoming.currentStep ?? prev.currentStep,
          approved: incoming.approved ?? prev.approved,
          feedback: incoming.feedback ?? prev.feedback,
          steps: mergeSteps(prev.steps, incoming.steps),
          logs: incoming.logs ?? prev.logs,
          artifacts: incoming.artifacts ?? prev.artifacts,
          prd: incoming.prd ?? prev.prd,
          progress: typeof incoming.progress === "number" ? incoming.progress : prev.progress,
        }));
      };

      const updateStepStatus = (status: StepStatus) => {
        setComponentState((prev) => ({
          ...prev,
          currentStep: status.status === "running" ? status.id : prev.currentStep,
          steps: {
            ...prev.steps,
            [status.id]: {
              ...prev.steps[status.id],
              ...status,
            },
          },
        }));
      };

      const pushLog = (value: string) => {
        setComponentState((prev) => ({
          ...prev,
          logs: [...prev.logs, value].slice(-200),
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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          assistantSummary ||
          "Pipeline finished! Review the timeline, artifacts, and preview panel.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
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
  };

  const mergeSteps = (
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
    return result;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-background">
        <h1 className="text-2xl font-bold">V0 Clone</h1>
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
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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

      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g., Build a todo app with dark mode..."
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
