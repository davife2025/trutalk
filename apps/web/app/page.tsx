import Link from "next/link";
import { Button, Card } from "@platform/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-calm-900">Welcome</h1>
        <p className="mt-2 text-calm-600">
          A calm place to check in, breathe, and talk things through — not a
          replacement for professional care, just a place to start.
        </p>
      </div>

      <Card>
        <p className="text-sm text-calm-600">
          {user
            ? `Signed in as ${user.email}. Your wellness chat is ready.`
            : "Session 2: authentication is now wired end-to-end via Supabase."}
        </p>
      </Card>

      {user ? (
        <div className="flex flex-col gap-2">
          <Link href="/checkin">
            <Button variant="primary" className="w-full">
              Daily check-in
            </Button>
          </Link>
          <Link href="/chat">
            <Button variant="secondary" className="w-full">
              Wellness chat
            </Button>
          </Link>
          <Link href="/journal">
            <Button variant="secondary" className="w-full">
              Journal
            </Button>
          </Link>
        </div>
      ) : (
        <Link href="/auth/sign-up">
          <Button variant="primary" className="w-full">
            Get started
          </Button>
        </Link>
      )}
    </main>
  );
}
