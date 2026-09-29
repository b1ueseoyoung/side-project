// Diagnosis items and yes/no questions. Draft from the feature design doc
// (2단계 표); unverified hypotheses until reviewed with experts.

export type Axis = "character" | "commercial" | "craft";

export const AXIS_LABELS: Record<Axis, string> = {
  character: "캐릭터",
  commercial: "상업성",
  craft: "작법·연출",
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
    id: "desire_lack",
    axis: "character",
    label: "욕망과 결핍",
    questions: [
      { id: "desire_lack.want", text: "1화 안에 주인공이 원하는 것이 대사나 행동으로 드러나는가?" },
      { id: "desire_lack.lack", text: "1화 안에 주인공에게 부족하거나 잃은 것이 드러나는가?" },
    ],
  },
  {
    id: "motivation",
    axis: "character",
    label: "행동 동기",
    questions: [
      { id: "motivation.reason", text: "시놉시스의 주요 선택마다 그 이유가 앞선 사건이나 인물 설정에 나와 있는가?" },
    ],
  },
  {
    id: "supporting",
    axis: "character",
    label: "조연 구분",
    questions: [
      { id: "supporting.role", text: "주요 조연마다 이야기에서 맡은 역할이 서로 다른가?" },
      { id: "supporting.voice", text: "조연끼리 말투가 구분되는가?" },
    ],
  },
  {
    id: "logline_hook",
    axis: "commercial",
    label: "로그라인 훅",
    questions: [
      { id: "logline_hook.parts", text: "로그라인에 주인공, 목표, 방해 요소가 모두 있는가?" },
    ],
  },
  {
    id: "longevity",
    axis: "commercial",
    label: "연재 지속성",
    questions: [
      { id: "longevity.next", text: "시놉시스에 첫 목표가 해결된 뒤에도 이어질 갈등이나 목표가 있는가?" },
    ],
  },
  {
    id: "opening",
    axis: "craft",
    label: "1화 도입",
    questions: [
      { id: "opening.event", text: "1화 첫 장면이 설명이 아닌 사건이나 대화로 시작하는가?" },
    ],
  },
  {
    id: "ep3_ending",
    axis: "craft",
    label: "3화 엔딩",
    questions: [
      { id: "ep3_ending.hook", text: "3화 마지막 장면에 해결되지 않은 질문이나 새 갈등이 있는가?" },
    ],
  },
  {
    id: "info_load",
    axis: "craft",
    label: "정보량",
    questions: [
      { id: "info_load.balance", text: "1화에서 설정 설명 분량이 장면(대화, 행동)보다 적은가?" },
    ],
  },
  {
    id: "dialogue",
    axis: "craft",
    label: "대사량",
    questions: [
      { id: "dialogue.exposition", text: "인물끼리 이미 아는 정보를 독자에게 알려주려고 말하는 대사가 없는가?" },
    ],
  },
];

export const UNAVAILABLE_ITEMS: UnavailableItem[] = [
  { id: "first_appearance", axis: "character", label: "첫 등장", reason: "완성 원고가 있어야 판정할 수 있어요." },
  { id: "genre_fit", axis: "commercial", label: "장르 적합성", reason: "플랫폼별 작품 데이터를 확보한 뒤에 판정해요." },
  { id: "originality", axis: "commercial", label: "차별점", reason: "비교할 작품 데이터가 없어 아직 판정하지 않아요." },
  { id: "scroll_rhythm", axis: "craft", label: "스크롤 호흡", reason: "완성 원고가 있어야 판정할 수 있어요." },
];

export const ALL_QUESTIONS = JUDGED_ITEMS.flatMap((item) => item.questions);
