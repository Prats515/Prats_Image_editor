# Smart AI Image Editor

Describe image edits in plain English → AI enhances your prompt → generates images with style continuity and optional inpainting.

## Run locally on your laptop

### 1. Install dependencies (once)

```powershell
cd c:\Users\Admin\Desktop\Prats_Image_Editor
npm install
```

### 2. Add API keys

```powershell
copy .env.example .env.local
```

Edit `.env.local` and set:

| Variable | Where to get it |
|----------|-----------------|
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) (free tier) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar on any zone |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Workers AI Read |
| `R2_ACCOUNT_ID` | Same as Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | Same token creation flow |
| `R2_BUCKET_NAME` | Your R2 bucket name |

Without these keys the UI loads but image generation will fail.

### 3. Start the dev server

```powershell
npm run dev
```

### 4. Open in your browser

**http://localhost:3000**

You are redirected to **http://localhost:3000/editor** — that is the app.

## What you can try

1. Type a description (e.g. “A red sports car on a mountain road at sunset, cinematic”).
2. Click **Continue** → answer clarifying questions if asked.
3. Review the enhanced prompt → **Approve & Generate**.
4. Use **Edit a specific area** to paint a mask and change only part of an image.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server (port 3000) |
| `npm run build` | Production build |
| `npm test` | Run validator smoke tests |

## Repo

https://github.com/Prats515/Prats_Image_editor
