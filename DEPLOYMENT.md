# Deploying TruTalk

This assumes: Supabase for the database/auth, Vercel for `apps/web`, and any
container host (Railway, Render, or Fly.io all work — instructions below use
generic Docker steps) for `apps/api`.

---

## 1. Supabase (do this first — everything else needs the URL/keys)

1. Create a project at supabase.com.
2. In the SQL editor (or via `supabase db push` if you're using the CLI
   locally), run the migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_handle_new_user.sql`
   - `supabase/migrations/0003_seed_practice_content.sql`
3. Grab three values from **Project Settings → API**:
   - `Project URL` → used as both `SUPABASE_URL` (api) and
     `NEXT_PUBLIC_SUPABASE_URL` (web)
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web only — safe to
     expose, RLS protects it)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (api only — **never**
     put this in apps/web or any client-side code, it bypasses RLS entirely)
4. In **Authentication → URL Configuration**, add your deployed web URL
   (e.g. `https://trutalk.app`) to the redirect allow-list, or email
   confirmation links will fail in production.

## 2. Hugging Face (Kimi K2)

1. Create an access token at huggingface.co/settings/tokens (read access is
   enough if you're using the shared Inference Providers router).
2. That's `HUGGINGFACE_API_TOKEN`.
3. If you provision a dedicated Inference Endpoint instead of using the
   shared router, set `HF_INFERENCE_ENDPOINT_URL` to that endpoint's URL —
   the client in `packages/llm` already checks for this and prefers it over
   the shared router when set.

## 3. Deploy apps/api (Docker)

The Dockerfile at `apps/api/Dockerfile` builds from the **repo root** (it
needs the workspace packages), so point your host at the root of the repo
and tell it to use that Dockerfile path — don't try to build from inside
`apps/api/` directly.

```bash
docker build -f apps/api/Dockerfile -t trutalk-api .
docker run -p 4000:4000 --env-file apps/api/.env trutalk-api
```

Environment variables to set on whatever host you use:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `HUGGINGFACE_API_TOKEN`, `HF_KIMI_K2_MODEL_ID`, `HF_INFERENCE_ENDPOINT_URL` (optional)
- `ALLOWED_ORIGINS` — set this to your deployed web URL(s), comma-separated,
  e.g. `https://trutalk.app`. **Do not leave this at the localhost default in
  production** — the API holds your HF token and the safety classifier, it
  should only ever accept requests from your own frontend.
- `CRISIS_LINE_PRIMARY_NAME` / `_PHONE`, `CRISIS_LINE_SECONDARY_NAME` / `_PHONE`
  — verify these are current, staffed resources before going live. This is
  the one thing on this whole checklist that isn't optional.

Health check endpoint for your host's readiness probe: `GET /health`.

## 4. Deploy apps/web (Vercel)

1. Import the repo into Vercel.
2. Set **Root Directory** to `apps/web` in the project settings — Vercel's
   monorepo support handles the pnpm workspace resolution automatically from
   there.
3. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_BASE_URL` → the deployed apps/api URL from step 3
4. Deploy. Vercel auto-detects Next.js once the root directory is set.

## 5. After both are live

- Update `ALLOWED_ORIGINS` on apps/api to the real Vercel URL if you hadn't
  set it yet, and redeploy the API.
- Sign up through the real deployed app once, end to end, to confirm the
  Supabase auth redirect URLs are configured correctly (this is the most
  common thing that silently breaks in production and works fine locally).
- Run `pnpm --filter @platform/safety eval` against production expectations
  before telling anyone this is ready for real conversations — see Session 6
  for why that matters.

## Not covered here (still open)
- Custom domain + SSL (Vercel and most container hosts handle this for you,
  but DNS is on you)
- CI/CD auto-deploy on push — `.github/workflows/ci.yml` currently only
  builds and typechecks, it doesn't deploy. Wiring that up depends on which
  host you pick for apps/api, so it's a follow-up once that decision is made.
- Monitoring/alerting on crisis-escalation volume — worth having before real
  users arrive, not before a first deploy.
