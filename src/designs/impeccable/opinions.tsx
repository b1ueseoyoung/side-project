"use client";

import { cn } from "cn";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Signal as SignalId } from "@/lib/diagnosis/types";
import type { Note, Quote, Review } from "../shared/review";
import { Shape, Signal } from "./chrome";
import { axisKey, familyOf, firstLocated, noteDomId, noteKey, problemQuotes, quoteText, sectionOf, type Origin, type Selection } from "./model";

type Props = {
  review: Review;
  selected: Selection | null;
  open: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (noteId: string, quoteId: string | null, origin: Origin) => void;
};

const row =
  "grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto_1.25rem] items-center gap-x-2 py-3 text-left transition-colors hover:text-primary focus-visible:-outline-offset-2";

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function signalOf(note: Note): SignalId | null {
  return note.tone === "neutral" ? null : note.tone;
}

function domIdFor(note: Note) {
  return sectionOf(note) === "items" ? `${noteDomId(note.id)}-axis` : noteDomId(note.id);
}

export function revealOpinion(note: Note) {
  document.getElementById(domIdFor(note))?.scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" });
}

export function Opinions({ review, selected, open, onToggle, onSelect }: Props) {
  useEffect(() => {
    if (!selected || selected.origin !== "page") return;
    const note = review.note(selected.noteId);
    if (note) revealOpinion(note);
  }, [selected, review]);

  const { report, top, strengths, setting, axes, references } = review;
  const settingCount = setting.characters.length + setting.rules.length + setting.events.length + setting.conflicts.length + setting.dropped.length;

  return (
    <div className="flex flex-col px-5 pb-10 sm:px-6">
      <section className="py-5">
        <h2 className="type-section">총평</h2>
        <p className="type-body mt-2">{report.summary}</p>
      </section>

      <section className="border-t border-border py-5">
        <h2 className="type-section">{top.length ? `가장 먼저 고칠 ${top.length}가지` : "가장 먼저 고칠 점"}</h2>
        {top.length === 0 ? (
          <p className="type-body mt-2 text-ink-soft">지금 판정한 항목 중에는 먼저 고칠 곳이 없어요.</p>
        ) : (
          <ol className="mt-1 flex flex-col divide-y divide-border">
            {top.map((note) => (
              <li key={note.id}>
                <ItemRow note={note} domId={noteDomId(note.id)} selected={selected} open={open} onToggle={onToggle} onSelect={onSelect} brief />
              </li>
            ))}
          </ol>
        )}
      </section>

      <SectionRow id="strengths" title="이런 점이 좋아요" meta={strengths.length ? `${strengths.length}개` : "없음"} open={open} onToggle={onToggle}>
        {strengths.length === 0 ? (
          <p className="type-body text-muted-foreground">따로 적을 만한 좋은 점을 찾지 못했어요.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {strengths.map((note) => (
              <li key={note.id} id={noteDomId(note.id)} className="flex scroll-mt-4 flex-col gap-1">
                <p className="type-body">{note.body}</p>
                <QuoteList quotes={note.quotes} note={note} selected={selected} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        )}
      </SectionRow>

      <SectionRow id="setting" title="설정 정리" meta={settingCount ? `${settingCount}개` : "없음"} open={open} onToggle={onToggle}>
        <SettingGroups review={review} selected={selected} onSelect={onSelect} />
      </SectionRow>

      <SectionRow id="items" title="항목별 신호등" meta={`${review.items.length}개 항목`} open={open} onToggle={onToggle}>
        <p className="type-meta mb-3 text-muted-foreground">
          항목을 펼치면 질문마다 어떻게 판정했는지 볼 수 있어요. 개성과 장르 재미는 실제 작품 데이터가 아니라 장르의 흔한 설정을
          기준으로 본 판단이에요.
        </p>
        <div className="flex flex-col divide-y divide-border">
          {axes.map((axis) => (
            <AxisRow key={axis.axis} axis={axis} selected={selected} open={open} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
        {report.unavailable.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <p className="type-ui text-muted-foreground">아직 판정하지 않는 항목</p>
            <ul className="flex flex-col gap-1.5">
              {report.unavailable.map((u) => (
                <li key={u.id} className="type-meta flex flex-col text-muted-foreground sm:flex-row sm:gap-2">
                  <span className="font-semibold text-ink-soft">{u.label}</span>
                  <span>{u.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionRow>

      <SectionRow id="references" title="참고작과 겹치는 부분" meta={references.length ? `${references.length}편` : "없음"} open={open} onToggle={onToggle}>
        <p className="type-meta mb-3 text-muted-foreground">작가가 적은 참고작만 봐요. 표절 판정이 아니라, 너무 가까워지지 않았는지 살펴볼 곳이에요.</p>
        {references.length === 0 ? (
          <p className="type-body text-muted-foreground">메모에 적힌 참고작이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {references.map(({ work, overlaps }) => (
              <li key={work.id} id={noteDomId(work.id)} className="flex scroll-mt-4 flex-col gap-2">
                <p className="type-body font-semibold">{work.label}</p>
                <QuoteList quotes={work.quotes} note={work} selected={selected} onSelect={onSelect} />
                {overlaps.length === 0 ? (
                  <p className="type-meta text-muted-foreground">겹쳐 보이는 부분을 찾지 못했어요.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {overlaps.map((o) => (
                      <li key={o.id} id={noteDomId(o.id)} className="flex scroll-mt-4 flex-col gap-1">
                        <p className="type-body">{o.body}</p>
                        <QuoteList quotes={o.quotes} note={o} selected={selected} onSelect={onSelect} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionRow>

      {report.droppedQuotes > 0 && (
        <p className="type-meta border-t border-border pt-4 text-muted-foreground">
          메모 원문에서 찾지 못한 인용 {report.droppedQuotes}개는 근거에서 뺐어요.
        </p>
      )}
    </div>
  );
}

function SectionRow({
  id,
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  open: Set<string>;
  onToggle: (key: string) => void;
  children: ReactNode;
}) {
  const isOpen = open.has(id);
  return (
    <Collapsible open={isOpen} onOpenChange={() => onToggle(id)} className="border-t border-border">
      <CollapsibleTrigger className={cn(row, "py-4")}>
        <span aria-hidden />
        <span className="type-section truncate">{title}</span>
        <span className="type-meta text-muted-foreground tabular-nums">{meta}</span>
        <Chevron open={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="panel-in pb-5 pl-8">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDownIcon
      className={cn("size-4 justify-self-end text-muted-foreground transition-transform duration-150", open && "rotate-180")}
      aria-hidden
    />
  );
}

function ItemRow({
  note,
  domId,
  selected,
  open,
  onToggle,
  onSelect,
  brief = false,
}: {
  note: Note;
  domId: string;
  selected: Selection | null;
  open: Set<string>;
  onToggle: (key: string) => void;
  onSelect: Props["onSelect"];
  brief?: boolean;
}) {
  const key = noteKey(note.id);
  const isOpen = open.has(key);
  const isSelected = selected?.noteId === note.id;
  const signal = signalOf(note);
  const quotes = brief ? problemQuotes(note) : note.quotes;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(next) => {
        if (next) onSelect(note.id, firstLocated(note)?.id ?? null, "panel");
        else onToggle(key);
      }}
    >
      <CollapsibleTrigger id={domId} className={cn(row, "scroll-mt-4")}>
        {note.priority !== null ? (
          <span className="type-body font-bold tabular-nums">{note.priority}</span>
        ) : (
          <span data-family={familyOf(note)} className="flex justify-center text-(--f)" aria-hidden>
            {signal && <Shape signal={signal} />}
          </span>
        )}
        <span className="type-body min-w-0 truncate font-semibold">
          <span className="marker" data-family={familyOf(note)} data-selected={isSelected || undefined}>
            {note.label}
          </span>
        </span>
        {signal ? <Signal signal={signal} /> : <span />}
        <Chevron open={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="panel-in flex flex-col gap-4 pb-4 pl-8">
        <Part label="문제">{note.body}</Part>
        {note.direction && <Part label="이렇게 고쳐보세요">{note.direction}</Part>}
        {brief ? (
          <div className="flex flex-col gap-1">
            <span className="type-ui text-ink-soft">메모 속 근거 {quotes.length}곳</span>
            <QuoteList quotes={quotes} note={note} selected={selected} onSelect={onSelect} divided />
          </div>
        ) : (
          <ul className="flex flex-col gap-4 border-t border-border pt-4">
            {note.answers.map((a) => (
              <li key={a.id} className="flex flex-col gap-1.5">
                <p className="type-ui flex items-start gap-2">
                  <span className="type-meta mt-px shrink-0 rounded-sm bg-secondary px-1.5 font-semibold">{a.answer === "yes" ? "예" : "아니오"}</span>
                  <span>{a.question}</span>
                </p>
                <p className="type-body text-ink-soft">{a.reason}</p>
                <QuoteList quotes={a.quotes} note={note} selected={selected} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="type-ui text-ink-soft">{label}</span>
      <p className="type-body">{children}</p>
    </div>
  );
}

function AxisRow({
  axis,
  selected,
  open,
  onToggle,
  onSelect,
}: {
  axis: Review["axes"][number];
  selected: Selection | null;
  open: Set<string>;
  onToggle: (key: string) => void;
  onSelect: Props["onSelect"];
}) {
  const key = axisKey(axis.axis);
  const isOpen = open.has(key);
  const counts = { fix: 0, improve: 0, good: 0 } as Record<SignalId, number>;
  for (const n of axis.items) {
    const s = signalOf(n);
    if (s) counts[s] += 1;
  }
  return (
    <Collapsible open={isOpen} onOpenChange={() => onToggle(key)}>
      <CollapsibleTrigger className={row}>
        <span aria-hidden />
        <span className="type-body truncate font-semibold">{axis.label}</span>
        <span className="flex items-center gap-1.5" aria-label={`좋아요 ${counts.good}개, 조금 더 ${counts.improve}개, 고쳐보세요 ${counts.fix}개`}>
          {axis.items.map((n) => {
            const s = signalOf(n);
            return s ? (
              <span key={n.id} data-family={s} className="text-(--f)" aria-hidden>
                <Shape signal={s} />
              </span>
            ) : null;
          })}
        </span>
        <Chevron open={isOpen} />
      </CollapsibleTrigger>
      <CollapsibleContent className="panel-in pb-2 pl-8">
        <ul className="flex flex-col divide-y divide-border">
          {axis.items.map((note) => (
            <li key={note.id}>
              <ItemRow note={note} domId={`${noteDomId(note.id)}-axis`} selected={selected} open={open} onToggle={onToggle} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SettingGroups({ review, selected, onSelect }: { review: Review; selected: Selection | null; onSelect: Props["onSelect"] }) {
  const s = review.setting;
  const groups: { title: string; notes: Note[]; numbered?: boolean; all?: boolean; conflict?: boolean }[] = [
    { title: "인물", notes: s.characters },
    { title: "세계 규칙", notes: s.rules },
    { title: "사건 순서", notes: s.events, numbered: true },
    { title: "어긋나는 설정", notes: s.conflicts, all: true, conflict: true },
    { title: "버리거나 바꾼 설정", notes: s.dropped },
  ].filter((g) => g.notes.length > 0);

  if (groups.length === 0) return <p className="type-body text-muted-foreground">정리할 설정을 찾지 못했어요.</p>;

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-3">
          <h3 className="type-ui flex items-center gap-1.5 text-ink-soft">
            {g.conflict && (
              <span data-family="fix" className="text-(--f)" aria-hidden>
                <Shape signal="fix" />
              </span>
            )}
            {g.title}
          </h3>
          <ol className="flex flex-col gap-3">
            {g.notes.map((note, i) => (
              <li key={note.id} id={noteDomId(note.id)} className="flex scroll-mt-4 gap-2.5">
                {g.numbered && (
                  <span className="type-meta flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold tabular-nums">
                    {i + 1}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="type-body">
                    {note.kind === "character" && <span className="font-semibold">{note.label} </span>}
                    <span className={note.kind === "character" ? "text-ink-soft" : undefined}>
                      {note.kind === "character" ? [note.body, note.want && `원하는 것: ${note.want}`].filter(Boolean).join(" · ") : note.body}
                    </span>
                  </span>
                  <QuoteList quotes={g.all ? note.quotes : note.quotes.slice(0, 1)} note={note} selected={selected} onSelect={onSelect} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

function QuoteList({
  quotes,
  note,
  selected,
  onSelect,
  divided = false,
}: {
  quotes: Quote[];
  note: Note;
  selected: Selection | null;
  onSelect: Props["onSelect"];
  divided?: boolean;
}) {
  if (!quotes.length) return null;
  const family = familyOf(note);
  return (
    <ul className={cn("flex flex-col", divided ? "divide-y divide-border" : "gap-0.5")}>
      {quotes.map((q) => (
        <li key={q.id}>
          {q.range ? (
            <button
              type="button"
              onClick={() => onSelect(q.noteId, q.id, "quote")}
              className="group type-body flex w-full items-start gap-2 py-1.5 text-left transition-colors hover:text-primary focus-visible:-outline-offset-2"
            >
              <span className="min-w-0 flex-1">
                <span className="marker" data-family={family} data-selected={selected?.quoteId === q.id || undefined}>
                  {quoteText(q.text)}
                </span>
              </span>
              <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
            </button>
          ) : (
            <span className="type-body flex items-start gap-2 py-1.5 text-muted-foreground">
              <span className="min-w-0 flex-1">{quoteText(q.text)}</span>
              <span className="type-meta mt-0.5 shrink-0">{q.where === "references" ? "참고작 칸" : "원문에서 못 찾음"}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
