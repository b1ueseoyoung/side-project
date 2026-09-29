import type { Manuscript } from "./types.ts";

export const GENRES = ["로판", "현판", "판타지", "무협", "로맨스", "학원", "스릴러", "드라마", "BL", "GL", "기타"];

export const MAX_CHARACTERS = 5;

// Keeps the request well under the server action body limit (1MB).
export const MAX_EPISODE_LENGTH = 30_000;

/** Returns a message for the first problem found, or null when the input is complete. */
export function validateManuscript(m: Manuscript): string | null {
  if (!GENRES.includes(m.genre)) return "장르를 골라주세요.";
  if (!m.logline.trim()) return "로그라인을 써주세요.";
  if (!m.synopsis.trim()) return "시놉시스를 써주세요.";
  const named = m.characters.filter((c) => c.name.trim());
  if (named.length === 0) return "캐릭터를 한 명 이상 써주세요.";
  if (m.characters.length > MAX_CHARACTERS) return `캐릭터는 ${MAX_CHARACTERS}명까지 쓸 수 있어요.`;
  for (let i = 0; i < 3; i++) {
    const text = m.episodes[i] ?? "";
    if (!text.trim()) return `${i + 1}화 대본을 붙여넣어 주세요.`;
    if (text.length > MAX_EPISODE_LENGTH) {
      return `${i + 1}화 대본이 너무 길어요. ${MAX_EPISODE_LENGTH.toLocaleString()}자 안으로 줄여주세요.`;
    }
  }
  return null;
}
