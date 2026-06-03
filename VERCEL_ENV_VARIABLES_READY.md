# 🚀 Vercel Environment Variables - Ready to Add

**Status**: Ready to copy-paste into Vercel  
**Time Required**: 2 minutes  
**Action**: Add these 6 variables to your Vercel deployment and redeploy

---

## Quick Link
https://vercel.com/dashboard/prats-image-editor/settings/environment-variables

---

## Copy-Paste Values

Add these 6 environment variables to Vercel Settings → Environment Variables.

**Get your actual values from your `.env.local` file in the repository.**

### 1. GROQ_API_KEY
```
Name: GROQ_API_KEY
Value: [Your GROQ_API_KEY from .env.local - starts with gsk_]
Environments: ✅ Production ✅ Preview ✅ Development
```

### 2. COMETAPI_KEY
```
Name: COMETAPI_KEY
Value: [Your COMETAPI_KEY from .env.local - starts with sk-]
Environments: ✅ Production ✅ Preview ✅ Development
```

### 3. R2_ACCOUNT_ID
```
Name: R2_ACCOUNT_ID
Value: [Your R2_ACCOUNT_ID from .env.local - 32 hex chars]
Environments: ✅ Production ✅ Preview ✅ Development
```

### 4. R2_ACCESS_KEY_ID
```
Name: R2_ACCESS_KEY_ID
Value: [Your R2_ACCESS_KEY_ID from .env.local - 32 hex chars]
Environments: ✅ Production ✅ Preview ✅ Development
```

### 5. R2_SECRET_ACCESS_KEY
```
Name: R2_SECRET_ACCESS_KEY
Value: [Your R2_SECRET_ACCESS_KEY from .env.local - 64 hex chars]
Environments: ✅ Production ✅ Preview ✅ Development
```

### 6. R2_BUCKET_NAME
```
Name: R2_BUCKET_NAME
Value: prats-image-editor
Environments: ✅ Production ✅ Preview ✅ Development
```

**Find all these values in your `.env.local` file in the project root.**

---

## Step-by-Step Instructions

### Step 1: Go to Vercel Settings
1. Open: https://vercel.com/dashboard/prats-image-editor/settings/environment-variables
2. You should see an "Add New" button

### Step 2: Add Each Variable (repeat 6 times)

**For Variable 1 (GROQ_API_KEY)**:
1. Click **Add New**
2. Enter Name: `GROQ_API_KEY`
3. Enter Value: [Copy from your `.env.local`]
4. Select Environments: Check Production, Preview, Development (all 3)
5. Click **Save**

**Repeat for Variables 2-6** using the values from your `.env.local` file

### Step 3: Redeploy
1. Go to: https://vercel.com/dashboard/prats-image-editor/deployments
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes

### Step 4: Verify
1. Visit: https://prats-image-editor.vercel.app/api/debug-env
2. Should see all 6 variables with ✅

### Step 5: Test
1. Go to: https://prats-image-editor.vercel.app/editor
2. Enter prompt: "A red apple on a table"
3. Click Continue
4. Answer questions
5. Click Approve & Generate
6. Wait 20-50 seconds
7. Image should appear ✅

---

## What Each Variable Does

| Variable | Purpose | Used By |
|----------|---------|---------|
| `GROQ_API_KEY` | LLM for prompt clarification & enhancement | `/api/clarify`, `/api/enhance` |
| `COMETAPI_KEY` | Image generation (GPT Image 2 model) | `/api/generate` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account identifier | `/api/session`, `/api/generate` |
| `R2_ACCESS_KEY_ID` | R2 API access key | R2 authentication |
| `R2_SECRET_ACCESS_KEY` | R2 API secret key | R2 authentication |
| `R2_BUCKET_NAME` | Storage bucket name for images | Image storage & retrieval |

---

## Why These Are Needed

**Current Status**: 
- ❌ Your Vercel deployment is live but shows "Could not start your session"
- ❌ This happens because `/api/session` endpoint returns 500 (missing GROQ/COMETAPI/R2 variables)

**After Adding Variables**:
- ✅ Session creation will work
- ✅ Image generation will work
- ✅ Images will store in R2
- ✅ Full workflow functional

---

## Debug Commands

After adding variables, use these to verify:

```bash
# Check all variables are set
curl https://prats-image-editor.vercel.app/api/debug-env

# Should show all 6 variables with checkmarks
```

---

## Troubleshooting

**If still getting errors after adding variables**:

1. **Did you select all 3 environments?** (Production, Preview, Development)
2. **Did you click Save after each variable?**
3. **Did you redeploy after adding variables?**
4. **Are the values copied exactly?** (no extra spaces)

If issues persist:
- Clear browser cache
- Wait 1-2 minutes for Vercel to deploy
- Check Vercel deployment logs: Deployments → Click deployment → Functions

---

## Success Indicators

✅ **When it's working**:
- Page loads without "Could not start your session" message
- Editor page displays
- Can enter a prompt
- Image generates in 20-50 seconds
- Image appears in browser

---

## Time Estimate

- Adding 6 variables: ~2 minutes
- Vercel redeploy: ~2 minutes
- Total: ~4 minutes to working deployment ✅

---

**Generated**: June 3, 2026  
**Status**: READY TO ADD TO VERCEL  
**Next Step**: Copy-paste values into Vercel dashboard
