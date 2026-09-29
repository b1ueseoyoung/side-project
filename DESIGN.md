# 디자인 규칙

UI를 만들거나 고치기 전에 이 파일을 먼저 읽는다. AI가 만든 화면이 다 비슷해 보이는 이유는 아무도 결정하지 않은 기본값(Inter, 보라색 그라데이션, 둥근 카드 3개)을 그대로 쓰기 때문이다. 여기 적힌 결정이 기본값보다 우선한다.

**방향:** 회색 바탕 위의 흰 카드, 파란 강조색 하나. 또렷한 제품 화면이다. 위계는 굵기와 크기로 만들고, 화면마다 가장 먼저 읽을 것이 바로 보이게 한다.

2026-09-29에 개편했다. 이전 방향("원고 옆 연필 메모": 따뜻한 미색 바탕, 명조체, 여백으로만 구분)은 대비가 약하고 구조가 안 보여서 버렸다.

## 쓰지 않는 것

| 쓰지 않는 것 | 대신 |
| --- | --- |
| 보라·인디고 계열, 그라데이션 | `globals.css` 토큰 색만 쓴다. Tailwind 기본 팔레트는 지워 두었다(`text-white`도 없다. `text-on-accent`, `text-surface`를 쓴다) |
| 색 있는 그림자, glow, 글래스모피즘(`backdrop-blur`) | 면은 `background`(회색 바탕) → `surface`(흰 카드) → `fill`(카드 안 회색 칸) 세 단계로 나눈다 |
| 카드마다 테두리와 그림자 | 흰 카드는 회색 바탕과의 차이로만 뜬다. 카드 안에 카드를 또 둘 때만 `border-border` |
| 가운데 정렬 히어로 + 제목 위 배지 + 카드 3개 격자 | 왼쪽 정렬, 한 열로 읽는 흐름. 로그인과 빈 화면만 가운데 정렬 |
| 선택·강조를 표시하는 색 테두리(`border-l-4 border-accent` 등) | 선택은 채움(`bg-foreground`, `bg-accent-soft`)으로, 상태는 신호등 배지로 보여준다 |
| 명조체, 문장 안 한 단어만 다른 글꼴로 바꾸는 장식 | Pretendard 한 가족. 위계는 굵기와 크기로 |
| 이모지 아이콘 | `components/icons.tsx`의 SVG(Lucide 경로). 새 아이콘도 여기에 추가한다 |
| 숫자 통계 배너("13개 항목 분석!") | 숫자는 의미가 있을 때만 문장 안에 쓴다 |
| 스크롤하면 하나씩 떠오르는 효과, 바운스, `hover:scale-105` | 아래 "모션" |
| "AI가 분석했습니다", "✨", "강력한" 같은 문구 | 아래 "문구" |

## 색

토큰은 `globals.css`에 있고, 다크 모드 값도 같은 이름으로 있다.

| 토큰 | 라이트 | 쓰임 |
| --- | --- | --- |
| `background` | #f2f4f6 | 페이지 바탕 |
| `surface` / `surface-hover` | #ffffff / #f9fafb | 카드와 헤더 / 누를 수 있는 카드의 호버 |
| `fill` / `fill-strong` | #f2f4f6 / #e5e8eb | 카드 안 회색 칸(인용, 태그, 보조 버튼) / 그 호버 |
| `foreground` / `secondary` / `muted` | #191f28 / #4e5968 / #66707e | 본문 / 보조 본문 / 설명과 메타 정보 |
| `border` | #e5e8eb | 구분선, 입력칸 |
| `accent` / `accent-hover` | #2563eb / #1d4ed8 | 주 버튼, 로고. 흰 글자(`on-accent`)와 5.2:1 |
| `accent-ink` / `accent-soft` | #2563eb / #eaf1fe | 강조 글자 / "이렇게 고쳐보세요" 칸, 선택된 칸 |

