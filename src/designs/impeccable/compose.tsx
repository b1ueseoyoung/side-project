"use client";

import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Memo } from "@/lib/diagnosis/types";
import { GENRES, MAX_MEMO_LENGTH, MAX_REFERENCES_LENGTH } from "@/lib/diagnosis/validate";
import webtoonSample from "../../../samples/01-memory-empress.json";
import playSample from "../../../samples/02-play-assignment.json";
import { useDiagnosisFlow, useElapsed, useHydrated } from "../shared/flow";
import { GenreTag, Shell } from "./chrome";

const INVALID_MESSAGE = "장르를 골라주세요.";
// gpt-6-luna at max effort: median 305 s over 8 eval runs; two runs took about 20 minutes.
const TYPICAL_MINUTES = 6;

export function Compose({ signOut }: { signOut: boolean }) {
  const hydrated = useHydrated();
  return (
    <Shell current="new" signOut={signOut}>
      {hydrated ? <Flow /> : <main className="flex-1" aria-busy="true" />}
    </Shell>
  );
}

function Flow() {
  const flow = useDiagnosisFlow();
  if (flow.startedAt !== null) return <Running startedAt={flow.startedAt} memo={flow.memo} />;
  return <Form memo={flow.memo} onChange={flow.setMemo} onSubmit={flow.submit} error={flow.error} />;
}


const columns = "flex flex-1 flex-col lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-10 lg:py-10";
const aside = "flex flex-col gap-8 px-4 pt-8 sm:px-6 lg:sticky lg:top-23 lg:px-0 lg:pt-0";
const paper = "paper mx-4 mt-8 flex flex-col sm:mx-6 lg:mx-0 lg:mt-0 lg:min-h-[calc(100dvh-8.25rem)]";
const genreChip =
  "type-ui cursor-pointer rounded-full border border-input bg-card px-3.5 py-1.5 transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring";

type FormProps = { memo: Memo; onChange: (m: Memo) => void; onSubmit: () => void; error: string | null };

