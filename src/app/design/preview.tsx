"use client";

import { useEffect, useState, type ReactNode } from "react";

import { MARK_LABELS, ShapeRow, Signal, type Mark } from "@/components/signal";
import { ElapsedTime } from "@/components/elapsed-time";
import { card, enter, primaryButton, secondaryButton } from "@/components/styles";

// Sample content is taken from samples/01-memory-empress.json.

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Typography() {
  return (
    <Section title="글꼴" note="모든 글자는 Pretendard. 위계는 크기와 굵기로 만들어요.">
      <p className="text-xl leading-snug font-bold tracking-tight">
        세계관은 매력적인데, 1화 첫 장면이 설정 설명으로 시작해서 리엔의 목소리가 늦게 나와요.
      </p>
      <p className="max-w-[34em] leading-relaxed">
        리포트 본문은 16px, 줄간격 1.7로 둡니다. 한 줄은 한글 35~40자 안쪽이라 눈이 다음 줄을 쉽게
        찾아요. 단어가 줄 끝에서 잘리지 않도록 keep-all을 씁니다.
      </p>
      <p className="text-sm text-muted">보조 설명은 15px, 흐린 글자색.</p>
    </Section>
  );
}

function Buttons() {
  return (
    <Section title="버튼" note="누르면 97%로 줄어들어요(120ms). 호버는 색만 바뀌고 크기는 그대로예요.">
      <div className="flex flex-wrap gap-3">
        <button type="button" className={primaryButton}>
          진단 받기
        </button>
        <button type="button" className={secondaryButton}>
          대본 다시 붙여넣기
        </button>
      </div>
    </Section>
  );
}

function Signals() {
  return (
    <Section title="신호등" note="색, 모양, 글자를 항상 함께 보여줘요. 참고 항목은 모양 없이 글자만.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MARK_LABELS) as Mark[]).map((m) => (
          <Signal key={m} mark={m} />
        ))}
      </div>
    </Section>
  );
}

const TOP_FIXES = [
  {
    label: "1화 도입",
    comment: "1화가 처형장이 아니라 제국 설정 설명으로 시작해요.",
    quote: "에델 제국은 천 년 동안 거울 신의 가호를 받아왔다.",
    scene: "1화 #1",
  },
  {
    label: "정보량",
    comment: "#1 내레이션에 이어 #5에서도 가문 설정을 한꺼번에 설명해요.",
    quote: "아가씨가 태어나신 로웰 공작가는 제국에서 가장 오래된 가문이고",
    scene: "1화 #5",
  },
  {
    label: "대사량",
    comment: "이델이 리엔도 아는 사실을 독자에게 알려주려고 말해요.",
    quote: "아가씨도 아시다시피 오늘은 황태자 전하의 성년식이잖아요.",
    scene: "1화 #5",
  },
];

