export function extractLatestUserPrompt(
  messages:
    | Array<
        | {
            role: string;
            content: string | Array<{ text?: string; content?: string }>;
          }
        | undefined
      >
    | undefined
): string {
  if (!messages || messages.length === 0) {
    return "UI concept";
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }

    if (message.role === "user" || message.role === "human") {
      const content = message.content;
      if (typeof content === "string") {
        return content.trim() || "UI concept";
      }

      if (!Array.isArray(content)) {
        continue;
      }

      const textPart = content.find(
        (part) => typeof part?.text === "string" || typeof part?.content === "string"
      );

      if (textPart) {
        const text =
          (textPart.text as string | undefined) ??
          (textPart.content as string | undefined);
        if (typeof text === "string") {
          return text.trim() || "UI concept";
        }
      }
    }
  }

  return "UI concept";
}
