import crypto from "node:crypto";
import { env } from "../config/env";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/**
 * Starts a Paystack checkout for the monthly subscription plan. Paystack
 * hosts the actual payment page (card entry, USSD, bank transfer, etc.) —
 * we never touch card details directly, which keeps PCI scope minimal.
 *
 * Passing `plan` here is what makes this a RECURRING subscription rather
 * than a one-off charge: after the first successful payment, Paystack
 * automatically subscribes the customer to that plan and handles renewal
 * billing, retries, and dunning on its own schedule — we just listen for
 * webhook events to keep our own `subscriptions` table in sync.
 */
export async function initializeSubscriptionTransaction(
  email: string,
  userId: string
): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      plan: env.paystackPlanCodeMonthly,
      callback_url: `${env.appWebUrl}/billing/callback`,
      // Lets the webhook handler and the verify endpoint tie the payment
      // back to the right TruTalk user without guessing from email alone.
      metadata: { userId },
    }),
  });

  if (!res.ok) {
    throw new Error(`Paystack initialize failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    status: boolean;
    data?: { authorization_url: string; access_code: string; reference: string };
  };

  if (!data.status || !data.data) {
    throw new Error("Paystack initialize returned an unsuccessful response");
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
}

export interface PaystackVerifyResult {
  success: boolean;
  customerCode?: string;
  customerEmail?: string;
  subscriptionCode?: string;
  planCode?: string;
  emailToken?: string;
}

/**
 * Confirms a transaction actually succeeded, server-side, directly with
 * Paystack — never trust a client's claim that payment succeeded just
 * because it redirected back with a reference in the URL.
 */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.paystackSecretKey}` },
  });

  if (!res.ok) {
    return { success: false };
  }

  const data = (await res.json()) as {
    status: boolean;
    data?: {
      status: string;
      customer?: { customer_code?: string; email?: string; email_token?: string };
      plan?: string;
      // Present when the transaction was for a plan and Paystack created
      // the subscription automatically.
      subscription_code?: string;
    };
  };

  if (!data.status || data.data?.status !== "success") {
    return { success: false };
  }

  return {
    success: true,
    customerCode: data.data.customer?.customer_code,
    customerEmail: data.data.customer?.email,
    emailToken: data.data.customer?.email_token,
    subscriptionCode: data.data.subscription_code,
    planCode: data.data.plan,
  };
}

/**
 * Verifies a Paystack webhook actually came from Paystack, not a forged
 * request. Paystack signs the raw request body with your secret key using
 * HMAC-SHA512 and sends the hex digest in the `x-paystack-signature` header.
 * Skipping this check would mean anyone could POST a fake "charge.success"
 * event and grant themselves a free subscription — this is the single most
 * important line in the billing system.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;

  const expected = crypto.createHmac("sha512", env.paystackSecretKey).update(rawBody).digest("hex");

  // Constant-time comparison to avoid timing attacks on the signature check.
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
