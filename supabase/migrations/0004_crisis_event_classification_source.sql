-- Tracks which layer caught each crisis escalation (keyword / llm / fail-safe).
-- This is the operational signal for whether the LLM classifier layer is
-- actually doing meaningful work, or whether it's failing open to fail-safe
-- often enough to investigate (e.g. HF token issues, rate limits, outages).

alter table public.crisis_escalation_events
  add column if not exists classification_source text
  check (classification_source in ('keyword', 'llm', 'llm-unavailable-fallback'));
