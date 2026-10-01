// Scores one results folder against the provisional labels and writes
// summary.json, summary.md and review.csv into it. No model calls.
// Usage: bun run eval:score -- eval/results/<run-id>

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { ALL_QUESTIONS, JUDGED_ITEMS } from "../../src/lib/diagnosis/items.ts";
import type { Memo, ModelOutput, Report } from "../../src/lib/diagnosis/types.ts";
import {
  ITEM_OF,
  SUBJECTIVE_QUESTIONS,
  VERDICTS,
  checkMustFind,
  checkMustNotFlag,
  findAnswer,
  judgeTarget,
  pairDiff,
  repeatConsistency,
  toCsv,
  validateLabel,
} from "./lib.ts";
import type { Label, PostprocessDiff, TargetResult } from "./lib.ts";

type Settings = { model: string; effort: string };
type RunInfo = {
  createdAt: string;
  dryRun: boolean;
  samples: string[];
  repeat: number;
  plannedModelCalls: number;
  settings: Settings;
  provider?: string;
  claudeCliVersion?: string | null;
  versions: {
    gitHead: string | null;
    uncommittedVersionedFiles: string[];
    files: Record<string, string>;
    systemPromptSha256: string;
    outputSchemaSha256: string;
  };
};
type Meta = {
  ok: boolean;
  stage: string;
  error: string | null;
  durationMs: number;
  cliModels?: string[];
  apiModel?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number } | null;
  costUsd?: number | null;
};
type Post = PostprocessDiff & { postprocessError: string | null };
type RunData = {
  sampleId: string;
  run: number;
  memo: Memo;
  meta: Meta | null;
  output: ModelOutput | null;
  report: Report | null;
  post: Post | null;
};

const ROOT = path.resolve(import.meta.dirname, "../..");
const { positionals } = parseArgs({ allowPositionals: true, options: {} });
const dirArg = positionals.find((p) => p !== "--");
if (!dirArg) throw new Error("Usage: bun run eval:score -- <results dir>");
const dir = path.resolve(dirArg);

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

const info = await readJson<RunInfo>(path.join(dir, "run-info.json"));
if (!info) throw new Error(`No run-info.json in ${dir}`);

const labels = new Map<string, Label>();
for (const id of info.samples) {
  const label = await readJson<Label>(path.join(ROOT, "eval/labels", `${id}.json`));
  if (label) labels.set(id, label);
}

const runs: RunData[] = [];
for (const sampleId of info.samples) {
  const sampleDir = path.join(dir, sampleId);
  const runDirs = (await readdir(sampleDir).catch(() => [] as string[])).filter((d) => d.startsWith("run-")).sort();
  for (const runDir of runDirs) {
    const base = path.join(sampleDir, runDir);
    const input = await readJson<{ memo: Memo }>(path.join(base, "input.json"));
    if (!input) continue;
    runs.push({
      sampleId,
      run: Number(runDir.slice("run-".length)),
      memo: input.memo,
      meta: await readJson<Meta>(path.join(base, "meta.json")),
      output: await readJson<ModelOutput>(path.join(base, "model-output.json")),
      report: await readJson<Report>(path.join(base, "report.json")),
      post: await readJson<Post>(path.join(base, "postprocess.json")),
    });
  }
}

// ---------- automatic checks ----------

const labelProblems = Object.fromEntries(
  [...labels].map(([id, label]) => {
    const memo = runs.find((r) => r.sampleId === id)?.memo;
    return [id, memo ? validateLabel(label, memo) : ["실행 기록이 없어 라벨을 확인하지 못함"]];
  }),
);

const targets = runs.flatMap((r) =>
  (labels.get(r.sampleId)?.targets ?? []).map((t) => ({ sampleId: r.sampleId, run: r.run, ...judgeTarget(t, r.output, r.report) })),
);
const mustFind = runs.flatMap((r) =>
  (labels.get(r.sampleId)?.mustFind ?? []).map((m) => ({
    sampleId: r.sampleId,
    run: r.run,
    description: m.description,
    ...checkMustFind(m, r.report),
  })),
);
const mustNotFlag = runs.flatMap((r) =>
  (labels.get(r.sampleId)?.mustNotFlag ?? []).map((m) => ({
    sampleId: r.sampleId,
    run: r.run,
    description: m.description,
    hasReport: Boolean(r.report),
    ...checkMustNotFlag(m, r.report),
  })),
);

