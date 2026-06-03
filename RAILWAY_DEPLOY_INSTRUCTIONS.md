# Railway Deployment - Manual Steps

Your Railway API Token: `9ca855ee-a5f6-415d-bbea-4959a013b9ed`

## Quick Deploy (5 minutes)

### Step 1: Open Railway Dashboard
```
https://railway.app/dashboard
```

### Step 2: Create New Project
- Click "New Project" button
- Select "Deploy from GitHub repo"
- Search for: `Prats_Image_editor`
- Click "Deploy"

### Step 3: Add Environment Variables
Once deployment starts, go to:
- Project Settings → Variables
- Add these 6 variables from your `.env.local`:
  - `GROQ_API_KEY`
  - `COMETAPI_KEY`
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME` (use: `prats-image-editor`)

### Step 4: Wait for Deployment
- Check the "Deployments" tab
- Watch the build complete
- Get your public URL

### Step 5: Test
- Use your Railway URL
- Test with Goa poster prompt
- Image should generate in 40-90 seconds

## Your Tokens & Keys

**Railway API Token:**
```
9ca855ee-a5f6-415d-bbea-4959a013b9ed
```

**Environment Variables (from .env.local):**
- All 6 variables provided above

## Expected Outcome

After deployment, you'll get a URL like:
```
https://prats-image-editor-production-xxxx.railway.app/editor
```

**Full workflow will work:**
1. ✅ Prompt analysis
2. ✅ Professional enhancement
3. ✅ Image generation (40-90 seconds, NO TIMEOUT)
4. ✅ R2 storage
5. ✅ Edit history
