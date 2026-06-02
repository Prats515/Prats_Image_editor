/**
 * lib/historyWrite.ts
 *
 * Persists generated images and metadata to R2 and enforces the 50-entry cap.
 *
 * Requirements: 6.6, 6.8, 7.7
 */

import { deleteObject, generateSignedUrl, getObject, listObjects, putObject } from "./r2";
import { getSession, saveSession } from "./session";
import type { HistoryEntry, StyleDNA } from "./types";
import { generateThumbnail } from "./thumbnail";

const MAX_HISTORY_ENTRIES = 50;
const SIGNED_URL_TTL_SECONDS = 86_400;

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

function historyPrefix(sessionId: string, entryId: string): string {
  return `sessions/${sessionId}/history/${entryId}`;
}

function metadataKey(sessionId: string, entryId: string): string {
  return `${historyPrefix(sessionId, entryId)}/metadata.json`;
}

async function readMetadataEntry(
  sessionId: string,
  metadataObjectKey: string
): Promise<HistoryEntry | null> {
  const buffer = await getObject(metadataObjectKey);
  if (buffer === null) {
    return null;
  }
  try {
    return JSON.parse(buffer.toString("utf-8")) as HistoryEntry;
  } catch {
    return null;
  }
}

/**
 * When at capacity, delete the oldest history entry's R2 objects.
 */
async function evictOldestEntryIfNeeded(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (session === null || session.entryCount < MAX_HISTORY_ENTRIES) {
    return;
  }

  const prefix = `sessions/${sessionId}/history/`;
  const keys = await listObjects(prefix);
  const metadataKeys = keys.filter((k) => k.endsWith("/metadata.json"));

  const entries: HistoryEntry[] = [];
  for (const key of metadataKeys) {
    const entry = await readMetadataEntry(sessionId, key);
    if (entry !== null) {
      entries.push(entry);
    }
  }

  if (entries.length === 0) {
    return;
  }

  entries.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const oldest = entries[0];
  const base = historyPrefix(sessionId, oldest.id);

  await Promise.all([
    deleteObject(`${base}/image.png`),
    deleteObject(`${base}/thumbnail.jpg`),
    deleteObject(`${base}/metadata.json`),
  ]);

  const updatedSession = await getSession(sessionId);
  if (updatedSession !== null && updatedSession.entryCount > 0) {
    await saveSession({
      ...updatedSession,
      entryCount: updatedSession.entryCount - 1,
    });
  }
}

/**
 * Write a new history entry (image, thumbnail, metadata) and bump session count.
 */
export async function writeHistoryEntry(
  input: WriteHistoryEntryInput
): Promise<WriteHistoryEntryResult> {
  const {
    sessionId,
    finalPrompt,
    casualPrompt,
    mode,
    imagePng,
    styleDNA,
    isInpainted = false,
    parentEntryId = null,
  } = input;

  await evictOldestEntryIfNeeded(sessionId);

  const entryId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const base = historyPrefix(sessionId, entryId);
  const imageKey = `${base}/image.png`;
  const thumbnailKey = `${base}/thumbnail.jpg`;

  const thumbnailJpeg = await generateThumbnail(imagePng);

  const entryForStorage: Omit<HistoryEntry, "imageUrl"> & { imageUrl?: string } = {
    id: entryId,
    sessionId,
    createdAt,
    imageKey,
    thumbnailKey,
    casualPrompt,
    enhancedPrompt: finalPrompt,
    styleDNA,
    mode,
    isInpainted,
    parentEntryId,
  };

  await Promise.all([
    putObject(imageKey, imagePng, "image/png"),
    putObject(thumbnailKey, thumbnailJpeg, "image/jpeg"),
    putObject(
      metadataKey(sessionId, entryId),
      JSON.stringify(entryForStorage),
      "application/json"
    ),
  ]);

  const session = await getSession(sessionId);
  if (session !== null) {
    await saveSession({
      ...session,
      entryCount: session.entryCount + 1,
      lastActiveAt: new Date().toISOString(),
    });
  }

  const imageUrl = await generateSignedUrl(imageKey, SIGNED_URL_TTL_SECONDS);

  return {
    historyEntryId: entryId,
    imageUrl,
    styleDNA,
  };
}


/**
 * Load all history entries for a session from R2.
 */
export async function loadHistoryForSession(
  sessionId: string
): Promise<HistoryEntry[]> {
  const prefix = `sessions/${sessionId}/history/`;
  const keys = await listObjects(prefix);
  const metadataKeys = keys.filter((k) => k.endsWith("/metadata.json"));

  const entries: HistoryEntry[] = [];
  for (const key of metadataKeys) {
    const entry = await readMetadataEntry(sessionId, key);
    if (entry !== null) {
      entries.push(entry);
    }
  }

  // Sort by creation date, newest first
  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return entries;
}
