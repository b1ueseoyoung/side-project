"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ALL_QUESTIONS, AXIS_LABELS, type Axis } from "@/lib/diagnosis/items";
import type { Evidence, ItemResult, Report } from "@/lib/diagnosis/types";
import { Check, ChevronDown, ChevronRight } from "./icons";
import { Shape, ShapeRow, Signal } from "./signal";
import { card, enter } from "./styles";

const QUESTION_TEXT = new Map(ALL_QUESTIONS.map((q) => [q.id, q.text]));

/** A quote from the memo. `marked` draws the highlighter over it once; `plain` drops the box. */
function Quote({ evidence, marked = false, plain = false }: { evidence: Evidence; marked?: boolean; plain?: boolean }) {
  return (
    <span
      className={
        plain
          ? "block text-sm text-muted"
          : "block rounded-md bg-fill px-3.5 py-2.5 text-sm leading-relaxed text-secondary"
      }
    >
      <span className="sr-only">메모 인용: </span>
      <span data-active={marked ? "" : undefined} className="marker-draw">
        {QUOTED.test(evidence.quote) ? evidence.quote : `“${evidence.quote}”`}
      </span>
    </span>
  );
}

// Dialogue lines already carry their own quote marks; don't wrap them twice.
const QUOTED = /^["“'‘][\s\S]*["”'’]$/;

/** Quotes that show the problem: evidence attached to "no" answers. */
function problemEvidence(item: ItemResult) {
  return item.answers.filter((a) => a.answer === "no").flatMap((a) => a.evidence);
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-muted">{label}</span>
      <span className="leading-relaxed">{children}</span>
    </span>
  );
}

function Direction({ text }: { text: string }) {
  return (
    <span className="flex flex-col gap-1 rounded-md bg-accent-soft px-4 py-3">
      <span className="text-xs font-bold text-accent-ink">이렇게 고쳐보세요</span>
      <span className="text-sm leading-relaxed">{text}</span>
    </span>
  );
}

