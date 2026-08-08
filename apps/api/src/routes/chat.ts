import type { FastifyInstance } from "fastify";
import { classifyMessageLayered, CRISIS_RESOURCES, CRISIS_RESPONSE_MESSAGE } from "@trutalk/safety";
import { getWellnessCoachReply, classifyMessageRisk } from "../services/llmService";
import { supabaseAdmin } from "../services/supabaseAdmin";

interface ChatRequestBody {
  userId: string;
  sessionId: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequestBody }>("/chat/message", async (request, reply) => {
    const { userId, sessionId, message, history = [] } = request.body;

    if (!message?.trim()) {
      return reply.code(400).send({ error: "message is required" });
    }

    // ---- STEP 1: safety classification runs BEFORE anything else. ----
    // Two layers: fast keyword pass, then an LLM-based pass (see
    // packages/safety's classifyMessageLayered) for anything the keyword
    // pass didn't already catch — this is what closes the gap Session 6's
    // eval harness measured (7 of 8 indirect/Pidgin high-risk cases missed
    // by keyword matching alone).
    const classification = await classifyMessageLayered(message, classifyMessageRisk);

    if (classification.riskLevel === "high") {
      // CRITICAL: the crisis response must reach the user no matter what
      // happens with logging. Award this to the user FIRST, then log the
      // escalation asynchronously (fire-and-forget). Previously this awaited
      // the Supabase insert before replying — meaning a slow or unreachable
      // database would silently delay or block the single most important
      // response in this app. Verified locally: with an unreachable Supabase
      // host, the old code hung indefinitely and the user got nothing.
      reply.send({
        role: "assistant",
        content: CRISIS_RESPONSE_MESSAGE,
        riskLevel: "high",
        resources: CRISIS_RESOURCES,
      });

      supabaseAdmin
        .from("crisis_escalation_events")
        .insert({
          user_id: userId,
          session_id: sessionId,
          risk_level: "high",
          resource_shown: CRISIS_RESOURCES[0]?.name ?? "unknown",
          classification_source: classification.source,
        })
        .then(({ error }) => {
          if (error) app.log.error({ error }, "Failed to log crisis escalation event");
        });

      return;
    }

    // ---- STEP 2: normal wellness-coach conversation flow. ----
    let reply_: string;
    try {
      reply_ = await getWellnessCoachReply([...history, { role: "user", content: message }]);
    } catch (err) {
      // Don't leak internal error details (provider name, HTTP status, etc.)
      // to the client, and don't let an LLM outage surface as a raw 500 —
      // discovered by actually testing against an unreachable LLM backend.
      app.log.error({ err }, "Wellness coach LLM call failed");
      return reply.send({
        role: "assistant",
        content:
          "I'm having trouble responding right now — this looks like a temporary connection " +
          "issue on my end, not something you did. Please try again in a moment.",
        riskLevel: classification.riskLevel,
        degraded: true,
      });
    }

    reply.send({ role: "assistant", content: reply_, riskLevel: classification.riskLevel });

    supabaseAdmin
      .from("chat_messages")
      .insert([
        { session_id: sessionId, user_id: userId, role: "user", content: message, risk_flag: classification.riskLevel },
        { session_id: sessionId, user_id: userId, role: "assistant", content: reply_, risk_flag: "none" },
      ])
      .then(({ error }) => {
        if (error) app.log.error({ error }, "Failed to persist chat messages");
      });
  });
}
