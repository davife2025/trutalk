-- Adds Stripe as a second payment provider alongside Paystack. Both write
-- into the same subscriptions table — payment_provider distinguishes which
-- one a given row came from. This is deliberate: Stripe doesn't support
-- direct Nigerian merchant accounts (confirmed 2026), so Paystack remains
-- the primary, actually-usable path for Nigerian customers, while Stripe
-- (via a US LLC) covers international cards / hackathon eligibility.

alter table public.subscriptions
  add column if not exists payment_provider text not null default 'paystack'
    check (payment_provider in ('paystack', 'stripe'));

alter table public.subscriptions
  add column if not exists stripe_customer_id text;

alter table public.subscriptions
  add column if not exists stripe_subscription_id text;

-- payment_events already has a generic event_type/paystack_reference shape
-- from migration 0005 — reused as-is for Stripe events too, since it's
-- already provider-agnostic (event_type + a reference string + raw_status).
