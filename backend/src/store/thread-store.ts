import { randomUUID } from "node:crypto";

import { initialGeneratorState } from "../state/generator-state.js";
import { type ThreadRecord, type ThreadValues, type ThreadMetadata } from "../types/langgraph.js";

function createDefaultValues(): ThreadValues {
  return {
    ...initialGeneratorState,
    steps: Object.fromEntries(
      Object.entries(initialGeneratorState.steps).map(([id, step]) => [
        id,
        { ...step },
      ])
    ),
    logs: [],
    artifacts: [],
  };
}

function now(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class ThreadStore {
  private readonly threads = new Map<string, ThreadRecord>();
  private readonly history = new Map<
    string,
    Array<{
      checkpoint: { checkpoint_id: string; checkpoint_ns?: string } | null;
      parent_checkpoint: { checkpoint_id: string; checkpoint_ns?: string } | null;
      values: ThreadValues;
      metadata: ThreadMetadata;
      created_at: string;
    }>
  >();

  createThread(params?: {
    threadId?: string;
    metadata?: Record<string, unknown>;
  }): ThreadRecord {
    const threadId = params?.threadId ?? randomUUID();

    if (this.threads.has(threadId)) {
      return this.threads.get(threadId)!;
    }

    const metadata: ThreadMetadata = {
      writes: {},
      ...(params?.metadata ?? {}),
    };

    const record: ThreadRecord = {
      threadId,
      metadata,
      values: createDefaultValues(),
      status: "idle",
      createdAt: now(),
      updatedAt: now(),
    };

    this.threads.set(threadId, record);
    this.history.set(threadId, []);
    return record;
  }

  getThread(threadId: string): ThreadRecord {
    const record = this.threads.get(threadId);
    if (!record) {
      throw new Error(`Thread ${threadId} not found`);
    }
    return record;
  }

  updateMetadata(threadId: string, metadata: Record<string, unknown>): ThreadRecord {
    const thread = this.getThread(threadId);
    thread.metadata = {
      ...thread.metadata,
      ...metadata,
    };
    thread.updatedAt = now();
    return thread;
  }

  updateValues(
    threadId: string,
    values: Partial<ThreadValues>
  ): ThreadRecord {
    const thread = this.getThread(threadId);
    thread.values = {
      ...thread.values,
      ...values,
    };
    thread.updatedAt = now();
    return thread;
  }

  setStatus(threadId: string, status: ThreadRecord["status"]): ThreadRecord {
    const thread = this.getThread(threadId);
    thread.status = status;
    thread.updatedAt = now();
    return thread;
  }

  setCheckpoint(threadId: string, checkpointId?: string): ThreadRecord {
    const thread = this.getThread(threadId);
    thread.checkpoint = checkpointId
      ? { checkpoint_id: checkpointId }
      : undefined;
    thread.updatedAt = now();
    return thread;
  }

  getHistorySnapshot(threadId: string) {
    const thread = this.getThread(threadId);
    const entries = this.history.get(threadId) ?? [];
    if (entries.length > 0) {
      return entries.map((entry) => ({
        checkpoint: entry.checkpoint,
        parent_checkpoint: entry.parent_checkpoint,
        values: clone(entry.values),
        metadata: clone(entry.metadata),
        created_at: entry.created_at,
      }));
    }

    const checkpoint =
      thread.checkpoint ??
      ({ checkpoint_id: `${thread.threadId}-checkpoint`, checkpoint_ns: "inmemory" } as const);

    return [
      {
        checkpoint,
        parent_checkpoint: null,
        values: clone(thread.values),
        metadata: clone(thread.metadata),
        created_at: thread.updatedAt,
      },
    ];
  }

  recordHistory(threadId: string, checkpointId: string): void {
    const thread = this.getThread(threadId);
    const entries = this.history.get(threadId);
    if (!entries) {
      return;
    }

    const parent = entries.at(-1)?.checkpoint ?? null;

    entries.push({
      checkpoint: { checkpoint_id: checkpointId, checkpoint_ns: "inmemory" },
      parent_checkpoint: parent
        ? { checkpoint_id: parent.checkpoint_id, checkpoint_ns: parent.checkpoint_ns }
        : null,
      values: clone(thread.values),
      metadata: clone(thread.metadata),
      created_at: now(),
    });
  }
}

export const threadStore = new ThreadStore();
