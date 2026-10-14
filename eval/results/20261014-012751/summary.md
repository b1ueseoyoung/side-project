# 평가 실행 결과: 20261014-012751

> 합성 기획 메모로 잰 결과다. 실제 사용자 메모에서 검증한 품질이 아니다. 라벨은 AI가 쓴 사람 검토 전 임시 라벨이다. 상업성·매력·개성 문항은 라벨 없이 사람 검토표로만 본다.

## 실행 개요

- 표본: 샘플 8개 × 회차 1 = 계획 8건, 기록된 실행 8건
- 결과: 성공 8건, 실패 0건, 실행 안 됨 0건
- 모델 설정: claude-opus-5-5, 추론 max, anthropic-batches
- 응답이 보고한 실제 모델: claude-opus-5-5
- 비용: 합계 $8.6433, 1회 중앙값 $1.0893, 최대 $1.2506 (배치 요금)
- 토큰: 입력 중앙값 12432, 출력 중앙값 106401.5
- 버전: git 1297bc8 (커밋 안 된 변경: M src/lib/diagnosis/diagnose.ts, M src/lib/llm.ts), 시스템 프롬프트 6e63177dca9e3b84, 출력 스키마 4e955489cd78221e, rules.ts da6a55683be26719, items.ts 1293e659696d7113
- 소요 시간: 합계 8017초, 중앙값 1075초, 범위 758~1127초

| 샘플 | 회차 | 결과 | 소요(초) | 원본 인용 | 원문에 없는 인용 | 앱이 뺀 인용 | 후처리로 바뀐 답 | 질문 누락 | 오류 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| p1a | 1 | 성공 | 1034 | 113 | 0 | 0 | 0 | 0 |  |
| p1b | 1 | 성공 | 903 | 115 | 0 | 0 | 0 | 0 |  |
| p2a | 1 | 성공 | 1122 | 111 | 0 | 0 | 0 | 0 |  |
| p2b | 1 | 성공 | 1116 | 112 | 0 | 0 | 0 | 0 |  |
| p3a | 1 | 성공 | 1127 | 97 | 0 | 0 | 0 | 0 |  |
| p3b | 1 | 성공 | 831 | 100 | 0 | 0 | 0 | 0 |  |
| p4a | 1 | 성공 | 1126 | 112 | 0 | 0 | 0 | 0 |  |
| p4b | 1 | 성공 | 758 | 101 | 0 | 0 | 0 | 0 |  |

라벨 자체 점검: 문제 없음 (라벨 인용이 모두 메모에 있고 질문 ID가 모두 유효)

## 1. 대상 질문 판정 (라벨 범주별, 합산하지 않음)

| 샘플 | 회차 | 질문 | 임시 라벨 | 앱 원본→최종 | 신호 | 먼저 고칠 3 | 결과 | 예상 근거 인용 | 예상 밖 인용 | 정보 부족 표현 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| p1a | 1 | consistency.no_conflict (설정 일관성) | 문제 없음 | 아니오→아니오 | fix | 포함 | 불일치 | 0/0 | 3 | 없음 |
| p1b | 1 | consistency.no_conflict (설정 일관성) | 문제 있음 | 아니오→아니오 | fix | 포함 | 일치 | 2/2 | 1 | 없음 |
| p2a | 1 | motivation.reason (행동 동기) | 문제 없음 | 아니오→아니오 | fix | - | 불일치 | 0/3 | 2 | 있음 |
| p2b | 1 | motivation.reason (행동 동기) | 정보 부족 | 아니오→아니오 | fix | - | 일치 | 2/3 | 0 | 있음 |
| p3a | 1 | versions.separated (버전 정리) | 문제 없음 | 예→예 | good | - | 일치 | 3/3 | 0 | 없음 |
| p3a | 1 | consistency.no_conflict (설정 일관성) | 문제 없음 | 예→예 | good | - | 일치 | 0/0 | 3 | 없음 |
| p3b | 1 | versions.separated (버전 정리) | 문제 있음 | 아니오→아니오 | fix | 포함 | 일치 | 2/3 | 0 | 없음 |
| p3b | 1 | consistency.no_conflict (설정 일관성) | 문제 있음 | 아니오→아니오 | fix | 포함 | 일치 | 3/4 | 1 | 없음 |
| p4a | 1 | ending.decided (결말 방향) | 문제 없음 | 예→예 | good | - | 일치 | 1/2 | 1 | 없음 |
| p4b | 1 | ending.decided (결말 방향) | 정보 부족 | 아니오→아니오 | fix | - | 일치 | 1/1 | 1 | 있음 |

