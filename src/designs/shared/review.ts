// Links the report's opinions to the places in the memo they quote. Design-agnostic: both
// design variants render from this model, so they show the same data.

import { ALL_QUESTIONS, AXIS_LABELS, type Axis } from "../../lib/diagnosis/items.ts";
import type { Evidence, ItemResult, Memo, Report } from "../../lib/diagnosis/types.ts";

export type Tone = "fix" | "improve" | "good" | "neutral";
export type Range = { start: number; end: number };

export type Quote = {
  id: string;
  noteId: string;
  text: string;
  /** Where the quote sits in the memo. Null when it comes from the references field or can't be found. */
  range: Range | null;
  where: "memo" | "references" | "unlocated";
  /** A quote under a "no" answer shows the problem; under a "yes" answer it backs the pass. */
  polarity: "problem" | "support" | "neutral";
};

export type Answer = { id: string; question: string; answer: "yes" | "no"; reason: string; quotes: Quote[] };

export type NoteKind = "item" | "strength" | "character" | "rule" | "event" | "conflict" | "dropped" | "reference" | "overlap";

export type Note = {
  id: string;
  kind: NoteKind;
  /** Item label, character name, or the referenced work. Empty for notes that are only a sentence. */
  label: string;
  tone: Tone;
  /** 1-based rank among "가장 먼저 고칠" items, or null. */
  priority: number | null;
  axis: Axis | null;
  body: string;
  direction: string;
  /** Characters only: what the character wants. */
  want: string;
  answers: Answer[];
  quotes: Quote[];
};

export type Review = {
  memo: Memo;
  report: Report;
  notes: Note[];
  note: (id: string) => Note | undefined;
  /** Top fixes in priority order. */
  top: Note[];
  items: Note[];
  strengths: Note[];
  setting: { characters: Note[]; rules: Note[]; events: Note[]; conflicts: Note[]; dropped: Note[] };
  references: { work: Note; overlaps: Note[] }[];
  axes: { axis: Axis; label: string; items: Note[] }[];
  /** Every quote that was found in the memo, in memo order. */
  located: Quote[];
};

const QUESTION_TEXT = new Map(ALL_QUESTIONS.map((q) => [q.id, q.text]));

/**
 * The folding the server uses to verify quotes (QuoteChecker in lib/diagnosis/rules.ts), kept
 * position-aware: `map[i]` is the index in the original text of folded character `i`.
 */
export function fold(text: string): { text: string; map: number[] } {
  let out = "";
  const map: number[] = [];
  let space = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (space < 0) space = i;
      continue;
    }
    if (space >= 0) {
      // Leading whitespace is dropped, like trim(); a run inside the text becomes one space.
      if (out.length > 0) {
        out += " ";
        map.push(space);
      }
      space = -1;
    }
    if (ch === "“" || ch === "”" || ch === "„") {
      out += '"';
      map.push(i);
    } else if (ch === "‘" || ch === "’") {
      out += "'";
      map.push(i);
    } else if (ch === "…") {
      out += "...";
      map.push(i, i, i);
    } else {
      out += ch;
      map.push(i);
    }
  }
  return { text: out, map };
}

/** Finds a quote in already folded text. The first occurrence wins: the report doesn't say which one was meant. */
export function locate(folded: { text: string; map: number[] }, quote: string): Range | null {
  const needle = fold(quote).text;
  if (!needle) return null;
  const at = folded.text.indexOf(needle);
  if (at < 0) return null;
  return { start: folded.map[at], end: folded.map[at + needle.length - 1] + 1 };
}

