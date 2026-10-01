"use client";

import { AlertCircleIcon, CheckIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

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
      <div className="flex flex-col items-center gap-3 py-2 text-center" role="status">
        <span data-family="good" className="flex size-10 items-center justify-center rounded-full bg-(--f-film) text-(--f)">
          <CheckIcon className="size-5" aria-hidden />
        </span>
        <p className="type-body">등록된 이메일이면 로그인 링크를 보냈어요. 10분 안에 메일의 링크를 눌러 주세요.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="type-ui">이메일</span>
        <Input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 bg-card px-3 text-base md:text-base"
        />
      </label>
      {state === "error" && (
        <Alert variant="destructive" className="border-destructive/30">
          <AlertCircleIcon />
          <AlertTitle className="type-ui">잠시 뒤에 다시 해보세요. 여러 번 요청하면 10분 동안 막혀요.</AlertTitle>
        </Alert>
      )}
      <Button type="submit" size="lg" className="type-ui h-12 w-full" disabled={state === "sending"}>
        {state === "sending" ? "보내는 중" : "로그인 링크 받기"}
      </Button>
    </form>
  );
}
