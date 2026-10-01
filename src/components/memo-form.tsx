"use client";

import { GENRES, MAX_MEMO_LENGTH, MAX_REFERENCES_LENGTH } from "@/lib/diagnosis/validate";
import type { Memo } from "@/lib/diagnosis/types";
import playSample from "../../samples/02-play-assignment.json";
import webtoonSample from "../../samples/01-memory-empress.json";
import { card, enter, field, primaryButton, tag } from "./styles";

export const EMPTY_MEMO: Memo = { genre: "", memo: "", references: "" };

const sampleButton =
  "press inline-flex h-8 items-center rounded-full bg-fill px-3 text-xs font-semibold text-secondary hover:bg-fill-strong";

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
      className={`flex flex-col gap-4 ${enter}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <section className={`${card} p-5 sm:p-6`}>
        <fieldset>
          <legend className="mb-4 text-lg font-bold tracking-tight">장르</legend>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <label
                key={g}
                className={`press cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
                  m.genre === g
                    ? "border-foreground bg-foreground text-surface"
                    : "border-border bg-surface text-secondary hover:bg-fill"
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
      </section>

      <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="memo" className="text-lg font-bold tracking-tight">
            기획 메모
          </label>
          <span className="flex gap-2">
            <button type="button" className={sampleButton} onClick={() => onChange(webtoonSample as Memo)}>
              웹툰 샘플
            </button>
            <button type="button" className={sampleButton} onClick={() => onChange(playSample as Memo)}>
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
          rows={16}
          value={m.memo}
          onChange={(e) => onChange({ ...m, memo: e.target.value })}
          placeholder={"전제 : 회귀할 때마다 기억을 하나씩 잃는다\n주인공 리엔 - 처형당한 황녀. 배신자를 찾고 싶다\n1화는 처형장에서 시작?\n..."}
          className={`${field} mt-1 resize-y leading-relaxed`}
        />
        <p
          className={`self-end text-sm tabular-nums ${over ? "font-semibold text-signal-fix" : "text-muted"}`}
        >
          {m.memo.length.toLocaleString()} / {MAX_MEMO_LENGTH.toLocaleString()}자{over && " · 너무 길어요"}
        </p>
      </section>

      <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
        <label htmlFor="references" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          참고작 <span className={tag}>선택</span>
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
          className={`${field} mt-1`}
        />
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-border bg-surface px-4 py-3 sm:static sm:mx-0 sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0">
        {error && (
          <p
            role="alert"
            className={`rounded-md bg-signal-fix-soft px-4 py-3 text-sm font-semibold text-signal-fix ${enter}`}
          >
            {error}
          </p>
        )}
        <button type="submit" className={`${primaryButton} w-full sm:w-auto sm:self-start`}>
          진단 받기
        </button>
      </div>
      <p className="text-sm text-muted">
        메모는 진단을 위해 OpenAI API로 보내지고 OpenAI에도 일정 기간 남아요. 메모와 결과는 내 계정에서만 볼 수 있어요.
      </p>
    </form>
  );
}
