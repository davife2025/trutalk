-- Validated clinical screening: PHQ-9 (depression) and GAD-7 (anxiety) — the
-- actual clinical-standard instruments used across professional mental
-- health apps and validated specifically in Nigerian populations (Adewuya
-- et al. 2006, Obafemi Awolowo University students, Cronbach's alpha 0.85).
-- This is what the platform was missing that made it feel like a generic
-- wellness app rather than something that actually measures and tracks the
-- problem it claims to address.

create table if not exists public.assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('phq9', 'gad7')),
  responses jsonb not null, -- array of 9 (phq9) or 7 (gad7) ints, 0-3 each
  total_score integer not null,
  severity text not null,
  created_at timestamptz not null default now()
);

alter table public.assessments enable row level security;

-- Users can read their own assessment history (for the trend view), but
-- inserts happen exclusively through apps/api's service-role client — never
-- directly from the browser. This is because PHQ-9 item 9 (thoughts of
-- self-harm) needs the same crisis-escalation handling as chat messages,
-- and that logic lives server-side; routing submission through the API
-- keeps it in one auditable place rather than duplicating crisis logic
-- client-side.
create policy "assessments_select_own" on public.assessments
  for select using (auth.uid() = user_id);

-- Extend crisis_escalation_events to allow assessments as a source, alongside
-- the existing keyword/llm/llm-unavailable-fallback sources from the chat
-- classifier.
alter table public.crisis_escalation_events drop constraint if exists crisis_escalation_events_risk_level_check;
alter table public.crisis_escalation_events add constraint crisis_escalation_events_risk_level_check
  check (risk_level in ('watch', 'high'));

alter table public.crisis_escalation_events
  drop constraint if exists crisis_escalation_events_classification_source_check;
alter table public.crisis_escalation_events add constraint crisis_escalation_events_classification_source_check
  check (classification_source in ('keyword', 'llm', 'llm-unavailable-fallback', 'assessment'));
