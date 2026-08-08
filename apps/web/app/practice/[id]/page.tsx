"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card } from "@trutalk/ui";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/components/NavBar";

interface ContentRow {
  id: string;
  type: "breathing" | "mindfulness" | "journaling_prompt" | "sound" | "article";
  title: string;
  description: string | null;
  duration_seconds: number | null;
  media_url: string | null;
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function PracticePlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [item, setItem] = useState<ContentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("content_library")
        .select("id, type, title, description, duration_seconds, media_url")
        .eq("id", params.id)
        .single();
      setItem(data ?? null);
      setSecondsLeft(data?.duration_seconds ?? 0);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setDone(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function handleStart() {
    setDone(false);
    setRunning(true);
  }

  function handleReset() {
    setRunning(false);
    setDone(false);
    setSecondsLeft(item?.duration_seconds ?? 0);
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  if (!item) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-calm-600">This exercise couldn&apos;t be found.</p>
        <Button onClick={() => router.push("/practice")}>Back to Practice</Button>
      </main>
    );
  }

  const isTimed = item.type === "breathing" || item.type === "mindfulness";
  const isSound = item.type === "sound";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <button onClick={() => router.push("/practice")} className="text-left text-xs text-calm-600 underline">
        ← Back to Practice
      </button>

      <div>
        <h1 className="text-xl font-semibold">{item.title}</h1>
        {item.description && <p className="mt-1 text-sm text-calm-600">{item.description}</p>}
      </div>

      {isTimed && (
        <Card className="flex flex-col items-center gap-4 py-8">
          <div
            className={`h-32 w-32 rounded-full bg-calm-400 ${running ? "breathing-circle" : ""}`}
          />
          <p className="text-3xl font-semibold text-calm-900">{formatClock(secondsLeft)}</p>
          {done && <p className="text-sm text-calm-600">Nice work — session complete.</p>}
          <div className="flex gap-2">
            {!running && (
              <Button onClick={handleStart}>{secondsLeft === item.duration_seconds ? "Start" : "Resume"}</Button>
            )}
            {running && (
              <Button variant="secondary" onClick={() => setRunning(false)}>
                Pause
              </Button>
            )}
            <Button variant="ghost" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </Card>
      )}

      {isSound && (
        <Card className="flex flex-col items-center gap-4 py-8">
          {item.media_url ? (
            <audio controls className="w-full" src={item.media_url} />
          ) : (
            <p className="text-sm text-calm-600">
              Audio file not yet uploaded for this track — set <code>media_url</code> on this
              content_library row once you have licensed/produced audio.
            </p>
          )}
        </Card>
      )}

      {!isTimed && !isSound && (
        <Card>
          <p className="text-sm text-calm-600">
            This content type doesn&apos;t have a dedicated player yet.
          </p>
        </Card>
      )}

      <NavBar />
    </main>
  );
}
