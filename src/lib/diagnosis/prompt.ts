import { ALL_QUESTIONS, JUDGED_ITEMS } from "./items.ts";
import type { Manuscript } from "./types.ts";

export const SYSTEM_PROMPT = `너는 웹툰 편집자처럼 투고 전 원고를 읽고 정해진 질문에 답하는 진단자다.

규칙:
- 질문마다 원고만 근거로 "yes" 또는 "no"로 답한다. 짐작으로 채우지 않는다. 판단할 근거가 원고에 없으면 "no"다.
- evidence의 quote는 입력에서 글자 그대로 옮긴다. 고치거나 요약하지 않는다.
- "yes"라고 답하려면 그 답을 뒷받침하는 인용을 하나 이상 붙인다. 질문이 "~가 없는가?"처럼 없음을 묻는 경우에는 인용 없이 "yes"라고 답할 수 있다.
- "no"라고 답할 때는 문제가 드러나는 인용이 있으면 붙인다.
- 대본의 장면 번호(예: "#3")가 있으면 scene에 적는다. 기획서 항목이면 scene은 빈 문자열이다.
- reason은 왜 그렇게 답했는지 한두 문장으로 쓴다.
- items의 comment는 항목 판정을 한 문장으로 요약한다. direction은 고칠 방향을 "~해보면 어떨까요"처럼 제안만 한다. 대사나 장면을 대신 써주지 않는다. 문제가 없는 항목의 direction은 빈 문자열이다.
- summary는 원고 전체에 대한 한 줄 총평이다.
- strengths는 구체적인 장점 2~3개다. 칭찬할 부분은 원고에서 인용한다.
- 합격 가능성이나 점수를 말하지 않는다.
- 모든 글은 한국어 존댓말(~요)로 쓴다.`;

export function buildPrompt(m: Manuscript): string {
  const characters = m.characters
    .map((c) => `- ${c.name} / 역할: ${c.role} / 원하는 것: ${c.want}`)
    .join("\n");
  const questions = JUDGED_ITEMS.map(
    (item) =>
      `${item.id} (${item.label})\n` +
      item.questions.map((q) => `  - ${q.id}: ${q.text}`).join("\n"),
  ).join("\n");

  return `아래 원고를 읽고 모든 질문에 답하세요.

<genre>${m.genre}</genre>

<logline>
${m.logline}
</logline>

<synopsis>
${m.synopsis}
</synopsis>

<characters>
${characters}
</characters>

<episode1>
${m.episodes[0]}
</episode1>

<episode2>
${m.episodes[1]}
</episode2>

<episode3>
${m.episodes[2]}
</episode3>

<questions>
${questions}
</questions>`;
}

const evidenceSchema = {
  type: "object",
  properties: {
    source: {
      type: "string",
      enum: ["logline", "synopsis", "characters", "episode1", "episode2", "episode3"],
    },
    scene: { type: "string" },
    quote: { type: "string" },
  },
  required: ["source", "scene", "quote"],
  additionalProperties: false,
};

export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_id: { type: "string", enum: ALL_QUESTIONS.map((q) => q.id) },
          answer: { type: "string", enum: ["yes", "no"] },
          reason: { type: "string" },
          evidence: { type: "array", items: evidenceSchema },
        },
        required: ["question_id", "answer", "reason", "evidence"],
        additionalProperties: false,
      },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item_id: { type: "string", enum: JUDGED_ITEMS.map((i) => i.id) },
          comment: { type: "string" },
          direction: { type: "string" },
        },
        required: ["item_id", "comment", "direction"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
    strengths: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, evidence: evidenceSchema },
        required: ["text", "evidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["answers", "items", "summary", "strengths"],
  additionalProperties: false,
};
