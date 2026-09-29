"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { textButton } from "./styles";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={textButton}
      onClick={async () => {
        await authClient.signOut();
        router.replace("/login");
      }}
    >
      로그아웃
    </button>
  );
}
