import type { Axis } from "./items.ts";

/** What the writer pastes: a rough planning memo in any shape. */
export type Memo = {
  genre: string;
  memo: string;
  /** Works the writer names as references, if not already in the memo. */
  references: string;
};

/** A verbatim quote from the memo. */
export type Evidence = { quote: string };

type Answer = {
  question_id: string;
  answer: "yes" | "no";
  reason: string;
  evidence: Evidence[];
};

type Noted = { text: string; evidence: Evidence[] };

/** Raw model output, validated against the JSON schema in prompt.ts. */
export type ModelOutput = {
  setting: {
    characters: { name: string; role: string; want: string; evidence: Evidence[] }[];
    rules: Noted[];
    events: Noted[];
    dropped: Noted[];
    conflicts: Noted[];
  };
  references: { work: string; evidence: Evidence[]; overlaps: Noted[] }[];
  answers: Answer[];
  items: { item_id: string; comment: string; direction: string }[];
  summary: string;
  strengths: Noted[];
};

export type Signal = "good" | "improve" | "fix";

export type ItemResult = {
  id: string;
  axis: Axis;
  label: string;
  signal: Signal;
  answers: Answer[];
  comment: string;
  direction: string;
};

export type Setting = ModelOutput["setting"];
export type ReferenceNote = ModelOutput["references"][number];

export type Report = {
  summary: string;
  strengths: Noted[];
  topFixes: ItemResult[];
  setting: Setting;
  items: ItemResult[];
  references: ReferenceNote[];
  unavailable: { id: string; axis: Axis; label: string; reason: string }[];
  /** How many model quotes were dropped because they were not in the memo. */
  droppedQuotes: number;
};
