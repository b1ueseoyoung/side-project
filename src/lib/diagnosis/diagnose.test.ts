import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { fakeModelOutput } from "../../../scripts/eval/lib.ts";
import { ApiError, isResponseId } from "../llm.ts";
import type { ApiResponse } from "../llm.ts";
import { accountHash, buildRun, checkResponse, errorMessage, isTransient, memoHash, reportIdFor, toModelOutput } from "./diagnose.ts";
import type { RawOutput } from "./diagnose.ts";
import { ALL_QUESTIONS, JUDGED_ITEMS } from "./items.ts";
import { OUTPUT_SCHEMA, answerKey } from "./prompt.ts";
import type { Memo, ModelOutput } from "./types.ts";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const memo = JSON.parse(readFileSync(path.join(ROOT, "eval/samples/p1a.json"), "utf8")) as Memo;
const account = "writer@example.com";
const metadata = { memo_sha256: memoHash(memo), account_sha256: accountHash(account) };

const message = (content: { type: string; text?: string; refusal?: string }[]) => [
  { type: "reasoning" },
  { type: "message", content },
];
const response = (fields: Partial<ApiResponse>): ApiResponse => ({ id: "resp_test", status: "completed", metadata, ...fields });

/** The array-form fake output in the keyed shape the API returns. */
function toRaw(output: ModelOutput): RawOutput {
  return {
    ...output,
    answers: Object.fromEntries(output.answers.map(({ question_id, ...rest }) => [answerKey(question_id), rest])),
    items: Object.fromEntries(output.items.map(({ item_id, ...rest }) => [item_id, rest])),
  };
}
const fake = () => fakeModelOutput(memo, "p1a", 1);
const api = response({});

test("OUTPUT_SCHEMA requires one key per question and item", () => {
  const { answers, items } = OUTPUT_SCHEMA.properties;
  assert.equal(answers.required.length, 23);
  assert.deepEqual(Object.keys(answers.properties), answers.required);
  assert.equal(answers.required.includes("consistency__no_conflict"), true);
  assert.equal(answers.properties.consistency__no_conflict.description, ALL_QUESTIONS[0].text);
  assert.equal(items.required.length, 22);
  assert.deepEqual(Object.keys(items.properties), items.required);
  assert.equal(items.properties.consistency.description, JUDGED_ITEMS[0].label);
  // OpenAI strict mode rejects property names outside this set.
  for (const key of [...answers.required, ...items.required]) assert.match(key, /^[a-zA-Z0-9_-]{1,64}$/);
});

describe("toModelOutput", () => {
  test("complete raw output round-trips to the array form in table order", () => {
    const raw = toRaw(fake());
    // Key order in the raw object must not matter.
    raw.answers = Object.fromEntries(Object.entries(raw.answers).reverse());
    const output = toModelOutput(raw);
    assert.deepEqual(output, fake());
    assert.deepEqual(output.answers.map((a) => a.question_id), ALL_QUESTIONS.map((q) => q.id));
    assert.equal(output.answers.length, 23);
    assert.equal(output.items.length, 22);
    assert.notEqual(buildRun(output, api, memo).report, null);
  });

  test("a missing key is skipped and the report is rejected", () => {
    const raw = toRaw(fake());
    delete raw.answers.protagonist_appeal__root;
    delete raw.items.arc;
    const output = toModelOutput(raw);
    assert.equal(output.answers.length, 22);
    assert.equal(output.answers.some((a) => a.question_id === "protagonist_appeal.root"), false);
    assert.equal(output.items.some((i) => i.item_id === "arc"), false);
    const run = buildRun(output, api, memo);
    assert.equal(run.report, null);
    assert.match(String(run.error), /Missing answers: protagonist_appeal\.root/);
  });

  test("extra keys are ignored", () => {
    const raw = toRaw(fake());
    raw.answers.made_up__question = raw.answers.arc__change;
    raw.items.made_up = raw.items.arc;
    assert.deepEqual(toModelOutput(raw), fake());
  });

  test("wrong types never produce a report", () => {
    const wrong = [
      { ...toRaw(fake()), answers: fake().answers },
      { ...toRaw(fake()), answers: null },
      { ...toRaw(fake()), answers: { ...toRaw(fake()).answers, arc__change: "yes" } },
    ] as unknown as RawOutput[];
    for (const raw of wrong) assert.equal(buildRun(toModelOutput(raw), api, memo).report, null);
  });
});

