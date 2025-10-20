import type { ChatCompletion } from "openai/resources/chat/completions";

import { type GeneratorState } from "../state/generator-state.js";
import { getDeepSeekClient } from "./deepseek-client.js";
import { logger } from "./logger.js";

interface TemplateOptions {
  prompt: string;
}

export async function buildComponentFromPrompt({
  prompt,
}: TemplateOptions): Promise<
  Pick<GeneratorState, "componentCode" | "currentStep">
> {
  const trimmedPrompt = prompt.trim();
  const title = toTitleCase(trimmedPrompt.split("\n")[0] ?? trimmedPrompt);

  const llmComponent = await generateWithDeepSeek(trimmedPrompt);
  const componentCode =
    llmComponent ?? buildFallbackComponentCode({ prompt: trimmedPrompt, title });

  return {
    componentCode,
    currentStep: "preview",
  };
}

async function generateWithDeepSeek(prompt: string): Promise<string | null> {
  const client = getDeepSeekClient();
  if (!client) {
    return null;
  }

  try {
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    const temperature = Number.parseFloat(
      process.env.DEEPSEEK_TEMPERATURE || "0.4"
    );

    const completion = await client.chat.completions.create({
      model,
      temperature: Number.isNaN(temperature) ? 0.4 : temperature,
      messages: [
        {
          role: "system",
          content:
            "You are a senior front-end engineer. Produce a single HTML snippet styled with Tailwind CSS utility classes, no <html> or <head> tag, suitable for embedding in an iframe.",
        },
        {
          role: "user",
          content: `Create a polished UI preview for the following product idea. Highlight key views, user actions, and any relevant states. Use concise copy.\n\nBrief:\n${prompt}\n\nReturn only HTML markup.`,
        },
      ],
    });

    const html = extractHtmlFromCompletion(completion);
    return html ? sanitizeHtml(html) : null;
  } catch (error) {
    logger.error("DeepSeek generation failed", { error });
    return null;
  }
}

function extractHtmlFromCompletion(completion: ChatCompletion): string | null {
  const choice = completion.choices?.[0];
  if (!choice) {
    return null;
  }

  const content = choice.message?.content;
  if (!content) {
    return null;
  }

  if (typeof content === "string") {
    return content;
  }

  const contentValue = content as unknown;

  if (Array.isArray(contentValue)) {
    return contentValue
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (typeof item === "object" && item !== null) {
          const maybeText = (item as { text?: unknown }).text;
          if (typeof maybeText === "string") {
            return maybeText;
          }
        }

        return "";
      })
      .join("\n");
  }

  return null;
}

function sanitizeHtml(markup: string): string {
  return markup
    .replace(/```(\w+)?/g, "")
    .replace(/<\/?body>/g, "")
    .replace(/<\/?html>/g, "")
    .trim();
}

function buildFallbackComponentCode({
  prompt,
  title,
}: {
  prompt: string;
  title: string;
}): string {
  return `<div class="min-h-screen bg-slate-950 text-slate-50">
  <header class="border-b border-slate-800 px-6 py-5">
    <h1 class="text-2xl font-semibold">${escapeHtml(title)}</h1>
    <p class="mt-1 text-sm text-slate-400">Generated automatically from your brief.</p>
  </header>

  <main class="grid gap-6 p-6 sm:grid-cols-2">
    <section class="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-900/40">
      <h2 class="text-lg font-medium text-slate-100">Summary</h2>
      <p class="text-sm leading-6 text-slate-300">This starter layout reflects the key elements requested for "${escapeHtml(
        prompt
      )}".</p>
      <ul class="space-y-2 text-sm text-slate-300">
        <li class="flex items-start gap-2">
          <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Refine the copy in-place once the structure looks right.
        </li>
        <li class="flex items-start gap-2">
          <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Replace placeholder components with shadcn/ui blocks as needed.
        </li>
      </ul>
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 class="text-lg font-medium text-slate-100">Next Steps</h2>
      <ol class="mt-4 space-y-3 text-sm text-slate-300">
        <li class="flex gap-3">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">1</span>
          Add interaction details (click targets, keyboard shortcuts, etc.).
        </li>
        <li class="flex gap-3">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">2</span>
          Request Tailwind refinements or alternative layouts from the agent.
        </li>
        <li class="flex gap-3">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">3</span>
          Approve once you are satisfied with the preview.
        </li>
      </ol>
    </section>
  </main>
</div>`;
}

function toTitleCase(text: string): string {
  return text
    .split(/[\s_-]+/)
    .map((word) =>
      word.length > 0 ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : ""
    )
    .join(" ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
