import type { Axis } from "@/lib/diagnosis/items";
import type { Line, Note, Quote, Review } from "../shared/review";

export type Family = "fix" | "improve" | "good" | "setting" | "reference";
export type SectionId = "top" | "strengths" | "setting" | "items" | "references";
export type Mode = "top" | "all";
export type Origin = "panel" | "page" | "quote";

export type Selection = { noteId: string; quoteId: string | null; origin: Origin; n: number };

export type Flag = {
  key: string;
  noteId: string;
  quoteId: string;
  line: number;
  family: Family;
  label: string;
  short: string;
  priority: number | null;
};

const FAMILY_RANK: Record<Family, number> = { reference: 1, setting: 2, good: 3, improve: 4, fix: 5 };

export function familyOf(note: Note): Family {
  switch (note.kind) {
    case "item":
      return note.tone === "neutral" ? "setting" : note.tone;
    case "strength":
      return "good";
    case "conflict":
      return "fix";
    case "character":
    case "rule":
    case "event":
    case "dropped":
      return "setting";
    default:
      return "reference";
  }
}

export function strongestFamily(families: Family[]): Family {
  return families.reduce((best, f) => (FAMILY_RANK[f] > FAMILY_RANK[best] ? f : best), "reference");
}

export function flagLabel(note: Note, review: Review): string {
  switch (note.kind) {
    case "item":
      return note.priority ? `${note.priority} ${note.label}` : note.label;
    case "strength":
      return "좋아요";
    case "character":
      return `인물 · ${note.label}`;
    case "rule":
      return "세계 규칙";
    case "event":
      return "사건";
    case "conflict":
      return "어긋나는 설정";
    case "dropped":
      return "버린 설정";
    case "reference":
      return `참고작 · ${note.label}`;
    case "overlap": {
      const parent = review.references.find((r) => r.overlaps.some((o) => o.id === note.id));
      return parent ? `겹침 · ${parent.work.label}` : "참고작과 겹침";
    }
  }
}

export function sectionOf(note: Note): SectionId {
  if (note.kind === "item") return note.priority ? "top" : "items";
  if (note.kind === "strength") return "strengths";
  if (note.kind === "reference" || note.kind === "overlap") return "references";
  return "setting";
}

export function axisKey(axis: Axis) {
  return `axis:${axis}`;
}

export function noteKey(noteId: string) {
  return `note:${noteId}`;
}

export function noteDomId(noteId: string) {
  return `op-${noteId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/** Quotes drawn on the page: the top fixes in "top" mode, everything located in "all" mode, plus the selected opinion. */
export function visibleQuotes(review: Review, mode: Mode, selectedNoteId: string | null): Quote[] {
  if (mode === "all") return review.located;
  const keep = new Set(review.top.map((n) => n.id));
  if (selectedNoteId) keep.add(selectedNoteId);
  return review.located.filter((q) => keep.has(q.noteId));
}

function lineIndexOf(lines: Line[], offset: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].end < offset) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** One flag per opinion per stored line, in memo order. */
export function flagsFor(quotes: Quote[], lines: Line[], review: Review): Flag[] {
  const seen = new Set<string>();
  const out: Flag[] = [];
  for (const q of quotes) {
    if (!q.range) continue;
    const line = lineIndexOf(lines, q.range.start);
    const key = `${line}:${q.noteId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const note = review.note(q.noteId);
    if (!note) continue;
    const label = flagLabel(note, review);
    const short = note.priority !== null ? String(note.priority) : label.slice(0, 1);
    out.push({ key, noteId: q.noteId, quoteId: q.id, line, family: familyOf(note), label, short, priority: note.priority });
  }
  return out;
}

export function problemQuotes(note: Note): Quote[] {
  const problems = note.quotes.filter((q) => q.polarity === "problem");
  return problems.length ? problems : note.quotes;
}

export function firstLocated(note: Note): Quote | undefined {
  return problemQuotes(note).find((q) => q.range) ?? note.quotes.find((q) => q.range);
}

const QUOTED = /^["“'‘][\s\S]*["”'’]$/;

export function quoteText(text: string) {
  return QUOTED.test(text) ? text : `“${text}”`;
}
