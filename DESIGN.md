# 디자인 규칙

UI를 만들거나 고치기 전에 이 파일을 먼저 읽는다. AI가 만든 화면이 다 비슷해 보이는 이유는 아무도 결정하지 않은 기본값(Inter, 보라색 그라데이션, 둥근 카드 3개)을 그대로 쓰기 때문이다. 여기 적힌 결정이 기본값보다 우선한다.

**방향:** 편집자가 원고 옆에 연필로 남긴 메모. 앱이 아니라 읽기 도구다. 리포트를 여는 지망생은 긴장해 있으므로 화면이 먼저 말을 걸지 않는다.

## 쓰지 않는 것

| 쓰지 않는 것 | 대신 |
| --- | --- |
| 보라·인디고 계열, 그라데이션 | `globals.css` 토큰 색만 쓴다. Tailwind 기본 팔레트는 지워 두었다 |
| 색 있는 그림자, glow, 글래스모피즘(`backdrop-blur`) | 면은 `background`, `surface` 두 단계로만 나눈다 |
| 모든 요소에 `rounded-2xl` + `shadow-lg` | 모서리 2종(`rounded-sm`, `rounded-md`), 그림자는 떠 있는 것에만 `shadow-float` |
| 가운데 정렬 히어로 + 제목 위 배지 + 카드 3개 격자 | 왼쪽 정렬, 한 열로 읽는 흐름 |
| 카드 왼쪽의 색 테두리 | 신호등 모양과 글자로 상태를 보여준다 |
| 이모지 아이콘, 장식용 가는 선 아이콘 | 글자로 쓸 수 있으면 글자로 쓴다 |
| 숫자 통계 배너("13개 항목 분석!") | 숫자는 의미가 있을 때만 문장 안에 쓴다 |
| 스크롤하면 하나씩 떠오르는 효과, 바운스, `hover:scale-105` | 아래 "모션" |
| "AI가 분석했습니다", "✨", "강력한" 같은 문구 | 아래 "문구" |

## 색

- 강조색 `accent`는 한 화면에 한 곳만 쓴다(주 버튼 또는 현재 위치).
- 구분은 선보다 여백과 배경 차이로 한다. "구조는 보이지 않고 느껴져야 한다"(Linear).
- 신호등 색은 반드시 모양과 글자를 함께 붙인다(WCAG 1.4.1). 표는 README 4절.
- 대본 위 형광펜: 좋은 점 `marker-good`(연두), 고칠 점 `marker-fix`(노랑). 종이 위 형광펜 톤이다(Readwise Reader 참고). 빨강 형광펜은 쓰지 않는다.

## 글꼴

| 역할 | 글꼴 | 클래스 |
| --- | --- | --- |
| UI, 입력, 버튼, 대본 원문 | Noto Sans KR | `font-sans`(기본) |
| 한 줄 총평, 코멘트 본문, 대본 인용 | Noto Serif KR | `font-serif` |

- 명조는 "편집자의 목소리"에만 쓴다. 역할 단위로 나누고, 문장 안 한 단어만 명조로 바꾸는 장식은 하지 않는다. 이 장식도 AI 티가 나는 흔한 패턴이다.
- 크기는 `text-xs`(13) `text-sm`(15) `text-base`(17) `text-lg`(20) `text-xl`(26) `text-2xl`(32)만 있다. 한글 본문은 17px, 줄간격 1.75.
- 굵기는 400과 600만 쓴다.
- 읽는 글은 한 줄을 `max-w-[34em]` 안으로 둔다(한글 약 35~40자).
- 영문 대문자 제목, 넓은 자간은 쓰지 않는다.

## 레이아웃

