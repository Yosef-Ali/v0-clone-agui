import http from "node:http";

import cors from "cors";
import express, { type Express } from "express";
import { randomUUID } from "node:crypto";

import { assistantRegistry } from "./assistants/index.js";
import { threadStore } from "./store/thread-store.js";
import { getEnvNumber } from "./utils/env.js";
import { logger } from "./utils/logger.js";
import { type ThreadRecord, type ThreadValues } from "./types/langgraph.js";

const DEFAULT_PORT = 8000;

export interface ServerHandle {
  app: Express;
  httpServer: http.Server;
}

function toThreadResponse(thread: ThreadRecord) {
  return {
    thread_id: thread.threadId,
    status: thread.status,
    metadata: thread.metadata,
    created_at: thread.createdAt,
    updated_at: thread.updatedAt,
  };
}

function toThreadStateResponse(thread: ThreadRecord) {
  return {
    thread_id: thread.threadId,
    values: thread.values,
    metadata: thread.metadata,
    checkpoint: thread.checkpoint,
  };
}

export async function startServer(): Promise<ServerHandle> {
  const app = express();
  const port = getEnvNumber("PORT", DEFAULT_PORT);

  app.set("port", port);
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/assistants/search", (req, res) => {
    const { graph_id: graphId } = req.body as { graph_id?: string };
    const assistants = assistantRegistry.search({ graphId });
    res.json(assistants);
  });

  app.get("/assistants/:assistantId", (req, res) => {
    try {
      const assistant = assistantRegistry.getByAssistantId(
        req.params.assistantId
      );
      res.json({
        ...assistant.summary,
        graph: assistant.graph,
      });
    } catch (error) {
      logger.error("Assistant lookup failed", { error });
      res.status(404).json({
        error: `Assistant ${req.params.assistantId} not found`,
      });
    }
  });

  app.get("/assistants/:assistantId/graph", (req, res) => {
    try {
      const assistant = assistantRegistry.getByAssistantId(
        req.params.assistantId
      );
      res.json(assistant.graph);
    } catch (error) {
      logger.error("Graph lookup failed", { error });
      res.status(404).json({
        error: `Assistant ${req.params.assistantId} not found`,
      });
    }
  });

  app.get("/assistants/:assistantId/schemas", (req, res) => {
    try {
      const assistant = assistantRegistry.getByAssistantId(
        req.params.assistantId
      );
      res.json(assistant.schemas);
    } catch (error) {
      logger.error("Schema lookup failed", { error });
      res.status(404).json({
        error: `Assistant ${req.params.assistantId} not found`,
      });
    }
  });

  app.post("/threads", (req, res) => {
    try {
      const { thread_id: threadId, metadata } = (req.body ??
        {}) as Record<string, unknown>;
      const thread = threadStore.createThread({
        threadId: typeof threadId === "string" ? threadId : undefined,
        metadata:
          typeof metadata === "object" && metadata !== null
            ? (metadata as Record<string, unknown>)
            : undefined,
      });

      res.json(toThreadResponse(thread));
    } catch (error) {
      logger.error("Failed to create thread", { error });
      res.status(500).json({ error: "Unable to create thread" });
    }
  });

  app.get("/threads/:threadId", (req, res) => {
    try {
      const thread = threadStore.getThread(req.params.threadId);
      res.json(toThreadResponse(thread));
    } catch (error) {
      res.status(404).json({ error: "Thread not found" });
    }
  });

  app.get("/threads/:threadId/state", (req, res) => {
    try {
      const thread = threadStore.getThread(req.params.threadId);
      res.json(toThreadStateResponse(thread));
    } catch (error) {
      res.status(404).json({ error: "Thread not found" });
    }
  });

  app.post("/threads/:threadId/state", (req, res) => {
    try {
      const threadId = req.params.threadId;
      const body = req.body as {
        values?: Record<string, unknown>;
        as_node?: string;
      };

      if (body.values && typeof body.values === "object") {
        threadStore.updateValues(threadId, body.values as Partial<ThreadRecord["values"]>);
      }

      if (body.as_node) {
        threadStore.setNext(threadId, [body.as_node]);
      }

      const checkpointId = randomUUID();
      threadStore.setCheckpoint(threadId, checkpointId);
      threadStore.recordHistory(threadId, checkpointId);

      res.json({
        checkpoint: { checkpoint_id: checkpointId },
      });
    } catch (error) {
      logger.error("Failed to update thread state", { error });
      res.status(500).json({ error: "Unable to update thread state" });
    }
  });

  app.post("/threads/:threadId/history", (req, res) => {
    try {
      const threadId = req.params.threadId;
      const history = threadStore.getHistorySnapshot(threadId);
      res.json(history);
    } catch (error) {
      logger.error("History lookup failed", { error, threadId: req.params.threadId });
      res.status(404).json({ error: "Thread not found" });
    }
  });

  app.post("/threads/:threadId/runs/stream", async (req, res) => {
    const threadId = req.params.threadId;
    const body = req.body as Record<string, unknown>;
    const assistantId = typeof body.assistant_id === "string"
      ? body.assistant_id
      : assistantRegistry.search()[0]?.assistant_id;

    if (!assistantId) {
      res.status(400).json({ error: "assistant_id is required" });
      return;
    }

    try {
      const assistant = assistantRegistry.getByAssistantId(assistantId);

      let thread: ThreadRecord;
      try {
        thread = threadStore.getThread(threadId);
      } catch {
        thread = threadStore.createThread({ threadId });
      }

      const runId = randomUUID();
      const input = (body.input ?? {}) as Record<string, unknown>;

      threadStore.setStatus(threadId, "running");

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const sendEvent = (event: string, payload: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      const emitState = (state: ThreadValues) => {
        threadStore.updateValues(threadId, state);
        sendEvent("values", state);
      };

      sendEvent("run-started", {
        runId,
        threadId,
      });

      try {
        const result = await assistant.run({
          thread,
          input,
          runId,
          emit: sendEvent,
          emitState,
        });

        threadStore.setStatus(threadId, "completed");
        const checkpointId = randomUUID();
        threadStore.setCheckpoint(threadId, checkpointId);
        threadStore.recordHistory(threadId, checkpointId);

        sendEvent("run-finished", {
          runId,
          summary: result.summary,
          completedStep: result.completedStep,
        });
        res.end();
      } catch (error) {
        logger.error("Run failed", { error, assistantId, threadId });
        const message = error instanceof Error ? error.message : String(error);
        sendEvent("error", { runId, message });
        threadStore.setStatus(threadId, "idle");
        res.end();
      }
    } catch (error) {
      logger.error("Run failed", { error, assistantId, threadId });
      if (!res.headersSent) {
        res.status(500).json({ error: "Run failed" });
      } else {
        res.end();
      }
    }
  });

  const httpServer = http.createServer(app);

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      logger.info(`HTTP server listening on port ${port}`);
      resolve();
    });
  });

  return { app, httpServer };
}
