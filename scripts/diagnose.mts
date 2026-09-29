// Run a diagnosis on a sample planning memo from the command line.
// Usage: npm run diagnose -- samples/02-play-assignment.json [--raw]

import { readFile } from "node:fs/promises";

import { diagnose } from "../src/lib/diagnosis/diagnose.ts";
import { AXIS_LABELS } from "../src/lib/diagnosis/items.ts";
import type { Memo, Signal } from "../src/lib/diagnosis/types.ts";

const SIGNAL_TEXT: Record<Signal, string> = {
  good: "● 좋아요",
  improve: "▲ 조금 더",
  fix: "■ 고쳐요",
};

const [path, flag] = process.argv.slice(2);
if (!path) {
  console.error("Usage: npm run diagnose -- <memo.json> [--raw]");
  process.exit(1);
}

const memo: Memo = JSON.parse(await readFile(path, "utf8"));
const started = Date.now();
const report = await diagnose(memo);
const seconds = Math.round((Date.now() - started) / 1000);

if (flag === "--raw") {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`\n총평: ${report.summary}\n`);
console.log("이런 점이 좋아요");
for (const s of report.strengths) console.log(`- ${s.text}`);

console.log("\n가장 먼저 고칠 점");
report.topFixes.forEach((item, i) => {
  console.log(`${i + 1}. [${AXIS_LABELS[item.axis]}] ${item.label}: ${item.comment}`);
  if (item.direction) console.log(`   방향: ${item.direction}`);
});

console.log("\n설정 정리");
for (const c of report.setting.characters) console.log(`- 인물 ${c.name}: ${c.role} / ${c.want}`);
for (const r of report.setting.rules) console.log(`- 규칙: ${r.text}`);
for (const d of report.setting.dropped) console.log(`- 버린 설정: ${d.text}`);
for (const c of report.setting.conflicts) console.log(`- 어긋남: ${c.text}`);

console.log("\n항목별 신호등");
for (const item of report.items) {
  const answers = item.answers.map((a) => `${a.question_id}=${a.answer}`).join(", ");
  console.log(`${SIGNAL_TEXT[item.signal]}  ${item.label}  (${answers})`);
}

console.log("\n참고작");
for (const r of report.references) {
  console.log(`- ${r.work}: ${r.overlaps.map((o) => o.text).join(" / ") || "겹침 없음"}`);
}
console.log(`\n(${seconds}초, 원문에 없어 버린 인용 ${report.droppedQuotes}개)`);
