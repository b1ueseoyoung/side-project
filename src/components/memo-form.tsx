"use client";

import { GENRES, MAX_MEMO_LENGTH, MAX_REFERENCES_LENGTH } from "@/lib/diagnosis/validate";
import type { Memo } from "@/lib/diagnosis/types";
import playSample from "../../samples/02-play-assignment.json";
import webtoonSample from "../../samples/01-memory-empress.json";
import { enter, field, primaryButton, textButton } from "./styles";

export const EMPTY_MEMO: Memo = { genre: "", memo: "", references: "" };

type Props = {
  value: Memo;
  onChange: (m: Memo) => void;
  onSubmit: () => void;
  error: string | null;
};

export function MemoForm({ value: m, onChange, onSubmit, error }: Props) {
  const over = m.memo.length > MAX_MEMO_LENGTH;

  return (
    <form
      className={`flex flex-col gap-10 ${enter}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold">장르</legend>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <label
              key={g}
              className={`press cursor-pointer rounded-sm border px-3.5 py-2 text-sm transition-colors duration-(--duration-fast) has-focus-visible:outline-2 has-focus-visible:outline-foreground ${
                m.genre === g ? "border-foreground bg-surface font-semibold" : "border-border hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="genre"
                value={g}
                checked={m.genre === g}
                onChange={() => onChange({ ...m, genre: g })}
                className="sr-only"
              />
              {g}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="memo" className="text-lg font-semibold">
            기획 메모
          </label>
          <span className="flex gap-4">
            <button type="button" className={textButton} onClick={() => onChange(webtoonSample as Memo)}>
              웹툰 샘플
            </button>
            <button type="button" className={textButton} onClick={() => onChange(playSample as Memo)}>
              형식 예시 샘플
            </button>
          </span>
        </div>
        <p className="text-sm text-muted">
          정리하지 않은 그대로 붙여넣어 주세요. 설정, 줄거리 구상, 인물 메모, 장면이나 대사 조각, 받은 피드백이
          섞여 있어도 괜찮아요. 버린 설정은 &quot;삭제&quot;, &quot;바꿈&quot;처럼 적어 두면 더 정확하게 정리해요.
        </p>
        <textarea
          id="memo"
          rows={20}
          value={m.memo}
          onChange={(e) => onChange({ ...m, memo: e.target.value })}
          placeholder={"전제 : 회귀할 때마다 기억을 하나씩 잃는다\n주인공 리엔 - 처형당한 황녀. 배신자를 찾고 싶다\n1화는 처형장에서 시작?\n..."}
          className={field}
        />
        <p className={`self-end text-sm tabular-nums ${over ? "font-semibold" : "text-muted"}`}>
          {m.memo.length.toLocaleString()} / {MAX_MEMO_LENGTH.toLocaleString()}자{over && " · 너무 길어요"}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="references" className="text-lg font-semibold">
          참고작 <span className="text-sm font-normal text-muted">선택</span>
        </label>
        <p className="text-sm text-muted">
          메모에 적지 않은 참고작이 있으면 적어 주세요. 여기와 메모에 적힌 작품하고만 겹치는 부분을 봐요.
        </p>
        <input
          id="references"
          value={m.references}
          maxLength={MAX_REFERENCES_LENGTH}
          onChange={(e) => onChange({ ...m, references: e.target.value })}
          placeholder="카우보이 비밥 「가니메데 비가」, 사무라이 참프루 11화"
          className={field}
        />
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
        {error && (
          <p role="alert" className={`text-sm font-semibold ${enter}`}>
            {error}
          </p>
        )}
        <div>
          <button type="submit" className={primaryButton}>
            진단 받기
          </button>
        </div>
      </div>
      <p className="-mt-6 text-sm text-muted">
        진단은 이 컴퓨터의 Claude Code로 실행되고, 메모와 결과는 로그인한 두 사람만 볼 수 있는 곳에 저장돼요.
      </p>
    </form>
  );
}
