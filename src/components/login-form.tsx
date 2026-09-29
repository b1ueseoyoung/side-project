"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { enter, field, primaryButton } from "./styles";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/reports" });
    // Unregistered addresses get the same message, so the form doesn't reveal who is allowed.
    setState(error && error.status !== 400 ? "error" : "sent");
  }

  if (state === "sent") {
    return (
      <p className={`font-serif ${enter}`} role="status">
        등록된 이메일이면 로그인 링크를 보냈어요. 10분 안에 메일의 링크를 눌러 주세요.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">이메일</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
      </label>
      {state === "error" && (
        <p role="alert" className="text-sm font-semibold">
          잠시 뒤에 다시 해보세요. 여러 번 요청하면 10분 동안 막혀요.
        </p>
      )}
      <div>
        <button type="submit" className={primaryButton} disabled={state === "sending"}>
          {state === "sending" ? "보내는 중" : "로그인 링크 받기"}
        </button>
      </div>
    </form>
  );
}
