import type { FastifyInstance } from "fastify";
import { classifyMessage, CRISIS_RESOURCES, CRISIS_RESPONSE_MESSAGE } from "@platform/safety";
import { getWellnessCoachReply } from "../services/llmService";
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
    const classification = classifyMessage(message);

    if (classification.riskLevel === "high") {
      // Log that an escalation occurred WITHOUT necessarily persisting the raw
      // message body — see packages/safety module docs for the reasoning.
      await supabaseAdmin.from("crisis_escalation_events").insert({
        user_id: userId,
        session_id: sessionId,
        risk_level: "high",
        resource_shown: CRISIS_RESOURCES[0]?.name ?? "unknown",
      });

      return reply.send({
        role: "assistant",
        content: CRISIS_RESPONSE_MESSAGE,
        riskLevel: "high",
        resources: CRISIS_RESOURCES,
      });
    }

    // ---- STEP 2: normal wellness-coach conversation flow. ----
    const reply_ = await getWellnessCoachReply([...history, { role: "user", content: message }]);

    await supabaseAdmin.from("chat_messages").insert([
      { session_id: sessionId, user_id: userId, role: "user", content: message, risk_flag: classification.riskLevel },
      { session_id: sessionId, user_id: userId, role: "assistant", content: reply_, risk_flag: "none" },
    ]);

    return reply.send({ role: "assistant", content: reply_, riskLevel: classification.riskLevel });
  });
}
