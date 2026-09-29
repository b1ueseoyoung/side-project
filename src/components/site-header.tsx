import Link from "next/link";

import type { Viewer } from "@/lib/dal";
import { SignOutButton } from "./sign-out-button";

const link =
  "text-sm text-muted transition-colors duration-(--duration-fast) hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground";

export function SiteHeader({ viewer, current }: { viewer: Viewer; current: "new" | "reports" | null }) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <Link href={viewer.canDiagnose ? "/" : "/reports"} className="text-lg font-semibold">
        기획 메모 진단
      </Link>
      <nav className="flex items-baseline gap-5">
        {viewer.canDiagnose && (
          <Link href="/" className={link} aria-current={current === "new" ? "page" : undefined}>
            새 진단
          </Link>
        )}
        <Link href="/reports" className={link} aria-current={current === "reports" ? "page" : undefined}>
          리포트
        </Link>
        {!viewer.canDiagnose && <SignOutButton />}
      </nav>
    </header>
  );
}
