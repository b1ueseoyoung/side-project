"use client";

import { useEffect, useState } from "react";

// Opus at max effort: a sample memo took about 14 minutes.
const TYPICAL_MINUTES = 15;

// Diagnosis is a single call, so there are no real steps to show.
// Show elapsed time and the usual duration instead of fake progress.
export function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-2" role="status">
      <p className="text-lg font-bold tracking-tight">원고를 읽고 있어요</p>
      <p className="text-3xl font-bold tracking-tight tabular-nums">{clock}</p>
      <p className="text-sm text-muted">
        {seconds <= TYPICAL_MINUTES * 60
          ? `보통 ${TYPICAL_MINUTES}분쯤 걸려요.`
          : "원고가 길면 조금 더 걸릴 수 있어요."}
      </p>
    </div>
  );
}
