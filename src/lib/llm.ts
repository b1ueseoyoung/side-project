import "server-only";

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

// Personal, local use only: calls the installed Claude Code CLI (`claude -p`),
// which runs under the user's own login. Never expose this app to other people.

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";
// Max effort thinks long: a 4,000-character sample took 14-18 minutes (2026-09-29),
// and API retries add more. Memos may be ten times longer, so wait up to an hour.
const TIMEOUT_MS = 60 * 60 * 1000;

/** Model and effort `claude -p` runs with; the eval runner records them. */
export function claudeSettings() {
  return {
    model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
    effort: process.env.CLAUDE_EFFORT || "max",
  };
}

type AskOptions = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  model?: string;
};

/** The JSON that `claude -p --output-format json` prints. */
export type ClaudeResult = { structured_output?: unknown; is_error?: boolean; subtype?: string } & Record<
  string,
  unknown
>;

export async function askStructured<T>(options: AskOptions): Promise<T> {
  return (await askStructuredWithResult<T>(options)).value;
}

/**
 * Same call as askStructured, also returning the CLI's full result. A failed
 * result is attached to the thrown error as `result`.
 */
export async function askStructuredWithResult<T>({
  system,
  prompt,
  schema,
  model = claudeSettings().model,
}: AskOptions): Promise<{ value: T; result: ClaudeResult }> {
  const args = [
    "-p",
    "--output-format", "json",
    "--json-schema", JSON.stringify(schema),
    "--system-prompt", system,
    // No tools, settings, MCP servers or saved sessions: a plain one-shot answer.
    "--tools", "",
    "--setting-sources", "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--effort", claudeSettings().effort,
    "--model", model,
  ];

  const stdout = await run(args, prompt);
  const result = JSON.parse(stdout) as ClaudeResult;
  if (result.is_error || result.subtype !== "success") {
    throw Object.assign(new Error(`Claude Code failed: ${result.subtype ?? "unknown error"}`), { result });
  }
  return { value: result.structured_output as T, result };
}

function run(args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Run outside the repo so the project's CLAUDE.md is not loaded.
    const child = spawn(/*turbopackIgnore: true*/ CLAUDE_BIN, args, { cwd: tmpdir() });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude exited with ${code}: ${stderr.trim()}`));
    });

    // Manuscripts go through stdin to avoid argument length limits.
    child.stdin.end(input);
  });
}
