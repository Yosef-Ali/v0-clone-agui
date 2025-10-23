# V0 Clone - AI App Generator

> Generate React/Next.js applications through natural language using AG-UI Protocol

## ✨ Features

- 🤖 **AI-Powered Generation**: Natural language to React components
- 🎨 **Real-time Preview**: See your app as it's being generated
- 🔄 **Interactive Refinement**: Approve, reject, or iterate on components
- 🎯 **6 AG-UI Primitives**: Full implementation of AG-UI protocol
- 🔗 **Subgraph Architecture**: Specialized agents working together
- ⚡ **Streaming Updates**: Real-time code generation and preview

## 🚀 Deploy to Cloudflare (FREE!)

Deploy your entire full-stack app in one click to Cloudflare's global network:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_USERNAME/v0-clone-agui)

**What you get (100% FREE tier):**
- ⚡ Backend on Cloudflare Workers (100k requests/day)
- 🌐 Frontend on Cloudflare Pages (unlimited bandwidth)
- 🔐 Automatic HTTPS & DDoS protection
- 🌍 Global CDN (50ms from 95% of users)
- 🤖 **NEW:** Claude MCP integration for AI-powered deployment!

📖 **[Full Deployment Guide →](docs/CLOUDFLARE_DEPLOY.md)**

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (Next.js 15 + CopilotKit)        │
│  • Custom Chat UI (direct streaming)       │
│  • Live Preview (iframe + Tailwind CDN)    │
│  • Approval Panel (HITL workflow)          │
└──────────────────┬──────────────────────────┘
                   │ Fetch API (SSE)
                   ↓
┌─────────────────────────────────────────────┐
│  Backend (Express + Custom LangGraph)      │
│  • v0-generator assistant                  │
│  • Thread management (in-memory)           │
│  • SSE streaming endpoints                 │
└──────────────────┬──────────────────────────┘
                   │ API Call
                   ↓
┌─────────────────────────────────────────────┐
│  DeepSeek LLM (deepseek-chat)              │
│  • Generates Tailwind HTML components      │
│  • Streaming responses                     │
└─────────────────────────────────────────────┘
```

**Tech Stack:**
- **Frontend**: Next.js 15, CopilotKit (UI only), TypeScript, Tailwind CSS
- **Backend**: Express, Custom LangGraph architecture, TypeScript
- **LLM**: DeepSeek API (deepseek-chat model)
- **Communication**: Server-Sent Events (SSE) for streaming
- **Styling**: Tailwind CSS (loaded via CDN in previews)

## 🚀 Quick Start

1. **Install dependencies**
```bash
npm install
```

2. **Setup backend environment**
```bash
cd backend
cp .env.example .env
# Edit backend/.env and add your DEEPSEEK_API_KEY
```

**Backend `.env` file:**
```bash
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
LOG_LEVEL=debug  # Optional: for detailed logs
```

3. **Setup frontend environment**

Create `frontend/.env.local` (or root `.env.local`):
```bash
# Backend URL
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# CopilotKit (for UI components)
NEXT_PUBLIC_COPILOTKIT_API_KEY=your-copilotkit-public-key
```

4. **Start development servers**
```bash
# Option 1: Start both together
npm run dev

# Option 2: Start separately
# Terminal 1: Backend (must start first)
pnpm --filter v0-clone-backend dev

# Terminal 2: Frontend
pnpm --filter v0-clone-frontend dev
```

5. **Open browser**
```
http://localhost:3000
```

6. **Test it!**
Type in the chat:
```
Build a todo app with dark mode
```

Watch as DeepSeek generates a beautiful component in real-time! ✨

## 📖 Documentation

- [Setup Guide](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Project Plan](PLAN.md)
- [Repository Guidelines](AGENTS.md)

## 🎯 How It Works

**You type:** "Build a todo app with dark mode"

**The system:**
1. 💬 **Chat Interface** sends your message to the backend
2. 🧠 **Backend** forwards it to DeepSeek LLM with a specialized prompt
3. ✨ **DeepSeek** generates beautiful Tailwind HTML (streaming)
4. 📡 **Backend** streams the response via Server-Sent Events (SSE)
5. 🖥️ **Frontend** receives the stream and updates the **Live Preview** in real-time
6. ✅ **You** can approve or request changes
7. 🔄 Iterate until perfect!

**Example Flow:**
```
User: "Build a todo app with dark mode"
  ↓
DeepSeek generates: <div class="bg-slate-950">...</div>
  ↓
Live Preview shows: Beautiful dark-themed TaskFlow app
  ↓
User: ✓ Approve or 🔄 Request Changes
```

## 📦 Project Structure

See [PLAN.md](PLAN.md) for detailed architecture and implementation plan.

## 🐛 Troubleshooting

### Backend Issues

**"DEEPSEEK_API_KEY not set" warning:**
- Create `backend/.env` file (not root `.env`)
- Add: `DEEPSEEK_API_KEY=sk-your-key-here`
- Restart backend: `pnpm --filter v0-clone-backend dev`

**Backend returns fallback template (not DeepSeek content):**
```bash
# Test backend directly:
curl -X POST http://localhost:8000/threads/test/runs/stream \
  -H 'Content-Type: application/json' \
  -d '{"assistant_id":"v0-generator","input":{"messages":[{"role":"user","content":[{"type":"text","text":"Build a counter"}]}]}}'

# Should see rich DeepSeek-generated HTML, not static template
```

### Frontend Issues

**"Thinking..." loops forever:**
- Check browser console (F12) for errors
- Verify `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` in `.env.local`
- Ensure backend is running on port 8000
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**CopilotKit errors:**
- Make sure `NEXT_PUBLIC_COPILOTKIT_API_KEY` is set in `.env.local`
- Restart frontend after changing `.env.local`

**Test endpoints:**
```bash
# Test backend health
curl http://localhost:8000/health

# Test CopilotKit endpoint
curl -X POST http://localhost:3000/api/copilotkit \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}'
```

## 🤝 Contributing

This is a learning project. Contributions welcome!
