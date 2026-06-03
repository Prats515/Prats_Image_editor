/**
 * POST /api/inpaint
 *
 * TEMPORARILY DISABLED - Build was failing due to missing inpaintImage function
 * This endpoint is placeholder for future inpainting support via CometAPI
 * 
 * The main image generation feature is working via /api/generate
 * Inpainting can be added later using CometAPI's inpainting capabilities
 */

export async function POST(): Promise<Response> {
  return new Response(JSON.stringify({
    error: "inpaint_not_implemented",
    message: "Inpainting feature is not yet available. Please use the generate endpoint to create new images.",
    retryable: false,
  }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
