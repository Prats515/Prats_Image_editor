# 🚀 Railway Setup - Complete Guide

**Status:** MCP Configured & Ready for Deployment  
**Date:** June 3, 2026

---

## ✅ Step 1: MCP Configuration (DONE)

Railway MCP server has been configured in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "railway": {
      "command": "uvx",
      "args": ["railway-mcp-server"],
      "env": {
        "RAILWAY_API_TOKEN": "${RAILWAY_API_TOKEN}"
      },
      "disabled": false,
      "autoApprove": [
        "create_project",
        "list_projects",
        "get_project_details",
        "deploy_project"
      ]
    }
  }
}
```

---

## 🔑 Step 2: Get Railway API Token

### Method A: Via Railway Dashboard (Easiest)

1. **Go to Railway:** https://railway.app
2. **Sign Up or Login** with GitHub
3. **Go to Account Settings:**
   - Click your profile icon (top right)
   - Select "Account"
4. **Create API Token:**
   - Go to "Tokens" section
   - Click "Create Token"
   - Name it: `kiro-deployment`
   - Copy the token
5. **Save the token** - you'll use it in the next step

### Method B: Via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login (opens browser)
railway login

# Get token
railway token

# Copy the token displayed
```

---

## 🌍 Step 3: Set Railway API Token as Environment Variable

### On Windows (PowerShell):

```powershell
[System.Environment]::SetEnvironmentVariable("RAILWAY_API_TOKEN", "your-token-here", "User")

# Restart your terminal/IDE for the change to take effect
```

### On Windows (CMD):

```cmd
setx RAILWAY_API_TOKEN your-token-here
REM Restart terminal
```

### On macOS/Linux:

```bash
export RAILWAY_API_TOKEN="your-token-here"
# Add to ~/.zshrc or ~/.bash_profile for persistence
echo 'export RAILWAY_API_TOKEN="your-token-here"' >> ~/.zshrc
source ~/.zshrc
```

---

## 📝 Step 4: Update .env.local with Railway Token

Add to `.c:\Users\Admin\Desktop\Prats_Image_Editor\.env.local`:

```
# Railway deployment
RAILWAY_API_TOKEN=<your-token-here>
```

---

## 🏗️ Step 5: Deployment via Railway Dashboard (Simplest)

### Quick Deploy (No CLI needed):

1. **Go to https://railway.app**
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose `Prats_Image_editor`**
5. **Click "Deploy"**
6. **Add Environment Variables:**
   - Go to Project Settings → Variables
   - Add the 6 variables from `.env.local`:
     - `GROQ_API_KEY`
     - `COMETAPI_KEY`
     - `R2_ACCOUNT_ID`
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`
     - `R2_BUCKET_NAME`
7. **Watch the deployment** - takes 2-3 minutes
8. **Get your URL** - Railway assigns a public URL automatically

---

## 🔧 Step 6: Deployment via CLI (Alternative)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Set environment variables
railway variable set GROQ_API_KEY=<value>
railway variable set COMETAPI_KEY=<value>
railway variable set R2_ACCOUNT_ID=<value>
railway variable set R2_ACCESS_KEY_ID=<value>
railway variable set R2_SECRET_ACCESS_KEY=<value>
railway variable set R2_BUCKET_NAME=prats-image-editor

# Deploy
railway up

# Get your URL
railway domain
```

---

## 📊 Environment Variables Reference

Copy from `.env.local`:

| Variable | Source | Purpose |
|----------|--------|---------|
| `GROQ_API_KEY` | `.env.local` | Prompt enhancement via Groq LLM |
| `COMETAPI_KEY` | `.env.local` | Image generation via CometAPI |
| `R2_ACCOUNT_ID` | `.env.local` | Cloudflare R2 storage |
| `R2_ACCESS_KEY_ID` | `.env.local` | R2 authentication |
| `R2_SECRET_ACCESS_KEY` | `.env.local` | R2 authentication |
| `R2_BUCKET_NAME` | `prats-image-editor` | R2 bucket name |

---

## ✨ What Happens After Deploy

Once deployed to Railway:

✅ **Automatic Features:**
- GitHub auto-deploys on `main` push
- No function timeout constraints
- 500 free hours/month
- Real-time logs available

✅ **Full Functionality Enabled:**
- Prompt analysis
- Prompt enhancement
- Image generation (40-90 seconds, no timeout!)
- R2 storage
- Edit history

---

## 🎯 Testing After Deployment

1. **Wait for deployment to complete** (check "Deployments" tab)
2. **Get your Railway URL** (shown in deployment details)
3. **Test with your prompt:**
   ```
   Create a luxury cinematic Goa dance workshop poster in 1080x1350 format 
   using my uploaded photo only, preserving my face with tropical sunset 
   beach background, giant elephant "GOA" typography behind, premium 
   pink-orange-purple color grading, realistic lighting, palm trees, 
   beach lights, and high-end event poster aesthetics.
   ```
4. **Verify image generates successfully** (should complete in 40-90 seconds)

---

## 📋 Quick Setup Checklist

- [ ] Railway account created (https://railway.app)
- [ ] API token generated
- [ ] API token set as environment variable
- [ ] API token added to `.env.local`
- [ ] Repository pushed to GitHub
- [ ] Environment variables configured in Railway dashboard
- [ ] Deployment started
- [ ] Deployment completed (check logs)
- [ ] Public URL assigned
- [ ] Test with sample prompt
- [ ] Image generation verified

---

## 🔗 Useful Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app
- **Railway API Token:** https://railway.app/account
- **GitHub Repo:** https://github.com/Prats515/Prats_Image_editor
- **Vercel (for reference):** https://prats-image-editor.vercel.app/editor

---

## 🚨 Troubleshooting

### Deploy fails with "Environment variable not found"
→ Ensure all 6 variables are set in Railway dashboard

### Deploy fails with "Cannot find module"
→ Wait for build to complete (check Deployment logs)

### Image generation still times out
→ Verify Railway deployment (not Vercel)

### No public URL shown
→ Go to Deployments → Click active deployment → Check "Networking"

---

## 🎉 Final Result

After successful Railway deployment:

**Your Working URL:** `https://your-app-xxxxx.railway.app/editor`

**Full Features Enabled:**
- ✅ Professional prompt enhancement
- ✅ Image generation (40-90s, no timeout)
- ✅ R2 storage
- ✅ Edit history
- ✅ Production-ready

---

## 📞 Next Steps

1. **Get Railway API token** from https://railway.app/account
2. **Set environment variable:** `RAILWAY_API_TOKEN`
3. **Deploy** via Railway dashboard
4. **Test** with sample prompt
5. **Share** your working Railway URL!

**Status:** ✅ MCP Configured, Ready for Token & Deployment