function Form({ memo, onChange, onSubmit, error }: FormProps) {
  const over = memo.memo.length > MAX_MEMO_LENGTH;
  const genreInvalid = error === INVALID_MESSAGE;

  return (
    <form
      className={columns}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className={aside}>
        <div className="flex flex-col gap-2">
          <h1 className="type-page">새 진단</h1>
          <p className="type-body text-ink-soft">
            러프한 기획 메모를 붙여넣으면 설정을 정리하고, 개성과 상업성, 캐릭터, 서사, 웹툰 연재 작법을 편집자 눈높이로 봐서 가장
            먼저 손볼 점을 알려드려요.
          </p>
        </div>

        <div role="radiogroup" aria-labelledby="genre-label" aria-invalid={genreInvalid || undefined}>
          <p id="genre-label" className="type-ui mb-3">
            장르
          </p>
          <div
            className={`-m-1 flex flex-wrap gap-2 rounded-lg p-1 ${genreInvalid ? "outline-2 outline-offset-2 outline-destructive" : ""}`}
          >
            {GENRES.map((g) => (
              <label key={g} className={genreChip}>
                <input
                  type="radio"
                  name="genre"
                  value={g}
                  checked={memo.genre === g}
                  onChange={() => onChange({ ...memo, genre: g })}
                  className="sr-only"
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="references" className="type-ui flex items-center gap-2">
            참고작 <span className="type-meta text-muted-foreground">선택</span>
          </label>
          <p className="type-meta text-muted-foreground">
            메모에 적지 않은 참고작이 있으면 적어 주세요. 여기와 메모에 적힌 작품하고만 겹치는 부분을 봐요.
          </p>
          <Input
            id="references"
            value={memo.references}
            maxLength={MAX_REFERENCES_LENGTH}
            onChange={(e) => onChange({ ...memo, references: e.target.value })}
            placeholder="카우보이 비밥 「가니메데 비가」, 사무라이 참프루 11화"
            className="h-10 bg-card px-3 text-base md:text-base"
          />
        </div>

        <div className="hidden lg:flex lg:flex-col lg:gap-4">
          <Submit error={error} />
          <PrivacyNote />
        </div>
      </div>

      <section className={`${paper} has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring`}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 sm:px-10 sm:pt-8">
          <label htmlFor="memo" className="type-section">
            기획 메모
          </label>
          <span className="flex gap-2">
            <Button type="button" variant="secondary" className="type-ui" onClick={() => onChange(webtoonSample as Memo)}>
              웹툰 샘플
            </Button>
            <Button type="button" variant="secondary" className="type-ui" onClick={() => onChange(playSample as Memo)}>
              형식 예시 샘플
            </Button>
          </span>
        </div>
        <p className="type-meta mt-2 px-6 text-muted-foreground sm:px-10">
          정리하지 않은 그대로 붙여넣어 주세요. 설정, 줄거리 구상, 인물 메모, 장면이나 대사 조각, 받은 피드백이 섞여 있어도
          괜찮아요. 버린 설정은 &quot;삭제&quot;, &quot;바꿈&quot;처럼 적어 두면 더 정확하게 정리해요.
        </p>
        <Textarea
          id="memo"
          rows={18}
          value={memo.memo}
          onChange={(e) => onChange({ ...memo, memo: e.target.value })}
          placeholder={"전제 : 회귀할 때마다 기억을 하나씩 잃는다\n주인공 리엔 - 처형당한 황녀. 배신자를 찾고 싶다\n1화는 처형장에서 시작?\n..."}
          className="type-body mt-4 min-h-96 flex-1 resize-none rounded-none border-0 bg-transparent px-6 py-2 leading-6 focus-visible:ring-0 sm:px-10 md:text-base"
        />
        <p
          className={`type-meta self-end px-6 pt-2 pb-5 tabular-nums sm:px-10 ${over ? "font-semibold text-destructive" : "text-muted-foreground"}`}
        >
          {memo.memo.length.toLocaleString()} / {MAX_MEMO_LENGTH.toLocaleString()}자{over && " · 너무 길어요"}
        </p>
      </section>

      <div className="px-4 pt-6 sm:px-6 lg:hidden">
        <PrivacyNote />
      </div>
      <div className="sticky bottom-0 mt-4 flex flex-col gap-3 border-t border-border bg-background px-4 pt-3 pb-3 sm:px-6 lg:hidden">
        <Submit error={error} />
      </div>
    </form>
  );
}

function Submit({ error }: { error: string | null }) {
  return (
    <>
      {error && (
        <Alert variant="destructive" className="border-destructive/30">
          <AlertCircleIcon />
          <AlertTitle className="type-ui">{error}</AlertTitle>
        </Alert>
      )}
      <Button type="submit" size="lg" className="type-ui h-12 w-full">
        진단 받기
      </Button>
    </>
  );
}

function PrivacyNote() {
  return (
    <p className="type-meta text-muted-foreground">
      메모는 진단을 위해 OpenAI API로 보내지고 OpenAI에도 일정 기간 남아요. 메모와 결과는 내 계정에서만 볼 수 있어요.
    </p>
  );
}

function Running({ startedAt, memo }: { startedAt: number; memo: Memo }) {
  const { seconds, clock } = useElapsed(startedAt);
  return (
    <main className={columns}>
      <div className={aside} role="status">
        <div className="flex flex-col gap-2">
          <h1 className="type-page">원고를 읽고 있어요</h1>
          <p className="type-page text-primary tabular-nums">{clock}</p>
          <p className="type-body text-ink-soft">
            {seconds <= TYPICAL_MINUTES * 60 ? `보통 ${TYPICAL_MINUTES}분쯤 걸려요.` : "원고가 길면 조금 더 걸릴 수 있어요."}
          </p>
        </div>
        <p className="type-ui flex items-center gap-2 text-muted-foreground">
          <Spinner aria-hidden role={undefined} aria-label={undefined} />
          10초마다 결과를 확인해요
        </p>
        <p className="type-meta text-muted-foreground">
          이 창을 닫아도 진단은 계속돼요. 새 진단 화면을 다시 열면 결과를 이어서 받아요.
        </p>
      </div>

      <section className={`${paper} mb-10 px-6 py-6 sm:px-10 sm:py-8`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="type-section">기획 메모</h2>
          {memo.genre && <GenreTag>{memo.genre}</GenreTag>}
        </div>
        {memo.references && <p className="type-meta mt-2 text-muted-foreground">참고작: {memo.references}</p>}
        <p className="type-manuscript mt-6 text-ink-soft">{memo.memo}</p>
      </section>
    </main>
  );
}
