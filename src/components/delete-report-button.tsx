"use client";

import { useState, useTransition } from "react";

import { removeReport } from "@/app/actions";

// Deleting takes a second press, like clearing a draft.
export function DeleteReportButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-(--duration-fast) disabled:opacity-60 ${
        confirming ? "bg-signal-fix-soft text-signal-fix" : "text-muted hover:text-signal-fix"
      }`}
      disabled={pending}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) return setConfirming(true);
        startTransition(() => removeReport(id));
      }}
    >
      {pending ? "지우는 중" : confirming ? "한 번 더 누르면 메모와 리포트가 지워져요" : "이 리포트 지우기"}
    </button>
  );
}
