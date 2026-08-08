"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@platform/ui";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/components/NavBar";
import { AppHeader } from "@/components/AppHeader";

interface JournalRow {
  id: string;
  prompt: string | null;
  content: string;
  created_at: string;
}

export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [prompt, setPrompt] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<JournalRow[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  async function loadPrompt() {
    const { data } = await supabase
      .from("content_library")
      .select("title")
      .eq("type", "journaling_prompt")
      .limit(10);

    if (data && data.length > 0) {
      const pick = data[Math.floor(Math.random() * data.length)];
      setPrompt(pick.title);
    } else {
      setPrompt("What's one thing on your mind right now?");
    }
  }

  async function loadEntries() {
    if (!user) return;
    setLoadingEntries(true);
    const { data } = await supabase
      .from("journal_entries")
      .select("id, prompt, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setEntries(data ?? []);
    setLoadingEntries(false);
  }

  useEffect(() => {
    loadPrompt();
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSave() {
    if (!user || !content.trim() || saving) return;
    setSaving(true);

    const { error } = await supabase
      .from("journal_entries")
      .insert({ user_id: user.id, prompt, content: content.trim() });

    setSaving(false);
    if (!error) {
      setContent("");
      loadPrompt();
      loadEntries();
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("journal_entries").delete().eq("id", id);
    loadEntries();
  }

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <AppHeader />
      <h1 className="text-xl font-semibold">Journal</h1>

      <Card>
        <p className="text-sm font-medium text-calm-900">{prompt}</p>
        <textarea
          className="mt-3 w-full rounded-lg border border-calm-100 p-2 text-sm"
          rows={5}
          placeholder="Write freely — this is just for you."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="mt-2 flex items-center justify-between">
          <button onClick={loadPrompt} className="text-xs text-calm-600 underline">
            New prompt
          </button>
          <Button onClick={handleSave} disabled={!content.trim() || saving}>
            {saving ? "Saving..." : "Save entry"}
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium text-calm-600">Past entries</h2>
        {loadingEntries ? (
          <p className="text-sm text-calm-600">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-calm-600">Nothing here yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <Card key={e.id}>
                {e.prompt && <p className="text-xs italic text-calm-600">{e.prompt}</p>}
                <p className="mt-1 text-sm">{e.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-calm-600">
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-xs text-red-600 underline"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NavBar />
    </main>
  );
}
