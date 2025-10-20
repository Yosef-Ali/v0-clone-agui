# V0 Clone - AI App Generator with AG-UI Protocol

## 🎯 Project Overview

A V0-style app generator that uses AG-UI protocol to create React/Next.js applications through natural language. A CopilotKit frontend handles the chat experience, a Copilot runtime API route forwards requests, and a lightweight LangGraph-compatible backend streams DeepSeek-generated previews.

## 🏗️ Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│              Frontend (Next.js + CopilotKit)            │
│  - Chat interface + Copilot actions                     │
│  - Live HTML preview iframe                             │
│  - Approval controls (request changes / approve)        │
│  - Providers manage shared component state              │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP (GraphQL + SSE)
┌─────────────────────────────────────────────────────────┐
│     Copilot Runtime (Next.js API route, /api/copilotkit) │
│  - Uses CopilotKit runtime SDK                          │
│  - Registers LangGraphAgent pointing at backend         │
│  - Requires Copilot Cloud public API key                │
└─────────────────────────────────────────────────────────┘
                          ↕ REST (JSON + SSE)
┌─────────────────────────────────────────────────────────┐
│        Backend (Express + TypeScript + DeepSeek)        │
│  - In-memory thread/checkpoint store                    │
│  - V0Generator assistant controller                     │
│  - Streams component previews via SSE                   │
│  - DeepSeek LLM (fallbacks to template when missing)    │
└─────────────────────────────────────────────────────────┘
```

## 📦 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Copilot**: `@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`
- **Styling**: Tailwind CSS + design tokens in `globals.css`
- **State**: React context provider wrapping `<CopilotKit>`
- **Preview**: streamed HTML rendered inside an iframe

### Backend
- **Runtime**: Node.js + TypeScript
- **Web server**: Express (JSON + SSE endpoints)
- **Agent**: Custom `V0GeneratorGraph` implementing CopilotKit LangGraph contract
- **LLM**: DeepSeek (via OpenAI-compatible SDK) with HTML fallback when unavailable
- **Persistence**: In-memory thread + history store (per Copilot run)

## 🎨 6 Core AG-UI Features Implementation

### 1. Agentic Chat
**Purpose**: Collect natural-language requirements
**Implementation**:
- `<CopilotChat>` from CopilotKit with custom instructions
- `useCopilotReadable` exposes preview state back to the model
- A Copilot action (`generate_component`) bridges to the backend SSE endpoint

### 2. Human-in-the-Loop
**Purpose**: Give users explicit control over acceptance
**Implementation**:
- Approval panel toggles request changes / approve
- Approval state stored in shared context and surfaced to Copilot via readable state

### 3. Generative UI Preview
**Purpose**: Visual feedback while the model streams HTML
**Implementation**:
- SSE stream parsed inside Copilot action handler
- `<iframe srcDoc>` renders the generated HTML with Tailwind CDN
- Context updates drive the Live Preview panel

### 4. Shared State
**Purpose**: Keep chat, preview, and controls aligned
**Implementation**:
```ts
interface ComponentState {
  componentCode: string;
  currentStep: "requirements" | "preview" | "approval";
}
```
- Context provider wraps `_app`
- CopilotKit readable exposes the same state for reasoning

### 5. Backend Assistant
**Purpose**: Provide a LangGraph-compatible agent wrapper
**Implementation**:
- `V0GeneratorGraph` tracks last component + feedback
- `buildComponentFromPrompt` hits DeepSeek, falls back to template on failure
- Responses streamed via Express route `/threads/:threadId/runs/stream`

This is intentionally lean today; we can revisit multi-agent orchestration once the single-agent workflow is solid.

## 📁 Project Structure

```
v0-clone-agui/
├── frontend/                      # Next.js + CopilotKit
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── providers.tsx      # Copilot + shared state provider
│   │   │   ├── page.tsx           # Entry that mounts chat + preview
│   │   │   └── api/copilotkit/route.ts # Copilot runtime endpoint
│   │   └── components/
│   │       ├── chat-interface.tsx # Copilot chat + action wiring
│   │       ├── live-preview.tsx   # iframe preview
│   │       └── approval-panel.tsx # HITL controls
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                       # LangGraph-compatible backend
│   ├── src/
│   │   ├── index.ts              # Boots Express server
│   │   ├── server.ts             # HTTP routes + SSE streaming
│   │   ├── assistants/
│   │   │   ├── index.ts          # Registry
│   │   │   └── v0-generator.ts   # Assistant implementation
│   │   ├── store/thread-store.ts # In-memory thread/checkpoint store
│   │   ├── state/generator-state.ts
│   │   ├── types/langgraph.ts    # Shared types for assistant runtime
│   │   └── utils/
│   │       ├── component-template.ts # DeepSeek + fallback renderer
│   │       ├── deepseek-client.ts    # OpenAI SDK client wrapper
│   │       ├── env.ts
│   │       ├── logger.ts
│   │       └── prompt.ts
│   ├── package.json
│   └── tsconfig.json
│
├── PLAN.md                        # This file
├── README.md
├── .gitignore
└── package.json                   # Root workspace config
```

## 🚀 Implementation Phases

### Phase 1: Setup & Basic Infrastructure (Week 1)
- [x] Create project structure
- [x] Setup Next.js + CopilotKit frontend
- [x] Stand up LangGraph-compatible backend service
- [ ] Configure linting/prettier baseline
- [x] Define environment variables and .env templates
- [x] Basic chat + preview loop working

### Phase 2: Core AG-UI Features (Week 2)
- [x] Implement agentic chat action with SSE streaming
- [x] Add shared component state + Copilot readable
- [x] Stream HTML into preview iframe
- [x] Provide human approval controls
- [ ] Capture rejection feedback and loop it back to the backend

### Phase 3: Backend Enhancements (Week 3)
- [ ] Persist threads/checkpoints beyond process lifetime
- [ ] Enhance DeepSeek prompt + error handling
- [ ] Support multiple agents or models
- [ ] Add request logging/metrics
- [ ] Harden SSE parsing on the frontend

### Phase 4: Human-in-the-Loop & Polish (Week 4)
- [ ] Implement HITL approval flow
- [ ] Add interrupt handling
- [ ] Build approval UI
- [ ] Add iteration capabilities
- [ ] Error handling & validation

### Phase 5: Advanced Features (Week 5)
- [ ] Iterative refine flow (accept feedback → regenerate)
- [ ] Export/download generated component
- [ ] Optional code cleanup/prettifying step
- [ ] Performance tuning & caching

### Phase 6: Testing & Deployment (Week 6)
- [ ] Unit tests for agents
- [ ] Integration tests
- [ ] E2E tests
- [ ] Documentation
- [ ] Deploy to production

## 🔑 Key Implementation Details

### AG-UI Event Flow
```typescript
// Frontend subscribes to events
const { agent, ui } = useCoAgent({
  name: "v0-generator",
  initialState: {
    componentCode: "",
    approved: false
  }
});

