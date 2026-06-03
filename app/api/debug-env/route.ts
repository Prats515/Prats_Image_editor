/**
 * GET /api/debug-env
 * 
 * TEMPORARY DEBUG ENDPOINT - Shows which environment variables are configured
 * Remove this after diagnosis
 */

export async function GET(): Promise<Response> {
  const envVars = {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? "✅ Set" : "❌ Missing",
    COMETAPI_KEY: process.env.COMETAPI_KEY ? "✅ Set" : "❌ Missing",
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ? "✅ Set" : "❌ Missing",
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? "✅ Set" : "❌ Missing",
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? "✅ Set" : "❌ Missing",
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ? "✅ Set" : "❌ Missing",
  };

  return new Response(JSON.stringify(envVars, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
