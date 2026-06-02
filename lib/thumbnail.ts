/**
 * Server-side thumbnail generation using `sharp`.
 * Resizes a PNG image buffer to a 160×160 JPEG thumbnail.
 *
 * Requirements: 7.3
 */
import sharp from "sharp";

/**
 * Resizes a PNG image buffer to a 160×160 JPEG thumbnail.
 *
 * @param pngBuffer - Raw PNG image data as a Node.js Buffer
 * @returns A Buffer containing the 160×160 JPEG thumbnail at quality 80
 */
export async function generateThumbnail(pngBuffer: Buffer): Promise<Buffer> {
  const result = await sharp(pngBuffer)
    .resize(160, 160, {
      fit: "cover", // crop to fill — no distortion, no letterboxing
      position: "center",
    })
    .jpeg({ quality: 80 })
    .toBuffer();

  return result;
}
