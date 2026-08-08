/**
 * Evaluation harness runner for packages/safety.
 *
 * Usage: pnpm --filter @platform/safety eval
 *
 * Exits with a non-zero code if any HIGH-risk case is missed (a false
 * negative on a high-risk case is the one failure mode this project treats
 * as unacceptable — see design rules in packages/safety/src/index.ts).
 */
import { classifyMessage } from "../src/index";
import { EVAL_CASES } from "./dataset";

interface Row {
  id: string;
  text: string;
  expected: string;
  actual: string;
  pass: boolean;
  note: string;
}

function run() {
  const rows: Row[] = EVAL_CASES.map((c) => {
    const result = classifyMessage(c.text);
    return {
      id: c.id,
      text: c.text,
      expected: c.expected,
      actual: result.riskLevel,
      pass: result.riskLevel === c.expected,
      note: c.note,
    };
  });

  const total = rows.length;
  const passed = rows.filter((r) => r.pass).length;

  const criticalMisses = rows.filter((r) => r.expected === "high" && r.actual !== "high");
  const watchMisses = rows.filter((r) => r.expected === "watch" && r.actual === "none");
  const falsePositives = rows.filter((r) => r.expected === "none" && r.actual !== "none");

  console.log("\n=== Crisis Classifier Evaluation ===\n");
  console.log(`${passed}/${total} cases matched expected risk level.\n`);

  console.log("--- Case-by-case ---");
  for (const r of rows) {
    const marker = r.pass ? "PASS" : "FAIL";
    console.log(`[${marker}] ${r.id} — expected=${r.expected} actual=${r.actual}`);
    if (!r.pass) console.log(`        "${r.text}"\n        note: ${r.note}`);
  }

  console.log("\n--- Summary ---");
  console.log(`Critical misses (HIGH risk not caught): ${criticalMisses.length}`);
  criticalMisses.forEach((r) => console.log(`  - ${r.id}: "${r.text}"`));

  console.log(`Watch-tier misses (WATCH risk shown as none): ${watchMisses.length}`);
  watchMisses.forEach((r) => console.log(`  - ${r.id}: "${r.text}"`));

  console.log(`False positives (benign flagged as risk): ${falsePositives.length}`);
  falsePositives.forEach((r) => console.log(`  - ${r.id}: "${r.text}" -> ${r.actual}`));

  console.log(
    "\nReminder: this is a ~24-case scaffold, not a certification suite. A production " +
      "decision needs a much larger, clinically-reviewed benchmark plus native-speaker " +
      "coverage for Pidgin, Yoruba, Hausa, and Igbo before this classifier — or its " +
      "replacement — touches real users.\n"
  );

  if (criticalMisses.length > 0) {
    console.error(
      `FAILING: ${criticalMisses.length} high-risk case(s) were not caught. This blocks ` +
        `launch readiness per the safety design rules in packages/safety/src/index.ts.`
    );
    process.exit(1);
  }
}

run();
