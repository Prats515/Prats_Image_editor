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
  - [Groq](https://console.groq.com/keys) (LLM)
  - [Cloudflare](https://dash.cloudflare.com) (image generation + storage)

### Local Setup (2 min)

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and add your free API keys:
```
GROQ_API_KEY=your_groq_key
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
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
| **Frontend** | Next.js 14 + React 18 | Minimal, clean, fast |
| **API** | Next.js routes (serverless) | No separate backend |
| **LLM** | Groq (Llama 3.3 70B) | Free, very fast (~0.5s) |
| **Image Gen** | Cloudflare Workers AI (FLUX.1) | Free, high quality |
| **Storage** | Cloudflare R2 | Free, same region as compute |
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

✅ **Ready to test and deploy**

- All 73 implementation tasks complete
- Full feature set implemented
- Builds successfully
- Property-based tests included
- Documentation complete

---

## Common Issues

| Problem | Solution |
|---------|----------|
| "API key invalid" | Check `.env.local` matches your dashboard |
| "File too large" | Compress image (< 5MB) before upload |
| "Session expired" | Refresh page; new session auto-created |
| Build fails | Run `npm install` again, check Node version |

---

## Cost

**Completely free** while on free tier APIs:

- **Groq**: 30 requests/minute (enough for 100k+ users/month)
- **Cloudflare Workers AI**: 10,000 requests/day
- **R2**: 10GB + 1 million API calls/month

If you exceed: ~$5-10/month total for all services combined.

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
