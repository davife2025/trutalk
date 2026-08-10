-- Subscription state, set ONLY by verified Paystack payment events (webhook +
-- server-side verify call) — never directly by the client. This is the
-- concrete answer to "how does the platform earn": a premium tier gates
-- unlimited AI chat behind a monthly Paystack subscription, enforced in
-- apps/api's /chat/message route (see Session 12).

create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'none' check (status in ('none', 'active', 'past_due', 'canceled')),
  plan text,
  paystack_customer_code text,
  paystack_subscription_code text,
  -- Needed to let a user manage/cancel their own subscription via Paystack's
  -- customer-facing management link.
  paystack_email_token text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can READ their own subscription status (to show it in Settings /
-- gate UI), but cannot write to this table directly — only apps/api's
-- service-role client does that, and only after verifying a real payment
-- with Paystack. Granting insert/update to `authenticated` here would let
-- anyone grant themselves a free subscription.
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Lightweight audit log of payment-related events, for debugging and fraud
-- review. Service-role only, same reasoning as crisis_escalation_events.
create table if not exists public.payment_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  paystack_reference text,
  raw_status text,
  created_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;
-- No policies for `authenticated` — service role only.
