# Local Development Setup

## Quick Start

### 1. Prerequisites
- Node.js 18+ (get from https://nodejs.org)
- Free API credentials (all free tier):
  - **Groq**: https://console.groq.com/keys (free LLM API)
  - **Cloudflare**: https://dash.cloudflare.com/ (free Workers AI + R2 storage)

### 2. Install & Configure
```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and fill in your API keys:
- Get Groq key from console.groq.com/keys
- Get Cloudflare Account ID, API Token, R2 keys from dash.cloudflare.com

### 3. Run Locally
```bash
npm run dev
```
Opens at `http://localhost:3000`

### 4. Test the App
1. Go to `/editor` (main page redirects there)
2. Enter a prompt (e.g., "make the sky more vibrant")
3. Upload an image (optional but recommended)
4. Follow the steps: analyze → clarify → enhance → review → generate

### 5. Troubleshooting

**"API key invalid"**: Check `.env.local` values match your dashboard

**"Image generation fails"**: Verify Cloudflare Workers AI is enabled in your account

**"Session expires"**: Sessions auto-cleanup after 24h on Vercel; local dev keeps them in memory

## Architecture (Minimal Frontend)

- **Input**: Simple form with file upload
- **Clarification**: List of questions with yes/no buttons
- **Review**: Shows enhanced prompt, can edit before approval
- **Generator**: Shows progress, displays result
- **History**: Sidebar with thumbnails of past edits

No heavy UI libraries — just vanilla React + CSS modules.

## Build for Production

```bash
npm run build
npm run start
```

Then deploy to Vercel (free tier supports this stack perfectly).
