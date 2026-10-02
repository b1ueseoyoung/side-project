"use server";

import { redirect } from "next/navigation";

import { deleteReport, requireViewer, saveReport } from "@/lib/dal";
import { checkDiagnosis, errorMessage, isTransient, startDiagnosis } from "@/lib/diagnosis/diagnose";
import type { Memo } from "@/lib/diagnosis/types";
import { validateMemo } from "@/lib/diagnosis/validate";
import { ApiError, isResponseId } from "@/lib/llm";

export type StartResult = { ok: true; responseId: string } | { ok: false; error: string };
export type PollResult = { state: "running" } | { state: "done"; id: string } | { state: "failed"; error: string };

// The demo link is public, so its visitors spend no OpenAI credit.
const DEMO_MESSAGE = "데모에서는 진단을 실행할 수 없어요. 로그아웃한 뒤 이메일로 가입하면 직접 진단할 수 있어요.";

// toMemo normalizes user input to a well-formed Memo.
function toMemo(input: Memo): Memo {
  return {
    genre: String(input?.genre ?? ""),
    memo: String(input?.memo ?? ""),
    references: String(input?.references ?? ""),
  };
}

// requestDiagnosis starts a diagnosis and returns its OpenAI response id.
// Server functions are reachable by direct POST, so each one checks the viewer itself.
export async function requestDiagnosis(input: Memo): Promise<StartResult> {
  const viewer = await requireViewer();
  if (viewer.demo) return { ok: false, error: DEMO_MESSAGE };
  const memo = toMemo(input);
  const problem = validateMemo(memo);
  if (problem) return { ok: false, error: problem };

  try {
    const responseId = await startDiagnosis(memo, viewer.email);
    return { ok: true, responseId };
  } catch (error) {
    const code = error instanceof ApiError ? error.code : null;
    const status = error instanceof ApiError ? error.status : null;
    console.error("Diagnosis start failed:", error instanceof Error ? error.message : error, code);
    return { ok: false, error: errorMessage(code, status) };
  }
}

// pollDiagnosis checks a running diagnosis and saves the report when complete.
export async function pollDiagnosis(responseId: string, input: Memo): Promise<PollResult> {
  const viewer = await requireViewer();
  if (viewer.demo) return { state: "failed", error: DEMO_MESSAGE };
  const memo = toMemo(input);
  const id = String(responseId);

  if (!isResponseId(id)) {
    return { state: "failed", error: errorMessage(null, null) };
  }
  const problem = validateMemo(memo);
  if (problem) return { state: "failed", error: errorMessage(null, null) };

  try {
    const check = await checkDiagnosis(id, memo, viewer.email);
    if (check.state === "running") return { state: "running" };
    if (check.state === "failed") {
      console.error("Diagnosis failed:", check.reason);
      return { state: "failed", error: errorMessage(check.reason, null) };
    }
    // check.state === "done"
    if (!check.run.report) {
      console.error("Diagnosis postprocess failed:", check.run.error instanceof Error ? check.run.error.message : check.run.error);
      return { state: "failed", error: errorMessage(null, null) };
    }

    try {
      const reportId = await saveReport(memo, check.run.report, id);
      return { state: "done", id: reportId };
    } catch (error) {
      console.error("Diagnosis save failed:", error instanceof Error ? error.message : error);
      // Same response id, same report id: saving twice is a no-op.
      return { state: "running" };
    }
  } catch (error) {
    console.error("Diagnosis check failed:", error instanceof Error ? error.message : error);

    // The work continues on OpenAI's side; try again next poll.
    if (isTransient(error)) return { state: "running" };

    // Permanent errors: fail.
    return { state: "failed", error: errorMessage(null, null) };
  }
}

export async function removeReport(id: string) {
  await deleteReport(String(id));
  redirect("/reports");
}
