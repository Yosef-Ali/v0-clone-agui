# Cloudflare Deployment Checklist ✅

Use this checklist to ensure a smooth deployment to Cloudflare.

## Pre-Deployment Checklist

### 1. Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or pnpm installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] GitHub account created
- [ ] Cloudflare account created (https://dash.cloudflare.com)

### 2. Get API Keys
- [ ] DeepSeek API key obtained (https://platform.deepseek.com)
- [ ] Cloudflare Account ID copied from dashboard
- [ ] Cloudflare API Token created with:
  - [ ] Workers Scripts:Edit permission
  - [ ] Workers Tail:Read permission
  - [ ] Account Settings:Read permission
  - [ ] Pages:Edit permission

### 3. Update Configuration
- [ ] Updated README.md deploy button URL with your GitHub username
- [ ] Reviewed wrangler.toml configuration
- [ ] Checked .env.cloudflare.example for required variables

## Deployment Checklist

### Method 1: One-Click Deploy
- [ ] Clicked "Deploy to Cloudflare" button in README
- [ ] Connected GitHub account
- [ ] Connected Cloudflare account
- [ ] Entered DEEPSEEK_API_KEY
- [ ] Verified deployment completed
- [ ] Saved frontend and backend URLs
- [ ] Tested backend health endpoint
- [ ] Tested frontend in browser

### Method 2: Automated Script
- [ ] Installed Wrangler CLI (`npm install -g wrangler`)
- [ ] Logged in to Wrangler (`wrangler login`)
- [ ] Made deploy.sh executable (`chmod +x deploy.sh`)
- [ ] Ran deployment script (`./deploy.sh`)
- [ ] Entered all required secrets when prompted
- [ ] Verified successful deployment
- [ ] Saved deployment URLs

### Method 3: Manual Deploy
- [ ] Installed Wrangler (`npm install -g wrangler`)
- [ ] Logged in (`wrangler login`)
- [ ] Set DEEPSEEK_API_KEY (`wrangler secret put DEEPSEEK_API_KEY`)
- [ ] Set DEEPSEEK_BASE_URL (`wrangler secret put DEEPSEEK_BASE_URL`)
- [ ] Set DEEPSEEK_MODEL (`wrangler secret put DEEPSEEK_MODEL`)
- [ ] Built backend (`cd backend && npm run build`)
- [ ] Deployed backend (`wrangler deploy`)
- [ ] Updated frontend .env.local with backend URL
- [ ] Built frontend (`cd frontend && npm run build`)
- [ ] Deployed frontend (`wrangler pages deploy out --project-name=v0-clone-frontend`)

## Post-Deployment Checklist

### Verify Deployment
- [ ] Backend health check passes (`curl https://your-backend.workers.dev/health`)
- [ ] Frontend loads in browser
- [ ] Can send messages in chat interface
- [ ] Live preview shows generated components
- [ ] No console errors in browser DevTools
- [ ] DeepSeek API is responding (check generated code quality)

### Optional: Setup GitHub Actions CI/CD
- [ ] Added CLOUDFLARE_API_TOKEN to GitHub Secrets
- [ ] Added CLOUDFLARE_ACCOUNT_ID to GitHub Secrets
- [ ] Added BACKEND_URL to GitHub Secrets
- [ ] Pushed to main branch
- [ ] Verified GitHub Action runs successfully
- [ ] Checked deployment in Cloudflare dashboard

### Optional: Setup Claude MCP
- [ ] Installed mcp-remote (`npm install -g mcp-remote`)
- [ ] Updated Claude Desktop config file
- [ ] Restarted Claude Desktop
- [ ] Verified MCP servers show in Claude sidebar
- [ ] Tested: "What Cloudflare resources do I have?"
- [ ] Tested: "Deploy my app to Cloudflare"

### Optional: Custom Domain
- [ ] Added custom domain in Cloudflare dashboard
- [ ] Updated DNS records
- [ ] Verified HTTPS certificate
- [ ] Tested custom domain access

### Optional: Enable Advanced Features
- [ ] Created KV namespace (`wrangler kv:namespace create THREADS`)
- [ ] Updated wrangler.toml with KV binding
- [ ] Created D1 database (`wrangler d1 create v0-clone-db`)
- [ ] Updated wrangler.toml with D1 binding
- [ ] Created R2 bucket (`wrangler r2 bucket create v0-clone-assets`)
- [ ] Updated wrangler.toml with R2 binding

## Monitoring & Maintenance

### Setup Monitoring
- [ ] Bookmarked Cloudflare dashboard
- [ ] Enabled email notifications
- [ ] Tested log viewing (`wrangler tail`)
- [ ] Checked analytics in dashboard
- [ ] Setup uptime monitoring (optional: UptimeRobot, etc.)

### Documentation
- [ ] Updated README with your deployment URLs
- [ ] Documented any custom configuration
- [ ] Added team members to Cloudflare account (if applicable)
- [ ] Shared access credentials securely

### Testing
- [ ] Tested from different locations/devices
- [ ] Verified mobile responsiveness
- [ ] Load tested with expected traffic
- [ ] Tested error scenarios
- [ ] Verified fallback behaviors

## Troubleshooting Checklist

If something goes wrong:

### Backend Issues
- [ ] Check Wrangler deployment logs
- [ ] Verify secrets are set (`wrangler secret list`)
- [ ] Check Worker logs in Cloudflare dashboard
- [ ] Test health endpoint
- [ ] Verify build succeeded (`ls backend/dist/index.js`)
- [ ] Check wrangler.toml configuration

### Frontend Issues
- [ ] Verify NEXT_PUBLIC_BACKEND_URL is correct
- [ ] Check browser console for errors
- [ ] Verify Pages build logs
- [ ] Test backend connection
- [ ] Clear browser cache
- [ ] Check for CORS issues

### API Issues
- [ ] Verify DeepSeek API key is valid
- [ ] Check DeepSeek API quota
- [ ] Test API directly with curl
- [ ] Review API error messages
- [ ] Check rate limiting

## Success Criteria

Deployment is successful when:
- ✅ Backend returns 200 on health check
- ✅ Frontend loads without errors
- ✅ Can generate components via chat
- ✅ Live preview renders correctly
- ✅ No console errors
- ✅ Response times < 1 second
- ✅ Free tier limits understood
- ✅ Monitoring in place

## Resources

- 📖 [Full Guide](docs/CLOUDFLARE_DEPLOY.md)
- 🚀 [Quick Start](docs/QUICKSTART_DEPLOY.md)
- 🤖 [Claude MCP Setup](docs/CLAUDE_MCP_SETUP.md)
- 📦 [Deployment Summary](DEPLOYMENT_SUMMARY.md)
- 💬 [Cloudflare Discord](https://discord.cloudflare.com)
- 📚 [Cloudflare Docs](https://developers.cloudflare.com)

## Notes

Use this section to track your specific configuration:

**Deployment Date:** _______________

**Backend URL:** _______________

**Frontend URL:** _______________

**Account ID:** _______________

**Custom Configurations:**
- 
- 
- 

**Team Members:**
- 
- 

**Next Review Date:** _______________

---

**Happy deploying! 🚀** Check off items as you complete them!
