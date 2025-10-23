"use client";

import { CheckCircle, Circle, Loader2, XCircle } from "lucide-react";

import { useComponentState } from "@/app/providers";
import { Shimmer } from "./shimmer";

const STEPS: Array<{ id: string; label: string }> = [
  { id: "spec", label: "PRD & Decisions" },
  { id: "schema", label: "Data Schema" },
  { id: "ui", label: "UI Scaffolding" },
  { id: "apis", label: "APIs" },
  { id: "build", label: "Build" },
  { id: "fix", label: "Auto-Fix" },
  { id: "done", label: "Done" },
];

export function StepsTimeline({ className = "" }: { className?: string }) {
  const { componentState } = useComponentState();
  const { steps, logs, prd, currentStep } = componentState;

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "waiting":
        return <Loader2 className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const hasActivity =
    currentStep !== "idle" ||
    Object.values(steps).some((step) => step.status !== "queued") ||
    Boolean(prd) ||
    logs.length > 0;

  if (!hasActivity) {
    return null;
  }

  return (
    <div className={`rounded-lg border border-border bg-background/80 backdrop-blur ${className}`}>
      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Build Timeline</h2>
          <p className="text-xs text-muted-foreground">
            Follow each phase as the generator reasons, designs, and builds.
          </p>
        </div>

        <div className="space-y-2">
          {STEPS.map((step) => {
            const storedStatus = steps[step.id]?.status ?? "queued";
            const status =
              storedStatus === "queued" && currentStep === step.id
                ? "running"
                : storedStatus;
            const note = steps[step.id]?.note;
            const isRunning = status === "running";
            const isComplete = status === "success";

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 rounded-lg px-2 py-2 transition-colors ${
                  isRunning
                    ? "bg-primary/10"
                    : isComplete
                    ? "bg-emerald-500/10"
                    : ""
                }`}
              >
                <div className="mt-0.5">{renderStatusIcon(status)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs capitalize text-muted-foreground">{status}</p>
                  {note && (
                    <p className="mt-1 text-xs text-primary">{note}</p>
                  )}
                  {isRunning && !note && (
                    <div className="mt-1">
                      <Shimmer className="h-2 w-28" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {prd && (
          <details className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-sm font-medium">
              Product Requirements Draft
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
              {prd}
            </pre>
          </details>
        )}

        {logs.length > 0 && (
          <div className="max-h-40 overflow-auto rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Recent Logs</p>
            <ul className="space-y-1">
              {logs.slice(-8).map((log, index) => (
                <li key={`${log}-${index}`} className="text-xs text-muted-foreground">
                  {log}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
