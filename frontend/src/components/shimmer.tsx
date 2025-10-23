"use client";

/**
 * Shimmer Animation Component
 * Modern loading skeleton with smooth shimmer effect
 */

export interface ShimmerProps {
  className?: string;
  variant?: "text" | "card" | "avatar" | "button" | "message";
  lines?: number;
}

export function Shimmer({ 
  className = "", 
  variant = "text",
  lines = 1 
}: ShimmerProps) {
  const baseClasses = "relative overflow-hidden bg-muted/50 before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent";

  const variants = {
    text: "h-4 rounded-md",
    card: "h-32 rounded-lg",
    avatar: "w-10 h-10 rounded-full",
    button: "h-10 rounded-lg w-24",
    message: "h-16 rounded-lg",
  };

  // For multiple lines of text
  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => {
          // Make last line shorter for natural look
          const isLast = i === lines - 1;
          const width = isLast ? "w-3/4" : "w-full";
          return (
            <div
              key={i}
              className={`${baseClasses} ${variants.text} ${width} ${className}`}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );
}

/**
 * Message Shimmer - Simulates incoming message
 */
export function MessageShimmer({ 
  role = "assistant" 
}: { 
  role?: "user" | "assistant" 
}) {
  const alignment = role === "user" ? "justify-end" : "justify-start";
  const bgColor = role === "user" ? "bg-primary/10" : "bg-muted/30";

  return (
    <div className={`flex ${alignment} animate-in fade-in duration-300`}>
      <div className={`max-w-[80%] rounded-lg px-4 py-3 ${bgColor}`}>
        <Shimmer variant="text" lines={2} />
      </div>
    </div>
  );
}

/**
 * Thinking Shimmer - Shows AI is processing
 */
export function ThinkingShimmer() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted/30 rounded-lg px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <Shimmer className="w-16 h-3" />
          <Shimmer className="w-12 h-3" />
          <Shimmer className="w-20 h-3" />
        </div>
        <Shimmer variant="text" lines={2} />
      </div>
    </div>
  );
}

/**
 * Step Shimmer - For loading steps in timeline
 */
export function StepShimmer() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 animate-in fade-in duration-300">
      <Shimmer variant="avatar" className="w-8 h-8 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="w-32 h-3" />
        <Shimmer className="w-full h-3" />
      </div>
    </div>
  );
}

/**
 * Code Block Shimmer - For loading code previews
 */
export function CodeShimmer({ lines = 8 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-2">
      {Array.from({ length: lines }).map((_, i) => {
        // Random widths for realistic code look
        const widths = ["w-full", "w-5/6", "w-4/5", "w-3/4", "w-2/3"];
        const randomWidth = widths[Math.floor(Math.random() * widths.length)];
        return (
          <Shimmer 
            key={i} 
            className={`h-3 ${randomWidth}`} 
          />
        );
      })}
    </div>
  );
}

/**
 * Card Shimmer - For loading cards/panels
 */
export function CardShimmer() {
  return (
    <div className="rounded-lg border border-border bg-background p-6 space-y-4 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Shimmer className="w-48 h-5" />
        <Shimmer variant="text" lines={2} />
      </div>
      <div className="flex gap-2">
        <Shimmer variant="button" />
        <Shimmer variant="button" />
      </div>
    </div>
  );
}

/**
 * Timeline Shimmer - Loading state for full timeline
 */
export function TimelineShimmer({ steps = 6 }: { steps?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: steps }).map((_, i) => (
        <StepShimmer key={i} />
      ))}
    </div>
  );
}
