// Shared types across apps/web and apps/api.

export interface Profile {
  id: string; // matches supabase auth.users.id
  displayName: string | null;
  createdAt: string;
  locale: "en" | "pcm" | "yo" | "ha" | "ig"; // English, Pidgin, Yoruba, Hausa, Igbo
}

export interface MoodCheckin {
  id: string;
  userId: string;
  moodScore: number; // 1-5
  note: string | null;
  createdAt: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  // Set when the safety classifier flagged this message. Never store raw
  // crisis-related transcript content longer than necessary — see packages/safety.
  riskFlag: RiskLevel;
}

export interface ChatSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
}

export type RiskLevel = "none" | "watch" | "high";

export interface CrisisEscalationEvent {
  id: string;
  userId: string;
  sessionId: string | null;
  riskLevel: RiskLevel;
  triggeredAt: string;
  resourceShown: string; // name of the crisis resource surfaced to the user
  // Deliberately NOT storing the triggering message content here by default.
}

export interface JournalEntry {
  id: string;
  userId: string;
  prompt: string | null;
  content: string;
  createdAt: string;
}

export interface ContentLibraryItem {
  id: string;
  type: "breathing" | "mindfulness" | "journaling_prompt" | "sound" | "article";
  title: string;
  description: string | null;
  durationSeconds: number | null;
  mediaUrl: string | null;
  evidenceTag: "strong" | "moderate" | "engagement_only";
}
