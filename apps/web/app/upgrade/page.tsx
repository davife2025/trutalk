"use client";

import { useState } from "react";
import { Button, Card } from "@trutalk/ui";
import { useAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { NavBar } from "@/components/NavBar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function UpgradePage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/billing/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error("Could not start checkout");
      const data = await res.json();

      // Paystack hosts the actual payment page — we redirect there rather
      // than handling card details ourselves.
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <AppHeader />
      <div>
        <h1 className="text-xl font-semibold">TruTalk Premium</h1>
        <p className="mt-1 text-sm text-calm-600">
          Check-ins, journaling, and the practice library are always free.
        </p>
      </div>

      <Card>
        <p className="text-sm font-medium text-calm-600">Free</p>
        <p className="mt-1 text-2xl font-semibold">₦0</p>
        <ul className="mt-3 space-y-1 text-sm text-calm-600">
          <li>• Mood check-ins</li>
          <li>• Journaling</li>
          <li>• Breathing, mindfulness &amp; sound library</li>
          <li>• 10 wellness chat messages / day</li>
        </ul>
      </Card>

      <Card className="border-calm-600">
        <p className="text-sm font-medium text-calm-600">Premium</p>
        <p className="mt-1 text-2xl font-semibold">
          ₦2,500<span className="text-sm font-normal text-calm-600">/month</span>
        </p>
        <ul className="mt-3 space-y-1 text-sm text-calm-600">
          <li>• Everything in Free</li>
          <li>• Unlimited wellness chat</li>
          <li>• Priority access to new features</li>
        </ul>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <Button className="mt-4 w-full" onClick={handleSubscribe} disabled={loading}>
          {loading ? "Redirecting to checkout..." : "Subscribe with Paystack"}
        </Button>
        <p className="mt-2 text-xs text-calm-600">
          Cards, bank transfer, or USSD via Paystack. Cancel anytime from Settings.
        </p>
      </Card>

      <NavBar />
    </main>
  );
}
