import {
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  MoreHorizontal,
  Sparkles,
  Timer,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const coreQuestions = [
  {
    title: "User roles",
    description:
      "Do you need different access levels (admin, doctors, patients, receptionists)?",
  },
  {
    title: "Key features",
    bullets: [
      "Patient registration and profiles",
      "Appointment scheduling/booking",
      "Doctor/staff management",
      "Appointment history and records",
      "Calendar views",
      "Notifications/reminders",
    ],
  },
  {
    title: "Authentication",
    description: "Do users need to log in, or is this an internal admin-only tool?",
  },
  {
    title: "Database",
    description: "Do you want to use a specific database (Supabase, Neon, etc.)?",
  },
];

const checkpoints = [
  "Checked integrations",
  "Generated design inspiration",
  "Explored codebase",
  "Project plan created",
];

export function ProcessTranscriptPreview() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 rounded-3xl border border-border bg-card p-10 shadow-xl">
      {/* User prompt */}
      <div className="flex justify-end">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-3">
            <div className="max-w-[360px] rounded-3xl border border-border bg-muted px-5 py-3 text-sm leading-relaxed text-foreground shadow-sm">
              Create a clinic management system for patient appointments
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Sent just now
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <ClipboardCopy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Avatar fallback="ME" className="mt-1" />
        </div>
      </div>

      {/* Assistant response */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground/80" />
          Thought for 6s
        </div>
        <div className="space-y-4 text-sm leading-6 text-foreground">
          <p>
            I&apos;d be happy to help you build a clinic management system for patient
            appointments! To create the right solution for you, I need to understand your
            specific needs:
          </p>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Core Questions:</h3>
            <ol className="list-decimal space-y-3 pl-5 text-muted-foreground">
              {coreQuestions.map((question, index) => (
                <li key={index} className="space-y-2">
                  <span className="text-foreground font-medium">{question.title}</span>{" "}
                  {question.description && <span>{question.description}</span>}
                  {question.bullets && (
                    <ul className="ml-4 list-disc space-y-1">
                      {question.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">For example, I could build:</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-medium text-foreground">Simple version</p>
                <p>Admin dashboard to manage patients and appointments with a calendar view</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Full version</p>
                <p>
                  Multi-role system with patient portal for booking, doctor schedules, and admin
                  management
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Timer className="h-3.5 w-3.5" />
              Worked for 15s
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ThumbsDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ClipboardCopy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* User reply */}
      <div className="flex items-start gap-3">
        <Avatar fallback="ME" className="mt-1" />
        <div className="max-w-[260px] rounded-3xl border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm">
          User roles yes
        </div>
      </div>

      {/* Assistant follow-up */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground/80" />
          Thought for 7s
        </div>
        <p className="text-sm leading-6 text-foreground">
          Perfect! I&apos;ll build you a comprehensive clinic management system with multiple user
          roles. Let me start by checking your current setup and generating a design direction.
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          {checkpoints.slice(0, 3).map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {item}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground/80" />
          Thought for 10s
        </div>
        <p className="text-sm leading-6 text-foreground">
          Perfect! I can see the design inspiration. I&apos;ll build a professional clinic management
          system with a clean, healthcare-focused design inspired by the Junction interface. Let me
          set up the database integration and create a structured plan.
        </p>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs">
              ⚡
            </div>
            Install Supabase
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-9 rounded-full px-5">
              Install
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            {checkpoints[3]}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Timer className="h-3.5 w-3.5" />
            Worked for 34s
          </div>
        </div>
      </div>
    </div>
  );
}
