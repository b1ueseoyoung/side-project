import { askStructuredWithResult } from "../llm.ts";
import type { ClaudeResult } from "../llm.ts";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, buildPrompt } from "./prompt.ts";
import { buildReport } from "./rules.ts";
import type { Memo, ModelOutput, Report } from "./types.ts";

/** One diagnosis kept whole for evaluation: `report` is null when buildReport rejected the output. */
export type DiagnosisRun = { output: ModelOutput; cli: ClaudeResult; report: Report | null; error: unknown };

export function buildRun(output: ModelOutput, cli: ClaudeResult, memo: Memo): DiagnosisRun {
  try {
    return { output, cli, report: buildReport(output, memo), error: null };
  } catch (error) {
    return { output, cli, report: null, error };
  }
}

export async function diagnoseDetailed(memo: Memo): Promise<DiagnosisRun> {
  const { value, result } = await askStructuredWithResult<ModelOutput>({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(memo),
    schema: OUTPUT_SCHEMA,
  });
  return buildRun(value, result, memo);
}

export async function diagnose(memo: Memo): Promise<Report> {
  const run = await diagnoseDetailed(memo);
  if (!run.report) throw run.error;
  return run.report;
}
