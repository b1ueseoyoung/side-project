// Runs the evaluation memos through the app's own diagnosis path (same
// prompt, model call and post-processing) and keeps every artifact.
// Usage: bun run eval -- [--samples p1a,p1b|all] [--repeat 1|2|3] [--max-calls 8] [--dry-run] [--out dir]

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import { buildRun, diagnoseDetailed } from "../../src/lib/diagnosis/diagnose.ts";
import type { DiagnosisRun } from "../../src/lib/diagnosis/diagnose.ts";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, buildPrompt } from "../../src/lib/diagnosis/prompt.ts";
import type { Memo } from "../../src/lib/diagnosis/types.ts";
import { claudeSettings } from "../../src/lib/llm.ts";
import type { ClaudeResult } from "../../src/lib/llm.ts";
import { diffPostprocess, fakeModelOutput, safeError } from "./lib.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const VERSIONED_FILES = [
  "src/lib/diagnosis/prompt.ts",
  "src/lib/diagnosis/rules.ts",
  "src/lib/diagnosis/items.ts",
  "src/lib/diagnosis/types.ts",
  "src/lib/diagnosis/diagnose.ts",
  "src/lib/llm.ts",
];

const { values } = parseArgs({
  allowPositionals: true,
  options: {
    samples: { type: "string", default: "all" },
    repeat: { type: "string", default: "1" },
    "max-calls": { type: "string", default: "8" },
    "dry-run": { type: "boolean", default: false },
    out: { type: "string" },
  },
});

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const writeJson = (dir: string, name: string, data: unknown) =>
  writeFile(path.join(dir, name), JSON.stringify(data, null, 2) + "\n");
const tryRun = (command: string, args: string[]) => {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};
const git = (...args: string[]) => tryRun("git", args);
const claudeVersion = () => tryRun(process.env.CLAUDE_BIN ?? "claude", ["--version"]);

const dryRun = values["dry-run"];
const repeat = Number(values.repeat);
const maxCalls = Number(values["max-calls"]);
const available = (await readdir(path.join(ROOT, "eval/samples")))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -".json".length))
  .sort();
const chosen = values.samples === "all" ? available : values.samples.split(",").map((s) => s.trim());

const unknown = chosen.filter((id) => !available.includes(id));
if (unknown.length) throw new Error(`Unknown samples: ${unknown.join(", ")}`);
if (![1, 2, 3].includes(repeat)) throw new Error("--repeat must be 1, 2 or 3");
const calls = chosen.length * repeat;
if (!dryRun && calls > maxCalls) {
  throw new Error(`${calls} model calls planned but --max-calls is ${maxCalls}. Raise it on purpose.`);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const out = path.resolve(values.out ?? (dryRun ? path.join(tmpdir(), `eval-dry-${stamp}`) : path.join(ROOT, "eval/results", stamp)));
await mkdir(out, { recursive: true });

const fileHashes: Record<string, string> = {};
for (const f of VERSIONED_FILES) fileHashes[f] = sha(await readFile(path.join(ROOT, f), "utf8")).slice(0, 16);

await writeJson(out, "run-info.json", {
  createdAt: new Date().toISOString(),
  dryRun,
  samples: chosen,
  repeat,
  plannedModelCalls: dryRun ? 0 : calls,
  settings: claudeSettings(),
  claudeCliVersion: dryRun ? null : claudeVersion(),
  versions: {
    gitHead: git("rev-parse", "HEAD"),
    uncommittedVersionedFiles: (git("status", "--porcelain", "--", ...VERSIONED_FILES) ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    files: fileHashes,
    systemPromptSha256: sha(SYSTEM_PROMPT).slice(0, 16),
    outputSchemaSha256: sha(JSON.stringify(OUTPUT_SCHEMA)).slice(0, 16),
  },
  node: process.version,
});

console.log(`PLAN samples=${chosen.length} repeat=${repeat} modelCalls=${dryRun ? 0 : calls} out=${out}`);

runs: for (const sampleId of chosen) {
  const memo = JSON.parse(await readFile(path.join(ROOT, "eval/samples", `${sampleId}.json`), "utf8")) as Memo;
  for (let n = 1; n <= repeat; n++) {
    const dir = path.join(out, sampleId, `run-${n}`);
    await mkdir(dir, { recursive: true });
    await writeJson(dir, "input.json", { memo, promptSha256: sha(buildPrompt(memo)).slice(0, 16) });

    const startedAt = new Date();
    let run: DiagnosisRun | null = null;
    let error: string | null = null;
    let failedCli: ClaudeResult | null = null;
    try {
      run = dryRun ? buildRun(fakeModelOutput(memo, sampleId, n), { dry_run: true }, memo) : await diagnoseDetailed(memo);
    } catch (e) {
      error = safeError(e);
      failedCli = (e as { result?: ClaudeResult }).result ?? null;
    }
    const durationMs = Date.now() - startedAt.getTime();

    if (run) {
      const cli = { ...run.cli };
      delete cli.structured_output;
      await writeJson(dir, "model-output.json", run.output);
      await writeJson(dir, "cli-result.json", cli);
      await writeJson(dir, "report.json", run.report);
      await writeJson(dir, "postprocess.json", {
        ...diffPostprocess(run.output, run.report, memo),
        postprocessError: run.error ? safeError(run.error) : null,
      });
    } else if (failedCli) {
      await writeJson(dir, "cli-result.json", failedCli);
    }

    const stage = !run ? "model" : run.report ? "done" : "postprocess";
    const cli = run?.cli ?? failedCli;
    const meta = {
      sampleId,
      run: n,
      dryRun,
      ok: stage === "done",
      stage,
      error: error ?? (run?.error ? safeError(run.error) : null),
      startedAt: startedAt.toISOString(),
      durationMs,
      settings: claudeSettings(),
      cliModels: cli?.modelUsage && typeof cli.modelUsage === "object" ? Object.keys(cli.modelUsage) : [],
      cliDurationMs: cli?.duration_ms ?? null,
      cliApiDurationMs: cli?.duration_api_ms ?? null,
      cliUsage: cli?.usage ?? null,
      cliCostUsd: cli?.total_cost_usd ?? null,
    };
    await writeJson(dir, "meta.json", meta);
    await appendFile(
      path.join(out, "runs.jsonl"),
      JSON.stringify({ sampleId, run: n, ok: meta.ok, stage, durationMs, error: meta.error }) + "\n",
    );
    console.log(
      `RUN ${sampleId}#${n} ${meta.ok ? "OK" : "FAIL"} stage=${stage} ${Math.round(durationMs / 1000)}s` +
        (meta.error ? ` error=${meta.error.slice(0, 300)}` : ""),
    );

    // A failed model call usually means login, usage limit or network trouble:
    // stop and report instead of retrying.
    if (stage === "model") {
      console.log("STOP model call failed; not retrying. See meta.json.");
      process.exitCode = 2;
      break runs;
    }
  }
}

console.log(`ALL_DONE out=${out}`);
