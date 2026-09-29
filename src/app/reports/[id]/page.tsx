import { notFound } from "next/navigation";

import { DeleteReportButton } from "@/components/delete-report-button";
import { ReportView } from "@/components/report-view";
import { SiteHeader } from "@/components/site-header";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pt-10 pb-16 sm:gap-10 sm:pt-16">
      <SiteHeader viewer={viewer} current="reports" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{row.title}</h1>
        <p className="text-sm text-muted tabular-nums">
          {row.genre} · {dateFormat.format(row.createdAt)}
        </p>
      </div>

      <ReportView report={row.report} />

      <details className="group border-t border-border pt-6">
        <summary className="cursor-pointer text-sm text-muted transition-colors duration-(--duration-fast) hover:text-foreground">
          진단한 메모 원문 보기
        </summary>
        <div className="mt-4 flex flex-col gap-3">
          {row.references && <p className="text-sm text-muted">참고작: {row.references}</p>}
          <pre className="rounded-md bg-surface p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
            {row.memo}
          </pre>
        </div>
      </details>

      {row.canDelete && (
        <footer className="border-t border-border pt-6">
          <DeleteReportButton id={row.id} />
        </footer>
      )}
    </main>
  );
}
