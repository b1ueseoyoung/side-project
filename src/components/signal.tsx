export type Mark = "good" | "improve" | "fix" | "na" | "note";

export const MARK_LABELS: Record<Mark, string> = {
  good: "좋아요",
  improve: "조금 더",
  fix: "고쳐보세요",
  na: "원고 필요",
  note: "참고",
};

export const MARK_COLORS: Record<Mark, string> = {
  good: "text-signal-good",
  improve: "text-signal-improve",
  fix: "text-signal-fix",
  na: "text-signal-na",
  note: "text-muted",
};

const BADGE_COLORS: Record<Mark, string> = {
  good: "bg-signal-good-soft text-signal-good",
  improve: "bg-signal-improve-soft text-signal-improve",
  fix: "bg-signal-fix-soft text-signal-fix",
  na: "bg-signal-na-soft text-signal-na",
  note: "bg-fill text-muted",
};

export function Shape({ mark, size = 14 }: { mark: Mark; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 14 14", "aria-hidden": true };
  switch (mark) {
    case "good":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
        </svg>
      );
    case "improve":
      return (
        <svg {...common}>
          <path d="M7 1.5 13 12.5H1Z" fill="currentColor" />
        </svg>
      );
    case "fix":
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="11" height="11" fill="currentColor" />
        </svg>
      );
    case "na":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2" />
        </svg>
      );
    case "note":
      return null;
  }
}

// Shape and label share the ink color on its soft badge; each pair is >= 4.5:1.
export function Signal({ mark }: { mark: Mark }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_COLORS[mark]}`}
    >
      <Shape mark={mark} size={10} />
      {MARK_LABELS[mark]}
    </span>
  );
}

/** Screen reader text for a row of bare shapes, e.g. "좋아요 2개, 조금 더 1개". */
export function countSummary(marks: Mark[]) {
  return (Object.keys(MARK_LABELS) as Mark[])
    .map((m) => [m, marks.filter((x) => x === m).length] as const)
    .filter(([, n]) => n > 0)
    .map(([m, n]) => `${MARK_LABELS[m]} ${n}개`)
    .join(", ");
}

/** A row of shapes with a screen reader summary, for collapsed headers. */
export function ShapeRow({ marks }: { marks: Mark[] }) {
  return (
    <span className="flex gap-2">
      {marks.map((m, i) => (
        <span key={i} className={MARK_COLORS[m]}>
          <Shape mark={m} />
        </span>
      ))}
      <span className="sr-only">{countSummary(marks)}</span>
    </span>
  );
}
