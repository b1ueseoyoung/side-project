"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SESSION_ENDED_KEY, announceSessionEnd, clearLocalDiagnosis } from "@/designs/shared/local-store";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        // The memo must not stay on a shared browser after its writer leaves.
        clearLocalDiagnosis();
        const { error } = await authClient.signOut();
        if (!error) announceSessionEnd();
        router.replace("/login");
      }}
    >
      로그아웃
    </button>
  );
}

/** Leaves for the login page when another tab signs out, so nothing of the account stays on this screen. */
export function LeaveOnSignOut() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_ENDED_KEY) window.location.replace("/login");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
