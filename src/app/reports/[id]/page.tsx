import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteReportButton } from "@/components/delete-report-button";
import { ArrowLeft, ChevronDown } from "@/components/icons";
import { ReportView } from "@/components/report-view";
import { SiteHeader } from "@/components/site-header";
import { card, container, tag } from "@/components/styles";
import { getReport, requireViewer } from "@/lib/dal";

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const row = await getReport(id);
  if (!row) notFound();

  return (
    <>
      <SiteHeader viewer={viewer} current="reports" />
      <main className={`${container} flex flex-col gap-8 pt-6 pb-16 sm:gap-10 sm:pt-10`}>
        <div className="flex flex-col gap-3">
          <Link
            href="/reports"
            className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted transition-colors duration-(--duration-fast) hover:text-foreground"
          >
            <ArrowLeft />
            리포트 목록
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{row.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted tabular-nums">
            <span className={tag}>{row.genre}</span>
            {dateFormat.format(row.createdAt)}
          </p>
        </div>

        <ReportView report={row.report} />

        <details className={`${card} group`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg p-5 font-semibold transition-colors duration-(--duration-fast) hover:bg-surface-hover sm:px-6 [&::-webkit-details-marker]:hidden">
            진단한 메모 원문 보기
            <ChevronDown className="size-5 text-muted transition-transform duration-(--duration-fast) group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
            {row.references && <p className="text-sm text-muted">참고작: {row.references}</p>}
            <pre className="rounded-md bg-fill p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {row.memo}
            </pre>
          </div>
        </details>

        {row.canDelete && (
          <footer className="flex justify-center">
            <DeleteReportButton id={row.id} />
          </footer>
        )}
      </main>
    </>
  );
}
