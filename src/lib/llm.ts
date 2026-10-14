import "server-only";

import { requireEnv } from "./env.ts";

// Claude Message Batches API over fetch: the server submits a batch of one request and
// returns at once, and callers poll it by id. A diagnosis at max effort takes 10-20 minutes,
// longer than a serverless request can stay open, and a batch costs half the standard price.
// The schema goes into the system prompt, not output_config.format: the diagnosis schema
// compiles to a grammar the API rejects as too large (smoke test 2026-10-14).

const API = "https://api.anthropic.com/v1/messages/batches";
const REQUEST_TIMEOUT_MS = 30_000;
// Max effort spent 124k output tokens on a 1,300-character memo (eval baseline 2026-09-30),
// close to the 128k synchronous cap; batches allow 300k with this beta header.
const OUTPUT_300K = "output-300k-2026-03-24";
const MAX_TOKENS = 300_000;

/** Model and effort for diagnoses; the eval runner records them. */
export function claudeSettings(): { model: string; effort: string } {
  return {
    model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
    effort: process.env.CLAUDE_EFFORT || "max",
  };
}

/** A batch of one request, flattened with that request's result once the batch has ended. */
export type ApiResponse = {
  id: string;
  status: "in_progress" | "canceling" | "ended";
  created_at?: string;
  ended_at?: string | null;
  custom_id?: string;
  result?: "succeeded" | "errored" | "canceled" | "expired";
  error?: { type?: string; message?: string } | null;
  message_id?: string;
  model?: string;
  stop_reason?: string | null;
  usage?: Record<string, unknown> | null;
  content?: { type: string; text?: string }[];
};

type Batch = { id: string; processing_status: ApiResponse["status"]; created_at?: string; ended_at?: string | null };

type ResultLine = {
  custom_id: string;
  result: {
    type: NonNullable<ApiResponse["result"]>;
    message?: { id: string; model?: string; content?: ApiResponse["content"]; stop_reason?: string | null; usage?: Record<string, unknown> };
    error?: { error?: { type?: string; message?: string } };
  };
};

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(`Claude API ${status}: ${message}`);
    this.name = "ApiError";
    this.status = status;
    // An empty credit balance or a reached spend limit comes back as a 400: name it like the 402.
    this.code = /credit balance|usage limit|spend limit/i.test(message) ? "billing_error" : code;
  }
}

export function isBatchId(id: string): boolean {
  return /^msgbatch_[A-Za-z0-9_-]{1,200}$/.test(id);
}

type StartOptions = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  customId: string;
};

export async function startStructured({ system, prompt, schema, customId }: StartOptions): Promise<ApiResponse> {
  const { model, effort } = claudeSettings();
  const res = await call("POST", API, {
    requests: [
      {
        custom_id: customId,
        params: {
          model,
          max_tokens: MAX_TOKENS,
          system: `${system}\n\n## 출력 형식\n\n아래 JSON 스키마를 따르는 JSON 객체 하나만 출력한다. 앞뒤에 다른 글이나 코드 블록을 붙이지 않는다.\n\n${JSON.stringify(schema)}`,
          messages: [{ role: "user", content: prompt }],
          output_config: { effort },
        },
      },
    ],
  });
  return fromBatch((await res.json()) as Batch);
}

export async function getResponse(id: string): Promise<ApiResponse> {
  if (!isBatchId(id)) throw new Error("Invalid batch id");
  const r = fromBatch((await (await call("GET", `${API}/${id}`)).json()) as Batch);
  if (r.status !== "ended") return r;
  // One request per batch: the results file has one line.
  const text = await (await call("GET", `${API}/${id}/results`)).text();
  const first = text.split("\n").find((l) => l.trim());
  if (!first) return r;
  const line = JSON.parse(first) as ResultLine;
  const m = line.result.message;
  return {
    ...r,
    custom_id: line.custom_id,
    result: line.result.type,
    error: line.result.error?.error ?? null,
    message_id: m?.id,
    model: m?.model,
    stop_reason: m?.stop_reason ?? null,
    usage: m?.usage ?? null,
    content: m?.content,
  };
}

/** Parsed structured output of a succeeded request; throws "refusal" if the model refused. */
export function structuredOutput<T>(r: ApiResponse): T {
  if (r.result !== "succeeded") throw new Error(`Result is ${r.result}`);
  if (r.stop_reason === "refusal") throw new Error("refusal");
  const text = (r.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("");
  // Nothing constrains the output: keep the first complete object and drop a code fence, a sentence
  // or a stray closing brace around it (Haiku added one). buildReport still rejects missing answers.
  const body = text.slice(text.indexOf("{"));
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    const end = /after JSON at position (\d+)/.exec(String(error))?.[1];
    if (!end) throw error;
    return JSON.parse(body.slice(0, Number(end))) as T;
  }
}

function fromBatch(b: Batch): ApiResponse {
  return { id: b.id, status: b.processing_status, created_at: b.created_at, ended_at: b.ended_at };
}

async function call(method: "GET" | "POST", url: string, body?: unknown): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": requireEnv("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      ...(body === undefined ? {} : { "anthropic-beta": OUTPUT_300K }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { type?: string; message?: string } } | null;
    throw new ApiError(res.status, json?.error?.type ?? null, json?.error?.message ?? res.statusText);
  }
  return res;
}
