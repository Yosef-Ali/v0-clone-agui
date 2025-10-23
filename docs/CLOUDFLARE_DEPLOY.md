# 🚀 Cloudflare Deployment Guide

## One-Click Deploy to Cloudflare (FREE)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_USERNAME/v0-clone-agui)

> 🎉 **NEW 2025**: Deploy your entire full-stack app with one button!

## What You Get (All FREE Tier)

✅ **Cloudflare Workers** (Backend)
- 100,000 requests/day free
- Global edge network (50ms from 95% of users)
- Automatic HTTPS
- Zero cold starts

✅ **Cloudflare Pages** (Frontend)  
- Unlimited bandwidth
- Automatic deployments from Git
- Preview URLs for PRs
- Built-in CDN

✅ **Optional Free Resources**
- **KV Storage**: 100k reads, 1k writes/day
- **D1 Database**: 5M reads, 100k writes/day
- **R2 Storage**: 10GB storage, 1M reads/month

## 🎯 Quick Deploy (3 Steps)

### Method 1: One-Click Deploy Button (Easiest!)

1. Click the "Deploy to Cloudflare" button above
2. Connect your GitHub account
3. Connect your Cloudflare account (create free account if needed)
4. Done! Your app deploys automatically

### Method 2: Manual Deploy with Wrangler CLI

#### Step 1: Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

#### Step 2: Configure Secrets

```bash
# Set your DeepSeek API key
wrangler secret put DEEPSEEK_API_KEY

# Set DeepSeek configuration
wrangler secret put DEEPSEEK_BASE_URL
wrangler secret put DEEPSEEK_MODEL
```

#### Step 3: Deploy!

```bash
# Deploy backend to Workers
npm run deploy:backend

# Deploy frontend to Pages
npm run deploy:frontend
```

## 🔧 Environment Variables Setup

### Required Secrets (via Cloudflare Dashboard or CLI)

**Backend (Workers):**
```bash
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

**Frontend (Pages):**
```bash
NEXT_PUBLIC_BACKEND_URL=https://v0-clone-backend.YOUR_SUBDOMAIN.workers.dev
NEXT_PUBLIC_COPILOTKIT_API_KEY=your-copilotkit-key
```

### Setting Secrets via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select **Workers & Pages**
3. Click your worker/project
4. Go to **Settings** > **Variables**
5. Add your secrets

## 🤖 Claude MCP Integration (NEW!)


Your app can now work with **Claude via Model Context Protocol (MCP)**!

### Connect Cloudflare MCP to Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://docs.mcp.cloudflare.com/mcp"
      ]
    },
    "cloudflare-developer": {
      "command": "npx", 
      "args": [
        "mcp-remote",
        "https://developer.mcp.cloudflare.com/mcp"
      ]
    }
  }
}
```

### What Claude Can Do with Your Cloudflare App

✅ Deploy Workers directly from conversation
✅ Query Cloudflare documentation in real-time
✅ Manage KV/D1/R2 resources
✅ Debug and monitor your deployments
✅ Create and manage secrets
✅ View logs and analytics

### Example: Deploy with Claude

Just ask Claude:
> "Deploy my v0-clone backend to Cloudflare Workers"

Claude will:
1. Build your project
2. Deploy to Workers
3. Configure environment variables
4. Give you the live URL

## 📊 Monitoring & Logs (FREE)

View real-time logs:
```bash
wrangler tail
```

Or use Cloudflare Dashboard:
1. Workers & Pages > Your Worker
2. Click **Logs** tab
3. See real-time requests and errors

## 💰 Cost Breakdown (FREE Tier)


| Service | Free Tier | Perfect For |
|---------|-----------|-------------|
| **Workers** | 100k requests/day | Backend API |
| **Pages** | Unlimited | Frontend hosting |
| **KV Storage** | 100k reads, 1k writes/day | Session storage |
| **D1 Database** | 5M reads, 100k writes/day | App data |
| **R2 Storage** | 10GB, 1M reads/month | File storage |

**Estimated monthly cost for small project:** $0 🎉

## 🔥 Performance Benefits

Compared to traditional hosting:

- ⚡ **50ms response time** globally (Cloudflare's edge network)
- 🚀 **Zero cold starts** (Workers stay warm)
- 🌍 **290+ cities worldwide** (closer to your users)
- 📈 **Auto-scaling** (handles traffic spikes)
- 🔒 **Built-in DDoS protection**

## 🛠️ Advanced Configuration

### Enable KV Storage (Optional)

```bash
# Create KV namespace
wrangler kv:namespace create THREADS

# Add to wrangler.toml:
[[kv_namespaces]]
binding = "THREADS"
id = "your_kv_namespace_id"
```

### Enable D1 Database (Optional)

```bash
# Create D1 database
wrangler d1 create v0-clone-db

# Run migrations
wrangler d1 execute v0-clone-db --file=./schema.sql
```

### Enable R2 Storage (Optional)

```bash
# Create R2 bucket
wrangler r2 bucket create v0-clone-assets
```

## 🚨 Troubleshooting

### "Module not found" error

Make sure `main = "backend/dist/index.js"` points to your built file.

### CORS errors
Add CORS headers in your Worker. Example in `backend/src/index.ts`:
```typescript
export default {
  async fetch(request) {
    const response = await handleRequest(request);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
}
```

### Environment variables not working
Use `wrangler secret put` instead of `.env` files:
```bash
wrangler secret put DEEPSEEK_API_KEY
```

### Build fails
Ensure all dependencies are in `package.json`:
```bash
npm install
cd backend && npm run build
```

## 📚 Additional Resources

- 🔗 [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- 🔗 [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- 🔗 [Deploy Button Guide](https://developers.cloudflare.com/workers/platform/deploy-buttons/)
- 🔗 [MCP on Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/)
- 🔗 [Cloudflare MCP Servers](https://github.com/cloudflare/mcp-server-cloudflare)
- 🔗 [Full-Stack on Workers](https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/)

## 🎓 Next Steps

1. ✅ Deploy your app
2. ✅ Connect Claude MCP
3. ✅ Monitor with real-time logs
4. ✅ Add custom domain (free with Cloudflare)
5. ✅ Scale to millions of users (still free!)

## 🤝 Need Help?

- [Cloudflare Discord](https://discord.cloudflare.com)
- [Cloudflare Community](https://community.cloudflare.com)
- [GitHub Issues](https://github.com/YOUR_USERNAME/v0-clone-agui/issues)

---

**Built with ❤️ for the Cloudflare + Claude ecosystem**
