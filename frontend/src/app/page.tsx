"use client";

import { ChatInterface } from "@/components/chat-interface";
import { LivePreview } from "@/components/live-preview";
import { ApprovalPanel } from "@/components/approval-panel";
import { StepsTimeline } from "@/components/steps-timeline";

export default function Home() {
  return (
    <main className="flex h-screen bg-background">
      {/* Left Side: Timeline + Chat */}
      <div className="w-1/2 border-r border-border flex flex-col">
        <StepsTimeline />
        <div className="flex-1 min-h-0">
          <ChatInterface />
        </div>
      </div>

      {/* Right Side: Live Preview & Approval */}
      <div className="w-1/2 flex flex-col">
        <LivePreview />
        <ApprovalPanel />
      </div>
    </main>
  );
}