// Backend emits events
await agent.emit({
  type: "text_message",
  content: "Generating component..."
});

await agent.emit({
  type: "state_delta",
  stateDelta: { componentCode: "..." }
});

await agent.emit({
  type: "tool_call",
  toolName: "render_component_preview",
  args: { code: "..." }
});
```

### Example User Flow

**User**: "Build a todo app with dark mode"

1. **Chat prompt** — CopilotKit collects the message and calls the `generate_component` action.
2. **Backend stream** — `/threads/:id/runs/stream` spins up the `V0GeneratorGraph`, which asks DeepSeek to render HTML (or falls back to a template).
3. **Live preview** — the SSE parser updates shared state as HTML chunks arrive; the iframe reflects changes immediately.
4. **Approval loop** — once streaming completes, the approval panel enables the user to accept or request changes (future work will loop feedback back into the generator).

**Output**: Styled HTML/Tailwind component ready to copy into a Next.js project.

## 🔐 Environment Variables

```bash
# frontend/.env.local
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_COPILOTKIT_API_KEY=pk_xxx   # Copilot Cloud public key

# backend/.env
DEEPSEEK_API_KEY=sk_xxx                 # Optional; falls back to static HTML if omitted
DEEPSEEK_MODEL=deepseek-chat            # Optional override
DEEPSEEK_BASE_URL=https://api.deepseek.com  # Optional
PORT=8000
LOG_LEVEL=debug                         # Enables richer logging while testing
```

## 📚 Key Dependencies

### Frontend
```json
{
  "@copilotkit/react-core": "^1.10.6",
  "@copilotkit/react-ui": "^1.10.6",
  "@copilotkit/runtime": "^1.10.6",
  "next": "15.x",
  "react": "^19",
  "tailwindcss": "^3"
}
```

### Backend
```json
{
  "@ag-ui/langgraph": "^0.0.18",
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "zod": "^3.22.4",
  "openai": "^4.58.1"
}
```

## 🎯 Success Metrics

- Component generation in < 30 seconds
- 95%+ valid code generation
- Real-time streaming with < 100ms latency
- User approval flow working smoothly
- Responsive preview updates

## 📖 References

- [AG-UI Protocol Docs](https://docs.ag-ui.com/)
- [AG-UI Dojo Examples](https://dojo.ag-ui.com/)
- [CopilotKit Documentation](https://docs.copilotkit.ai/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [DeepSeek API Docs](https://api-docs.deepseek.com/)

## 🚦 Getting Started

See `docs/SETUP.md` for detailed setup instructions.

Quick start:
```bash
# Clone and install
cd v0-clone-agui
pnpm install

# Frontend env
cp frontend/.env.example frontend/.env.local   # create if template exists
# Set BACKEND_URL, NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_COPILOTKIT_API_KEY

# Backend env
cp backend/.env.example backend/.env           # create if template exists
# Set DEEPSEEK_API_KEY (optional) and PORT

# Start backend
pnpm --filter v0-clone-backend dev

# In another terminal start frontend
pnpm --filter v0-clone-frontend dev

# Open http://localhost:3000
```

## 🤝 Contributing

This is a learning project. Feel free to:
- Add more agent capabilities
- Improve code generation
- Add new component templates
- Enhance the UI/UX

## 📝 Notes

- This is inspired by V0 by Vercel but built as an open-source learning project
- Uses AG-UI protocol for standardized agent-UI communication
- Current backend is a single assistant; multi-agent orchestration is a potential enhancement
- CopilotKit handles the frontend agent integration
- CopilotKit Cloud key is required for the runtime endpoint to respond

---

**Status**: ✅ Plan Complete - Ready for Implementation
**Last Updated**: October 20, 2025
