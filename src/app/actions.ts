"use server";

import { redirect } from "next/navigation";

import { deleteReport, requireViewer, saveReport } from "@/lib/dal";
import { diagnose } from "@/lib/diagnosis/diagnose";
import type { Memo } from "@/lib/diagnosis/types";
import { validateMemo } from "@/lib/diagnosis/validate";

export type DiagnosisResult = { ok: true; id: string } | { ok: false; error: string };

// Server functions are reachable by direct POST, so each one checks the
// viewer itself. Diagnosis runs only in local mode on the owner's Mac.
export async function runDiagnosis(input: Memo): Promise<DiagnosisResult> {
  const viewer = await requireViewer();
  if (!viewer.canDiagnose) return { ok: false, error: "진단은 작성자의 컴퓨터에서만 할 수 있어요." };

  const memo: Memo = {
    genre: String(input?.genre ?? ""),
    memo: String(input?.memo ?? ""),
    references: String(input?.references ?? ""),
  };
  const problem = validateMemo(memo);
  if (problem) return { ok: false, error: problem };

  try {
    const report = await diagnose(memo);
    return { ok: true, id: await saveReport(memo, report) };
  } catch (error) {
    // Log the failure without the memo text.
    console.error("Diagnosis failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "진단을 끝내지 못했어요. 잠시 뒤에 다시 해보세요." };
  }
}

export async function removeReport(id: string) {
  await deleteReport(String(id));
  redirect("/reports");
}
