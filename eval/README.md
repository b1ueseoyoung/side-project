# 판정 품질 평가

기획 메모 진단의 판정 품질을 합성 메모로 재는 도구다. 기준은 [CRITERIA.md](CRITERIA.md)에 있다.

## 폴더

| 경로 | 내용 |
| --- | --- |
| `eval/samples/*.json` | 모델 입력. 앱이 받는 장르, 메모, 참고작만 있다 |
| `eval/labels/*.json` | 사람 검토 전 임시 라벨. 모델에는 넣지 않는다 |
| `eval/results/<실행 시각>/` | 실행 결과. 리포트 DB에는 넣지 않는다 |
| `scripts/eval/run.mts` | 실행기. 앱과 같은 진단 경로(`diagnoseDetailed`)를 부른다 |
| `scripts/eval/score.mts` | 채점기. 모델을 부르지 않는다 |
| `scripts/eval/lib.ts`, `lib.test.ts` | 집계 로직과 그 테스트 |

## 실행 방법

```bash
# 1. 집계 로직 테스트 (모델 호출 없음)
bun run test:eval

# 2. 드라이런: 가짜 응답으로 저장과 집계만 확인 (모델 호출 없음, 임시 폴더에 저장)
bun run eval -- --dry-run --repeat 3
bun run eval:score -- <출력된 폴더>

# 3. 실제 실행: 샘플 8개를 1회씩, 순차로 (모델 호출 8회)
bun run eval -- --samples all --repeat 1 --max-calls 8
bun run eval:score -- eval/results/<실행 시각>

# 반복 일관성: 같은 샘플을 3회씩 (모델 호출 24회라 상한을 직접 올려야 한다)
bun run eval -- --samples all --repeat 3 --max-calls 24
```

- 일부 샘플만 돌리려면 `--samples p1a,p1b`처럼 쓴다.
- 모델과 추론 강도는 앱과 같이 `OPENAI_MODEL`, `OPENAI_EFFORT`로 정해진다(기본값 `gpt-6-luna`, `max`). API 키는 `.env.local`의 `OPENAI_API_KEY`를 읽는다.
- `--max-calls`는 실제 과금 상한이다. 모델 호출 한 번이 곧 과금 한 번이다.
- 모델 호출이 실패하면 재시도하지 않고 멈춘다(종료 코드 2). 원인은 해당 실행의 `meta.json`에 있다.
- Claude 기준선은 `BASELINE-2026-09-30.md`에 남아 있다.

## 결과 파일

실행 하나(`eval/results/<실행 시각>/<샘플>/run-<회차>/`)마다 다음을 남긴다.

| 파일 | 내용 |
| --- | --- |
| `input.json` | 모델에 넣은 메모와 프롬프트 해시 |
| `model-output.json` | 모델 응답을 질문·항목 순서 배열로 바꾼 것(앱 후처리 전) |
| `api-response.json` | OpenAI Responses API 응답 본문에서 output을 뺀 것(usage 포함) |
| `report.json` | 앱 후처리를 거친 최종 리포트. 후처리가 거부하면 `null` |
| `postprocess.json` | 원문에 없는 인용, 후처리로 바뀐 답, 질문 누락·중복, 먼저 고칠 3가지 분석 |
| `meta.json` | 성공·실패 단계, 오류, 소요 시간, 모델 설정, 응답이 보고한 모델(`apiModel`), 응답 ID(`responseId`), 토큰 사용량(`usage`), 표준 요금 비용(`costUsd`) |

폴더 맨 위에는 `run-info.json`(설정, 프롬프트·규칙 해시, git 커밋)과 `runs.jsonl`(실행별 한 줄 요약)이 있다. 채점기를 돌리면 `summary.md`, `summary.json`, `review.csv`(사람 검토표)가 생긴다.

`scripts/diagnose.mts --raw`는 최종 리포트만 출력하고 모델 원본 응답은 내놓지 않는다. 원본 응답이 필요하면 이 도구를 쓴다.
