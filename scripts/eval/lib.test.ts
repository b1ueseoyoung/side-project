import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { buildReport } from "../../src/lib/diagnosis/rules.ts";
import type { Memo } from "../../src/lib/diagnosis/types.ts";
import {
  checkMustFind,
  checkMustNotFlag,
  diffPostprocess,
  fakeModelOutput,
  judgeTarget,
  pairDiff,
  repeatConsistency,
  safeError,
  validateLabel,
} from "./lib.ts";
import type { Label } from "./lib.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const read = <T>(file: string) => JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
const ids = readdirSync(path.join(ROOT, "eval/samples")).map((f) => f.replace(/\.json$/, "")).sort();

describe("labels", () => {
  test("every sample has a separate provisional label whose quotes are in its memo", () => {
    assert.deepEqual(ids, ["p1a", "p1b", "p2a", "p2b", "p3a", "p3b", "p4a", "p4b"]);
    for (const id of ids) {
      const memo = read<Memo>(`eval/samples/${id}.json`);
      assert.deepEqual(Object.keys(memo).sort(), ["genre", "memo", "references"]);
      assert.deepEqual(validateLabel(read<Label>(`eval/labels/${id}.json`), memo), [], id);
    }
  });

  test("a label quote that is not in the memo is reported", () => {
    const problems = validateLabel(read<Label>("eval/labels/p1b.json"), read<Memo>("eval/samples/p1a.json"));
    assert.ok(problems.some((p) => p.includes("마차 사고")));
  });
});

describe("post-processing diff", () => {
  const memo = read<Memo>("eval/samples/p1b.json");
  const output = fakeModelOutput(memo, "p1b", 1);
  const diff = diffPostprocess(output, buildReport(output, memo), memo);

  test("counts quotes missing from the memo and the yes the app turned into no", () => {
    assert.deepEqual(diff.rawQuotes.notInMemo.map((q) => q.where).sort(), ["answers", "setting.characters"]);
    assert.equal(diff.appDroppedQuotes, 2);
    assert.deepEqual(
      diff.changedAnswers.map((c) => [c.questionId, c.raw, c.final]),
      [["core_rules.stated", "yes", "no"]],
    );
    assert.deepEqual(diff.missingQuestionIds, []);
  });

  test("top fixes are the first red items in table order", () => {
    assert.deepEqual(diff.priority?.red, ["consistency", "core_rules", "ending"]);
    assert.equal(diff.priority?.followsTableOrder, true);
    assert.deepEqual(diff.priority?.redLeftOut, []);
  });

  test("a missing answer is listed and buildReport refuses the output", () => {
    const partial = fakeModelOutput(memo, "p4b", 3);
    assert.throws(() => buildReport(partial, memo), /Missing answers/);
    assert.deepEqual(diffPostprocess(partial, null, memo).missingQuestionIds, ["arc.change"]);
  });
});

describe("label checks", () => {
  const memo = read<Memo>("eval/samples/p1b.json");
  const label = read<Label>("eval/labels/p1b.json");
  const output = fakeModelOutput(memo, "p1b", 1);
  const conflict = output.answers.find((a) => a.question_id === "consistency.no_conflict");
  assert.ok(conflict);
  conflict.evidence = [{ quote: "3년 전 영지를 잃던 날 마차 사고로 죽었다" }, { quote: "아델은 사교계에서 '엘라'라는 가명을 쓴다." }];
  const report = buildReport(output, memo);

  test("target, must-find and must-not-flag checks read the final answer and its quotes", () => {
    const target = judgeTarget(label.targets[0], output, report);
    assert.equal(target.expected, "문제 있음");
    assert.equal(target.finalAnswer, "no");
    assert.equal(target.outcome, "일치");
    assert.deepEqual(target.expectedCited.map((c) => c.cited), [true, false]);
    assert.deepEqual(target.unexpectedEvidence, ["아델은 사교계에서 '엘라'라는 가명을 쓴다."]);
    const must = checkMustFind(label.mustFind[0], report);
    assert.deepEqual([must.cited, must.of, must.found], [1, 2, false]);
    assert.equal(checkMustNotFlag(label.mustNotFlag[0], report).hits.length, 1);
  });
});

describe("pair and repeat comparison", () => {
  const a = read<Memo>("eval/samples/p1a.json");
  const b = read<Memo>("eval/samples/p1b.json");
  const ra = buildReport(fakeModelOutput(a, "p1a", 1), a);
  const rb = buildReport(fakeModelOutput(b, "p1b", 1), b);

  test("pair diff ignores excluded questions", () => {
    assert.deepEqual(pairDiff(ra, rb, new Set())?.differences.map((d) => d.questionId), ["consistency.no_conflict"]);
    assert.deepEqual(pairDiff(ra, rb, new Set(["consistency.no_conflict"]))?.differences, []);
  });

  test("repeat consistency lists questions whose answer changed across runs", () => {
    const result = repeatConsistency([ra, buildReport(fakeModelOutput(a, "p1a", 2), a), null]);
    assert.deepEqual([result.runs, result.succeeded], [3, 2]);
    assert.deepEqual(result.changed.map((c) => c.questionId), ["theme.coherent"]);
  });
});

test("safeError masks secret-looking environment values", () => {
  process.env.EVAL_TEST_TOKEN = "super-secret-value";
  assert.equal(
    safeError(new Error("failed with super-secret-value and sk-ant-abc123")),
    "failed with <EVAL_TEST_TOKEN> and <masked>",
  );
  delete process.env.EVAL_TEST_TOKEN;
});
