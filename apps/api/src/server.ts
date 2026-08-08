import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health";
import { chatRoutes } from "./routes/chat";
import { checkinRoutes } from "./routes/checkins";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(healthRoutes);
  app.register(chatRoutes);
  app.register(checkinRoutes);

  return app;
}
