"use client";

import { cn } from "cn";
import { useEffect, useLayoutEffect, useMemo, useState, type RefObject } from "react";

import type { Line, Review, Span } from "../shared/review";
import { toParagraphs } from "../shared/review";
import { familyOf, strongestFamily, type Flag, type Origin, type Selection } from "./model";

type Geometry = { paperTop: number; flagTops: Record<string, number>; paraTops: number[] };
type View = { top: number; height: number; total: number };

const FLAG_GAP = 2;

export function quoteDomId(quoteId: string) {
  return quoteId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Props = {
  review: Review;
  lines: Line[];
  flags: Flag[];
  selected: Selection | null;
  onSelect: (noteId: string, quoteId: string | null, origin: Origin) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  paperRef: RefObject<HTMLElement | null>;
};

export function Manuscript({ review, lines, flags, selected, onSelect, scrollRef, paperRef }: Props) {
  const paragraphs = useMemo(() => toParagraphs(lines), [lines]);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [view, setView] = useState<View>({ top: 0, height: 0, total: 1 });

  const firstSpanOf = useMemo(() => {
    const seen = new Set<string>();
    const firsts = new Map<string, string>();
    for (const line of lines) {
      for (const span of line.spans) {
        const ids = span.quotes.filter((q) => !seen.has(q.id)).map((q) => q.id);
        if (!ids.length) continue;
        ids.forEach((id) => seen.add(id));
        firsts.set(`${line.index}:${span.start}`, ids.map(quoteDomId).join(" "));
      }
    }
    return firsts;
  }, [lines]);

  useLayoutEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const measure = () => {
      const lineTops = new Map<number, number>();
      for (const el of paper.querySelectorAll<HTMLElement>("[data-line]")) lineTops.set(Number(el.dataset.line), el.offsetTop);
      const flagHeight = paper.querySelector<HTMLElement>(".flag")?.offsetHeight ?? 24;
      const flagTops: Record<string, number> = {};
      let prevBottom = -Infinity;
      for (const f of flags) {
        const top = Math.max(lineTops.get(f.line) ?? 0, prevBottom + FLAG_GAP);
        flagTops[f.key] = top;
        prevBottom = top + flagHeight;
      }
      const paraTops = Array.from(paper.querySelectorAll<HTMLElement>("[data-para]"), (el) => paper.offsetTop + el.offsetTop);
      setGeometry({ paperTop: paper.offsetTop, flagTops, paraTops });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(paper);
    return () => observer.disconnect();
  }, [flags, paperRef]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setView({ top: scroller.scrollTop, height: scroller.clientHeight, total: Math.max(1, scroller.scrollHeight) });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    scroller.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    for (const child of scroller.children) observer.observe(child);
    return () => {
      scroller.removeEventListener("scroll", schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [scrollRef, lines]);

  useEffect(() => {
    if (!selected || selected.origin === "page" || !selected.quoteId) return;
    const target = document.querySelector(`[data-first~="${CSS.escape(quoteDomId(selected.quoteId))}"]`);
    target?.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
  }, [selected]);

  const pct = (y: number) => `${(y / view.total) * 100}%`;

  return (
    <>
      <div
        className="relative min-h-0 border-r border-border bg-background/60"
        onClick={(e) => {
          const scroller = scrollRef.current;
          if (!scroller) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientY - rect.top) / rect.height;
          scroller.scrollTo({ top: ratio * view.total - view.height / 2, behavior: reduceMotion() ? "auto" : "smooth" });
        }}
        aria-hidden
      >
        {geometry?.paraTops.map((y, i) => <span key={i} className="tick" style={{ top: pct(y) }} />)}
        {geometry &&
          flags.map((f) => (
            <span
              key={f.key}
              className="tick"
              data-family={f.family}
              data-selected={selected?.noteId === f.noteId || undefined}
              style={{ top: pct(geometry.paperTop + geometry.flagTops[f.key]) }}
            />
          ))}
        <span
          className="absolute inset-x-0.5 rounded-sm border border-foreground/35"
          style={{ top: pct(view.top), height: pct(view.height) }}
        />
      </div>

      <div ref={scrollRef} className="relative min-h-0 overflow-y-auto overscroll-contain px-3 pt-5 pb-[calc(6rem+var(--switch-clearance,0px))] sm:px-6 lg:py-8">
        <article
          ref={paperRef}
          className="paper relative mx-auto w-full max-w-240 py-10 pr-(--flag-w) pl-5 [--flag-w:2.75rem] sm:pl-10 lg:py-14 lg:[--flag-w:9rem] xl:pl-16"
        >
          <div className="type-manuscript">
            {paragraphs.map((paragraph, i) => (
              <p key={i} data-para className="mb-4 last:mb-0">
                {paragraph.map((line) => (
                  <span key={line.index} data-line={line.index} className="block">
                    {line.spans.map((span) => (
                      <SpanView
                        key={span.start}
                        span={span}
                        review={review}
                        selected={selected}
                        first={firstSpanOf.get(`${line.index}:${span.start}`)}
                        onSelect={onSelect}
                      />
                    ))}
                  </span>
                ))}
              </p>
            ))}
          </div>

          <div className="absolute inset-y-0 right-0 w-(--flag-w)">
            {flags.map((f) => {
              const top = geometry?.flagTops[f.key];
              const isSelected = selected?.noteId === f.noteId;
              return (
                <button
                  key={f.key}
                  type="button"
                  data-family={f.family}
                  data-selected={isSelected || undefined}
                  aria-pressed={isSelected}
                  aria-label={`${f.label} 의견 열기`}
                  className={cn("flag absolute -right-3 left-1 lg:-right-5 lg:left-2", top === undefined && "invisible")}
                  style={{ top }}
                  onClick={() => onSelect(f.noteId, f.quoteId, "page")}
                >
                  <span className="type-meta truncate px-1.5 tabular-nums lg:px-2.5">
                    <span className="lg:hidden">{f.short}</span>
                    <span className="hidden lg:inline">
                      {f.priority !== null && <b className="font-semibold">{f.priority} </b>}
                      {f.priority !== null ? f.label.slice(String(f.priority).length + 1) : f.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </article>
      </div>
    </>
  );
}

function SpanView({
  span,
  review,
  selected,
  first,
  onSelect,
}: {
  span: Span;
  review: Review;
  selected: Selection | null;
  first: string | undefined;
  onSelect: Props["onSelect"];
}) {
  if (!span.quotes.length) return <>{span.text}</>;
  const family = strongestFamily(span.quotes.map((q) => familyOf(review.note(q.noteId)!)));
  const own = selected ? span.quotes.find((q) => q.noteId === selected.noteId) : undefined;
  const primary = own ?? span.quotes[0];
  return (
    <mark
      className="marker"
      data-family={family}
      data-selected={own ? true : undefined}
      data-first={first}
      onClick={() => onSelect(primary.noteId, primary.id, "page")}
    >
      {span.text}
    </mark>
  );
}
