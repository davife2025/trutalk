# Mental Health & Stress Relief Platform — Monorepo

## Stack
- **Monorepo**: pnpm workspaces + Turborepo
- **apps/web**: Next.js 14 (App Router), TypeScript, Tailwind
- **apps/api**: Node + Fastify (TypeScript) — talks to Supabase with the service-role key, hosts the safety-classifier + LLM orchestration so secrets never reach the client
- **Database/Auth**: Supabase (Postgres, Auth, Row Level Security)
- **LLM**: Kimi K2 via Hugging Face Inference (see `packages/llm`)
- **Design**: Figma MCP connector (pull design context directly into `packages/ui`)

## Why apps/api exists alongside Supabase
Supabase handles data + auth directly, but the **safety classifier and LLM calls run
server-side in apps/api**, not from the browser and not as a Supabase Edge Function in v1 —
this keeps the crisis-escalation logic in one auditable place as it gets more complex, and
keeps the Hugging Face token off the client entirely.

## Directory structure
```
apps/
  web/          Next.js frontend
  api/          Fastify backend (LLM orchestration, safety classifier, crisis escalation)
packages/
  ui/               Shared React components (fed by Figma MCP design context)
  types/            Shared TypeScript types across web + api
  config/           Shared ESLint/Tailwind/TS config
  supabase-client/  Typed Supabase client wrapper (browser + server variants)
  llm/              Kimi K2 client (Hugging Face Inference)
  safety/           Crisis-detection interface + crisis-resource directory
supabase/
  migrations/       SQL schema migrations
```

## Non-negotiable: the safety layer
Every message sent to the AI wellness agent passes through `packages/safety` BEFORE
it reaches the LLM. See `packages/safety/src/index.ts` for the interface and the
**explicit placeholder warning** — the keyword-based classifier shipped here is a
scaffold, not a production-ready crisis detector. It must be replaced/augmented with a
properly evaluated model before this touches real users, per the build plan.

## Build session strategy
- **Session 1** (this zip): full monorepo skeleton, core packages, Supabase schema,
  empty-state web app, empty-state api with health check + safety scaffold.
- **Subsequent sessions**: only new/changed files are shipped, as a zip, layered on top
  of the previous session's codebase.

## Getting started
```bash
pnpm install
cp .env.example .env
# fill in Supabase + Hugging Face credentials
pnpm dev
```
