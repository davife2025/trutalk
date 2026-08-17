import type { FastifyInstance } from "fastify";
import { classifyMessageLayered, CRISIS_RESOURCES, CRISIS_RESPONSE_MESSAGE } from "@trutalk/safety";
import { getWellnessCoachReply } from "../services/llmService";
import { classifyMessageRiskGemini } from "../services/geminiClassifierService";
import { supabaseAdmin } from "../services/supabaseAdmin";
import { getAuthenticatedUserId } from "../plugins/auth";
import { getSubscriptionStatus, isWithinFreeQuota } from "../services/subscriptionService";

interface ChatRequestBody {
  // userId is still accepted for backward compatibility with older client
  // builds during rollout, but is NEVER trusted — see the auth check below.
  userId?: string;
  sessionId: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 20;

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequestBody }>("/chat/message", async (request, reply) => {
    // ---- AUTH: verify the caller, never trust request.body.userId. ----
    // See apps/api/src/plugins/auth.ts for the full story on why this was
    // added — every route previously trusted a client-supplied userId with
    // no verification at all, which was a real vulnerability under a
    // service-role-key API.
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return reply.code(401).send({ error: "Missing or invalid authorization token" });
    }

    const { sessionId, message, history = [] } = request.body;

    if (!message?.trim()) {
      return reply.code(400).send({ error: "message is required" });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return reply.code(400).send({ error: `message exceeds ${MAX_MESSAGE_LENGTH} characters` });
    }
    if (history.length > MAX_HISTORY_MESSAGES) {
      return reply.code(400).send({ error: `history exceeds ${MAX_HISTORY_MESSAGES} messages` });
    }
    if (!sessionId) {
      return reply.code(400).send({ error: "sessionId is required" });
    }

    // ---- Verify the session actually belongs to the authenticated user. ----
    // Defense in depth: even with userId now verified, a user could still
    // try to write into another user's chat_sessions row by passing their
    // sessionId. This confirms ownership before proceeding.
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError || !session) {
      return reply.code(403).send({ error: "sessionId does not belong to the authenticated user" });
    }

    // ---- STEP 1: safety classification runs BEFORE anything else. ----
    // Two layers: fast keyword pass, then a Gemini-based second pass (see
    // packages/gemini + packages/safety's classifyMessageLayered) for
    // anything the keyword pass didn't already catch — this is what closes
    // the gap Session 6's eval harness measured (7 of 8 indirect/Pidgin
    // high-risk cases missed by keyword matching alone). Gemini makes this
    // call specifically because it's the single highest-stakes decision in
    // the app — whether to escalate someone to crisis resources — separate
    // from Kimi K2, which handles the actual wellness-coaching conversation
    // below in STEP 2.
    const classification = await classifyMessageLayered(message, classifyMessageRiskGemini);

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

    // ---- STEP 1.5: free-tier quota check — THIS IS THE MONETIZATION GATE. ----
    // Placement matters: this runs strictly AFTER the crisis check above and
    // ONLY for non-high-risk messages. Crisis intervention is never, under
    // any circumstances, gated behind a paywall — that would be both an
    // ethical failure and a very fast way to end up in the kind of lawsuit
    // covered in the original research archive. A free user in genuine
    // crisis gets the same crisis response as a paying one, always.
    const subscription = await getSubscriptionStatus(userId);
    const isPremium = subscription.status === "active";

    if (!isPremium) {
      const withinQuota = await isWithinFreeQuota(userId);
      if (!withinQuota) {
        return reply.send({
          role: "assistant",
          paywall: true,
          content:
            "You've reached today's free message limit. Upgrade to TruTalk Premium for " +
            "unlimited conversations, or come back tomorrow — check-ins, journaling, and the " +
            "practice library stay free either way.",
        });
      }
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
