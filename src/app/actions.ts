"use server";

import { diagnose } from "@/lib/diagnosis/diagnose";
import type { Manuscript, Report } from "@/lib/diagnosis/types";
import { validateManuscript } from "@/lib/diagnosis/validate";

export type DiagnosisResult = { ok: true; report: Report } | { ok: false; error: string };

// Reachable by direct POST, like every server function. The dev and start
// scripts bind to 127.0.0.1 so only this machine can call it.
export async function runDiagnosis(manuscript: Manuscript): Promise<DiagnosisResult> {
  const clean: Manuscript = {
    ...manuscript,
    characters: manuscript.characters.filter((c) => c.name.trim()),
  };
  const problem = validateManuscript(clean);
  if (problem) return { ok: false, error: problem };

  try {
    return { ok: true, report: await diagnose(clean) };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "진단을 끝내지 못했어요. 잠시 뒤에 다시 해보세요." };
  }
}
