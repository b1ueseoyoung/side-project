"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ALL_QUESTIONS, AXIS_LABELS, type Axis } from "@/lib/diagnosis/items";
import type { Evidence, ItemResult, Report } from "@/lib/diagnosis/types";
import { ShapeRow, Signal } from "./signal";
import { enter } from "./styles";

const QUESTION_TEXT = new Map(ALL_QUESTIONS.map((q) => [q.id, q.text]));

/** A quote from the memo. `marked` draws the highlighter over it once. */
function Quote({ evidence, marked = false }: { evidence: Evidence; marked?: boolean }) {
  return (
    <p className="text-sm text-muted">
      메모 ·{" "}
      <span data-active={marked ? "" : undefined} className="marker-draw font-serif">
        “{evidence.quote}”
      </span>
    </p>
  );
}

/** Quotes that show the problem: evidence attached to "no" answers. */
function problemEvidence(item: ItemResult) {
  return item.answers.filter((a) => a.answer === "no").flatMap((a) => a.evidence);
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Direction({ text }: { text: string }) {
  return (
    <span className="block font-serif text-sm">
      <span className="font-sans font-semibold">방향 </span>
      {text}
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
    <article className={`flex flex-col gap-12 sm:gap-14 ${enter}`}>
      <p className="font-serif text-xl">{report.summary}</p>

      {report.strengths.length > 0 && (
        <Section title="이런 점이 좋아요">
          <ul className="flex flex-col gap-5">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex flex-col gap-1">
                <p className="font-serif">{s.text}</p>
                {s.evidence.slice(0, 1).map((e, j) => (
                  <Quote key={j} evidence={e} />
                ))}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title={report.topFixes.length ? `가장 먼저 고칠 ${report.topFixes.length}가지` : "가장 먼저 고칠 점"}
      >
        {report.topFixes.length === 0 ? (
          <p className="font-serif">지금 판정한 항목 중에는 먼저 고칠 곳이 없어요.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {report.topFixes.map((item, i) => {
              const quote = problemEvidence(item)[0];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(item)}
                    className="press flex w-full gap-3 rounded-md bg-surface p-4 text-left sm:gap-4"
                  >
                    <span className="text-lg font-semibold text-muted tabular-nums">{i + 1}</span>
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold">{item.label}</span>
                        <Signal mark={item.signal} />
                      </span>
                      <span className="font-serif">{item.comment}</span>
                      {quote && (
                        <span className="text-sm text-muted">
                          메모 · <span className="font-serif">“{quote.quote}”</span>
                        </span>
                      )}
                      {item.direction && <Direction text={item.direction} />}
                      <span className="text-sm text-muted underline underline-offset-4">근거 모두 보기</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <SettingSection setting={report.setting} />

      <Section title="항목별 신호등">
        <div className="flex flex-col">
          {(Object.keys(AXIS_LABELS) as Axis[]).map((axis) => {
            const items = report.items.filter((i) => i.axis === axis);
            const isOpen = open.has(axis);
            return (
              <div key={axis} className="border-b border-border">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`axis-${axis}`}
                  onClick={() => toggle(axis)}
                  className="group flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="font-semibold">{AXIS_LABELS[axis]}</span>
                  <span className="flex items-center gap-4">
                    <ShapeRow marks={items.map((i) => i.signal)} />
                    <span
                      aria-hidden
                      className="text-sm text-muted transition-colors duration-(--duration-fast) group-hover:text-foreground"
                    >
                      {isOpen ? "접기" : "펼치기"}
                    </span>
                  </span>
                </button>
                {isOpen && (
                  <ul id={`axis-${axis}`} className={`flex flex-col gap-8 pb-8 ${enter}`}>
                    {items.map((item) => (
                      <ItemDetail key={item.id} item={item} marked={focus?.id === item.id} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {report.unavailable.length > 0 && (
            <div className="flex flex-col gap-3 pt-8">
              <p className="text-sm font-semibold text-muted">아직 판정하지 않는 항목</p>
              <ul className="flex flex-col gap-3">
                {report.unavailable.map((u) => (
                  <li key={u.id} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-3">
                    <span>{u.label}</span>
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
          <p className="text-sm text-muted">메모에 적힌 참고작이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {report.references.map((r, i) => (
              <li key={i} className="flex flex-col gap-2">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{r.work}</span>
                  <Signal mark="note" />
                </p>
                {r.overlaps.length === 0 ? (
                  <p className="text-sm text-muted">겹쳐 보이는 부분을 찾지 못했어요.</p>
                ) : (
                  <ul className="flex flex-col gap-3 border-l border-border pl-4">
                    {r.overlaps.map((o, j) => (
                      <li key={j} className="flex flex-col gap-1">
                        <p className="font-serif text-sm">{o.text}</p>
                        {o.evidence.slice(0, 1).map((e, k) => (
                          <Quote key={k} evidence={e} />
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
        <p className="text-sm text-muted">
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
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-muted">{g.title}</h3>
            <ol className={`flex flex-col gap-3 ${g.title === "사건 순서" ? "list-decimal pl-5" : ""}`}>
              {g.entries.map((e, i) => (
                <li key={i} className="flex flex-col gap-1">
                  <p>
                    {e.head && <span className="font-semibold">{e.head} </span>}
                    <span className={e.head ? "text-muted" : ""}>{e.text}</span>
                  </p>
                  {g.title === "어긋나는 설정"
                    ? e.evidence.map((ev, j) => <Quote key={j} evidence={ev} />)
                    : e.evidence.slice(0, 1).map((ev, j) => <Quote key={j} evidence={ev} />)}
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
    <li id={`item-${item.id}`} className="flex scroll-mt-6 flex-col gap-2">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{item.label}</span>
        <Signal mark={item.signal} />
      </p>
      <p className="font-serif">{item.comment}</p>
      {item.direction && <Direction text={item.direction} />}
      <ul className="mt-1 flex flex-col gap-4 border-l border-border pl-4">
        {item.answers.map((a) => (
          <li key={a.question_id} className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-semibold">{a.answer === "yes" ? "예" : "아니오"}</span>
              <span className="text-muted"> · {QUESTION_TEXT.get(a.question_id)}</span>
            </p>
            <p className="font-serif">{a.reason}</p>
            {a.evidence.map((e, j) => (
              <Quote key={j} evidence={e} marked={marked && a.answer === "no"} />
            ))}
          </li>
        ))}
      </ul>
    </li>
  );
}
