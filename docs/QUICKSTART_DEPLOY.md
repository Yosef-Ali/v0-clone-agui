# 🚀 Quick Start: Deploy to Cloudflare in 5 Minutes

## Option 1: One-Click Deploy (Easiest!)

1. **Click the Deploy Button**
   
   [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_USERNAME/v0-clone-agui)

2. **Connect Accounts**
   - Connect your GitHub account
   - Connect your Cloudflare account (create one if needed at https://dash.cloudflare.com)

3. **Configure**
   - Repository name: `v0-clone-agui` (or your choice)
   - Add your `DEEPSEEK_API_KEY` when prompted

4. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Get your live URLs! 🎉

## Option 2: Manual Deploy (5 minutes)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### Step 2: Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/v0-clone-agui.git
cd v0-clone-agui
npm install
```

### Step 3: Configure Secrets

```bash
# Set your DeepSeek API key
wrangler secret put DEEPSEEK_API_KEY
# Paste your key when prompted: sk-xxxxx

# Set DeepSeek base URL
wrangler secret put DEEPSEEK_BASE_URL
# Paste: https://api.deepseek.com

# Set DeepSeek model
wrangler secret put DEEPSEEK_MODEL
# Paste: deepseek-chat
```

### Step 4: Deploy!

```bash
# Deploy backend
npm run deploy:backend

# Note the Worker URL, e.g., https://v0-clone-backend.your-name.workers.dev
```

### Step 5: Configure Frontend

Update `frontend/.env.local`:
```bash
NEXT_PUBLIC_BACKEND_URL=https://v0-clone-backend.your-name.workers.dev
```

### Step 6: Deploy Frontend

```bash
npm run deploy:frontend
```

### Done! 🎉

Your app is live at:
- **Frontend**: `https://v0-clone-frontend.pages.dev`
- **Backend**: `https://v0-clone-backend.your-name.workers.dev`

## Option 3: Deploy with Claude (NEW!)

If you have Claude Desktop with MCP:

1. **Open Claude Desktop**

2. **Say:**
   > "Deploy my v0-clone app to Cloudflare. The backend needs a DEEPSEEK_API_KEY secret set to [your-key]"

3. **Claude will:**
   - Build your project
   - Deploy to Cloudflare
   - Configure secrets
   - Give you the URLs

**Setup Claude MCP**: See [CLAUDE_MCP_SETUP.md](CLAUDE_MCP_SETUP.md)

## Verify Deployment

### Test Backend
```bash
curl https://v0-clone-backend.your-name.workers.dev/health
# Should return: {"status":"ok"}
```

### Test Frontend
Open `https://v0-clone-frontend.pages.dev` in browser and type:
> "Build a todo app with dark mode"

## Common Issues

### ❌ "DEEPSEEK_API_KEY not set"
**Fix**: Set the secret via `wrangler secret put DEEPSEEK_API_KEY`

### ❌ "Module not found"
**Fix**: Run `cd backend && npm run build` first

### ❌ "CORS error"
**Fix**: Backend automatically sets CORS headers. Clear browser cache.

### ❌ Frontend shows "Thinking..." forever
**Fix**: Check `NEXT_PUBLIC_BACKEND_URL` in frontend environment variables

## Next Steps

✅ [Monitor your app](https://dash.cloudflare.com)
✅ [View logs](https://dash.cloudflare.com) or run `wrangler tail`
✅ [Add custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/)
✅ [Setup Claude MCP](CLAUDE_MCP_SETUP.md) for AI-powered management

## Cost

**$0/month** on Cloudflare's free tier for:
- 100,000 backend requests/day
- Unlimited frontend requests
- Automatic HTTPS
- Global CDN
- DDoS protection

## Need Help?

- 📖 [Full Deployment Guide](CLOUDFLARE_DEPLOY.md)
- 💬 [Cloudflare Discord](https://discord.cloudflare.com)
- 🐛 [Report Issues](https://github.com/YOUR_USERNAME/v0-clone-agui/issues)

---

**Happy deploying! 🚀**
