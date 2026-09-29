"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { runDiagnosis } from "@/app/actions";
import type { Memo } from "@/lib/diagnosis/types";
import { ElapsedTime } from "./elapsed-time";
import { EMPTY_MEMO, MemoForm } from "./memo-form";
import { enter } from "./styles";

// The draft lives in this browser only, so a reload doesn't lose a long memo.
const DRAFT_KEY = "memo-draft";

function loadDraft(): Memo {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Memo>) : null;
    return { ...EMPTY_MEMO, ...parsed };
  } catch {
    return EMPTY_MEMO;
  }
}

const noSubscribe = () => () => {};

export function DiagnosisApp() {
  // Render only after hydration so the first client render can read localStorage.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return hydrated ? <App /> : null;
}

function App() {
  const router = useRouter();
  const [memo, setMemo] = useState<Memo>(loadDraft);
  const [running, setRunning] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(memo));
    } catch {
      // Storage full or blocked: keep working without it.
    }
  }, [memo]);

  async function submit() {
    setError(null);
    setRunning(Date.now());
    window.scrollTo({ top: 0 });
    try {
      const result = await runDiagnosis(memo);
      if (result.ok) return router.push(`/reports/${result.id}`);
      setError(result.error);
    } catch {
      setError("서버에 연결하지 못했어요. 개발 서버가 켜져 있는지 확인해 주세요.");
    }
    setRunning(null);
  }

  if (running !== null) {
    return (
      <div className={`flex flex-col gap-4 ${enter}`}>
        <ElapsedTime startedAt={running} />
        <p className="text-sm text-muted">이 창을 닫으면 결과를 받지 못해요.</p>
      </div>
    );
  }

  return <MemoForm value={memo} onChange={setMemo} onSubmit={submit} error={error} />;
}
