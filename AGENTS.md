# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` is a Next.js 15 app using CopilotKit for UI components and state management
  - Custom chat interface (`src/components/chat-interface.tsx`) - direct backend streaming, no external LLM
  - Live preview component (`src/components/live-preview.tsx`) - iframe rendering with Tailwind CDN
  - Approval panel (`src/components/approval-panel.tsx`) - HITL workflow
  - Layout and routing under `src/app`, Tailwind config in `src/app/globals.css`

- `backend/` is a custom Express server with LangGraph-inspired architecture
  - Assistant logic: `src/assistants/v0-generator.ts` (component generation)
  - State schemas: `src/state/generator-state.ts`
  - Thread management: `src/store/thread-store.ts` (in-memory)
  - HTTP server: `src/server.ts` (SSE streaming endpoints)
  - DeepSeek client: `src/utils/deepseek-client.ts`

- `shared/` is reserved for TypeScript contracts shared between frontend/backend
- `docs/` and `PLAN.md` capture product architecture

**Environment Variables**

**Backend** (`backend/.env`):
```bash
DEEPSEEK_API_KEY=sk-your-key-here      # Required for LLM generation
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
LOG_LEVEL=debug                         # Optional: for detailed logs
PORT=8000
```

**Frontend** (`.env.local` or `frontend/.env.local`):
```bash
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_COPILOTKIT_API_KEY=your-copilotkit-key  # For UI components
```

## Build, Test, and Development Commands
- `npm install` or `pnpm install` - installs dependencies for all workspaces (Node 18+)
- `npm run dev` - launches both frontend and backend in watch mode
- `pnpm --filter v0-clone-backend dev` - run backend only
- `pnpm --filter v0-clone-frontend dev` - run frontend only
- `npm run build` - production builds for both workspaces
- Backend: `npm run start` runs compiled `dist/index.js`
- Frontend: `npm run lint` for ESLint checks

**Quick Start:**
```bash
# Install dependencies
pnpm install

# Start both servers
npm run dev

# Or start individually:
# Terminal 1:
pnpm --filter v0-clone-backend dev

# Terminal 2:
pnpm --filter v0-clone-frontend dev
```

## Coding Style & Naming Conventions
- Prefer TypeScript everywhere; keep JSX indentation at two spaces, matching current files.
- React components live in `src/components` and use `PascalCase`; hooks adopt `useCamelCase`.
- Favor Tailwind utilities over bespoke CSS; new tokens belong in `tailwind.config.ts`.
- Run `npm run lint` before opening a PR—ESLint with the Next.js preset is the source of truth for formatting and safety rules.

## Testing Guidelines
- No automated tests are committed yet; at minimum run `npm run lint` and exercise the chat-to-preview flow locally before merging.
- When adding tests, colocate front-end tests beside components (e.g., `component.test.tsx`) and aim for scenario-focused assertions. Back-end graph logic should use node-friendly runners such as Vitest or Jest once introduced.

## Commit & Pull Request Guidelines
- Git history is not bundled with this workspace; follow Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) with 72-character subjects and include scope when meaningful.
- PRs should outline the feature, list key commands or env updates (`BACKEND_URL` for the edge runtime), and link the relevant issue.
- Attach screenshots or screen recordings for UI changes, and note manual verification steps (e.g., “npm run dev” + prompt-to-preview walkthrough).
- Rebase before requesting review to keep the history linear; resolve conflicts within each workspace directory to avoid cross-package regressions.