const pairIds = [...new Set([...labels.values()].map((l) => l.pair))].sort();
const pairs = pairIds.flatMap((pair) => {
  const a = [...labels.values()].find((l) => l.pair === pair && l.variant === "A");
  const b = [...labels.values()].find((l) => l.pair === pair && l.variant === "B");
  if (!a || !b) return [];
  const excluded = new Set([
    ...a.targets.map((t) => t.questionId),
    ...b.targets.map((t) => t.questionId),
    ...a.mayAlsoChange,
    ...b.mayAlsoChange,
  ]);
  const runNumbers = [...new Set(runs.filter((r) => r.sampleId === a.sampleId).map((r) => r.run))];
  return runNumbers.map((n) => {
    const ra = runs.find((r) => r.sampleId === a.sampleId && r.run === n);
    const rb = runs.find((r) => r.sampleId === b.sampleId && r.run === n);
    return { pair, run: n, a: a.sampleId, b: b.sampleId, excluded: [...excluded], diff: pairDiff(ra?.report ?? null, rb?.report ?? null, excluded) };
  });
});

const repeats = info.samples.flatMap((id) => {
  const own = runs.filter((r) => r.sampleId === id);
  if (own.length < 2) return [];
  const coreIds = new Set((labels.get(id)?.targets ?? []).map((t) => t.questionId));
  const result = repeatConsistency(own.map((r) => r.report));
  return [{ sampleId: id, ...result, coreChanged: result.changed.filter((c) => coreIds.has(c.questionId)) }];
});

