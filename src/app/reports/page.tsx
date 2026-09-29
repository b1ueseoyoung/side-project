import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pt-10 pb-16 sm:gap-10 sm:pt-16">
      <SiteHeader viewer={viewer} current="reports" />
      {reports.length === 0 ? (
        <p className="text-muted">
          아직 저장된 리포트가 없어요.
          {viewer.canDiagnose ? " 새 진단에서 기획 메모를 진단해 보세요." : " 작성자가 진단하면 여기에 쌓여요."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {reports.map((r) => (
            <li key={r.id} className="border-b border-border">
              <Link
                href={`/reports/${r.id}`}
                className="group flex flex-col gap-1 py-4 transition-colors duration-(--duration-fast)"
              >
                <span className="font-semibold group-hover:underline group-hover:underline-offset-4">
                  {r.title}
                </span>
                <span className="text-sm text-muted tabular-nums">
                  {r.genre} · {dateFormat.format(r.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
