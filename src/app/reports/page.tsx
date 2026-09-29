import Link from "next/link";

import { ChevronRight, FileText } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { card, container, primaryButton, secondaryButton, tag } from "@/components/styles";
import { listReports, requireViewer } from "@/lib/dal";

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function ReportsPage() {
  const viewer = await requireViewer();
  const reports = await listReports();

  return (
    <>
      <SiteHeader viewer={viewer} current="reports" />
      <main className={`${container} flex flex-col gap-6 pt-8 pb-16 sm:gap-8 sm:pt-12`}>
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">리포트</h1>
            {reports.length > 0 && <p className="text-secondary">저장된 진단 {reports.length}개</p>}
          </div>
          {viewer.canDiagnose && reports.length > 0 && (
            <Link href="/" className={secondaryButton}>
              새 진단
            </Link>
          )}
        </div>

        {reports.length === 0 ? (
          <div className={`${card} flex flex-col items-center gap-4 px-6 py-14 text-center`}>
            <span className="flex size-12 items-center justify-center rounded-full bg-fill text-muted">
              <FileText className="size-6" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-lg font-bold">아직 저장된 리포트가 없어요</p>
              <p className="text-sm text-muted">
                {viewer.canDiagnose ? "새 진단에서 기획 메모를 진단해 보세요." : "작성자가 진단하면 여기에 쌓여요."}
              </p>
            </div>
            {viewer.canDiagnose && (
              <Link href="/" className={primaryButton}>
                새 진단 시작하기
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/reports/${r.id}`}
                  className={`${card} press group flex items-center gap-4 p-5 hover:bg-surface-hover sm:px-6`}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="line-clamp-2 font-semibold">{r.title}</span>
                    <span className="flex items-center gap-2 text-sm text-muted tabular-nums">
                      <span className={tag}>{r.genre}</span>
                      {dateFormat.format(r.createdAt)}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-muted transition-colors duration-(--duration-fast) group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
