# 기획 메모 진단

웹툰·만화 작가가 러프하게 쓴 기획 메모를 붙여넣으면 설정을 정리하고, 상업성(개성, 장르 재미)·캐릭터·서사·웹툰 연재 작법과 참고작 겹침을 진단해 가장 먼저 손볼 점을 알려주는 도구. 투고를 준비하는 지망생이 작품이 얼마나 개성 있고 팔릴 만한지 편집자 눈높이로 조언받는 데 쓴다. 작성자와 친구 한 명, 두 사람만 쓴다.

- 진단 결과는 합격 확률 같은 숫자가 아니라 신호등과 근거(메모 속 문장 인용)로 보여준다.
- 모델이 붙인 인용은 코드에서 메모 원문과 대조하고, 원문에 없는 인용은 버린다. 근거가 모두 버려진 "예" 답은 "아니오"로 바꾼다.
- 설정이나 줄거리를 대신 지어주지 않고, 문제와 방향만 짚는다.
- 표절은 판정하지 않는다. 작가가 직접 적은 참고작과 겹치는 부분만 참고로 보여준다.
- 개성과 장르 재미는 작품 데이터와 비교한 결과가 아니라, 모델이 장르의 흔한 설정 유형(회귀, 빙의 등)을 기준으로 판단한 것이다. 다른 작품 이름은 대지 않는다.

## 기능

| 기능 | 내용 |
| --- | --- |
| 설정 정리 | 인물, 세계 규칙, 사건 순서, 어긋나는 설정, 버리거나 바꾼 설정을 메모 인용과 함께 정리 |
| 설정 | 설정 일관성, 핵심 규칙, 버전 정리 |
| 상업성 | 로그라인 훅, 연재 지속성, 장르 재미, 개성, 셀링 포인트 |
| 캐릭터 | 욕망과 결핍, 행동 동기, 조연 역할, 주인공 매력, 인물 변화 |
| 서사 | 중심 질문, 갈등의 크기, 전환점 이유, 결말 방향, 주제 일관성 |
| 웹툰 연재 | 첫 화 사건, 초반 전개, 회차 끝 긴장, 설명 분산 |
| 참고작 겹침 | 작가가 적은 참고작마다 겹쳐 보이는 요소 (신호등 없음) |

리포트는 총평 → 좋은 점 → 가장 먼저 고칠 3가지 → 설정 정리 → 항목별 신호등 → 참고작 겹침 순서다. 질문과 신호등 규칙은 검증되지 않은 초안이다.

## 구조

- Next.js 16 (App Router, TypeScript, Tailwind CSS 4). 디자인 규칙은 [DESIGN.md](DESIGN.md).
- **진단은 작성자의 맥에서만** 실행한다. 로컬에 설치된 Claude Code를 `claude -p`로 부르며(`src/lib/llm.ts`), 본인 구독 로그인이라 다른 사람의 진단에 쓰지 않는다.
- **배포 앱(Vercel)** 은 저장된 리포트를 두 사람이 보는 곳이다. 진단 기능은 `APP_MODE=local`이고 Vercel이 아닐 때만 켜진다(`src/lib/env.ts`).
- DB는 Neon Postgres + Drizzle ORM(`src/db/`). 맥의 로컬 앱과 배포 앱이 같은 DB를 쓴다.
- 로그인은 이메일 링크(better-auth). `ALLOWED_EMAILS`에 있는 주소만 링크를 받는다. 데이터 접근은 모두 `src/lib/dal.ts`에서 로그인을 확인한 뒤 한다.

## 맥에서 실행 (진단)

Claude Code가 설치되어 있고 로그인된 상태여야 한다.

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, ALLOWED_EMAILS, OWNER_EMAIL, APP_MODE=local 채우기
npm run db:migrate           # 처음 한 번, 테이블 만들기
npm run dev                  # 브라우저가 자동으로 열린다
```

로컬 앱은 `127.0.0.1`에서만 열리고 로그인 없이 작성자로 동작한다. 명령줄로 샘플을 진단하려면 `npm run diagnose -- samples/02-play-assignment.json`.

## 배포 (Vercel)

1. Vercel에 저장소를 연결하고, Storage에서 Neon Postgres를 만들어 연결한다(`DATABASE_URL`이 자동으로 들어간다).
2. 환경변수: `ALLOWED_EMAILS`, `OWNER_EMAIL`, `BETTER_AUTH_SECRET`(`openssl rand -base64 32`), `BETTER_AUTH_URL`(배포 주소), `SMTP_URL`, `SMTP_FROM`. `APP_MODE`는 넣지 않는다.
3. 맥의 `.env.local`에 같은 `DATABASE_URL`을 넣고 `npm run db:migrate`.

로그인 메일은 SMTP로 보낸다. Gmail 앱 비밀번호를 쓰면 친구에게도 보낼 수 있다(Resend 무료 발신 주소는 가입자 본인에게만 보낸다).

## 설계 문서

- [기능 설계](https://claude.ai/code/artifact/fa81e68b-c6be-48c7-aa96-fff9fc7335de)
- [UI/UX 설계](https://claude.ai/code/artifact/476f5ce7-376b-4869-94cf-bb38d418c8a5)
