import type { FastifyInstance } from "fastify";
import { CRISIS_RESOURCES, CRISIS_RESPONSE_MESSAGE } from "@trutalk/safety";
import { getAuthenticatedUserId } from "../plugins/auth";
import { supabaseAdmin } from "../services/supabaseAdmin";
import {
  type AssessmentType,
  getQuestions,
  validateResponses,
  scoreResponses,
  getSeverity,
  hasPhq9CrisisSignal,
} from "../services/assessmentService";

interface SubmitBody {
  type: AssessmentType;
  responses: unknown;
}

export async function assessmentRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { type: AssessmentType } }>("/assessments/questions", async (request, reply) => {
    const { type } = request.query;
    if (type !== "phq9" && type !== "gad7") {
      return reply.code(400).send({ error: "type must be 'phq9' or 'gad7'" });
    }
    return reply.send({ questions: getQuestions(type) });
  });

  app.post<{ Body: SubmitBody }>("/assessments/submit", async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: "Missing or invalid authorization token" });

    const { type, responses } = request.body;
    if (type !== "phq9" && type !== "gad7") {
      return reply.code(400).send({ error: "type must be 'phq9' or 'gad7'" });
    }
    if (!validateResponses(type, responses)) {
      return reply.code(400).send({ error: "responses must match the expected question count, each 0-3" });
    }

    const totalScore = scoreResponses(responses);
    const severity = getSeverity(type, totalScore);
    const crisisFlag = hasPhq9CrisisSignal(type, responses);

    // ---- Crisis signal takes priority, same pattern as chat.ts: respond ----
    // ---- immediately, log asynchronously, never block the response on it. ----
    if (crisisFlag) {
      reply.send({
        totalScore,
        severity,
        crisisFlag: true,
        content: CRISIS_RESPONSE_MESSAGE,
        resources: CRISIS_RESOURCES,
      });

      supabaseAdmin
        .from("crisis_escalation_events")
        .insert({
          user_id: userId,
          risk_level: "high",
          resource_shown: CRISIS_RESOURCES[0]?.name ?? "unknown",
          classification_source: "assessment",
        })
        .then(({ error }) => {
          if (error) app.log.error({ error }, "Failed to log assessment-triggered crisis escalation");
        });

      // Still record the assessment itself, non-blocking — the score and
      // history matter even when the item-9 signal is what's most urgent.
      supabaseAdmin
        .from("assessments")
        .insert({ user_id: userId, type, responses, total_score: totalScore, severity })
        .then(({ error }) => {
          if (error) app.log.error({ error }, "Failed to persist assessment after crisis flag");
        });

      return;
    }

    const { data, error } = await supabaseAdmin
      .from("assessments")
      .insert({ user_id: userId, type, responses, total_score: totalScore, severity })
      .select()
      .single();

    if (error) {
      app.log.error({ error }, "Failed to persist assessment");
      return reply.code(500).send({ error: "Could not save assessment" });
    }

    return reply.send({ totalScore, severity, crisisFlag: false, id: data.id });
  });

  app.get<{ Querystring: { type: AssessmentType } }>("/assessments/history", async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return reply.code(401).send({ error: "Missing or invalid authorization token" });

    const { type } = request.query;
    if (type !== "phq9" && type !== "gad7") {
      return reply.code(400).send({ error: "type must be 'phq9' or 'gad7'" });
    }

    const { data, error } = await supabaseAdmin
      .from("assessments")
      .select("id, total_score, severity, created_at")
      .eq("user_id", userId)
      .eq("type", type)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send({ history: data });
  });
}
