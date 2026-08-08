"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@trutalk/ui";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/components/NavBar";
import { AppHeader } from "@/components/AppHeader";

const LOCALES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pcm", label: "Pidgin" },
  { value: "yo", label: "Yoruba" },
  { value: "ha", label: "Hausa" },
  { value: "ig", label: "Igbo" },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [locale, setLocale] = useState("en");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, locale")
        .eq("id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setLocale(data.locale ?? "en");
      }
      setLoadingProfile(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null, locale })
      .eq("id", user.id);
    setSaving(false);
    if (!error) setSaved(true);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  }

  if (authLoading || loadingProfile) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <AppHeader />
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-calm-600">Email</label>
          <p className="text-sm">{user?.email}</p>
        </div>

        <div>
          <label className="text-xs text-calm-600">Display name</label>
          <input
            className="mt-1 w-full rounded-lg border border-calm-100 px-3 py-2 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
          />
        </div>

        <div>
          <label className="text-xs text-calm-600">Language</label>
          <select
            className="mt-1 w-full rounded-lg border border-calm-100 px-3 py-2 text-sm"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            {LOCALES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-calm-600">
            Stored on your profile now — actual UI translation is a future session.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
        </Button>
      </Card>

      <Card>
        <p className="text-sm text-calm-600">
          Need to talk to someone right now instead of the AI companion? Support resources
          are always available from the chat screen if things feel urgent.
        </p>
      </Card>

      <Button variant="secondary" onClick={handleSignOut} disabled={signingOut}>
        {signingOut ? "Signing out..." : "Sign out"}
      </Button>

      <NavBar />
    </main>
  );
}
