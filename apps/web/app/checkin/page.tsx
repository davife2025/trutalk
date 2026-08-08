"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@trutalk/ui";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/components/NavBar";
import { AppHeader } from "@/components/AppHeader";

const MOODS = [
  { score: 1, emoji: "😞", label: "Rough" },
  { score: 2, emoji: "😕", label: "Low" },
  { score: 3, emoji: "😐", label: "Okay" },
  { score: 4, emoji: "🙂", label: "Good" },
  { score: 5, emoji: "😄", label: "Great" },
];

interface CheckinRow {
  id: string;
  mood_score: number;
  note: string | null;
  created_at: string;
}

export default function CheckinPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<CheckinRow[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  async function loadRecent() {
    if (!user) return;
    setLoadingRecent(true);
    const { data } = await supabase
      .from("mood_checkins")
      .select("id, mood_score, note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(7);
    setRecent(data ?? []);
    setLoadingRecent(false);
  }

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSave() {
    if (!user || selected === null || saving) return;
    setSaving(true);

    // RLS (mood_checkins_insert_own) enforces user_id = auth.uid() server-side,
    // so this direct browser insert is safe without going through apps/api.
    const { error } = await supabase
      .from("mood_checkins")
      .insert({ user_id: user.id, mood_score: selected, note: note.trim() || null });

    setSaving(false);
    if (!error) {
      setSelected(null);
      setNote("");
      loadRecent();
    }
  }

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <AppHeader />
      <h1 className="text-xl font-semibold">How are you feeling?</h1>

      <Card>
        <div className="flex justify-between">
          {MOODS.map((m) => (
            <button
              key={m.score}
              onClick={() => setSelected(m.score)}
              className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
                selected === m.score ? "bg-calm-100" : "hover:bg-calm-50"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-xs text-calm-600">{m.label}</span>
            </button>
          ))}
        </div>

        <textarea
          className="mt-4 w-full rounded-lg border border-calm-100 p-2 text-sm"
          rows={3}
          placeholder="Anything you want to note? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <Button
          className="mt-3 w-full"
          onClick={handleSave}
          disabled={selected === null || saving}
        >
          {saving ? "Saving..." : "Save check-in"}
        </Button>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium text-calm-600">Recent check-ins</h2>
        {loadingRecent ? (
          <p className="text-sm text-calm-600">Loading...</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-calm-600">No check-ins yet — your first one starts the trend.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <Card key={r.id} className="flex items-center justify-between">
                <span>
                  {MOODS.find((m) => m.score === r.mood_score)?.emoji} {r.note}
                </span>
                <span className="text-xs text-calm-600">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NavBar />
    </main>
  );
}
