import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { Memo, Report } from "../../lib/diagnosis/types.ts";
import { buildReview, layoutManuscript } from "../shared/review.ts";
import { firstLocated, flagsFor, visibleQuotes } from "./model.ts";

test("each opinion gets one flag, on the line its panel entry jumps to", () => {
  const sample = JSON.parse(readFileSync(new URL("../shared/fixtures/play-assignment.json", import.meta.url), "utf8")) as Memo & {
    report: Report;
  };
  const review = buildReview({ genre: sample.genre, memo: sample.memo, references: sample.references }, sample.report);
  const quotes = visibleQuotes(review, "all", null);
  const lines = layoutManuscript(sample.memo, quotes);
  const flags = flagsFor(quotes, lines, review);

  assert.equal(flags.length, review.notes.filter(firstLocated).length);
  assert.equal(new Set(flags.map((f) => f.noteId)).size, flags.length);
  for (const f of flags) {
    const quote = firstLocated(review.note(f.noteId)!)!;
    assert.equal(f.quoteId, quote.id);
    assert.ok(lines[f.line].start <= quote.range!.start && quote.range!.start <= lines[f.line].end);
  }
  const order = flags.map((f) => f.line);
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "the margin stacks flags downwards, so they must come in line order");

  const top = visibleQuotes(review, "top", null);
  assert.equal(flagsFor(top, layoutManuscript(sample.memo, top), review).length, review.top.length);
});
