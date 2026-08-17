"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card } from "@trutalk/ui";
import { useAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function CallbackContent() {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"checking" | "active" | "failed">("checking");

  useEffect(() => {
    const reference = searchParams.get("reference");
    const provider = searchParams.get("provider");
    if (!session?.access_token) return;

    // ---- Paystack: reference-based verify, calls Paystack directly. ----
    if (reference) {
      (async () => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/billing/verify?reference=${encodeURIComponent(reference)}`,
            { headers: { Authorization: `Bearer ${session.access_token}` } }
          );
          const data = await res.json();
          setStatus(data.status === "active" ? "active" : "failed");
        } catch {
          setStatus("failed");
        }
      })();
      return;
    }

    // ---- Stripe: no equivalent "verify by session id" endpoint — the
    // webhook (checkout.session.completed) is the source of truth and fires
    // independently of this redirect. Poll /billing/status a few times
    // since the webhook may land a moment before or after the browser
    // redirect completes, rather than building a second verify endpoint
    // that would just duplicate what the webhook already does reliably. ----
    if (provider === "stripe") {
      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        try {
          const res = await fetch(`${API_BASE_URL}/billing/status`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const data = await res.json();
          if (data.status === "active") {
            setStatus("active");
            return;
          }
        } catch {
          // fall through to retry/give up below
        }
        if (attempts < 5) {
          setTimeout(poll, 1500);
        } else {
          setStatus("failed");
        }
      };
      poll();
    }
  }, [searchParams, session]);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <AppHeader />
      <Card>
        {status === "checking" && <p className="text-sm text-calm-600">Confirming your payment...</p>}
        {status === "active" && (
          <>
            <p className="text-lg font-semibold">You're on Premium 🎉</p>
            <p className="mt-1 text-sm text-calm-600">Unlimited wellness chat is unlocked.</p>
            <Button className="mt-4 w-full" onClick={() => router.push("/chat")}>
              Go to chat
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <p className="text-lg font-semibold">Payment not confirmed</p>
            <p className="mt-1 text-sm text-calm-600">
              If you completed checkout, this may just need a moment — check Settings shortly.
              Otherwise, no charge was made.
            </p>
            <Button className="mt-4 w-full" onClick={() => router.push("/upgrade")}>
              Try again
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}

export default function BillingCallbackPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading...</main>}>
      <CallbackContent />
    </Suspense>
  );
}