- 글자색은 `muted`까지 `background`, `surface` 두 바탕에서 모두 4.5:1을 넘는다. 토큰을 바꾸면 다시 확인한다.
- 강조색은 한 화면에서 주 버튼, 로고, "이렇게 고쳐보세요" 정도에만 쓴다.
- 신호등은 반드시 모양과 글자를 함께 붙인다(WCAG 1.4.1). 표는 README 4절.
- 신호등 배지는 `signal-*-soft` 바탕에 `signal-*` 색으로 모양과 글자를 같이 칠한다. 각 조합은 4.5:1 이상이고, `signal-*` 색은 흰 카드 위에서도 4.5:1 이상이다.
- 모양만 보여주는 곳(접힌 축의 요약 등)에는 "좋아요 2개" 같은 `sr-only` 글자를 붙인다.
- 인용 위 형광펜: 좋은 점 `marker-good`(연두), 고칠 점 `marker-fix`(노랑). 빨강 형광펜은 쓰지 않는다.

## 글꼴

- Pretendard Variable 하나만 쓴다. CSP가 `font-src 'self'`이므로 CDN을 쓰지 않고, `src/app/fonts/PretendardVariable.woff2`를 `next/font/local`로 같은 출처에서 제공한다(라이선스는 같은 폴더의 `OFL.txt`).
- 크기는 `text-xs`(13) `text-sm`(15) `text-base`(16) `text-lg`(18) `text-xl`(22) `text-2xl`(28) `text-3xl`(40)만 있다. `text-3xl`은 진단 중 시계에만 쓴다. 본문 줄간격은 1.7이다.
- 굵기는 본문 400, 라벨과 버튼 600, 제목과 강조 700이다.
- `text-lg` 이상 제목에는 `tracking-tight`를 붙인다.
- 영문 대문자 제목, 넓은 자간은 쓰지 않는다.

## 레이아웃

- 모든 화면은 위에 붙는 흰 헤더(높이 56px)와 `container`(`max-w-2xl`) 한 열이다. 헤더와 본문의 좌우 끝을 맞춘다.
- 페이지 첫머리는 `text-2xl` 굵은 제목과 `secondary` 설명 한 줄이다.
- 섹션 제목(`text-lg` 굵게)과 설명은 카드 밖에 두고, 내용은 흰 카드 안에 둔다. 섹션 사이는 40px, 카드 안 여백은 20~24px이다.
- 리포트 순서: 한 줄 총평 → 이런 점이 좋아요 → 가장 먼저 고칠 3가지 → 설정 정리 → 항목별 신호등 → 참고작.
- "고칠 3가지"는 카드 격자가 아니라 세로 목록이다. 번호(우선순위)를 붙이고, 카드 안을 "문제 / 메모 속 근거 / 이렇게 고쳐보세요"로 나눈다.
- 모바일에서 "진단 받기" 버튼은 화면 아래에 붙는다.
- 헤더가 위에 붙어 있으므로 스크롤해서 찾아가는 대상에는 `scroll-mt-20`을 준다.

## 컴포넌트

`components/styles.ts`의 공용 클래스를 먼저 쓴다.

| 이름 | 모양 |
| --- | --- |
| `primaryButton` | 파란 바탕, 흰 글자, 높이 48px. 모바일 폼에서는 가로를 꽉 채운다 |
| `secondaryButton` | 흰 바탕 + `border`, 높이 40px. 회색 바탕과 흰 카드 어디서나 보인다 |
| `textButton` | 흐린 글자, 호버 때 진해지고 밑줄 |
| `field` | 흰 바탕 + `border`. 포커스 때 파란 테두리와 옅은 파란 링 |
| `card` | `rounded-lg bg-surface` |
| `tag` | 장르, "선택" 같은 작은 회색 딱지 |
| `Signal` | 신호등 배지(알약 모양) |
| 인용 | `fill` 칸 안에 “ ”로 감싼 글. 목록 속 짧은 인용은 칸 없이 흐린 글자 |

- 모서리는 `rounded-sm`(6) `rounded-md`(10) `rounded-lg`(16) `rounded-full`만 있다. 버튼과 입력칸은 `md`, 카드는 `lg`, 배지와 칩은 `full`.
- 그림자는 떠 있는 것(모바일 시트)에만 `shadow-float`를 쓴다.
- 장르 칩은 고르면 `bg-foreground`로 채운다.

## 모션

원칙은 두 가지다.

1. **자주 보는 것은 움직이지 않는다.** 여러 번 반복되는 동작의 애니메이션은 즐거움이 아니라 지연이 된다(Rauno Freiberg).
2. **움직임은 상태가 바뀌었다는 것만 알린다.** 장식용 모션은 없다.

