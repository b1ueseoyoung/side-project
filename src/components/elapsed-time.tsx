"use client";

import { useEffect, useState } from "react";

const TYPICAL_SECONDS = 40;

// Diagnosis is a single call, so there are no real steps to show.
// Show elapsed time and the usual duration instead of fake progress.
export function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <div className="flex flex-col gap-1" role="status">
      <p>
        원고를 읽고 있어요 <span className="tabular-nums text-muted">{seconds}초</span>
      </p>
      <p className="text-sm text-muted">
        {seconds <= TYPICAL_SECONDS
          ? `보통 ${TYPICAL_SECONDS}초쯤 걸려요.`
          : "원고가 길면 조금 더 걸릴 수 있어요."}
      </p>
    </div>
  );
}
