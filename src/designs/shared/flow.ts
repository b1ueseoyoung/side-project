"use client";

// The diagnosis flow as a hook: a draft kept in this browser, a job handed to the server,
// a poll every ten seconds, and a job that survives closing the window.

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { pollDiagnosis, requestDiagnosis } from "@/app/actions";
import type { Memo } from "@/lib/diagnosis/types";
import { DRAFT_PREFIX, PENDING_PREFIX, signedOutAt } from "./local-store";

export const EMPTY_MEMO: Memo = { genre: "", memo: "", references: "" };

const draftKey = (account: string) => `${DRAFT_PREFIX}:${account}`;
const pendingKey = (account: string) => `${PENDING_PREFIX}:${account}`;

const POLL_MS = 10_000;
const GIVE_UP_MS = 60 * 60 * 1000;

type Pending = { responseId: string; startedAt: number; memo: Memo };

function loadDraft(account: string): Memo {
  try {
    const raw = localStorage.getItem(draftKey(account));
    const parsed = raw ? (JSON.parse(raw) as Partial<Memo>) : null;
    return { ...EMPTY_MEMO, ...parsed };
  } catch {
    return EMPTY_MEMO;
  }
}

function loadPending(account: string): Pending | null {
  try {
    const raw = localStorage.getItem(pendingKey(account));
    const p = raw ? (JSON.parse(raw) as Partial<Pending>) : null;
    if (!p || typeof p.responseId !== "string" || typeof p.startedAt !== "number") return null;
    if (typeof p.memo !== "object" || p.memo === null) return null;
    return { responseId: p.responseId, startedAt: p.startedAt, memo: p.memo };
  } catch {
    return null;
  }
}

function savePending(account: string, p: Pending) {
  try {
    localStorage.setItem(pendingKey(account), JSON.stringify(p));
  } catch {
    // Storage full or blocked: the result still arrives while this page stays open.
  }
}

// Only the entry for this job is removed: another tab may have started a newer one.
function clearPending(account: string, responseId: string) {
  try {
    if (loadPending(account)?.responseId === responseId) localStorage.removeItem(pendingKey(account));
  } catch {
    // Storage blocked: nothing to remove.
  }
}

const noSubscribe = () => () => {};

/** False on the server and during hydration. Read localStorage only after this turns true. */
export function useHydrated() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

export type DiagnosisFlow = {
  /** The draft; while a diagnosis runs, the memo that was sent. */
  memo: Memo;
  setMemo: (m: Memo) => void;
  /** When a diagnosis is being started or is running: the moment it began. */
  startedAt: number | null;
  error: string | null;
  submit: () => void;
};

/** Mount only after `useHydrated()` is true: the first render reads localStorage. */
export function useDiagnosisFlow(account: string): DiagnosisFlow {
  const router = useRouter();
  const [memo, setMemo] = useState<Memo>(() => loadDraft(account));
  const [pending, setPending] = useState<Pending | null>(() => loadPending(account));
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A flow that was on screen before a sign-out writes nothing afterwards: see local-store.ts.
  const [epoch] = useState(signedOutAt);

  useEffect(() => {
    if (epoch !== signedOutAt()) return;
    try {
      localStorage.setItem(draftKey(account), JSON.stringify(memo));
    } catch {
      // Storage full or blocked: keep working without it.
    }
  }, [memo, account, epoch]);

  useEffect(() => {
    if (!pending) return;
    let busy = false;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (message: string) => {
      clearPending(account, pending.responseId);
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
          clearPending(account, pending.responseId);
          return router.push(`/reports/${result.id}`);
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
  }, [pending, router, account]);

  async function submit() {
    setError(null);
    const startedAt = Date.now();
    setStarting(startedAt);
    window.scrollTo({ top: 0 });
    try {
      const result = await requestDiagnosis(memo);
      if (!result.ok) {
        setError(result.error);
      } else if (epoch === signedOutAt()) {
        const next = { responseId: result.responseId, startedAt, memo };
        savePending(account, next);
        setPending(next);
      }
    } catch {
      setError("서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요.");
    }
    setStarting(null);
  }

  // While a job runs, show the memo that was sent: the draft may have been edited in another tab.
  return { memo: pending?.memo ?? memo, setMemo, startedAt: pending?.startedAt ?? starting, error, submit };
}

/** Elapsed time since `startedAt`, ticking once a second. */
export function useElapsed(startedAt: number) {
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    // A resumed job is already minutes in: show that at once instead of 0:00 for a second.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  return { seconds, clock: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` };
}
