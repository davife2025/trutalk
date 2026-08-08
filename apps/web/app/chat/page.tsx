"use client";

import { useState } from "react";
import { Button, Card } from "@platform/ui";

/**
 * Session-1 placeholder chat screen. Wires up to POST {API_BASE_URL}/chat/message
 * in the next session, once auth (Supabase) is connected end-to-end.
 */
export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Wellness Chat</h1>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <Card key={i} className={m.role === "user" ? "bg-calm-100" : ""}>
            {m.content}
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-calm-100 px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type how you're feeling..."
        />
        <Button
          onClick={() => {
            if (!input.trim()) return;
            setMessages((prev) => [...prev, { role: "user", content: input }]);
            setInput("");
            // API wiring lands in the next session.
          }}
        >
          Send
        </Button>
      </div>
    </main>
  );
}
