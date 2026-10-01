// Pure helpers shared by the eval runner and scorer. They only read model
// output and reports; judging stays in src/lib/diagnosis.

import { ALL_QUESTIONS, JUDGED_ITEMS } from "../../src/lib/diagnosis/items.ts";
import type { JudgedItem } from "../../src/lib/diagnosis/items.ts";
import { QuoteChecker } from "../../src/lib/diagnosis/rules.ts";
import type { Memo, ModelOutput, Report } from "../../src/lib/diagnosis/types.ts";

export const VERDICTS = ["문제 없음", "문제 있음", "정보 부족", "해당 없음"] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Appeal and taste questions: no provisional label, people review evidence and usefulness only. */
export const SUBJECTIVE_QUESTIONS = new Set([
  "genre_fit.core_fun",
  "originality.twist",
  "selling_point.clear",
  "protagonist_appeal.root",
]);

export type Label = {
  sampleId: string;
  pair: string;
  variant: "A" | "B";
  partner: string;
  labelStatus: string;
  difference: string;
  targets: { questionId: string; expected: Verdict; evidence: string[]; note: string }[];
  mustFind: { id: string; questionId: string; description: string; quotes: string[]; match: "all" | "any" }[];
  mustNotFlag: { id: string; description: string; quotes: string[]; questionIds: string[]; humanOnly?: boolean }[];
  mayAlsoChange: string[];
};

type Answer = ModelOutput["answers"][number];

export const QUESTION_IDS = ALL_QUESTIONS.map((q) => q.id);
const KNOWN = new Set(QUESTION_IDS);
export const ITEM_OF = new Map<string, JudgedItem>(
  JUDGED_ITEMS.flatMap((item) => item.questions.map((q) => [q.id, item] as const)),
);

/** True when one quote contains the other after the app's own normalization. */
export function sameQuote(a: string, b: string) {
  return new QuoteChecker(a).has(b) || new QuoteChecker(b).has(a);
}

export function validateLabel(label: Label, memo: Memo): string[] {
  const problems: string[] = [];
  const inMemo = new QuoteChecker(memo.memo, memo.references);
  const quotes = [
    ...label.targets.flatMap((t) => t.evidence),
    ...label.mustFind.flatMap((m) => m.quotes),
    ...label.mustNotFlag.flatMap((m) => m.quotes),
  ];
  for (const q of quotes) if (!inMemo.has(q)) problems.push(`메모에 없는 라벨 인용: ${q}`);
  const ids = [
    ...label.targets.map((t) => t.questionId),
    ...label.mustFind.map((m) => m.questionId),
    ...label.mustNotFlag.flatMap((m) => m.questionIds),
    ...label.mayAlsoChange,
  ];
  for (const id of ids) if (!KNOWN.has(id)) problems.push(`없는 질문 ID: ${id}`);
  for (const t of label.targets) {
    if (!VERDICTS.includes(t.expected)) problems.push(`알 수 없는 라벨: ${t.expected}`);
    if (SUBJECTIVE_QUESTIONS.has(t.questionId)) problems.push(`주관 문항을 대상으로 씀: ${t.questionId}`);
  }
  if (!label.labelStatus.includes("임시")) problems.push("labelStatus에 임시 라벨이라는 표시가 없음");
  return problems;
}

export type QuoteRef = { where: string; questionId?: string; quote: string };

export function rawQuotes(output: ModelOutput): QuoteRef[] {
  const list: QuoteRef[] = [];
  const add = (where: string, evidence: { quote: string }[] | undefined, questionId?: string) => {
    for (const e of evidence ?? []) list.push({ where, questionId, quote: e.quote });
  };
  for (const a of output.answers ?? []) add("answers", a.evidence, a.question_id);
  for (const key of ["characters", "rules", "events", "dropped", "conflicts"] as const) {
    for (const entry of output.setting?.[key] ?? []) add(`setting.${key}`, entry.evidence);
  }
  for (const s of output.strengths ?? []) add("strengths", s.evidence);
  for (const r of output.references ?? []) {
    add("references", r.evidence);
    for (const o of r.overlaps ?? []) add("references.overlaps", o.evidence);
  }
  return list;
}

