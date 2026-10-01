import { createHash } from "node:crypto";

import { ApiError, getResponse, startStructured, structuredOutput } from "../llm.ts";
import type { ApiResponse } from "../llm.ts";
import { ALL_QUESTIONS, JUDGED_ITEMS } from "./items.ts";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, answerKey, buildPrompt } from "./prompt.ts";
import { buildReport } from "./rules.ts";
import type { Memo, ModelOutput, Report } from "./types.ts";

const POLL_MS = 5_000;
const MAX_WAIT_MS = 60 * 60 * 1000;

/** One diagnosis kept whole for evaluation: `report` is null when buildReport rejected the output. */
export type DiagnosisRun = { output: ModelOutput; api: ApiResponse; report: Report | null; error: unknown };

/** What the API returns under OUTPUT_SCHEMA: answers and items keyed by question and item. */
export type RawOutput = Omit<ModelOutput, "answers" | "items"> & {
  answers: Record<string, Omit<ModelOutput["answers"][number], "question_id">>;
  items: Record<string, Omit<ModelOutput["items"][number], "item_id">>;
};

/** Back to the array form; a key missing from raw is skipped, so buildReport still reports the gap. */
export function toModelOutput(raw: RawOutput): ModelOutput {
  return {
    ...raw,
    answers: ALL_QUESTIONS.flatMap((q) => {
      const answer = raw.answers?.[answerKey(q.id)];
      return answer ? [{ question_id: q.id, ...answer }] : [];
    }),
    items: JUDGED_ITEMS.flatMap((item) => {
      const note = raw.items?.[item.id];
      return note ? [{ item_id: item.id, ...note }] : [];
    }),
  };
}

export function buildRun(output: ModelOutput, api: ApiResponse, memo: Memo): DiagnosisRun {
  try {
    return { output, api, report: buildReport(output, memo), error: null };
  } catch (error) {
    return { output, api, report: null, error };
  }
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function memoHash(memo: Memo): string {
  return sha256(JSON.stringify([memo.genre, memo.memo, memo.references]));
}

/** UUIDv8 (RFC variant) derived from the response id. */
export function reportIdFor(responseId: string): string {
  // Same response id, same report id: saving twice is a no-op.
  const h = sha256(responseId);
  const variant = (8 | (parseInt(h[16], 16) & 3)).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export async function startDiagnosis(memo: Memo): Promise<string> {
  const r = await startStructured({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(memo),
    schema: OUTPUT_SCHEMA,
    metadata: { memo_sha256: memoHash(memo) },
  });
  return r.id;
}

export type Check =
  | { state: "running" }
  | { state: "done"; run: DiagnosisRun }
  | { state: "failed"; reason: string; api: ApiResponse | null };

function withoutOutput(r: ApiResponse): ApiResponse {
  const rest: ApiResponse = { ...r };
  delete rest.output;
  return rest;
}

export function checkResponse(r: ApiResponse, memo: Memo): Check {
  if (r.metadata?.memo_sha256 !== memoHash(memo)) return { state: "failed", reason: "memo_mismatch", api: r };
  if (r.status === "queued" || r.status === "in_progress") return { state: "running" };
  if (r.status !== "completed") {
    return { state: "failed", reason: r.error?.code ?? r.incomplete_details?.reason ?? r.status, api: r };
  }
  let output: ModelOutput;
  try {
    output = toModelOutput(structuredOutput<RawOutput>(r));
  } catch (error) {
    const reason = error instanceof Error && error.message === "refusal" ? "refusal" : "bad_json";
    return { state: "failed", reason, api: r };
  }
  return { state: "done", run: buildRun(output, withoutOutput(r), memo) };
}

export async function checkDiagnosis(id: string, memo: Memo): Promise<Check> {
  try {
    return checkResponse(await getResponse(id), memo);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { state: "failed", reason: "not_found", api: null };
    throw error;
  }
}

const CREDIT_CODES = new Set([
  "credit_balance_exhausted",
  "insufficient_quota",
  "project_spend_limit_exceeded",
  "organization_spend_limit_exceeded",
  "organization_usage_limit_exceeded",
]);

/** The only source of user-facing failure messages. */
export function errorMessage(code: string | null, status: number | null): string {
  if (code && CREDIT_CODES.has(code)) return "OpenAI 크레딧을 다 썼어요. 작성자에게 알려 주세요.";
  if (status === 429) return "요청이 많아요. 잠시 뒤에 다시 해 주세요.";
  return "진단을 끝내지 못했어요. 잠시 뒤에 다시 해보세요.";
}

const MAX_TRANSIENT_FAILURES = 5;

/** Rate limits, server errors and network/timeout failures: worth polling again. */
export function isTransient(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429 || error.status >= 500;
  return error instanceof Error && ["TypeError", "TimeoutError", "AbortError"].includes(error.name);
}

/** For the CLI and eval only: starts a diagnosis and polls until it settles. */
export async function diagnoseDetailed(memo: Memo): Promise<DiagnosisRun> {
  // The paid start is never retried; only the free status checks are.
  const id = await startDiagnosis(memo);
  const deadline = Date.now() + MAX_WAIT_MS;
  let failures = 0;
  try {
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      let check: Check;
      try {
        check = await checkDiagnosis(id, memo);
      } catch (error) {
        if (!isTransient(error) || ++failures > MAX_TRANSIENT_FAILURES) throw error;
        continue;
      }
      failures = 0;
      if (check.state === "done") return check.run;
      if (check.state === "failed") {
        throw Object.assign(new Error("Diagnosis failed: " + check.reason), { api: check.api });
      }
    }
    throw new Error("Diagnosis timed out");
  } catch (error) {
    throw Object.assign(error as Error, { responseId: id });
  }
}

export async function diagnose(memo: Memo): Promise<Report> {
  const run = await diagnoseDetailed(memo);
  if (!run.report) throw run.error;
  return run.report;
}
