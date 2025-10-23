/**
 * State Diff Utility
 *
 * Computes delta updates for LangGraph state to reduce SSE payload size
 * Uses JSON Patch (RFC 6902) format for efficient state updates
 */

import { diff, type Operation } from "just-diff";

export interface StateDelta {
  operations: Operation[];
  hasChanges: boolean;
  originalSize: number;
  deltaSize: number;
  compressionRatio: number;
}

/**
 * Compute the difference between two states
 */
export function computeStateDelta(
  previousState: any,
  currentState: any
): StateDelta {
  // Compute JSON Patch operations
  const operations = diff(previousState, currentState);

  // Calculate sizes
  const originalSize = JSON.stringify(currentState).length;
  const deltaSize = JSON.stringify(operations).length;
  const compressionRatio = deltaSize / originalSize;

  return {
    operations,
    hasChanges: operations.length > 0,
    originalSize,
    deltaSize,
    compressionRatio,
  };
}

/**
 * Apply a delta to a state object
 */
export function applyStateDelta(state: any, operations: Operation[]): any {
  // Import just-diff-apply dynamically since it's not always needed
  const { apply } = require("just-diff-apply");

  // Deep clone to avoid mutations
  const newState = JSON.parse(JSON.stringify(state));

  // Apply operations
  apply(newState, operations);

  return newState;
}

/**
 * Smart delta computation with optimization for specific fields
 */
export function computeSmartDelta(
  previousState: any,
  currentState: any,
  options: {
    alwaysInclude?: string[];  // Fields to always send full value
    ignoreFields?: string[];    // Fields to skip
    maxDeltaSize?: number;      // If delta is larger, send full state
  } = {}
): StateDelta | { fullState: any } {
  const { alwaysInclude = [], ignoreFields = [], maxDeltaSize = 10000 } = options;

  // Filter out ignored fields
  const filteredPrevious = filterFields(previousState, ignoreFields);
  const filteredCurrent = filterFields(currentState, ignoreFields);

  // Compute delta
  const delta = computeStateDelta(filteredPrevious, filteredCurrent);

  // If delta is too large, send full state instead
  if (delta.deltaSize > maxDeltaSize) {
    return { fullState: currentState };
  }

  // Add always-include fields as full replacements
  for (const field of alwaysInclude) {
    if (currentState[field] !== undefined) {
      delta.operations.push({
        op: "replace",
        path: `/${field}`,
        value: currentState[field],
      });
    }
  }

  return delta;
}

/**
 * Filter out specific fields from an object
 */
function filterFields(obj: any, fieldsToRemove: string[]): any {
  if (!obj || typeof obj !== "object") return obj;

  const filtered = { ...obj };
  for (const field of fieldsToRemove) {
    delete filtered[field];
  }
  return filtered;
}

/**
 * Optimize messages array specifically (common hot path)
 */
export function computeMessagesDelta(
  previousMessages: any[],
  currentMessages: any[]
): {
  type: "full" | "append" | "delta";
  data: any;
} {
  // If no previous messages, send full array
  if (!previousMessages || previousMessages.length === 0) {
    return { type: "full", data: currentMessages };
  }

  // If only appending new messages (common case)
  if (currentMessages.length > previousMessages.length) {
    const previousLength = previousMessages.length;
    const areAllPreviousSame = currentMessages
      .slice(0, previousLength)
      .every((msg, i) => JSON.stringify(msg) === JSON.stringify(previousMessages[i]));

    if (areAllPreviousSame) {
      return {
        type: "append",
        data: currentMessages.slice(previousLength),
      };
    }
  }

  // Otherwise compute full delta
  const operations = diff(previousMessages, currentMessages);
  return {
    type: "delta",
    data: operations,
  };
}

/**
 * Format delta for SSE streaming
 */
export function formatDeltaForSSE(delta: StateDelta): string {
  return JSON.stringify({
    type: "state-delta",
    operations: delta.operations,
    metadata: {
      compressionRatio: delta.compressionRatio.toFixed(2),
      deltaSize: delta.deltaSize,
      originalSize: delta.originalSize,
    },
  });
}