export function ReportView({ report }: { report: Report }) {
  const [open, setOpen] = useState<Set<Axis>>(new Set());
  // The item a "고칠 점" card pointed to; its problem quotes get the highlighter.
  // `n` changes on every click so the same card scrolls again.
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);

  function toggle(axis: Axis) {
    const next = new Set(open);
    if (next.has(axis)) next.delete(axis);
    else next.add(axis);
    setOpen(next);
  }

  function jumpTo(item: ItemResult) {
    setOpen(new Set(open).add(item.axis));
    setFocus({ id: item.id, n: (focus?.n ?? 0) + 1 });
  }

  // Scroll once the axis has opened and the item is in the DOM.
  useEffect(() => {
    if (!focus) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`item-${focus.id}`)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [focus]);

  return (
    <article className={`flex flex-col gap-10 ${enter}`}>
      <section className={`${card} flex flex-col gap-2 p-6 sm:p-8`}>
        <h2 className="text-sm font-bold text-accent-ink">총평</h2>
        <p className="text-lg leading-snug font-bold tracking-tight sm:text-xl">{report.summary}</p>
      </section>

      {report.strengths.length > 0 && (
        <Section title="이런 점이 좋아요">
          <ul className={`${card} flex flex-col divide-y divide-border`}>
            {report.strengths.map((s, i) => (
              <li key={i} className="flex gap-3 p-5 sm:px-6">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-signal-good-soft text-signal-good">
                  <Check className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="leading-relaxed">{s.text}</span>
                  {s.evidence.slice(0, 1).map((e, j) => (
                    <Quote key={j} evidence={e} plain />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title={report.topFixes.length ? `가장 먼저 고칠 ${report.topFixes.length}가지` : "가장 먼저 고칠 점"}
        note={report.topFixes.length ? "번호 순서대로 손보면 좋아요. 카드를 누르면 판정 근거로 이동해요." : undefined}
      >
        {report.topFixes.length === 0 ? (
          <p className={`${card} p-5 sm:px-6`}>지금 판정한 항목 중에는 먼저 고칠 곳이 없어요.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {report.topFixes.map((item, i) => {
              // Conflicts come in pairs, so four quotes keep both sides of two conflicts;
              // the rest are under "근거 모두 보기".
              const quotes = problemEvidence(item).slice(0, 4);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(item)}
                    className={`${card} press flex w-full flex-col gap-4 p-5 text-left hover:bg-surface-hover sm:p-6`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-surface tabular-nums">
                        {i + 1}
                      </span>
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-lg font-bold tracking-tight">{item.label}</span>
                        <Signal mark={item.signal} />
                      </span>
                    </span>
                    <Part label="문제">{item.comment}</Part>
                    {quotes.length > 0 && (
                      <Part label="메모 속 근거">
                        <span className="flex flex-col gap-2">
                          {quotes.map((q, j) => (
                            <Quote key={j} evidence={q} />
                          ))}
                        </span>
                      </Part>
                    )}
                    {item.direction && <Direction text={item.direction} />}
                    <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-accent-ink">
                      근거 모두 보기
                      <ChevronRight />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <SettingSection setting={report.setting} />

      <Section
        title="항목별 신호등"
        note="항목을 펼치면 질문마다 어떻게 판정했는지 볼 수 있어요. 개성과 장르 재미는 실제 작품 데이터가 아니라 장르의 흔한 설정을 기준으로 본 판단이에요."
      >
        <div className={`${card} flex flex-col divide-y divide-border overflow-hidden`}>
          {(Object.keys(AXIS_LABELS) as Axis[]).map((axis) => {
            const items = report.items.filter((i) => i.axis === axis);
            // Reports saved before an axis existed have no items for it.
            if (items.length === 0) return null;
            const isOpen = open.has(axis);
            return (
              <div key={axis}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`axis-${axis}`}
                  onClick={() => toggle(axis)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-(--duration-fast) hover:bg-surface-hover sm:px-6"
                >
                  <span className="font-bold">{AXIS_LABELS[axis]}</span>
                  <span className="flex items-center gap-3">
                    <ShapeRow marks={items.map((i) => i.signal)} />
                    <ChevronDown
                      className={`size-5 text-muted transition-transform duration-(--duration-fast) ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                {isOpen && (
                  <ul id={`axis-${axis}`} className={`flex flex-col gap-3 px-5 pb-5 sm:px-6 sm:pb-6 ${enter}`}>
                    {items.map((item) => (
                      <ItemDetail key={item.id} item={item} marked={focus?.id === item.id} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {report.unavailable.length > 0 && (
            <div className="flex flex-col gap-3 p-5 sm:px-6">
              <p className="text-sm font-bold text-muted">아직 판정하지 않는 항목</p>
              <ul className="flex flex-col gap-2">
                {report.unavailable.map((u) => (
                  <li key={u.id} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-3">
                    <span className="font-semibold">{u.label}</span>
                    <span className="text-muted">{u.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <Section
        title="참고작과 겹치는 부분"
        note="작가가 적은 참고작만 봐요. 표절 판정이 아니라, 너무 가까워지지 않았는지 살펴볼 곳이에요."
      >
        {report.references.length === 0 ? (
          <p className={`${card} p-5 text-sm text-muted sm:px-6`}>메모에 적힌 참고작이 없어요.</p>
        ) : (
          <ul className={`${card} flex flex-col divide-y divide-border`}>
            {report.references.map((r, i) => (
              <li key={i} className="flex flex-col gap-3 p-5 sm:px-6">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{r.work}</span>
                  <Signal mark="note" />
                </p>
                {r.overlaps.length === 0 ? (
                  <p className="text-sm text-muted">겹쳐 보이는 부분을 찾지 못했어요.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {r.overlaps.map((o, j) => (
                      <li key={j} className="flex flex-col gap-1.5">
                        <p className="leading-relaxed">{o.text}</p>
                        {o.evidence.slice(0, 1).map((e, k) => (
                          <Quote key={k} evidence={e} plain />
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {report.droppedQuotes > 0 && (
        <p className="px-1 text-sm text-muted">
          메모 원문에서 찾지 못한 인용 {report.droppedQuotes}개는 근거에서 뺐어요.
        </p>
      )}
    </article>
  );
}

function SettingSection({ setting }: { setting: Report["setting"] }) {
  const groups: { title: string; entries: { head?: string; text: string; evidence: Evidence[] }[] }[] = [
    {
      title: "인물",
      entries: setting.characters.map((c) => ({
        head: c.name,
        text: [c.role, c.want && `원하는 것: ${c.want}`].filter(Boolean).join(" · "),
        evidence: c.evidence,
      })),
    },
    { title: "세계 규칙", entries: setting.rules },
    { title: "사건 순서", entries: setting.events },
    { title: "어긋나는 설정", entries: setting.conflicts },
    { title: "버리거나 바꾼 설정", entries: setting.dropped },
  ].filter((g) => g.entries.length > 0);

  if (groups.length === 0) return null;

  return (
    <Section title="설정 정리" note="메모에 흩어진 내용을 최종안 기준으로 모았어요. 항목마다 메모 속 문장을 붙였어요.">
      <div className={`${card} flex flex-col divide-y divide-border`}>
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-4 p-5 sm:px-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-muted">
              {g.title === "어긋나는 설정" && (
                <span className="text-signal-fix">
                  <Shape mark="fix" size={10} />
                </span>
              )}
              {g.title}
            </h3>
            <ol className="flex flex-col gap-4">
              {g.entries.map((e, i) => (
                <li key={i} className="flex gap-3">
                  {g.title === "사건 순서" && (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fill text-xs font-bold text-secondary tabular-nums">
                      {i + 1}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="leading-relaxed">
                      {e.head && <span className="font-bold">{e.head} </span>}
                      <span className={e.head ? "text-secondary" : ""}>{e.text}</span>
                    </span>
                    {(g.title === "어긋나는 설정" ? e.evidence : e.evidence.slice(0, 1)).map((ev, j) => (
                      <Quote key={j} evidence={ev} plain />
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ItemDetail({ item, marked }: { item: ItemResult; marked: boolean }) {
  return (
    <li id={`item-${item.id}`} className="flex scroll-mt-20 flex-col gap-3 rounded-md border border-border p-4 sm:p-5">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-bold">{item.label}</span>
        <Signal mark={item.signal} />
      </p>
      <p className="leading-relaxed">{item.comment}</p>
      {item.direction && <Direction text={item.direction} />}
      <ul className="mt-1 flex flex-col gap-4 border-t border-border pt-4">
        {item.answers.map((a) => (
          <li key={a.question_id} className="flex flex-col gap-2 text-sm">
            <p className="flex items-start gap-2">
              <span className="mt-px shrink-0 rounded-sm bg-fill px-1.5 py-0.5 text-xs font-bold">
                {a.answer === "yes" ? "예" : "아니오"}
              </span>
              <span className="font-semibold">{QUESTION_TEXT.get(a.question_id)}</span>
            </p>
            <p className="leading-relaxed text-secondary">{a.reason}</p>
            {a.evidence.map((e, j) => (
              <Quote key={j} evidence={e} marked={marked && a.answer === "no"} />
            ))}
          </li>
        ))}
      </ul>
    </li>
  );
}
