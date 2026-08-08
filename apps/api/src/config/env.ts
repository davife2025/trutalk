import "dotenv/config";

function required(name: string, value: string | undefined): string {
  if (!value) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing ${name} — set it in .env before this feature is used.`);
    return "";
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required("SUPABASE_URL", process.env.SUPABASE_URL),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  huggingFaceApiToken: required("HUGGINGFACE_API_TOKEN", process.env.HUGGINGFACE_API_TOKEN),
  // Comma-separated list, e.g. "https://trutalk.app,https://staging.trutalk.app".
  // Falls back to localhost dev origins only — never defaults to "*" in production.
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
