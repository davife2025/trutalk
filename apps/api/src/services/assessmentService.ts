/**
 * Scoring for PHQ-9 (depression) and GAD-7 (anxiety) — standard, public-domain
 * clinical screening instruments (Kroenke et al. / Spitzer et al.), free to
 * use without licensing. Both are validated specifically in Nigerian
 * populations. Question wording is reproduced verbatim deliberately — these
 * instruments only retain their validated psychometric properties when used
 * exactly as published; paraphrasing would silently break their validity.
 */

export type AssessmentType = "phq9" | "gad7";

export interface AssessmentQuestion {
  id: number;
  text: string;
}

export const PHQ9_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, text: "Little interest or pleasure in doing things" },
  { id: 2, text: "Feeling down, depressed, or hopeless" },
  { id: 3, text: "Trouble falling or staying asleep, or sleeping too much" },
  { id: 4, text: "Feeling tired or having little energy" },
  { id: 5, text: "Poor appetite or overeating" },
  {
    id: 6,
    text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  },
  { id: 7, text: "Trouble concentrating on things, such as reading or watching television" },
  {
    id: 8,
    text:
      "Moving or speaking so slowly that other people could have noticed — or the opposite, being " +
      "so fidgety or restless that you have been moving around a lot more than usual",
  },
  { id: 9, text: "Thoughts that you would be better off dead, or of hurting yourself in some way" },
];

export const GAD7_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, text: "Feeling nervous, anxious, or on edge" },
  { id: 2, text: "Not being able to stop or control worrying" },
  { id: 3, text: "Worrying too much about different things" },
  { id: 4, text: "Trouble relaxing" },
  { id: 5, text: "Being so restless that it's hard to sit still" },
  { id: 6, text: "Becoming easily annoyed or irritable" },
  { id: 7, text: "Feeling afraid, as if something awful might happen" },
];

// Standard response scale for both instruments — "over the last 2 weeks,
// how often have you been bothered by the following":
export const RESPONSE_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

export function getQuestions(type: AssessmentType): AssessmentQuestion[] {
  return type === "phq9" ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
}

export function validateResponses(type: AssessmentType, responses: unknown): responses is number[] {
  const expectedLength = type === "phq9" ? 9 : 7;
  if (!Array.isArray(responses) || responses.length !== expectedLength) return false;
  return responses.every((r) => typeof r === "number" && Number.isInteger(r) && r >= 0 && r <= 3);
}

export function scoreResponses(responses: number[]): number {
  return responses.reduce((sum, r) => sum + r, 0);
}

/**
 * Standard published severity bands. PHQ-9: 0-4 none/minimal, 5-9 mild,
 * 10-14 moderate, 15-19 moderately severe, 20-27 severe. GAD-7: 0-4 minimal,
 * 5-9 mild, 10-14 moderate, 15-21 severe.
 */
export function getSeverity(type: AssessmentType, totalScore: number): string {
  if (type === "phq9") {
    if (totalScore <= 4) return "minimal";
    if (totalScore <= 9) return "mild";
    if (totalScore <= 14) return "moderate";
    if (totalScore <= 19) return "moderately severe";
    return "severe";
  }
  // gad7
  if (totalScore <= 4) return "minimal";
  if (totalScore <= 9) return "mild";
  if (totalScore <= 14) return "moderate";
  return "severe";
}

/**
 * PHQ-9 item 9 asks directly about thoughts of self-harm or being better off
 * dead. ANY non-zero response here is a crisis signal, independent of the
 * total score — a person can score low overall while still endorsing this
 * item, and that must never be masked by an otherwise-mild total. This is
 * checked separately from, and in addition to, the total-score severity band.
 */
export function hasPhq9CrisisSignal(type: AssessmentType, responses: number[]): boolean {
  if (type !== "phq9") return false;
  const item9 = responses[8]; // 0-indexed, item 9 is index 8
  return typeof item9 === "number" && item9 > 0;
}
