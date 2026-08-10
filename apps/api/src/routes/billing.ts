import type { FastifyInstance } from "fastify";
import { getAuthenticatedUserId } from "../plugins/auth";
import {
  initializeSubscriptionTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} from "../services/paystackService";
import { getSubscriptionStatus, upsertSubscription } from "../services/subscriptionService";
import { supabaseAdmin } from "../services/supabaseAdmin";

interface VerifyQuery {
  reference: string;
}

export async function billingRoutes(app: FastifyInstance) {
  // ---- Start a subscription checkout ----
  app.post("/billing/initialize", async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: "Missing or invalid authorization token" });

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser.user?.email;
    if (!email) return reply.code(400).send({ error: "No email on file for this account" });

    try {
      const result = await initializeSubscriptionTransaction(email, userId);
      return reply.send({ authorizationUrl: result.authorizationUrl });
    } catch (err) {
      app.log.error({ err }, "Paystack initialize failed");
      return reply.code(502).send({ error: "Could not start checkout — please try again" });
    }
  });

  // ---- Client-facing verify, called right after the Paystack redirect for
  // immediate UI feedback. The webhook below is the durable source of truth
  // for anything that happens later (renewals, cancellations) with no user
  // present in the app — this endpoint is a UX convenience, not the only
  // path that updates subscription state. ----
  app.get<{ Querystring: VerifyQuery }>("/billing/verify", async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: "Missing or invalid authorization token" });

    const { reference } = request.query;
    if (!reference) return reply.code(400).send({ error: "reference is required" });

    const result = await verifyTransaction(reference);
    if (!result.success) {
      return reply.send({ status: "failed" });
    }

    await upsertSubscription({
      userId,
      status: "active",
      plan: result.planCode ?? "monthly",
      paystackCustomerCode: result.customerCode,
      paystackSubscriptionCode: result.subscriptionCode,
      paystackEmailToken: result.emailToken,
      // Paystack's subscription webhook events carry the authoritative
      // next-billing-date; this is a reasonable optimistic estimate for
      // immediate UI purposes only, and gets corrected by the webhook.
      currentPeriodEnd: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return reply.send({ status: "active" });
  });

  // ---- Current subscription status, for gating UI (e.g. Settings, an
  // upgrade prompt in chat) ----
  app.get("/billing/status", async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: "Missing or invalid authorization token" });

    const status = await getSubscriptionStatus(userId);
    return reply.send(status);
  });

  // ---- Paystack webhook — the durable source of truth for subscription
  // lifecycle events (renewals, failed renewals, cancellations). ----
  app.post("/billing/webhook", async (request, reply) => {
    const signature = request.headers["x-paystack-signature"] as string | undefined;
    const rawBody = request.rawBody;

    if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
      app.log.warn("Rejected webhook with invalid or missing Paystack signature");
      return reply.code(401).send({ error: "Invalid signature" });
    }

    const event = request.body as {
      event: string;
      data: {
        customer?: { customer_code?: string; email?: string; email_token?: string };
        subscription_code?: string;
        plan?: { plan_code?: string } | string;
        status?: string;
        metadata?: { userId?: string };
        reference?: string;
        next_payment_date?: string;
      };
    };

    // Always ack quickly and log — Paystack retries on non-2xx, and we don't
    // want a transient issue in our own logic to cause duplicate retries.
    reply.send({ received: true });

    const userId = event.data.metadata?.userId;

    await supabaseAdmin.from("payment_events").insert({
      user_id: userId ?? null,
      event_type: event.event,
      paystack_reference: event.data.reference ?? null,
      raw_status: event.data.status ?? null,
    });

    if (!userId) {
      app.log.warn({ event: event.event }, "Webhook event with no userId in metadata — cannot link to a user");
      return;
    }

    const planCode = typeof event.data.plan === "string" ? event.data.plan : event.data.plan?.plan_code;

    switch (event.event) {
      case "charge.success":
      case "subscription.create":
        await upsertSubscription({
          userId,
          status: "active",
          plan: planCode ?? "monthly",
          paystackCustomerCode: event.data.customer?.customer_code,
          paystackSubscriptionCode: event.data.subscription_code,
          paystackEmailToken: event.data.customer?.email_token,
          currentPeriodEnd: event.data.next_payment_date ?? null,
        });
        break;

      case "invoice.payment_failed":
        await upsertSubscription({ userId, status: "past_due" });
        break;

      case "subscription.disable":
      case "subscription.not_renew":
        await upsertSubscription({ userId, status: "canceled" });
        break;

      default:
        // Unhandled event types are logged (via payment_events above) but
        // don't change subscription state — safer than guessing.
        break;
    }
  });
}
