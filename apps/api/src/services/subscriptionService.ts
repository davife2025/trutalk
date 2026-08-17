import { supabaseAdmin } from "./supabaseAdmin";
import { env } from "../config/env";

export interface SubscriptionStatus {
  status: "none" | "active" | "past_due" | "canceled";
  plan: string | null;
  currentPeriodEnd: string | null;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("status, plan, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return { status: "none", plan: null, currentPeriodEnd: null };

  return {
    status: data.status,
    plan: data.plan,
    currentPeriodEnd: data.current_period_end,
  };
}

/**
 * Upserts subscription state — called from both the client-facing verify
 * endpoint (immediate feedback right after checkout) and the webhook handler
 * (source of truth for renewals/cancellations that happen with no user
 * present in the app). Both paths funnel through here so the update logic
 * only lives in one place.
 */
export async function upsertSubscription(params: {
  userId: string;
  status: "active" | "past_due" | "canceled";
  plan?: string | null;
  paymentProvider?: "paystack" | "stripe";
  paystackCustomerCode?: string | null;
  paystackSubscriptionCode?: string | null;
  paystackEmailToken?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
}) {
  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: params.userId,
      status: params.status,
      plan: params.plan ?? undefined,
      payment_provider: params.paymentProvider ?? undefined,
      paystack_customer_code: params.paystackCustomerCode ?? undefined,
      paystack_subscription_code: params.paystackSubscriptionCode ?? undefined,
      paystack_email_token: params.paystackEmailToken ?? undefined,
      stripe_customer_id: params.stripeCustomerId ?? undefined,
      stripe_subscription_id: params.stripeSubscriptionId ?? undefined,
      current_period_end: params.currentPeriodEnd ?? undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return { error };
}

/**
 * Counts today's user-authored chat messages for the free-tier daily cap.
 * Only counts `role = 'user'` rows so assistant replies don't count against
 * the user's own quota.
 */
export async function countTodaysMessages(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", startOfDay.toISOString());

  return count ?? 0;
}

export async function isWithinFreeQuota(userId: string): Promise<boolean> {
  const count = await countTodaysMessages(userId);
  return count < env.freeDailyMessageLimit;
}
