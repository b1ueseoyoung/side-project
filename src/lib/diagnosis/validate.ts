import type { Memo } from "./types.ts";

export const GENRES = ["로판", "현판", "판타지", "무협", "로맨스", "학원", "스릴러", "드라마", "BL", "GL", "기타"];

// Keeps the request well under the server action body limit (1MB).
export const MAX_MEMO_LENGTH = 40_000;
export const MAX_REFERENCES_LENGTH = 2_000;

/** Returns a message for the first problem found, or null when the input is complete. */
export function validateMemo(m: Memo): string | null {
  if (typeof m?.memo !== "string" || typeof m.references !== "string") return "입력이 올바르지 않아요.";
  if (!GENRES.includes(m.genre)) return "장르를 골라주세요.";
  if (!m.memo.trim()) return "기획 메모를 붙여넣어 주세요.";
  if (m.memo.length > MAX_MEMO_LENGTH) {
    return `메모가 너무 길어요. ${MAX_MEMO_LENGTH.toLocaleString()}자 안으로 줄여주세요.`;
  }
  if (m.references.length > MAX_REFERENCES_LENGTH) return "참고작은 짧게 적어주세요.";
  return null;
}
