import { redirect } from "next/navigation";

import { Logo } from "@/components/icons";
import { LoginForm } from "@/components/login-form";
import { card } from "@/components/styles";
import { getViewer } from "@/lib/dal";
import { isLocalMode } from "@/lib/env";

export default async function LoginPage() {
  if (isLocalMode()) redirect("/");
  if (await getViewer()) redirect("/reports");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="size-11" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">기획 메모 진단</h1>
            <p className="text-secondary">등록된 이메일로 로그인 링크를 보내드려요.</p>
          </div>
        </div>
        <div className={`${card} p-6`}>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
