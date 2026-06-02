/**
 * lib/r2.ts
 * Server-side typed helpers for Cloudflare R2 (S3-compatible) storage.
 * All functions are server-only — never import this file from client components.
 *
 * Retry policy (per design document):
 *   putObject      — retries once after 500 ms on failure, then throws
 *   getObject      — returns null on 404 / NoSuchKey; throws on other errors; no retry
 *   deleteObject   — throws on failure (no retry)
 *   listObjects    — throws on failure (no retry)
 *   generateSignedUrl — throws on failure (no retry)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Client initialisation
// ---------------------------------------------------------------------------

function createR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 configuration is incomplete. Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are set."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME environment variable is not set.");
  }
  return bucket;
}

// Lazily-created singleton client (avoids re-creating on every call in the
// same server process while still supporting environment-variable overrides
// in tests).
let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = createR2Client();
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convert an async-iterable stream body (AWS SDK SdkStream) to a Buffer. */
async function streamToBuffer(body: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload an object to R2.
 * Retries once after 500 ms on failure.
 */
export async function putObject(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<void> {
  const client = getClient();
  const bucket = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  try {
    await client.send(command);
  } catch (firstError) {
    // Retry once after 500 ms
    await sleep(500);
    try {
      await client.send(command);
    } catch (secondError) {
      throw secondError;
    }
  }
}

/**
 * Download an object from R2 as a Buffer.
 * Returns null if the object does not exist (404 / NoSuchKey).
 * Throws on any other error. No retry.
 */
export async function getObject(key: string): Promise<Buffer | null> {
  const client = getClient();
  const bucket = getBucketName();

  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );

    if (!response.Body) {
      return null;
    }

    // The AWS SDK decorates the Body with SdkStreamMixin which is async-iterable.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await streamToBuffer(response.Body as any);
  } catch (error: unknown) {
    // Treat 404 / NoSuchKey as a "not found" result — not an error.
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (
      err.name === "NoSuchKey" ||
      err.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Delete an object from R2.
 * Throws on failure. No retry.
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  const bucket = getBucketName();

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * List all object keys under a given prefix.
 * Handles pagination automatically.
 * Returns an array of object key strings.
 * Throws on failure. No retry.
 */
export async function listObjects(prefix: string): Promise<string[]> {
  const client = getClient();
  const bucket = getBucketName();

  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of response.Contents ?? []) {
      if (obj.Key) {
        keys.push(obj.Key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

/**
 * Generate a pre-signed GET URL for an R2 object.
 * @param key              R2 object key
 * @param expiresInSeconds URL expiry duration in seconds
 * @returns Signed HTTPS URL string
 */
export async function generateSignedUrl(
  key: string,
  expiresInSeconds: number
): Promise<string> {
  const client = getClient();
  const bucket = getBucketName();

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
