# Tankpreis — 내 주변 독일 주유 가격

주유소 앞에서 **한 손으로 3초 안에 "어디가 제일 싼가"** 를 판단하는 모바일 우선 PWA.
독일 공식 실시간 가격(MTS-K, Tankerkönig API)으로 주변을 비교하고, **"지금 넣을까, 기다릴까"** 와 **"지금 가격이 평소·이웃 나라보다 싼가"** 까지 알려줍니다.

- **내 주변 최저가 카드**: 가격판 스타일의 큰 숫자(바뀌면 부드럽게 카운트), 거리, 주변 평균 대비 절약액(€), **탭 한 번 길안내**
- **지금 넣을까?**: 2026년 4월부터 시행된 "12시에만 인상" 규칙 + 이 기기에서 본 가격 기록으로 앞으로 24시간 예상(Apple Weather식 시간대 막대)
- **가격 구간**: 저렴 ▼ · 보통 ━ · 비쌈 ▲ — 색 + 모양 + 글자로 리스트·지도·비교 탭에 동일하게
- **지도**: 핀 자체가 가격, 최저가 핀 강조, 겹치면 싼 곳 우선 라벨, 핀을 누르면 하단 카드(길안내·자세히)
- **비교 탭** (EU Weekly Oil Bulletin): 독일 평균이 최근 3년 중 어느 수준인지, 1·3·10년 추이, 50L 주유 비용, 이웃 8개국·EU 27개국 순위, 1리터 중 세금
- 연료·반경·목록/지도 전환은 화면 하단 엄지 영역, 마지막 선택 기억
- **한국어 · Deutsch · English** (기기 언어 자동, 설정에서 변경), 라이트/다크, 데스크톱은 리스트 + 지도 2단
- 접근성: WCAG 2.2 AA 대비, 터치 영역 44px+, 시스템 글자 크기(iOS Dynamic Type) 대응, 스크린리더 문장, `prefers-reduced-motion`

