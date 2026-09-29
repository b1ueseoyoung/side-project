import { redirect } from "next/navigation";

import { DiagnosisApp } from "@/components/diagnosis-app";
import { SiteHeader } from "@/components/site-header";
import { requireViewer } from "@/lib/dal";

export default async function Home() {
  const viewer = await requireViewer();
  // The deployed app only shows saved reports; diagnosis runs on the owner's Mac.
  if (!viewer.canDiagnose) redirect("/reports");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pt-10 pb-16 sm:gap-10 sm:pt-16">
      <SiteHeader viewer={viewer} current="new" />
      <p className="text-muted">
        러프한 기획 메모를 붙여넣으면 설정을 정리하고, 상업성·캐릭터·작법과 참고작 겹침을 보고 가장 먼저 손볼
        점을 알려드려요.
      </p>
      <DiagnosisApp />
    </main>
  );
}
