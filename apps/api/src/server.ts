import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { healthRoutes } from "./routes/health";
import { chatRoutes } from "./routes/chat";
import { checkinRoutes } from "./routes/checkins";
import { billingRoutes } from "./routes/billing";
import { env } from "./config/env";

export function buildServer() {
  const app = Fastify({ logger: true });

  // Locked to configured origins (ALLOWED_ORIGINS env var) rather than
  // `origin: true` — this API holds the HF token and talks to the safety
  // classifier, so it should never accept requests from an arbitrary origin.
  app.register(cors, { origin: env.allowedOrigins });

  // Basic abuse/cost protection — this API calls a paid LLM per request, and
  // combined with the (now-fixed) missing auth check found in Session 11's
  // review, having no rate limit at all was a real gap. Per-IP is a coarse
  // starting point; revisit with per-user limits once traffic patterns exist.
  app.register(rateLimit, {
    max: 30,
    timeWindow: "1 minute",
  });

  // Captures the raw request body buffer on every request (in addition to
  // still parsing JSON normally into request.body) — the Paystack webhook
  // handler needs the exact raw bytes to verify the signature; a
  // re-serialized JSON body would not reliably match Paystack's original
  // HMAC. This replaces Fastify's default JSON parser but preserves its
  // normal behavior for every other route.
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    req.rawBody = body as Buffer;
    if (body.length === 0) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body.toString("utf8")));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  app.register(healthRoutes);
  app.register(chatRoutes);
  app.register(checkinRoutes);
  app.register(billingRoutes);

  return app;
}
