import { askStructured } from "../llm.ts";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, buildPrompt } from "./prompt.ts";
import { buildReport } from "./rules.ts";
import type { Memo, ModelOutput, Report } from "./types.ts";

export async function diagnose(memo: Memo): Promise<Report> {
  const output = await askStructured<ModelOutput>({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(memo),
    schema: OUTPUT_SCHEMA,
  });
  return buildReport(output, memo);
}
