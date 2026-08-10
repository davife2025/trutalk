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
  // ---- Paystack / billing ----
  paystackSecretKey: required("PAYSTACK_SECRET_KEY", process.env.PAYSTACK_SECRET_KEY),
  // Created via the Paystack dashboard (Products → Plans) or the Create Plan
  // API — this is NOT something apps/api creates dynamically, it's a
  // one-time setup step. Put the resulting plan_code here.
  paystackPlanCodeMonthly: required("PAYSTACK_PLAN_CODE_MONTHLY", process.env.PAYSTACK_PLAN_CODE_MONTHLY),
  // Base URL of the deployed web app, used to build the Paystack callback_url
  // (where Paystack redirects the browser after checkout).
  appWebUrl: process.env.APP_WEB_URL ?? "http://localhost:3000",
  // Free-tier daily chat message cap. Crisis responses are NEVER gated by
  // this — see routes/chat.ts, the check runs strictly after safety
  // classification and never applies to high-risk messages.
  freeDailyMessageLimit: Number(process.env.FREE_DAILY_MESSAGE_LIMIT ?? 10),
};