export function findAnswer(report: Report | null, questionId: string) {
  for (const item of report?.items ?? []) {
    const answer = item.answers.find((a) => a.question_id === questionId);
    if (answer) return { item, answer };
  }
  return null;
}

export type PriorityCheck = {
  topFixes: { itemId: string; signal: string; tableIndex: number }[];
  red: string[];
  yellow: string[];
  /** Red items that did not make the list while earlier red items did. */
  redLeftOut: string[];
  /** The picks are exactly the first red, then yellow, items in table order. */
  followsTableOrder: boolean;
};

export function priorityCheck(report: Report): PriorityCheck {
  const order = new Map(JUDGED_ITEMS.map((item, i) => [item.id, i]));
  const red = report.items.filter((i) => i.signal === "fix").map((i) => i.id);
  const yellow = report.items.filter((i) => i.signal === "improve").map((i) => i.id);
  const picks = report.topFixes.map((i) => i.id);
  return {
    topFixes: report.topFixes.map((i) => ({ itemId: i.id, signal: i.signal, tableIndex: order.get(i.id) ?? -1 })),
    red,
    yellow,
    redLeftOut: red.filter((id) => !picks.includes(id)),
    followsTableOrder: [...red, ...yellow].slice(0, picks.length).join() === picks.join(),
  };
}

export type PostprocessDiff = {
  missingQuestionIds: string[];
  duplicateQuestionIds: string[];
  unknownQuestionIds: string[];
  rawQuotes: { total: number; inMemo: number; notInMemo: QuoteRef[] };
  /** The app's own count of quotes it removed (Report.droppedQuotes). */
  appDroppedQuotes: number | null;
  changedAnswers: {
    questionId: string;
    raw: Answer["answer"];
    final: Answer["answer"];
    rawReason: string;
    finalReason: string;
    rawEvidence: string[];
  }[];
  priority: PriorityCheck | null;
};

export function diffPostprocess(output: ModelOutput, report: Report | null, memo: Memo): PostprocessDiff {
  const inMemo = new QuoteChecker(memo.memo, memo.references);
  const quotes = rawQuotes(output);
  const notInMemo = quotes.filter((q) => !inMemo.has(q.quote));
  const counts = new Map<string, number>();
  for (const a of output.answers ?? []) counts.set(a.question_id, (counts.get(a.question_id) ?? 0) + 1);
  const changedAnswers = (output.answers ?? []).flatMap((a) => {
    const final = findAnswer(report, a.question_id)?.answer;
    if (!final || final.answer === a.answer) return [];
    return [
      {
        questionId: a.question_id,
        raw: a.answer,
        final: final.answer,
        rawReason: a.reason,
        finalReason: final.reason,
        rawEvidence: a.evidence.map((e) => e.quote),
      },
    ];
  });
  return {
    missingQuestionIds: QUESTION_IDS.filter((id) => !counts.has(id)),
    duplicateQuestionIds: [...counts].filter(([, n]) => n > 1).map(([id]) => id),
    unknownQuestionIds: [...counts.keys()].filter((id) => !KNOWN.has(id)),
    rawQuotes: { total: quotes.length, inMemo: quotes.length - notInMemo.length, notInMemo },
    appDroppedQuotes: report ? report.droppedQuotes : null,
    changedAnswers,
    priority: report ? priorityCheck(report) : null,
  };
}

// Heuristic only: wording that says the memo lacks something. People confirm it.
const MISSING_INFO =
  /메모에서?\s*(는\s*)?(없|나와 있지 않|적혀 있지 않|드러나지 않|찾을 수 없)|적혀 있지 않|적지 않았|빠져 있|비어 있|확인하지 못/;

export type TargetResult = {
  questionId: string;
  itemId: string;
  expected: Verdict;
  rawAnswer: Answer["answer"] | null;
  finalAnswer: Answer["answer"] | null;
  downgradedForEvidence: boolean;
  signal: string | null;
  inTopFixes: boolean;
  outcome: "일치" | "불일치" | "표현 불가" | "결과 없음";
  reason: string;
  evidence: string[];
  comment: string;
  direction: string;
  expectedCited: { quote: string; cited: boolean }[];
  unexpectedEvidence: string[];
  missingInfoWording: boolean;
};

