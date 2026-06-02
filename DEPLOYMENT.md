# Deployment & Testing Guide

## Status
✅ **Spec Complete**: All 73 tasks done
- Backend: 7 API routes fully functional
- Frontend: Minimal React components (clean, focused UI)
- Libraries: All utilities implemented (validators, Groq, R2, session, styleDNA, etc.)
- Testing: Property-based tests for core logic

---

## Local Testing (Recommended First)

### Setup
```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your free API credentials
npm run dev
```

Visit `http://localhost:3000/editor`

**Test Flow:**
1. Type prompt: "Make the sky more vibrant"
2. Upload image (or use without for testing)
3. System analyzes intent → asks clarifying questions → enhances prompt → shows review → generates

---

## Production Deployment (Vercel — Free)

### Why Vercel?
- Next.js native support (zero config)
- Free tier covers this project perfectly
- Serverless functions (auto-scales)
- Built-in cron jobs (for session cleanup)
- Edge Network (global CDN)

### Deploy Steps

1. **Push to GitHub** (already done):
   ```bash
   git remote -v  # Verify origin is your GitHub repo
   ```

2. **Connect to Vercel**:
   - Go to https://vercel.com
   - Click "New Project"
   - Select your GitHub repo
   - Click "Import"

3. **Set Environment Variables** (in Vercel dashboard):
   - `GROQ_API_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `CRON_SECRET` (optional, random string for security)

4. **Deploy**:
   - Vercel auto-builds and deploys on every push
   - Your app lives at `https://<project-name>.vercel.app`

---

## API Documentation

All routes return JSON. Base URL: `http://localhost:3000/api` (local) or your Vercel domain.

### 1. Session Management
**POST /api/session**
- Creates or restores a session
- Returns: `{ sessionId: string }`
- Sets: `Session-ID` cookie

### 2. Analysis
**POST /api/analyze**
- Input: `{ prompt: string, image?: File }`
- Returns: `{ intent: IntentRecord, projectType: string }`

### 3. Clarification
**POST /api/clarify**
- Input: `{ intent: IntentRecord }`
- Returns: `{ questions: ClarifyingQuestion[] }`

### 4. Enhancement
**POST /api/enhance**
- Input: `{ prompt: string, answers: object, styleDNA?: StyleDNA }`
- Returns: `{ enhancedPrompt: string }`

### 5. Image Generation
**POST /api/generate**
- Input: `{ prompt: string, mode: "generate" | "remix" }`
- Returns: `{ imageUrl: string, edits: HistoryEntry[] }`

### 6. Inpainting
**POST /api/inpaint**
- Input: `{ prompt: string, mask: string (data URL), mode: "inpaint" }`
- Returns: `{ imageUrl: string, edits: HistoryEntry[] }`

### 7. History
**GET /api/history**
- Returns: `{ edits: HistoryEntry[] }` (with signed URLs)

### 8. Cron Cleanup (Vercel only)
**GET /api/cron/cleanup**
- Runs 1x/day on Vercel
- Deletes sessions older than 24h from R2
- Requires `CRON_SECRET` header

---

## Free API Quotas

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Groq** | 30 req/min | Llama 3.3 70B, very fast |
| **Cloudflare Workers AI** | 10k req/day | FLUX.1 image generation |
| **R2 Storage** | 10GB free + 1M PUT/GET/DELETE ops | Unlimited bandwidth |

### Cost Estimation
- **100 users/month** using 2-3 images each = well within free tier
- **If you exceed**: ~$5-10/month total for all services

---

## Monitoring & Debugging

### Local Logs
```bash
npm run dev
# Check terminal for real-time logs
```

### Vercel Logs
1. Go to Vercel dashboard
2. Click your project
3. View "Function Logs" tab (API routes) or "Build Logs"

### Test API Route Directly
```bash
curl -X POST http://localhost:3000/api/session
# Should return: { "sessionId": "..." }
```

---

## Frontend Structure (Minimal)

```
app/components/
├── PromptInput/          # Text input + file upload
├── ClarificationPanel/   # Question cards with yes/no
├── PromptReview/         # Shows enhanced prompt, can edit
├── ImageViewer/          # Displays generated/edited image
├── EditHistory/          # Sidebar with past edits
├── InpaintingTool/       # Brush canvas for mask drawing
└── shared/               # Loading, error, char counter
```

All components are **functional React** with **minimal state** — no complex UI libraries.

---

## Next Steps (Post-Launch)

1. **User Testing**: Get feedback on UX/clarity
2. **Style Refinement**: Tweak colors, fonts, spacing
3. **Mobile Optimization**: Responsive design for phones/tablets
4. **Advanced Features**: Batch processing, style transfer, upscaling
5. **Analytics**: Track which image types users edit most

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No credits" error | Check Groq/Cloudflare quotas in dashboards |
| "File too large" | Compress image before upload (< 5MB recommended) |
| Session lost | Refresh page; new session auto-created |
| Deployment fails | Check environment variables are set in Vercel |

---

## Support

- Groq Issues: https://console.groq.com (check status)
- Cloudflare Issues: https://dash.cloudflare.com (check account)
- Next.js Issues: https://nextjs.org/docs

---

**Ready to launch.** Follow the Vercel deploy steps above to go live.
