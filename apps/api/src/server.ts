import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health";
import { chatRoutes } from "./routes/chat";
import { checkinRoutes } from "./routes/checkins";
import { env } from "./config/env";

export function buildServer() {
  const app = Fastify({ logger: true });

  // Locked to configured origins (ALLOWED_ORIGINS env var) rather than
  // `origin: true` — this API holds the HF token and talks to the safety
  // classifier, so it should never accept requests from an arbitrary origin.
  app.register(cors, { origin: env.allowedOrigins });
  app.register(healthRoutes);
  app.register(chatRoutes);
  app.register(checkinRoutes);

  return app;
}