export function judgeTarget(
  target: Label["targets"][number],
  output: ModelOutput | null,
  report: Report | null,
): TargetResult {
  const raw = output?.answers?.find((a) => a.question_id === target.questionId) ?? null;
  const found = findAnswer(report, target.questionId);
  const final = found?.answer ?? null;
  const evidence = final?.evidence.map((e) => e.quote) ?? [];
  // The app can only say yes or no; 정보 부족 can only show up as "no".
  const expectedApp = target.expected === "문제 없음" ? "yes" : target.expected === "해당 없음" ? null : "no";
  const outcome = !final ? "결과 없음" : expectedApp === null ? "표현 불가" : final.answer === expectedApp ? "일치" : "불일치";
  return {
    questionId: target.questionId,
    itemId: ITEM_OF.get(target.questionId)?.id ?? "",
    expected: target.expected,
    rawAnswer: raw?.answer ?? null,
    finalAnswer: final?.answer ?? null,
    downgradedForEvidence: raw?.answer === "yes" && final?.answer === "no",
    signal: found?.item.signal ?? null,
    inTopFixes: Boolean(found && report?.topFixes.some((i) => i.id === found.item.id)),
    outcome,
    reason: final?.reason ?? "",
    evidence,
    comment: found?.item.comment ?? "",
    direction: found?.item.direction ?? "",
    expectedCited: target.evidence.map((q) => ({ quote: q, cited: evidence.some((e) => sameQuote(e, q)) })),
    unexpectedEvidence: evidence.filter((e) => !target.evidence.some((q) => sameQuote(e, q))),
    missingInfoWording: MISSING_INFO.test(`${final?.reason ?? ""} ${found?.item.comment ?? ""}`),
  };
}

export function checkMustFind(m: Label["mustFind"][number], report: Report | null) {
  const answer = findAnswer(report, m.questionId)?.answer ?? null;
  const evidence = answer?.evidence.map((e) => e.quote) ?? [];
  const cited = m.quotes.filter((q) => evidence.some((e) => sameQuote(e, q))).length;
  const quotesOk = m.quotes.length === 0 || (m.match === "all" ? cited === m.quotes.length : cited > 0);
  return { id: m.id, questionId: m.questionId, answer: answer?.answer ?? null, cited, of: m.quotes.length, found: answer?.answer === "no" && quotesOk };
}

export function checkMustNotFlag(m: Label["mustNotFlag"][number], report: Report | null) {
  if (m.humanOnly || m.quotes.length === 0) return { id: m.id, humanOnly: true, hits: [] as string[] };
  const touches = (quotes: { quote: string }[]) => quotes.some((e) => m.quotes.some((q) => sameQuote(e.quote, q)));
  const hits: string[] = [];
  for (const id of m.questionIds.length ? m.questionIds : QUESTION_IDS) {
    const answer = findAnswer(report, id)?.answer;
    if (answer?.answer === "no" && touches(answer.evidence)) hits.push(`${id}: "아니오" 근거로 인용`);
  }
  for (const c of report?.setting.conflicts ?? []) {
    if (touches(c.evidence)) hits.push(`설정 정리의 어긋나는 설정: ${c.text}`);
  }
  return { id: m.id, humanOnly: false, hits };
}

export function answersOf(report: Report | null) {
  return new Map((report?.items ?? []).flatMap((i) => i.answers.map((a) => [a.question_id, a.answer] as const)));
}

/** Questions outside `excluded` whose final answers differ between the two reports. */
export function pairDiff(a: Report | null, b: Report | null, excluded: Set<string>) {
  if (!a || !b) return null;
  const ma = answersOf(a);
  const mb = answersOf(b);
  const compared = QUESTION_IDS.filter((id) => !excluded.has(id));
  return {
    compared: compared.length,
    differences: compared
      .filter((id) => ma.get(id) !== mb.get(id))
      .map((id) => ({ questionId: id, a: ma.get(id) ?? null, b: mb.get(id) ?? null, subjective: SUBJECTIVE_QUESTIONS.has(id) })),
  };
}

