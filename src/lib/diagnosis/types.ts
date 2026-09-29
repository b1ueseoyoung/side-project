import type { Axis } from "./items.ts";

export type Character = { name: string; role: string; want: string };

export type Manuscript = {
  genre: string;
  logline: string;
  synopsis: string;
  characters: Character[];
  /** Scripts for episodes 1-3, as pasted text. */
  episodes: [string, string, string];
};

export type Source =
  | "logline"
  | "synopsis"
  | "characters"
  | "episode1"
  | "episode2"
  | "episode3";

export type Evidence = {
  source: Source;
  /** Scene label as written in the script (e.g. "#3"), or "" for plan documents. */
  scene: string;
  /** Verbatim quote from the input. */
  quote: string;
};

/** Raw model output, validated against the JSON schema in prompt.ts. */
export type ModelOutput = {
  answers: {
    question_id: string;
    answer: "yes" | "no";
    reason: string;
    evidence: Evidence[];
  }[];
  items: { item_id: string; comment: string; direction: string }[];
  summary: string;
  strengths: { text: string; evidence: Evidence }[];
};

export type Signal = "good" | "improve" | "fix";

export type ItemResult = {
  id: string;
  axis: Axis;
  label: string;
  signal: Signal;
  answers: ModelOutput["answers"];
  comment: string;
  direction: string;
};

export type Report = {
  summary: string;
  strengths: ModelOutput["strengths"];
  topFixes: ItemResult[];
  items: ItemResult[];
  unavailable: { id: string; axis: Axis; label: string; reason: string }[];
};
