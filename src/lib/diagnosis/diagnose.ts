import { askStructured } from "../llm.ts";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, buildPrompt } from "./prompt.ts";
import { buildReport } from "./rules.ts";
import type { Manuscript, ModelOutput, Report } from "./types.ts";

export async function diagnose(manuscript: Manuscript): Promise<Report> {
  const output = await askStructured<ModelOutput>({
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(manuscript),
    schema: OUTPUT_SCHEMA,
  });
  return buildReport(output);
}
