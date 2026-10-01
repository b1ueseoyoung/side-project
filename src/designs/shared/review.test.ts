import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { Memo, Report } from "../../lib/diagnosis/types.ts";
import { buildReview, fold, layoutManuscript, locate } from "./review.ts";

test("a quote is found across collapsed whitespace, curly quotes and an ellipsis", () => {
  const memo = "  첫 줄\n\n리엔: “한 번만…  더”\n끝";
  const folded = fold(memo);
  assert.equal(folded.text, '첫 줄 리엔: "한 번만... 더" 끝');

  const range = locate(folded, '리엔: "한 번만... 더"');
  assert.ok(range);
  assert.equal(memo.slice(range.start, range.end), "리엔: “한 번만…  더”");

  const acrossLines = locate(folded, "첫 줄 리엔");
  assert.ok(acrossLines);
  assert.equal(memo.slice(acrossLines.start, acrossLines.end), "첫 줄\n\n리엔");

  assert.equal(locate(folded, "메모에 없는 문장"), null);
  assert.equal(locate(folded, "   "), null);
});

test("lines split at quote boundaries and overlapping quotes share a span", () => {
  const memo = "가나다라마\n바사";
  const q = (id: string, start: number, end: number) =>
    ({ id, noteId: id, text: "", range: { start, end }, where: "memo", polarity: "neutral" }) as const;
  const lines = layoutManuscript(memo, [q("a", 1, 4), q("b", 3, 7)]);

  assert.deepEqual(
    lines[0].spans.map((s) => [s.text, s.quotes.map((x) => x.id)]),
    [["가", []], ["나다", ["a"]], ["라", ["a", "b"]], ["마", ["b"]]],
  );
  // The quote "b" runs over the line break into the second line.
  assert.deepEqual(
    lines[1].spans.map((s) => [s.text, s.quotes.map((x) => x.id)]),
    [["바", ["b"]], ["사", []]],
  );
  assert.equal(lines.map((l) => l.spans.map((s) => s.text).join("")).join("\n"), memo);
});

test("every quote of a saved report is placed in its memo", () => {
  const sample = JSON.parse(readFileSync(new URL("./fixtures/play-assignment.json", import.meta.url), "utf8")) as Memo & {
    report: Report;
  };
  const review = buildReview({ genre: sample.genre, memo: sample.memo, references: sample.references }, sample.report);
  const quotes = review.notes.flatMap((n) => n.quotes);

  assert.ok(quotes.length > 50);
  assert.deepEqual(quotes.filter((q) => q.where === "unlocated"), []);
  for (const q of quotes.filter((x) => x.range)) {
    assert.equal(fold(sample.memo.slice(q.range!.start, q.range!.end)).text, fold(q.text).text);
  }
  assert.deepEqual(review.top.map((n) => n.priority), [1, 2, 3]);
  const lines = layoutManuscript(sample.memo, review.located);
  assert.equal(lines.map((l) => l.spans.map((s) => s.text).join("")).join("\n"), sample.memo);
});