| 임시 라벨 | 대상 건수 | 앱 최종 예 | 앱 최종 아니오 | 결과 없음(실패) |
| --- | --- | --- | --- | --- |
| 문제 없음 | 5 | 3 | 2 | 0 |
| 문제 있음 | 3 | 0 | 3 | 0 |
| 정보 부족 | 2 | 0 | 2 | 0 |
| 해당 없음 | 0 | 0 | 0 | 0 |

'정보 부족 표현'은 이유·코멘트에 '메모에 없다' 류의 말이 있는지 본 휴리스틱이다. 사람이 확인해야 한다.

## 2. 반드시 찾아야 할 문제

| 샘플 | 회차 | 문제 | 질문 답 | 필수 인용 | 찾음 |
| --- | --- | --- | --- | --- | --- |
| p1b | 1 | 3년 전 죽었다는 테오의 기사 학교 학비를 아델이 마련하려 한다 | 아니오 | 2/2 | 예 |
| p2b | 1 | 2화 서윤을 구하기로 한 이유, 4~10화 회수인과 맞서기로 한 이유, 20화 수명 10년을 내준 이유가 메모에 없다 | 아니오 | 2/3 | 아니오 |
| p3b | 1 | 흑의 무리의 첩자로 길러졌다는 설정과 누구의 제자도 된 적 없다는 설정이 함께 적혀 있다 | 아니오 | 2/2 | 예 |
| p3b | 1 | 객잔 이름이 청운객잔과 흑비단객잔으로 엇갈린다 | 아니오 | 1/2 | 아니오 |
| p3b | 1 | 어느 설정이 최종이고 어느 설정을 버렸는지 표시가 없다 | 아니오 | 2/2 | 예 |
| p4b | 1 | 이야기가 도달할 지점(결말)이 메모에 없다 | 아니오 | 없음 | 예 |

## 3. 하면 안 되는 지적 (자동 적발은 의심 건이며 사람이 확인)

| 샘플 | 회차 | 하면 안 되는 지적 | 자동 적발 |
| --- | --- | --- | --- |
| p1a | 1 | 가명 '엘라'를 아델의 이름과 어긋나는 설정으로 지적한다 | 없음 |
| p1a | 1 | 리나의 정보원 반전을 인물 설정과 어긋난다고 지적한다 | 없음 |
| p1b | 1 | 가명 '엘라'를 아델의 이름과 어긋나는 설정으로 지적한다 | 없음 |
| p1b | 1 | 리나의 정보원 반전을 인물 설정과 어긋난다고 지적한다 | 없음 |
| p2a | 1 | 작가가 일부러 숨긴 미소의 정체와 목적을 동기 누락이나 설정 충돌로 지적한다 | 없음 |
| p2b | 1 | 작가가 일부러 숨긴 미소의 정체와 목적을 동기 누락이나 설정 충돌로 지적한다 | consistency.no_conflict: "아니오" 근거로 인용; 설정 정리의 어긋나는 설정: 작가 메모는 미소의 정체를 1부에서 숨긴다고 해요. 그런데 3화… |
| p3a | 1 | [폐기] 표시한 첩자 설정과 '청운객잔'을 최종 설정과 어긋난다고 지적한다 | 없음 |
| p4a | 1 | 여러 사람이 조금씩 관여했다는 의도적 설정을 전환점 이유 누락이나 설정 충돌로 지적한다 | 없음 |
| p4b | 1 | 여러 사람이 조금씩 관여했다는 의도적 설정을 전환점 이유 누락이나 설정 충돌로 지적한다 | 없음 |
| p4b | 1 | 메모에 없는 결말을 지어내 판단 근거로 삼는다 | 사람만 판단 가능 |

## 4. 근거 정확성 (자동: 원문 존재만 확인)

- 원본 응답 인용 861개 중 원문에 없는 인용 0개 (성공·후처리 실패 실행만 집계, 모델 호출 실패는 응답이 없음)

