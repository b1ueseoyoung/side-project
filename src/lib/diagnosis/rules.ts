import { ALL_QUESTIONS, JUDGED_ITEMS, UNAVAILABLE_ITEMS } from "./items.ts";
import type { ItemResult, ModelOutput, Report, Signal } from "./types.ts";

const TOP_FIX_COUNT = 3;

/** All yes → good, some yes → improve, no yes → fix. */
export function signalFor(answers: ModelOutput["answers"]): Signal {
  const yes = answers.filter((a) => a.answer === "yes").length;
  if (yes === answers.length) return "good";
  if (yes === 0) return "fix";
  return "improve";
}

export function buildReport(output: ModelOutput): Report {
  assertComplete(output);

  const items: ItemResult[] = JUDGED_ITEMS.map((item) => {
    const questionIds = new Set(item.questions.map((q) => q.id));
    const answers = output.answers.filter((a) => questionIds.has(a.question_id));
    const note = output.items.find((i) => i.item_id === item.id);
    return {
      id: item.id,
      axis: item.axis,
      label: item.label,
      signal: signalFor(answers),
      answers,
      comment: note?.comment ?? "",
      direction: note?.direction ?? "",
    };
  });

  // Red first, then yellow; ties keep the item table order.
  const topFixes = [
    ...items.filter((i) => i.signal === "fix"),
    ...items.filter((i) => i.signal === "improve"),
  ].slice(0, TOP_FIX_COUNT);

  return {
    summary: output.summary,
    strengths: output.strengths,
    topFixes,
    items,
    unavailable: UNAVAILABLE_ITEMS,
  };
}

function assertComplete(output: ModelOutput) {
  const answered = new Set(output.answers.map((a) => a.question_id));
  const missing = ALL_QUESTIONS.filter((q) => !answered.has(q.id));
  if (missing.length > 0) {
    throw new Error(`Missing answers: ${missing.map((q) => q.id).join(", ")}`);
  }
  if (answered.size !== output.answers.length) {
    throw new Error("Duplicate answers in model output");
  }
}
