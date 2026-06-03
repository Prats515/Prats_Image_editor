# Vercel Deployment Setup Guide

**Problem**: Getting 500 errors on Vercel after deployment

**Root Cause**: Missing or incorrect environment variables on Vercel

---

## Quick Diagnosis

1. Visit your Vercel deployment URL and add `/api/debug-env` to the path
   
   Example: `https://your-project.vercel.app/api/debug-env`

2. You'll see which environment variables are missing. This tells you exactly what to fix.

---

## Step-by-Step: Adding Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard

Visit: https://vercel.com/dashboard

### Step 2: Select Your Project

Click on your "Prats_Image_editor" project

### Step 3: Navigate to Settings

Click the **Settings** tab at the top

### Step 4: Find Environment Variables

In the left sidebar, click **Environment Variables**

### Step 5: Add Required Variables

You need to add **6 environment variables**. Add them one by one:

#### Variable 1: GROQ_API_KEY
- **Name**: `GROQ_API_KEY`
- **Value**: Your Groq API key from https://console.groq.com/keys
  - Get key: https://console.groq.com/keys
  - Copy the key starting with `gsk_`
- **Environments**: Select Production, Preview, Development

#### Variable 2: COMETAPI_KEY ⭐ (MOST IMPORTANT)
- **Name**: `COMETAPI_KEY`
- **Value**: Your CometAPI key from https://www.cometapi.com/
  - Get key: https://www.cometapi.com/ (sign up for free, no credit card)
  - Copy the key starting with `sk-`
- **Environments**: Select Production, Preview, Development

#### Variable 3: R2_ACCOUNT_ID
- **Name**: `R2_ACCOUNT_ID`
- **Value**: From your Cloudflare dashboard
  - Go to: https://dash.cloudflare.com/
  - Left sidebar → R2
  - Click your bucket → Settings
  - Find "Account ID" (32-character hex string)
- **Environments**: Select Production, Preview, Development

#### Variable 4: R2_ACCESS_KEY_ID
- **Name**: `R2_ACCESS_KEY_ID`
- **Value**: From your Cloudflare API token
  - Go to: https://dash.cloudflare.com/
  - Left sidebar → R2 → API Tokens
  - Create or view your API token
  - Copy "Access Key ID" (32-character hex string)
- **Environments**: Select Production, Preview, Development

#### Variable 5: R2_SECRET_ACCESS_KEY
- **Name**: `R2_SECRET_ACCESS_KEY`
- **Value**: From your Cloudflare API token
  - Same location as above
  - Copy "Secret Access Key" (64-character hex string)
- **Environments**: Select Production, Preview, Development

#### Variable 6: R2_BUCKET_NAME
- **Name**: `R2_BUCKET_NAME`
- **Value**: Name of your R2 bucket
  - Default: `prats-image-editor`
  - Or whatever you named your bucket
- **Environments**: Select Production, Preview, Development

### Step 6: Save Each Variable

After entering each variable, click **Save** button (or it auto-saves)

### Step 7: Redeploy

After adding all variables:
1. Go back to **Deployments** tab
2. Click **...** (three dots) on the latest deployment
3. Click **Redeploy**

Wait for deployment to complete (2-3 minutes)

### Step 8: Test

Visit your deployment URL again and try generating an image

If still getting errors, check the **debug-env** endpoint:
- https://your-project.vercel.app/api/debug-env

Should now show ✅ for all variables

---

## Vercel Environment Variables: Quick Reference

Go to: `https://vercel.com/dashboard/[project-name]/settings/environment-variables`

Fill in the table below with your values:

| Variable Name | Value | Where to Get It |
|---|---|---|
| `GROQ_API_KEY` | `gsk_...` | https://console.groq.com/keys |
| `COMETAPI_KEY` | `sk_...` | https://www.cometapi.com/ (free signup) |
| `R2_ACCOUNT_ID` | `92f0...` (32 chars) | Cloudflare R2 → Settings |
| `R2_ACCESS_KEY_ID` | `7c20...` (32 chars) | Cloudflare R2 → API Tokens |
| `R2_SECRET_ACCESS_KEY` | `f443...` (64 chars) | Cloudflare R2 → API Tokens |
| `R2_BUCKET_NAME` | `prats-image-editor` | Your bucket name |

---

## Troubleshooting

### Still getting 500 errors after adding variables?

1. **Check debug endpoint**: https://your-project.vercel.app/api/debug-env
   - Should show all ✅ 

2. **Check if CometAPI key is valid**:
   ```bash
   curl -X POST https://api.cometapi.com/v1/images/generations \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-image-2","prompt":"test","size":"1024x1024"}'
   ```
   - Should return 200 (or detailed error message)

3. **Check R2 credentials are valid**:
   - Go to Cloudflare dashboard
   - R2 → API Tokens
   - Verify Account ID, Access Key ID, Secret Key

4. **Check if bucket exists**:
   - Cloudflare R2 → Buckets
   - Should see `prats-image-editor` listed

5. **Check Vercel logs**:
   - https://vercel.com/dashboard/[project-name]/deployments
   - Click latest deployment
   - Click **Functions** tab
   - View logs to see actual error message

### Common Issues

**Error: "COMETAPI_KEY is not set"**
- You haven't added the COMETAPI_KEY variable to Vercel
- Follow Step 5, Variable 2 above

**Error: "R2 403 Forbidden"**
- R2 credentials are invalid or have wrong permissions
- Verify Account ID, Access Key ID, Secret Key in Cloudflare dashboard

**Error: "CometAPI returned 401"**
- CometAPI key is invalid or expired
- Get new key from https://www.cometapi.com/

**Error: "CometAPI returned 503"**
- CometAPI is temporarily down or overloaded
- Try again in a few minutes
- CometAPI status: https://www.cometapi.com/

---

## After Vercel Deployment Works

Once you confirm the deployment works:

1. **Remove debug endpoint** (optional but recommended):
   ```bash
   rm app/api/debug-env/route.ts
   git add .
   git commit -m "Remove debug endpoint (deployment verified)"
   git push
   ```

2. **Test the full workflow**:
   - Go to your Vercel URL
   - Enter a prompt
   - Answer clarification questions
   - Generate an image
   - Verify it appears and is stored in R2

3. **Monitor in production**:
   - Vercel Dashboard → Logs
   - Watch for any errors

---

## File Structure Reference

The environment variables are used in these files:

- `lib/imageGeneration.ts` - Uses COMETAPI_KEY
- `lib/session.ts` - Uses R2_* variables
- `lib/historyWrite.ts` - Uses R2_* variables
- `lib/groq.ts` - Uses GROQ_API_KEY

All these files read from `process.env.VARIABLE_NAME` at runtime

---

## Summary Checklist

- [ ] Added GROQ_API_KEY to Vercel
- [ ] Added COMETAPI_KEY to Vercel ⭐
- [ ] Added R2_ACCOUNT_ID to Vercel
- [ ] Added R2_ACCESS_KEY_ID to Vercel
- [ ] Added R2_SECRET_ACCESS_KEY to Vercel
- [ ] Added R2_BUCKET_NAME to Vercel
- [ ] Redeployed on Vercel
- [ ] Tested /api/debug-env endpoint (all ✅)
- [ ] Tested image generation end-to-end
- [ ] Images appear in browser
- [ ] Images stored in R2

---

**Need help?** Check the debug endpoint at `/api/debug-env` to see what's missing!
