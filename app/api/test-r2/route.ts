/**
 * app/api/test-r2/route.ts
 * Quick test endpoint to verify R2 connectivity
 */

export async function GET() {
  try {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    const envStatus = {
      hasAccountId: !!accountId,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
      hasBucketName: !!bucketName,
      accountId: accountId ? "set" : "MISSING",
      accessKeyId: accessKeyId ? "set" : "MISSING",
      secretAccessKey: secretAccessKey ? `${secretAccessKey.substring(0, 10)}...` : "MISSING",
      bucketName: bucketName || "MISSING",
    };

    // Try to create S3 client
    let clientStatus = "error";
    let clientError = "";

    try {
      const { S3Client } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: accessKeyId || "",
          secretAccessKey: secretAccessKey || "",
        },
      });
      clientStatus = "created";
    } catch (err) {
      clientError = err instanceof Error ? err.message : String(err);
    }

    return new Response(
      JSON.stringify({
        status: "test",
        env: envStatus,
        client: { status: clientStatus, error: clientError },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
