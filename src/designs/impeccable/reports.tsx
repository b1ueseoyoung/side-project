import { ChevronRightIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { GenreTag, Shell, formatDate } from "./chrome";

type Row = { id: string; title: string; genre: string; createdAt: string };

export function Reports({ reports, signOut }: { reports: Row[]; signOut: boolean }) {
  return (
    <Shell current="reports" signOut={signOut}>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="type-page">리포트</h1>
            {reports.length > 0 && <p className="type-body text-ink-soft">저장된 진단 {reports.length}개</p>}
          </div>
          {reports.length > 0 && (
            <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "type-ui bg-card" })}>
              새 진단
            </Link>
          )}
        </div>

        {reports.length === 0 ? (
          <Empty className="paper flex-none rounded-xs py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-12 rounded-full">
                <FileTextIcon className="size-5" />
              </EmptyMedia>
              <p className="type-section">아직 저장된 리포트가 없어요</p>
              <p className="type-body text-muted-foreground">새 진단에서 기획 메모를 진단해 보세요.</p>
            </EmptyHeader>
            <Link href="/" className={buttonVariants({ size: "lg", className: "type-ui h-12 px-6" })}>
              새 진단 시작하기
            </Link>
          </Empty>
        ) : (
          <ul className="paper divide-y divide-border">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/reports/${r.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 focus-visible:-outline-offset-2 sm:px-6"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="type-body line-clamp-2 font-semibold">{r.title}</span>
                    <span className="type-meta flex items-center gap-2 text-muted-foreground tabular-nums">
                      <GenreTag>{r.genre}</GenreTag>
                      {formatDate(r.createdAt)}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Shell>
  );
}
