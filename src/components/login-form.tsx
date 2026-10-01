"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Check } from "./icons";
import { enter, field, primaryButton } from "./styles";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/reports" });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") {
    return (
      <div className={`flex flex-col items-center gap-3 py-2 text-center ${enter}`} role="status">
        <span className="flex size-10 items-center justify-center rounded-full bg-signal-good-soft text-signal-good">
          <Check className="size-5" />
        </span>
        <p className="leading-relaxed">
          로그인 링크를 보냈어요. 10분 안에 메일의 링크를 눌러 주세요.
        </p>
      </div>
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
        <p role="alert" className="rounded-md bg-signal-fix-soft px-4 py-3 text-sm font-semibold text-signal-fix">
          이메일 주소를 확인하고 잠시 뒤에 다시 해보세요. 여러 번 요청하면 10분 동안 막혀요.
        </p>
      )}
      <button type="submit" className={`${primaryButton} w-full`} disabled={state === "sending"}>
        {state === "sending" ? "보내는 중" : "로그인 링크 받기"}
      </button>
    </form>
  );
}
