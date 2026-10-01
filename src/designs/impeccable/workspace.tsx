"use client";

import { ArrowLeftIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { removeReport } from "@/app/actions";
import { buildReview, layoutManuscript } from "../shared/review";
import type { ReportDoc } from "../shared/variant";
import { GenreTag, Shell, formatDate } from "./chrome";
import { Manuscript } from "./manuscript";
import { axisKey, firstLocated, flagsFor, noteKey, sectionOf, visibleQuotes, type Mode, type Origin, type Selection } from "./model";
import { Opinions, revealOpinion } from "./opinions";

const DESKTOP = "(min-width: 64rem)";
const subscribeDesktop = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

function useDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
}

export function Workspace({ doc, signOut }: { doc: ReportDoc; signOut: boolean }) {
  const review = useMemo(() => buildReview(doc.memo, doc.report), [doc.memo, doc.report]);
  const [mode, setMode] = useState<Mode>("all");
  const [selected, setSelected] = useState<Selection | null>(null);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const desktop = useDesktop();
  const scrollRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLElement>(null);

  const quotes = useMemo(() => visibleQuotes(review, mode, selected?.noteId ?? null), [review, mode, selected?.noteId]);
  const lines = useMemo(() => layoutManuscript(doc.memo.memo, quotes), [doc.memo.memo, quotes]);
  const flags = useMemo(() => flagsFor(quotes, lines, review), [quotes, lines, review]);

  const select = useCallback(
    (noteId: string, quoteId: string | null, origin: Origin) => {
      const note = review.note(noteId);
      if (!note) return;
      setOpen((prev) => {
        const next = new Set(prev);
        next.add(sectionOf(note));
        if (note.axis) next.add(axisKey(note.axis));
        next.add(noteKey(noteId));
        return next;
      });
      setSelected((prev) => ({ noteId, quoteId: quoteId ?? firstLocated(note)?.id ?? null, origin, n: (prev?.n ?? 0) + 1 }));
      if (origin === "page") setSheetOpen(true);
      if (origin === "quote") setSheetOpen(false);
    },
    [review],
  );

  const toggle = useCallback((key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const opinions = <Opinions review={review} selected={selected} open={open} onToggle={toggle} onSelect={select} />;

  return (
    <Shell current="reports" signOut={signOut} className="h-dvh overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-3 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
        <Link
          href="/reports"
          className="type-ui inline-flex shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          리포트 목록
        </Link>
        <div className="order-last flex min-w-0 basis-full flex-col gap-1.5 lg:order-none lg:basis-auto lg:flex-1 lg:flex-row lg:items-center lg:gap-3">
          <h1 className="type-page min-w-0 max-lg:line-clamp-2 lg:truncate" title={doc.title}>
            {doc.title}
          </h1>
          <p className="type-meta flex shrink-0 items-center gap-2 text-muted-foreground tabular-nums">
            <GenreTag>{doc.genre}</GenreTag>
            {formatDate(doc.createdAt)}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DeleteButton id={doc.id} />
          <ToggleGroup
            value={[mode]}
            onValueChange={(value) => {
              if (value[0]) setMode(value[0] as Mode);
            }}
            spacing={1}
            aria-label="원고에 표시할 의견"
            className="rounded-lg bg-secondary p-0.5"
          >
            <ToggleGroupItem value="top" className="type-ui h-8 px-3 text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs">
              먼저 고칠 곳
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="type-ui h-8 px-3 text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs">
              모든 의견
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.25rem_minmax(0,1fr)] lg:grid-cols-[3rem_minmax(0,1fr)_clamp(20rem,30vw,26rem)]">
        <Manuscript review={review} lines={lines} flags={flags} selected={selected} onSelect={select} scrollRef={scrollRef} paperRef={paperRef} />
        {desktop && <aside className="min-h-0 overflow-y-auto border-l border-border bg-panel">{opinions}</aside>}
      </div>

      {!desktop && (
        <>
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card px-4 pt-3 pb-[calc(0.75rem+var(--switch-clearance,0px))]">
            <Button type="button" className="type-ui h-12 w-full" onClick={() => setSheetOpen(true)}>
              의견 보기{review.top.length > 0 && ` · 먼저 고칠 ${review.top.length}가지`}
            </Button>
          </div>
          <Sheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            onOpenChangeComplete={(isOpen) => {
              const note = isOpen && selected ? review.note(selected.noteId) : undefined;
              if (note) revealOpinion(note);
            }}
          >
            <SheetContent side="bottom" showCloseButton={false} style={{ height: "85dvh" }} className="gap-0 overflow-hidden rounded-t-xl bg-panel p-0">
              <div className="flex shrink-0 items-center justify-between border-b border-border py-1 pr-1 pl-5 sm:pl-6">
                <SheetTitle className="type-ui text-sm text-ink-soft">의견</SheetTitle>
                <SheetClose aria-label="의견 닫기" render={<Button type="button" variant="ghost" size="icon-lg" className="size-11" />}>
                  <XIcon className="size-5" aria-hidden />
                </SheetClose>
              </div>
              <SheetDescription className="sr-only">총평, 먼저 고칠 점, 좋은 점, 설정 정리, 항목별 신호등, 참고작</SheetDescription>
              <div className="min-h-0 flex-1 overflow-y-auto">{opinions}</div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </Shell>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={confirming ? "destructive" : "ghost"}
      size="lg"
      className="type-ui text-muted-foreground aria-[pressed=true]:text-destructive"
      disabled={pending}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) return setConfirming(true);
        startTransition(() => removeReport(id));
      }}
    >
      {pending ? "지우는 중" : confirming ? "한 번 더 누르면 지워져요" : "지우기"}
    </Button>
  );
}