| 상황 | 모션 | 시간·이징 |
| --- | --- | --- |
| 버튼, 카드 누름 | `press` 유틸리티: `scale(0.97)` | 120ms `ease-out` |
| 호버 | 배경색이나 글자색만 바뀐다. 크기와 위치는 그대로 | 120~160ms |
| 펼치기(신호등 축, 메모 원문) | 펼친 내용만 `opacity` 0→1, `translateY(4px)`→0. 높이는 애니메이션하지 않는다. 화살표는 `rotate(180deg)` | 160~220ms `ease-out` |
| 코멘트 선택 → 인용 형광펜 | `marker-draw` 유틸리티: 왼쪽에서 오른쪽으로 한 번 그려진다. **이 앱의 시그니처 모션** | 300ms `ease-out` |
| 리포트 "고칠 점" 카드 누름 | 해당 축을 펼치고 항목으로 스크롤한 뒤, 문제 근거 인용에 `marker-draw` | 스크롤 후 250ms 지연, 300ms |
| 재진단 신호등 변화 | 이전 모양 → 새 모양 크로스페이드(`opacity`만) | 220ms, 한 번만 |
| 모바일 코멘트 시트 | `translateY(100%)`→0, 드래그로 닫기 | 400ms `ease-drawer` |
| 화면 첫 표시 | 전체가 한 번 페이드인. 섹션별 순차 등장 없음 | 220ms |

금지: `ease-in`, `scale(0)`에서 시작, 바운스, 무한 반복 장식, 300ms를 넘는 UI 모션(시트 제외), `width`·`height`·`top`·`margin` 애니메이션(`transform`, `opacity`, 색만 움직인다).

접근성:
- `prefers-reduced-motion`이 켜져 있으면 `transform` 모션은 없애고 `opacity`만 남긴다. `press`와 `marker-draw`는 `globals.css`에서 처리했다.
- 키보드 포커스는 `accent` 색 2px 외곽선 하나로 통일한다. 입력칸은 테두리와 링으로 대신한다.
- Tailwind v4의 `hover:`는 마우스가 있는 기기에서만 적용되므로 터치에서 잘못 켜지지 않는다.

이징과 시간 값은 Emil Kowalski의 기준을 따랐다. 이징은 `ease-out`, `ease-in-out`, `ease-drawer`만 남겨 두었다. 시간은 `duration-(--duration-press)`처럼 CSS 변수로 쓴다.

## 문구

- 편집자 말투의 "~해요"체를 쓴다. 예) "주인공이 뭘 원하는지 3화까지 안 보여요."
- 모든 지적에 몇 화, 어떤 장면이나 대사인지를 붙인다. 구체적인 것이 가장 AI 같지 않다.
- 버튼은 동사로 쓴다. 예) "진단 받기", "대본 다시 붙여넣기".
- "AI", "✨", "강력한", "혁신적인", "스마트한"은 쓰지 않는다.

## 레퍼런스

| 레퍼런스 | 가져올 것 |
| --- | --- |
| [Pretendard](https://github.com/orioncactus/pretendard) | 한글 UI 글꼴 |
| [Linear 디자인 리프레시](https://linear.app/now/behind-the-latest-design-refresh) | 구분선 줄이기, 아이콘 줄이기, "얻지 못한 주목을 끌려고 경쟁하지 않는다" |
| [Readwise Reader](https://blakecrosley.com/guides/design/readwise-reader) | 종이 형광펜 색 |
| [Emil Kowalski, 7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips) · [기준표](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md) | 이징 곡선, 시간, 누름 피드백, `scale(0)` 금지 |
| [Rauno Freiberg, Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design) | 빈도와 새로움, 즉각 반응, 중단 가능한 모션 |
| [AI Design Slop: 16 Patterns](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it) · [AI Slop Tells](https://www.925studios.co/blog/ai-slop-design-tells) | "쓰지 않는 것" 목록의 근거 |

## 확인

UI를 바꾼 뒤 아래 명령으로 기본값이 새어 들어왔는지 확인한다. 결과가 없어야 한다.

```bash
grep -rnE "indigo|violet|purple|gradient|backdrop-blur|animate-bounce|hover:scale|ease-in[^-]|font-serif|(text|bg)-(white|black)\b|rounded-(xl|2xl|3xl)|shadow-(sm|md|lg|xl)" src --exclude=globals.css
```
