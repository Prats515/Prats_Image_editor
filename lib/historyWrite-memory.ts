/**
 * lib/historyWrite-memory.ts
 * In-memory history storage for testing (bypasses R2)
 */

import type { HistoryEntry, StyleDNA } from "./types";
import { generateThumbnail } from "./thumbnail";

const historyStore = new Map<string, HistoryEntry[]>();

export interface WriteHistoryEntryInput {
  sessionId: string;
  finalPrompt: string;
  casualPrompt: string;
  mode: "fast" | "quality";
  imagePng: Buffer;
  styleDNA: StyleDNA;
  isInpainted?: boolean;
  parentEntryId?: string | null;
}

export interface WriteHistoryEntryResult {
  historyEntryId: string;
  imageUrl: string;
  styleDNA: StyleDNA;
}

export async function writeHistoryEntry(
  input: WriteHistoryEntryInput
): Promise<WriteHistoryEntryResult> {
  const entryId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Generate thumbnail
  const thumbnailPng = await generateThumbnail(input.imagePng);

  // Create history entry
  const entry: HistoryEntry = {
    id: entryId,
    sessionId: input.sessionId,
    casualPrompt: input.casualPrompt,
    enhancedPrompt: input.finalPrompt,
    mode: input.mode,
    styleDNA: input.styleDNA,
    imageKey: `memory://${entryId}`,
    thumbnailKey: `memory://${entryId}-thumb`,
    imageUrl: `data:image/png;base64,${input.imagePng.toString("base64")}`,
    thumbnailUrl: `data:image/jpeg;base64,${thumbnailPng.toString("base64")}`,
    createdAt: now,
    isInpainted: input.isInpainted ?? false,
    parentEntryId: input.parentEntryId ?? null,
  };

  // Store in memory
  if (!historyStore.has(input.sessionId)) {
    historyStore.set(input.sessionId, []);
  }
  const entries = historyStore.get(input.sessionId)!;
  entries.unshift(entry);

  // Enforce 50-entry cap
  if (entries.length > 50) {
    entries.splice(50);
  }

  return {
    historyEntryId: entryId,
    imageUrl: entry.imageUrl,
    styleDNA: input.styleDNA,
  };
}

export async function loadHistoryForSession(
  sessionId: string
): Promise<HistoryEntry[]> {
  return historyStore.get(sessionId) ?? [];
}
