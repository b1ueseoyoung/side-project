"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { pollDiagnosis, requestDiagnosis } from "@/app/actions";
import type { Memo } from "@/lib/diagnosis/types";
import { ElapsedTime } from "./elapsed-time";
import { EMPTY_MEMO, MemoForm } from "./memo-form";
import { card, enter } from "./styles";

// The draft lives in this browser only, so a reload doesn't lose a long memo.
const DRAFT_KEY = "memo-draft";

const PENDING_KEY = "diagnosis-pending";
const POLL_MS = 10_000;
const GIVE_UP_MS = 60 * 60 * 1000;

type Pending = { responseId: string; startedAt: number; memo: Memo };

function loadDraft(): Memo {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Memo>) : null;
    return { ...EMPTY_MEMO, ...parsed };
  } catch {
    return EMPTY_MEMO;
  }
}

// ponytail: 다른 탭이 같은 작업을 폴링하는 동안 리포트를 지우면 그 탭이 다시 저장할 수 있고,
// 다른 기기에서는 이어받지 못한다. 배포 직후에는 옛 화면의 확인 요청이 실패해 계속 기다릴 수 있고,
// 새로고침하면 이어진다. 서버에 실행 기록을 두면(B안) 풀린다.
function loadPending(): Pending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<Pending>) : null;
    if (!p || typeof p.responseId !== "string" || typeof p.startedAt !== "number") return null;
    if (typeof p.memo !== "object" || p.memo === null) return null;
    return { responseId: p.responseId, startedAt: p.startedAt, memo: p.memo };
  } catch {
    return null;
  }
}

function savePending(p: Pending) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    // Storage full or blocked: the result still arrives while this page stays open.
  }
}

// Only the entry for this job is removed: another tab may have started a newer one.
function clearPending(responseId: string) {
  try {
    if (loadPending()?.responseId === responseId) localStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: nothing to remove.
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
  const [pending, setPending] = useState<Pending | null>(loadPending);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(memo));
    } catch {
      // Storage full or blocked: keep working without it.
    }
  }, [memo]);

  useEffect(() => {
    if (!pending) return;
    let busy = false;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (message: string) => {
      clearPending(pending.responseId);
      setPending(null);
      setError(message);
    };

    const tick = async () => {
      if (busy || stopped) return;
      if (Date.now() - pending.startedAt > GIVE_UP_MS) return finish("진단이 너무 오래 걸려요. 다시 해 주세요.");
      busy = true;
      try {
        const result = await pollDiagnosis(pending.responseId, pending.memo);
        if (stopped) return;
        if (result.state === "done") {
          stopped = true;
          clearPending(pending.responseId);
          return router.push("/reports/" + result.id);
        }
        if (result.state === "failed") return finish(result.error);
      } catch {
        // Offline or the server restarted: the job keeps running on OpenAI's side, so check again later.
      } finally {
        busy = false;
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      tick();
    };

    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pending, router]);

  async function submit() {
    setError(null);
    const startedAt = Date.now();
    setStarting(startedAt);
    window.scrollTo({ top: 0 });
    try {
      const result = await requestDiagnosis(memo);
      if (result.ok) {
        const next = { responseId: result.responseId, startedAt, memo };
        savePending(next);
        setPending(next);
      } else {
        setError(result.error);
      }
    } catch {
      setError("서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요.");
    }
    setStarting(null);
  }

  const startedAt = pending?.startedAt ?? starting;
  if (startedAt !== null) {
    return (
      <div className={`${card} flex flex-col items-center gap-4 px-6 py-14 text-center ${enter}`}>
        <ElapsedTime startedAt={startedAt} />
        <p className="text-sm text-muted">
          이 창을 닫아도 진단은 계속돼요. 새 진단 화면을 다시 열면 결과를 이어서 받아요.
        </p>
      </div>
    );
  }

  return <MemoForm value={memo} onChange={setMemo} onSubmit={submit} error={error} />;
}
