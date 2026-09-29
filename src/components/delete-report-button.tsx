"use client";

import { useState, useTransition } from "react";

import { removeReport } from "@/app/actions";
import { textButton } from "./styles";

// Deleting takes a second press, like clearing a draft.
export function DeleteReportButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={textButton}
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