function TopFixes() {
  return (
    <Section title="가장 먼저 고칠 3가지" note="카드 격자가 아니라 세로 목록. 번호는 우선순위예요.">
      <ol className="flex flex-col gap-3">
        {TOP_FIXES.map((f, i) => (
          <li key={f.label}>
            <button
              type="button"
              className="press flex w-full gap-4 rounded-lg border border-border bg-surface p-5 text-left hover:bg-surface-hover"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-surface tabular-nums">
                {i + 1}
              </span>
              <span className="flex flex-col gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{f.label}</span>
                  <Signal mark="fix" />
                </span>
                <span className="leading-relaxed">{f.comment}</span>
                <span className="block rounded-md bg-fill px-3.5 py-2.5 text-sm text-secondary">
                  {f.scene} · “{f.quote}”
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const AXES: { axis: string; items: { label: string; mark: Mark; reason: string }[] }[] = [
  {
    axis: "캐릭터",
    items: [
      { label: "욕망과 결핍", mark: "good", reason: "#4 “이번엔 누가 우리를 팔았는지 알아낼 거야”에서 목표가 드러나요." },
      { label: "행동 동기", mark: "good", reason: "시놉시스의 선택마다 앞선 사건이 이유가 돼요." },
      { label: "조연 구분", mark: "improve", reason: "카엘과 이델의 역할은 다르지만 말투가 비슷해요." },
    ],
  },
  {
    axis: "작법·연출",
    items: [
      { label: "1화 도입", mark: "fix", reason: "첫 장면이 사건이 아닌 내레이션 설명이에요." },
      { label: "정보량", mark: "fix", reason: "#1과 #5에 설정 설명이 몰려 있어요." },
    ],
  },
];

function Accordion() {
  const [open, setOpen] = useState<string | null>("캐릭터");
  return (
    <Section title="항목별 신호등" note="기본은 접혀 있어요. 펼친 내용만 살짝 떠오르고, 높이는 움직이지 않아요.">
      <div className="flex flex-col">
        {AXES.map(({ axis, items }) => {
          const isOpen = open === axis;
          return (
            <div key={axis} className="border-b border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : axis)}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <span className="font-semibold">{axis}</span>
                <ShapeRow marks={items.map((it) => it.mark)} />
              </button>
              {isOpen && (
                <ul className={`flex flex-col gap-3 pb-4 ${enter}`}>
                  {items.map((it) => (
                    <li key={it.label} className="flex flex-col gap-1">
                      <span className="flex items-center gap-3">
                        <span>{it.label}</span>
                        <Signal mark={it.mark} />
                      </span>
                      <span className="text-sm text-secondary">{it.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

type Scene = {
  heading: string;
  lines: { text: string; mark?: { id: string; kind: "good" | "fix" } }[];
  comment?: { id: string; kind: "good" | "fix"; text: string };
};

const SCENES: Scene[] = [
  {
    heading: "#1 제국 전경 (내레이션)",
    lines: [
      {
        text: "내레이션: 에델 제국은 천 년 동안 거울 신의 가호를 받아왔다. 황실의 피를 이은 자만이 신전의 거울에 닿을 수 있다.",
        mark: { id: "c1", kind: "fix" },
      },
    ],
    comment: {
      id: "c1",
      kind: "fix",
      text: "첫 장면이 설정 설명이에요. #2 처형장에서 시작하고 설정은 사건 속에 나눠 보여주면 어떨까요.",
    },
  },
  {
    heading: "#4 신전, 회상",
    lines: [
      { text: "리엔이 피 묻은 손으로 거울에 손을 댄다." },
      {
        text: "리엔: 한 번만. 한 번만 더 기회를 줘. 이번엔 누가 우리를 팔았는지 알아낼 거야.",
        mark: { id: "c2", kind: "good" },
      },
    ],
    comment: {
      id: "c2",
      kind: "good",
      text: "리엔이 원하는 것이 한 줄에 분명히 나와요. 이 대사가 작품의 엔진이에요.",
    },
  },
  {
    heading: "#5 리엔의 침실, 3년 전",
    lines: [
      { text: "이델: 아가씨! 악몽을 꾸셨어요?" },
      {
        text: "이델: 아가씨도 아시다시피 오늘은 황태자 전하의 성년식이잖아요.",
        mark: { id: "c3", kind: "fix" },
      },
    ],
    comment: {
      id: "c3",
      kind: "fix",
      text: "리엔도 아는 사실을 독자에게 알려주려는 대사예요. 성년식 준비 장면으로 보여주면 어떨까요.",
    },
  },
];

function ScriptView() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <Section
      title="원고 보기"
      note="코멘트를 누르면 대본에 형광펜이 한 번 그려져요. 코멘트는 짚은 장면과 같은 높이에 있어요."
    >
      <div className="flex flex-col gap-6">
        {SCENES.map((scene) => (
          <div key={scene.heading} className="grid gap-3 md:grid-cols-[1fr_16rem] md:gap-8">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-muted tabular-nums">{scene.heading}</p>
              {scene.lines.map((line) =>
                line.mark ? (
                  <p key={line.text}>
                    <span
                      data-active={active === line.mark.id ? "" : undefined}
                      style={{
                        ["--marker-color" as string]:
                          line.mark.kind === "good" ? "var(--marker-good)" : "var(--marker-fix)",
                      }}
                      className={`marker-draw underline underline-offset-4 ${
                        line.mark.kind === "good" ? "decoration-signal-good" : "decoration-signal-improve"
                      } ${line.mark.kind === "good" ? "decoration-solid" : "decoration-dotted"}`}
                    >
                      {line.text}
                    </span>
                  </p>
                ) : (
                  <p key={line.text}>{line.text}</p>
                ),
              )}
            </div>
            {scene.comment && (
              <button
                type="button"
                aria-pressed={active === scene.comment.id}
                onClick={() => setActive(active === scene.comment!.id ? null : scene.comment!.id)}
                className={`press flex flex-col gap-2 self-start rounded-md border p-3 text-left transition-colors duration-(--duration-fast) ${
                  active === scene.comment.id ? "border-transparent bg-accent-soft" : "border-border hover:bg-surface-hover"
                }`}
              >
                <Signal mark={scene.comment.kind === "good" ? "good" : "fix"} />
                <span className="text-sm leading-relaxed">{scene.comment.text}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Progress() {
  const [startedAt, setStartedAt] = useState<number | null>(null);

  return (
    <Section
      title="진단 중"
      note="한 번의 호출로 진단하므로 가짜 단계 대신 경과 시간과 보통 걸리는 시간을 보여줘요."
    >
      {startedAt === null ? (
        <p className="text-muted">아직 시작하지 않았어요.</p>
      ) : (
        <ElapsedTime startedAt={startedAt} />
      )}
      <div>
        <button
          type="button"
          className={secondaryButton}
          onClick={() => setStartedAt(startedAt === null ? Date.now() : null)}
        >
          {startedAt === null ? "진단 흉내 내기" : "멈추기"}
        </button>
      </div>
    </Section>
  );
}

function Rediagnosis() {
  const [after, setAfter] = useState(false);
  const layer = "col-start-1 row-start-1 transition-opacity duration-(--duration-base) ease-out";
  return (
    <Section title="재진단 변화" note="이전 모양에서 새 모양으로 한 번 크로스페이드해요(220ms).">
      <div className="flex items-center gap-6">
        <span className="w-24">1화 도입</span>
        <span className="grid" aria-live="polite">
          <span className={`${layer} ${after ? "opacity-0" : "opacity-100"}`} aria-hidden={after}>
            <Signal mark="fix" />
          </span>
          <span className={`${layer} ${after ? "opacity-100" : "opacity-0"}`} aria-hidden={!after}>
            <Signal mark="good" />
          </span>
        </span>
      </div>
      <div>
        <button type="button" className={secondaryButton} onClick={() => setAfter((a) => !a)}>
          {after ? "이전으로" : "수정본 결과 보기"}
        </button>
      </div>
    </Section>
  );
}

function Sheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Section
      title="모바일 코멘트 시트"
      note="아래에서 올라와요(400ms, drawer 이징). 드래그로 닫기는 실제 화면을 만들 때 붙여요."
    >
      <div>
        <button type="button" className={secondaryButton} onClick={() => setOpen(true)}>
          코멘트 열기
        </button>
      </div>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-10 bg-foreground/20 transition-opacity duration-(--duration-sheet) ease-drawer ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="코멘트"
        inert={!open}
        className={`fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg flex-col gap-3 rounded-t-md bg-surface p-5 pb-8 shadow-float transition-transform duration-(--duration-sheet) ease-drawer motion-reduce:transition-none ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <span className="mx-auto h-1 w-10 rounded-sm bg-border" />
        <Signal mark="fix" />
        <p className="leading-relaxed">{SCENES[2].comment!.text}</p>
        <p className="text-sm text-muted">1화 #5 · “{SCENES[2].lines[1].text}”</p>
        <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>
          닫기
        </button>
      </div>
    </Section>
  );
}

export function Preview() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
      <div className="mb-4 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">디자인 미리보기</h1>
        <p className="text-secondary">
          DESIGN.md의 결정을 실제 컴포넌트로 확인하는 개발용 화면이에요. 운영체제에서 모션 줄이기를 켜면
          움직임이 사라지는지도 확인할 수 있어요.
        </p>
      </div>
      <Typography />
      <Buttons />
      <Signals />
      <TopFixes />
      <Accordion />
      <ScriptView />
      <Progress />
      <Rediagnosis />
      <Sheet />
    </main>
  );
}