- 리포트는 한 열(`max-w-2xl`)로 위에서 아래로 읽는다.
- 원고 보기만 두 열이다. 왼쪽 대본, 오른쪽 여백 메모. 코멘트는 짚은 문장과 같은 높이에 둔다(Readwise, Tufte 식 여백 메모).
- "고칠 3가지"는 카드 격자가 아니라 세로 목록이다. 번호는 우선순위이므로 붙인다.
- 간격은 균일하게 두지 않는다. 섹션 사이는 넓게(48~64px), 섹션 안은 촘촘하게(8~16px).

## 모션

원칙은 두 가지다.

1. **자주 보는 것은 움직이지 않는다.** 여러 번 반복되는 동작의 애니메이션은 즐거움이 아니라 지연이 된다(Rauno Freiberg).
2. **움직임은 상태가 바뀌었다는 것만 알린다.** 장식용 모션은 없다.

| 상황 | 모션 | 시간·이징 |
| --- | --- | --- |
| 버튼, 카드 누름 | `press` 유틸리티: `scale(0.97)` | 120ms `ease-out` |
| 호버 | 색만 바뀐다. 크기와 위치는 그대로 | 160ms |
| 신호등 펼치기 | 펼친 내용만 `opacity` 0→1, `translateY(4px)`→0. 높이는 애니메이션하지 않는다 | 220ms `ease-out` |
| 코멘트 선택 → 대본 형광펜 | `marker-draw` 유틸리티: 왼쪽에서 오른쪽으로 한 번 그려진다. **이 앱의 시그니처 모션** | 300ms `ease-out` |
| 진단 중 단계 완료 | 끝난 단계에 체크가 `scale(0.9)`→1, `opacity` 0→1 | 220ms `ease-out` |
| 재진단 신호등 변화 | 이전 모양 → 새 모양 크로스페이드 + `blur(2px)` | 250ms, 한 번만 |
| 모바일 코멘트 시트 | `translateY(100%)`→0, 드래그로 닫기 | 400ms `ease-drawer` |
| 리포트 첫 표시 | 전체가 한 번 페이드인. 섹션별 순차 등장 없음 | 220ms |

금지: `ease-in`, `scale(0)`에서 시작, 바운스, 무한 반복 장식, 300ms를 넘는 UI 모션(시트 제외), `width`·`height`·`top`·`margin` 애니메이션(`transform`, `opacity`만 움직인다).

접근성:
- `prefers-reduced-motion`이 켜져 있으면 `transform` 모션은 없애고 `opacity`만 남긴다. `press`와 `marker-draw`는 `globals.css`에서 처리했다.
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
| [Linear 디자인 리프레시](https://linear.app/now/behind-the-latest-design-refresh) | 따뜻한 회색, 구분선 줄이기, 아이콘 줄이기, "얻지 못한 주목을 끌려고 경쟁하지 않는다" |
| [Readwise Reader](https://blakecrosley.com/guides/design/readwise-reader) | 종이 형광펜 색, 여백 메모, 읽는 동안 도구 숨기기 |
| [Emil Kowalski, 7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips) · [기준표](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md) | 이징 곡선, 시간, 누름 피드백, `scale(0)` 금지 |
| [Rauno Freiberg, Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design) | 빈도와 새로움, 즉각 반응, 중단 가능한 모션 |
| [Rough Notation](https://roughnotation.com/) | 손으로 그린 동그라미·밑줄. 필요해지면 도입한다. 기본은 CSS `marker-draw` |
| [AI Design Slop: 16 Patterns](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it) · [AI Slop Tells](https://www.925studios.co/blog/ai-slop-design-tells) | "쓰지 않는 것" 목록의 근거 |

## 확인

UI를 바꾼 뒤 아래 명령으로 기본값이 새어 들어왔는지 확인한다. 결과가 없어야 한다.

```bash
grep -rnE "indigo|violet|purple|gradient|backdrop-blur|animate-bounce|hover:scale|ease-in[^-]|rounded-(lg|xl|2xl|3xl|full)|shadow-(sm|md|lg|xl)" src --exclude=globals.css
```
