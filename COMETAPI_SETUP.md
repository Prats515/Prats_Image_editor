# CometAPI Setup Guide

## Overview

The Prats Image Editor now uses **CometAPI** for image generation instead of Hugging Face Inference API. CometAPI is a unified platform that provides access to 500+ AI models with:

- ✅ **GPT Image 2** (OpenAI) - Best for complex layouts and text rendering
- ✅ **Nano Banana 2** (Google) - Best for speed and 4K output
- ✅ **FLUX models** (Black Forest Labs) - Best for photorealism
- ✅ **500+ additional models** (Stable Diffusion, etc.)
- ✅ **FREE API key** with included credits
- ✅ **20% cheaper** than official APIs
- ✅ **Single unified endpoint** for all models

---

## Step 1: Get a Free CometAPI Key

1. Visit: **https://www.cometapi.com/**
2. Click **"Start Free"** (no credit card required)
3. Sign up with email or GitHub
4. Get your **API key** from the dashboard
5. You'll receive **free test credits** automatically

---

## Step 2: Add Your API Key to `.env.local`

Edit ``.env.local`` and add your CometAPI key:

```dotenv
# CometAPI - Unified Image Generation API
COMETAPI_KEY=your-api-key-here
```

Replace `your-api-key-here` with your actual CometAPI key.

---

## Step 3: Restart the Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

The dev server will automatically load your new API key from `.env.local`.

---

## Step 4: Test Image Generation

1. Go to **http://localhost:3000/editor**
2. Enter a prompt (e.g., "a beautiful sunset over mountains")
3. Click "Continue" → answer clarification questions
4. Click "Approve & Generate"
5. Your image should generate within 5-30 seconds

---

## API Comparison

| Model | Speed | Quality | Best For | Mode |
|-------|-------|---------|----------|------|
| GPT Image 2 | Medium | Excellent | Complex layouts, text | `quality` |
| GPT Image 2 Mini | Very Fast | Good | Quick previews | `fast` |
| Nano Banana 2 | Lightning | Good | Speed, 4K output | `fast` |
| FLUX Pro | Slow | Best | Photorealism | `quality` |
| FLUX Schnell | Fast | Good | Fast photorealism | `fast` |

Current configuration:
- **Fast mode**: `gpt-image-2-mini` (speed optimized)
- **Quality mode**: `gpt-image-2` (accuracy optimized)

---

## Environment Variables

### Local Development (`.env.local`)

```dotenv
# Required
COMETAPI_KEY=your-free-api-key

# Other required variables
GROQ_API_KEY=your-groq-key
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=prats-image-editor
```

### Production (Vercel)

Add `COMETAPI_KEY` to your Vercel project environment variables:

1. Go to **Vercel Dashboard** → Your Project
2. Settings → Environment Variables
3. Add:
   - **Name**: `COMETAPI_KEY`
   - **Value**: Your CometAPI key
   - **Environments**: Production, Preview, Development
4. Click "Save" and redeploy

---

## Pricing & Free Tier

### CometAPI Free Tier

- **Free API key**: ✅ Yes
- **Free test credits**: ✅ Included (~$5-10 worth)
- **Rate limits**: Depends on your plan
- **Commercial use**: ✅ Yes (with Free plan)

### Per-Image Costs (After free credits)

| Model | Cost |
|-------|------|
| GPT Image 2 | ~$0.02-0.05 |
| Nano Banana 2 | ~$0.01-0.02 |
| FLUX variants | ~$0.01-0.05 |
| **Average via CometAPI** | **~$0.015** (20% cheaper than direct) |

---

## Troubleshooting

### Error: "COMETAPI_KEY is not set"

**Solution**: Make sure you added the key to `.env.local` and restarted the dev server.

```bash
# Verify the key is set
echo $env:COMETAPI_KEY  # Windows PowerShell
echo $COMETAPI_KEY      # Mac/Linux
```

### Error: "CometAPI returned 401"

**Solution**: Your API key is invalid or expired. Get a new one from https://www.cometapi.com/console/

### Error: "Image generation failed. Please try again."

**Possible causes**:
1. Out of free credits → Upgrade or wait for monthly reset
2. Invalid prompt → Try a simpler prompt
3. API temporarily down → Try again in a few minutes

Check status at: https://status.cometapi.com/status/models

### Images taking too long?

**Solution**: Use `fast` mode instead of `quality` mode for faster generation.

---

## Switching Between Models

To use a different model, edit `lib/imageGeneration.ts`:

```typescript
function mapModeToModel(mode: GenerationMode): string {
  return mode === "fast" 
    ? "nano-banana-2"           // Change to this for fast
    : "flux-2-pro";             // Or this for quality
}
```

Available model keys via CometAPI:
- `gpt-image-2` / `gpt-image-2-mini`
- `nano-banana-2`
- `flux-1-pro` / `flux-1-schnell`
- `flux-2-pro` / `flux-2-schnell`
- `stable-diffusion-3`
- And 490+ more...

---

## Additional Resources

- **CometAPI Docs**: https://apidoc.cometapi.com/
- **Models & Pricing**: https://www.cometapi.com/models/
- **Dashboard**: https://www.cometapi.com/console/
- **Status Page**: https://status.cometapi.com/

---

## Next Steps

1. ✅ Get free API key from CometAPI
2. ✅ Add `COMETAPI_KEY` to `.env.local`
3. ✅ Restart dev server
4. ✅ Test image generation at http://localhost:3000/editor
5. ✅ Deploy to Vercel (add env var to dashboard)

---

## FAQ

**Q: Is CometAPI free forever?**  
A: The free tier is always available. You get test credits each month with the Free plan. For production scale, you can upgrade to a paid plan starting at ~$10/month.

**Q: Can I use multiple models?**  
A: Yes! CometAPI supports 500+ models. You can switch models by changing the model key in `lib/imageGeneration.ts`.

**Q: What if CometAPI goes down?**  
A: CometAPI is backed by enterprise infrastructure. If needed, you can quickly switch to another provider by changing the API endpoint in `lib/imageGeneration.ts`.

**Q: Do I need to change anything else?**  
A: No! The migration is transparent. All existing code, routes, and features work exactly the same.

