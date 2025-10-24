"use client";

interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "running" | "success";
}

interface ProgressMessageProps {
  steps: ProgressStep[];
  finalMessage?: string;
  workingTime?: number;
}

export function ProgressMessage({ steps, finalMessage, workingTime }: ProgressMessageProps) {
  const lastActiveIndex = steps.reduce((acc, step, index) => {
    return step.status !== "pending" ? index : acc;
  }, -1);
  const visibleCount = Math.max(1, lastActiveIndex + 1);
  const visibleSteps = steps.slice(0, visibleCount);
  const allComplete = steps.every((s) => s.status === "success");

  return (
    <div className="space-y-3">
      {/* Progress Steps */}
      <div className="space-y-2">
        {visibleSteps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-2 text-sm ${
              step.status === "running"
                ? "text-foreground font-medium"
                : step.status === "success"
                ? "text-muted-foreground"
                : "text-muted-foreground/50"
            }`}
          >
            {step.status === "running" && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {step.status === "success" && (
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {step.status === "pending" && (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
              </svg>
            )}
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      {/* Final Message */}
      {allComplete && finalMessage && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-sm">{finalMessage}</p>
        </div>
      )}

      {/* Working Time */}
      {allComplete && workingTime && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-70 mt-2">
          <span>⚡</span>
          <span>Completed in {workingTime}s</span>
        </div>
      )}
    </div>
  );
}
