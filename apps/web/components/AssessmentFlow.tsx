"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@trutalk/ui";
import { useAuth } from "@/components/AuthProvider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface Question {
  id: number;
  text: string;
}

const RESPONSE_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

type ResultState =
  | { status: "idle" }
  | { status: "result"; totalScore: number; severity: string }
  | { status: "crisis"; content: string; resources: { name: string; phone: string | null }[] };

export function AssessmentFlow({ type, title }: { type: "phq9" | "gad7"; title: string }) {
  const { session } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState>({ status: "idle" });

  useEffect(() => {
    fetch(`${API_BASE_URL}/assessments/questions?type=${type}`)
      .then((res) => res.json())
      .then((data) => setQuestions(data.questions ?? []));
  }, [type]);

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit() {
    if (!session?.access_token || !allAnswered) return;
    setSubmitting(true);

    const responses = questions.map((q) => answers[q.id]);

    try {
      const res = await fetch(`${API_BASE_URL}/assessments/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, responses }),
      });
      const data = await res.json();

      if (data.crisisFlag) {
        setResult({ status: "crisis", content: data.content, resources: data.resources });
      } else {
        setResult({ status: "result", totalScore: data.totalScore, severity: data.severity });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result.status === "crisis") {
    return (
      <Card className="border-red-200 bg-red-50">
        <p className="text-sm text-red-800">{result.content}</p>
        <ul className="mt-3 space-y-1 text-sm font-medium text-red-700">
          {result.resources.map((r, i) => (
            <li key={i}>
              {r.name}
              {r.phone ? ` — ${r.phone}` : " (contact info not yet configured)"}
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  if (result.status === "result") {
    return (
      <Card>
        <p className="text-sm font-medium text-calm-600">{title} result</p>
        <p className="mt-1 text-2xl font-semibold">
          {result.totalScore} <span className="text-base font-normal capitalize text-calm-600">— {result.severity}</span>
        </p>
        <p className="mt-2 text-xs text-calm-600">
          This is a screening tool, not a diagnosis. If your score is concerning to you,
          consider talking to a professional — a therapist connection is coming to
          TruTalk, or reach out to a doctor directly.
        </p>
        <Link href="/assessments">
          <p className="mt-3 text-sm underline">Back to assessments</p>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-calm-600">
        Over the last 2 weeks, how often have you been bothered by the following?
      </p>
      {questions.map((q) => (
        <Card key={q.id}>
          <p className="text-sm font-medium">{q.text}</p>
          <div className="mt-3 flex flex-col gap-1">
            {RESPONSE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`q${q.id}`}
                  checked={answers[q.id] === opt.value}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Card>
      ))}
      <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
        {submitting ? "Submitting..." : "See my result"}
      </Button>
    </div>
  );
}