const failed = runs.filter((r) => !r.meta?.ok);
const mid = (xs: number[]) => {
  const s = [...xs].sort((x, y) => x - y);
  if (!s.length) return 0;
  const mid = s.length / 2;
  return s.length % 2 ? s[Math.floor(mid)] : (s[mid - 1] + s[mid]) / 2;
};
const nums = (xs: (number | null | undefined)[]) => xs.filter((x): x is number => typeof x === "number");
const costs = nums(runs.map((r) => r.meta?.costUsd));
const inputTokens = nums(runs.map((r) => r.meta?.usage?.input_tokens));
const outputTokens = nums(runs.map((r) => r.meta?.usage?.output_tokens));
const cost = costs.length ? { total: costs.reduce((a, b) => a + b, 0), median: mid(costs), max: Math.max(...costs) } : null;
const tokens = inputTokens.length ? { inputMedian: mid(inputTokens), outputMedian: mid(outputTokens) } : null;
const summary = {
  runInfo: info,
  cost,
  tokens,
  labelProblems,
  runs: runs.map((r) => ({ sampleId: r.sampleId, run: r.run, meta: r.meta, post: r.post })),
  targets,
  mustFind,
  mustNotFlag,
  pairs,
  repeats,
};
await writeFile(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");

// ---------- summary.md ----------

const yn = (a: string | null) => (a === "yes" ? "예" : a === "no" ? "아니오" : "-");
const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const short = (s: string, n = 60) => esc(s.length > n ? `${s.slice(0, n)}…` : s);
const table = (head: string[], rows: string[][]) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const secs = runs.map((r) => (r.meta ? Math.round(r.meta.durationMs / 1000) : 0)).sort((x, y) => x - y);
const median = Math.round(mid(secs));
const label = (id: string) => ITEM_OF.get(id)?.label ?? id;
const stageText: Record<string, string> = { done: "성공", model: "모델 호출 실패", postprocess: "후처리 실패" };
// A run folder without meta.json was interrupted or is still running; it stays in the failure count.
const NO_META = "중단 또는 진행 중(meta.json 없음)";

const lines: string[] = [];
lines.push(`# 평가 실행 결과: ${path.basename(dir)}`);
lines.push("");
lines.push(
  "> 합성 기획 메모로 잰 결과다. 실제 사용자 메모에서 검증한 품질이 아니다. 라벨은 AI가 쓴 사람 검토 전 임시 라벨이다. 상업성·매력·개성 문항은 라벨 없이 사람 검토표로만 본다.",
);
if (info.dryRun) lines.push("", "> **드라이런**: 모델을 부르지 않고 가짜 응답으로 저장과 집계만 확인한 결과다.");
lines.push("");
lines.push("## 실행 개요");
lines.push("");
lines.push(
  `- 표본: 샘플 ${info.samples.length}개 × 회차 ${info.repeat} = 계획 ${info.samples.length * info.repeat}건, 기록된 실행 ${runs.length}건`,
);
lines.push(
  `- 결과: 성공 ${runs.length - failed.length}건, 실패 ${failed.length}건` +
    (failed.length ? ` (${failed.map((r) => `${r.sampleId}#${r.run} ${stageText[r.meta?.stage ?? ""] ?? NO_META}`).join(", ")})` : "") +
    `, 실행 안 됨 ${info.samples.length * info.repeat - runs.length}건`,
);
lines.push(
  `- 모델 설정: ${info.settings.model}, 추론 ${info.settings.effort}, ${info.provider ?? `CLI ${info.claudeCliVersion ?? "-"}`}`,
);
const apiModels = [...new Set(runs.flatMap((r) => (r.meta?.apiModel ? [r.meta.apiModel] : [])))];
const models = apiModels.length ? apiModels : [...new Set(runs.flatMap((r) => r.meta?.cliModels ?? []))];
lines.push(`- 응답이 보고한 실제 모델: ${models.join(", ") || "-"}`);
const usd = (x: number) => `$${x.toFixed(4)}`;
if (cost) lines.push(`- 비용: 합계 ${usd(cost.total)}, 1회 중앙값 ${usd(cost.median)}, 최대 ${usd(cost.max)} (표준 요금)`);
if (tokens) lines.push(`- 토큰: 입력 중앙값 ${tokens.inputMedian}, 출력 중앙값 ${tokens.outputMedian}`);
lines.push(
  `- 버전: git ${info.versions.gitHead?.slice(0, 7) ?? "-"}` +
    (info.versions.uncommittedVersionedFiles.length ? ` (커밋 안 된 변경: ${info.versions.uncommittedVersionedFiles.join(", ")})` : "") +
    `, 시스템 프롬프트 ${info.versions.systemPromptSha256}, 출력 스키마 ${info.versions.outputSchemaSha256}, rules.ts ${info.versions.files["src/lib/diagnosis/rules.ts"]}, items.ts ${info.versions.files["src/lib/diagnosis/items.ts"]}`,
);
lines.push(`- 소요 시간: 합계 ${secs.reduce((a, b) => a + b, 0)}초, 중앙값 ${median}초, 범위 ${secs[0] ?? 0}~${secs.at(-1) ?? 0}초`);
lines.push("");
lines.push(
  table(
    ["샘플", "회차", "결과", "소요(초)", "원본 인용", "원문에 없는 인용", "앱이 뺀 인용", "후처리로 바뀐 답", "질문 누락", "오류"],
    runs.map((r) => [
      r.sampleId,
      String(r.run),
      stageText[r.meta?.stage ?? ""] ?? NO_META,
      String(r.meta ? Math.round(r.meta.durationMs / 1000) : "-"),
      String(r.post?.rawQuotes.total ?? "-"),
      String(r.post?.rawQuotes.notInMemo.length ?? "-"),
      String(r.post?.appDroppedQuotes ?? "-"),
      String(r.post?.changedAnswers.length ?? "-"),
      r.post ? String(r.post.missingQuestionIds.length + r.post.duplicateQuestionIds.length + r.post.unknownQuestionIds.length) : "-",
      short(r.meta?.error ?? r.post?.postprocessError ?? "", 80),
    ]),
  ),
);

const problems = Object.entries(labelProblems).filter(([, p]) => p.length);
lines.push("");
lines.push(`라벨 자체 점검: ${problems.length ? problems.map(([id, p]) => `${id} ${p.join("; ")}`).join(" / ") : "문제 없음 (라벨 인용이 모두 메모에 있고 질문 ID가 모두 유효)"}`);

lines.push("", "## 1. 대상 질문 판정 (라벨 범주별, 합산하지 않음)", "");
lines.push(
  table(
    ["샘플", "회차", "질문", "임시 라벨", "앱 원본→최종", "신호", "먼저 고칠 3", "결과", "예상 근거 인용", "예상 밖 인용", "정보 부족 표현"],
    targets.map((t) => [
      t.sampleId,
      String(t.run),
      `${t.questionId} (${label(t.questionId)})`,
      t.expected,
      `${yn(t.rawAnswer)}→${yn(t.finalAnswer)}${t.downgradedForEvidence ? " (근거 없음으로 바뀜)" : ""}`,
      t.signal ?? "-",
      t.inTopFixes ? "포함" : "-",
      t.outcome,
      `${t.expectedCited.filter((c) => c.cited).length}/${t.expectedCited.length}`,
      String(t.unexpectedEvidence.length),
      t.missingInfoWording ? "있음" : "없음",
    ]),
  ),
);
lines.push("");
lines.push(
  table(
    ["임시 라벨", "대상 건수", "앱 최종 예", "앱 최종 아니오", "결과 없음(실패)"],
    VERDICTS.map((v) => {
      const own = targets.filter((t) => t.expected === v);
      return [v, String(own.length), String(own.filter((t) => t.finalAnswer === "yes").length), String(own.filter((t) => t.finalAnswer === "no").length), String(own.filter((t) => !t.finalAnswer).length)];
    }),
  ),
);
lines.push("", "'정보 부족 표현'은 이유·코멘트에 '메모에 없다' 류의 말이 있는지 본 휴리스틱이다. 사람이 확인해야 한다.");

lines.push("", "## 2. 반드시 찾아야 할 문제", "");
lines.push(
  table(
    ["샘플", "회차", "문제", "질문 답", "필수 인용", "찾음"],
    mustFind.map((m) => [m.sampleId, String(m.run), short(m.description, 70), yn(m.answer), m.of ? `${m.cited}/${m.of}` : "없음", m.found ? "예" : "아니오"]),
  ),
);

lines.push("", "## 3. 하면 안 되는 지적 (자동 적발은 의심 건이며 사람이 확인)", "");
lines.push(
  table(
    ["샘플", "회차", "하면 안 되는 지적", "자동 적발"],
    mustNotFlag.map((m) => [
      m.sampleId,
      String(m.run),
      short(m.description, 70),
      !m.hasReport ? "리포트 없음" : m.humanOnly ? "사람만 판단 가능" : m.hits.length ? short(m.hits.join("; "), 90) : "없음",
    ]),
  ),
);

lines.push("", "## 4. 근거 정확성 (자동: 원문 존재만 확인)", "");
const allQuotes = runs.reduce((n, r) => n + (r.post?.rawQuotes.total ?? 0), 0);
const missingQuotes = runs.flatMap((r) => (r.post?.rawQuotes.notInMemo ?? []).map((q) => ({ ...q, sampleId: r.sampleId, run: r.run })));
lines.push(`- 원본 응답 인용 ${allQuotes}개 중 원문에 없는 인용 ${missingQuotes.length}개 (성공·후처리 실패 실행만 집계, 모델 호출 실패는 응답이 없음)`);
if (missingQuotes.length) {
  lines.push("");
  lines.push(table(["샘플", "회차", "위치", "질문", "인용"], missingQuotes.map((q) => [q.sampleId, String(q.run), q.where, q.questionId ?? "-", short(q.quote, 80)])));
}
const changed = runs.flatMap((r) =>
  (r.post?.changedAnswers ?? []).map((c) => {
    const found = findAnswer(r.report, c.questionId);
    return { ...c, sampleId: r.sampleId, run: r.run, signal: found?.item.signal ?? "-", inTop: Boolean(found && r.report?.topFixes.some((i) => i.id === found.item.id)) };
  }),
);
lines.push("");
lines.push(`- 후처리로 바뀐 답 ${changed.length}건 (근거 인용이 원문에서 확인되지 않아 "예"가 "아니오"가 된 경우)`);
if (changed.length) {
  lines.push("");
  lines.push(
    table(
      ["샘플", "회차", "질문", "원본→최종", "항목 신호", "먼저 고칠 3", "원본 이유"],
      changed.map((c) => [c.sampleId, String(c.run), c.questionId, `${yn(c.raw)}→${yn(c.final)}`, c.signal, c.inTop ? "포함" : "-", short(c.rawReason, 70)]),
    ),
  );
}

lines.push("", "## 5. 수정 우선순위 (먼저 고칠 3가지)", "");
lines.push(
  table(
    ["샘플", "회차", "빨강 항목 (목록 순)", "먼저 고칠 3", "목록 순서와 같음", "빠진 빨강", "대상 문제 포함"],
    runs.map((r) => {
      const p = r.post?.priority;
      const targetItems = (labels.get(r.sampleId)?.targets ?? []).filter((t) => t.expected !== "문제 없음").map((t) => ITEM_OF.get(t.questionId)?.id ?? "");
      return [
        r.sampleId,
        String(r.run),
        p ? p.red.join(", ") || "-" : "-",
        p ? p.topFixes.map((t) => `${t.itemId}(${t.tableIndex + 1}번째)`).join(", ") || "-" : "-",
        p ? (p.followsTableOrder ? "예" : "아니오") : "-",
        p ? p.redLeftOut.join(", ") || "-" : "-",
        !p ? "-" : targetItems.length === 0 ? "해당 없음" : targetItems.every((id) => p.topFixes.some((t) => t.itemId === id)) ? "예" : "아니오",
      ];
    }),
  ),
);
lines.push("", `항목 목록은 ${JUDGED_ITEMS.length}개이고, 앱은 빨강을 먼저, 같은 색 안에서는 목록 순서대로 3개를 고른다.`);

lines.push("", "## 6. 쌍 비교: 바꾼 부분과 무관한 질문이 흔들렸는가", "");
lines.push(
  table(
    ["쌍", "회차", "비교한 질문 수", "달라진 질문"],
    pairs.map((p) => [
      `${p.a}↔${p.b}`,
      String(p.run),
      p.diff ? String(p.diff.compared) : "-",
      !p.diff ? "한쪽 실패로 비교 못 함" : p.diff.differences.map((d) => `${d.questionId} ${yn(d.a)}→${yn(d.b)}${d.subjective ? "(주관)" : ""}`).join(", ") || "없음",
    ]),
  ),
);
lines.push("", "비교에서 뺀 질문: 대상 질문과 라벨의 mayAlsoChange(바꾼 부분 때문에 달라질 수 있는 질문).");

lines.push("", "## 7. 반복 일관성", "");
if (!repeats.length) {
  lines.push("이번 실행은 샘플마다 1회라 측정하지 않았다. `--repeat 3`으로 켠다.");
} else {
  lines.push(
    table(
      ["샘플", "회차", "성공", "바뀐 질문 수", "바뀐 대상 질문"],
      repeats.map((r) => [r.sampleId, String(r.runs), String(r.succeeded), String(r.changed.length), r.coreChanged.map((c) => c.questionId).join(", ") || "없음"]),
    ),
  );
}

// ---------- review.csv ----------

const header = [
  "우선순위", "샘플", "쌍", "회차", "질문ID", "항목", "질문", "구분", "임시라벨(AI)", "앱원본답", "앱최종답", "후처리변경",
  "항목신호", "먼저고칠3", "앱이유", "앱인용(최종)", "원문에없는인용(원본)", "항목코멘트", "방향", "자동메모",
  "[검토]라벨확정(문제 없음/문제 있음/정보 부족/해당 없음)", "[검토]인용이 판단을 뒷받침(예/부분/아니오)", "[검토]조언 이해도(1-5)", "[검토]메모",
];
const rows: string[][] = [];
for (const r of runs) {
  const l = labels.get(r.sampleId);
  if (!r.report) {
    rows.push(["1", r.sampleId, l?.pair ?? "", String(r.run), "-", "-", "-", "실행 실패", "", "", "", "", "", "", "", "", "", "", "", `실패: ${r.meta?.error ?? r.post?.postprocessError ?? NO_META}`, "", "", "", ""]);
    continue;
  }
  const pairDiffIds = new Set(pairs.filter((p) => p.run === r.run && (p.a === r.sampleId || p.b === r.sampleId)).flatMap((p) => p.diff?.differences.map((d) => d.questionId) ?? []));
  const topIds = new Set(r.report.topFixes.map((i) => i.id));
  for (const q of ALL_QUESTIONS) {
    const found = findAnswer(r.report, q.id);
    const raw = r.output?.answers?.find((a) => a.question_id === q.id);
    const target = targets.find((t) => t.sampleId === r.sampleId && t.run === r.run && t.questionId === q.id) as TargetResult | undefined;
    const notFlag = mustNotFlag.filter((m) => m.sampleId === r.sampleId && m.run === r.run && m.hits.some((h) => h.startsWith(q.id)));
    const changedHere = r.post?.changedAnswers.some((c) => c.questionId === q.id) ?? false;
    const subjective = SUBJECTIVE_QUESTIONS.has(q.id);
    const inTop = Boolean(found && topIds.has(found.item.id));
    const priority = target || notFlag.length || changedHere ? 1 : subjective ? 2 : inTop ? 3 : pairDiffIds.has(q.id) ? 4 : 5;
    const notes = [
      target ? `예상 근거 ${target.expectedCited.filter((c) => c.cited).length}/${target.expectedCited.length} 인용` : "",
      target?.unexpectedEvidence.length ? `예상 밖 인용 ${target.unexpectedEvidence.length}개(원문에는 있음, 관련성 확인 필요)` : "",
      target?.missingInfoWording ? "정보 부족 표현 있음(휴리스틱)" : "",
      notFlag.length ? `하면 안 되는 지적 의심: ${notFlag.map((m) => m.description).join("; ")}` : "",
      changedHere ? "근거 확인 실패로 예→아니오" : "",
      pairDiffIds.has(q.id) ? "쌍 비교에서 답이 달라짐" : "",
    ].filter(Boolean);
    rows.push([
      String(priority),
      r.sampleId,
      l?.pair ?? "",
      String(r.run),
      q.id,
      ITEM_OF.get(q.id)?.label ?? "",
      q.text,
      target ? "대상" : subjective ? "주관(라벨 없음)" : "기타",
      target?.expected ?? "",
      yn(raw?.answer ?? null),
      yn(found?.answer.answer ?? null),
      changedHere ? "예" : "",
      found?.item.signal ?? "",
      inTop ? "포함" : "",
      found?.answer.reason ?? "",
      (found?.answer.evidence ?? []).map((e) => e.quote).join(" / "),
      (r.post?.rawQuotes.notInMemo ?? []).filter((n) => n.questionId === q.id).map((n) => n.quote).join(" / "),
      found?.item.comment ?? "",
      found?.item.direction ?? "",
      notes.join(" · "),
      "",
      "",
      "",
      "",
    ]);
  }
}
rows.sort((x, y) => Number(x[0]) - Number(y[0]));
await writeFile(path.join(dir, "review.csv"), toCsv([header, ...rows]));

const byPriority = [1, 2, 3, 4, 5].map((p) => `${p}순위 ${rows.filter((r) => r[0] === String(p)).length}행`).join(", ");
lines.push("", "## 8. 사람 검토표", "");
lines.push(`- review.csv: ${rows.length}행 (${byPriority}). 1순위는 대상 질문, 하면 안 되는 지적 의심, 근거 확인 실패로 바뀐 답이다.`);
lines.push("- 인용이 판단을 실제로 뒷받침하는지, 조언이 어느 부분을 왜 봐야 하는지 알려 주는지는 자동으로 판정하지 않는다. [검토] 열을 사람이 채운다.");
lines.push("- 주관 문항(장르 재미, 개성, 셀링 포인트, 주인공 매력)은 흥행이나 투고 성공을 검증하지 않는다. 근거와 유용성만 본다.");
await writeFile(path.join(dir, "summary.md"), lines.join("\n") + "\n");

console.log(`SCORED runs=${runs.length} failed=${failed.length} targets=${targets.length} reviewRows=${rows.length} dir=${dir}`);
