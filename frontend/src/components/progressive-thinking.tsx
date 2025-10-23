"use client";

/**
 * Progressive Thinking Indicator
 * Shows step-by-step progress like Claude's interface
 */

import { CheckCircle, Loader2, Sparkles, Brain, Code, Search } from "lucide-react";
import { Shimmer } from "./shimmer";

interface ThinkingStep {
  id: string;
  label: string;
  status: "pending" | "running" | "complete";
  icon?: React.ReactNode;
  duration?: number;
}

interface ProgressiveThinkingProps {
  currentStep?: string;
  steps?: ThinkingStep[];
  elapsedTime?: number;
}

const DEFAULT_STEPS: ThinkingStep[] = [
  { 
    id: "analyze", 
    label: "Analyzing request", 
    status: "pending",
    icon: <Brain className="w-3.5 h-3.5" />
  },
  { 
    id: "design", 
    label: "Generating design", 
    status: "pending",
    icon: <Sparkles className="w-3.5 h-3.5" />
  },
  { 
    id: "code", 
    label: "Writing code", 
    status: "pending",
    icon: <Code className="w-3.5 h-3.5" />
  },
];

export function ProgressiveThinking({ 
  currentStep,
  steps = DEFAULT_STEPS,
  elapsedTime 
}: ProgressiveThinkingProps) {
  // Update step statuses based on current step
  const updatedSteps = steps.map((step, index) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex === -1) return step;
    
    if (index < currentIndex) {
      return { ...step, status: "complete" as const };
    } else if (index === currentIndex) {
      return { ...step, status: "running" as const };
    }
    return step;
  });

  const hasStarted = currentStep !== undefined;

  return (
    <div className="flex justify-start animate-in fade-in duration-300">
      <div className="bg-muted/30 rounded-lg px-4 py-3 space-y-3 max-w-[80%]">
        {/* Thinking header */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>
            {elapsedTime ? `Thinking for ${elapsedTime}s` : "Thinking..."}
          </span>
        </div>

        {/* Progressive steps */}
        {hasStarted && (
          <div className="space-y-2">
            {updatedSteps.map((step) => (
              <div 
                key={step.id}
                className={`flex items-center gap-2 text-xs transition-all ${
                  step.status === "running" ? "text-primary" : 
                  step.status === "complete" ? "text-muted-foreground" :
                  "text-muted-foreground/40"
                }`}
              >
                {step.status === "complete" && (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                )}
                {step.status === "running" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                )}
                {step.status === "pending" && (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/20 flex-shrink-0" />
                )}
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Shimmer for initial thinking */}
        {!hasStarted && (
          <div className="space-y-2">
            <Shimmer className="w-32 h-3" />
            <Shimmer className="w-24 h-3" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Enhanced Thinking Shimmer with micro-interactions
 */
export function EnhancedThinkingShimmer({ 
  message = "AI is thinking..." 
}: { 
  message?: string 
}) {
  return (
    <div className="flex justify-start animate-in fade-in duration-300">
      <div className="bg-muted/30 rounded-lg px-4 py-3 space-y-2 max-w-[80%]">
        {/* Icon + message */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-4 h-4 text-primary animate-pulse" />
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          </div>
          <span className="text-xs text-muted-foreground">{message}</span>
        </div>
        
        {/* Shimmer lines */}
        <div className="space-y-2 pt-1">
          <Shimmer className="w-full h-3" />
          <Shimmer className="w-3/4 h-3" />
        </div>
      </div>
    </div>
  );
}

/**
 * Status Update Component
 * Shows quick status messages like "Checked integrations"
 */
interface StatusUpdateProps {
  icon?: React.ReactNode;
  message: string;
  type?: "info" | "success" | "working";
}

export function StatusUpdate({ 
  icon, 
  message, 
  type = "info" 
}: StatusUpdateProps) {
  const defaultIcons = {
    info: <Search className="w-3.5 h-3.5" />,
    success: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
    working: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 animate-in fade-in duration-200">
      {icon || defaultIcons[type]}
      <span>{message}</span>
    </div>
  );
}

/**
 * Work Duration Indicator
 * Shows "Worked for Xs" at the bottom
 */
export function WorkDuration({ seconds }: { seconds: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pt-2 border-t border-border/50">
      <div className="w-1 h-1 bg-muted-foreground/40 rounded-full animate-pulse" />
      <span>Worked for {seconds}s</span>
    </div>
  );
}
