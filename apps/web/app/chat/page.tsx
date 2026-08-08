"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@platform/ui";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/components/NavBar";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  riskLevel?: "none" | "watch" | "high";
  resources?: { name: string; phone: string | null }[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Find or create an open chat_session for this user on mount.
  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: existing } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setSessionId(existing.id);
        return;
      }

      const { data: created, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (!error && created) setSessionId(created.id);
    })();
  }, [user, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !user || !sessionId || sending) return;

    const userMessage: DisplayMessage = { role: "user", content: input };
    const history = messages.map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          sessionId,
          message: userMessage.content,
          history,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content, riskLevel: data.riskLevel, resources: data.resources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong reaching the wellness coach. Please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6 pb-20">
      <h1 className="text-xl font-semibold">Wellness Chat</h1>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i}>
            <Card className={m.role === "user" ? "bg-calm-100" : ""}>{m.content}</Card>
            {m.riskLevel === "high" && m.resources && (
              <Card className="mt-2 border-red-200 bg-red-50">
                <p className="text-sm font-medium text-red-700">Support resources</p>
                <ul className="mt-1 space-y-1 text-sm text-red-700">
                  {m.resources.map((r, idx) => (
                    <li key={idx}>
                      {r.name}
                      {r.phone ? ` — ${r.phone}` : " (contact info not yet configured)"}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-calm-100 px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type how you're feeling..."
          disabled={sending || !sessionId}
        />
        <Button onClick={sendMessage} disabled={sending || !sessionId}>
          {sending ? "..." : "Send"}
        </Button>
      </div>

      <NavBar />
    </main>
  );
}
