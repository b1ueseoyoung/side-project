"use client";

import { useRouter } from "next/navigation";

import { clearLocalDiagnosis } from "@/designs/shared/flow";
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
        await authClient.signOut();
        router.replace("/login");
      }}
    >
      로그아웃
    </button>
  );
}
