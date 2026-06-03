# Vercel Free Tier Timeout Limitation

## The Problem

**Vercel's free tier has a hard 10-second execution timeout** for serverless functions. This cannot be configured or bypassed with `maxDuration` in `vercel.json` (that only works on Pro tier).

Our CometAPI image generation takes 30-90 seconds depending on the mode (fast/quality), which exceeds this limit.

## What We Implemented

### 1. **Streaming Response Architecture** ✅
We implemented a streaming response in `/api/generate` that:
- Returns HTTP 200 immediately with chunked transfer encoding
- Streams progress updates as JSON lines (application/x-ndjson)
- Allows real-time progress feedback to the user

**Why it doesn't solve the Vercel issue:**
- The streaming response trick works for **browser requests**, but doesn't affect **server-side function execution timeout**
- Vercel still terminates the function after 10 seconds, even if we've sent the headers
- The backend crashes/timeouts before it can complete image generation

### 2. **Professional Prompt Enhancement** ✅
We implemented a 6-step creative direction system that:
- Analyzes user intent (subject, purpose, style, mood)
- Detects missing information
- Enhances composition, lighting, colors, materials, camera settings
- Adds technical quality specifications
- Returns structured response with improvements and suggestions

**Status:** ✅ WORKING on both local and Vercel

---

## Solutions for Long-Running Tasks on Vercel

### Option 1: Upgrade to Vercel Pro
- **Cost:** $20/month
- **Benefit:** Allows `maxDuration` up to 300 seconds (5 minutes)
- **Effort:** None - just upgrade account

### Option 2: Use External Task Queue
- Keep fast endpoints on Vercel (analyze, clarify, enhance)
- Send generation request to external service:
  - **Bull Queue** with Redis (requires separate server)
  - **Inngest** (serverless task queue, free tier available)
  - **AWS SQS + Lambda** (more complex setup)
  - **Firebase Cloud Tasks** (Google Cloud option)
  
- Frontend polls `/api/generate-status?jobId=xyz` for results
- **Effort:** High - requires backend restructuring

### Option 3: Use Edge Runtime + External API
- Move image generation to external API call that returns quickly
- Keep CometAPI but add polling/webhooks layer
- **Effort:** Medium - requires CometAPI webhook support (likely not available)

### Option 4: Use Vercel AI (Limited)
- Vercel's AI service has streaming support
- But limited to text generation, not image generation
- **Not applicable** for our use case

### Option 5: Switch Deployment Platform
- **Railway:** Free tier with 500 hours/month
- **Render:** Free tier with 750 hours/month  
- **Heroku:** No free tier anymore
- **DigitalOcean:** $4/month for small container
- **PythonAnywhere:** Python-focused
- **Replit:** Works but slower
- **Effort:** High - requires code adaptation to new platform

---

## Current Status

### ✅ Working Features
- Professional prompt enhancement (Groq-based, ~10 seconds)
- Session management and history
- R2 storage integration
- Prompt analysis and clarification

### ⚠️ Partially Working
- **Fast mode image generation** (~40 seconds)
  - Works locally ✅
  - Works on Vercel if it completes within 10s (unreliable)
  - Timeout errors on Vercel ❌

- **Quality mode image generation** (~90 seconds)  
  - Works locally ✅
  - Almost never completes on Vercel ❌

### 📊 Timeout Breakdown

| Component | Vercel Free Limit | Required Time | Status |
|-----------|-------------------|---------------|--------|
| Prompt Analysis | 10s | 2-3s | ✅ Works |
| Clarification | 10s | 1-2s | ✅ Works |
| Prompt Enhancement | 10s | 5-10s | ⚠️ Usually works |
| Fast Image Gen | 10s | 40-50s | ❌ Fails |
| Quality Image Gen | 10s | 80-90s | ❌ Fails |

---

## Architecture Diagram

### Current Implementation (Streaming)
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ POST /api/generate
       ▼
┌──────────────────────────────────┐
│  Vercel Function (10s timeout)   │
│                                  │
│  ┌──────────────────────────────┐│
│  │ Return headers (200 OK)      ││ ← Quick
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │ Generate image (40-90s)      ││ ← TIMEOUTS!
│  │ Stream responses             ││   (exceeds 10s)
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

### Recommended for Vercel Free (Task Queue)
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ POST /api/generate
       ▼
┌────────────────────────┐
│  Vercel Function (10s) │
│ 1. Validate request    │──┐
│ 2. Queue job           │  │ Quick!
│ 3. Return jobId        │  │
└────────────────────────┘  │
       │                    │
       │ Return { jobId }   │
       ▼                    │
    ┌─────┐                │
    │Poll │                │
    └─────┘                │
       │                   │
       │ Async task queue  │
       ├──────────────────→┼─────────────────────┐
       │                   │                     ▼
       │                   │            ┌────────────────────┐
       │                   │            │ Worker / External  │
       │                   │            │ Service (no limit) │
       │                   │            │ • Generate image   │
       │                   │            │ • Store in R2      │
       │                   │            │ • Set status       │
       │                   │            └────────────────────┘
       │                   │
       │ GET /api/status?jobId
       ▼
    Poll until { status: "complete", imageUrl }
```

---

## Recommendations

### Short Term
1. **Document the limitation** ✅ (You're reading it!)
2. **Test locally** - Works perfectly on local machine
3. **Use Fast mode on Vercel** - Occasionally works
4. **Encourage users to run locally** for reliable generation

### Medium Term
1. **Upgrade to Vercel Pro** ($20/month)
   - Enables `maxDuration: 300`
   - Quick fix, minimal code changes
   - **Recommended for production**

2. **Implement task queue** (if staying on free tier)
   - Inngest (easiest, free tier available)
   - Redis Queue + separate worker
   - More complex but fully free

### Long Term
1. **Move to platform with better support:**
   - Railway, Render, or DigitalOcean
   - Better for long-running processes
   - Similar cost to Vercel Pro

---

## Testing & Verification

### Local Testing (Works)
```bash
npm run dev
# Visit http://localhost:3000/editor
# Test image generation - completes successfully
```

### Vercel Testing (Limited)
```
https://prats-image-editor.vercel.app/editor
# Fast mode: Sometimes works, sometimes timeout
# Quality mode: Usually timeout
```

---

## Code Quality Notes

✅ **What we successfully implemented:**
- Professional 6-step prompt enhancement
- Streaming response architecture (correct pattern)
- Proper error handling and timeouts
- Optimized frontend state management

⚠️ **What works but is incomplete on Vercel:**
- Image generation with streaming response
- All pieces are correct, just hits Vercel's platform limit

---

## Files Modified

1. `/app/api/generate/route.ts` - Streaming response implementation
2. `/lib/promptEnhancer.ts` - Professional enhancement system
3. `/app/api/enhance/route.ts` - Updated to use new enhancer
4. `/app/components/EditorContext.tsx` - Streaming frontend handling
5. `/vercel.json` - maxDuration config (free tier ignores this)

---

## Conclusion

**The implementation is solid and works perfectly locally.** The timeout issue is a Vercel platform limitation, not a code problem. 

**Upgrade to Vercel Pro or switch platforms for production use.**
