# Smart AI Image Editor

**Describe what you want. AI handles the complexity. Generate beautiful images with minimal effort.**

- **Input**: "Make the sky more vibrant"
- **Processing**: Intent analysis → clarifying questions → prompt enhancement
- **Output**: High-quality edited image

No complex prompting. No trial-and-error. Just natural language.

---

## Quick Start

### Prerequisites
- Node.js 18+ ([get it](https://nodejs.org))
- Free API accounts:
  - [Groq](https://console.groq.com/keys) (LLM for clarify/enhance)
  - [CometAPI](https://www.cometapi.com) (image generation - 500+ models, free tier)
  - [Cloudflare](https://dash.cloudflare.com) (R2 storage for images & sessions)

### Local Setup (2 min)

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and add your free API keys:
```
GROQ_API_KEY=your_groq_key_here
COMETAPI_KEY=your_cometapi_key_here
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
```

### Run It

```bash
npm run dev
# Opens http://localhost:3000/editor
```

---

## How to Use

1. **Enter prompt**: "Make this image brighter"
2. **Answer questions**: AI asks 2-3 clarifying yes/no questions
3. **Review enhanced prompt**: See what AI will send to image generator
4. **Generate**: Click "Generate" to create the image
5. **Edit specific areas**: Use the inpainting tool to modify only parts of the image
6. **View history**: Sidebar shows all your past edits

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Frontend** | Next.js 15 + React 19 | Minimal, clean, fast |
| **API** | Next.js routes (serverless) | No separate backend |
| **LLM** | Groq (Llama 3.3 70B) | Free, very fast (~0.5s) |
| **Image Gen** | CometAPI (GPT Image 2, FLUX, Nano Banana) | Free tier, 500+ models, 20% cheaper than official APIs |
| **Storage** | Cloudflare R2 | Free tier, cost-effective, reliable |
| **Session** | R2 + cookie | Persists across refreshes |

**All free tier.** No paid APIs needed.

---

## Scripts

```bash
npm run dev         # Local dev server (port 3000)
npm run build       # Production build
npm run start       # Run production build locally
npm test            # Run validator tests
npm run test:watch  # Watch mode for tests
```

---

## Deployment

### Local Testing
See **LOCAL_SETUP.md** for detailed local dev instructions.

### Production (Vercel — recommended)
See **DEPLOYMENT.md** for step-by-step Vercel deployment.

**TL;DR:**
1. Push code to GitHub (already done)
2. Connect repo to Vercel
3. Set environment variables
4. Deploy (Vercel does it automatically)

---

## API Routes (Developers)

All endpoints are JSON. Require session ID.

```
POST /api/session      → Create/restore session
POST /api/analyze      → Analyze user intent
POST /api/clarify      → Generate clarifying questions
POST /api/enhance      → Enhance prompt with style
POST /api/generate     → Generate or remix image
POST /api/inpaint      → Edit with mask
GET  /api/history      → Load edit history
```

See **DEPLOYMENT.md** for full API docs + curl examples.

---

## Testing

Run the test checklist: **TEST_CHECKLIST.md**

Covers:
- API route verification
- Frontend rendering
- Full workflow (analyze → clarify → enhance → review → generate)
- Error handling
- Performance

---

## Documentation

- **LOCAL_SETUP.md** — How to set up and run locally
- **DEPLOYMENT.md** — How to deploy to Vercel + API reference
- **TEST_CHECKLIST.md** — Local testing procedures
- **.kiro/specs/** — Full architecture, design, and requirements

---

## Status

✅ **Fully operational and tested**

- All image generation working via CometAPI
- Full feature set implemented and tested
- Builds successfully
- R2 storage verified working
- Session management confirmed
- Documentation complete and up-to-date
- Successfully deployed locally and tested end-to-end

---

## Common Issues

| Problem | Solution |
|---------|----------|
| "API key invalid" | Check `.env.local` matches your dashboard (Groq, CometAPI, Cloudflare) |
| "Image generation failed" | Verify COMETAPI_KEY is valid at https://www.cometapi.com/ |
| "R2 storage error" | Check R2 credentials: Account ID, Access Key, Secret Key, Bucket name |
| "File too large" | Compress image (< 5MB) before upload |
| "Session expired" | Refresh page; new session auto-created |
| Build fails | Run `npm install` again, check Node version (18+) |

---

## Cost

**Completely free** while on free tier APIs:

- **Groq**: 30 requests/minute (enough for 100k+ users/month)
- **CometAPI**: Free tier with included credits, no credit card required
- **R2**: 10GB storage + 1 million API calls/month

If you exceed: ~$2-5/month total for all services combined.

---

## Next Steps

1. **Test locally**: `npm run dev` + visit http://localhost:3000/editor
2. **Run checklist**: Follow TEST_CHECKLIST.md
3. **Deploy**: Follow DEPLOYMENT.md to go live on Vercel
4. **Gather feedback**: Share with friends/users

---

## Support

- **Groq issues**: https://console.groq.com
- **Cloudflare issues**: https://dash.cloudflare.com
- **Vercel issues**: https://vercel.com/dashboard
- **Next.js docs**: https://nextjs.org/docs

---

**Repository**: https://github.com/Prats515/Prats_Image_editor

**License**: MIT
