// Diagnosis items and yes/no questions for rough planning memos. Draft from
// the feature design doc (2단계 표); unverified hypotheses until reviewed.

export type Axis = "setting" | "commercial" | "character" | "craft" | "webtoon";

export const AXIS_LABELS: Record<Axis, string> = {
  setting: "설정",
  commercial: "상업성",
  character: "캐릭터",
  craft: "서사",
  webtoon: "웹툰 연재",
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
    id: "genre_fit",
    axis: "commercial",
    label: "장르 재미",
    questions: [
      {
        id: "genre_fit.core_fun",
        text: "이 장르 독자가 기대하는 핵심 재미(예: 로판의 관계와 신분 변화, 현판의 성장과 보상, 스릴러의 긴장)가 이야기의 중심에 있는가?",
      },
    ],
  },
  {
    id: "originality",
    axis: "commercial",
    label: "개성",
    questions: [
      {
        id: "originality.twist",
        text: "같은 장르에 흔한 설정(예: 회귀, 빙의, 계약 관계) 위에 이 작품에만 있는 비틀기나 고유한 요소가 있는가?",
      },
    ],
  },
  {
    id: "selling_point",
    axis: "commercial",
    label: "셀링 포인트",
    questions: [
      {
        id: "selling_point.clear",
        text: "독자가 이 작품을 골라 볼 이유가 로그라인이나 설정에서 한눈에 드러나는가?",
      },
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
    id: "protagonist_appeal",
    axis: "character",
    label: "주인공 매력",
    questions: [
      {
        id: "protagonist_appeal.root",
        text: "주인공에게 독자가 응원하거나 계속 지켜보고 싶어질 매력(절실한 욕망, 분명한 태도나 개성)이 있는가?",
      },
    ],
  },
  {
    id: "arc",
    axis: "character",
    label: "인물 변화",
    questions: [
      { id: "arc.change", text: "주인공이 이야기를 거치며 달라지는 지점(생각, 관계, 목표의 변화)이 있는가?" },
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
    id: "stakes",
    axis: "craft",
    label: "갈등의 크기",
    questions: [
      { id: "stakes.cost", text: "목표를 가로막는 갈등이 충분히 크고, 실패했을 때 잃을 것이 분명한가?" },
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
  {
    id: "theme",
    axis: "craft",
    label: "주제 일관성",
    questions: [
      { id: "theme.coherent", text: "이야기가 전하려는 주제나 감정이 주요 사건과 결말에서 일관되게 드러나는가?" },
    ],
  },
  {
    id: "first_episode",
    axis: "webtoon",
    label: "첫 화 사건",
    questions: [
      { id: "first_episode.event", text: "첫 화에서 보여줄 사건이나 장면이 정해져 있는가?" },
    ],
  },
  {
    id: "early_pace",
    axis: "webtoon",
    label: "초반 전개",
    questions: [
      { id: "early_pace.goal_early", text: "1~3화 안에 주인공의 목표와 핵심 갈등이 드러나도록 짜여 있는가?" },
    ],
  },
  {
    id: "cliffhanger",
    axis: "webtoon",
    label: "회차 끝 긴장",
    questions: [
      {
        id: "cliffhanger.hooks",
        text: "회차를 끊을 만한 반전이나 궁금증(절단 지점)이 사건 흐름 곳곳에 있는가?",
      },
    ],
  },
  {
    id: "exposition",
    axis: "webtoon",
    label: "설명 분산",
    questions: [
      { id: "exposition.not_dumped", text: "세계관과 설정 설명이 초반 한두 장면에 몰려 있지 않은가?" },
    ],
  },
];

// Items that need data the app does not have yet. None right now; reports
// saved before genre fit and originality were judged still list them.
export const UNAVAILABLE_ITEMS: UnavailableItem[] = [];

export const ALL_QUESTIONS = JUDGED_ITEMS.flatMap((item) => item.questions);
