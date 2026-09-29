// Diagnosis items and yes/no questions for rough planning memos. Draft from
// the feature design doc (2단계 표); unverified hypotheses until reviewed.

export type Axis = "setting" | "commercial" | "character" | "craft";

export const AXIS_LABELS: Record<Axis, string> = {
  setting: "설정",
  commercial: "상업성",
  character: "캐릭터",
  craft: "작법",
};

export type Question = { id: string; text: string };

export type JudgedItem = {
  id: string;
  axis: Axis;
  label: string;
  questions: Question[];
};

export type UnavailableItem = {
  id: string;
  axis: Axis;
  label: string;
  reason: string;
};

// Every question is phrased so that "yes" is the good answer.
export const JUDGED_ITEMS: JudgedItem[] = [
  {
    id: "consistency",
    axis: "setting",
    label: "설정 일관성",
    questions: [{ id: "consistency.no_conflict", text: "메모 안에서 서로 어긋나는 설정이 없는가?" }],
  },
  {
    id: "core_rules",
    axis: "setting",
    label: "핵심 규칙",
    questions: [
      { id: "core_rules.stated", text: "세계의 핵심 규칙(능력, 대가, 제약)이 분명히 적혀 있는가?" },
    ],
  },
  {
    id: "versions",
    axis: "setting",
    label: "버전 정리",
    questions: [{ id: "versions.separated", text: "버리거나 바꾼 설정과 최종안이 구분되는가?" }],
  },
  {
    id: "logline_hook",
    axis: "commercial",
    label: "로그라인 훅",
    questions: [
      {
        id: "logline_hook.parts",
        text: "주인공, 목표, 방해 요소를 한 문장으로 뽑을 수 있을 만큼 메모에 모두 있는가?",
      },
    ],
  },
  {
    id: "longevity",
    axis: "commercial",
    label: "연재 지속성",
    questions: [
      { id: "longevity.next", text: "첫 목표가 해결된 뒤에도 이어질 갈등이나 목표가 있는가?" },
    ],
  },
  {
    id: "desire_lack",
    axis: "character",
    label: "욕망과 결핍",
    questions: [
      { id: "desire_lack.want", text: "주인공이 원하는 것이 적혀 있는가?" },
      { id: "desire_lack.lack", text: "주인공에게 부족하거나 잃은 것이 적혀 있는가?" },
    ],
  },
  {
    id: "motivation",
    axis: "character",
    label: "행동 동기",
    questions: [{ id: "motivation.reason", text: "주요 인물의 중요한 선택마다 이유가 적혀 있는가?" }],
  },
  {
    id: "supporting",
    axis: "character",
    label: "조연 역할",
    questions: [
      { id: "supporting.role", text: "주요 조연마다 이야기에서 맡은 역할이 서로 다른가?" },
    ],
  },
  {
    id: "central_question",
    axis: "craft",
    label: "중심 질문",
    questions: [
      {
        id: "central_question.exists",
        text: "이야기 전체를 끌고 가는 하나의 질문(중심 갈등)이 있는가?",
      },
    ],
  },
  {
    id: "first_episode",
    axis: "craft",
    label: "첫 화 사건",
    questions: [
      { id: "first_episode.event", text: "첫 화에서 보여줄 사건이나 장면이 정해져 있는가?" },
    ],
  },
  {
    id: "turning_points",
    axis: "craft",
    label: "전환점 이유",
    questions: [
      {
        id: "turning_points.why",
        text: "주요 전환점(반전, 결말)마다 왜 그렇게 되는지가 적혀 있는가?",
      },
    ],
  },
  {
    id: "ending",
    axis: "craft",
    label: "결말 방향",
    questions: [
      { id: "ending.decided", text: "결말이나 이야기가 도달할 지점이 정해져 있는가?" },
    ],
  },
];

export const UNAVAILABLE_ITEMS: UnavailableItem[] = [
  {
    id: "genre_fit",
    axis: "commercial",
    label: "장르 적합성",
    reason: "플랫폼별 작품 데이터를 확보한 뒤에 판정해요.",
  },
  {
    id: "originality",
    axis: "commercial",
    label: "흔한 설정 대비 차별점",
    reason: "비교할 작품 데이터가 없어 아직 판정하지 않아요.",
  },
];

export const ALL_QUESTIONS = JUDGED_ITEMS.flatMap((item) => item.questions);
