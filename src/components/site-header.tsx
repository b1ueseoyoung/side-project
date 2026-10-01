import Link from "next/link";

import type { Viewer } from "@/lib/dal";
import { Logo } from "./icons";
import { SignOutButton } from "./sign-out-button";
import { container } from "./styles";

const link =
  "rounded-md px-3 py-1.5 text-sm font-semibold text-muted transition-colors duration-(--duration-fast) hover:bg-fill hover:text-foreground aria-[current=page]:bg-fill aria-[current=page]:text-foreground";

export function SiteHeader({ viewer, current }: { viewer: Viewer; current: "new" | "reports" | null }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className={`${container} flex h-14 items-center justify-between gap-4`}>
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight"
        >
          <Logo />
          기획 메모 진단
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className={link} aria-current={current === "new" ? "page" : undefined}>
            새 진단
          </Link>
          <Link href="/reports" className={link} aria-current={current === "reports" ? "page" : undefined}>
            리포트
          </Link>
          {!viewer.local && <SignOutButton />}
        </nav>
      </div>
    </header>
  );
}
