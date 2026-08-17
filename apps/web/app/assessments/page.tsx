"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@trutalk/ui";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { NavBar } from "@/components/NavBar";

interface AssessmentRow {
  type: "phq9" | "gad7";
  total_score: number;
  severity: string;
  created_at: string;
}

const LABELS: Record<"phq9" | "gad7", { name: string; blurb: string }> = {
  phq9: { name: "PHQ-9", blurb: "9-question depression screening — the clinical standard, validated in Nigeria." },
  gad7: { name: "GAD-7", blurb: "7-question anxiety screening — the clinical standard, validated in Nigeria." },
};

export default function AssessmentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [latest, setLatest] = useState<Record<string, AssessmentRow | null>>({ phq9: null, gad7: null });

  useEffect(() => {
    if (!user) return;
    (async () => {
      for (const type of ["phq9", "gad7"] as const) {
        const { data } = await supabase
          .from("assessments")
          .select("type, total_score, severity, created_at")
          .eq("user_id", user.id)
          .eq("type", type)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setLatest((prev) => ({ ...prev, [type]: data }));
      }
    })();
  }, [user, supabase]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <AppHeader />
      <div>
        <h1 className="text-xl font-semibold">Assessments</h1>
        <p className="mt-1 text-sm text-calm-600">
          Validated screening tools, the same ones used in professional mental health
          care — not a substitute for diagnosis, but a real way to track how you're
          doing over time.
        </p>
      </div>

      {(["phq9", "gad7"] as const).map((type) => (
        <Card key={type}>
          <p className="font-medium">{LABELS[type].name}</p>
          <p className="mt-1 text-sm text-calm-600">{LABELS[type].blurb}</p>
          {latest[type] && (
            <p className="mt-2 text-xs text-calm-600">
              Last taken {new Date(latest[type]?.created_at ?? "").toLocaleDateString()} — score{" "}
              {latest[type]?.total_score}, {latest[type]?.severity}
            </p>
          )}
          <Link href={`/assessments/${type}`}>
            <p className="mt-3 inline-block text-sm font-medium text-calm-900 underline">
              {latest[type] ? "Take again" : "Take now"}
            </p>
          </Link>
        </Card>
      ))}

      <NavBar />
    </main>
  );
}
