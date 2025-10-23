"use client";

/**
 * Shimmer Demo Page
 * View all shimmer loading animations in action
 * Navigate to: http://localhost:3000/shimmer-demo
 */

import {
  Shimmer,
  MessageShimmer,
  ThinkingShimmer,
  StepShimmer,
  CodeShimmer,
  CardShimmer,
  TimelineShimmer,
} from "@/components/shimmer";

export default function ShimmerDemoPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Shimmer Animations
          </h1>
          <p className="text-muted-foreground">
            Modern loading states with smooth shimmer effects
          </p>
        </div>

        {/* Base Shimmer Variants */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Base Shimmer Variants
          </h2>
          
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Text (Single Line)
              </h3>
              <Shimmer variant="text" />
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Text (Multiple Lines)
              </h3>
              <Shimmer variant="text" lines={3} />
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Card
              </h3>
              <Shimmer variant="card" />
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Avatar
              </h3>
              <Shimmer variant="avatar" />
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Button
              </h3>
              <Shimmer variant="button" />
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Message
              </h3>
              <Shimmer variant="message" />
            </div>
          </div>
        </section>

        {/* Thinking Shimmer */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Thinking Shimmer ⭐
          </h2>
          <p className="text-sm text-muted-foreground">
            Used in chat interface when AI is processing
          </p>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <ThinkingShimmer />
          </div>
        </section>

        {/* Message Shimmers */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Message Shimmers
          </h2>
          
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <MessageShimmer role="assistant" />
            <MessageShimmer role="user" />
          </div>
        </section>

        {/* Code Shimmer */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Code Shimmer
          </h2>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <CodeShimmer lines={8} />
          </div>
        </section>

        {/* Card Shimmer */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Card Shimmer
          </h2>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <CardShimmer />
          </div>
        </section>

        {/* Timeline Shimmer */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Timeline Shimmer
          </h2>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <TimelineShimmer steps={6} />
          </div>
        </section>

        {/* Usage */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Usage
          </h2>
          
          <div className="bg-muted/30 rounded-lg p-6">
            <pre className="text-sm overflow-x-auto">
{`import { ThinkingShimmer } from '@/components/shimmer';

{isLoading && <ThinkingShimmer />}`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
