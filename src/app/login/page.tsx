import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getViewer } from "@/lib/dal";
import { isLocalMode } from "@/lib/env";

export default async function LoginPage() {
  if (isLocalMode()) redirect("/");
  if (await getViewer()) redirect("/reports");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-16 pb-16 sm:pt-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">기획 메모 진단</h1>
        <p className="text-muted">등록된 이메일로 로그인 링크를 보내드려요.</p>
      </div>
      <LoginForm />
    </main>
  );
}