export function repeatConsistency(reports: (Report | null)[]) {
  const done = reports.filter((r): r is Report => r !== null).map(answersOf);
  const changed = QUESTION_IDS.flatMap((id) => {
    const answers = done.map((m) => m.get(id) ?? null);
    return new Set(answers).size > 1 ? [{ questionId: id, answers }] : [];
  });
  return { runs: reports.length, succeeded: done.length, changed };
}

const SECRET_ENV = /KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL|SMTP|AUTH|COOKIE/i;

/** Error text safe to store: secret-looking env values and API keys are masked. */
export function safeError(error: unknown): string {
  let text = error instanceof Error ? error.message : String(error);
  for (const [key, value] of Object.entries(process.env)) {
    if (value && value.length >= 8 && SECRET_ENV.test(key)) text = text.split(value).join(`<${key}>`);
  }
  return text.replace(/sk-[\w-]{10,}/g, "<masked>").slice(0, 2000);
}

// USD per 1M tokens, standard tier, 2026-09-30: https://developers.openai.com/api/docs/models/gpt-6-luna
const PRICES: Record<string, { input: number; cached: number; cacheWrite: number; output: number }> = {
  "gpt-6-luna": { input: 0.1, cached: 0.01, cacheWrite: 0.125, output: 0.5 },
};

type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
};

/** Standard-tier cost of one response in USD; null for an unknown model or missing usage. */
export function costUsd(model: string | null | undefined, usage: Record<string, unknown> | null | undefined): number | null {
  const price = Object.entries(PRICES).find(([key]) => model?.startsWith(key))?.[1];
  const u = usage as Usage | null | undefined;
  if (!price || typeof u?.input_tokens !== "number" || typeof u.output_tokens !== "number") return null;
  const cached = u.input_tokens_details?.cached_tokens ?? 0;
  const cacheWrite = u.input_tokens_details?.cache_write_tokens ?? 0;
  return (
    ((u.input_tokens - cached - cacheWrite) * price.input + cached * price.cached + cacheWrite * price.cacheWrite + u.output_tokens * price.output) /
    1e6
  );
}

/**
 * Deterministic stand-in for a model response, used by --dry-run to test
 * storage and scoring without calling the model. It exercises a dropped
 * quote, a yes turned into no, a pair difference, a repeat difference and,
 * on p4b run 3, a missing answer.
 */
export function fakeModelOutput(memo: Memo, sampleId: string, run: number): ModelOutput {
  const line = memo.memo.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const answers: Answer[] = QUESTION_IDS.map((id) => ({
    question_id: id,
    answer: "yes",
    reason: "dry-run",
    evidence: [{ quote: line }],
  }));
  const patch = (id: string, change: Partial<Answer>) => {
    const answer = answers.find((a) => a.question_id === id);
    if (answer) Object.assign(answer, change);
  };
  patch("core_rules.stated", { evidence: [{ quote: "메모에 없는 문장 (dry-run)" }] });
  patch("ending.decided", { answer: "no" });
  if (sampleId.endsWith("b")) patch("consistency.no_conflict", { answer: "no" });
  if (run === 2) patch("theme.coherent", { answer: "no" });
  return {
    setting: {
      characters: [{ name: "dry", role: "dry", want: "dry", evidence: [{ quote: "메모에 없는 인물 인용 (dry-run)" }] }],
      rules: [{ text: "dry", evidence: [{ quote: line }] }],
      events: [],
      dropped: [],
      conflicts: [],
    },
    references: [],
    answers: run === 3 && sampleId === "p4b" ? answers.filter((a) => a.question_id !== "arc.change") : answers,
    items: JUDGED_ITEMS.map((item) => ({ item_id: item.id, comment: "dry-run", direction: "" })),
    summary: "dry-run",
    strengths: [{ text: "dry", evidence: [{ quote: line }] }],
  };
}

export function toCsv(rows: string[][]) {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  // BOM so spreadsheet apps read Korean as UTF-8.
  return "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
