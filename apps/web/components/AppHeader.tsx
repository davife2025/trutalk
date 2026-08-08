import Link from "next/link";

/**
 * Lightweight wordmark header shown across authenticated screens. Kept
 * intentionally simple — swap for a real logo/mark once design work resumes.
 */
export function AppHeader() {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-calm-600" />
      <span className="text-sm font-semibold tracking-tight text-calm-900">TruTalk</span>
    </Link>
  );
}
