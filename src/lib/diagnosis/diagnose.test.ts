import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { fakeModelOutput } from "../../../scripts/eval/lib.ts";
import { ApiError, isBatchId } from "../llm.ts";
import type { ApiResponse } from "../llm.ts";
import {
  accountHash,
  buildRun,
  checkResponse,
  customIdFor,
  errorMessage,
  isTransient,
  memoHash,
  reportIdFor,
  toModelOutput,
} from "./diagnose.ts";
import type { RawOutput } from "./diagnose.ts";
import { ALL_QUESTIONS, JUDGED_ITEMS } from "./items.ts";
import { OUTPUT_SCHEMA, answerKey } from "./prompt.ts";
import type { Memo, ModelOutput } from "./types.ts";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const memo = JSON.parse(readFileSync(path.join(ROOT, "eval/samples/p1a.json"), "utf8")) as Memo;
const account = "writer@example.com";
const customId = customIdFor(memo, account);

const text = (...parts: string[]) => [{ type: "thinking" }, ...parts.map((t) => ({ type: "text", text: t }))];
const response = (fields: Partial<ApiResponse>): ApiResponse => ({
  id: "msgbatch_test",
  status: "ended",
  custom_id: customId,
  result: "succeeded",
  stop_reason: "end_turn",
  ...fields,
});

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
  // Keep property names plain: letters, digits, _ and -.
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
  const id = reportIdFor("msgbatch_abc123");
  assert.equal(reportIdFor("msgbatch_abc123"), id);
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(reportIdFor("msgbatch_abc124"), id);
});

test("memoHash changes with any of the three fields", () => {
  assert.equal(memoHash({ ...memo }), memoHash(memo));
  for (const key of ["genre", "memo", "references"] as const) {
    assert.notEqual(memoHash({ ...memo, [key]: memo[key] + "x" }), memoHash(memo), key);
  }
});

test("customIdFor fits the 64-character limit: memo hash, then account hash", () => {
  assert.match(customId, /^[0-9a-f]{64}$/);
  assert.equal(customId, memoHash(memo).slice(0, 32) + accountHash(account).slice(0, 32));
});

test("isBatchId accepts only msgbatch_ ids safe for a URL path", () => {
  assert.equal(isBatchId("msgbatch_01HkcTjaV5uDC8jWR4ZsDV8d"), true);
  for (const bad of ["../files", "msgbatch_", "msgbatch_a/b", "resp_abc123"]) assert.equal(isBatchId(bad), false, bad);
});

describe("checkResponse", () => {
  test("a batch that has not ended is still running", () => {
    for (const status of ["in_progress", "canceling"] as const) {
      const r = response({ status, custom_id: undefined, result: undefined });
      assert.deepEqual(checkResponse(r, memo, account), { state: "running" });
    }
  });

  const reason = (r: ApiResponse) => {
    const check = checkResponse(r, memo, account);
    assert.equal(check.state, "failed");
    return check.state === "failed" ? check.reason : null;
  };

  test("a result for another memo is rejected", () => {
    assert.equal(reason(response({ custom_id: customIdFor({ ...memo, memo: memo.memo + "x" }, account) })), "memo_mismatch");
  });

  test("a result started by another account is rejected", () => {
    assert.equal(reason(response({ custom_id: customIdFor(memo, "other@example.com") })), "account_mismatch");
  });

  test("an ended batch without a result line fails", () => {
    assert.equal(reason(response({ custom_id: undefined, result: undefined })), "no_result");
  });

  test("errored, canceled and expired requests report their error type or result", () => {
    assert.equal(reason(response({ result: "errored", error: { type: "overloaded_error", message: "x" } })), "overloaded_error");
    assert.equal(reason(response({ result: "expired" })), "expired");
    assert.equal(reason(response({ result: "canceled" })), "canceled");
  });

  test("output cut at max_tokens, a refusal and broken JSON are failures", () => {
    assert.equal(reason(response({ stop_reason: "max_tokens", content: text('{"setting":') })), "max_tokens");
    assert.equal(reason(response({ stop_reason: "refusal", content: text("") })), "refusal");
    assert.equal(reason(response({ content: text('{"setting":') })), "bad_json");
  });

  test("valid output becomes a run with a report and no raw output", () => {
    const json = JSON.stringify(toRaw(fake()));
    const half = Math.floor(json.length / 2);
    const content = text(json.slice(0, half), json.slice(half));
    const check = checkResponse(response({ content, usage: { input_tokens: 1, output_tokens: 2 } }), memo, account);
    assert.equal(check.state, "done");
    if (check.state !== "done") return;
    assert.notEqual(check.run.report, null);
    assert.equal("content" in check.run.api, false);
    assert.deepEqual(check.run.api.usage, { input_tokens: 1, output_tokens: 2 });
  });

  test("a code fence or a stray closing brace around the object still parses", () => {
    const json = JSON.stringify(toRaw(fake()));
    for (const wrapped of ["```json\n" + json + "\n```", json + "}", "결과입니다.\n" + json + "\n}"]) {
      assert.equal(checkResponse(response({ content: text(wrapped) }), memo, account).state, "done", wrapped.slice(0, 12));
    }
  });
});

test("isTransient retries rate limits, server and network errors only", () => {
  assert.equal(isTransient(new ApiError(429, "rate_limit_error", "x")), true);
  assert.equal(isTransient(new ApiError(529, "overloaded_error", "x")), true);
  assert.equal(isTransient(new ApiError(401, "authentication_error", "x")), false);
  assert.equal(isTransient(new TypeError("fetch failed")), true);
  assert.equal(isTransient(Object.assign(new Error("slow"), { name: "TimeoutError" })), true);
  assert.equal(isTransient(new Error("boom")), false);
  for (const value of ["TypeError", { name: "TypeError" }, null, undefined]) assert.equal(isTransient(value), false);
});

test("errorMessage has three branches", () => {
  const credit = "Claude API 크레딧을 다 썼어요. 작성자에게 알려 주세요.";
  assert.equal(errorMessage("billing_error", 402), credit);
  // An empty balance arrives as a 400 invalid_request_error; ApiError names it billing_error.
  const lowBalance = new ApiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API.");
  assert.equal(errorMessage(lowBalance.code, 400), credit);
  assert.equal(errorMessage(new ApiError(400, "invalid_request_error", "max_tokens: too large").code, 400), "진단을 끝내지 못했어요. 잠시 뒤에 다시 해보세요.");
  assert.equal(errorMessage("rate_limit_error", 429), "요청이 많아요. 잠시 뒤에 다시 해 주세요.");
  assert.equal(errorMessage(null, 500), "진단을 끝내지 못했어요. 잠시 뒤에 다시 해보세요.");
});
