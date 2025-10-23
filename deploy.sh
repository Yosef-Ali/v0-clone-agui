#!/bin/bash

# V0 Clone - Cloudflare Deployment Script
# This script automates the deployment of your V0 Clone app to Cloudflare

set -e  # Exit on error

echo "🚀 V0 Clone - Cloudflare Deployment"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Error: Wrangler CLI is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g wrangler"
    echo ""
    exit 1
fi

# Check if logged in to Wrangler
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Cloudflare${NC}"
    echo "Running: wrangler login"
    wrangler login
fi

echo -e "${GREEN}✅ Wrangler CLI found and authenticated${NC}"
echo ""

# Check if secrets are set
echo "🔐 Checking required secrets..."
echo ""

# Function to check and prompt for secrets
check_secret() {
    local secret_name=$1
    local secret_description=$2
    
    echo -e "${BLUE}Checking: ${secret_name}${NC}"
    
    # Prompt user for the secret value
    read -sp "Enter ${secret_description} (or press Enter to skip): " secret_value
    echo ""
    
    if [ -n "$secret_value" ]; then
        echo "$secret_value" | wrangler secret put "$secret_name"
        echo -e "${GREEN}✅ ${secret_name} set${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipped ${secret_name}${NC}"
    fi
    echo ""
}

# Check secrets
check_secret "DEEPSEEK_API_KEY" "DeepSeek API Key (sk-...)"
check_secret "DEEPSEEK_BASE_URL" "DeepSeek Base URL (https://api.deepseek.com)"
check_secret "DEEPSEEK_MODEL" "DeepSeek Model (deepseek-chat)"

echo ""
echo "📦 Installing dependencies..."
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

echo ""
echo "🔨 Building backend..."
cd backend
npm run build

if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}❌ Build failed: dist/index.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend built successfully${NC}"
cd ..

echo ""
echo "🚀 Deploying backend to Cloudflare Workers..."
wrangler deploy

echo ""
echo -e "${GREEN}✅ Backend deployed!${NC}"

# Get the backend URL
BACKEND_URL=$(wrangler deployments list --json | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//;s/"//')

if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️  Could not automatically determine backend URL${NC}"
    echo "Please check your Cloudflare dashboard for the Worker URL"
    echo "Then update frontend/.env.local with:"
    echo "NEXT_PUBLIC_BACKEND_URL=https://your-worker-url.workers.dev"
else
    echo -e "${GREEN}Backend URL: ${BACKEND_URL}${NC}"
    
    # Update frontend .env.local
    echo "📝 Updating frontend environment variables..."
    echo "NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}" > frontend/.env.local
    
    if [ -n "$COPILOTKIT_KEY" ]; then
        echo "NEXT_PUBLIC_COPILOTKIT_API_KEY=${COPILOTKIT_KEY}" >> frontend/.env.local
    fi
fi

echo ""
echo "🔨 Building frontend..."
cd frontend
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"

echo ""
echo "🚀 Deploying frontend to Cloudflare Pages..."
wrangler pages deploy out --project-name=v0-clone-frontend

cd ..

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "🌐 Your app is now live:"
echo "   Frontend: https://v0-clone-frontend.pages.dev"
echo "   Backend:  ${BACKEND_URL:-Check Cloudflare dashboard}"
echo ""
echo "📊 View your deployment:"
echo "   Dashboard: https://dash.cloudflare.com"
echo ""
echo "📝 View logs:"
echo "   wrangler tail"
echo ""
echo "🤖 Want to deploy with Claude?"
echo "   Setup: docs/CLAUDE_MCP_SETUP.md"
echo ""
echo "Happy coding! 🎉"
