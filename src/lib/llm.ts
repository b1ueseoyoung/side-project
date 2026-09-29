import "server-only";

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

// Personal, local use only: calls the installed Claude Code CLI (`claude -p`),
// which runs under the user's own login. Never expose this app to other people.

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";
const TIMEOUT_MS = 5 * 60 * 1000;

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
  model = process.env.CLAUDE_MODEL,
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
  ];
  if (model) args.push("--model", model);

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
    const child = spawn(CLAUDE_BIN, args, { cwd: tmpdir() });
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
