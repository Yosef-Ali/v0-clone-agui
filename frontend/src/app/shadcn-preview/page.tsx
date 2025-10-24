"use client";

import { ProcessTranscriptPreview } from "@/components/process-transcript-preview";

export default function ShadcnPreviewPage() {
  return (
    <div className="min-h-screen bg-muted/40 py-12">
      <div className="mx-auto max-w-4xl space-y-8 px-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">
            Process Transcript Preview
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Shadcn-flavored recreation of the component flow shown in the mockup.
          </p>
        </header>
        <ProcessTranscriptPreview />
      </div>
    </div>
  );
}

