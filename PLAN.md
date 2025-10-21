# V0 Clone – Implementation Plan

## Snapshot (2025-10-20)
- ✓ pnpm workspace with Next.js frontend and Express backend wired together.
- ✓ SSE pipeline connecting `frontend/src/components/chat-interface.tsx` to `backend/src/assistants/v0-generator.ts`.
- ✓ Component state context with progress + artifact tracking in `frontend/src/app/providers.tsx`.
- ☐ Persisted threads, approval flow wiring, and DeepSeek-powered previews are still in progress.

## Architecture Overview

### Frontend
- Next.js 15 App Router app under `frontend/src/app` with Tailwind styling in `globals.css`.
- Chat UX implemented in `chat-interface.tsx`, streaming backend events and syncing component state.
- `live-preview.tsx` renders iframe previews using the Tailwind CDN and responds to artifact updates.
- `approval-panel.tsx` and `steps-timeline.tsx` expose HITL controls and pipeline visibility.
- `Providers` inject CopilotKit (`runtimeUrl="/api/copilotkit"`) and expose shared `ComponentState`.

### Backend
- Express server defined in `backend/src/server.ts` exposes `/threads/*` REST + SSE endpoints.
- Thread data managed by `backend/src/store/thread-store.ts`, allowing in-memory checkpoints and history.
- Assistant logic in `backend/src/assistants/v0-generator.ts` drives step progression, artifacts, and logs.
- State schemas live in `backend/src/state/generator-state.ts`; reusable logging/env helpers in `backend/src/utils`.
- `buildComponentFromPrompt` calls the DeepSeek chat API via `backend/src/utils/deepseek-client.ts`, with a sanitized HTML fallback for offline runs.

### Shared Contracts
- `shared/` will hold TypeScript DTOs once we promote request/response shapes out of each workspace.

## Milestones

### Phase 0 — Scaffolding (Complete)
- [x] Configure pnpm workspaces and base scripts.
- [x] Stand up streaming chat interface with CopilotKit provider shell.
- [x] Implement Express SSE pipeline with assistant registry + thread store.

### Phase 1 — Streaming UX Polish (In Progress)
- [ ] Persist thread IDs per session so additional prompts reuse context.
- [ ] Surface backend artifacts (PRD, schema, UI preview HTML) inside the live preview dock.
- [ ] Connect `approval-panel.tsx` to backend `approved` state and emit approval events.
- [ ] Improve error reporting (timeout boundaries, malformed SSE frames, retry button).

### Phase 2 — DeepSeek Integration & Generation Quality
- [ ] Finish wiring DeepSeek outputs into `buildComponentFromPrompt` with temp failure fallbacks.
- [ ] Add rate-limit + exponential backoff wrapper around chat completion calls.
- [ ] Store generated HTML/TSX artifacts on disk for download and future diffing.

### Phase 3 — Multi-Component Roadmap
- [ ] Allow multiple parallel component requests by sharding thread store state.
- [ ] Introduce component library selector (Tailwind tokens, shadcn variants, marketing vs app mode).
- [ ] Add CLI/export workflow to sync generated files back into a repo.

### Phase 4 — Production Readiness
- [ ] Instrument logs/metrics (pino transport + structured request IDs).
- [ ] Authenticate HITL operations and persist approval history.
- [ ] Ship integration tests for the SSE flow plus smoke tests for `buildComponentFromPrompt`.
- [ ] Document deployment + observability runbooks in `docs/`.

## Immediate Next Sprint
- [ ] Move thread ID generation to the frontend provider and stash in local storage.
- [ ] Extend `live-preview.tsx` to show PRD markdown alongside the iframe.
- [ ] Implement "Retry step" and "Request changes" actions in `approval-panel.tsx`.
- [ ] Add lint workflow to CI and gate merges on `npm run lint`.

## Environment Summary
- Backend `.env`: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `LOG_LEVEL`, `PORT`.
- Frontend `.env.local`: `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_COPILOTKIT_API_KEY`.
- Local dev: `pnpm install` at repo root, then `npm run dev` to launch both services.

## Success Metrics
- <30s end-to-end generation for common briefs.
- ≥95% successful runs without manual restarts.
- Live preview latency ≤150 ms per artifact update.
- Every production export gated by an approval record.

## References
- `docs/` directory for architecture and setup deep dives.
- `AGENTS.md` for assistant extension patterns.
- `README.md` for the quick start checklist.

**Status**: Plan synced with current repository state. Update again after Phase 1 items land.
