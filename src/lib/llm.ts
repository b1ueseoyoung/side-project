import "server-only";

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

// Personal, local use only: calls the installed Claude Code CLI (`claude -p`),
// which runs under the user's own login. Never expose this app to other people.

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";
// Max effort thinks long: a 4,000-character sample took 14-18 minutes (2026-09-29),
// and API retries add more. Memos may be ten times longer, so wait up to an hour.
const TIMEOUT_MS = 60 * 60 * 1000;

type AskOptions = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  model?: string;
};

export async function askStructured<T>({
  system,
  prompt,
  schema,
  model = process.env.CLAUDE_MODEL || "claude-opus-5-5",
}: AskOptions): Promise<T> {
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
    "--effort", process.env.CLAUDE_EFFORT || "max",
    "--model", model,
  ];

  const stdout = await run(args, prompt);
  const result = JSON.parse(stdout);
  if (result.is_error || result.subtype !== "success") {
    throw new Error(`Claude Code failed: ${result.subtype ?? "unknown error"}`);
  }
  return result.structured_output as T;
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