export function buildReview(memo: Memo, report: Report): Review {
  const memoFolded = fold(memo.memo);
  const refsFolded = fold(memo.references);

  function quotesOf(noteId: string, evidence: Evidence[], polarity: Quote["polarity"], offset = 0): Quote[] {
    return evidence.map((e, i) => {
      const range = locate(memoFolded, e.quote);
      const where = range ? "memo" : locate(refsFolded, e.quote) ? "references" : "unlocated";
      return { id: `${noteId}#${offset + i}`, noteId, text: e.quote, range, where, polarity };
    });
  }

  const base = { priority: null, axis: null, direction: "", want: "", answers: [] as Answer[] };

  function itemNote(item: ItemResult): Note {
    const id = `item:${item.id}`;
    let n = 0;
    const answers = item.answers.map((a) => {
      const quotes = quotesOf(id, a.evidence, a.answer === "no" ? "problem" : "support", n);
      n += quotes.length;
      return {
        id: a.question_id,
        question: QUESTION_TEXT.get(a.question_id) ?? a.question_id,
        answer: a.answer,
        reason: a.reason,
        quotes,
      };
    });
    const rank = report.topFixes.findIndex((t) => t.id === item.id);
    return {
      id,
      kind: "item",
      label: item.label,
      tone: item.signal,
      priority: rank < 0 ? null : rank + 1,
      axis: item.axis,
      body: item.comment,
      direction: item.direction,
      want: "",
      answers,
      quotes: answers.flatMap((a) => a.quotes),
    };
  }

  function plain(kind: NoteKind, id: string, entry: { text: string; evidence: Evidence[] }, tone: Tone = "neutral"): Note {
    const polarity = tone === "fix" ? "problem" : tone === "good" ? "support" : "neutral";
    return { ...base, id, kind, label: "", tone, body: entry.text, quotes: quotesOf(id, entry.evidence, polarity) };
  }

  const items = report.items.map(itemNote);
  const strengths = report.strengths.map((s, i) => plain("strength", `strength:${i}`, s, "good"));
  const s = report.setting;
  const setting = {
    characters: s.characters.map((c, i): Note => {
      const id = `character:${i}`;
      return { ...base, id, kind: "character", label: c.name, tone: "neutral", body: c.role, want: c.want, quotes: quotesOf(id, c.evidence, "neutral") };
    }),
    rules: s.rules.map((e, i) => plain("rule", `rule:${i}`, e)),
    events: s.events.map((e, i) => plain("event", `event:${i}`, e)),
    conflicts: s.conflicts.map((e, i) => plain("conflict", `conflict:${i}`, e, "fix")),
    dropped: s.dropped.map((e, i) => plain("dropped", `dropped:${i}`, e)),
  };
  const references = report.references.map((r, i) => {
    const id = `reference:${i}`;
    const work: Note = { ...base, id, kind: "reference", label: r.work, tone: "neutral", body: "", quotes: quotesOf(id, r.evidence, "neutral") };
    return { work, overlaps: r.overlaps.map((o, j) => plain("overlap", `${id}:overlap:${j}`, o)) };
  });

  const notes = [
    ...items,
    ...strengths,
    ...setting.characters,
    ...setting.rules,
    ...setting.events,
    ...setting.conflicts,
    ...setting.dropped,
    ...references.flatMap((r) => [r.work, ...r.overlaps]),
  ];
  const byId = new Map(notes.map((n) => [n.id, n]));
  const axes = (Object.keys(AXIS_LABELS) as Axis[])
    .map((axis) => ({ axis, label: AXIS_LABELS[axis], items: items.filter((n) => n.axis === axis) }))
    // Reports saved before an axis existed have no items for it.
    .filter((a) => a.items.length > 0);

  return {
    memo,
    report,
    notes,
    note: (id) => byId.get(id),
    top: items.filter((n) => n.priority !== null).sort((a, b) => a.priority! - b.priority!),
    items,
    strengths,
    setting,
    references,
    axes,
    located: notes
      .flatMap((n) => n.quotes)
      .filter((q) => q.range)
      .sort((a, b) => a.range!.start - b.range!.start || a.range!.end - b.range!.end),
  };
}

export type Span = { start: number; end: number; text: string; quotes: Quote[] };
export type Line = { index: number; start: number; end: number; blank: boolean; spans: Span[] };

/**
 * Cuts the memo into lines, and each line into spans of plain text and quoted text. Overlapping
 * quotes split at every boundary, so a span lists all the quotes that cover it.
 */
export function layoutManuscript(memo: string, quotes: Quote[]): Line[] {
  const marked = quotes.filter((q) => q.range);
  const cuts = new Set<number>();
  for (const q of marked) {
    cuts.add(q.range!.start);
    cuts.add(q.range!.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const lines: Line[] = [];
  let lineStart = 0;
  let p = 0;
  memo.split("\n").forEach((text, index) => {
    const lineEnd = lineStart + text.length;
    const spans: Span[] = [];
    let at = lineStart;
    while (p < points.length && points[p] <= lineStart) p++;
    let k = p;
    while (at < lineEnd) {
      while (k < points.length && points[k] <= at) k++;
      const next = k < points.length && points[k] < lineEnd ? points[k] : lineEnd;
      const covering = marked.filter((q) => q.range!.start <= at && q.range!.end >= next);
      spans.push({ start: at, end: next, text: memo.slice(at, next), quotes: covering });
      at = next;
    }
    lines.push({ index, start: lineStart, end: lineEnd, blank: text.trim() === "", spans });
    lineStart = lineEnd + 1;
  });
  return lines;
}

/** Groups lines into paragraphs: runs of non-blank lines, separated by blank ones. */
export function toParagraphs(lines: Line[]): Line[][] {
  const out: Line[][] = [];
  let current: Line[] = [];
  for (const line of lines) {
    if (line.blank) {
      if (current.length) out.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) out.push(current);
  return out;
}

/** The strongest tone among quotes: a problem outranks a pass, a pass outranks a plain citation. */
export function toneOf(quotes: Quote[], note: (id: string) => Note | undefined): Tone {
  let best: Tone = "neutral";
  const rank: Record<Tone, number> = { neutral: 0, good: 1, improve: 2, fix: 3 };
  for (const q of quotes) {
    const n = note(q.noteId);
    const tone: Tone = q.polarity === "problem" ? (n?.tone === "improve" ? "improve" : "fix") : q.polarity === "support" ? "good" : "neutral";
    if (rank[tone] > rank[best]) best = tone;
  }
  return best;
}
