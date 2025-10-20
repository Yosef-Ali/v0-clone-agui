import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  ExperimentalEmptyAdapter,
} from "@copilotkit/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CopilotKit API route
 *
 * This handles the CopilotKit protocol. Component generation is done via
 * the custom "generate_component" action (useCopilotAction) in chat-interface.tsx
 * which calls the backend directly at http://localhost:8000
 */

const copilotRuntime = new CopilotRuntime();

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime: copilotRuntime,
  serviceAdapter: new ExperimentalEmptyAdapter(),
  endpoint: "/api/copilotkit",
});

export async function POST(req: NextRequest) {
  return handleRequest(req);
}
