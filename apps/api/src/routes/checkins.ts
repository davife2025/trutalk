import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../services/supabaseAdmin";

interface CheckinBody {
  userId: string;
  moodScore: number; // 1-5
  note?: string;
}

export async function checkinRoutes(app: FastifyInstance) {
  app.post<{ Body: CheckinBody }>("/checkins", async (request, reply) => {
    const { userId, moodScore, note } = request.body;

    if (!userId || moodScore < 1 || moodScore > 5) {
      return reply.code(400).send({ error: "userId and moodScore (1-5) are required" });
    }

    const { data, error } = await supabaseAdmin
      .from("mood_checkins")
      .insert({ user_id: userId, mood_score: moodScore, note: note ?? null })
      .select()
      .single();

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });
}
