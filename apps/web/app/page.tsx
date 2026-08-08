import { Button, Card } from "@platform/ui";

export default function HomePage() {
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
          This is a Session 1 scaffold. Mood check-in, breathing exercises, and
          the AI wellness chat all wire up here in subsequent sessions.
        </p>
      </Card>

      <Button variant="primary">Get started</Button>
    </main>
  );
}
