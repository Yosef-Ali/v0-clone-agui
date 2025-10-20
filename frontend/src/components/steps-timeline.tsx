"use client";

import { CheckCircle, Circle, Loader2, XCircle } from "lucide-react";

import { useComponentState } from "@/app/providers";

const STEPS: Array<{ id: string; label: string }> = [
  { id: "spec", label: "PRD & Decisions" },
  { id: "schema", label: "Data Schema" },
  { id: "ui", label: "UI Scaffolding" },
  { id: "apis", label: "APIs" },
  { id: "build", label: "Build" },
  { id: "fix", label: "Auto-Fix" },
  { id: "done", label: "Done" },
];

export function StepsTimeline() {
  const { componentState } = useComponentState();
  const { steps, logs, progress, prd } = componentState;

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "waiting":
        return <Loader2 className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="border-b border-border bg-background">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Build Timeline</h2>
            <p className="text-xs text-muted-foreground">
              Follow the generation pipeline and review artifacts as they stream in.
            </p>
          </div>
          <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {STEPS.map((step) => {
            const status = steps[step.id]?.status ?? "queued";
            const note = steps[step.id]?.note;
            return (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2"
              >
                <div className="mt-0.5">{renderStatusIcon(status)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">{status}</p>
                  {note && <p className="text-xs text-primary mt-1">{note}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {prd && (
          <details className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-sm font-medium">Product Requirements Draft</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
              {prd}
            </pre>
          </details>
        )}

        {logs.length > 0 && (
          <div className="max-h-40 overflow-auto rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Logs</p>
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
