import "server-only";

import { requireEnv } from "./env.ts";

// OpenAI Responses API over fetch, run in background mode: the server starts a
// response and returns at once, and callers poll it by id.

const API = "https://api.openai.com/v1/responses";
const REQUEST_TIMEOUT_MS = 30_000;

/** Model and reasoning effort for diagnoses; the eval runner records them. */
export function openaiSettings(): { model: string; effort: string } {
  return {
    model: process.env.OPENAI_MODEL || "gpt-6-luna",
    effort: process.env.OPENAI_EFFORT || "max",
  };
}

export type ApiResponse = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed" | "cancelled" | "incomplete";
  model?: string;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
  error?: { code?: string | null; message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  usage?: Record<string, unknown> | null;
  metadata?: Record<string, string> | null;
} & Record<string, unknown>;

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(`OpenAI ${status}: ${message}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isResponseId(id: string): boolean {
  return /^resp_[A-Za-z0-9_-]{1,200}$/.test(id);
}

type StartOptions = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  metadata: Record<string, string>;
};

export function startStructured({ system, prompt, schema, metadata }: StartOptions): Promise<ApiResponse> {
  const { model, effort } = openaiSettings();
  return request("POST", API, {
    model,
    reasoning: { effort },
    instructions: system,
    input: prompt,
    text: { format: { type: "json_schema", name: "diagnosis", schema, strict: true } },
    background: true,
    // Keep the response after the polling window so a closed tab can pick it up later.
    store: true,
    metadata,
  });
}

export function getResponse(id: string): Promise<ApiResponse> {
  if (!isResponseId(id)) return Promise.reject(new Error("Invalid response id"));
  return request("GET", `${API}/${id}`);
}

/** Parsed structured output of a completed response; throws "refusal" if the model refused. */
export function structuredOutput<T>(r: ApiResponse): T {
  if (r.status !== "completed") throw new Error(`Response is ${r.status}`);
  const content = (r.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
  if (content.some((c) => c.type === "refusal")) throw new Error("refusal");
  const text = content
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("");
  return JSON.parse(text) as T;
}

async function request(method: "GET" | "POST", url: string, body?: unknown): Promise<ApiResponse> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as {
    error?: { code?: string | null; message?: string };
  } | null;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? null, json?.error?.message ?? res.statusText);
  }
  return json as ApiResponse;
}
