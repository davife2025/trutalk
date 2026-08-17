import Stripe from "stripe";
import { env } from "../config/env";

let cachedClient: Stripe | null = null;

/**
 * Lazily constructs the Stripe client — same reasoning as the Kimi K2 and
 * Gemini clients: avoids reading process.env before dotenv has finished
 * loading, which previously caused a real server-boot crash (Session 8).
 */
function getStripeClient(): Stripe {
  if (!cachedClient) {
    cachedClient = new Stripe(env.stripeSecretKey);
  }
  return cachedClient;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

/**
 * Starts a Stripe Checkout session for the subscription. Uses Stripe's
 * hosted Checkout page (like Paystack's hosted checkout) — we never touch
 * card details directly.
 *
 * NOTE ON CURRENCY: this charges in USD, not NGN. A Stripe account backing
 * a Nigerian business is necessarily a foreign (typically US) entity — see
 * the LLC-workaround research — and such accounts don't reliably support
 * NGN as a presentment currency. Confirm your actual Stripe account's
 * supported currencies once it's approved; USD is the safe default.
 */
export async function createCheckoutSession(email: string, userId: string): Promise<CheckoutSessionResult> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price: env.stripePriceIdMonthly, quantity: 1 }],
    success_url: `${env.appWebUrl}/billing/callback?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appWebUrl}/upgrade`,
    // Ties the session back to the TruTalk user — read out of the webhook
    // event later so we know whose subscription to update.
    client_reference_id: userId,
    metadata: { userId },
  });

  if (!session.url) {
    throw new Error("Stripe checkout session created without a URL");
  }

  return { checkoutUrl: session.url, sessionId: session.id };
}

/**
 * Verifies a Stripe webhook actually came from Stripe. Uses the official
 * SDK's constructEvent — Stripe's signature scheme (timestamped, HMAC-SHA256,
 * with a tolerance window to prevent replay) is meaningfully more involved
 * than Paystack's, so this deliberately does NOT hand-roll it the way
 * Paystack's verifyWebhookSignature does; using the maintained SDK is the
 * safer choice for something this fraud-critical.
 *
 * Returns the verified event, or null if verification failed for any reason
 * (never throws to the caller).
 */
export function constructVerifiedEvent(rawBody: Buffer, signatureHeader: string | undefined): Stripe.Event | null {
  if (!signatureHeader) return null;
  try {
    return getStripeClient().webhooks.constructEvent(rawBody, signatureHeader, env.stripeWebhookSecret);
  } catch {
    return null;
  }
}