test("reportIdFor is a stable UUIDv8 per response id", () => {
  const id = reportIdFor("resp_abc123");
  assert.equal(reportIdFor("resp_abc123"), id);
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(reportIdFor("resp_abc124"), id);
});

test("memoHash changes with any of the three fields", () => {
  assert.equal(memoHash({ ...memo }), memoHash(memo));
  for (const key of ["genre", "memo", "references"] as const) {
    assert.notEqual(memoHash({ ...memo, [key]: memo[key] + "x" }), memoHash(memo), key);
  }
});

test("isResponseId accepts only resp_ ids safe for a URL path", () => {
  assert.equal(isResponseId("resp_abc123"), true);
  for (const bad of ["../files", "resp_", "resp_a/b"]) assert.equal(isResponseId(bad), false, bad);
});

describe("checkResponse", () => {
  test("queued and in_progress are still running", () => {
    for (const status of ["queued", "in_progress"] as const) {
      assert.deepEqual(checkResponse(response({ status }), memo, account), { state: "running" });
    }
  });

  const reason = (r: ApiResponse) => {
    const check = checkResponse(r, memo, account);
    assert.equal(check.state, "failed");
    return check.state === "failed" ? check.reason : null;
  };

  test("a response for another memo is rejected", () => {
    assert.equal(reason(response({ status: "queued", metadata: { memo_sha256: "other" } })), "memo_mismatch");
    assert.equal(reason(response({ metadata: null })), "memo_mismatch");
  });

  test("a response started by another account is rejected", () => {
    const other = { ...metadata, account_sha256: accountHash("other@example.com") };
    assert.equal(reason(response({ status: "queued", metadata: other })), "account_mismatch");
    // A response started before accounts were recorded has no account hash.
    assert.equal(reason(response({ metadata: { memo_sha256: metadata.memo_sha256 } })), "account_mismatch");
  });

  test("failed and incomplete responses report their code or reason", () => {
    assert.equal(
      reason(response({ status: "failed", error: { code: "credit_balance_exhausted", message: "x" } })),
      "credit_balance_exhausted",
    );
    assert.equal(
      reason(response({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } })),
      "max_output_tokens",
    );
  });

  test("a refusal and broken JSON are failures", () => {
    assert.equal(reason(response({ output: message([{ type: "refusal", refusal: "no" }]) })), "refusal");
    assert.equal(reason(response({ output: message([{ type: "output_text", text: '{"setting":' }]) })), "bad_json");
  });

  test("valid output becomes a run with a report and no raw output", () => {
    const text = JSON.stringify(toRaw(fake()));
    const half = Math.floor(text.length / 2);
    const output = message([
      { type: "output_text", text: text.slice(0, half) },
      { type: "output_text", text: text.slice(half) },
    ]);
    const check = checkResponse(response({ output, usage: { input_tokens: 1, output_tokens: 2 } }), memo, account);
    assert.equal(check.state, "done");
    if (check.state !== "done") return;
    assert.notEqual(check.run.report, null);
    assert.equal("output" in check.run.api, false);
    assert.deepEqual(check.run.api.usage, { input_tokens: 1, output_tokens: 2 });
  });
});

test("isTransient retries rate limits, server and network errors only", () => {
  assert.equal(isTransient(new ApiError(429, "rate_limit_exceeded", "x")), true);
  assert.equal(isTransient(new ApiError(503, null, "x")), true);
  assert.equal(isTransient(new ApiError(401, "invalid_api_key", "x")), false);
  assert.equal(isTransient(new TypeError("fetch failed")), true);
  assert.equal(isTransient(Object.assign(new Error("slow"), { name: "TimeoutError" })), true);
  assert.equal(isTransient(new Error("boom")), false);
  for (const value of ["TypeError", { name: "TypeError" }, null, undefined]) assert.equal(isTransient(value), false);
});

test("errorMessage has three branches", () => {
  const credit = "OpenAI 크레딧을 다 썼어요. 작성자에게 알려 주세요.";
  assert.equal(errorMessage("insufficient_quota", 429), credit);
  assert.equal(errorMessage("organization_usage_limit_exceeded", null), credit);
  assert.equal(errorMessage("rate_limit_exceeded", 429), "요청이 많아요. 잠시 뒤에 다시 해 주세요.");
  assert.equal(errorMessage(null, 500), "진단을 끝내지 못했어요. 잠시 뒤에 다시 해보세요.");
});
