import { redirect } from "next/navigation";

import { DiagnosisApp } from "@/components/diagnosis-app";
import { SiteHeader } from "@/components/site-header";
import { container } from "@/components/styles";
import { requireViewer } from "@/lib/dal";

export default async function Home() {
  const viewer = await requireViewer();
  // The deployed app only shows saved reports; diagnosis runs on the owner's Mac.
  if (!viewer.canDiagnose) redirect("/reports");

  return (
    <>
      <SiteHeader viewer={viewer} current="new" />
      <main className={`${container} flex flex-col gap-6 pt-8 pb-16 sm:gap-8 sm:pt-12`}>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">새 진단</h1>
          <p className="text-secondary">
            러프한 기획 메모를 붙여넣으면 설정을 정리하고, 개성과 상업성, 캐릭터, 서사, 웹툰 연재 작법을 편집자
            눈높이로 봐서 가장 먼저 손볼 점을 알려드려요.
          </p>
        </div>
        <DiagnosisApp />
      </main>
    </>
  );
}
