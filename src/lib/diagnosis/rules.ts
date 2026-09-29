import { ALL_QUESTIONS, JUDGED_ITEMS, UNAVAILABLE_ITEMS } from "./items.ts";
import type { Evidence, ItemResult, Memo, ModelOutput, Report, Signal } from "./types.ts";

const TOP_FIX_COUNT = 3;

// Questions that ask for an absence ("~없는가?") may be answered yes without a quote.
const ABSENCE_QUESTIONS = new Set(["consistency.no_conflict"]);

/** All yes → good, some yes → improve, no yes → fix. */
export function signalFor(answers: ModelOutput["answers"]): Signal {
  const yes = answers.filter((a) => a.answer === "yes").length;
  if (yes === answers.length) return "good";
  if (yes === 0) return "fix";
  return "improve";
}

// Whitespace, quote marks and ellipses vary between the memo and model output.
function normalize(text: string) {
  return text
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks model quotes against the memo so that nothing reaches the report as
 * evidence unless the writer actually wrote it.
 */
export class QuoteChecker {
  private readonly source: string;
  dropped = 0;

  constructor(...texts: string[]) {
    this.source = normalize(texts.join("\n"));
  }

  has(text: string) {
    const needle = normalize(text);
    return needle.length > 0 && this.source.includes(needle);
  }

  keep(evidence: Evidence[]): Evidence[] {
    const kept = evidence.filter((e) => this.has(e.quote));
    this.dropped += evidence.length - kept.length;
    return kept;
  }

  /** Keeps entries that still have at least one verified quote. */
  keepNoted<T extends { evidence: Evidence[] }>(entries: T[]): T[] {
    return entries
      .map((e) => ({ ...e, evidence: this.keep(e.evidence) }))
      .filter((e) => e.evidence.length > 0);
  }
}

export function buildReport(output: ModelOutput, memo: Memo): Report {
  assertComplete(output);
  const check = new QuoteChecker(memo.memo, memo.references);

  const answers = output.answers.map((a) => {
    const evidence = check.keep(a.evidence);
    // A "yes" must be backed by the memo; an unbacked pass is not shown as one.
    if (a.answer === "yes" && evidence.length === 0 && !ABSENCE_QUESTIONS.has(a.question_id)) {
      return {
        ...a,
        answer: "no" as const,
        evidence,
        reason: `메모에서 근거 문장을 확인하지 못해 "아니오"로 봤어요. (${a.reason})`,
      };
    }
    return { ...a, evidence };
  });

  const items: ItemResult[] = JUDGED_ITEMS.map((item) => {
    const questionIds = new Set(item.questions.map((q) => q.id));
    const own = answers.filter((a) => questionIds.has(a.question_id));
    const note = output.items.find((i) => i.item_id === item.id);
    return {
      id: item.id,
      axis: item.axis,
      label: item.label,
      signal: signalFor(own),
      answers: own,
      comment: note?.comment ?? "",
      direction: note?.direction ?? "",
    };
  });

  // Red first, then yellow; ties keep the item table order.
  const topFixes = [
    ...items.filter((i) => i.signal === "fix"),
    ...items.filter((i) => i.signal === "improve"),
  ].slice(0, TOP_FIX_COUNT);

  const s = output.setting;
  const setting = {
    characters: check.keepNoted(s.characters),
    rules: check.keepNoted(s.rules),
    events: check.keepNoted(s.events),
    dropped: check.keepNoted(s.dropped),
    conflicts: check.keepNoted(s.conflicts),
  };

  // Only works the writer named themselves; never ones the model brought up.
  const references = output.references
    .filter((r) => check.has(r.work))
    .map((r) => ({ ...r, evidence: check.keep(r.evidence), overlaps: check.keepNoted(r.overlaps) }));

  return {
    summary: output.summary,
    strengths: check.keepNoted(output.strengths),
    topFixes,
    setting,
    items,
    references,
    unavailable: UNAVAILABLE_ITEMS,
    droppedQuotes: check.dropped,
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
