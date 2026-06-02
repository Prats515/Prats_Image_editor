# Local Testing Checklist

Follow this to verify everything works before deploying to Vercel.

## Pre-Flight Checks

- [ ] Node.js 18+ installed: `node -v`
- [ ] Git repo clean: `git status`
- [ ] Dependencies installed: `npm list | head`
- [ ] Build passes: `npm run build` (should see "Compiled successfully")
- [ ] `.env.local` created and filled with all API keys

## API Testing (Terminal)

Run these commands to verify each API route:

```bash
# 1. Start server
npm run dev

# In another terminal:

# 2. Create session
curl -X POST http://localhost:3000/api/session

# Should return: {"sessionId":"..."}
```

### Sample Test Flow

**Create Session:**
```bash
SESSIONID=$(curl -s -X POST http://localhost:3000/api/session | jq -r '.sessionId')
echo $SESSIONID
```

**Analyze Prompt:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt":"make the sky more vibrant","sessionId":"'$SESSIONID'"}'
```

**Clarify:**
```bash
curl -X POST http://localhost:3000/api/clarify \
  -H "Content-Type: application/json" \
  -d '{"intent":{"isEdit":true,"scope":"specific","style":"enhancement"},"sessionId":"'$SESSIONID'"}'
```

**Enhance Prompt:**
```bash
curl -X POST http://localhost:3000/api/enhance \
  -H "Content-Type: application/json" \
  -d '{"prompt":"make the sky more vibrant","answers":{"contrast":true,"saturation":true},"sessionId":"'$SESSIONID'"}'
```

## Frontend Testing (Browser)

1. **Open** `http://localhost:3000/editor`
   - Should see: Prompt input field + image upload
   - Should work without errors (check browser console)

2. **Test Input Step**
   - Type: "make this image brighter"
   - Click "Analyze"
   - Should show: Loading spinner → "Processing your request..."

3. **Test Clarification** (if questions appear)
   - Should see: 2-3 yes/no questions
   - Click "Yes" on one question
   - Should accept input and proceed

4. **Test Review**
   - Should show: Enhanced prompt in editable text box
   - Should show: "Generate" and "Edit" buttons
   - Click "Generate"

5. **Test Generation**
   - Should show: Loading spinner + progress
   - Should display: Generated image + "Edit Again" + "Download" buttons
   - Should add entry to history sidebar

6. **Test History**
   - Should show: Thumbnail in sidebar
   - Click thumbnail → should reload that edit
   - Try "Edit Again" button

## Error Scenarios

Test these to confirm error handling:

- [ ] **Empty prompt**: Type nothing, click "Analyze" → Should show "Prompt required"
- [ ] **Bad API key**: Edit `.env.local` with fake key → Should show API error
- [ ] **File too large**: Upload >10MB image → Should show "File too large"
- [ ] **Long prompt**: Type 500+ chars → Should show "Prompt too long"
- [ ] **Session timeout**: Wait 30min (or mock expired session) → Should create new session

## Performance Checks

- [ ] **Page load**: `/editor` loads in < 2s
- [ ] **Analyze step**: API responds in < 5s (LLM is slow)
- [ ] **Generate step**: API responds in < 30s (image generation takes time)
- [ ] **Browser console**: No errors (check Ctrl+Shift+I → Console)
- [ ] **Network tab**: All requests return 200 or 400 (not 500)

## Success Criteria

✅ All API routes respond with correct data structures
✅ Frontend renders without errors
✅ Full workflow completes (input → analyze → clarify → enhance → review → generate)
✅ Images save to R2 and URLs work
✅ History loads past edits correctly
✅ Error messages are user-friendly

## If Something Breaks

1. **Check logs**: `npm run dev` terminal should show errors
2. **Check browser console**: Ctrl+Shift+I → Console tab
3. **Verify env vars**: `echo $GROQ_API_KEY` (should not be empty)
4. **Check API status**: 
   - Groq: https://status.groq.com
   - Cloudflare: https://www.cloudflarestatus.com
5. **Restart**: `npm run dev` (stop with Ctrl+C, start again)

## Ready to Deploy?

Once all checks pass:

```bash
git add .
git commit -m "Ready for deployment"
git push
# Then follow DEPLOYMENT.md to deploy to Vercel
```

---

**Estimated test time:** 15-20 minutes
