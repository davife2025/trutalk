"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@platform/ui";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/components/NavBar";

interface ContentRow {
  id: string;
  type: "breathing" | "mindfulness" | "journaling_prompt" | "sound" | "article";
  title: string;
  description: string | null;
  duration_seconds: number | null;
  evidence_tag: "strong" | "moderate" | "engagement_only";
}

const TYPE_LABELS: Record<string, string> = {
  breathing: "Breathing",
  mindfulness: "Mindfulness",
  sound: "Sounds",
  article: "Read",
};

const EVIDENCE_LABELS: Record<string, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  engagement_only: "Engagement / retention",
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export default function PracticeLibraryPage() {
  const supabase = createClient();
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("content_library")
        .select("id, type, title, description, duration_seconds, evidence_tag")
        .neq("type", "journaling_prompt") // journaling prompts live on /journal, not here
        .order("type");
      setItems(data ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = items.reduce<Record<string, ContentRow[]>>((acc, item) => {
    (acc[item.type] ??= []).push(item);
    return acc;
  }, {});

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <div>
        <h1 className="text-xl font-semibold">Practice</h1>
        <p className="mt-1 text-sm text-calm-600">
          Short, evidence-backed exercises you can do right now.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-calm-600">Loading...</p>
      ) : (
        Object.entries(grouped).map(([type, rows]) => (
          <div key={type}>
            <h2 className="mb-2 text-sm font-medium text-calm-600">
              {TYPE_LABELS[type] ?? type}
            </h2>
            <div className="space-y-2">
              {rows.map((item) => (
                <Link key={item.id} href={`/practice/${item.id}`}>
                  <Card className="flex items-center justify-between hover:bg-calm-50">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-calm-600">
                        {formatDuration(item.duration_seconds)}
                        {item.duration_seconds ? " · " : ""}
                        {EVIDENCE_LABELS[item.evidence_tag]}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}

      <NavBar />
    </main>
  );
}