가격 데이터: [Tankerkönig](https://creativecommons.tankerkoenig.de) / MTS-K (CC BY 4.0) · 비교 지표: [EU Weekly Oil Bulletin](https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en) (© European Union, CC BY 4.0) · 지도: © OpenFreeMap © OpenMapTiles © OpenStreetMap 기여자 · 위치 검색: Nominatim

---

## ✅ API 키 받으면 해야 할 일

키가 없는 동안에는 샘플 데이터(`TANKERKOENIG_MODE=mock`)로 모든 화면이 동작합니다. 키 메일을 받으면 아래만 하면 됩니다. 코드는 바꿀 필요가 없습니다.

- [ ] Vercel → 프로젝트 → **Settings → Environment Variables**
  - [ ] `TANKERKOENIG_API_KEY` = 메일로 받은 키 추가 (Production · Preview · Development 모두 체크)
  - [ ] `TANKERKOENIG_MODE`를 `live`로 바꾸거나 **삭제** (삭제하면 키가 있으니 자동으로 live)
- [ ] **Deployments → 최신 배포 ⋯ → Redeploy** (환경변수는 재배포해야 반영)
- [ ] 아이폰에서 앱 열기 → 노란 **"샘플 데이터"** 띠가 **사라졌는지** 확인
- [ ] "내 주변 가격 보기" → 실제 주유소 이름·주소가 나오는지, 가격이 주유소 앞 가격판과 맞는지 1곳 확인
- [ ] 주유소 하나 눌러 **영업시간**이 나오는지 확인 (`detail.php`)
- [ ] ☆ 즐겨찾기 1곳 추가 → **즐겨찾기 탭**에 가격이 나오는지 확인 (`prices.php`)
- [ ] 문제가 있으면 Vercel **Logs**에서 `[tankerkoenig]` 줄 확인 (키 오류·한도 초과가 여기 찍힘, 키 자체는 로그에 남지 않음)
- [ ] 며칠 사용하면 "지금 넣을까?"가 **"내 기록 n일 기준"** 으로 바뀌는지 확인 (실제 데이터만 기록, 샘플은 기록하지 않음)

---

## 배포 가이드 (Vercel, 무료)

### 1. Tankerkönig API 키 신청
<https://onboarding.tankerkoenig.de> 에서 신청(무료, 수동 심사라 며칠 걸릴 수 있음). **키는 코드나 GitHub에 넣지 않습니다.**

### 2. Vercel에 연결
1. <https://vercel.com> 에 GitHub 계정으로 로그인 → **Add New… → Project** → `DE_Gas_Find` **Import**
   (목록에 안 보이면 `https://vercel.com/new/import?s=https://github.com/sean1027lee-hub/DE_Gas_Find`)
2. **Vercel Team은 개인(Hobby) 계정**으로 둡니다. GitHub *조직*의 비공개 저장소는 Hobby에서 배포할 수 없어 Pro를 요구합니다.
3. Framework는 Next.js로 자동 인식. 빌드 설정은 그대로.

### 3. 환경변수

| 이름 | 키 받기 전 | 키 받은 후 |
| --- | --- | --- |
| `TANKERKOENIG_MODE` | `mock` | `live` 또는 삭제 |
| `TANKERKOENIG_API_KEY` | (없음) | 메일로 받은 키 |

저장 후 **Deploy**. 바꾼 뒤에는 **Redeploy**해야 반영됩니다.

### 4. 아이폰 홈 화면에 추가
Safari에서 배포 주소 → **공유(□↑) → 홈 화면에 추가**. 처음 "내 주변 가격 보기"를 누를 때 위치를 **허용**하세요.
위치 권한을 거부했다면:
- Safari: 주소창 **"가가"(AA) → 웹 사이트 설정 → 위치: 허용** 후 새로고침
- 홈 화면 앱: **설정 → 개인정보 보호 및 보안 → 위치 서비스(켜기) → Safari 웹 사이트 → 앱을 사용하는 동안**

---

## 로컬 개발

```bash
npm install
cp .env.example .env.local     # 기본은 TANKERKOENIG_MODE=mock (키 없이 실행)
npm run dev                    # http://localhost:3000
```

### 샘플 데이터(mock)와 상태 미리보기

`TANKERKOENIG_MODE=mock`이면 서버가 **Tankerkönig 원본 응답과 같은 JSON**(list.php / prices.php / detail.php)을 만들어,
실제 키를 쓸 때와 **같은 파서·캐시·오류 처리**를 그대로 통과합니다. 키를 넣는 순간 바뀌는 건 데이터 출처뿐입니다.

- 다름슈타트 주변 25곳(브랜드 표기 변형, 24시간/06–22시/일요일 휴무, E5·디젤 미판매, 고속도로 주유소 포함). 다른 곳에서 열면 주변으로 옮겨서 보여줌
- 가격은 **12시 규칙** 시뮬레이션: 12:00에만 오르고 다음 날 11:59까지 주유소별 간격으로 조금씩 내림. 기준 가격은 EU 통계의 현재 독일 평균
- 같은 시각이면 항상 같은 값(시드 고정) → 스크린샷·테스트 재현 가능

주소 뒤에 붙여 각 상태를 바로 볼 수 있습니다 (`denied`·`offline` 외에는 mock 모드에서만 동작):

| 주소 | 화면 |
| --- | --- |
| `/?at=11:50` · `/?at=12:05` | 그 시각의 가격 (12시 인상 전후 비교) |
| `/?scenario=loading` | 스켈레톤 3초 |
| `/?scenario=empty` | 반경 안 결과 없음 → "반경 넓히기" |
| `/?scenario=error` | 서버 오류 → "다시 시도" |
| `/?scenario=night` | 23:30 — 영업 종료 주유소 다수 |
| `/?scenario=denied` | 위치 권한 거부 → 집/우편번호로 대체 + 설정 안내 |
| `/?scenario=offline` | 오프라인 → 마지막 결과를 시각과 함께 |

### 명령

| 명령 | 내용 |
| --- | --- |
| `npm test` | Vitest 86개: 브랜드·정렬·포맷·응답 파싱·캐시, 12시 규칙 곡선·예측·학습, mock 원본 형식·시뮬레이션·영업시간, 3년 백분위·국가 순위, 번역 사전 일치 |
| `npm run e2e` | Playwright 9개 (mock, 375–390px): 핵심 흐름 → 길안내 링크, "지금 넣을까?", 12시 이후 판단, 빈 결과·오류, 독일어 기기, 비교 탭, 오프라인, API 키 미노출, axe(라이트/다크) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run icons` | PWA 아이콘·iOS 스플래시 재생성 |
| `node scripts/update-benchmarks.mjs` | EU Oil Bulletin → `src/data/benchmarks.json` (보통은 GitHub Actions가 화·목 자동 실행) |

### 구조

```
src/lib/tankerkoenig.ts  Zod 스키마 + Transport(라이브/mock 공통 경로), 1회 재시도
src/lib/server.ts        TANKERKOENIG_MODE 전환, 시나리오, 캐시 헤더
src/lib/mock/            stations.ts(25곳) · simulate.ts(12시 규칙) · api.ts(원본 형식 응답)
src/lib/timing.ts        12시 규칙 곡선, 24시간 예측, 기기 기록 학습
src/lib/pricing.ts       정렬·가격 구간 · benchmarks.ts 비교 지표 · scenario.ts 미리보기
src/i18n/                ko.ts(원문) · de.ts · en.ts · langs.ts · useT()
src/proxy.ts             "/" → /ko·/de·/en 정적 페이지(쿠키 또는 Accept-Language)
src/app/[lang]/          레이아웃·페이지 · src/app/api/ 키 은닉 + 5분 캐시 프록시
src/components/          App, SummaryCard(HeroCard), Timing, StationRow, Tier, MapView, CompareView …
```

### 품질 측정 (로컬, mock)
- Lighthouse 모바일: Performance 96–97 · Accessibility 100 · Best Practices 100 · SEO 100
- axe (WCAG 2 AA): 리스트·상세·지금 넣을까·비교 탭, 라이트/다크 모두 위반 0
- 글자 200%에서 가로 스크롤 없음, 320px 폭 확인
- 가짜 키로 빌드 후 클라이언트 번들 검색: 키 0건

---

## Decisions

문서에 없던 부분은 아래 기본값으로 정했습니다.

**데이터**
- **항상 25km로 조회**: 반경 칩은 요청 없이 즉시 바뀌고, 캐시 키가 그리드 셀당 하나라 Tankerkönig 호출도 줄어듭니다.
- **거리는 기기에서 계산**: 서버에는 ~1km로 반올림한 좌표만 보냅니다(개인정보 + 캐시).
- **캐시 2중**: 서버 메모리 5분(동시 요청 병합) + CDN `s-maxage=300`. 캐시 히트여도 실제 조회 시각을 그대로 표시합니다. 미리보기(`?scenario`, `?at`)는 캐시하지 않습니다.
- **"마지막 가격 변경 시각"** 은 무료 API가 주지 않아 **조회 시각**을 표시합니다.
- **mock 전환 변수**: `TANKERKOENIG_MODE=mock|live`. 예전 `TANKERKOENIG_MOCK=1`도 인식. 변수가 없으면 키가 있을 때 live, `npm run dev`에서 키가 없으면 mock, 배포에서 키가 없으면 오류(조용히 샘플로 넘어가지 않음).
- **비교 데이터 = EU Weekly Oil Bulletin**: 키 없이 독일 장기 추이 + EU 국가 비교 + 세금 분리를 함께 주는 유일한 공식 통계. GitHub Actions가 화·목에 17KB JSON으로 만들어 커밋 → Vercel 자동 재배포.

**지금 넣을까?**
- 독일은 **2026년 4월 1일부터 주유소가 하루 한 번, 12시에만 가격을 올릴 수 있습니다**(인하는 언제든). "아침 비쌈, 저녁 저렴"은 그 이전 패턴이라 쓰지 않습니다.
- 처음에는 ADAC 설명을 옮긴 **전형적 곡선**(12시 직후 최고, 17시 반쯤 평균 아래, 12시 직전 최저)으로 예상하고, 이 기기에서 **3일 이상**(하루 4개 시간대 이상) 실제 가격을 보면 그 동네 기록으로 바꿉니다. 기록은 2주 보관, 20분에 1번, 샘플 데이터는 기록하지 않습니다.
- 규칙을 어기는 주유소도 있어 항상 "예상"이라고 표시합니다.

**디자인·접근성**
- **가격 숫자**: 고정폭 대신 굵은 Pretendard + 표 정렬 숫자(Toss식). 주유기 관습대로 마지막 자리는 위첨자.
- **가격 구간**: 현재 결과의 33/67 분위수. 색 + 모양(▼ ━ ▲) + 글자. 노랑은 흰 배경 대비 1.8:1이라 지도 핀·막대에는 진한 테두리를 둡니다.
- **글자 크기**: 모든 글자를 rem으로, iOS에서는 `-apple-system-body`로 시스템 글자 크기를 따릅니다. 커지면 가격이 이름 아래로 내려가는 2줄 배치.
- **스크린리더**: 리스트 행은 보이는 글자 + 숨긴 연결어로 "Aral Heidelberger Str., 1,2 km, Super E10 1,739 유로, 주변 최저가"처럼 한 문장(보이는 글자가 이름에 포함, WCAG 2.5.3).
- **움직임**: 가격 카운트 400ms, 시트 260ms. 동작 줄이기 설정이면 즉시.
- **포인트 색**은 파랑 하나(누를 수 있는 것). 초록·노랑·빨강은 가격 구간 전용.
- **데스크톱(1024px+)**: 주변 탭은 리스트(440px) + 지도 2단, 비교 탭은 카드 2열.

**다국어**
- 한국어가 원문, 독일어·영어는 초안. 기기 언어를 따르고(ko/de/en 외에는 영어) 설정에서 바꿀 수 있습니다.
- 첫 화면을 그 언어로 바로 그리기 위해 `/ko`·`/de`·`/en` 정적 페이지를 만들고 `proxy.ts`가 `/` 요청을 쿠키(설정에서 고른 언어) 또는 `Accept-Language`로 연결합니다. 주소는 계속 `/`. (Vercel이 아닌 CDN 뒤에 둘 때는 `/`를 언어별로 캐시하지 않게 해야 합니다.)
- 숫자는 모든 언어에서 독일 주유소 표기(1,739)를 유지합니다. 주유소 이름·주소·연료명은 번역하지 않습니다.

**그 밖에**
- 위치는 첫 실행에서만 버튼으로 요청하고, 한 번 허용하면 다음부터 자동. 거부 상태면 집 위치로 대체.
- 위치 검색은 Nominatim(키 불필요). 이용 정책상 자동완성 금지라 검색 버튼으로만 조회, 초당 1회 + 24시간 캐시.
- 서비스워커 직접 작성. API 응답은 SW가 아니라 앱이 마지막 결과를 보관해 시각과 함께 보여줍니다.
- Fleet Card 할인 기능은 범용 앱에서 제외했습니다.

## 다음에 할 수 있는 것
- **한국과 비교**: 오피넷 API(무료 키) + 환율. 키를 받으면 비교 탭에 같은 방식으로 추가 가능.
- **경로상 주유**: openrouteservice(무료 키, 일일 한도)가 현실적인 선택지.
- **가격 알림**: iOS 16.4+ 홈 화면 앱만 웹 푸시 가능. 서버의 주기 확인과 구독 저장(Vercel Cron + KV 등)이 필요해 "서버 DB 없음" 결정을 바꿔야 합니다.
