import { BookMarkedIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getViewer } from "@/lib/dal";
import { isLocalMode } from "@/lib/env";

export default async function LoginPage() {
  if (isLocalMode()) redirect("/");
  if (await getViewer()) redirect("/reports");

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-lg bg-foreground text-card">
            <BookMarkedIcon className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="type-page">기획 메모 진단</h1>
            <p className="type-body text-ink-soft">등록된 이메일로 로그인 링크를 보내드려요.</p>
          </div>
        </div>
        <div className="paper p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