- 후처리로 바뀐 답 0건 (근거 인용이 원문에서 확인되지 않아 "예"가 "아니오"가 된 경우)

## 5. 수정 우선순위 (먼저 고칠 3가지)

| 샘플 | 회차 | 빨강 항목 (목록 순) | 먼저 고칠 3 | 목록 순서와 같음 | 빠진 빨강 | 대상 문제 포함 |
| --- | --- | --- | --- | --- | --- | --- |
| p1a | 1 | consistency, versions, genre_fit, motivation, central_question, stakes, turning_points, theme | consistency(1번째), versions(3번째), genre_fit(6번째) | 예 | motivation, central_question, stakes, turning_points, theme | 해당 없음 |
| p1b | 1 | consistency, versions, genre_fit, motivation, central_question, turning_points, theme | consistency(1번째), versions(3번째), genre_fit(6번째) | 예 | motivation, central_question, turning_points, theme | 예 |
| p2a | 1 | consistency, core_rules, versions, genre_fit, motivation, stakes, turning_points | consistency(1번째), core_rules(2번째), versions(3번째) | 예 | genre_fit, motivation, stakes, turning_points | 해당 없음 |
| p2b | 1 | consistency, core_rules, versions, genre_fit, motivation, supporting, protagonist_appeal, arc, stakes, turning_points | consistency(1번째), core_rules(2번째), versions(3번째) | 예 | genre_fit, motivation, supporting, protagonist_appeal, arc, stakes, turning_points | 아니오 |
| p3a | 1 | genre_fit, motivation, stakes, turning_points | genre_fit(6번째), motivation(10번째), stakes(15번째) | 예 | turning_points | 해당 없음 |
| p3b | 1 | consistency, versions, genre_fit, motivation, stakes, turning_points | consistency(1번째), versions(3번째), genre_fit(6번째) | 예 | motivation, stakes, turning_points | 예 |
| p4a | 1 | consistency, versions, genre_fit, motivation, protagonist_appeal, stakes, turning_points, theme | consistency(1번째), versions(3번째), genre_fit(6번째) | 예 | motivation, protagonist_appeal, stakes, turning_points, theme | 해당 없음 |
| p4b | 1 | consistency, core_rules, motivation, protagonist_appeal, arc, stakes, turning_points, ending, theme | consistency(1번째), core_rules(2번째), motivation(10번째) | 예 | protagonist_appeal, arc, stakes, turning_points, ending, theme | 아니오 |

항목 목록은 22개이고, 앱은 빨강을 먼저, 같은 색 안에서는 목록 순서대로 3개를 고른다.

## 6. 쌍 비교: 바꾼 부분과 무관한 질문이 흔들렸는가

| 쌍 | 회차 | 비교한 질문 수 | 달라진 질문 |
| --- | --- | --- | --- |
| p1a↔p1b | 1 | 19 | stakes.cost 아니오→예 |
| p2a↔p2b | 1 | 18 | supporting.role 예→아니오 |
| p3a↔p3b | 1 | 21 | 없음 |
| p4a↔p4b | 1 | 20 | core_rules.stated 예→아니오, versions.separated 아니오→예, genre_fit.core_fun 아니오→예(주관) |

비교에서 뺀 질문: 대상 질문과 라벨의 mayAlsoChange(바꾼 부분 때문에 달라질 수 있는 질문).

## 7. 반복 일관성

이번 실행은 샘플마다 1회라 측정하지 않았다. `--repeat 3`으로 켠다.

## 8. 사람 검토표

- review.csv: 184행 (1순위 11행, 2순위 32행, 3순위 14행, 4순위 6행, 5순위 121행). 1순위는 대상 질문, 하면 안 되는 지적 의심, 근거 확인 실패로 바뀐 답이다.
- 인용이 판단을 실제로 뒷받침하는지, 조언이 어느 부분을 왜 봐야 하는지 알려 주는지는 자동으로 판정하지 않는다. [검토] 열을 사람이 채운다.
- 주관 문항(장르 재미, 개성, 셀링 포인트, 주인공 매력)은 흥행이나 투고 성공을 검증하지 않는다. 근거와 유용성만 본다.
