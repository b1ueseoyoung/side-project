import { BookMarkedIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";

import { SignOutButton } from "@/components/sign-out-button";
import type { Signal as SignalId } from "@/lib/diagnosis/types";

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

const navLink =
  "type-ui rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground";

export function Shell({
  current,
  signOut,
  className,
  children,
}: {
  current: "new" | "reports";
  /** Show 로그아웃: false on the owner's Mac, where there is no login. */
  signOut: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-dvh flex-col", className)}>
      <header className="z-20 flex h-13 shrink-0 items-center gap-6 border-b border-border bg-card px-4 sm:px-6">
        <Link href="/" className="type-ui flex items-center gap-2.5 font-bold text-foreground">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-card">
            <BookMarkedIcon className="size-4" aria-hidden />
          </span>
          기획 메모 진단
        </Link>
        <nav className="flex items-center gap-1" aria-label="주 메뉴">
          <Link href="/" className={navLink} aria-current={current === "new" ? "page" : undefined}>
            새 진단
          </Link>
          <Link href="/reports" className={navLink} aria-current={current === "reports" ? "page" : undefined}>
            리포트
          </Link>
        </nav>
        {signOut && <SignOutButton className={`${navLink} ml-auto`} />}
      </header>
      {children}
    </div>
  );
}

export function GenreTag({ children }: { children: ReactNode }) {
  return (
    <span className="type-meta inline-flex h-6 shrink-0 items-center rounded-full border border-input px-2.5 whitespace-nowrap text-ink-soft">
      {children}
    </span>
  );
}

export const SIGNAL_LABEL: Record<SignalId, string> = { fix: "고쳐보세요", improve: "조금 더", good: "좋아요" };

export function Shape({ signal, className }: { signal: SignalId; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={cn("size-2.5 shrink-0 fill-current", className)} aria-hidden>
      {signal === "fix" ? (
        <rect x="1" y="1" width="10" height="10" rx="1.5" />
      ) : signal === "improve" ? (
        <path d="M6 1.2 11 10.8H1z" />
      ) : (
        <circle cx="6" cy="6" r="5" />
      )}
    </svg>
  );
}

export function Signal({ signal, className }: { signal: SignalId; className?: string }) {
  return (
    <span data-family={signal} className={cn("type-ui inline-flex shrink-0 items-center gap-1.5 text-(--f)", className)}>
      <Shape signal={signal} />
      {SIGNAL_LABEL[signal]}
    </span>
  );
}
